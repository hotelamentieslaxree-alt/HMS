// PUT /api/purchasing/amenities/[id] — update amenity item
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { ok, fail, parseBody, withHandler, broadcast, logAudit, PROPERTY_ID } from "@/lib/hms";

export const dynamic = "force-dynamic";

export const PUT = withHandler(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const propertyId = await PROPERTY_ID();
  const { id } = await params;
  const body = await parseBody(req);

  const item = await db.amenityItem.findFirst({
    where: { id, propertyId },
  });

  if (!item) {
    return fail("Amenity item not found", "NOT_FOUND", 404);
  }

  // Build update data from provided fields
  const updateData: any = {};

  const allowedFields = [
    "name", "category", "subCategory", "sku", "unit", "unitCost",
    "parLevel", "maxStock", "reorderQty", "seasonBuffer", "location",
    "condition", "lifecycleDays", "vendorId", "roomTypeId",
    "isConsumable", "minPerRoom", "isActive",
  ];

  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      updateData[field] = body[field];
    }
  }

  // Handle date fields
  if (body.purchaseDate !== undefined) {
    updateData.purchaseDate = body.purchaseDate ? new Date(body.purchaseDate) : null;
  }
  if (body.lastInventory !== undefined) {
    updateData.lastInventory = body.lastInventory ? new Date(body.lastInventory) : null;
  }

  // If quantity or issuedQty changes, recalculate availableQty
  if (body.quantity !== undefined || body.issuedQty !== undefined) {
    const newQuantity = body.quantity ?? item.quantity;
    const newIssuedQty = body.issuedQty ?? item.issuedQty;
    updateData.quantity = newQuantity;
    updateData.issuedQty = newIssuedQty;
    updateData.availableQty = newQuantity - newIssuedQty;
  }

  if (Object.keys(updateData).length === 0) {
    return fail("No fields to update", "VALIDATION", 400);
  }

  const updated = await db.amenityItem.update({
    where: { id },
    data: updateData,
    include: {
      vendor: { select: { id: true, name: true, rating: true } },
      roomType: { select: { id: true, name: true, code: true } },
    },
  });

  await logAudit({
    propertyId,
    action: "AMENITY_ITEM_UPDATED",
    entityType: "AmenityItem",
    entityId: id,
    oldValue: item,
    newValue: updated,
  });

  await broadcast("purchasing:amenity_item_updated", updated, propertyId);

  // Check if item is now below PAR after update
  if (updated.quantity < updated.parLevel && item.quantity >= item.parLevel) {
    await broadcast("purchasing:below_par_alert", updated, propertyId);
  }

  return ok(updated);
});
