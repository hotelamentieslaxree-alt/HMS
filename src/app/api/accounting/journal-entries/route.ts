// GET /api/accounting/journal-entries — list journal entries with lines, filter by status/date
// POST /api/accounting/journal-entries — create journal entry with lines (validate debit = credit)
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { ok, fail, parseBody, withHandler, broadcast, logAudit, PROPERTY_ID, roundMoney } from "@/lib/hms";

export const dynamic = "force-dynamic";

export const GET = withHandler(async (req: NextRequest) => {
  const propertyId = await PROPERTY_ID();
  const { searchParams } = new URL(req.url);

  const status = searchParams.get("status") || "";
  const dateFrom = searchParams.get("dateFrom") || "";
  const dateTo = searchParams.get("dateTo") || "";
  const referenceType = searchParams.get("referenceType") || "";
  const search = searchParams.get("search") || "";
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit")) || 20));
  const skip = (page - 1) * limit;

  const where: any = { propertyId };
  if (status) where.status = status;
  if (referenceType) where.referenceType = referenceType;
  if (dateFrom || dateTo) {
    where.entryDate = {};
    if (dateFrom) where.entryDate.gte = new Date(dateFrom);
    if (dateTo) where.entryDate.lte = new Date(dateTo);
  }
  if (search) {
    where.OR = [
      { entryNumber: { contains: search } },
      { description: { contains: search } },
    ];
  }

  const [entries, total] = await Promise.all([
    db.journalEntry.findMany({
      where,
      orderBy: { entryDate: "desc" },
      skip,
      take: limit,
      include: {
        lines: {
          include: {
            account: { select: { id: true, code: true, name: true, accountType: true } },
          },
          orderBy: { id: "asc" },
        },
      },
    }),
    db.journalEntry.count({ where }),
  ]);

  return ok(entries, { total, page, limit, pages: Math.ceil(total / limit) });
});

export const POST = withHandler(async (req: NextRequest) => {
  const propertyId = await PROPERTY_ID();
  const body = await parseBody(req);

  if (!body.description) {
    return fail("description is required", "VALIDATION", 400);
  }
  if (!body.lines || !Array.isArray(body.lines) || body.lines.length < 2) {
    return fail("At least 2 journal entry lines are required", "VALIDATION", 400);
  }

  // Validate each line has accountId and either debit or credit
  for (let i = 0; i < body.lines.length; i++) {
    const line = body.lines[i];
    if (!line.accountId) {
      return fail(`Line ${i + 1}: accountId is required`, "VALIDATION", 400);
    }
    const debit = roundMoney(line.debit ?? 0);
    const credit = roundMoney(line.credit ?? 0);
    if (debit < 0 || credit < 0) {
      return fail(`Line ${i + 1}: debit and credit must be non-negative`, "VALIDATION", 400);
    }
    if (debit === 0 && credit === 0) {
      return fail(`Line ${i + 1}: either debit or credit must be non-zero`, "VALIDATION", 400);
    }
    if (debit > 0 && credit > 0) {
      return fail(`Line ${i + 1}: cannot have both debit and credit on same line`, "VALIDATION", 400);
    }
  }

  // Validate total debit = total credit
  const totalDebit = roundMoney(body.lines.reduce((sum: number, l: any) => sum + (l.debit ?? 0), 0));
  const totalCredit = roundMoney(body.lines.reduce((sum: number, l: any) => sum + (l.credit ?? 0), 0));

  if (roundMoney(totalDebit - totalCredit) !== 0) {
    return fail(
      `Journal entry must balance: total debit (${totalDebit}) ≠ total credit (${totalCredit})`,
      "UNBALANCED",
      400
    );
  }

  // Validate all accountIds exist for this property
  const accountIds = [...new Set(body.lines.map((l: any) => l.accountId as string))];
  const accounts = await db.account.findMany({
    where: { id: { in: accountIds }, propertyId, isActive: true },
  });
  if (accounts.length !== accountIds.length) {
    const foundIds = new Set(accounts.map((a) => a.id));
    const missing = accountIds.filter((id: string) => !foundIds.has(id));
    return fail(`Accounts not found or inactive: ${missing.join(", ")}`, "NOT_FOUND", 404);
  }

  // Auto-generate entryNumber: JE-YYYYMMDD-XXX
  const today = new Date();
  const dateStr = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, "0")}${String(today.getDate()).padStart(2, "0")}`;
  const prefix = `JE-${dateStr}-`;

  const existing = await db.journalEntry.findMany({
    where: { propertyId, entryNumber: { startsWith: prefix } },
    select: { entryNumber: true },
    orderBy: { entryNumber: "desc" },
  });

  let maxSeq = 0;
  for (const e of existing) {
    const m = /JE-\d{8}-(\d+)/.exec(e.entryNumber);
    if (m) maxSeq = Math.max(maxSeq, parseInt(m[1], 10));
  }
  const entryNumber = `${prefix}${String(maxSeq + 1).padStart(3, "0")}`;

  // Create entry with lines in a transaction
  const entry = await db.journalEntry.create({
    data: {
      propertyId,
      entryNumber,
      entryDate: body.entryDate ? new Date(body.entryDate) : new Date(),
      description: body.description,
      referenceId: body.referenceId ?? null,
      referenceType: body.referenceType ?? "manual",
      totalDebit,
      totalCredit,
      status: body.status ?? "draft",
      postedBy: body.postedBy ?? null,
      verifiedBy: body.verifiedBy ?? null,
      postedAt: body.postedAt ? new Date(body.postedAt) : null,
      verifiedAt: body.verifiedAt ? new Date(body.verifiedAt) : null,
      lines: {
        create: body.lines.map((l: any) => ({
          accountId: l.accountId,
          debit: roundMoney(l.debit ?? 0),
          credit: roundMoney(l.credit ?? 0),
          description: l.description ?? null,
          costCenter: l.costCenter ?? null,
        })),
      },
    },
    include: {
      lines: {
        include: {
          account: { select: { id: true, code: true, name: true, accountType: true } },
        },
      },
    },
  });

  await logAudit({
    propertyId,
    action: "JOURNAL_ENTRY_CREATED",
    entityType: "JournalEntry",
    entityId: entry.id,
    newValue: entry,
  });

  await broadcast("accounting:journal_entry_created", entry, propertyId);

  return ok(entry);
});
