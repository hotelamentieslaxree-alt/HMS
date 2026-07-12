// GET /api/accounting/trial-balance — calculate trial balance as of date
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { ok, fail, withHandler, PROPERTY_ID, roundMoney } from "@/lib/hms";

export const dynamic = "force-dynamic";

export const GET = withHandler(async (req: NextRequest) => {
  const propertyId = await PROPERTY_ID();
  const { searchParams } = new URL(req.url);

  const asOfDate = searchParams.get("asOfDate")
    ? new Date(searchParams.get("asOfDate")!)
    : new Date();
  const accountType = searchParams.get("accountType") || "";

  // Get all active accounts for the property
  const where: any = { propertyId, isActive: true };
  if (accountType) where.accountType = accountType;

  const accounts = await db.account.findMany({
    where,
    orderBy: [{ code: "asc" }],
    include: {
      parentAccount: { select: { id: true, code: true, name: true } },
      childAccounts: { select: { id: true, code: true, name: true, balance: true } },
    },
  });

  // For a more accurate trial balance, sum from posted journal entry lines
  // up to the as-of date, grouped by account
  const postedLines = await db.journalEntryLine.findMany({
    where: {
      journalEntry: {
        propertyId,
        status: { in: ["posted", "verified"] },
        entryDate: { lte: asOfDate },
      },
    },
    select: {
      accountId: true,
      debit: true,
      credit: true,
      account: {
        select: {
          id: true,
          code: true,
          name: true,
          accountType: true,
          normalBalance: true,
        },
      },
    },
  });

  // Aggregate debits and credits per account from posted lines
  const lineMap = new Map<string, { debit: number; credit: number }>();
  for (const line of postedLines) {
    const existing = lineMap.get(line.accountId) || { debit: 0, credit: 0 };
    existing.debit = roundMoney(existing.debit + line.debit);
    existing.credit = roundMoney(existing.credit + line.credit);
    lineMap.set(line.accountId, existing);
  }

  // Build trial balance rows
  const rows = accounts.map((account) => {
    const posted = lineMap.get(account.id) || { debit: 0, credit: 0 };

    // Calculate net balance based on normal balance side
    let balance: number;
    if (account.normalBalance === "debit") {
      balance = roundMoney(posted.debit - posted.credit);
    } else {
      balance = roundMoney(posted.credit - posted.debit);
    }

    // For trial balance display: show debit balance in debit column, credit balance in credit column
    const debitBalance = balance >= 0 ? balance : 0;
    const creditBalance = balance < 0 ? Math.abs(balance) : 0;

    return {
      accountId: account.id,
      code: account.code,
      name: account.name,
      accountType: account.accountType,
      normalBalance: account.normalBalance,
      totalDebit: posted.debit,
      totalCredit: posted.credit,
      balance,
      debitBalance,
      creditBalance,
      parentAccount: account.parentAccount,
      childAccounts: account.childAccounts,
    };
  });

  // Calculate totals
  const totalDebit = roundMoney(rows.reduce((s, r) => s + r.debitBalance, 0));
  const totalCredit = roundMoney(rows.reduce((s, r) => s + r.creditBalance, 0));
  const isBalanced = roundMoney(totalDebit - totalCredit) === 0;

  return ok(rows, {
    asOfDate: asOfDate.toISOString(),
    totalDebit,
    totalCredit,
    difference: roundMoney(totalDebit - totalCredit),
    isBalanced,
    accountCount: rows.length,
  });
});
