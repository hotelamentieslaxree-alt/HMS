// /api/pos/menu/categories — list + create
import { db } from "@/lib/db";
import { ok, fail, parseBody, broadcast, PROPERTY_ID, withHandler } from "@/lib/hms";

export const dynamic = "force-dynamic";

export const GET = withHandler(async (req: Request) => {
  const propertyId = await PROPERTY_ID();
  const url = new URL(req.url);
  const outletId = url.searchParams.get("outletId");

  const categories = await db.menuCategory.findMany({
    where: {
      outlet: { propertyId },
      ...(outletId ? { outletId } : {}),
    },
    include: { items: { orderBy: { name: "asc" } } },
    orderBy: { sortOrder: "asc" },
  });

  return ok(categories.map((c) => ({
    id: c.id,
    outletId: c.outletId,
    name: c.name,
    sortOrder: c.sortOrder,
    isActive: c.isActive,
    mealPeriod: c.mealPeriod,
    items: c.items.map((it) => ({
      id: it.id,
      name: it.name,
      description: it.description,
      price: it.price,
      itemType: it.itemType,
      dietType: it.dietType,
      isAvailable: it.isAvailable,
      isFeatured: it.isFeatured,
      preparationTimeMinutes: it.preparationTimeMinutes,
      recipeCost: it.recipeCost,
    })),
  })));
});

export const POST = withHandler(async (req: Request) => {
  const propertyId = await PROPERTY_ID();
  const body = await parseBody(req);
  const { outletId, name, sortOrder, mealPeriod } = body;

  if (!outletId) return fail("outletId is required", "VALIDATION");
  if (!name || !name.trim()) return fail("Category name is required", "VALIDATION");

  // Verify outlet belongs to this property
  const outlet = await db.outlet.findFirst({ where: { id: outletId, propertyId } });
  if (!outlet) return fail("Outlet not found", "NOT_FOUND", 404);

  const category = await db.menuCategory.create({
    data: {
      outletId,
      name: name.trim(),
      sortOrder: sortOrder ?? 0,
      mealPeriod: mealPeriod ?? "[]",
    },
    include: { items: true },
  });

  await broadcast("pos.menu.updated", { action: "category_created", categoryId: category.id, outletId }, propertyId);

  return ok({
    id: category.id,
    outletId: category.outletId,
    name: category.name,
    sortOrder: category.sortOrder,
    isActive: category.isActive,
    items: [],
  });
});
