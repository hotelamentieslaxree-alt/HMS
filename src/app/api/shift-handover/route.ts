// GET /api/shift-handover
import { db } from "@/lib/db";
import { ok, PROPERTY_ID } from "@/lib/hms";

export const dynamic = "force-dynamic";

export async function GET() {
  const propertyId = await PROPERTY_ID();
  const handovers = await db.shiftHandover.findMany({
    where: { propertyId },
    orderBy: { createdAt: "desc" },
    take: 10,
    include: { property: true },
  });
  return ok(handovers.map((h) => ({
    id: h.id, fromUser: h.fromUser, toUser: h.toUser, shift: h.shift,
    notes: h.notes, openIssues: h.openIssues, createdAt: h.createdAt,
  })));
}
