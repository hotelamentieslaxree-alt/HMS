// POST /api/folios/[id]/payments — record a payment on a folio
// Fixed (H3): atomic payment posting inside a single transaction with
// folio balance check + audit logging.
import { db } from "@/lib/db";
import { ok, fail, parseBody, broadcast, PROPERTY_ID, logAudit, withHandler, roundMoney } from "@/lib/hms";

export const dynamic = "force-dynamic";

export const POST = withHandler(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const propertyId = await PROPERTY_ID();
  const body = await parseBody(req);
  const { amount, paymentMethod = "cash", reference, cardLast4, cardType } = body;
  const amt = roundMoney(Number(amount));
  if (!amt || amt <= 0) return fail("Valid amount required", "VALIDATION");

  const validMethods = ["cash", "credit_card", "debit_card", "upi", "bank_transfer", "city_ledger"];
  if (!validMethods.includes(paymentMethod)) return fail(`Invalid payment method`, "VALIDATION");

  const result = await db.$transaction(async (tx) => {
    const folio = await tx.folio.findUnique({
      where: { id },
      include: { reservation: { include: { primaryGuest: true } } },
    });
    if (!folio) throw Object.assign(new Error("Folio not found"), { code: "NOT_FOUND", status: 404 });
    if (folio.status !== "open") throw Object.assign(new Error("Folio is not open"), { code: "INVALID_STATE", status: 400 });
    if (amt > folio.balance + 0.01) {
      throw Object.assign(new Error(`Payment ₹${amt} exceeds folio balance ₹${roundMoney(folio.balance)}`), { code: "OVERPAYMENT", status: 400 });
    }

    const payment = await tx.payment.create({
      data: {
        folioId: id, amount: amt, paymentMethod,
        paymentReference: reference || null, cardLast4: cardLast4 || null, cardType: cardType || null,
        status: "completed", processedBy: "user",
      },
    });

    await tx.folio.update({
      where: { id },
      data: {
        paidAmount: { increment: amt },
        balance: { decrement: amt },
      },
    });

    // Mirror as a payment folio line for audit trail
    await tx.folioLine.create({
      data: {
        folioId: id, transactionType: "payment",
        description: `Payment — ${paymentMethod}${cardLast4 ? ` (****${cardLast4})` : ""}`,
        amount: -amt, taxCode: null, taxAmount: 0,
        departmentCode: "PAYMENT", referenceType: "manual", postedBy: "user",
      },
    });

    return { payment, folio };
  });

  await logAudit({
    propertyId, action: "PAYMENT_RECORDED", entityType: "folio", entityId: id,
    newValue: { amount: amt, method: paymentMethod, reference: reference ?? null },
    userRole: "front_desk",
  });

  await broadcast("notification.system", {
    type: "success", title: "Payment recorded",
    message: `${paymentMethod} ₹${amt.toLocaleString("en-IN")} on folio ${result.folio.folioNumber}`,
  }, propertyId);

  return ok(result.payment);
});
