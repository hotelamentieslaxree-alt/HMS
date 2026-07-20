// DELETE /api/pos/menu/categories/[id] — delete a category (cascades items)
import { db } from "@/lib/db";
import { ok, fail, broadcast, PROPERTY_ID, withHandler } from "@/lib/hms";

export const dynamic = "force-dynamic";

export const DELETE = withHandler(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const propertyId = await PROPERTY_ID();

  const category = await db.menuCategory.findUnique({
    where: { id },
    include: { outlet: true },
  });
  if (!category) return fail("Category not found", "NOT_FOUND", 404);
  if (category.outlet.propertyId !== propertyId) return fail("Forbidden", "FORBIDDEN", 403);

  await db.menuCategory.delete({ where: { id } });

  await broadcast("pos.menu.updated", { action: "category_deleted", categoryId: id, outletId: category.outletId }, propertyId);

  return ok({ deleted: true });
});
