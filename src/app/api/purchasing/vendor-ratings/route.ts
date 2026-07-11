// GET /api/purchasing/vendor-ratings — list vendor ratings
// POST /api/purchasing/vendor-ratings — create vendor rating
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { ok, fail, parseBody, withHandler, broadcast, logAudit, PROPERTY_ID, roundMoney } from "@/lib/hms";

export const dynamic = "force-dynamic";

export const GET = withHandler(async (req: NextRequest) => {
  const propertyId = await PROPERTY_ID();
  const { searchParams } = new URL(req.url);

  const vendorId = searchParams.get("vendorId") || "";
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit")) || 20));
  const skip = (page - 1) * limit;

  const where: any = { propertyId };
  if (vendorId) where.vendorId = vendorId;

  const [ratings, total] = await Promise.all([
    db.vendorRating.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      include: {
        vendor: { select: { id: true, name: true, category: true, rating: true, email: true, phone: true } },
      },
    }),
    db.vendorRating.count({ where }),
  ]);

  // If vendorId specified, compute average scores
  let summary = null;
  if (vendorId) {
    const allRatings = await db.vendorRating.findMany({
      where: { vendorId, propertyId },
      select: { qualityScore: true, deliveryScore: true, priceScore: true, communicationScore: true, overallScore: true },
    });
    if (allRatings.length > 0) {
      summary = {
        totalRatings: allRatings.length,
        avgQuality: roundMoney(allRatings.reduce((s, r) => s + r.qualityScore, 0) / allRatings.length),
        avgDelivery: roundMoney(allRatings.reduce((s, r) => s + r.deliveryScore, 0) / allRatings.length),
        avgPrice: roundMoney(allRatings.reduce((s, r) => s + r.priceScore, 0) / allRatings.length),
        avgCommunication: roundMoney(allRatings.reduce((s, r) => s + r.communicationScore, 0) / allRatings.length),
        avgOverall: roundMoney(allRatings.reduce((s, r) => s + r.overallScore, 0) / allRatings.length),
      };
    }
  }

  return ok(ratings, { total, page, limit, pages: Math.ceil(total / limit), summary });
});

export const POST = withHandler(async (req: NextRequest) => {
  const propertyId = await PROPERTY_ID();
  const body = await parseBody(req);

  if (!body.vendorId) {
    return fail("vendorId is required", "VALIDATION", 400);
  }

  // Validate vendor exists
  const vendor = await db.vendor.findFirst({
    where: { id: body.vendorId, propertyId },
  });
  if (!vendor) {
    return fail("Vendor not found", "NOT_FOUND", 404);
  }

  // Validate score ranges
  const validateScore = (name: string, value: number | undefined) => {
    if (value !== undefined && (value < 1 || value > 10)) {
      return `${name} must be between 1 and 10`;
    }
    return null;
  };

  const scoreErrors = [
    validateScore("qualityScore", body.qualityScore),
    validateScore("deliveryScore", body.deliveryScore),
    validateScore("priceScore", body.priceScore),
    validateScore("communicationScore", body.communicationScore),
  ].filter(Boolean);

  if (scoreErrors.length > 0) {
    return fail(scoreErrors.join("; "), "VALIDATION", 400);
  }

  const qualityScore = body.qualityScore ?? 5;
  const deliveryScore = body.deliveryScore ?? 5;
  const priceScore = body.priceScore ?? 5;
  const communicationScore = body.communicationScore ?? 5;
  const overallScore = body.overallScore ?? roundMoney(
    (qualityScore + deliveryScore + priceScore + communicationScore) / 4
  );

  const rating = await db.vendorRating.create({
    data: {
      propertyId,
      vendorId: body.vendorId,
      orderId: body.orderId ?? null,
      qualityScore,
      deliveryScore,
      priceScore,
      communicationScore,
      overallScore,
      review: body.review ?? null,
      ratedBy: body.ratedBy ?? null,
    },
    include: {
      vendor: { select: { id: true, name: true, category: true, rating: true } },
    },
  });

  // Update vendor's overall rating (average of all ratings)
  const allRatings = await db.vendorRating.findMany({
    where: { vendorId: body.vendorId },
    select: { overallScore: true },
  });
  const avgRating = allRatings.length > 0
    ? roundMoney(allRatings.reduce((s, r) => s + r.overallScore, 0) / allRatings.length)
    : 5;
  await db.vendor.update({
    where: { id: body.vendorId },
    data: { rating: avgRating },
  });

  await logAudit({
    propertyId,
    action: "VENDOR_RATING_CREATED",
    entityType: "VendorRating",
    entityId: rating.id,
    newValue: rating,
  });

  await broadcast("purchasing:vendor_rated", rating, propertyId);

  return ok(rating);
});
