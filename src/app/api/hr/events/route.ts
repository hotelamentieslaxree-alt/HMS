// /api/hr/events — Company events CRUD
import { db } from "@/lib/db";
import { ok, fail, parseBody, PROPERTY_ID, withHandler } from "@/lib/hms";

export const dynamic = "force-dynamic";

// ── GET: list events for a given month/year with summary ────────────────────────
export const GET = withHandler(async (req: Request) => {
  const propertyId = await PROPERTY_ID();
  const url = new URL(req.url);

  const now = new Date();
  const month = parseInt(url.searchParams.get("month") || String(now.getMonth() + 1), 10);
  const year = parseInt(url.searchParams.get("year") || String(now.getFullYear()), 10);
  const type = url.searchParams.get("type");
  const status = url.searchParams.get("status");

  // Build date range for the requested month
  const startOfMonth = new Date(year, month - 1, 1);
  const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);

  const where: any = {
    propertyId,
    eventDate: { gte: startOfMonth, lte: endOfMonth },
    ...(type ? { type } : {}),
    ...(status ? { status } : {}),
  };

  const events = await db.companyEvent.findMany({
    where,
    include: { organizer: true },
    orderBy: [{ eventDate: "asc" }, { createdAt: "desc" }],
  });

  // Summary counts by type and status
  const typeCounts: Record<string, number> = {};
  const statusCounts: Record<string, number> = {};

  for (const e of events) {
    typeCounts[e.type] = (typeCounts[e.type] || 0) + 1;
    statusCounts[e.status] = (statusCounts[e.status] || 0) + 1;
  }

  return ok({
    summary: { byType: typeCounts, byStatus: statusCounts, total: events.length },
    events: events.map((e) => ({
      id: e.id,
      title: e.title,
      description: e.description,
      type: e.type,
      eventDate: e.eventDate,
      endDate: e.endDate,
      venue: e.venue,
      status: e.status,
      organizerId: e.organizerId,
      organizerName: e.organizer
        ? `${e.organizer.firstName} ${e.organizer.lastName}`
        : null,
      createdAt: e.createdAt,
      updatedAt: e.updatedAt,
    })),
  });
});

// ── POST: create a new event ────────────────────────────────────────────────────
export const POST = withHandler(async (req: Request) => {
  const propertyId = await PROPERTY_ID();
  const body = await parseBody(req);

  const { title, description, type, eventDate, endDate, venue, organizerId, status } = body;

  if (!title) return fail("title is required", "VALIDATION");
  if (!type) return fail("type is required", "VALIDATION");
  if (!eventDate) return fail("eventDate is required", "VALIDATION");

  const validTypes = ["festival", "training", "meeting", "celebration", "audit", "inspection", "other"];
  if (!validTypes.includes(type)) return fail(`type must be one of: ${validTypes.join(", ")}`, "VALIDATION");

  const validStatuses = ["upcoming", "ongoing", "completed", "cancelled"];
  const eventStatus = status || "upcoming";
  if (!validStatuses.includes(eventStatus)) return fail(`status must be one of: ${validStatuses.join(", ")}`, "VALIDATION");

  const event = await db.companyEvent.create({
    data: {
      propertyId,
      title,
      description: description || null,
      type,
      eventDate: new Date(eventDate),
      endDate: endDate ? new Date(endDate) : null,
      venue: venue || null,
      organizerId: organizerId || null,
      status: eventStatus,
    },
    include: { organizer: true },
  });

  return ok({
    id: event.id,
    title: event.title,
    description: event.description,
    type: event.type,
    eventDate: event.eventDate,
    endDate: event.endDate,
    venue: event.venue,
    status: event.status,
    organizerId: event.organizerId,
    organizerName: event.organizer
      ? `${event.organizer.firstName} ${event.organizer.lastName}`
      : null,
    createdAt: event.createdAt,
    updatedAt: event.updatedAt,
  });
});

// ── PUT: update an existing event ───────────────────────────────────────────────
export const PUT = withHandler(async (req: Request) => {
  const propertyId = await PROPERTY_ID();
  const body = await parseBody(req);

  const { id, title, description, type, eventDate, endDate, venue, organizerId, status } = body;

  if (!id) return fail("id is required", "VALIDATION");

  // Verify event belongs to property
  const existing = await db.companyEvent.findFirst({ where: { id, propertyId } });
  if (!existing) return fail("Event not found", "NOT_FOUND", 404);

  if (type) {
    const validTypes = ["festival", "training", "meeting", "celebration", "audit", "inspection", "other"];
    if (!validTypes.includes(type)) return fail(`type must be one of: ${validTypes.join(", ")}`, "VALIDATION");
  }

  if (status) {
    const validStatuses = ["upcoming", "ongoing", "completed", "cancelled"];
    if (!validStatuses.includes(status)) return fail(`status must be one of: ${validStatuses.join(", ")}`, "VALIDATION");
  }

  const data: any = {};
  if (title !== undefined) data.title = title;
  if (description !== undefined) data.description = description || null;
  if (type !== undefined) data.type = type;
  if (eventDate !== undefined) data.eventDate = new Date(eventDate);
  if (endDate !== undefined) data.endDate = endDate ? new Date(endDate) : null;
  if (venue !== undefined) data.venue = venue || null;
  if (organizerId !== undefined) data.organizerId = organizerId || null;
  if (status !== undefined) data.status = status;

  const event = await db.companyEvent.update({
    where: { id },
    data,
    include: { organizer: true },
  });

  return ok({
    id: event.id,
    title: event.title,
    description: event.description,
    type: event.type,
    eventDate: event.eventDate,
    endDate: event.endDate,
    venue: event.venue,
    status: event.status,
    organizerId: event.organizerId,
    organizerName: event.organizer
      ? `${event.organizer.firstName} ${event.organizer.lastName}`
      : null,
    createdAt: event.createdAt,
    updatedAt: event.updatedAt,
  });
});
