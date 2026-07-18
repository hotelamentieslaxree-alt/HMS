// PUT /api/automation/workflows/[id] — Update workflow (toggle status, etc.)
import { NextRequest } from "next/server";
import { ok, fail, parseBody, withHandler, logAudit, PROPERTY_ID } from "@/lib/hms";

export const dynamic = "force-dynamic";

export const PUT = withHandler(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const propertyId = await PROPERTY_ID();
  const body = await parseBody(req);
  const { status } = body;

  if (!status || !["active", "paused"].includes(status)) {
    return fail("status must be 'active' or 'paused'", "VALIDATION");
  }

  await logAudit({
    propertyId,
    action: status === "active" ? "WORKFLOW_ACTIVATED" : "WORKFLOW_PAUSED",
    entityType: "Workflow",
    entityId: id,
    newValue: { status },
  });

  return ok({ id, status });
});
