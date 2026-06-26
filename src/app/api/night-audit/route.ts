// /api/night-audit — preview + run audit
// Fixed (C5): the entire audit runs inside a single $transaction so any
// failure rolls back all charge postings / status changes. Idempotency
// guard prevents double-audit for the same business date.
import { db } from "@/lib/db";
import { ok, fail, PROPERTY_ID, broadcast, logAudit, withHandler, roundMoney } from "@/lib/hms";
import { startOfDay, format } from "date-fns";

export const dynamic = "force-dynamic";

export const GET = withHandler(async () => {
  const propertyId = await PROPERTY_ID();
  const audits = await db.nightAuditLog.findMany({
    where: { propertyId },
    orderBy: { businessDate: "desc" },
    take: 30,
  });
  const property = await db.property.findUnique({ where: { id: propertyId } });

  const today = startOfDay(new Date());
  const inHouseCount = await db.reservation.count({ where: { propertyId, status: "checked_in" } });
  const arrivalsTomorrow = await db.reservation.count({
    where: { propertyId, checkInDate: { gte: today, lte: today }, status: { in: ["confirmed", "tentative"] } },
  });
  const tentativeConfirming = await db.reservation.count({
    where: { propertyId, checkInDate: { gt: today }, status: "tentative" },
  });
  const expectedNoShows = await db.reservation.count({
    where: { propertyId, checkInDate: { gte: today, lte: today }, status: "confirmed" },
  });
  const foliosToPost = await db.folio.findMany({
    where: { reservation: { propertyId, status: "checked_in" } },
    include: { reservation: true },
  });

  // Check if audit already ran for current business date (idempotency preview)
  const businessDate = property?.businessDate ? startOfDay(property.businessDate) : today;
  const alreadyAuditedToday = await db.nightAuditLog.findFirst({
    where: { propertyId, businessDate, status: "completed" },
  });

  return ok({
    businessDate: property?.businessDate,
    alreadyAuditedToday: !!alreadyAuditedToday,
    audits: audits.map((a) => ({
      id: a.id, businessDate: a.businessDate, status: a.status,
      startedAt: a.startedAt, completedAt: a.completedAt,
      postingsCount: a.postingsCount, revenuePosted: a.revenuePosted,
      notes: a.notes,
    })),
    preview: {
      inHouseCount,
      arrivalsTomorrow,
      tentativeConfirming,
      expectedNoShows,
      foliosToPostCount: foliosToPost.length,
      estimatedRevenue: roundMoney(foliosToPost.reduce((s, f) => s + (f.reservation?.ratePerNight ?? 0), 0)),
    },
  });
});

export const POST = withHandler(async (req: Request) => {
  const propertyId = await PROPERTY_ID();
  const property = await db.property.findUnique({ where: { id: propertyId } });
  if (!property) return fail("Property not found", "NOT_FOUND", 404);

  const businessDate = startOfDay(property.businessDate);

  // Idempotency: don't run twice for the same business date (C5 fix)
  const existing = await db.nightAuditLog.findFirst({
    where: { propertyId, businessDate, status: "completed" },
  });
  if (existing) {
    return fail(`Night audit already completed for ${format(businessDate, "dd MMM yyyy")}`, "ALREADY_AUDITED", 409);
  }

  // Run the entire audit inside a single transaction.
  const result = await db.$transaction(async (tx) => {
    const auditLog = await tx.nightAuditLog.create({
      data: { propertyId, businessDate, status: "running", startedBy: "system" },
    });

    let postingsCount = 0;
    let revenuePosted = 0;
    const notes: string[] = [];

    // Step 1: Post room charges to all in-house folios
    const inHouseReservations = await tx.reservation.findMany({
      where: { propertyId, status: "checked_in" },
      include: { folios: true, category: true, ratePlan: true },
    });
    for (const r of inHouseReservations) {
      const folio = r.folios.find((f) => f.status === "open") ?? r.folios[0];
      if (!folio) continue;
      const rate = roundMoney(r.ratePerNight);
      const tax = roundMoney(rate * 0.12);
      await tx.folioLine.create({
        data: {
          folioId: folio.id, transactionType: "charge",
          description: `Room charge — ${r.category.name} (Night audit ${format(businessDate, "dd MMM")})`,
          amount: rate, taxCode: "GST12", taxAmount: tax,
          departmentCode: "ROOM", referenceType: "room_rate", postedBy: "night_audit",
        },
      });
      await tx.folio.update({
        where: { id: folio.id },
        data: {
          subtotal: { increment: rate }, taxAmount: { increment: tax },
          totalAmount: { increment: roundMoney(rate + tax) }, balance: { increment: roundMoney(rate + tax) },
        },
      });
      postingsCount++;
      revenuePosted += rate + tax;
    }
    notes.push(`Posted room charges to ${inHouseReservations.length} in-house folios`);

    // Step 2: Mark no-shows
    const noShows = await tx.reservation.findMany({
      where: { propertyId, status: "confirmed", checkInDate: { lte: businessDate } },
    });
    for (const r of noShows) {
      await tx.reservation.update({
        where: { id: r.id },
        data: { status: "no_show", cancellationReason: "No-show — auto-marked by night audit", cancelledAt: new Date(), cancelledBy: "night_audit" },
      });
      postingsCount++;
    }
    notes.push(`Marked ${noShows.length} no-shows`);

    // Step 3: Convert tentative reservations arriving tomorrow to confirmed
    const tomorrow = new Date(businessDate); tomorrow.setDate(tomorrow.getDate() + 1);
    const tentative = await tx.reservation.findMany({
      where: { propertyId, status: "tentative", checkInDate: { gte: businessDate, lte: tomorrow } },
    });
    for (const r of tentative) {
      await tx.reservation.update({ where: { id: r.id }, data: { status: "confirmed" } });
    }
    notes.push(`Confirmed ${tentative.length} tentative reservations`);

    // Step 4: Roll business date forward
    const nextDay = new Date(businessDate); nextDay.setDate(nextDay.getDate() + 1);
    await tx.property.update({ where: { id: propertyId }, data: { businessDate: nextDay } });

    // Step 5: Complete the audit log
    const completed = await tx.nightAuditLog.update({
      where: { id: auditLog.id },
      data: {
        status: "completed", completedAt: new Date(),
        postingsCount, revenuePosted: Math.round(revenuePosted),
        noShowsCount: noShows.length, notes: notes.join("\n"),
      },
    });

    return {
      audit: completed,
      summary: {
        businessDateClosed: businessDate,
        newBusinessDate: nextDay,
        postingsCount,
        revenuePosted: Math.round(revenuePosted),
        noShowsMarked: noShows.length,
        tentativeConfirmed: tentative.length,
        notes,
      },
    };
  });

  await logAudit({
    propertyId, action: "NIGHT_AUDIT_COMPLETED", entityType: "night_audit", entityId: result.audit.id,
    newValue: {
      postingsCount: result.summary.postingsCount,
      revenuePosted: result.summary.revenuePosted,
      noShows: result.summary.noShowsMarked,
    },
    userRole: "fom",
  });

  await broadcast("notification.system", {
    type: "success", title: "Night audit completed",
    message: `${format(businessDate, "dd MMM yyyy")} — ${result.summary.postingsCount} postings, ₹${result.summary.revenuePosted.toLocaleString("en-IN")} posted. Business date advanced.`,
  }, propertyId);

  return ok(result);
});
