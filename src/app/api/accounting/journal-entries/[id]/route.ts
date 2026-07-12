// PUT /api/accounting/journal-entries/[id] — update journal entry status (post, verify, cancel)
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { ok, fail, parseBody, withHandler, broadcast, logAudit, PROPERTY_ID } from "@/lib/hms";

export const dynamic = "force-dynamic";

export const PUT = withHandler(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const propertyId = await PROPERTY_ID();
  const { id } = await params;
  const body = await parseBody(req);

  // Find the journal entry
  const entry = await db.journalEntry.findFirst({
    where: { id, propertyId },
    include: { lines: true },
  });

  if (!entry) {
    return fail("Journal entry not found", "NOT_FOUND", 404);
  }

  const newStatus = body.status;
  if (!newStatus) {
    return fail("status is required", "VALIDATION", 400);
  }

  const validTransitions: Record<string, string[]> = {
    draft: ["posted", "cancelled"],
    posted: ["verified", "cancelled"],
    verified: ["cancelled"],
    cancelled: [],
  };

  const allowed = validTransitions[entry.status] || [];
  if (!allowed.includes(newStatus)) {
    return fail(
      `Cannot transition from "${entry.status}" to "${newStatus}". Allowed: ${allowed.join(", ") || "none"}`,
      "INVALID_TRANSITION",
      400
    );
  }

  const updateData: any = { status: newStatus };

  if (newStatus === "posted") {
    updateData.postedBy = body.postedBy ?? null;
    updateData.postedAt = new Date();

    // When posting, update account balances
    for (const line of entry.lines) {
      const account = await db.account.findUnique({ where: { id: line.accountId } });
      if (account) {
        const adjustment = account.normalBalance === "debit"
          ? line.debit - line.credit
          : line.credit - line.debit;
        await db.account.update({
          where: { id: account.id },
          data: { balance: account.balance + adjustment },
        });
      }
    }
  }

  if (newStatus === "verified") {
    updateData.verifiedBy = body.verifiedBy ?? null;
    updateData.verifiedAt = new Date();
  }

  if (newStatus === "cancelled" && entry.status === "posted") {
    // Reverse the account balance changes
    for (const line of entry.lines) {
      const account = await db.account.findUnique({ where: { id: line.accountId } });
      if (account) {
        const reversal = account.normalBalance === "debit"
          ? -(line.debit - line.credit)
          : -(line.credit - line.debit);
        await db.account.update({
          where: { id: account.id },
          data: { balance: account.balance + reversal },
        });
      }
    }
  }

  const updated = await db.journalEntry.update({
    where: { id },
    data: updateData,
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
    action: `JOURNAL_ENTRY_${newStatus.toUpperCase()}`,
    entityType: "JournalEntry",
    entityId: id,
    oldValue: entry,
    newValue: updated,
  });

  await broadcast(`accounting:journal_entry_${newStatus}`, updated, propertyId);

  return ok(updated);
});
