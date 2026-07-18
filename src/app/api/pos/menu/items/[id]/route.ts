// PUT /api/pos/menu/items/[id] — update a menu item
// DELETE /api/pos/menu/items/[id] — delete a menu item
import { db } from "@/lib/db";
import { ok, fail, parseBody, broadcast, PROPERTY_ID, withHandler } from "@/lib/hms";

export const dynamic = "force-dynamic";

export const PUT = withHandler(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const propertyId = await PROPERTY_ID();
  const body = await parseBody(req);

  // Verify item exists and belongs to this property
  const existing = await db.menuItem.findUnique({
    where: { id },
    include: { category: { include: { outlet: true } } },
  });
  if (!existing) return fail("Item not found", "NOT_FOUND", 404);
  if (existing.category.outlet.propertyId !== propertyId) return fail("Forbidden", "FORBIDDEN", 403);

  const {
    name, description, price, itemType, dietType, allergens,
    preparationTimeMinutes, isAvailable, isFeatured, photoUrl,
    recipeCost, categoryId,
  } = body;

  // If categoryId is changing, verify the new category
  if (categoryId && categoryId !== existing.categoryId) {
    const newCat = await db.menuCategory.findUnique({
      where: { id: categoryId },
      include: { outlet: true },
    });
    if (!newCat) return fail("Target category not found", "NOT_FOUND", 404);
    if (newCat.outlet.propertyId !== propertyId) return fail("Forbidden", "FORBIDDEN", 403);
  }

  const updates: Record<string, any> = {};
  if (name !== undefined) updates.name = name.trim();
  if (description !== undefined) updates.description = description?.trim() || null;
  if (price !== undefined) updates.price = Number(price);
  if (itemType !== undefined) updates.itemType = itemType;
  if (dietType !== undefined) updates.dietType = dietType;
  if (allergens !== undefined) updates.allergens = allergens;
  if (preparationTimeMinutes !== undefined) updates.preparationTimeMinutes = Number(preparationTimeMinutes);
  if (isAvailable !== undefined) updates.isAvailable = Boolean(isAvailable);
  if (isFeatured !== undefined) updates.isFeatured = Boolean(isFeatured);
  if (photoUrl !== undefined) updates.photoUrl = photoUrl || null;
  if (recipeCost !== undefined) updates.recipeCost = Number(recipeCost);
  if (categoryId !== undefined) updates.categoryId = categoryId;

  const updated = await db.menuItem.update({
    where: { id },
    data: updates,
  });

  await broadcast("pos.menu.updated", {
    action: "item_updated", itemId: id, categoryId: updated.categoryId,
    outletId: existing.category.outletId,
  }, propertyId);

  return ok({
    id: updated.id,
    categoryId: updated.categoryId,
    name: updated.name,
    description: updated.description,
    price: updated.price,
    itemType: updated.itemType,
    dietType: updated.dietType,
    isAvailable: updated.isAvailable,
    isFeatured: updated.isFeatured,
    preparationTimeMinutes: updated.preparationTimeMinutes,
    recipeCost: updated.recipeCost,
  });
});

export const DELETE = withHandler(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const propertyId = await PROPERTY_ID();

  const item = await db.menuItem.findUnique({
    where: { id },
    include: { category: { include: { outlet: true } } },
  });
  if (!item) return fail("Item not found", "NOT_FOUND", 404);
  if (item.category.outlet.propertyId !== propertyId) return fail("Forbidden", "FORBIDDEN", 403);

  await db.menuItem.delete({ where: { id } });

  await broadcast("pos.menu.updated", {
    action: "item_deleted", itemId: id, categoryId: item.categoryId,
    outletId: item.category.outletId,
  }, propertyId);

  return ok({ deleted: true });
});
