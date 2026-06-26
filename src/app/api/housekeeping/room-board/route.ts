// GET /api/housekeeping/room-board — live room status grid (alias of /api/rooms)
import { db } from "@/lib/db";
import { ok, PROPERTY_ID } from "@/lib/hms";

export const dynamic = "force-dynamic";

export async function GET() {
  const propertyId = await PROPERTY_ID();
  const rooms = await db.room.findMany({
    where: { propertyId },
    include: { category: true },
    orderBy: [{ floor: "asc" }, { roomNumber: "asc" }],
  });
  const counts: Record<string, number> = {};
  for (const r of rooms) counts[r.currentStatus] = (counts[r.currentStatus] ?? 0) + 1;
  return ok({
    counts,
    total: rooms.length,
    rooms: rooms.map((r) => ({
      id: r.id, roomNumber: r.roomNumber, floor: r.floor, wing: r.wing,
      status: r.currentStatus, blockedReason: r.blockedReason, blockedUntil: r.blockedUntil,
      category: r.category.name,
    })),
  });
}
