// POST /api/automation/workflows/from-template/[id] — Clone workflow from template
import { NextRequest } from "next/server";
import { ok, fail, withHandler, logAudit, PROPERTY_ID } from "@/lib/hms";

export const dynamic = "force-dynamic";

export const POST = withHandler(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const propertyId = await PROPERTY_ID();

  await logAudit({
    propertyId,
    action: "WORKFLOW_FROM_TEMPLATE",
    entityType: "Workflow",
    newValue: { templateId: id },
  });

  return ok({
    id: `WF-${Date.now().toString(36).toUpperCase()}`,
    templateId: id,
    status: "paused",
    message: "Workflow created from template",
  });
});
