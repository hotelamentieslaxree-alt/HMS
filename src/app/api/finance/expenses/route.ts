// GET /api/finance/expenses — list expenses with category filter
// POST /api/finance/expenses — create new expense
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { ok, fail, parseBody, withHandler, broadcast, logAudit, PROPERTY_ID } from "@/lib/hms";
import { startOfMonth, endOfMonth, parseISO } from "date-fns";

export const dynamic = "force-dynamic";

export const GET = withHandler(async (req: NextRequest) => {
  const propertyId = await PROPERTY_ID();
  const { searchParams } = new URL(req.url);

  const category = searchParams.get("category") || "";
  const status = searchParams.get("status") || "";
  const month = searchParams.get("month"); // YYYY-MM format
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit")) || 20));
  const skip = (page - 1) * limit;

  const where: any = { propertyId };
  if (category) where.category = category;
  if (status) where.status = status;
  if (month) {
    const monthDate = parseISO(`${month}-01`);
    where.expenseDate = {
      gte: startOfMonth(monthDate),
      lte: endOfMonth(monthDate),
    };
  }

  const [expenses, total] = await Promise.all([
    db.expense.findMany({
      where,
      orderBy: { expenseDate: "desc" },
      skip,
      take: limit,
    }),
    db.expense.count({ where }),
  ]);

  // Summary totals
  const summary = await db.expense.aggregate({
    where,
    _sum: { amount: true },
    _count: true,
  });

  return ok(expenses, {
    total,
    page,
    limit,
    pages: Math.ceil(total / limit),
    totalAmount: summary._sum.amount ?? 0,
  });
});

export const POST = withHandler(async (req: NextRequest) => {
  const propertyId = await PROPERTY_ID();
  const body = await parseBody(req);

  if (!body.category || !body.description || body.amount === undefined) {
    return fail("category, description, and amount are required", "VALIDATION", 400);
  }

  const expense = await db.expense.create({
    data: {
      propertyId,
      category: body.category,
      description: body.description,
      amount: Number(body.amount),
      paidTo: body.paidTo ?? null,
      paymentMethod: body.paymentMethod ?? "cash",
      receiptUrl: body.receiptUrl ?? null,
      expenseDate: body.expenseDate ? new Date(body.expenseDate) : new Date(),
      approvedById: body.approvedById ?? null,
      status: body.status ?? "pending",
    },
  });

  await logAudit({
    propertyId,
    action: "EXPENSE_CREATED",
    entityType: "Expense",
    entityId: expense.id,
    newValue: expense,
  });

  await broadcast("finance:expense_created", expense, propertyId);

  return ok(expense);
});
