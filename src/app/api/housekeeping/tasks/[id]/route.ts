// PUT /api/housekeeping/tasks/[id] — update task status (and optionally update room status)
import { db } from "@/lib/db";
import { ok, fail, parseBody, broadcast, PROPERTY_ID, withHandler } from "@/lib/hms";

export const dynamic = "force-dynamic";

export const PUT = withHandler(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const propertyId = await PROPERTY_ID();
  const body = await parseBody(req);
  const { status, rejectionReason, checklist, notes } = body;

  const task = await db.housekeepingTask.findUnique({ where: { id }, include: { room: true } });
  if (!task) return fail("Task not found", "NOT_FOUND", 404);

  const updates: any = {};
  if (status) updates.status = status;
  if (rejectionReason) updates.rejectionReason = rejectionReason;
  if (notes) updates.notes = notes;
  if (checklist) updates.checklist = checklist;

  if (status === "in_progress" && !task.startedAt) updates.startedAt = new Date();
  if (status === "completed" && !task.completedAt) updates.completedAt = new Date();
  if (status === "inspected") {
    updates.inspectedAt = new Date();
    updates.completedAt = task.completedAt ?? new Date();
  }

  const updated = await db.housekeepingTask.update({ where: { id }, data: updates, include: { room: { include: { category: true } } } });

  // When task completed or inspected, mark room vacant_clean (if it was dirty)
  if ((status === "completed" || status === "inspected") && updated.room.currentStatus === "vacant_dirty") {
    await db.room.update({ where: { id: updated.room.id }, data: { currentStatus: "vacant_clean" } });
    await db.roomStatusLog.create({
      data: { roomId: updated.room.id, oldStatus: "vacant_dirty", newStatus: "vacant_clean", reason: `HK ${status} — task ${id}` },
    });
    await broadcast("room.status.updated", {
      roomId: updated.room.id, roomNumber: updated.room.roomNumber, newStatus: "vacant_clean", reason: "Housekeeping complete",
    }, propertyId);
  }

  if (status === "completed" || status === "inspected") {
    await broadcast("hk.task.completed", {
      taskId: id, roomId: updated.room.id, roomNumber: updated.room.roomNumber, completedBy: "housekeeping",
    }, propertyId);
  }

  return ok(updated);
});
