// PUT /api/rooms/[id]/status — update room status
import { db } from "@/lib/db";
import { ok, fail, parseBody, broadcast, logAudit, PROPERTY_ID } from "@/lib/hms";

export const dynamic = "force-dynamic";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const propertyId = await PROPERTY_ID();
  const body = await parseBody(req);
  const { status, reason } = body;
  const valid = ["vacant_clean", "vacant_dirty", "occupied_clean", "occupied_dirty", "out_of_order", "out_of_service"];
  if (!valid.includes(status)) return fail(`Invalid status. Valid: ${valid.join(", ")}`, "VALIDATION");

  const room = await db.room.findUnique({ where: { id } });
  if (!room) return fail("Room not found", "NOT_FOUND", 404);

  const oldStatus = room.currentStatus;
  await db.$transaction([
    db.room.update({ where: { id }, data: { currentStatus: status } }),
    db.roomStatusLog.create({ data: { roomId: id, oldStatus, newStatus: status, reason: reason ?? null, changedBy: "user" } }),
  ]);

  await logAudit({
    propertyId, action: "ROOM_STATUS_CHANGED", entityType: "room", entityId: id,
    oldValue: { status: oldStatus }, newValue: { status, reason }, userRole: "hk_mgr",
  });

  await broadcast("room.status.updated", { roomId: id, roomNumber: room.roomNumber, newStatus: status, reason }, propertyId);

  return ok({ id, oldStatus, newStatus: status });
}
