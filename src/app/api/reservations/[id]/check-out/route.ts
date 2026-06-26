// POST /api/reservations/[id]/check-out
// Atomic check-out: validates status, optionally posts balance as cash payment
// (audited), closes folio, marks room vacant_dirty. All inside one transaction.
import { db } from "@/lib/db";
import { ok, fail, broadcast, logAudit, PROPERTY_ID, withHandler, roundMoney } from "@/lib/hms";

export const dynamic = "force-dynamic";

export const POST = withHandler(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const propertyId = await PROPERTY_ID();

  const result = await db.$transaction(async (tx) => {
    const reservation = await tx.reservation.findUnique({
      where: { id },
      include: { primaryGuest: true, room: true, category: true, folios: { include: { lines: true, payments: true } } },
    });
    if (!reservation) throw Object.assign(new Error("Reservation not found"), { code: "NOT_FOUND", status: 404 });
    if (reservation.status !== "checked_in") {
      throw Object.assign(new Error(`Cannot check-out reservation with status ${reservation.status}`), { code: "INVALID_STATE", status: 400 });
    }
    if (!reservation.room) throw Object.assign(new Error("No room assigned"), { code: "INVALID_STATE", status: 400 });

    // Compute folio balance from lines + payments
    const folio = reservation.folios.find((f) => f.status === "open") ?? reservation.folios[0];
    if (!folio) throw Object.assign(new Error("No folio found for reservation"), { code: "INVALID_STATE", status: 400 });

    const chargeLines = folio.lines.filter((l) => !l.isVoided && l.transactionType === "charge");
    const subtotal = roundMoney(chargeLines.reduce((s, l) => s + l.amount, 0));
    const taxAmount = roundMoney(chargeLines.reduce((s, l) => s + l.taxAmount, 0));
    const totalCharges = roundMoney(subtotal + taxAmount);
    const totalPayments = roundMoney(folio.payments.filter((p) => p.status === "completed").reduce((s, p) => s + p.amount, 0));
    const balance = roundMoney(totalCharges - totalPayments);

    // If there is a balance, post a cash payment for the remaining amount
    // (audited as auto-settlement so accountants can trace it).
    let autoSettledAmount = 0;
    if (balance > 0) {
      await tx.payment.create({
        data: {
          folioId: folio.id,
          amount: balance,
          paymentMethod: "cash",
          status: "completed",
          processedBy: "system:auto_checkout",
        },
      });
      autoSettledAmount = balance;
    }

    const now = new Date();

    await tx.reservation.update({
      where: { id },
      data: { status: "checked_out", actualCheckOut: now },
    });
    await tx.room.update({
      where: { id: reservation.room.id },
      data: { currentStatus: "vacant_dirty" },
    });
    await tx.roomStatusLog.create({
      data: { roomId: reservation.room.id, oldStatus: "occupied_clean", newStatus: "vacant_dirty", reason: `Check-out ${reservation.confirmationNumber}` },
    });
    await tx.folio.update({
      where: { id: folio.id },
      data: {
        status: "closed",
        closedAt: now,
        closedBy: "system:auto_checkout",
        subtotal,
        taxAmount,
        totalAmount: totalCharges,
        paidAmount: totalCharges,
        balance: 0,
      },
    });

    // Update guest stats
    await tx.guest.update({
      where: { id: reservation.primaryGuest.id },
      data: {
        totalStays: { increment: 1 },
        totalRevenue: { increment: totalCharges },
        loyaltyPoints: { increment: Math.floor(totalCharges / 100) },
      },
    });

    return { reservation, room: reservation.room, totalCharges, autoSettledAmount, now };
  });

  await logAudit({
    propertyId, action: "CHECKOUT", entityType: "reservation", entityId: result.reservation.id,
    newValue: {
      roomNumber: result.room.roomNumber,
      total: result.totalCharges,
      autoSettledAsCash: result.autoSettledAmount,
    },
    userRole: "receptionist",
  });

  if (result.autoSettledAmount > 0) {
    await logAudit({
      propertyId, action: "PAYMENT_AUTO_SETTLED", entityType: "folio",
      entityId: result.reservation.id,
      newValue: { amount: result.autoSettledAmount, method: "cash", reason: "auto_checkout" },
      userRole: "system",
    });
  }

  await broadcast("reservation.checked_out", {
    reservationId: result.reservation.id,
    guestName: `${result.reservation.primaryGuest.firstName} ${result.reservation.primaryGuest.lastName}`,
    roomNumber: result.room.roomNumber,
  }, propertyId);

  await broadcast("room.status.updated", {
    roomId: result.room.id,
    roomNumber: result.room.roomNumber,
    newStatus: "vacant_dirty",
    reason: "Checkout",
  }, propertyId);

  return ok({
    reservationId: result.reservation.id,
    roomNumber: result.room.roomNumber,
    checkedOutAt: result.now,
    folioTotal: result.totalCharges,
    autoSettled: result.autoSettledAmount,
  });
});
