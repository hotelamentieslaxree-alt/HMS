// POST /api/crm/corporates — create a new corporate account
// GET /api/crm/corporates — list corporate accounts
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { ok, fail, parseBody, withHandler, broadcast, logAudit, PROPERTY_ID } from "@/lib/hms";

export const dynamic = "force-dynamic";

export const GET = withHandler(async (req: NextRequest) => {
  const propertyId = await PROPERTY_ID();
  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") || "";
  const status = searchParams.get("status") || "";

  const where: any = { propertyId };
  if (status) where.status = status;
  if (search) {
    where.OR = [
      { companyName: { contains: search } },
      { code: { contains: search } },
    ];
  }

  const corporates = await db.corporateAccount.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });

  return ok(corporates);
});

export const POST = withHandler(async (req: NextRequest) => {
  const propertyId = await PROPERTY_ID();
  const body = await parseBody(req);

  if (!body.companyName || !body.code) {
    return fail("companyName and code are required", "VALIDATION", 400);
  }

  // Check for existing code
  const existing = await db.corporateAccount.findUnique({ where: { code: body.code } });
  if (existing) return fail("Corporate account with this code already exists", "DUPLICATE", 409);

  const corporate = await db.corporateAccount.create({
    data: {
      propertyId,
      companyName: body.companyName,
      code: body.code,
      contactPerson: body.contactPerson || null,
      email: body.email || null,
      phone: body.phone || null,
      negotiatedRate: Number(body.negotiatedRate || 0),
      roomsPerYear: Number(body.roomsPerYear || 0),
      contractUntil: body.contractUntil ? new Date(body.contractUntil) : null,
      status: body.status || "active",
      notes: body.notes || null,
    },
  });

  await logAudit({
    propertyId,
    action: "CRM_CORPORATE_CREATED",
    entityType: "CorporateAccount",
    entityId: corporate.id,
    newValue: corporate,
  });

  await broadcast("crm:corporate_created", corporate, propertyId);

  return ok(corporate);
});
