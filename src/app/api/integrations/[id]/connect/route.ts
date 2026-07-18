// POST /api/integrations/[id]/connect — Connect an integration
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { ok, fail, withHandler, logAudit, broadcast, PROPERTY_ID } from "@/lib/hms";

export const dynamic = "force-dynamic";

export const POST = withHandler(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const propertyId = await PROPERTY_ID();

  // Try to find existing config by matching provider ID
  const existing = await db.integrationConfig.findFirst({
    where: { propertyId, id },
  });

  if (existing) {
    // Update existing to active
    const updated = await db.integrationConfig.update({
      where: { id: existing.id },
      data: { isActive: true, lastSyncAt: new Date(), syncStatus: "success" },
    });

    await logAudit({
      propertyId,
      action: "INTEGRATION_CONNECTED",
      entityType: "IntegrationConfig",
      entityId: id,
      newValue: { provider: existing.provider, isActive: true },
    });

    await broadcast("integration:connected", { id, provider: existing.provider }, propertyId);

    return ok(updated);
  }

  // For new integrations not yet in DB, create a config entry
  // We'll use the integration ID as a provider key
  const providerMap: Record<string, { provider: string; category: string }> = {
    "INT-04": { provider: "airbnb", category: "ota" },
    "INT-07": { provider: "google_hotels", category: "ota" },
    "INT-09": { provider: "stripe", category: "payment" },
    "INT-10": { provider: "cashfree", category: "payment" },
    "INT-14": { provider: "tally", category: "accounting" },
    "INT-15": { provider: "zoho", category: "accounting" },
    "INT-16": { provider: "quickbooks", category: "accounting" },
  };

  const mapping = providerMap[id];
  if (!mapping) {
    return fail(`Unknown integration: ${id}`, "NOT_FOUND", 404);
  }

  const created = await db.integrationConfig.create({
    data: {
      propertyId,
      provider: mapping.provider,
      category: mapping.category,
      isActive: true,
      lastSyncAt: new Date(),
      syncStatus: "success",
    },
  });

  await logAudit({
    propertyId,
    action: "INTEGRATION_CONNECTED",
    entityType: "IntegrationConfig",
    entityId: created.id,
    newValue: { provider: mapping.provider, category: mapping.category },
  });

  await broadcast("integration:connected", { id, provider: mapping.provider }, propertyId);

  return ok(created);
});
