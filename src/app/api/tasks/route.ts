// GET /api/tasks — list tasks with status, priority, assignee filters
// POST /api/tasks — create new task
// PUT /api/tasks — update task status
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { ok, fail, parseBody, withHandler, broadcast, logAudit, PROPERTY_ID } from "@/lib/hms";

export const dynamic = "force-dynamic";

export const GET = withHandler(async (req: NextRequest) => {
  const propertyId = await PROPERTY_ID();
  const { searchParams } = new URL(req.url);

  const status = searchParams.get("status") || "";
  const priority = searchParams.get("priority") || "";
  const assignedToId = searchParams.get("assignedToId") || "";
  const moduleKey = searchParams.get("moduleKey") || "";
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit")) || 20));
  const skip = (page - 1) * limit;

  const where: any = { propertyId };
  if (status) where.status = status;
  if (priority) where.priority = priority;
  if (assignedToId) where.assignedToId = assignedToId;
  if (moduleKey) where.moduleKey = moduleKey;

  const [tasks, total] = await Promise.all([
    db.task.findMany({
      where,
      include: {
        assignedTo: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
        assignedBy: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: [
        { priority: "desc" },
        { dueDate: "asc" },
        { createdAt: "desc" },
      ],
      skip,
      take: limit,
    }),
    db.task.count({ where }),
  ]);

  return ok(tasks, { total, page, limit, pages: Math.ceil(total / limit) });
});

export const POST = withHandler(async (req: NextRequest) => {
  const propertyId = await PROPERTY_ID();
  const body = await parseBody(req);

  if (!body.title) {
    return fail("title is required", "VALIDATION", 400);
  }

  const task = await db.task.create({
    data: {
      propertyId,
      title: body.title,
      description: body.description ?? null,
      status: body.status ?? "todo",
      priority: body.priority ?? "medium",
      assignedToId: body.assignedToId ?? null,
      assignedById: body.assignedById ?? null,
      dueDate: body.dueDate ? new Date(body.dueDate) : null,
      moduleKey: body.moduleKey ?? null,
      tags: body.tags ?? [],
    },
    include: {
      assignedTo: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
      assignedBy: { select: { id: true, firstName: true, lastName: true } },
    },
  });

  await logAudit({
    propertyId,
    action: "TASK_CREATED",
    entityType: "Task",
    entityId: task.id,
    newValue: task,
  });

  await broadcast("tasks:created", task, propertyId);

  return ok(task);
});

export const PUT = withHandler(async (req: NextRequest) => {
  const propertyId = await PROPERTY_ID();
  const body = await parseBody(req);

  const { id, status, ...rest } = body;

  if (!id) {
    return fail("id is required", "VALIDATION", 400);
  }

  const existing = await db.task.findUnique({ where: { id } });
  if (!existing) {
    return fail("Task not found", "NOT_FOUND", 404);
  }
  if (existing.propertyId !== propertyId) {
    return fail("Task does not belong to this property", "FORBIDDEN", 403);
  }

  const updateData: any = {};
  if (status) {
    updateData.status = status;
    // Auto-set completedAt when marking as done
    if (status === "done" && !existing.completedAt) {
      updateData.completedAt = new Date();
    }
  }
  // Allow updating other fields too
  if (rest.title !== undefined) updateData.title = rest.title;
  if (rest.description !== undefined) updateData.description = rest.description;
  if (rest.priority !== undefined) updateData.priority = rest.priority;
  if (rest.assignedToId !== undefined) updateData.assignedToId = rest.assignedToId;
  if (rest.dueDate !== undefined) updateData.dueDate = rest.dueDate ? new Date(rest.dueDate) : null;
  if (rest.tags !== undefined) updateData.tags = rest.tags;

  const task = await db.task.update({
    where: { id },
    data: updateData,
    include: {
      assignedTo: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
      assignedBy: { select: { id: true, firstName: true, lastName: true } },
    },
  });

  await logAudit({
    propertyId,
    action: status ? `TASK_STATUS_${status.toUpperCase()}` : "TASK_UPDATED",
    entityType: "Task",
    entityId: task.id,
    oldValue: existing,
    newValue: task,
  });

  await broadcast("tasks:updated", task, propertyId);

  return ok(task);
});
