// /api/sales/deals — list + create deals (mock data)
import { ok, fail, parseBody, withHandler } from "@/lib/hms";

export const dynamic = "force-dynamic";

// ─── Mock Deal Data ──────────────────────────────────────────────────────────
const MOCK_DEALS = [
  { id: "SD-001", title: "Tata Corporate Retreat", leadId: "SL-001", leadCompany: "Tata Group", value: 4500000, stage: "qualification", probability: 60, closeDate: "2026-08-15T00:00:00Z", assignedTo: "Priya Nair", createdAt: "2026-06-10T09:00:00Z" },
  { id: "SD-002", title: "Infosys Annual Conference", leadId: "SL-002", leadCompany: "Infosys Ltd", value: 3200000, stage: "proposal", probability: 75, closeDate: "2026-07-30T00:00:00Z", assignedTo: "Vikram Singh", createdAt: "2026-05-20T10:00:00Z" },
  { id: "SD-003", title: "Mahindra Board Meeting", leadId: "SL-005", leadCompany: "Mahindra & Mahindra", value: 5600000, stage: "negotiation", probability: 85, closeDate: "2026-07-20T00:00:00Z", assignedTo: "Vikram Singh", createdAt: "2026-04-15T08:00:00Z" },
  { id: "SD-004", title: "ICICI Training Program", leadId: "SL-006", leadCompany: "ICICI Bank", value: 2200000, stage: "closed_won", probability: 100, closeDate: "2026-06-20T00:00:00Z", assignedTo: "Priya Nair", createdAt: "2026-03-01T11:00:00Z" },
  { id: "SD-005", title: "HDFC Life Event", leadId: "SL-007", leadCompany: "HDFC Life", value: 3900000, stage: "closed_lost", probability: 0, closeDate: "2026-06-15T00:00:00Z", assignedTo: "Arjun Mehta", createdAt: "2026-04-10T09:00:00Z" },
  { id: "SD-006", title: "Bajaj Annual Offsite", leadId: "SL-008", leadCompany: "Bajaj Finserv", value: 2800000, stage: "qualification", probability: 55, closeDate: "2026-09-01T00:00:00Z", assignedTo: "Vikram Singh", createdAt: "2026-06-05T14:00:00Z" },
  { id: "SD-007", title: "L&T Engineering Summit", leadId: "SL-009", leadCompany: "Larsen & Toubro", value: 6100000, stage: "prospecting", probability: 25, closeDate: "2026-10-15T00:00:00Z", assignedTo: "Priya Nair", createdAt: "2026-06-20T08:00:00Z" },
  { id: "SD-008", title: "Godrej Leadership Retreat", leadId: "SL-011", leadCompany: "Godrej Industries", value: 3400000, stage: "proposal", probability: 70, closeDate: "2026-08-20T00:00:00Z", assignedTo: "Vikram Singh", createdAt: "2026-05-25T10:00:00Z" },
  { id: "SD-009", title: "HUL Global Strategy Meet", leadId: "SL-012", leadCompany: "Hindustan Unilever", value: 7800000, stage: "negotiation", probability: 80, closeDate: "2026-07-25T00:00:00Z", assignedTo: "Priya Nair", createdAt: "2026-04-20T09:00:00Z" },
  { id: "SD-010", title: "Marriott Partnership", leadId: "SL-015", leadCompany: "Marriott International", value: 9500000, stage: "qualification", probability: 50, closeDate: "2026-11-01T00:00:00Z", assignedTo: "Priya Nair", createdAt: "2026-06-15T08:00:00Z" },
  { id: "SD-011", title: "Adani VIP Program", leadId: "SL-010", leadCompany: "Adani Group", value: 12000000, stage: "prospecting", probability: 10, closeDate: "2026-12-31T00:00:00Z", assignedTo: "Arjun Mehta", createdAt: "2026-07-01T08:00:00Z" },
  { id: "SD-012", title: "Kotak Investor Relations Event", leadId: "SL-013", leadCompany: "Kotak Mahindra Bank", value: 4200000, stage: "prospecting", probability: 35, closeDate: "2026-09-30T00:00:00Z", assignedTo: "Arjun Mehta", createdAt: "2026-06-12T11:00:00Z" },
];

export const GET = withHandler(async (req: Request) => {
  const url = new URL(req.url);
  const stage = url.searchParams.get("stage") || "";

  let filtered = [...MOCK_DEALS];
  if (stage) filtered = filtered.filter((d) => d.stage === stage);

  return ok(filtered);
});

export const POST = withHandler(async (req: Request) => {
  const body = await parseBody(req);
  const { title, leadId, leadCompany, value = 0, stage = "prospecting", probability = 10, closeDate, assignedTo = "" } = body;

  if (!title) return fail("Deal title is required", "VALIDATION");

  const newDeal = {
    id: `SD-${String(MOCK_DEALS.length + 1).padStart(3, "0")}`,
    title,
    leadId: leadId || "",
    leadCompany: leadCompany || "",
    value: Number(value),
    stage,
    probability: Number(probability),
    closeDate: closeDate || new Date(Date.now() + 30 * 86400000).toISOString(),
    assignedTo: assignedTo || "Unassigned",
    createdAt: new Date().toISOString(),
  };

  MOCK_DEALS.push(newDeal);
  return ok(newDeal);
});

export const PUT = withHandler(async (req: Request) => {
  const body = await parseBody(req);
  const { id, stage, ...updates } = body;
  if (!id) return fail("Deal ID required", "VALIDATION");

  const idx = MOCK_DEALS.findIndex((d) => d.id === id);
  if (idx === -1) return fail("Deal not found", "NOT_FOUND", 404);

  MOCK_DEALS[idx] = { ...MOCK_DEALS[idx], ...updates, stage: stage ?? MOCK_DEALS[idx].stage };
  if (stage === "closed_won") MOCK_DEALS[idx].probability = 100;
  if (stage === "closed_lost") MOCK_DEALS[idx].probability = 0;

  return ok(MOCK_DEALS[idx]);
});
