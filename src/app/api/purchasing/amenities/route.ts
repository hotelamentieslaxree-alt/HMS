// GET /api/purchasing/amenities — list amenity items, filter by category/location, include items below PAR
// POST /api/purchasing/amenities — create amenity item
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { ok, fail, parseBody, withHandler, broadcast, logAudit, PROPERTY_ID } from "@/lib/hms";

export const dynamic = "force-dynamic";

export const GET = withHandler(async (req: NextRequest) => {
  const propertyId = await PROPERTY_ID();
  const { searchParams } = new URL(req.url);

  const category = searchParams.get("category") || "";
  const location = searchParams.get("location") || "";
  const belowPar = searchParams.get("belowPar") === "true";
  const isConsumable = searchParams.get("isConsumable");
  const search = searchParams.get("search") || "";
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit")) || 20));
  const skip = (page - 1) * limit;

  const where: any = { propertyId, isActive: true };
  if (category) where.category = category;
  if (location) where.location = location;
  if (isConsumable !== null && isConsumable !== undefined && isConsumable !== "")
    where.isConsumable = isConsumable === "true";
  if (search) {
    where.OR = [
      { name: { contains: search } },
      { sku: { contains: search } },
    ];
  }

  const [items, total] = await Promise.all([
    db.amenityItem.findMany({
      where,
      orderBy: { name: "asc" },
      skip,
      take: limit,
      include: {
        vendor: { select: { id: true, name: true, rating: true } },
        roomType: { select: { id: true, name: true, code: true } },
        _count: { select: { stockTransactions: true, inspections: true } },
      },
    }),
    db.amenityItem.count({ where }),
  ]);

  // Enrich with below-PAR flag
  const enriched = items.map((item) => ({
    ...item,
    isBelowPar: item.quantity < item.parLevel,
    availableQty: item.quantity - item.issuedQty,
  }));

  // If belowPar filter requested, filter in memory
  const filtered = belowPar ? enriched.filter((i) => i.isBelowPar) : enriched;

  // Count all items below PAR for summary
  const allItems = await db.amenityItem.findMany({
    where: { propertyId, isActive: true },
    select: { quantity: true, parLevel: true },
  });
  const belowParCount = allItems.filter((i) => i.quantity < i.parLevel).length;

  return ok(belowPar ? filtered : enriched, {
    total: belowPar ? filtered.length : total,
    page,
    limit,
    pages: Math.ceil((belowPar ? filtered.length : total) / limit),
    belowParCount,
  });
});

export const POST = withHandler(async (req: NextRequest) => {
  const propertyId = await PROPERTY_ID();
  const body = await parseBody(req);

  if (!body.name || !body.category) {
    return fail("name and category are required", "VALIDATION", 400);
  }

  const validCategories = [
    "kitchen", "bedroom_linen", "bathroom_linen", "minibar",
    "bathroom_amenity", "living_room", "safety", "electronics", "stationery",
  ];
  if (!validCategories.includes(body.category)) {
    return fail(`category must be one of: ${validCategories.join(", ")}`, "VALIDATION", 400);
  }

  const quantity = body.quantity ?? 0;
  const issuedQty = body.issuedQty ?? 0;

  const item = await db.amenityItem.create({
    data: {
      propertyId,
      name: body.name,
      category: body.category,
      subCategory: body.subCategory ?? null,
      sku: body.sku ?? null,
      unit: body.unit ?? "pcs",
      unitCost: body.unitCost ?? 0,
      quantity,
      parLevel: body.parLevel ?? 0,
      maxStock: body.maxStock ?? 0,
      reorderQty: body.reorderQty ?? 0,
      seasonBuffer: body.seasonBuffer ?? 0,
      location: body.location ?? "warehouse",
      condition: body.condition ?? "good",
      lifecycleDays: body.lifecycleDays ?? 365,
      purchaseDate: body.purchaseDate ? new Date(body.purchaseDate) : null,
      lastInventory: body.lastInventory ? new Date(body.lastInventory) : null,
      vendorId: body.vendorId ?? null,
      roomTypeId: body.roomTypeId ?? null,
      isConsumable: body.isConsumable ?? true,
      minPerRoom: body.minPerRoom ?? 1,
      issuedQty,
      availableQty: quantity - issuedQty,
      isActive: body.isActive ?? true,
    },
    include: {
      vendor: { select: { id: true, name: true, rating: true } },
      roomType: { select: { id: true, name: true, code: true } },
    },
  });

  await logAudit({
    propertyId,
    action: "AMENITY_ITEM_CREATED",
    entityType: "AmenityItem",
    entityId: item.id,
    newValue: item,
  });

  await broadcast("purchasing:amenity_item_created", item, propertyId);

  // Alert if item is already below PAR
  if (item.quantity < item.parLevel) {
    await broadcast("purchasing:below_par_alert", item, propertyId);
  }

  return ok(item);
});
