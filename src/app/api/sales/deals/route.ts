// /api/sales/deals — list + create + update deals (Prisma)
import { db } from "@/lib/db";
import { ok, fail, parseBody, withHandler, PROPERTY_ID } from "@/lib/hms";

export const dynamic = "force-dynamic";

export const GET = withHandler(async (req: Request) => {
  const propertyId = await PROPERTY_ID();
  const url = new URL(req.url);
  const stage = url.searchParams.get("stage") || "";

  const where: any = { propertyId };
  if (stage) where.stage = stage;

  const deals = await db.deal.findMany({
    where,
    include: {
      lead: { select: { id: true, companyName: true, contactName: true } },
      assignedTo: { select: { id: true, firstName: true, lastName: true } },
    },
    orderBy: [{ createdAt: "desc" }],
  });

  return ok(deals);
});

export const POST = withHandler(async (req: Request) => {
  const propertyId = await PROPERTY_ID();
  const body = await parseBody(req);
  const {
    title, leadId, value = 0, stage = "prospecting",
    probability = 10, closeDate, assignedToId, notes = "",
  } = body;

  if (!title) return fail("Deal title is required", "VALIDATION");
  if (!leadId) return fail("Lead association is required", "VALIDATION");

  const deal = await db.deal.create({
    data: {
      propertyId,
      title,
      leadId,
      value: Number(value),
      stage,
      probability: Number(probability),
      closeDate: closeDate ? new Date(closeDate) : null,
      assignedToId: assignedToId || null,
      notes: notes || null,
    },
    include: {
      lead: { select: { id: true, companyName: true, contactName: true } },
      assignedTo: { select: { id: true, firstName: true, lastName: true } },
    },
  });

  return ok(deal);
});

export const PUT = withHandler(async (req: Request) => {
  const body = await parseBody(req);
  const { id, stage, ...updates } = body;
  if (!id) return fail("Deal ID required", "VALIDATION");

  const existing = await db.deal.findUnique({ where: { id } });
  if (!existing) return fail("Deal not found", "NOT_FOUND", 404);

  const updateData: any = {};
  if (stage) {
    updateData.stage = stage;
    if (stage === "closed_won") updateData.probability = 100;
    if (stage === "closed_lost") updateData.probability = 0;
  }
  // Allow updating other fields
  if (updates.title !== undefined) updateData.title = updates.title;
  if (updates.value !== undefined) updateData.value = Number(updates.value);
  if (updates.probability !== undefined) updateData.probability = Number(updates.probability);
  if (updates.closeDate !== undefined) updateData.closeDate = updates.closeDate ? new Date(updates.closeDate) : null;
  if (updates.assignedToId !== undefined) updateData.assignedToId = updates.assignedToId || null;
  if (updates.notes !== undefined) updateData.notes = updates.notes || null;

  const deal = await db.deal.update({
    where: { id },
    data: updateData,
    include: {
      lead: { select: { id: true, companyName: true, contactName: true } },
      assignedTo: { select: { id: true, firstName: true, lastName: true } },
    },
  });

  return ok(deal);
});
