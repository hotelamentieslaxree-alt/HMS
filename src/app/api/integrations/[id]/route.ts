// PUT /api/integrations/[id] — Update integration configuration
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { ok, fail, parseBody, withHandler, logAudit, PROPERTY_ID } from "@/lib/hms";

export const dynamic = "force-dynamic";

export const PUT = withHandler(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const propertyId = await PROPERTY_ID();
  const body = await parseBody(req);
  const { settings } = body;

  // Find integration config or create a virtual reference
  const integration = await db.integrationConfig.findFirst({
    where: { propertyId, id },
  });

  if (integration) {
    const updated = await db.integrationConfig.update({
      where: { id: integration.id },
      data: { settings: settings ? JSON.stringify(settings) : undefined },
    });
    await logAudit({
      propertyId,
      action: "INTEGRATION_CONFIGURED",
      entityType: "IntegrationConfig",
      entityId: id,
      newValue: { settings: !!settings },
    });
    return ok(updated);
  }

  // For integrations not yet in DB, just log the audit
  await logAudit({
    propertyId,
    action: "INTEGRATION_CONFIGURED",
    entityType: "IntegrationConfig",
    entityId: id,
    newValue: { settings: !!settings },
  });

  return ok({ id, settings: settings || {}, updated: true });
});
