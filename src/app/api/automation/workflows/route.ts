// POST /api/automation/workflows — Create a new workflow
import { NextRequest } from "next/server";
import { ok, fail, parseBody, withHandler, logAudit, PROPERTY_ID } from "@/lib/hms";

export const dynamic = "force-dynamic";

export const POST = withHandler(async (req: NextRequest) => {
  const propertyId = await PROPERTY_ID();
  const body = await parseBody(req);
  const { name, trigger, actions } = body;

  if (!name) return fail("Workflow name is required", "VALIDATION");

  await logAudit({
    propertyId,
    action: "WORKFLOW_CREATED",
    entityType: "Workflow",
    newValue: { name, trigger, actions: actions ?? 1 },
  });

  return ok({
    id: `WF-${Date.now().toString(36).toUpperCase()}`,
    name,
    trigger: trigger || "Manual trigger",
    actions: actions ?? 1,
    status: "paused",
  });
});
