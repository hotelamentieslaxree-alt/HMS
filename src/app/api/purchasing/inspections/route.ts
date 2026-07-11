// GET /api/purchasing/inspections — list inspections, filter by status
// POST /api/purchasing/inspections — create inspection record
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { ok, fail, parseBody, withHandler, broadcast, logAudit, PROPERTY_ID } from "@/lib/hms";

export const dynamic = "force-dynamic";

export const GET = withHandler(async (req: NextRequest) => {
  const propertyId = await PROPERTY_ID();
  const { searchParams } = new URL(req.url);

  const status = searchParams.get("status") || "";
  const amenityItemId = searchParams.get("amenityItemId") || "";
  const priority = searchParams.get("priority") || "";
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit")) || 20));
  const skip = (page - 1) * limit;

  const where: any = { propertyId };
  if (status) where.status = status;
  if (amenityItemId) where.amenityItemId = amenityItemId;
  if (priority) where.priority = priority;

  const [inspections, total] = await Promise.all([
    db.amenityInspection.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      include: {
        amenityItem: { select: { id: true, name: true, category: true, condition: true, location: true } },
      },
    }),
    db.amenityInspection.count({ where }),
  ]);

  return ok(inspections, { total, page, limit, pages: Math.ceil(total / limit) });
});

export const POST = withHandler(async (req: NextRequest) => {
  const propertyId = await PROPERTY_ID();
  const body = await parseBody(req);

  if (!body.amenityItemId || !body.inspectedBy || !body.condition) {
    return fail("amenityItemId, inspectedBy, and condition are required", "VALIDATION", 400);
  }

  const validConditions = ["good", "fair", "poor", "damaged", "needs_replacement"];
  if (!validConditions.includes(body.condition)) {
    return fail(`condition must be one of: ${validConditions.join(", ")}`, "VALIDATION", 400);
  }

  // Validate amenity item exists
  const item = await db.amenityItem.findFirst({
    where: { id: body.amenityItemId, propertyId },
  });
  if (!item) {
    return fail("Amenity item not found", "NOT_FOUND", 404);
  }

  const inspection = await db.amenityInspection.create({
    data: {
      propertyId,
      amenityItemId: body.amenityItemId,
      inspectedBy: body.inspectedBy,
      condition: body.condition,
      notes: body.notes ?? null,
      actionRequired: body.actionRequired ?? null,
      priority: body.priority ?? "normal",
      status: body.status ?? "pending",
      completedAt: body.completedAt ? new Date(body.completedAt) : null,
      roomId: body.roomId ?? null,
    },
    include: {
      amenityItem: { select: { id: true, name: true, category: true, condition: true, location: true } },
    },
  });

  // Update the amenity item's condition if it changed
  if (body.condition !== item.condition) {
    await db.amenityItem.update({
      where: { id: body.amenityItemId },
      data: { condition: body.condition },
    });
  }

  await logAudit({
    propertyId,
    action: "AMENITY_INSPECTION_CREATED",
    entityType: "AmenityInspection",
    entityId: inspection.id,
    newValue: inspection,
  });

  await broadcast("purchasing:inspection_created", inspection, propertyId);

  return ok(inspection);
});
