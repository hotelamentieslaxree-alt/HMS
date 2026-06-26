// /api/maintenance — list + create tickets
import { db } from "@/lib/db";
import { ok, fail, parseBody, PROPERTY_ID } from "@/lib/hms";

export const dynamic = "force-dynamic";

export async function GET() {
  const propertyId = await PROPERTY_ID();
  const tickets = await db.maintenanceTicket.findMany({
    where: { propertyId },
    include: { room: true },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: 50,
  });
  const summary = {
    open: tickets.filter((t) => t.status === "open").length,
    in_progress: tickets.filter((t) => t.status === "in_progress").length,
    completed: tickets.filter((t) => t.status === "completed").length,
  };
  return ok({
    summary,
    tickets: tickets.map((t) => ({
      id: t.id, title: t.title, description: t.description, priority: t.priority,
      status: t.status, category: t.category, createdAt: t.createdAt, completedAt: t.completedAt,
      room: t.room ? { id: t.room.id, number: t.room.roomNumber, floor: t.room.floor } : null,
    })),
  });
}

export async function POST(req: Request) {
  const propertyId = await PROPERTY_ID();
  const body = await parseBody(req);
  const { title, description, priority = "normal", category, roomId } = body;
  if (!title) return fail("title required", "VALIDATION");
  const ticket = await db.maintenanceTicket.create({
    data: { propertyId, title, description: description || null, priority, category: category || null, roomId: roomId || null, raisedBy: "user", status: "open" },
    include: { room: true },
  });
  return ok(ticket);
}
