// GET /api/hospital/patients — list patients with search & pagination
// POST /api/hospital/patients — create new patient (auto-generated patientId PAT-XXX)
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { ok, fail, parseBody, withHandler, broadcast, logAudit, PROPERTY_ID } from "@/lib/hms";

export const dynamic = "force-dynamic";

export const GET = withHandler(async (req: NextRequest) => {
  const propertyId = await PROPERTY_ID();
  const { searchParams } = new URL(req.url);

  const search = searchParams.get("search") || "";
  const status = searchParams.get("status") || "";
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit")) || 20));
  const skip = (page - 1) * limit;

  const where: any = { propertyId };
  if (status) where.status = status;
  if (search) {
    where.OR = [
      { firstName: { contains: search } },
      { lastName: { contains: search } },
      { patientId: { contains: search } },
      { phone: { contains: search } },
      { email: { contains: search } },
    ];
  }

  const [patients, total] = await Promise.all([
    db.patient.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    db.patient.count({ where }),
  ]);

  return ok(patients, { total, page, limit, pages: Math.ceil(total / limit) });
});

export const POST = withHandler(async (req: NextRequest) => {
  const propertyId = await PROPERTY_ID();
  const body = await parseBody(req);

  // Validate required fields
  if (!body.firstName || !body.lastName) {
    return fail("firstName and lastName are required", "VALIDATION", 400);
  }

  // Auto-generate patientId in PAT-XXX format
  const existing = await db.patient.findMany({
    where: { propertyId },
    select: { patientId: true },
    orderBy: { patientId: "desc" },
  });

  let maxNum = 0;
  for (const p of existing) {
    const m = /PAT-(\d+)/.exec(p.patientId);
    if (m) maxNum = Math.max(maxNum, parseInt(m[1], 10));
  }
  const patientId = `PAT-${String(maxNum + 1).padStart(3, "0")}`;

  const patient = await db.patient.create({
    data: {
      propertyId,
      patientId,
      firstName: body.firstName,
      lastName: body.lastName,
      age: body.age ?? null,
      gender: body.gender ?? null,
      phone: body.phone ?? null,
      email: body.email ?? null,
      address: body.address ?? null,
      bloodGroup: body.bloodGroup ?? null,
      allergies: body.allergies ?? "[]",
      medicalHistory: body.medicalHistory ?? "{}",
      emergencyContact: body.emergencyContact ?? null,
      insuranceProvider: body.insuranceProvider ?? null,
      insurancePolicy: body.insurancePolicy ?? null,
      status: body.status ?? "active",
    },
  });

  await logAudit({
    propertyId,
    action: "PATIENT_CREATED",
    entityType: "Patient",
    entityId: patient.id,
    newValue: patient,
  });

  await broadcast("hospital:patient_created", patient, propertyId);

  return ok(patient);
});
