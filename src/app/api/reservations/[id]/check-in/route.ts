// POST /api/reservations/[id]/check-in
import { db } from "@/lib/db";
import { ok, fail, broadcast, logAudit, PROPERTY_ID } from "@/lib/hms";

export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const propertyId = await PROPERTY_ID();
  const reservation = await db.reservation.findUnique({
    where: { id },
    include: { primaryGuest: true, category: true, room: true },
  });
  if (!reservation) return fail("Reservation not found", "NOT_FOUND", 404);
  if (reservation.status !== "confirmed" && reservation.status !== "tentative") {
    return fail(`Cannot check-in reservation with status ${reservation.status}`, "INVALID_STATE");
  }

  // Auto-assign a room if none assigned
  let room = reservation.room;
  if (!room) {
    room = await db.room.findFirst({
      where: { propertyId, categoryId: reservation.categoryId, currentStatus: "vacant_clean" },
    });
    if (!room) return fail("No available room in this category", "NO_ROOM_AVAILABLE");
  } else if (room.currentStatus !== "vacant_clean") {
    return fail(`Room ${room.roomNumber} is not vacant-clean (current: ${room.currentStatus})`, "ROOM_NOT_AVAILABLE");
  }

  const now = new Date();
  await db.$transaction([
    db.reservation.update({
      where: { id },
      data: { status: "checked_in", actualCheckIn: now, roomId: room.id },
    }),
    db.room.update({
      where: { id: room.id },
      data: { currentStatus: "occupied_clean" },
    }),
    db.roomStatusLog.create({
      data: { roomId: room.id, oldStatus: "vacant_clean", newStatus: "occupied_clean", reason: `Check-in ${reservation.confirmationNumber}` },
    }),
  ]);

  // Post first night room charge to folio
  const folio = await db.folio.findFirst({ where: { reservationId: reservation.id } });
  if (folio) {
    await db.folioLine.create({
      data: {
        folioId: folio.id,
        transactionType: "charge",
        description: `Room charge — ${reservation.category.name} (Night 1)`,
        amount: reservation.ratePerNight,
        taxCode: "GST12",
        taxAmount: Math.round(reservation.ratePerNight * 0.12),
        departmentCode: "ROOM",
        referenceType: "room_rate",
        postedBy: "system",
      },
    });
    await db.folio.update({
      where: { id: folio.id },
      data: {
        subtotal: { increment: reservation.ratePerNight },
        taxAmount: { increment: Math.round(reservation.ratePerNight * 0.12) },
        totalAmount: { increment: reservation.ratePerNight + Math.round(reservation.ratePerNight * 0.12) },
        balance: { increment: reservation.ratePerNight + Math.round(reservation.ratePerNight * 0.12) },
      },
    });
  }

  await logAudit({
    propertyId, action: "CHECKIN", entityType: "reservation", entityId: reservation.id,
    newValue: { roomNumber: room.roomNumber, guest: `${reservation.primaryGuest.firstName} ${reservation.primaryGuest.lastName}` },
    userRole: "receptionist",
  });

  await broadcast("reservation.checked_in", {
    reservationId: reservation.id,
    confirmationNumber: reservation.confirmationNumber,
    guestName: `${reservation.primaryGuest.firstName} ${reservation.primaryGuest.lastName}`,
    roomNumber: room.roomNumber,
  }, propertyId);

  return ok({ reservationId: reservation.id, roomNumber: room.roomNumber, checkedInAt: now });
}
