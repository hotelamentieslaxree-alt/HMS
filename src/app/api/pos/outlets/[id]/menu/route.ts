// GET /api/pos/outlets/[id]/menu — full menu for an outlet (with tables for POS UI)
import { db } from "@/lib/db";
import { ok, fail, withHandler } from "@/lib/hms";

export const dynamic = "force-dynamic";

export const GET = withHandler(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const outlet = await db.outlet.findUnique({
    where: { id },
    include: { tables: { orderBy: { tableNumber: "asc" } } },
  });
  if (!outlet) return fail("Outlet not found", "NOT_FOUND", 404);

  const categories = await db.menuCategory.findMany({
    where: { outletId: id, isActive: true },
    include: { items: { where: { isAvailable: true }, orderBy: { name: "asc" } } },
    orderBy: { sortOrder: "asc" },
  });

  return ok({
    outlet: { id: outlet.id, name: outlet.name, code: outlet.code, type: outlet.type, tableCount: outlet.tableCount },
    tables: outlet.tables.map((t) => ({
      id: t.id,
      number: t.tableNumber,
      capacity: t.capacity,
      status: t.status,
      section: t.section,
    })),
    categories: categories.map((c) => ({
      id: c.id, name: c.name, sortOrder: c.sortOrder,
      items: c.items.map((it) => ({
        id: it.id, name: it.name, description: it.description, price: it.price,
        itemType: it.itemType, dietType: it.dietType,
        preparationTimeMinutes: it.preparationTimeMinutes,
        isFeatured: it.isFeatured, recipeCost: it.recipeCost,
        foodCostPercent: it.recipeCost > 0 ? Math.round((it.recipeCost / it.price) * 100) : 0,
      })),
    })),
  });
});
