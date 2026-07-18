// PUT /api/automation/approvals/[id] — Approve or reject an approval request
import { NextRequest } from "next/server";
import { ok, fail, parseBody, withHandler, logAudit, PROPERTY_ID } from "@/lib/hms";

export const dynamic = "force-dynamic";

export const PUT = withHandler(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const propertyId = await PROPERTY_ID();
  const body = await parseBody(req);
  const { action } = body;

  if (!action || !["approve", "reject"].includes(action)) {
    return fail("action must be 'approve' or 'reject'", "VALIDATION");
  }

  await logAudit({
    propertyId,
    action: action === "approve" ? "APPROVAL_APPROVED" : "APPROVAL_REJECTED",
    entityType: "Approval",
    entityId: id,
    newValue: { action },
  });

  return ok({
    id,
    status: action === "approve" ? "approved" : "rejected",
  });
});
