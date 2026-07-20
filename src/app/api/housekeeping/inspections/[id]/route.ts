// PUT /api/housekeeping/inspections/[id] — approve or reject an inspection
import { db } from "@/lib/db";
import { ok, fail, parseBody, broadcast, PROPERTY_ID, withHandler } from "@/lib/hms";

export const dynamic = "force-dynamic";

export const PUT = withHandler(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const propertyId = await PROPERTY_ID();
  const body = await parseBody(req);
  const { status, inspector, notes, rating, checklist } = body;

  if (!status || !["passed", "failed"].includes(status)) {
    return fail("Status must be 'passed' or 'failed'", "VALIDATION", 400);
  }

  const task = await db.housekeepingTask.findUnique({ where: { id }, include: { room: true } });
  if (!task) return fail("Inspection task not found", "NOT_FOUND", 404);

  const updates: any = {
    status: "inspected",
    inspectedAt: new Date(),
  };

  if (inspector) updates.inspectorName = inspector;
  if (notes) updates.notes = notes;
  if (rating !== undefined && rating !== null) updates.inspectionRating = Number(rating);
  if (checklist) updates.checklist = JSON.stringify(checklist);

  // If rejected, store reason
  if (status === "failed") {
    updates.rejectionReason = notes || "Inspection failed";
  }

  const updated = await db.housekeepingTask.update({
    where: { id },
    data: updates,
    include: { room: { include: { category: true } } },
  });

  // If passed, mark room as vacant_clean
  if (status === "passed" && updated.room.currentStatus === "vacant_dirty") {
    await db.room.update({ where: { id: updated.room.id }, data: { currentStatus: "vacant_clean" } });
    await db.roomStatusLog.create({
      data: { roomId: updated.room.id, oldStatus: "vacant_dirty", newStatus: "vacant_clean", reason: `Inspection passed — task ${id}` },
    });
  }

  await broadcast("hk.inspection.completed", {
    taskId: id,
    roomId: updated.room.id,
    roomNumber: updated.room.roomNumber,
    status,
    inspector: inspector || "Unknown",
    rating: rating || 0,
  }, propertyId);

  return ok({
    ...updated,
    inspectionStatus: status, // "passed" or "failed" for frontend clarity
  });
});
