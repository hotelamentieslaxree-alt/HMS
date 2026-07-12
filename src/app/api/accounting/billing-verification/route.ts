// GET /api/accounting/billing-verification — list billing verifications, filter by status
// POST /api/accounting/billing-verification — create verification record
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { ok, fail, parseBody, withHandler, broadcast, logAudit, PROPERTY_ID, roundMoney } from "@/lib/hms";

export const dynamic = "force-dynamic";

export const GET = withHandler(async (req: NextRequest) => {
  const propertyId = await PROPERTY_ID();
  const { searchParams } = new URL(req.url);

  const status = searchParams.get("status") || "";
  const verificationType = searchParams.get("verificationType") || "";
  const search = searchParams.get("search") || "";
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit")) || 20));
  const skip = (page - 1) * limit;

  const where: any = { propertyId };
  if (status) where.status = status;
  if (verificationType) where.verificationType = verificationType;
  if (search) {
    where.OR = [
      { referenceNumber: { contains: search } },
      { notes: { contains: search } },
    ];
  }

  const [verifications, total] = await Promise.all([
    db.billingVerification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    db.billingVerification.count({ where }),
  ]);

  return ok(verifications, { total, page, limit, pages: Math.ceil(total / limit) });
});

export const POST = withHandler(async (req: NextRequest) => {
  const propertyId = await PROPERTY_ID();
  const body = await parseBody(req);

  if (!body.verificationType || body.amount === undefined) {
    return fail("verificationType and amount are required", "VALIDATION", 400);
  }

  const validTypes = ["invoice", "expense", "purchase_order", "folio"];
  if (!validTypes.includes(body.verificationType)) {
    return fail(`verificationType must be one of: ${validTypes.join(", ")}`, "VALIDATION", 400);
  }

  const amount = roundMoney(body.amount ?? 0);
  const verifiedAmount = roundMoney(body.verifiedAmount ?? 0);
  const discrepancy = roundMoney(body.discrepancy ?? (verifiedAmount - amount));

  const verification = await db.billingVerification.create({
    data: {
      propertyId,
      invoiceId: body.invoiceId ?? null,
      expenseId: body.expenseId ?? null,
      verificationType: body.verificationType,
      referenceNumber: body.referenceNumber ?? null,
      amount,
      verifiedAmount,
      discrepancy,
      status: body.status ?? "pending",
      verifiedBy: body.verifiedBy ?? null,
      approvedBy: body.approvedBy ?? null,
      notes: body.notes ?? null,
      checklist: body.checklist ? JSON.stringify(body.checklist) : "[]",
    },
  });

  await logAudit({
    propertyId,
    action: "BILLING_VERIFICATION_CREATED",
    entityType: "BillingVerification",
    entityId: verification.id,
    newValue: verification,
  });

  await broadcast("accounting:billing_verification_created", verification, propertyId);

  return ok(verification);
});
