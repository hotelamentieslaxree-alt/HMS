// GET /api/inventory/stock — list stock items with category filter, low-stock highlight
// POST /api/inventory/stock — create new stock item
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { ok, fail, parseBody, withHandler, broadcast, logAudit, PROPERTY_ID } from "@/lib/hms";

export const dynamic = "force-dynamic";

export const GET = withHandler(async (req: NextRequest) => {
  const propertyId = await PROPERTY_ID();
  const { searchParams } = new URL(req.url);

  const category = searchParams.get("category") || "";
  const lowStock = searchParams.get("lowStock") === "true";
  const search = searchParams.get("search") || "";
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit")) || 20));
  const skip = (page - 1) * limit;

  const where: any = { propertyId, isActive: true };
  if (category) where.category = category;
  if (search) {
    where.OR = [
      { name: { contains: search } },
      { sku: { contains: search } },
    ];
  }

  const [items, total] = await Promise.all([
    db.stockItem.findMany({
      where,
      orderBy: { name: "asc" },
      skip,
      take: limit,
    }),
    db.stockItem.count({ where }),
  ]);

  // Mark low-stock items (compare quantity vs reorderLevel in-memory since Prisma/SQLite
  // does not support column-to-column comparison in where clauses)
  const enriched = items.map((item) => ({
    ...item,
    isLowStock: item.quantity <= item.reorderLevel,
  }));

  // If lowStock filter is requested, filter in-memory after enrichment
  const filtered = lowStock ? enriched.filter((i) => i.isLowStock) : enriched;

  // Low stock summary — fetch all active items and count in-memory
  const allItemsForCount = await db.stockItem.findMany({
    where: { propertyId, isActive: true },
    select: { quantity: true, reorderLevel: true },
  });
  const lowStockCount = allItemsForCount.filter((i) => i.quantity <= i.reorderLevel).length;

  return ok(lowStock ? filtered : enriched, {
    total: lowStock ? filtered.length : total,
    page,
    limit,
    pages: Math.ceil((lowStock ? filtered.length : total) / limit),
    lowStockCount,
  });
});

export const POST = withHandler(async (req: NextRequest) => {
  const propertyId = await PROPERTY_ID();
  const body = await parseBody(req);

  if (!body.name) {
    return fail("name is required", "VALIDATION", 400);
  }

  const item = await db.stockItem.create({
    data: {
      propertyId,
      name: body.name,
      sku: body.sku ?? null,
      category: body.category ?? null,
      unit: body.unit ?? "pcs",
      quantity: body.quantity ?? 0,
      reorderLevel: body.reorderLevel ?? 0,
      maxStock: body.maxStock ?? 0,
      unitCost: body.unitCost ?? 0,
      sellingPrice: body.sellingPrice ?? 0,
      location: body.location ?? null,
      vendorId: body.vendorId ?? null,
      expiryDate: body.expiryDate ? new Date(body.expiryDate) : null,
      isActive: body.isActive ?? true,
    },
  });

  await logAudit({
    propertyId,
    action: "STOCK_ITEM_CREATED",
    entityType: "StockItem",
    entityId: item.id,
    newValue: item,
  });

  await broadcast("inventory:stock_created", item, propertyId);

  // Alert if item is already at or below reorder level
  if (item.quantity <= item.reorderLevel) {
    await broadcast("inventory:low_stock_alert", item, propertyId);
  }

  return ok(item);
});
