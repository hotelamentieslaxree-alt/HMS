// POST /api/reservations/[id]/check-in
// Atomic check-in: validates status, auto-assigns a room, posts first-night
// charge to folio, all inside a single transaction (C3 race-condition fix).
import { db } from "@/lib/db";
import { ok, fail, broadcast, logAudit, PROPERTY_ID, withHandler, roundMoney } from "@/lib/hms";

export const dynamic = "force-dynamic";

export const POST = withHandler(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const propertyId = await PROPERTY_ID();

  const result = await db.$transaction(async (tx) => {
    // Lock-by-validate: re-read inside the transaction so concurrent
    // transactions see each other's committed status updates.
    const reservation = await tx.reservation.findUnique({
      where: { id },
      include: { primaryGuest: true, category: true, room: true, folios: true },
    });
    if (!reservation) throw Object.assign(new Error("Reservation not found"), { code: "NOT_FOUND", status: 404 });
    if (reservation.status !== "confirmed" && reservation.status !== "tentative") {
      throw Object.assign(new Error(`Cannot check-in reservation with status ${reservation.status}`), { code: "INVALID_STATE", status: 400 });
    }

    // Auto-assign a room if none assigned
    let room = reservation.room;
    if (!room) {
      room = await tx.room.findFirst({
        where: { propertyId, categoryId: reservation.categoryId, currentStatus: "vacant_clean" },
      });
      if (!room) throw Object.assign(new Error("No available room in this category"), { code: "NO_ROOM_AVAILABLE", status: 400 });
    } else if (room.currentStatus !== "vacant_clean") {
      throw Object.assign(new Error(`Room ${room.roomNumber} is not vacant-clean (current: ${room.currentStatus})`), { code: "ROOM_NOT_AVAILABLE", status: 400 });
    }

    const now = new Date();

    await tx.reservation.update({
      where: { id },
      data: { status: "checked_in", actualCheckIn: now, roomId: room.id },
    });
    await tx.room.update({
      where: { id: room.id },
      data: { currentStatus: "occupied_clean" },
    });
    await tx.roomStatusLog.create({
      data: { roomId: room.id, oldStatus: "vacant_clean", newStatus: "occupied_clean", reason: `Check-in ${reservation.confirmationNumber}` },
    });

    // Post first night room charge + GST12 to folio (atomic)
    const folio = reservation.folios.find((f) => f.status === "open") ?? reservation.folios[0];
    if (folio) {
      const rate = roundMoney(reservation.ratePerNight);
      const tax = roundMoney(rate * 0.12);
      await tx.folioLine.create({
        data: {
          folioId: folio.id,
          transactionType: "charge",
          description: `Room charge — ${reservation.category.name} (Night 1)`,
          amount: rate,
          taxCode: "GST12",
          taxAmount: tax,
          departmentCode: "ROOM",
          referenceType: "room_rate",
          postedBy: "system",
        },
      });
      await tx.folio.update({
        where: { id: folio.id },
        data: {
          subtotal: { increment: rate },
          taxAmount: { increment: tax },
          totalAmount: { increment: roundMoney(rate + tax) },
          balance: { increment: roundMoney(rate + tax) },
        },
      });
    }

    return { reservation, room, now };
  });

  await logAudit({
    propertyId, action: "CHECKIN", entityType: "reservation", entityId: result.reservation.id,
    newValue: { roomNumber: result.room.roomNumber, guest: `${result.reservation.primaryGuest.firstName} ${result.reservation.primaryGuest.lastName}` },
    userRole: "receptionist",
  });

  await broadcast("reservation.checked_in", {
    reservationId: result.reservation.id,
    confirmationNumber: result.reservation.confirmationNumber,
    guestName: `${result.reservation.primaryGuest.firstName} ${result.reservation.primaryGuest.lastName}`,
    roomNumber: result.room.roomNumber,
  }, propertyId);

  await broadcast("room.status.updated", {
    roomId: result.room.id,
    roomNumber: result.room.roomNumber,
    newStatus: "occupied_clean",
    reason: "Check-in",
  }, propertyId);

  return ok({
    reservationId: result.reservation.id,
    confirmationNumber: result.reservation.confirmationNumber,
    guestName: `${result.reservation.primaryGuest.firstName} ${result.reservation.primaryGuest.lastName}`,
    roomNumber: result.room.roomNumber,
    checkedInAt: result.now,
  });
});
