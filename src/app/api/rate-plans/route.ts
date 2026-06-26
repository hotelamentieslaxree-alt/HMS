// GET /api/rate-plans
import { db } from "@/lib/db";
import { ok, PROPERTY_ID, withHandler } from "@/lib/hms";

export const dynamic = "force-dynamic";

export const GET = withHandler(async () => {
  const propertyId = await PROPERTY_ID();
  const plans = await db.ratePlan.findMany({
    where: { propertyId },
    include: { categories: true, _count: { select: { reservations: true } } },
    orderBy: { name: "asc" },
  });
  return ok(plans.map((p) => ({
    id: p.id, name: p.name, code: p.code, description: p.description,
    mealPlan: p.mealPlan, isRefundable: p.isRefundable,
    advancePurchaseDays: p.advancePurchaseDays,
    minStayNights: p.minStayNights, maxStayNights: p.maxStayNights,
    validFrom: p.validFrom, validTo: p.validTo,
    markupPercent: p.markupPercent,
    categoryCount: p.categories.length,
    reservationCount: p._count.reservations,
    categories: p.categories.map((c) => ({ id: c.id, name: c.name, code: c.code, baseRate: c.baseRate })),
  })));
});
