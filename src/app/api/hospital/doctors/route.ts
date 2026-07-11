// GET /api/hospital/doctors — list doctors with specialization filter
// POST /api/hospital/doctors — create new doctor
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { ok, fail, parseBody, withHandler, broadcast, logAudit, PROPERTY_ID } from "@/lib/hms";

export const dynamic = "force-dynamic";

export const GET = withHandler(async (req: NextRequest) => {
  const propertyId = await PROPERTY_ID();
  const { searchParams } = new URL(req.url);

  const specialization = searchParams.get("specialization") || "";
  const status = searchParams.get("status") || "";
  const search = searchParams.get("search") || "";

  const where: any = { propertyId };
  if (specialization) where.specialization = specialization;
  if (status) where.status = status;
  if (search) {
    where.OR = [
      { firstName: { contains: search } },
      { lastName: { contains: search } },
      { department: { contains: search } },
    ];
  }

  const doctors = await db.doctor.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });

  return ok(doctors);
});

export const POST = withHandler(async (req: NextRequest) => {
  const propertyId = await PROPERTY_ID();
  const body = await parseBody(req);

  if (!body.firstName || !body.lastName) {
    return fail("firstName and lastName are required", "VALIDATION", 400);
  }

  const doctor = await db.doctor.create({
    data: {
      propertyId,
      firstName: body.firstName,
      lastName: body.lastName,
      specialization: body.specialization ?? null,
      qualification: body.qualification ?? null,
      phone: body.phone ?? null,
      email: body.email ?? null,
      department: body.department ?? null,
      consultationFee: body.consultationFee ?? 0,
      availableDays: body.availableDays ?? "[]",
      availableFrom: body.availableFrom ?? null,
      availableTo: body.availableTo ?? null,
      status: body.status ?? "active",
    },
  });

  await logAudit({
    propertyId,
    action: "DOCTOR_CREATED",
    entityType: "Doctor",
    entityId: doctor.id,
    newValue: doctor,
  });

  await broadcast("hospital:doctor_created", doctor, propertyId);

  return ok(doctor);
});
