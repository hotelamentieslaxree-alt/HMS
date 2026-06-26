// POST /api/reservations/[id]/cancel
import { db } from "@/lib/db";
import { ok, fail, parseBody, logAudit, broadcast, PROPERTY_ID } from "@/lib/hms";

export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const propertyId = await PROPERTY_ID();
  const body = await parseBody(req);
  const reservation = await db.reservation.findUnique({ where: { id }, include: { primaryGuest: true } });
  if (!reservation) return fail("Reservation not found", "NOT_FOUND", 404);
  if (["checked_in", "checked_out", "cancelled", "no_show"].includes(reservation.status)) {
    return fail(`Cannot cancel reservation with status ${reservation.status}`, "INVALID_STATE");
  }

  const updated = await db.reservation.update({
    where: { id },
    data: {
      status: "cancelled",
      cancellationReason: body.reason || "Cancelled by user",
      cancelledAt: new Date(),
      cancelledBy: body.cancelledBy ?? "system",
    },
  });

  await logAudit({
    propertyId, action: "RESERVATION_CANCELLED", entityType: "reservation", entityId: id,
    newValue: { reason: body.reason }, userRole: "fom",
  });

  await broadcast("notification.system", {
    type: "warning", title: "Reservation cancelled",
    message: `${reservation.confirmationNumber} — ${reservation.primaryGuest.firstName} ${reservation.primaryGuest.lastName}`,
  }, propertyId);

  return ok(updated);
}
