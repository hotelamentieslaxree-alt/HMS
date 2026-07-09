// GET /api/hospital/appointments — list appointments with date filter
// POST /api/hospital/appointments — create new appointment
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { ok, fail, parseBody, withHandler, broadcast, logAudit, PROPERTY_ID } from "@/lib/hms";
import { startOfDay, endOfDay, parseISO } from "date-fns";

export const dynamic = "force-dynamic";

export const GET = withHandler(async (req: NextRequest) => {
  const propertyId = await PROPERTY_ID();
  const { searchParams } = new URL(req.url);

  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");
  const status = searchParams.get("status") || "";
  const doctorId = searchParams.get("doctorId") || "";
  const patientId = searchParams.get("patientId") || "";

  const where: any = { propertyId };
  if (status) where.status = status;
  if (doctorId) where.doctorId = doctorId;
  if (patientId) where.patientId = patientId;

  if (dateFrom || dateTo) {
    where.appointmentDate = {};
    if (dateFrom) where.appointmentDate.gte = startOfDay(parseISO(dateFrom));
    if (dateTo) where.appointmentDate.lte = endOfDay(parseISO(dateTo));
  }

  const appointments = await db.appointment.findMany({
    where,
    include: {
      patient: { select: { id: true, patientId: true, firstName: true, lastName: true } },
      doctor: { select: { id: true, firstName: true, lastName: true, specialization: true } },
    },
    orderBy: { appointmentDate: "asc" },
  });

  return ok(appointments);
});

export const POST = withHandler(async (req: NextRequest) => {
  const propertyId = await PROPERTY_ID();
  const body = await parseBody(req);

  if (!body.patientId || !body.doctorId || !body.appointmentDate) {
    return fail("patientId, doctorId, and appointmentDate are required", "VALIDATION", 400);
  }

  const appointment = await db.appointment.create({
    data: {
      propertyId,
      patientId: body.patientId,
      doctorId: body.doctorId,
      appointmentDate: new Date(body.appointmentDate),
      timeSlot: body.timeSlot ?? null,
      type: body.type ?? "opd",
      status: body.status ?? "scheduled",
      notes: body.notes ?? null,
    },
    include: {
      patient: { select: { id: true, patientId: true, firstName: true, lastName: true } },
      doctor: { select: { id: true, firstName: true, lastName: true, specialization: true } },
    },
  });

  await logAudit({
    propertyId,
    action: "APPOINTMENT_CREATED",
    entityType: "Appointment",
    entityId: appointment.id,
    newValue: appointment,
  });

  await broadcast("hospital:appointment_created", appointment, propertyId);

  return ok(appointment);
});
