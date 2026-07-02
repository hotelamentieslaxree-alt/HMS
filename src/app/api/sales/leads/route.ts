// /api/sales/leads — list + create leads (mock data)
import { ok, fail, parseBody, withHandler } from "@/lib/hms";

export const dynamic = "force-dynamic";

// ─── Mock Lead Data ──────────────────────────────────────────────────────────
const MOCK_LEADS = [
  { id: "SL-001", company: "Tata Group", contact: "Rajesh Sharma", email: "rajesh.sharma@tata.com", phone: "+91 98200 12345", source: "referral", status: "qualified", estimatedValue: 4500000, probability: 60, assignedTo: "Priya Nair", lastContacted: "2026-06-28T10:30:00Z", notes: "Corporate retreat for 200 pax, Q3 2026" },
  { id: "SL-002", company: "Infosys Ltd", contact: "Anita Desai", email: "anita.d@infosys.com", phone: "+91 99001 56789", source: "linkedin", status: "proposal", estimatedValue: 3200000, probability: 75, assignedTo: "Vikram Singh", lastContacted: "2026-06-30T14:00:00Z", notes: "Annual conference, 3-day event" },
  { id: "SL-003", company: "Reliance Industries", contact: "Mukesh Patel", email: "m.patel@reliance.com", phone: "+91 98765 43210", source: "direct", status: "new", estimatedValue: 8500000, probability: 15, assignedTo: "Priya Nair", lastContacted: "2026-07-01T09:00:00Z", notes: "Exploring luxury corporate stay options" },
  { id: "SL-004", company: "Wipro Technologies", contact: "Kavitha Reddy", email: "kavitha.r@wipro.com", phone: "+91 99876 11111", source: "website", status: "contacted", estimatedValue: 1800000, probability: 30, assignedTo: "Arjun Mehta", lastContacted: "2026-06-25T16:30:00Z", notes: "IT summit for 150 delegates" },
  { id: "SL-005", company: "Mahindra & Mahindra", contact: "Sunil Kulkarni", email: "sunil.k@mahindra.com", phone: "+91 98123 45678", source: "expo", status: "negotiation", estimatedValue: 5600000, probability: 85, assignedTo: "Vikram Singh", lastContacted: "2026-07-01T11:00:00Z", notes: "Board meeting + gala dinner, Dec 2026" },
  { id: "SL-006", company: "ICICI Bank", contact: "Deepak Joshi", email: "deepak.j@icici.com", phone: "+91 99234 56789", source: "referral", status: "won", estimatedValue: 2200000, probability: 100, assignedTo: "Priya Nair", lastContacted: "2026-06-20T10:00:00Z", notes: "Training program booked for Aug 2026" },
  { id: "SL-007", company: "HDFC Life", contact: "Ritu Kapoor", email: "ritu.k@hdfclife.com", phone: "+91 98345 67890", source: "cold_call", status: "lost", estimatedValue: 3900000, probability: 0, assignedTo: "Arjun Mehta", lastContacted: "2026-06-15T13:00:00Z", notes: "Went with competitor - pricing issue" },
  { id: "SL-008", company: "Bajaj Finserv", contact: "Nitin Bajaj", email: "nitin.b@bajaj.com", phone: "+91 99456 78901", source: "ota_partner", status: "qualified", estimatedValue: 2800000, probability: 55, assignedTo: "Vikram Singh", lastContacted: "2026-06-29T15:00:00Z", notes: "Annual offsite, 120 rooms needed" },
  { id: "SL-009", company: "Larsen & Toubro", contact: "Arun Subramaniam", email: "arun.s@lnt.com", phone: "+91 99567 89012", source: "linkedin", status: "contacted", estimatedValue: 6100000, probability: 25, assignedTo: "Priya Nair", lastContacted: "2026-06-27T09:30:00Z", notes: "Engineering summit, 250 attendees" },
  { id: "SL-010", company: "Adani Group", contact: "Priti Adani", email: "priti.a@adani.com", phone: "+91 99678 90123", source: "direct", status: "new", estimatedValue: 12000000, probability: 10, assignedTo: "Arjun Mehta", lastContacted: "2026-07-01T08:00:00Z", notes: "VIP guest program inquiry" },
  { id: "SL-011", company: "Godrej Industries", contact: "Nisaba Godrej", email: "nisaba@godrej.com", phone: "+91 99789 01234", source: "referral", status: "proposal", estimatedValue: 3400000, probability: 70, assignedTo: "Vikram Singh", lastContacted: "2026-06-30T12:00:00Z", notes: "Leadership retreat, 50 pax" },
  { id: "SL-012", company: "Hindustan Unilever", contact: "Sanjiv Mehta", email: "sanjiv.m@hul.com", phone: "+91 99890 12345", source: "website", status: "negotiation", estimatedValue: 7800000, probability: 80, assignedTo: "Priya Nair", lastContacted: "2026-07-01T10:00:00Z", notes: "Global strategy meeting, block of 80 rooms" },
  { id: "SL-013", company: "Kotak Mahindra Bank", contact: "Uday Kotak", email: "uday.k@kotak.com", phone: "+91 99901 23456", source: "expo", status: "contacted", estimatedValue: 4200000, probability: 35, assignedTo: "Arjun Mehta", lastContacted: "2026-06-26T11:00:00Z", notes: "Investor relations event" },
  { id: "SL-014", company: "Asian Paints", contact: "Amit Syngle", email: "amit.s@asianpaints.com", phone: "+91 99012 34567", source: "cold_call", status: "new", estimatedValue: 1500000, probability: 10, assignedTo: "Vikram Singh", lastContacted: "2026-07-01T14:00:00Z", notes: "Creative workshop inquiry" },
  { id: "SL-015", company: "Marriott International", contact: "Anthony Capuano", email: "anthony.c@marriott.com", phone: "+1 301 555 0100", source: "ota_partner", status: "qualified", estimatedValue: 9500000, probability: 50, assignedTo: "Priya Nair", lastContacted: "2026-06-28T08:00:00Z", notes: "Partnership discussion for cross-referral program" },
];

export const GET = withHandler(async (req: Request) => {
  const url = new URL(req.url);
  const status = url.searchParams.get("status") || "";
  const source = url.searchParams.get("source") || "";
  const assignedTo = url.searchParams.get("assignedTo") || "";
  const search = url.searchParams.get("search") || "";

  let filtered = [...MOCK_LEADS];

  if (status) filtered = filtered.filter((l) => l.status === status);
  if (source) filtered = filtered.filter((l) => l.source === source);
  if (assignedTo) filtered = filtered.filter((l) => l.assignedTo === assignedTo);
  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter(
      (l) =>
        l.company.toLowerCase().includes(q) ||
        l.contact.toLowerCase().includes(q) ||
        l.email.toLowerCase().includes(q)
    );
  }

  return ok(filtered);
});

export const POST = withHandler(async (req: Request) => {
  const body = await parseBody(req);
  const { company, contact, email, phone, source = "direct", status = "new", estimatedValue = 0, probability = 10, assignedTo = "", notes = "" } = body;

  if (!company || !contact) return fail("Company and contact are required", "VALIDATION");

  const newLead = {
    id: `SL-${String(MOCK_LEADS.length + 1).padStart(3, "0")}`,
    company,
    contact,
    email: email || "",
    phone: phone || "",
    source,
    status,
    estimatedValue: Number(estimatedValue),
    probability: Number(probability),
    assignedTo: assignedTo || "Unassigned",
    lastContacted: new Date().toISOString(),
    notes,
  };

  MOCK_LEADS.push(newLead);
  return ok(newLead);
});

export const PUT = withHandler(async (req: Request) => {
  const body = await parseBody(req);
  const { id, status, ...updates } = body;
  if (!id) return fail("Lead ID required", "VALIDATION");

  const idx = MOCK_LEADS.findIndex((l) => l.id === id);
  if (idx === -1) return fail("Lead not found", "NOT_FOUND", 404);

  MOCK_LEADS[idx] = { ...MOCK_LEADS[idx], ...updates, status: status ?? MOCK_LEADS[idx].status };
  if (status) {
    // Auto-set probability on status change
    if (status === "won") MOCK_LEADS[idx].probability = 100;
    if (status === "lost") MOCK_LEADS[idx].probability = 0;
    MOCK_LEADS[idx].lastContacted = new Date().toISOString();
  }

  return ok(MOCK_LEADS[idx]);
});
