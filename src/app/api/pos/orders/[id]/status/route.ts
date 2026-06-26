// PUT /api/pos/orders/[id]/status — advance order status
import { db } from "@/lib/db";
import { ok, fail, parseBody, broadcast, PROPERTY_ID } from "@/lib/hms";

export const dynamic = "force-dynamic";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const propertyId = await PROPERTY_ID();
  const body = await parseBody(req);
  const { status } = body;
  const valid = ["draft","sent_to_kitchen","in_preparation","ready","served","billed","paid","void"];
  if (!valid.includes(status)) return fail("Invalid status", "VALIDATION");

  const order = await db.posOrder.findUnique({ where: { id }, include: { outlet: true, table: true } });
  if (!order) return fail("Order not found", "NOT_FOUND", 404);

  const updates: any = { status };
  if (status === "billed") updates.billedAt = new Date();
  if (status === "paid") { updates.paidAt = new Date(); updates.billedAt = order.billedAt ?? new Date(); }

  const updated = await db.posOrder.update({ where: { id }, data: updates, include: { outlet: true, table: true } });

  // Free table when paid or void
  if ((status === "paid" || status === "void") && updated.tableId) {
    await db.restaurantTable.update({ where: { id: updated.tableId }, data: { status: "available" } });
  }

  await broadcast("pos.order.status_changed", {
    orderId: id, outletName: updated.outlet.name, newStatus: status,
  }, propertyId);

  return ok(updated);
}
