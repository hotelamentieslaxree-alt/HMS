// /api/pos/orders — list + create
// Fixed (C4): atomic KOT number generation; (H2): tableId resolved from
// outletId+tableNumber when frontend sends "T1" style strings.
import { db } from "@/lib/db";
import { ok, fail, parseBody, broadcast, PROPERTY_ID, withHandler, nextNumber, roundMoney } from "@/lib/hms";

export const dynamic = "force-dynamic";

export const GET = withHandler(async (req: Request) => {
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
      lineTotal: roundMoney(l.quantity * l.unitPrice),
    })),
  })));
});

export const POST = withHandler(async (req: Request) => {
  const propertyId = await PROPERTY_ID();
  const body = await parseBody(req);
  const { outletId, tableId, tableNumber, orderType = "dine_in", waiterId, lines = [], guestsCount = 1, notes } = body;
  if (!outletId) return fail("outletId required", "VALIDATION");
  if (!Array.isArray(lines) || !lines.length) return fail("At least one line required", "VALIDATION");

  // Resolve the table: accept either an actual tableId, or a tableNumber
  // ("T1") which we look up against the outlet's tables. (H2 fix)
  let resolvedTableId: string | null = null;
  if (tableId) {
    // Could be a real id, or a "T1"-style label sent by the legacy UI
    const t = await db.restaurantTable.findFirst({
      where: { OR: [{ id: tableId }, { outletId, tableNumber: tableId }] },
    });
    if (!t) return fail(`Table ${tableId} not found in this outlet`, "NOT_FOUND", 404);
    if (t.status === "occupied") return fail(`Table ${t.tableNumber} is already occupied`, "TABLE_OCCUPIED");
    resolvedTableId = t.id;
  } else if (tableNumber) {
    const t = await db.restaurantTable.findFirst({ where: { outletId, tableNumber: String(tableNumber) } });
    if (!t) return fail(`Table ${tableNumber} not found`, "NOT_FOUND", 404);
    if (t.status === "occupied") return fail(`Table ${t.tableNumber} is already occupied`, "TABLE_OCCUPIED");
    resolvedTableId = t.id;
  }

  // Validate all line items + compute subtotal atomically inside transaction
  const result = await db.$transaction(async (tx) => {
    let subtotal = 0;
    const itemMap = new Map<string, { id: string; name: string; price: number }>();
    for (const l of lines) {
      const item = await tx.menuItem.findUnique({ where: { id: l.itemId } });
      if (!item) throw Object.assign(new Error(`Item ${l.itemId} not found`), { code: "NOT_FOUND", status: 404 });
      subtotal += item.price * (Number(l.quantity) || 1);
      itemMap.set(item.id, { id: item.id, name: item.name, price: item.price });
    }
    subtotal = roundMoney(subtotal);
    const tax = roundMoney(subtotal * 0.05);
    const total = roundMoney(subtotal + tax);

    // Atomic KOT number: max+1 (C4 fix)
    const kotNumber = (await nextNumber("posOrder", "kotNumber", { base: 1100 })) as number;

    const order = await tx.posOrder.create({
      data: {
        outletId,
        tableId: resolvedTableId,
        orderType,
        waiterId: waiterId || null,
        status: "sent_to_kitchen",
        subtotal, taxAmount: tax, totalAmount: total,
        guestsCount: Number(guestsCount) || 1, notes: notes || null,
        kotNumber,
      },
      include: { outlet: true, table: true },
    });

    for (const l of lines) {
      const item = itemMap.get(l.itemId)!;
      await tx.posOrderLine.create({
        data: {
          orderId: order.id, itemId: l.itemId, quantity: Number(l.quantity) || 1,
          unitPrice: item.price, status: "pending",
          specialInstructions: l.specialInstructions || null,
        },
      });
    }

    // Mark table occupied
    if (resolvedTableId) {
      await tx.restaurantTable.update({ where: { id: resolvedTableId }, data: { status: "occupied" } });
    }

    return { order };
  });

  await broadcast("pos.order.status_changed", {
    orderId: result.order.id, outletName: result.order.outlet.name, newStatus: "sent_to_kitchen", kotNumber: result.order.kotNumber,
  }, propertyId);

  return ok({ id: result.order.id, kotNumber: result.order.kotNumber, total: result.order.totalAmount, status: result.order.status });
});
