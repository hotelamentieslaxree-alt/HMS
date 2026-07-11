// PUT /api/purchasing/orders/[id] — update PO status (approve, receive, cancel)
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { ok, fail, parseBody, withHandler, broadcast, logAudit, PROPERTY_ID, roundMoney } from "@/lib/hms";

export const dynamic = "force-dynamic";

export const PUT = withHandler(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const propertyId = await PROPERTY_ID();
  const { id } = await params;
  const body = await parseBody(req);

  const order = await db.purchaseOrder.findFirst({
    where: { id, propertyId },
  });

  if (!order) {
    return fail("Purchase order not found", "NOT_FOUND", 404);
  }

  const newStatus = body.status;
  if (!newStatus) {
    return fail("status is required", "VALIDATION", 400);
  }

  const validTransitions: Record<string, string[]> = {
    draft: ["submitted", "cancelled"],
    submitted: ["approved", "cancelled"],
    approved: ["received", "cancelled"],
    received: [],
    cancelled: [],
  };

  const allowed = validTransitions[order.status] || [];
  if (!allowed.includes(newStatus)) {
    return fail(
      `Cannot transition from "${order.status}" to "${newStatus}". Allowed: ${allowed.join(", ") || "none"}`,
      "INVALID_TRANSITION",
      400
    );
  }

  const updateData: any = { status: newStatus };

  if (newStatus === "approved") {
    updateData.approvedById = body.approvedById ?? null;
  }

  if (newStatus === "submitted") {
    updateData.orderedAt = new Date();
  }

  if (newStatus === "received") {
    updateData.receivedAt = new Date();
  }

  if (body.totalAmount !== undefined) {
    updateData.totalAmount = roundMoney(body.totalAmount);
  }
  if (body.notes !== undefined) {
    updateData.notes = body.notes;
  }

  const updated = await db.purchaseOrder.update({
    where: { id },
    data: updateData,
  });

  // Fetch vendor info for response
  let vendorInfo = null;
  if (updated.vendorId) {
    vendorInfo = await db.vendor.findUnique({
      where: { id: updated.vendorId },
      select: { id: true, name: true, category: true, rating: true, paymentTerms: true },
    });
  }

  const result = { ...updated, vendor: vendorInfo };

  await logAudit({
    propertyId,
    action: `PURCHASE_ORDER_${newStatus.toUpperCase()}`,
    entityType: "PurchaseOrder",
    entityId: id,
    oldValue: order,
    newValue: result,
  });

  await broadcast(`purchasing:purchase_order_${newStatus}`, result, propertyId);

  // When PO is received, optionally update vendor rating
  if (newStatus === "received" && body.vendorRating) {
    const rating = await db.vendorRating.create({
      data: {
        propertyId,
        vendorId: updated.vendorId!,
        orderId: id,
        qualityScore: body.vendorRating.qualityScore ?? 5,
        deliveryScore: body.vendorRating.deliveryScore ?? 5,
        priceScore: body.vendorRating.priceScore ?? 5,
        communicationScore: body.vendorRating.communicationScore ?? 5,
        overallScore: roundMoney(
          ((body.vendorRating.qualityScore ?? 5) +
           (body.vendorRating.deliveryScore ?? 5) +
           (body.vendorRating.priceScore ?? 5) +
           (body.vendorRating.communicationScore ?? 5)) / 4
        ),
        review: body.vendorRating.review ?? null,
        ratedBy: body.vendorRating.ratedBy ?? null,
      },
    });

    // Update vendor's overall rating
    const allRatings = await db.vendorRating.findMany({
      where: { vendorId: updated.vendorId! },
      select: { overallScore: true },
    });
    const avgRating = allRatings.length > 0
      ? roundMoney(allRatings.reduce((s, r) => s + r.overallScore, 0) / allRatings.length)
      : 5;
    await db.vendor.update({
      where: { id: updated.vendorId! },
      data: { rating: avgRating },
    });

    await broadcast("purchasing:vendor_rated", rating, propertyId);
  }

  return ok(result);
});
