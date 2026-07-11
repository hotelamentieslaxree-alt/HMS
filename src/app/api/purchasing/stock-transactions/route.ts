// GET /api/purchasing/stock-transactions — list stock transactions, filter by item/type/date
// POST /api/purchasing/stock-transactions — create stock transaction (also updates AmenityItem quantity)
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { ok, fail, parseBody, withHandler, broadcast, logAudit, PROPERTY_ID, roundMoney } from "@/lib/hms";

export const dynamic = "force-dynamic";

export const GET = withHandler(async (req: NextRequest) => {
  const propertyId = await PROPERTY_ID();
  const { searchParams } = new URL(req.url);

  const amenityItemId = searchParams.get("amenityItemId") || "";
  const transactionType = searchParams.get("transactionType") || "";
  const dateFrom = searchParams.get("dateFrom") || "";
  const dateTo = searchParams.get("dateTo") || "";
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit")) || 20));
  const skip = (page - 1) * limit;

  const where: any = { propertyId };
  if (amenityItemId) where.amenityItemId = amenityItemId;
  if (transactionType) where.transactionType = transactionType;
  if (dateFrom || dateTo) {
    where.createdAt = {};
    if (dateFrom) where.createdAt.gte = new Date(dateFrom);
    if (dateTo) where.createdAt.lte = new Date(dateTo);
  }

  const [transactions, total] = await Promise.all([
    db.amenityStockTransaction.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      include: {
        amenityItem: { select: { id: true, name: true, category: true, unit: true, location: true } },
      },
    }),
    db.amenityStockTransaction.count({ where }),
  ]);

  return ok(transactions, { total, page, limit, pages: Math.ceil(total / limit) });
});

export const POST = withHandler(async (req: NextRequest) => {
  const propertyId = await PROPERTY_ID();
  const body = await parseBody(req);

  if (!body.amenityItemId || !body.transactionType || body.quantity === undefined) {
    return fail("amenityItemId, transactionType, and quantity are required", "VALIDATION", 400);
  }

  const validTypes = [
    "purchase", "issued_to_room", "returned_from_room", "damaged",
    "lost", "inventory_adjustment", "season_stock_up", "transfer",
  ];
  if (!validTypes.includes(body.transactionType)) {
    return fail(`transactionType must be one of: ${validTypes.join(", ")}`, "VALIDATION", 400);
  }

  // Find the amenity item
  const item = await db.amenityItem.findFirst({
    where: { id: body.amenityItemId, propertyId },
  });
  if (!item) {
    return fail("Amenity item not found", "NOT_FOUND", 404);
  }

  const quantity = Number(body.quantity);
  const previousQty = item.quantity;
  const newQty = previousQty + quantity; // positive qty adds, negative qty removes

  if (newQty < 0) {
    return fail(
      `Transaction would result in negative stock (${newQty}). Current: ${previousQty}, change: ${quantity}`,
      "INSUFFICIENT_STOCK",
      400
    );
  }

  const costPerUnit = roundMoney(body.costPerUnit ?? item.unitCost);
  const totalCost = roundMoney(Math.abs(quantity) * costPerUnit);

  // Use a transaction to create the stock transaction and update the item
  const [transaction, updatedItem] = await db.$transaction([
    db.amenityStockTransaction.create({
      data: {
        propertyId,
        amenityItemId: body.amenityItemId,
        transactionType: body.transactionType,
        quantity,
        previousQty,
        newQty,
        referenceId: body.referenceId ?? null,
        referenceType: body.referenceType ?? null,
        notes: body.notes ?? null,
        performedBy: body.performedBy ?? null,
        costPerUnit,
        totalCost,
      },
    }),
    db.amenityItem.update({
      where: { id: body.amenityItemId },
      data: {
        quantity: newQty,
        availableQty: newQty - item.issuedQty,
        ...(body.transactionType === "issued_to_room" && {
          issuedQty: item.issuedQty + Math.abs(quantity),
          availableQty: newQty - (item.issuedQty + Math.abs(quantity)),
        }),
        ...(body.transactionType === "returned_from_room" && {
          issuedQty: Math.max(0, item.issuedQty - Math.abs(quantity)),
        }),
        ...(body.transactionType === "inventory_adjustment" && {
          lastInventory: new Date(),
        }),
        ...(body.transactionType === "purchase" && {
          unitCost: costPerUnit,
          purchaseDate: new Date(),
        }),
      },
      include: {
        vendor: { select: { id: true, name: true, rating: true } },
        roomType: { select: { id: true, name: true, code: true } },
      },
    }),
  ]);

  const result = {
    transaction: {
      ...transaction,
      amenityItem: { id: item.id, name: item.name, category: item.category, unit: item.unit },
    },
    updatedItem,
  };

  await logAudit({
    propertyId,
    action: `STOCK_TRANSACTION_${body.transactionType.toUpperCase()}`,
    entityType: "AmenityStockTransaction",
    entityId: transaction.id,
    newValue: result,
  });

  await broadcast("purchasing:stock_transaction_created", result, propertyId);

  // Alert if item is now below PAR
  if (updatedItem.quantity < updatedItem.parLevel) {
    await broadcast("purchasing:below_par_alert", updatedItem, propertyId);
  }

  return ok(result);
});
