// GET /api/finance/invoices — list invoices with status filter
// POST /api/finance/invoices — create new invoice
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { ok, fail, parseBody, withHandler, broadcast, logAudit, PROPERTY_ID } from "@/lib/hms";

export const dynamic = "force-dynamic";

export const GET = withHandler(async (req: NextRequest) => {
  const propertyId = await PROPERTY_ID();
  const { searchParams } = new URL(req.url);

  const status = searchParams.get("status") || "";
  const invoiceType = searchParams.get("type") || "";
  const search = searchParams.get("search") || "";
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit")) || 20));
  const skip = (page - 1) * limit;

  const where: any = { propertyId };
  if (status) where.status = status;
  if (invoiceType) where.invoiceType = invoiceType;
  if (search) {
    where.OR = [
      { invoiceNumber: { contains: search } },
      { partyName: { contains: search } },
    ];
  }

  const [invoices, total] = await Promise.all([
    db.invoice.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    db.invoice.count({ where }),
  ]);

  return ok(invoices, { total, page, limit, pages: Math.ceil(total / limit) });
});

export const POST = withHandler(async (req: NextRequest) => {
  const propertyId = await PROPERTY_ID();
  const body = await parseBody(req);

  if (!body.partyName) {
    return fail("partyName is required", "VALIDATION", 400);
  }

  // Auto-generate invoiceNumber: INV-YYYYMMDD-XXX
  const today = new Date();
  const dateStr = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, "0")}${String(today.getDate()).padStart(2, "0")}`;
  const prefix = `INV-${dateStr}-`;

  const existing = await db.invoice.findMany({
    where: { propertyId, invoiceNumber: { startsWith: prefix } },
    select: { invoiceNumber: true },
    orderBy: { invoiceNumber: "desc" },
  });

  let maxSeq = 0;
  for (const inv of existing) {
    const m = /INV-\d{8}-(\d+)/.exec(inv.invoiceNumber);
    if (m) maxSeq = Math.max(maxSeq, parseInt(m[1], 10));
  }
  const invoiceNumber = `${prefix}${String(maxSeq + 1).padStart(3, "0")}`;

  const amount = body.amount ?? 0;
  const cgst = body.cgst ?? 0;
  const sgst = body.sgst ?? 0;
  const igst = body.igst ?? 0;
  const totalAmount = body.totalAmount ?? (amount + cgst + sgst + igst);

  const invoice = await db.invoice.create({
    data: {
      propertyId,
      invoiceNumber,
      invoiceType: body.invoiceType ?? "tax_invoice",
      partyName: body.partyName,
      partyGst: body.partyGst ?? null,
      amount,
      cgst,
      sgst,
      igst,
      totalAmount,
      status: body.status ?? "draft",
      dueDate: body.dueDate ? new Date(body.dueDate) : null,
      paidAmount: body.paidAmount ?? 0,
      notes: body.notes ?? null,
      reservationId: body.reservationId ?? null,
      folioId: body.folioId ?? null,
    },
  });

  await logAudit({
    propertyId,
    action: "INVOICE_CREATED",
    entityType: "Invoice",
    entityId: invoice.id,
    newValue: invoice,
  });

  await broadcast("finance:invoice_created", invoice, propertyId);

  return ok(invoice);
});
