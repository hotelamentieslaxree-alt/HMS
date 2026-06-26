// /api/pos/orders — list + create
import { db } from "@/lib/db";
import { ok, fail, parseBody, broadcast, PROPERTY_ID } from "@/lib/hms";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const propertyId = await PROPERTY_ID();
  const url = new URL(req.url);
  const status = url.searchParams.get("status");
  const outletId = url.searchParams.get("outletId");

  const orders = await db.posOrder.findMany({
    where: {
      outlet: { propertyId },
      ...(status ? { status } : {}),
      ...(outletId ? { outletId } : {}),
    },
    include: {
      outlet: true, table: true, waiter: true,
      lines: { include: { item: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return ok(orders.map((o) => ({
    id: o.id,
    outlet: { id: o.outlet.id, name: o.outlet.name, code: o.outlet.code },
    table: o.table ? { id: o.table.id, number: o.table.tableNumber, capacity: o.table.capacity } : null,
    orderType: o.orderType,
    status: o.status,
    waiter: o.waiter ? { id: o.waiter.id, name: `${o.waiter.firstName} ${o.waiter.lastName}` } : null,
    subtotal: o.subtotal, discountAmount: o.discountAmount, taxAmount: o.taxAmount, totalAmount: o.totalAmount,
    guestsCount: o.guestsCount, notes: o.notes, kotNumber: o.kotNumber,
    createdAt: o.createdAt, billedAt: o.billedAt, paidAt: o.paidAt,
    lines: o.lines.map((l) => ({
      id: l.id, itemId: l.itemId, name: l.item.name, quantity: l.quantity, unitPrice: l.unitPrice,
      status: l.status, specialInstructions: l.specialInstructions,
      lineTotal: l.quantity * l.unitPrice,
    })),
  })));
}

export async function POST(req: Request) {
  const propertyId = await PROPERTY_ID();
  const body = await parseBody(req);
  const { outletId, tableId, orderType = "dine_in", waiterId, lines = [], guestsCount = 1, notes } = body;
  if (!outletId) return fail("outletId required", "VALIDATION");
  if (!lines.length) return fail("At least one line required", "VALIDATION");

  let subtotal = 0;
  for (const l of lines) {
    const item = await db.menuItem.findUnique({ where: { id: l.itemId } });
    if (!item) return fail(`Item ${l.itemId} not found`, "NOT_FOUND", 404);
    subtotal += item.price * (l.quantity ?? 1);
  }
  const tax = Math.round(subtotal * 0.05);
  const total = subtotal + tax;

  const kotCount = await db.posOrder.count();
  const order = await db.posOrder.create({
    data: {
      outletId,
      tableId: tableId || null,
      orderType,
      waiterId: waiterId || null,
      status: "sent_to_kitchen",
      subtotal, taxAmount: tax, totalAmount: total,
      guestsCount, notes: notes || null,
      kotNumber: 1100 + kotCount,
    },
    include: { outlet: true, table: true },
  });

  for (const l of lines) {
    const item = await db.menuItem.findUnique({ where: { id: l.itemId } });
    if (!item) continue;
    await db.posOrderLine.create({
      data: {
        orderId: order.id, itemId: l.itemId, quantity: l.quantity ?? 1,
        unitPrice: item.price, status: "pending",
        specialInstructions: l.specialInstructions || null,
      },
    });
  }

  // Mark table occupied
  if (tableId) {
    await db.restaurantTable.update({ where: { id: tableId }, data: { status: "occupied" } });
  }

  await broadcast("pos.order.status_changed", {
    orderId: order.id, outletName: order.outlet.name, newStatus: "sent_to_kitchen", kotNumber: order.kotNumber,
  }, propertyId);

  return ok({ id: order.id, kotNumber: order.kotNumber, total: order.totalAmount, status: order.status });
}
