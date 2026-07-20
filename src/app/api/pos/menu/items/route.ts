// POST /api/pos/menu/items — create a menu item
import { db } from "@/lib/db";
import { ok, fail, parseBody, broadcast, PROPERTY_ID, withHandler } from "@/lib/hms";

export const dynamic = "force-dynamic";

export const POST = withHandler(async (req: Request) => {
  const propertyId = await PROPERTY_ID();
  const body = await parseBody(req);
  const {
    categoryId, name, description, price, itemType = "food",
    dietType = "veg", allergens, preparationTimeMinutes, isAvailable,
    isFeatured, photoUrl, recipeCost,
  } = body;

  if (!categoryId) return fail("categoryId is required", "VALIDATION");
  if (!name || !name.trim()) return fail("Item name is required", "VALIDATION");
  if (price === undefined || price === null || Number(price) <= 0) return fail("Price must be greater than 0", "VALIDATION");

  // Verify category belongs to this property
  const category = await db.menuCategory.findUnique({
    where: { id: categoryId },
    include: { outlet: true },
  });
  if (!category) return fail("Category not found", "NOT_FOUND", 404);
  if (category.outlet.propertyId !== propertyId) return fail("Forbidden", "FORBIDDEN", 403);

  const item = await db.menuItem.create({
    data: {
      categoryId,
      name: name.trim(),
      description: description?.trim() || null,
      price: Number(price),
      itemType,
      dietType,
      allergens: allergens ?? "[]",
      preparationTimeMinutes: preparationTimeMinutes ?? 15,
      isAvailable: isAvailable !== undefined ? Boolean(isAvailable) : true,
      isFeatured: isFeatured !== undefined ? Boolean(isFeatured) : false,
      photoUrl: photoUrl || null,
      recipeCost: recipeCost ? Number(recipeCost) : 0,
    },
  });

  await broadcast("pos.menu.updated", { action: "item_created", itemId: item.id, categoryId, outletId: category.outletId }, propertyId);

  return ok({
    id: item.id,
    categoryId: item.categoryId,
    name: item.name,
    description: item.description,
    price: item.price,
    itemType: item.itemType,
    dietType: item.dietType,
    isAvailable: item.isAvailable,
    isFeatured: item.isFeatured,
    preparationTimeMinutes: item.preparationTimeMinutes,
    recipeCost: item.recipeCost,
  });
});
