// PUT /api/pos/orders/[id]/status — advance order status
// Fixed (H3): atomic status update + table release inside single transaction.
import { db } from "@/lib/db";
import { ok, fail, parseBody, broadcast, PROPERTY_ID, withHandler } from "@/lib/hms";

export const dynamic = "force-dynamic";

export const PUT = withHandler(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const propertyId = await PROPERTY_ID();
  const body = await parseBody(req);
  const { status } = body;
  const valid = ["draft","sent_to_kitchen","in_preparation","ready","served","billed","paid","void"];
  if (!valid.includes(status)) return fail("Invalid status", "VALIDATION");

  const result = await db.$transaction(async (tx) => {
    const order = await tx.posOrder.findUnique({ where: { id }, include: { outlet: true, table: true } });
    if (!order) throw Object.assign(new Error("Order not found"), { code: "NOT_FOUND", status: 404 });

    const updates: any = { status };
    if (status === "billed") updates.billedAt = new Date();
    if (status === "paid") { updates.paidAt = new Date(); updates.billedAt = order.billedAt ?? new Date(); }

    const updated = await tx.posOrder.update({ where: { id }, data: updates, include: { outlet: true, table: true } });

    // Free table when paid or void
    if ((status === "paid" || status === "void") && updated.tableId) {
      await tx.restaurantTable.update({ where: { id: updated.tableId }, data: { status: "available" } });
    }
    return updated;
  });

  await broadcast("pos.order.status_changed", {
    orderId: id, outletName: result.outlet.name, newStatus: status,
  }, propertyId);

  return ok(result);
});
