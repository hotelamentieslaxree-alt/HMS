// PUT /api/accounting/billing-verification/[id] — update verification status, approve/reject
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { ok, fail, parseBody, withHandler, broadcast, logAudit, PROPERTY_ID, roundMoney } from "@/lib/hms";

export const dynamic = "force-dynamic";

export const PUT = withHandler(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const propertyId = await PROPERTY_ID();
  const { id } = await params;
  const body = await parseBody(req);

  const verification = await db.billingVerification.findFirst({
    where: { id, propertyId },
  });

  if (!verification) {
    return fail("Billing verification not found", "NOT_FOUND", 404);
  }

  const newStatus = body.status;
  if (!newStatus) {
    return fail("status is required", "VALIDATION", 400);
  }

  const validStatuses = ["pending", "verified", "discrepancy", "rejected", "approved"];
  if (!validStatuses.includes(newStatus)) {
    return fail(`status must be one of: ${validStatuses.join(", ")}`, "VALIDATION", 400);
  }

  const updateData: any = { status: newStatus };

  if (newStatus === "verified") {
    updateData.verifiedBy = body.verifiedBy ?? null;
    if (body.verifiedAmount !== undefined) {
      updateData.verifiedAmount = roundMoney(body.verifiedAmount);
      updateData.discrepancy = roundMoney(updateData.verifiedAmount - verification.amount);
    }
  }

  if (newStatus === "approved") {
    updateData.approvedBy = body.approvedBy ?? null;
    if (body.verifiedAmount !== undefined) {
      updateData.verifiedAmount = roundMoney(body.verifiedAmount);
      updateData.discrepancy = roundMoney(updateData.verifiedAmount - verification.amount);
    }
  }

  if (newStatus === "discrepancy") {
    updateData.verifiedBy = body.verifiedBy ?? null;
    if (body.verifiedAmount !== undefined) {
      updateData.verifiedAmount = roundMoney(body.verifiedAmount);
      updateData.discrepancy = roundMoney(updateData.verifiedAmount - verification.amount);
    }
  }

  if (body.notes !== undefined) {
    updateData.notes = body.notes;
  }
  if (body.checklist !== undefined) {
    updateData.checklist = JSON.stringify(body.checklist);
  }

  const updated = await db.billingVerification.update({
    where: { id },
    data: updateData,
  });

  await logAudit({
    propertyId,
    action: `BILLING_VERIFICATION_${newStatus.toUpperCase()}`,
    entityType: "BillingVerification",
    entityId: id,
    oldValue: verification,
    newValue: updated,
  });

  await broadcast(`accounting:billing_verification_${newStatus}`, updated, propertyId);

  return ok(updated);
});
