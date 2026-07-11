// GET /api/accounting/budget — get budget entries by year/month/account
// POST /api/accounting/budget — create budget entry
// PUT /api/accounting/budget — update budget entry (by id or accountId+year+month)
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { ok, fail, parseBody, withHandler, broadcast, logAudit, PROPERTY_ID, roundMoney } from "@/lib/hms";

export const dynamic = "force-dynamic";

export const GET = withHandler(async (req: NextRequest) => {
  const propertyId = await PROPERTY_ID();
  const { searchParams } = new URL(req.url);

  const year = searchParams.get("year") ? Number(searchParams.get("year")) : new Date().getFullYear();
  const month = searchParams.get("month") ? Number(searchParams.get("month")) : 0;
  const accountId = searchParams.get("accountId") || "";

  const where: any = { propertyId, year };
  if (month >= 1 && month <= 12) where.month = month;
  if (accountId) where.accountId = accountId;

  const entries = await db.budgetEntry.findMany({
    where,
    orderBy: [{ month: "asc" }, { account: { code: "asc" } }],
    include: {
      account: { select: { id: true, code: true, name: true, accountType: true } },
    },
  });

  // If a full year is requested (no specific month), compute summary
  let summary = null;
  if (!month) {
    const totalBudgeted = entries.reduce((s, e) => s + e.budgetedAmount, 0);
    const totalActual = entries.reduce((s, e) => s + e.actualAmount, 0);
    summary = {
      totalBudgeted: roundMoney(totalBudgeted),
      totalActual: roundMoney(totalActual),
      totalVariance: roundMoney(totalActual - totalBudgeted),
      entriesPerMonth: Array.from({ length: 12 }, (_, i) => {
        const monthEntries = entries.filter((e) => e.month === i + 1);
        return {
          month: i + 1,
          budgeted: roundMoney(monthEntries.reduce((s, e) => s + e.budgetedAmount, 0)),
          actual: roundMoney(monthEntries.reduce((s, e) => s + e.actualAmount, 0)),
          variance: roundMoney(monthEntries.reduce((s, e) => s + e.actualAmount - e.budgetedAmount, 0)),
        };
      }),
    };
  }

  return ok(entries, { year, month: month || "all", summary });
});

export const POST = withHandler(async (req: NextRequest) => {
  const propertyId = await PROPERTY_ID();
  const body = await parseBody(req);

  if (!body.accountId || !body.year || !body.month) {
    return fail("accountId, year, and month are required", "VALIDATION", 400);
  }
  if (body.month < 1 || body.month > 12) {
    return fail("month must be between 1 and 12", "VALIDATION", 400);
  }

  // Validate account exists
  const account = await db.account.findFirst({
    where: { id: body.accountId, propertyId, isActive: true },
  });
  if (!account) {
    return fail("Account not found or inactive", "NOT_FOUND", 404);
  }

  // Check for duplicate (unique constraint on propertyId+accountId+year+month)
  const existing = await db.budgetEntry.findFirst({
    where: { propertyId, accountId: body.accountId, year: body.year, month: body.month },
  });
  if (existing) {
    return fail(
      `Budget entry already exists for account ${account.code} - ${account.name}, ${body.year}/${body.month}. Use PUT to update.`,
      "DUPLICATE",
      409
    );
  }

  const budgetedAmount = roundMoney(body.budgetedAmount ?? 0);
  const actualAmount = roundMoney(body.actualAmount ?? 0);

  const entry = await db.budgetEntry.create({
    data: {
      propertyId,
      accountId: body.accountId,
      year: body.year,
      month: body.month,
      budgetedAmount,
      actualAmount,
      variance: roundMoney(actualAmount - budgetedAmount),
      notes: body.notes ?? null,
    },
    include: {
      account: { select: { id: true, code: true, name: true, accountType: true } },
    },
  });

  await logAudit({
    propertyId,
    action: "BUDGET_ENTRY_CREATED",
    entityType: "BudgetEntry",
    entityId: entry.id,
    newValue: entry,
  });

  await broadcast("accounting:budget_entry_created", entry, propertyId);

  return ok(entry);
});

export const PUT = withHandler(async (req: NextRequest) => {
  const propertyId = await PROPERTY_ID();
  const body = await parseBody(req);

  let existing;

  if (body.id) {
    existing = await db.budgetEntry.findFirst({ where: { id: body.id, propertyId } });
  } else if (body.accountId && body.year && body.month) {
    existing = await db.budgetEntry.findFirst({
      where: { propertyId, accountId: body.accountId, year: body.year, month: body.month },
    });
  } else {
    return fail("id or (accountId, year, month) is required to identify the entry", "VALIDATION", 400);
  }

  if (!existing) {
    return fail("Budget entry not found", "NOT_FOUND", 404);
  }

  const budgetedAmount = body.budgetedAmount !== undefined ? roundMoney(body.budgetedAmount) : existing.budgetedAmount;
  const actualAmount = body.actualAmount !== undefined ? roundMoney(body.actualAmount) : existing.actualAmount;

  const updated = await db.budgetEntry.update({
    where: { id: existing.id },
    data: {
      ...(body.budgetedAmount !== undefined && { budgetedAmount }),
      ...(body.actualAmount !== undefined && { actualAmount }),
      variance: roundMoney(actualAmount - budgetedAmount),
      ...(body.notes !== undefined && { notes: body.notes }),
    },
    include: {
      account: { select: { id: true, code: true, name: true, accountType: true } },
    },
  });

  await logAudit({
    propertyId,
    action: "BUDGET_ENTRY_UPDATED",
    entityType: "BudgetEntry",
    entityId: existing.id,
    oldValue: existing,
    newValue: updated,
  });

  await broadcast("accounting:budget_entry_updated", updated, propertyId);

  return ok(updated);
});
