// /api/reservations — list (with filters) + create
import { db } from "@/lib/db";
import { ok, fail, parseBody, PROPERTY_ID, broadcast, logAudit } from "@/lib/hms";
import { startOfDay, addDays } from "date-fns";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const propertyId = await PROPERTY_ID();
  const url = new URL(req.url);
  const status = url.searchParams.get("status") || undefined;
  const source = url.searchParams.get("source") || undefined;
  const search = url.searchParams.get("search") || undefined;
  const view = url.searchParams.get("view") || "all"; // arrivals | departures | inhouse | all
  const today = startOfDay(new Date());

  let where: any = { propertyId };
  if (status) where.status = status;
  if (source) where.bookingSource = source;

  if (view === "arrivals") {
    where.checkInDate = { lte: endOfDay(today) };
    where.checkOutDate = { gt: today };
    where.status = { in: ["confirmed", "tentative"] };
  } else if (view === "departures") {
    where.checkOutDate = { lte: endOfDay(today), gte: today };
    where.status = "checked_in";
  } else if (view === "inhouse") {
    where.status = "checked_in";
  }

  if (search) {
    where.OR = [
      { confirmationNumber: { contains: search } },
      { primaryGuest: { firstName: { contains: search } } },
      { primaryGuest: { lastName: { contains: search } } },
      { primaryGuest: { phone: { contains: search } } },
      { primaryGuest: { email: { contains: search } } },
    ];
  }

  const reservations = await db.reservation.findMany({
    where,
    include: {
      primaryGuest: true,
      category: true,
      room: true,
      ratePlan: true,
      company: true,
      folios: { include: { lines: true } },
    },
    orderBy: { checkInDate: "asc" },
    take: 200,
  });

  const data = reservations.map((r) => {
    const totalCharges = r.folios.reduce((s, f) => s + f.lines.filter((l) => !l.isVoided && l.transactionType === "charge").reduce((a, l) => a + l.amount + l.taxAmount, 0), 0);
    const totalPayments = r.folios.reduce((s, f) => s + f.paidAmount, 0);
    return {
      id: r.id,
      confirmationNumber: r.confirmationNumber,
      status: r.status,
      bookingSource: r.bookingSource,
      guest: {
        id: r.primaryGuest.id,
        title: r.primaryGuest.title,
        firstName: r.primaryGuest.firstName,
        lastName: r.primaryGuest.lastName,
        phone: r.primaryGuest.phone,
        email: r.primaryGuest.email,
        vip: r.primaryGuest.vipStatus,
        loyaltyTier: r.primaryGuest.loyaltyTier,
        nationality: r.primaryGuest.nationality,
      },
      company: r.company?.name ?? null,
      category: { id: r.category.id, name: r.category.name, code: r.category.code, baseRate: r.category.baseRate },
      room: r.room ? { id: r.room.id, number: r.room.roomNumber, floor: r.room.floor, status: r.room.currentStatus } : null,
      ratePlan: r.ratePlan ? { id: r.ratePlan.id, name: r.ratePlan.name, code: r.ratePlan.code, mealPlan: r.ratePlan.mealPlan } : null,
      ratePerNight: r.ratePerNight,
      totalNights: r.totalNights,
      checkInDate: r.checkInDate,
      checkOutDate: r.checkOutDate,
      actualCheckIn: r.actualCheckIn,
      actualCheckOut: r.actualCheckOut,
      adults: r.adults,
      children: r.children,
      specialRequests: r.specialRequests,
      internalNotes: r.internalNotes,
      otaCommissionPercent: r.otaCommissionPercent,
      otaCommissionAmount: r.otaCommissionAmount,
      netRevenue: r.netRevenue,
      depositAmount: r.depositAmount,
      folioBalance: totalCharges - totalPayments,
      createdAt: r.createdAt,
    };
  });

  return ok(data, { count: data.length });
}

export async function POST(req: Request) {
  const propertyId = await PROPERTY_ID();
  const body = await parseBody(req);
  const {
    guestId, categoryId, ratePlanId, checkInDate, checkOutDate,
    adults = 2, children = 0, bookingSource = "direct", companyId,
    specialRequests, internalNotes, ratePerNight, depositAmount = 0,
    createdByEmail = "front.office@aurelian.com",
  } = body;

  if (!guestId || !categoryId || !checkInDate || !checkOutDate) {
    return fail("guestId, categoryId, checkInDate, checkOutDate are required", "VALIDATION");
  }

  const cat = await db.roomCategory.findUnique({ where: { id: categoryId } });
  if (!cat) return fail("Invalid room category", "NOT_FOUND", 404);

  const rp = ratePlanId ? await db.ratePlan.findUnique({ where: { id: ratePlanId } }) : null;
  const rate = ratePerNight ?? cat.baseRate + (rp?.markupPercent ?? 0);
  const nights = Math.max(1, Math.round((new Date(checkOutDate).getTime() - new Date(checkInDate).getTime()) / 86400000));

  const count = await db.reservation.count();
  const confirmationNumber = `AUR-${1500 + count}`;

  const reservation = await db.reservation.create({
    data: {
      propertyId,
      confirmationNumber,
      bookingSource,
      status: "confirmed",
      primaryGuestId: guestId,
      companyId: companyId || null,
      categoryId,
      ratePlanId: ratePlanId || null,
      ratePerNight: rate,
      totalNights: nights,
      checkInDate: new Date(checkInDate),
      checkOutDate: new Date(checkOutDate),
      adults,
      children,
      specialRequests: specialRequests || null,
      internalNotes: internalNotes || null,
      depositAmount,
    },
    include: { primaryGuest: true, category: true, ratePlan: true },
  });

  // Create initial folio
  await db.folio.create({
    data: {
      reservationId: reservation.id,
      folioNumber: `F-${confirmationNumber}`,
      folioType: "room",
      status: "open",
    },
  });

  await logAudit({
    propertyId, action: "RESERVATION_CREATED", entityType: "reservation", entityId: reservation.id,
    newValue: { confirmationNumber, guestId, categoryId, rate, nights },
    userRole: "fom", userEmail: createdByEmail,
  });

  await broadcast("notification.system", {
    type: "success", title: "Reservation created",
    message: `${confirmationNumber} — ${reservation.primaryGuest.firstName} ${reservation.primaryGuest.lastName}`,
  }, propertyId);

  return ok(reservation, { confirmationNumber });
}

function endOfDay(d: Date) {
  const n = new Date(d);
  n.setHours(23, 59, 59, 999);
  return n;
}
