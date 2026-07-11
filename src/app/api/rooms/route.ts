// GET /api/rooms — list all rooms with category + status
import { db } from "@/lib/db";
import { ok, PROPERTY_ID, withHandler, safeJsonParse } from "@/lib/hms";

export const dynamic = "force-dynamic";

export const GET = withHandler(async () => {
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
      id: r.id,
      roomNumber: r.roomNumber,
      floor: r.floor,
      wing: r.wing,
      currentStatus: r.currentStatus,
      isSmoking: r.isSmoking,
      isAccessible: r.isAccessible,
      blockedReason: r.blockedReason,
      blockedUntil: r.blockedUntil,
      notes: r.notes,
      category: { id: r.category.id, name: r.category.name, code: r.category.code, baseRate: r.category.baseRate, maxAdults: r.category.maxAdults, maxChildren: r.category.maxChildren, amenities: safeJsonParse(r.category.amenities, []) },
    })),
  });
});
