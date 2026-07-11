// PUT /api/purchasing/inspections/[id] — update inspection status
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { ok, fail, parseBody, withHandler, broadcast, logAudit, PROPERTY_ID } from "@/lib/hms";

export const dynamic = "force-dynamic";

export const PUT = withHandler(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const propertyId = await PROPERTY_ID();
  const { id } = await params;
  const body = await parseBody(req);

  const inspection = await db.amenityInspection.findFirst({
    where: { id, propertyId },
  });

  if (!inspection) {
    return fail("Inspection not found", "NOT_FOUND", 404);
  }

  const updateData: any = {};

  if (body.status) {
    const validStatuses = ["pending", "in_progress", "completed"];
    if (!validStatuses.includes(body.status)) {
      return fail(`status must be one of: ${validStatuses.join(", ")}`, "VALIDATION", 400);
    }
    updateData.status = body.status;
  }

  if (body.condition) {
    const validConditions = ["good", "fair", "poor", "damaged", "needs_replacement"];
    if (!validConditions.includes(body.condition)) {
      return fail(`condition must be one of: ${validConditions.join(", ")}`, "VALIDATION", 400);
    }
    updateData.condition = body.condition;

    // Also update the amenity item's condition
    await db.amenityItem.update({
      where: { id: inspection.amenityItemId },
      data: { condition: body.condition },
    });
  }

  if (body.notes !== undefined) updateData.notes = body.notes;
  if (body.actionRequired !== undefined) updateData.actionRequired = body.actionRequired;
  if (body.priority) {
    const validPriorities = ["urgent", "high", "normal", "low"];
    if (!validPriorities.includes(body.priority)) {
      return fail(`priority must be one of: ${validPriorities.join(", ")}`, "VALIDATION", 400);
    }
    updateData.priority = body.priority;
  }

  // Mark completedAt when status changes to completed
  if (body.status === "completed" && inspection.status !== "completed") {
    updateData.completedAt = new Date();
  }

  if (Object.keys(updateData).length === 0) {
    return fail("No fields to update", "VALIDATION", 400);
  }

  const updated = await db.amenityInspection.update({
    where: { id },
    data: updateData,
    include: {
      amenityItem: { select: { id: true, name: true, category: true, condition: true, location: true } },
    },
  });

  await logAudit({
    propertyId,
    action: `INSPECTION_${(body.status || "updated").toUpperCase()}`,
    entityType: "AmenityInspection",
    entityId: id,
    oldValue: inspection,
    newValue: updated,
  });

  await broadcast("purchasing:inspection_updated", updated, propertyId);

  return ok(updated);
});
