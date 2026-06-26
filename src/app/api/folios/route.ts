// /api/folios — list folios (open/closed) + get single folio by reservation
import { db } from "@/lib/db";
import { ok, fail, parseBody, PROPERTY_ID } from "@/lib/hms";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const propertyId = await PROPERTY_ID();
  const url = new URL(req.url);
  const status = url.searchParams.get("status");
  const reservationId = url.searchParams.get("reservationId");

  const folios = await db.folio.findMany({
    where: {
      reservation: { propertyId },
      ...(status ? { status } : {}),
      ...(reservationId ? { reservationId } : {}),
    },
    include: {
      reservation: { include: { primaryGuest: true, room: true, category: true } },
      lines: { orderBy: { postedAt: "asc" } },
      payments: { orderBy: { processedAt: "desc" } },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return ok(folios.map((f) => ({
    id: f.id,
    folioNumber: f.folioNumber,
    status: f.status,
    folioType: f.folioType,
    subtotal: f.subtotal,
    taxAmount: f.taxAmount,
    totalAmount: f.totalAmount,
    paidAmount: f.paidAmount,
    balance: f.balance,
    createdAt: f.createdAt,
    closedAt: f.closedAt,
    reservation: {
      id: f.reservation.id,
      confirmationNumber: f.reservation.confirmationNumber,
      guest: {
        id: f.reservation.primaryGuest.id,
        name: `${f.reservation.primaryGuest.title} ${f.reservation.primaryGuest.firstName} ${f.reservation.primaryGuest.lastName}`,
        phone: f.reservation.primaryGuest.phone,
        email: f.reservation.primaryGuest.email,
      },
      room: f.reservation.room ? { number: f.reservation.room.roomNumber } : null,
      category: f.reservation.category.name,
    },
    lines: f.lines.map((l) => ({
      id: l.id, transactionType: l.transactionType, description: l.description,
      amount: l.amount, taxAmount: l.taxAmount, departmentCode: l.departmentCode,
      postedAt: l.postedAt, isVoided: l.isVoided, voidReason: l.voidReason,
    })),
    payments: f.payments.map((p) => ({
      id: p.id, amount: p.amount, method: p.paymentMethod, status: p.status,
      reference: p.paymentReference, processedAt: p.processedAt, cardLast4: p.cardLast4, cardType: p.cardType,
    })),
  })));
}

// POST: post a manual charge to a folio
export async function POST(req: Request) {
  const body = await parseBody(req);
  const { folioId, description, amount, departmentCode = "MISC", taxCode = "GST18" } = body;
  if (!folioId || !description || !amount) return fail("folioId, description, amount required", "VALIDATION");

  const folio = await db.folio.findUnique({ where: { id: folioId } });
  if (!folio) return fail("Folio not found", "NOT_FOUND", 404);
  if (folio.status !== "open") return fail("Folio is not open", "INVALID_STATE");

  const taxRate = taxCode === "GST5" ? 0.05 : taxCode === "GST12" ? 0.12 : taxCode === "GST28" ? 0.28 : 0.18;
  const taxAmount = Math.round(amount * taxRate);
  const line = await db.folioLine.create({
    data: { folioId, transactionType: "charge", description, amount, taxCode, taxAmount, departmentCode, postedBy: "user", referenceType: "manual" },
  });

  await db.folio.update({
    where: { id: folioId },
    data: {
      subtotal: { increment: amount },
      taxAmount: { increment: taxAmount },
      totalAmount: { increment: amount + taxAmount },
      balance: { increment: amount + taxAmount },
    },
  });

  return ok(line);
}
