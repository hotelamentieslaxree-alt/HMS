// GET /api/accounting/accounts — list accounts with hierarchy (parent/children)
// POST /api/accounting/accounts — create new account
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { ok, fail, parseBody, withHandler, broadcast, logAudit, PROPERTY_ID } from "@/lib/hms";

export const dynamic = "force-dynamic";

export const GET = withHandler(async (req: NextRequest) => {
  const propertyId = await PROPERTY_ID();
  const { searchParams } = new URL(req.url);

  const accountType = searchParams.get("accountType") || "";
  const search = searchParams.get("search") || "";
  const activeOnly = searchParams.get("active") !== "false";
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit")) || 50));
  const skip = (page - 1) * limit;

  const where: any = { propertyId };
  if (activeOnly) where.isActive = true;
  if (accountType) where.accountType = accountType;
  if (search) {
    where.OR = [
      { name: { contains: search } },
      { code: { contains: search } },
    ];
  }

  const [accounts, total] = await Promise.all([
    db.account.findMany({
      where,
      orderBy: [{ code: "asc" }],
      skip,
      take: limit,
      include: {
        parentAccount: { select: { id: true, code: true, name: true } },
        childAccounts: { select: { id: true, code: true, name: true, balance: true } },
        _count: { select: { journalLines: true, budgetEntries: true } },
      },
    }),
    db.account.count({ where }),
  ]);

  return ok(accounts, { total, page, limit, pages: Math.ceil(total / limit) });
});

export const POST = withHandler(async (req: NextRequest) => {
  const propertyId = await PROPERTY_ID();
  const body = await parseBody(req);

  if (!body.code || !body.name || !body.accountType) {
    return fail("code, name, and accountType are required", "VALIDATION", 400);
  }

  const validTypes = ["asset", "liability", "equity", "revenue", "expense"];
  if (!validTypes.includes(body.accountType)) {
    return fail(`accountType must be one of: ${validTypes.join(", ")}`, "VALIDATION", 400);
  }

  // Check for duplicate code within property
  const existing = await db.account.findFirst({
    where: { propertyId, code: body.code },
  });
  if (existing) {
    return fail(`Account code "${body.code}" already exists`, "DUPLICATE", 409);
  }

  // Validate parent account if specified
  if (body.parentAccountId) {
    const parent = await db.account.findFirst({
      where: { id: body.parentAccountId, propertyId },
    });
    if (!parent) {
      return fail("Parent account not found", "NOT_FOUND", 404);
    }
  }

  const account = await db.account.create({
    data: {
      propertyId,
      code: body.code,
      name: body.name,
      accountType: body.accountType,
      subType: body.subType ?? null,
      parentAccountId: body.parentAccountId ?? null,
      balance: body.balance ?? 0,
      normalBalance: body.normalBalance ?? "debit",
      isSystem: body.isSystem ?? false,
      isActive: body.isActive ?? true,
    },
    include: {
      parentAccount: { select: { id: true, code: true, name: true } },
      childAccounts: { select: { id: true, code: true, name: true } },
    },
  });

  await logAudit({
    propertyId,
    action: "ACCOUNT_CREATED",
    entityType: "Account",
    entityId: account.id,
    newValue: account,
  });

  await broadcast("accounting:account_created", account, propertyId);

  return ok(account);
});
