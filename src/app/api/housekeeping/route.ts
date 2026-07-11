// /api/housekeeping — task list + create
import { db } from "@/lib/db";
import { ok, fail, parseBody, broadcast, PROPERTY_ID, withHandler, safeJsonParse } from "@/lib/hms";

export const dynamic = "force-dynamic";

export const GET = withHandler(async (req: Request) => {
  const propertyId = await PROPERTY_ID();
  const url = new URL(req.url);
  const status = url.searchParams.get("status");

  const tasks = await db.housekeepingTask.findMany({
    where: { propertyId, ...(status ? { status } : {}) },
    include: { room: { include: { category: true } }, assignee: true, inspector: true },
    orderBy: [{ priority: "asc" }, { scheduledFor: "desc" }],
    take: 100,
  });

  const summary = {
    pending: tasks.filter((t) => t.status === "pending").length,
    in_progress: tasks.filter((t) => t.status === "in_progress").length,
    completed: tasks.filter((t) => t.status === "completed").length,
    inspected: tasks.filter((t) => t.status === "inspected").length,
    rejected: tasks.filter((t) => t.status === "rejected").length,
    total: tasks.length,
  };

  return ok({
    summary,
    tasks: tasks.map((t) => ({
      id: t.id,
      taskType: t.taskType,
      priority: t.priority,
      status: t.status,
      scheduledFor: t.scheduledFor,
      startedAt: t.startedAt,
      completedAt: t.completedAt,
      inspectedAt: t.inspectedAt,
      notes: t.notes,
      checklist: safeJsonParse(t.checklist, []),
      rejectionReason: t.rejectionReason,
      room: {
        id: t.room.id,
        number: t.room.roomNumber,
        floor: t.room.floor,
        status: t.room.currentStatus,
        category: t.room.category.name,
      },
      assignee: t.assignee ? { id: t.assignee.id, name: `${t.assignee.firstName} ${t.assignee.lastName}` } : null,
      inspector: t.inspector ? { id: t.inspector.id, name: `${t.inspector.firstName} ${t.inspector.lastName}` } : null,
    })),
  });
});

export const POST = withHandler(async (req: Request) => {
  const propertyId = await PROPERTY_ID();
  const body = await parseBody(req);
  const { roomId, taskType = "checkout_cleaning", priority = "normal", assignedToId, notes } = body;
  if (!roomId) return fail("roomId required", "VALIDATION");

  const task = await db.housekeepingTask.create({
    data: {
      propertyId, roomId, taskType, priority, assignedToId: assignedToId || null,
      notes: notes || null, scheduledFor: new Date(),
      checklist: JSON.stringify([
        { item: "Bed linen changed", done: false },
        { item: "Bathroom sanitized", done: false },
        { item: "Towels replaced", done: false },
        { item: "Amenities restocked", done: false },
        { item: "Floor vacuumed", done: false },
        { item: "Minibar checked", done: false },
      ]),
    },
    include: { room: { include: { category: true } }, assignee: true },
  });

  await broadcast("notification.system", {
    type: "info", title: "HK task assigned",
    message: `${taskType} for room ${task.room.roomNumber}`,
  }, propertyId);

  return ok(task);
});
