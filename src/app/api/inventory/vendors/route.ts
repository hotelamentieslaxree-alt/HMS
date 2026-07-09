// GET /api/inventory/vendors — list vendors
// POST /api/inventory/vendors — create new vendor
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { ok, fail, parseBody, withHandler, broadcast, logAudit, PROPERTY_ID } from "@/lib/hms";

export const dynamic = "force-dynamic";

export const GET = withHandler(async (req: NextRequest) => {
  const propertyId = await PROPERTY_ID();
  const { searchParams } = new URL(req.url);

  const category = searchParams.get("category") || "";
  const search = searchParams.get("search") || "";
  const activeOnly = searchParams.get("active") !== "false";

  const where: any = { propertyId };
  if (activeOnly) where.isActive = true;
  if (category) where.category = category;
  if (search) {
    where.OR = [
      { name: { contains: search } },
      { contactPerson: { contains: search } },
      { email: { contains: search } },
    ];
  }

  const vendors = await db.vendor.findMany({
    where,
    orderBy: { name: "asc" },
  });

  return ok(vendors);
});

export const POST = withHandler(async (req: NextRequest) => {
  const propertyId = await PROPERTY_ID();
  const body = await parseBody(req);

  if (!body.name) {
    return fail("name is required", "VALIDATION", 400);
  }

  const vendor = await db.vendor.create({
    data: {
      propertyId,
      name: body.name,
      contactPerson: body.contactPerson ?? null,
      phone: body.phone ?? null,
      email: body.email ?? null,
      address: body.address ?? null,
      gstNumber: body.gstNumber ?? null,
      panNumber: body.panNumber ?? null,
      category: body.category ?? null,
      rating: body.rating ?? 5,
      paymentTerms: body.paymentTerms ?? null,
      isActive: body.isActive ?? true,
    },
  });

  await logAudit({
    propertyId,
    action: "VENDOR_CREATED",
    entityType: "Vendor",
    entityId: vendor.id,
    newValue: vendor,
  });

  await broadcast("inventory:vendor_created", vendor, propertyId);

  return ok(vendor);
});
