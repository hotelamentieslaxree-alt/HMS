// PUT /api/settings/property — Update property settings
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { ok, fail, parseBody, withHandler, logAudit, broadcast, PROPERTY_ID, invalidatePropertyCache } from "@/lib/hms";

export const dynamic = "force-dynamic";

export const PUT = withHandler(async (req: NextRequest) => {
  const propertyId = await PROPERTY_ID();
  const body = await parseBody(req);
  const { name, code, timezone, currency, address, phone } = body;

  const updateData: Record<string, any> = {};
  if (name) updateData.name = name;
  if (code) updateData.code = code;
  if (timezone) updateData.timezone = timezone;
  if (currency) updateData.currency = currency;
  if (address) updateData.city = address;

  if (Object.keys(updateData).length === 0) {
    return fail("No fields to update", "VALIDATION");
  }

  const updated = await db.property.update({
    where: { id: propertyId },
    data: updateData,
  });

  invalidatePropertyCache();

  await logAudit({
    propertyId,
    action: "PROPERTY_SETTINGS_UPDATED",
    entityType: "Property",
    entityId: propertyId,
    newValue: updateData,
  });

  await broadcast("settings:updated", { propertyId, fields: Object.keys(updateData) }, propertyId);

  return ok(updated);
});
