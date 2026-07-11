// GET /api/purchasing/orders — list purchase orders with vendor info
// POST /api/purchasing/orders — create purchase order
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { ok, fail, parseBody, withHandler, broadcast, logAudit, PROPERTY_ID, roundMoney } from "@/lib/hms";

export const dynamic = "force-dynamic";

export const GET = withHandler(async (req: NextRequest) => {
  const propertyId = await PROPERTY_ID();
  const { searchParams } = new URL(req.url);

  const status = searchParams.get("status") || "";
  const vendorId = searchParams.get("vendorId") || "";
  const search = searchParams.get("search") || "";
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit")) || 20));
  const skip = (page - 1) * limit;

  const where: any = { propertyId };
  if (status) where.status = status;
  if (vendorId) where.vendorId = vendorId;
  if (search) {
    where.OR = [
      { poNumber: { contains: search } },
      { notes: { contains: search } },
    ];
  }

  const [orders, total] = await Promise.all([
    db.purchaseOrder.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      include: {
        property: { select: { id: true, name: true, code: true } },
      },
    }),
    db.purchaseOrder.count({ where }),
  ]);

  // Enrich with vendor info when vendorId is present
  const vendorIds = [...new Set(orders.map((o) => o.vendorId).filter(Boolean) as string[])];
  const vendors = vendorIds.length > 0
    ? await db.vendor.findMany({
        where: { id: { in: vendorIds } },
        select: { id: true, name: true, category: true, rating: true, paymentTerms: true, email: true, phone: true },
      })
    : [];
  const vendorMap = new Map(vendors.map((v) => [v.id, v]));

  const enriched = orders.map((order) => ({
    ...order,
    vendor: order.vendorId ? vendorMap.get(order.vendorId) || null : null,
  }));

  return ok(enriched, { total, page, limit, pages: Math.ceil(total / limit) });
});

export const POST = withHandler(async (req: NextRequest) => {
  const propertyId = await PROPERTY_ID();
  const body = await parseBody(req);

  if (!body.totalAmount && body.totalAmount !== 0) {
    return fail("totalAmount is required", "VALIDATION", 400);
  }

  // Validate vendor if specified
  if (body.vendorId) {
    const vendor = await db.vendor.findFirst({
      where: { id: body.vendorId, propertyId },
    });
    if (!vendor) {
      return fail("Vendor not found", "NOT_FOUND", 404);
    }
  }

  // Auto-generate poNumber: PO-YYYYMMDD-XXX
  const today = new Date();
  const dateStr = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, "0")}${String(today.getDate()).padStart(2, "0")}`;
  const prefix = `PO-${dateStr}-`;

  const existing = await db.purchaseOrder.findMany({
    where: { propertyId, poNumber: { startsWith: prefix } },
    select: { poNumber: true },
    orderBy: { poNumber: "desc" },
  });

  let maxSeq = 0;
  for (const po of existing) {
    const m = /PO-\d{8}-(\d+)/.exec(po.poNumber);
    if (m) maxSeq = Math.max(maxSeq, parseInt(m[1], 10));
  }
  const poNumber = `${prefix}${String(maxSeq + 1).padStart(3, "0")}`;

  const order = await db.purchaseOrder.create({
    data: {
      propertyId,
      vendorId: body.vendorId ?? null,
      poNumber,
      status: body.status ?? "draft",
      totalAmount: roundMoney(body.totalAmount),
      notes: body.notes ?? null,
      requestedById: body.requestedById ?? null,
      approvedById: body.approvedById ?? null,
      orderedAt: body.orderedAt ? new Date(body.orderedAt) : (body.status === "submitted" ? new Date() : null),
      receivedAt: body.receivedAt ? new Date(body.receivedAt) : null,
    },
  });

  // Fetch vendor info for response
  let vendorInfo = null;
  if (order.vendorId) {
    vendorInfo = await db.vendor.findUnique({
      where: { id: order.vendorId },
      select: { id: true, name: true, category: true, rating: true, paymentTerms: true },
    });
  }

  const result = { ...order, vendor: vendorInfo };

  await logAudit({
    propertyId,
    action: "PURCHASE_ORDER_CREATED",
    entityType: "PurchaseOrder",
    entityId: order.id,
    newValue: result,
  });

  await broadcast("purchasing:purchase_order_created", result, propertyId);

  return ok(result);
});
