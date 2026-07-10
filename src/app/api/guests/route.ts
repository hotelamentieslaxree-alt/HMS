// /api/guests — list (search) + create
import { db } from "@/lib/db";
import { ok, fail, parseBody, safeJsonParse, withHandler } from "@/lib/hms";

export const dynamic = "force-dynamic";

export const GET = withHandler(async (req: Request) => {
  const url = new URL(req.url);
  const search = url.searchParams.get("search") || "";
  const vipOnly = url.searchParams.get("vip") === "true";
  const limit = parseInt(url.searchParams.get("limit") || "50");

  let where: any = {};
  if (search) {
    where.OR = [
      { firstName: { contains: search } },
      { lastName: { contains: search } },
      { email: { contains: search } },
      { phone: { contains: search } },
    ];
  }
  if (vipOnly) where.vipStatus = true;

  const guests = await db.guest.findMany({
    where,
    orderBy: { totalRevenue: "desc" },
    take: limit,
    include: { primaryReservations: { select: { id: true, status: true, checkInDate: true, confirmationNumber: true } } },
  });

  return ok(guests.map((g) => ({
    id: g.id,
    title: g.title,
    firstName: g.firstName,
    lastName: g.lastName,
    fullName: `${g.firstName} ${g.lastName}`,
    email: g.email,
    phone: g.phone,
    nationality: g.nationality,
    loyaltyTier: g.loyaltyTier,
    loyaltyPoints: g.loyaltyPoints,
    vipStatus: g.vipStatus,
    doNotDisturb: g.doNotDisturb,
    totalStays: g.totalStays,
    totalRevenue: g.totalRevenue,
    preferences: safeJsonParse(g.preferences, {}),
    reservationCount: g.primaryReservations.length,
    blacklisted: g.blacklisted,
  })));
});

export const POST = withHandler(async (req: Request) => {
  const body = await parseBody(req);
  const { title = "Mr", firstName, lastName, email, phone, nationality = "IN", idType, idNumber, preferences, vipStatus = false } = body;
  if (!firstName || !lastName) return fail("firstName and lastName required", "VALIDATION");

  const existing = email ? await db.guest.findFirst({ where: { email } }) : null;
  if (existing) return ok(existing, { note: "Guest already exists" });

  const guest = await db.guest.create({
    data: {
      title, firstName, lastName, email, phone, nationality, idType, idNumber,
      preferences: preferences ? JSON.stringify(preferences) : "{}",
      vipStatus,
    },
  });
  return ok(guest);
});
