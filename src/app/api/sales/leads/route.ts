// /api/sales/leads — list + create + update leads (Prisma)
import { db } from "@/lib/db";
import { ok, fail, parseBody, withHandler, PROPERTY_ID } from "@/lib/hms";

export const dynamic = "force-dynamic";

// ─── Lazy seed: ensure demo leads exist ──────────────────────────────────────
let _salesSeeded = false;
async function ensureSalesSeed(propertyId: string) {
  if (_salesSeeded) return;
  const count = await db.lead.count({ where: { propertyId } });
  if (count > 0) { _salesSeeded = true; return; }

  const salesUsers = await db.user.findMany({
    where: { propertyId, role: { in: ["sales_mgr", "sales_exec"] } },
  });
  const salesMgr = salesUsers.find((u) => u.role === "sales_mgr");
  const salesExec = salesUsers.find((u) => u.role === "sales_exec");
  const a1 = salesMgr?.id ?? null;
  const a2 = salesExec?.id ?? null;

  const leads = [
    { propertyId, companyName: "Tata Group", contactName: "Rajesh Sharma", contactEmail: "rajesh.sharma@tata.com", contactPhone: "+91 98200 12345", source: "referral", status: "qualified", estimatedValue: 4500000, probability: 60, assignedToId: a1, lastContactedAt: new Date("2026-06-28T10:30:00Z"), notes: "Corporate retreat for 200 pax, Q3 2026" },
    { propertyId, companyName: "Infosys Ltd", contactName: "Anita Desai", contactEmail: "anita.d@infosys.com", contactPhone: "+91 99001 56789", source: "linkedin", status: "proposal", estimatedValue: 3200000, probability: 75, assignedToId: a2, lastContactedAt: new Date("2026-06-30T14:00:00Z"), notes: "Annual conference, 3-day event" },
    { propertyId, companyName: "Reliance Industries", contactName: "Mukesh Patel", contactEmail: "m.patel@reliance.com", contactPhone: "+91 98765 43210", source: "direct", status: "new", estimatedValue: 8500000, probability: 15, assignedToId: a1, lastContactedAt: new Date("2026-07-01T09:00:00Z"), notes: "Exploring luxury corporate stay options" },
    { propertyId, companyName: "Wipro Technologies", contactName: "Kavitha Reddy", contactEmail: "kavitha.r@wipro.com", contactPhone: "+91 99876 11111", source: "website", status: "contacted", estimatedValue: 1800000, probability: 30, assignedToId: a2, lastContactedAt: new Date("2026-06-25T16:30:00Z"), notes: "IT summit for 150 delegates" },
    { propertyId, companyName: "Mahindra & Mahindra", contactName: "Sunil Kulkarni", contactEmail: "sunil.k@mahindra.com", contactPhone: "+91 98123 45678", source: "referral", status: "negotiation", estimatedValue: 5600000, probability: 85, assignedToId: a2, lastContactedAt: new Date("2026-07-01T11:00:00Z"), notes: "Board meeting + gala dinner, Dec 2026" },
    { propertyId, companyName: "ICICI Bank", contactName: "Deepak Joshi", contactEmail: "deepak.j@icici.com", contactPhone: "+91 99234 56789", source: "referral", status: "won", estimatedValue: 2200000, probability: 100, assignedToId: a1, lastContactedAt: new Date("2026-06-20T10:00:00Z"), notes: "Training program booked for Aug 2026" },
    { propertyId, companyName: "HDFC Life", contactName: "Ritu Kapoor", contactEmail: "ritu.k@hdfclife.com", contactPhone: "+91 98345 67890", source: "cold_call", status: "lost", estimatedValue: 3900000, probability: 0, assignedToId: a2, lastContactedAt: new Date("2026-06-15T13:00:00Z"), notes: "Went with competitor - pricing issue" },
    { propertyId, companyName: "Bajaj Finserv", contactName: "Nitin Bajaj", contactEmail: "nitin.b@bajaj.com", contactPhone: "+91 99456 78901", source: "ota_partner", status: "qualified", estimatedValue: 2800000, probability: 55, assignedToId: a2, lastContactedAt: new Date("2026-06-29T15:00:00Z"), notes: "Annual offsite, 120 rooms needed" },
    { propertyId, companyName: "Larsen & Toubro", contactName: "Arun Subramaniam", contactEmail: "arun.s@lnt.com", contactPhone: "+91 99567 89012", source: "linkedin", status: "contacted", estimatedValue: 6100000, probability: 25, assignedToId: a1, lastContactedAt: new Date("2026-06-27T09:30:00Z"), notes: "Engineering summit, 250 attendees" },
    { propertyId, companyName: "Adani Group", contactName: "Priti Adani", contactEmail: "priti.a@adani.com", contactPhone: "+91 99678 90123", source: "direct", status: "new", estimatedValue: 12000000, probability: 10, assignedToId: a2, lastContactedAt: new Date("2026-07-01T08:00:00Z"), notes: "VIP guest program inquiry" },
    { propertyId, companyName: "Godrej Industries", contactName: "Nisaba Godrej", contactEmail: "nisaba@godrej.com", contactPhone: "+91 99789 01234", source: "referral", status: "proposal", estimatedValue: 3400000, probability: 70, assignedToId: a2, lastContactedAt: new Date("2026-06-30T12:00:00Z"), notes: "Leadership retreat, 50 pax" },
    { propertyId, companyName: "Hindustan Unilever", contactName: "Sanjiv Mehta", contactEmail: "sanjiv.m@hul.com", contactPhone: "+91 99890 12345", source: "website", status: "negotiation", estimatedValue: 7800000, probability: 80, assignedToId: a1, lastContactedAt: new Date("2026-07-01T10:00:00Z"), notes: "Global strategy meeting, block of 80 rooms" },
  ];
  const created: { id: string }[] = [];
  for (const ld of leads) {
    const lead = await db.lead.create({ data: ld });
    created.push({ id: lead.id });
  }

  // Also seed deals
  if (created.length >= 6) {
    const deals = [
      { propertyId, title: "Tata Corporate Retreat", leadId: created[0].id, value: 4500000, stage: "qualification", probability: 60, closeDate: new Date("2026-08-15"), assignedToId: a1, notes: "Corporate retreat package" },
      { propertyId, title: "Infosys Annual Conference", leadId: created[1].id, value: 3200000, stage: "proposal", probability: 75, closeDate: new Date("2026-07-30"), assignedToId: a2, notes: "3-day conference" },
      { propertyId, title: "Mahindra Board Meeting", leadId: created[4].id, value: 5600000, stage: "negotiation", probability: 85, closeDate: new Date("2026-07-20"), assignedToId: a2, notes: "Board meeting + gala" },
      { propertyId, title: "ICICI Training Program", leadId: created[5].id, value: 2200000, stage: "closed_won", probability: 100, closeDate: new Date("2026-06-20"), assignedToId: a1, notes: "Training program confirmed" },
      { propertyId, title: "Bajaj Annual Offsite", leadId: created[7].id, value: 2800000, stage: "qualification", probability: 55, closeDate: new Date("2026-09-01"), assignedToId: a2, notes: "Annual offsite planning" },
      { propertyId, title: "L&T Engineering Summit", leadId: created[8].id, value: 6100000, stage: "prospecting", probability: 25, closeDate: new Date("2026-10-15"), assignedToId: a1, notes: "Engineering summit proposal" },
      { propertyId, title: "Godrej Leadership Retreat", leadId: created[10].id, value: 3400000, stage: "proposal", probability: 70, closeDate: new Date("2026-08-20"), assignedToId: a2, notes: "Leadership retreat" },
      { propertyId, title: "HUL Global Strategy Meet", leadId: created[11].id, value: 7800000, stage: "negotiation", probability: 80, closeDate: new Date("2026-07-25"), assignedToId: a1, notes: "Strategy meeting booking" },
    ];
    for (const dd of deals) {
      await db.deal.create({ data: dd });
    }
  }
  _salesSeeded = true;
}

export const GET = withHandler(async (req: Request) => {
  const propertyId = await PROPERTY_ID();
  await ensureSalesSeed(propertyId);

  const url = new URL(req.url);
  const status = url.searchParams.get("status") || "";
  const source = url.searchParams.get("source") || "";
  const search = url.searchParams.get("search") || "";

  const where: any = { propertyId };
  if (status) where.status = status;
  if (source) where.source = source;
  if (search) {
    const q = search.toLowerCase();
    where.OR = [
      { companyName: { contains: q } },
      { contactName: { contains: q } },
      { contactEmail: { contains: q } },
    ];
  }

  const leads = await db.lead.findMany({
    where,
    include: {
      assignedTo: { select: { id: true, firstName: true, lastName: true } },
    },
    orderBy: [{ createdAt: "desc" }],
  });

  return ok(leads);
});

export const POST = withHandler(async (req: Request) => {
  const propertyId = await PROPERTY_ID();
  const body = await parseBody(req);
  const {
    companyName, contactName, contactEmail, contactPhone,
    source = "direct", status = "new",
    estimatedValue = 0, probability = 10,
    assignedToId, notes = "",
  } = body;

  if (!companyName || !contactName) return fail("Company and contact are required", "VALIDATION");

  const lead = await db.lead.create({
    data: {
      propertyId,
      companyName,
      contactName,
      contactEmail: contactEmail || null,
      contactPhone: contactPhone || null,
      source,
      status,
      estimatedValue: Number(estimatedValue),
      probability: Number(probability),
      assignedToId: assignedToId || null,
      notes: notes || null,
      lastContactedAt: new Date(),
    },
    include: {
      assignedTo: { select: { id: true, firstName: true, lastName: true } },
    },
  });

  return ok(lead);
});

export const PUT = withHandler(async (req: Request) => {
  const body = await parseBody(req);
  const { id, status, ...updates } = body;
  if (!id) return fail("Lead ID required", "VALIDATION");

  const existing = await db.lead.findUnique({ where: { id } });
  if (!existing) return fail("Lead not found", "NOT_FOUND", 404);

  const updateData: any = {};
  if (status) {
    updateData.status = status;
    if (status === "won") updateData.probability = 100;
    if (status === "lost") updateData.probability = 0;
    updateData.lastContactedAt = new Date();
  }
  // Allow updating other fields
  if (updates.companyName !== undefined) updateData.companyName = updates.companyName;
  if (updates.contactName !== undefined) updateData.contactName = updates.contactName;
  if (updates.contactEmail !== undefined) updateData.contactEmail = updates.contactEmail || null;
  if (updates.contactPhone !== undefined) updateData.contactPhone = updates.contactPhone || null;
  if (updates.source !== undefined) updateData.source = updates.source;
  if (updates.estimatedValue !== undefined) updateData.estimatedValue = Number(updates.estimatedValue);
  if (updates.probability !== undefined) updateData.probability = Number(updates.probability);
  if (updates.assignedToId !== undefined) updateData.assignedToId = updates.assignedToId || null;
  if (updates.notes !== undefined) updateData.notes = updates.notes || null;

  const lead = await db.lead.update({
    where: { id },
    data: updateData,
    include: {
      assignedTo: { select: { id: true, firstName: true, lastName: true } },
    },
  });

  return ok(lead);
});
