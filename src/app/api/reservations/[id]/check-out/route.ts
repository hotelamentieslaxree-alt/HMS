// POST /api/reservations/[id]/check-out
import { db } from "@/lib/db";
import { ok, fail, broadcast, logAudit, PROPERTY_ID } from "@/lib/hms";

export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const propertyId = await PROPERTY_ID();
  const reservation = await db.reservation.findUnique({
    where: { id },
    include: { primaryGuest: true, room: true, category: true, folios: { include: { lines: true, payments: true } } },
  });
  if (!reservation) return fail("Reservation not found", "NOT_FOUND", 404);
  if (reservation.status !== "checked_in") return fail(`Cannot check-out reservation with status ${reservation.status}`, "INVALID_STATE");
  if (!reservation.room) return fail("No room assigned", "INVALID_STATE");

  // Verify folio balance is 0 (or post remaining payment as cash)
  const folio = reservation.folios.find((f) => f.status === "open") ?? reservation.folios[0];
  const totalCharges = folio.lines.filter((l) => !l.isVoided && l.transactionType === "charge").reduce((s, l) => s + l.amount + l.taxAmount, 0);
  const totalPayments = folio.payments.filter((p) => p.status === "completed").reduce((s, p) => s + p.amount, 0);
  const balance = totalCharges - totalPayments;

  if (balance > 0) {
    // Auto-post cash payment for balance
    await db.payment.create({
      data: {
        folioId: folio.id,
        amount: balance,
        paymentMethod: "cash",
        status: "completed",
        processedBy: "system",
      },
    });
  }

  const now = new Date();
  await db.$transaction([
    db.reservation.update({
      where: { id },
      data: { status: "checked_out", actualCheckOut: now },
    }),
    db.room.update({
      where: { id: reservation.room.id },
      data: { currentStatus: "vacant_dirty" },
    }),
    db.roomStatusLog.create({
      data: { roomId: reservation.room.id, oldStatus: "occupied_clean", newStatus: "vacant_dirty", reason: `Check-out ${reservation.confirmationNumber}` },
    }),
    db.folio.update({
      where: { id: folio.id },
      data: {
        status: "closed",
        closedAt: now,
        closedBy: "system",
        subtotal: totalCharges - folio.lines.filter((l) => l.transactionType === "charge" && !l.isVoided).reduce((s, l) => s + l.taxAmount, 0),
        taxAmount: folio.lines.filter((l) => l.transactionType === "charge" && !l.isVoided).reduce((s, l) => s + l.taxAmount, 0),
        totalAmount: totalCharges,
        paidAmount: totalCharges,
        balance: 0,
      },
    }),
  ]);

  // Update guest stats
  await db.guest.update({
    where: { id: reservation.primaryGuest.id },
    data: {
      totalStays: { increment: 1 },
      totalRevenue: { increment: totalCharges },
      loyaltyPoints: { increment: Math.floor(totalCharges / 100) },
    },
  });

  await logAudit({
    propertyId, action: "CHECKOUT", entityType: "reservation", entityId: reservation.id,
    newValue: { roomNumber: reservation.room.roomNumber, total: totalCharges },
    userRole: "receptionist",
  });

  await broadcast("reservation.checked_out", {
    reservationId: reservation.id,
    guestName: `${reservation.primaryGuest.firstName} ${reservation.primaryGuest.lastName}`,
    roomNumber: reservation.room.roomNumber,
  }, propertyId);

  await broadcast("room.status.updated", {
    roomId: reservation.room.id,
    roomNumber: reservation.room.roomNumber,
    newStatus: "vacant_dirty",
    reason: "Checkout",
  }, propertyId);

  return ok({
    reservationId: reservation.id,
    roomNumber: reservation.room.roomNumber,
    checkedOutAt: now,
    folioTotal: totalCharges,
  });
}
