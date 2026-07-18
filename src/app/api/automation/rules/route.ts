// POST /api/automation/rules — Add a new automation rule
import { NextRequest } from "next/server";
import { ok, fail, parseBody, withHandler, logAudit, PROPERTY_ID } from "@/lib/hms";

export const dynamic = "force-dynamic";

export const POST = withHandler(async (req: NextRequest) => {
  const propertyId = await PROPERTY_ID();
  const body = await parseBody(req);
  const { rule, trigger, enabled } = body;

  if (!rule) return fail("Rule description is required", "VALIDATION");

  await logAudit({
    propertyId,
    action: "AUTOMATION_RULE_CREATED",
    entityType: "AutomationRule",
    newValue: { rule, trigger: trigger || "Manual", enabled: enabled ?? true },
  });

  return ok({
    id: `TA-${Date.now().toString(36).toUpperCase()}`,
    rule,
    trigger: trigger || "Manual",
    enabled: enabled ?? true,
  });
});
