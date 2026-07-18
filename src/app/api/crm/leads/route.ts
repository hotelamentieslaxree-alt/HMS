// POST /api/crm/leads — create a new CRM lead (wraps Lead model)
// GET /api/crm/leads — list leads with search & filter
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { ok, fail, parseBody, withHandler, broadcast, logAudit, PROPERTY_ID } from "@/lib/hms";

export const dynamic = "force-dynamic";

export const GET = withHandler(async (req: NextRequest) => {
  const propertyId = await PROPERTY_ID();
  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") || "";
  const status = searchParams.get("status") || "";

  const where: any = { propertyId };
  if (status) where.status = status;
  if (search) {
    where.OR = [
      { companyName: { contains: search } },
      { contactName: { contains: search } },
      { contactEmail: { contains: search } },
    ];
  }

  const leads = await db.lead.findMany({
    where,
    include: {
      assignedTo: { select: { id: true, firstName: true, lastName: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return ok(leads);
});

export const POST = withHandler(async (req: NextRequest) => {
  const propertyId = await PROPERTY_ID();
  const body = await parseBody(req);

  if (!body.companyName || !body.contactName) {
    return fail("companyName and contactName are required", "VALIDATION", 400);
  }

  const lead = await db.lead.create({
    data: {
      propertyId,
      companyName: body.companyName,
      contactName: body.contactName,
      contactEmail: body.contactEmail || null,
      contactPhone: body.contactPhone || null,
      source: body.source || "direct",
      status: body.status || "new",
      estimatedValue: Number(body.estimatedValue || 0),
      probability: Number(body.probability || 20),
      assignedToId: body.assignedToId || null,
      notes: body.notes || null,
      lastContactedAt: new Date(),
    },
    include: {
      assignedTo: { select: { id: true, firstName: true, lastName: true } },
    },
  });

  await logAudit({
    propertyId,
    action: "CRM_LEAD_CREATED",
    entityType: "Lead",
    entityId: lead.id,
    newValue: lead,
  });

  await broadcast("crm:lead_created", lead, propertyId);

  return ok(lead);
});
