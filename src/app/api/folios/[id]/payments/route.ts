// POST /api/folios/[id]/payments — record a payment on a folio
import { db } from "@/lib/db";
import { ok, fail, parseBody, broadcast, PROPERTY_ID } from "@/lib/hms";

export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const propertyId = await PROPERTY_ID();
  const body = await parseBody(req);
  const { amount, paymentMethod = "cash", reference, cardLast4, cardType } = body;
  if (!amount || amount <= 0) return fail("Valid amount required", "VALIDATION");

  const folio = await db.folio.findUnique({ where: { id } });
  if (!folio) return fail("Folio not found", "NOT_FOUND", 404);

  const payment = await db.payment.create({
    data: {
      folioId: id, amount, paymentMethod,
      paymentReference: reference || null, cardLast4: cardLast4 || null, cardType: cardType || null,
      status: "completed", processedBy: "user",
    },
  });

  await db.folio.update({
    where: { id },
    data: {
      paidAmount: { increment: amount },
      balance: { decrement: amount },
    },
  });

  // Also create a payment folio line
  await db.folioLine.create({
    data: {
      folioId: id, transactionType: "payment",
      description: `Payment — ${paymentMethod}${cardLast4 ? ` (****${cardLast4})` : ""}`,
      amount: -amount, taxCode: null, taxAmount: 0,
      departmentCode: "PAYMENT", referenceType: "manual",
    },
  });

  await broadcast("notification.system", {
    type: "success", title: "Payment recorded",
    message: `${paymentMethod} ₹${amount.toLocaleString("en-IN")} on folio ${folio.folioNumber}`,
  }, propertyId);

  return ok(payment);
}
