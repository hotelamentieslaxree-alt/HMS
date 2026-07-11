// /api/guests/[id] — detail with stay history
import { db } from "@/lib/db";
import { ok, fail, withHandler } from "@/lib/hms";

export const dynamic = "force-dynamic";

export const GET = withHandler(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const guest = await db.guest.findUnique({
    where: { id },
    include: {
      primaryReservations: {
        include: { category: true, room: true, ratePlan: true, folios: { include: { lines: true, payments: true } } },
        orderBy: { checkInDate: "desc" },
      },
    },
  });
  if (!guest) return fail("Guest not found", "NOT_FOUND", 404);

  return ok({
    ...guest,
    preferences: guest.preferences ?? {},
    stayHistory: guest.primaryReservations.map((r) => {
      const folio = r.folios[0];
      const total = folio ? folio.lines.filter((l) => !l.isVoided && l.transactionType === "charge").reduce((s, l) => s + l.amount + l.taxAmount, 0) : 0;
      return {
        id: r.id,
        confirmationNumber: r.confirmationNumber,
        status: r.status,
        checkIn: r.checkInDate,
        checkOut: r.checkOutDate,
        nights: r.totalNights,
        category: r.category.name,
        roomNumber: r.room?.roomNumber ?? null,
        ratePerNight: r.ratePerNight,
        total,
        bookingSource: r.bookingSource,
      };
    }),
  });
});
