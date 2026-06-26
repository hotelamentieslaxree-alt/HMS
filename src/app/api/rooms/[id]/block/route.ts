// POST /api/rooms/[id]/block  +  DELETE /api/rooms/[id]/block
import { db } from "@/lib/db";
import { ok, fail, parseBody, broadcast, PROPERTY_ID, withHandler } from "@/lib/hms";

export const dynamic = "force-dynamic";

export const POST = withHandler(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const propertyId = await PROPERTY_ID();
  const body = await parseBody(req);
  const { reason, until, type = "out_of_order" } = body;
  const room = await db.room.findUnique({ where: { id } });
  if (!room) return fail("Room not found", "NOT_FOUND", 404);

  const updated = await db.room.update({
    where: { id },
    data: {
      currentStatus: type,
      blockedReason: reason || "Blocked",
      blockedUntil: until ? new Date(until) : null,
    },
  });

  await db.roomStatusLog.create({
    data: { roomId: id, oldStatus: room.currentStatus, newStatus: type, reason: reason ?? "Blocked" },
  });

  await broadcast("room.status.updated", { roomId: id, roomNumber: room.roomNumber, newStatus: type, reason }, propertyId);
  return ok(updated);
});

export const DELETE = withHandler(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const propertyId = await PROPERTY_ID();
  const room = await db.room.findUnique({ where: { id } });
  if (!room) return fail("Room not found", "NOT_FOUND", 404);

  const updated = await db.room.update({
    where: { id },
    data: { currentStatus: "vacant_dirty", blockedReason: null, blockedUntil: null },
  });
  await db.roomStatusLog.create({
    data: { roomId: id, oldStatus: room.currentStatus, newStatus: "vacant_dirty", reason: "Unblocked" },
  });
  await broadcast("room.status.updated", { roomId: id, roomNumber: room.roomNumber, newStatus: "vacant_dirty" }, propertyId);
  return ok(updated);
});
