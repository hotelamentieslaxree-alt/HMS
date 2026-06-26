// /api/folios — list folios + post a manual charge
import { db } from "@/lib/db";
import { ok, fail, parseBody, PROPERTY_ID, withHandler, roundMoney, logAudit } from "@/lib/hms";

export const dynamic = "force-dynamic";

export const GET = withHandler(async (req: Request) => {
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
});

// POST: post a manual charge to a folio (atomic)
export const POST = withHandler(async (req: Request) => {
  const propertyId = await PROPERTY_ID();
  const body = await parseBody(req);
  const { folioId, description, amount, departmentCode = "MISC", taxCode = "GST18" } = body;
  const amt = roundMoney(Number(amount));
  if (!folioId || !description || !amt || amt <= 0) return fail("folioId, description, valid amount required", "VALIDATION");

  const taxRate = taxCode === "GST5" ? 0.05 : taxCode === "GST12" ? 0.12 : taxCode === "GST28" ? 0.28 : 0.18;
  const taxAmount = roundMoney(amt * taxRate);

  const result = await db.$transaction(async (tx) => {
    const folio = await tx.folio.findUnique({ where: { id: folioId } });
    if (!folio) throw Object.assign(new Error("Folio not found"), { code: "NOT_FOUND", status: 404 });
    if (folio.status !== "open") throw Object.assign(new Error("Folio is not open"), { code: "INVALID_STATE", status: 400 });

    const line = await tx.folioLine.create({
      data: { folioId, transactionType: "charge", description, amount: amt, taxCode, taxAmount, departmentCode, postedBy: "user", referenceType: "manual" },
    });

    await tx.folio.update({
      where: { id: folioId },
      data: {
        subtotal: { increment: amt },
        taxAmount: { increment: taxAmount },
        totalAmount: { increment: roundMoney(amt + taxAmount) },
        balance: { increment: roundMoney(amt + taxAmount) },
      },
    });
    return { line, folio };
  });

  await logAudit({
    propertyId, action: "FOLIO_CHARGE_POSTED", entityType: "folio", entityId: folioId,
    newValue: { description, amount: amt, tax: taxAmount, departmentCode },
    userRole: "front_desk",
  });

  return ok(result.line);
});
