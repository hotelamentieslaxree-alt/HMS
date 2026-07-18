// POST /api/hospital/ipd/admit — admit a patient to IPD
// GET /api/hospital/ipd/admit — list current IPD admissions
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { ok, fail, parseBody, withHandler, broadcast, logAudit, PROPERTY_ID } from "@/lib/hms";

export const dynamic = "force-dynamic";

export const GET = withHandler(async (req: NextRequest) => {
  const propertyId = await PROPERTY_ID();
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") || "admitted";

  const admissions = await db.ipdAdmission.findMany({
    where: { propertyId, status },
    include: {
      patient: { select: { id: true, patientId: true, firstName: true, lastName: true, age: true, gender: true } },
    },
    orderBy: { admissionDate: "desc" },
  });

  return ok(admissions);
});

export const POST = withHandler(async (req: NextRequest) => {
  const propertyId = await PROPERTY_ID();
  const body = await parseBody(req);

  if (!body.patientId) {
    return fail("patientId is required", "VALIDATION", 400);
  }

  // Verify patient exists
  const patient = await db.patient.findUnique({ where: { id: body.patientId } });
  if (!patient) return fail("Patient not found", "NOT_FOUND", 404);

  const admission = await db.ipdAdmission.create({
    data: {
      propertyId,
      patientId: body.patientId,
      bedNumber: body.bedId || body.bedNumber || null,
      ward: body.ward || null,
      admissionDate: new Date(),
      admittingDoctor: body.admittingDoctor || null,
      diagnosis: body.diagnosis || null,
      status: "admitted",
      notes: body.notes || null,
    },
    include: {
      patient: { select: { id: true, patientId: true, firstName: true, lastName: true, age: true, gender: true } },
    },
  });

  // Update patient status to admitted
  await db.patient.update({
    where: { id: body.patientId },
    data: { status: "active" },
  });

  await logAudit({
    propertyId,
    action: "IPD_PATIENT_ADMITTED",
    entityType: "IpdAdmission",
    entityId: admission.id,
    newValue: admission,
  });

  await broadcast("hospital:ipd_admitted", admission, propertyId);

  return ok(admission);
});
