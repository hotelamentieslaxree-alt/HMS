// POST /api/crm/guests — create a new guest profile (wraps Guest model)
// GET /api/crm/guests — list guests with search
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { ok, fail, parseBody, withHandler, broadcast, logAudit, PROPERTY_ID } from "@/lib/hms";

export const dynamic = "force-dynamic";

export const GET = withHandler(async (req: NextRequest) => {
  const propertyId = await PROPERTY_ID();
  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") || "";
  const vipOnly = searchParams.get("vip") === "true";
  const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit")) || 50));

  const where: any = {};
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
  });

  return ok(guests);
});

export const POST = withHandler(async (req: NextRequest) => {
  const propertyId = await PROPERTY_ID();
  const body = await parseBody(req);

  if (!body.firstName || !body.lastName) {
    return fail("firstName and lastName are required", "VALIDATION", 400);
  }

  // Check for existing guest by email
  const existing = body.email ? await db.guest.findFirst({ where: { email: body.email } }) : null;
  if (existing) return ok(existing, { note: "Guest already exists" });

  const guest = await db.guest.create({
    data: {
      propertyId,
      title: body.title || "Mr",
      firstName: body.firstName,
      lastName: body.lastName,
      email: body.email || null,
      phone: body.phone || null,
      nationality: body.nationality || "IN",
      idType: body.idType || null,
      idNumber: body.idNumber || null,
      city: body.city || null,
      country: body.country || "IN",
      preferences: body.preferences ? JSON.stringify(body.preferences) : "{}",
      vipStatus: body.vipStatus ?? false,
      loyaltyTier: body.loyaltyTier || "silver",
    },
  });

  await logAudit({
    propertyId,
    action: "CRM_GUEST_CREATED",
    entityType: "Guest",
    entityId: guest.id,
    newValue: guest,
  });

  await broadcast("crm:guest_created", guest, propertyId);

  return ok(guest);
});
