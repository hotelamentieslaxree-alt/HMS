// /api/night-audit — list past audits + POST run audit
import { db } from "@/lib/db";
import { ok, fail, PROPERTY_ID, broadcast, logAudit } from "@/lib/hms";
import { startOfDay, format } from "date-fns";

export const dynamic = "force-dynamic";

export async function GET() {
  const propertyId = await PROPERTY_ID();
  const audits = await db.nightAuditLog.findMany({
    where: { propertyId },
    orderBy: { businessDate: "desc" },
    take: 30,
  });
  const property = await db.property.findUnique({ where: { id: propertyId } });

  // Pre-audit preview: what will happen
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

  return ok({
    businessDate: property?.businessDate,
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
      estimatedRevenue: foliosToPost.reduce((s, f) => s + (f.reservation?.ratePerNight ?? 0), 0),
    },
  });
}

export async function POST(req: Request) {
  const propertyId = await PROPERTY_ID();
  const property = await db.property.findUnique({ where: { id: propertyId } });
  if (!property) return fail("Property not found", "NOT_FOUND", 404);

  const businessDate = startOfDay(property.businessDate);
  const auditLog = await db.nightAuditLog.create({
    data: { propertyId, businessDate, status: "running", startedBy: "system" },
  });

  let postingsCount = 0;
  let revenuePosted = 0;
  const notes: string[] = [];

  try {
    // Step 1: Post room charges to all in-house folios
    const inHouseReservations = await db.reservation.findMany({
      where: { propertyId, status: "checked_in" },
      include: { folios: true, category: true, ratePlan: true },
    });
    for (const r of inHouseReservations) {
      const folio = r.folios.find((f) => f.status === "open") ?? r.folios[0];
      if (!folio) continue;
      const rate = r.ratePerNight;
      const tax = Math.round(rate * 0.12);
      await db.folioLine.create({
        data: {
          folioId: folio.id, transactionType: "charge",
          description: `Room charge — ${r.category.name} (Night audit ${format(businessDate, "dd MMM")})`,
          amount: rate, taxCode: "GST12", taxAmount: tax,
          departmentCode: "ROOM", referenceType: "room_rate", postedBy: "night_audit",
        },
      });
      await db.folio.update({
        where: { id: folio.id },
        data: {
          subtotal: { increment: rate }, taxAmount: { increment: tax },
          totalAmount: { increment: rate + tax }, balance: { increment: rate + tax },
        },
      });
      postingsCount++;
      revenuePosted += rate + tax;
    }
    notes.push(`Posted room charges to ${inHouseReservations.length} in-house folios`);

    // Step 2: Mark no-shows (confirmed reservations with check-in date <= business date, not checked in)
    const noShows = await db.reservation.findMany({
      where: { propertyId, status: "confirmed", checkInDate: { lte: businessDate } },
    });
    for (const r of noShows) {
      await db.reservation.update({
        where: { id: r.id },
        data: { status: "no_show", cancellationReason: "No-show — auto-marked by night audit", cancelledAt: new Date(), cancelledBy: "night_audit" },
      });
      postingsCount++;
    }
    notes.push(`Marked ${noShows.length} no-shows`);

    // Step 3: Convert tentative reservations arriving tomorrow to confirmed
    const tomorrow = new Date(businessDate); tomorrow.setDate(tomorrow.getDate() + 1);
    const tentative = await db.reservation.findMany({
      where: { propertyId, status: "tentative", checkInDate: { gte: businessDate, lte: tomorrow } },
    });
    for (const r of tentative) {
      await db.reservation.update({ where: { id: r.id }, data: { status: "confirmed" } });
    }
    notes.push(`Confirmed ${tentative.length} tentative reservations`);

    // Step 4: Roll business date forward
    const nextDay = new Date(businessDate); nextDay.setDate(nextDay.getDate() + 1);
    await db.property.update({ where: { id: propertyId }, data: { businessDate: nextDay } });

    // Step 5: Complete the audit log
    const completed = await db.nightAuditLog.update({
      where: { id: auditLog.id },
      data: {
        status: "completed", completedAt: new Date(),
        postingsCount, revenuePosted: Math.round(revenuePosted),
        noShowsCount: noShows.length, notes: notes.join("\n"),
      },
    });

    await logAudit({
      propertyId, action: "NIGHT_AUDIT_COMPLETED", entityType: "night_audit", entityId: auditLog.id,
      newValue: { postingsCount, revenuePosted, noShows: noShows.length }, userRole: "fom",
    });

    await broadcast("notification.system", {
      type: "success", title: "Night audit completed",
      message: `${format(businessDate, "dd MMM yyyy")} — ${postingsCount} postings, ₹${Math.round(revenuePosted).toLocaleString("en-IN")} posted. Business date advanced.`,
    }, propertyId);

    return ok({
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
    });
  } catch (e: any) {
    await db.nightAuditLog.update({
      where: { id: auditLog.id },
      data: { status: "failed", completedAt: new Date(), notes: `Failed: ${e.message}` },
    });
    return fail(`Night audit failed: ${e.message}`, "AUDIT_FAILED", 500);
  }
}
