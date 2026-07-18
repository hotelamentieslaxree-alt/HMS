// ARIA HMS — CRM Module (6 tabs: Guest CRM, Lead CRM, Travel Agents, Corporate, Membership, Loyalty)
"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/lib/store";
import { apiPost } from "@/lib/api";
import { KpiCard, fmtINR, fmtDate } from "../shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Users, UserPlus, Plane, Building2, Crown, Gift, Star,
  Plus, Search, Heart, Phone, Mail, MapPin, TrendingUp,
  ArrowRight, Award, Gem, Target, Handshake,
} from "lucide-react";

// ─── MOCK DATA ──────────────────────────────────────────────────────

const MOCK_GUEST_PROFILES = [
  { id: "G-1001", name: "Rajesh Sharma", email: "rajesh.s@email.com", phone: "+91 98765 00111", city: "Mumbai", visits: 12, totalSpent: 485000, lastVisit: "2025-01-14", preferences: "King bed, High floor, Non-smoking", vip: true },
  { id: "G-1002", name: "Priya Nair", email: "priya.n@email.com", phone: "+91 98765 00222", city: "Bangalore", visits: 8, totalSpent: 276000, lastVisit: "2025-01-12", preferences: "Twin bed, Pool view", vip: false },
  { id: "G-1003", name: "Arun Kumar", email: "arun.k@email.com", phone: "+91 98765 00333", city: "Delhi", visits: 5, totalSpent: 192000, lastVisit: "2025-01-10", preferences: "Ground floor, Extra pillows", vip: false },
  { id: "G-1004", name: "Meera Patel", email: "meera.p@email.com", phone: "+91 98765 00444", city: "Ahmedabad", visits: 15, totalSpent: 620000, lastVisit: "2025-01-15", preferences: "Suite, Spa access, Vegetarian", vip: true },
  { id: "G-1005", name: "Suresh Menon", email: "suresh.m@email.com", phone: "+91 98765 00555", city: "Chennai", visits: 3, totalSpent: 89000, lastVisit: "2025-01-08", preferences: "Quiet room, Business center", vip: false },
];

const MOCK_LEADS = [
  { id: "L-201", company: "TCS Ltd", contact: "Vikram Singh", value: 450000, stage: "proposal", probability: 70, source: "Referral", nextAction: "Send proposal by Jan 20" },
  { id: "L-202", company: "Infosys", contact: "Anita Desai", value: 380000, stage: "negotiation", probability: 85, source: "LinkedIn", nextAction: "Follow-up call Jan 18" },
  { id: "L-203", company: "Wipro", contact: "Ravi Prasad", value: 220000, stage: "qualified", probability: 50, source: "Website", nextAction: "Schedule site visit" },
  { id: "L-204", company: "HCL Tech", contact: "Deepa Joshi", value: 310000, stage: "won", probability: 100, source: "Trade Show", nextAction: "Contract signed" },
  { id: "L-205", company: "Tech Mahindra", contact: "Karan Rao", value: 180000, stage: "lead", probability: 25, source: "Cold Call", nextAction: "Initial meeting" },
];

const MOCK_TRAVEL_AGENTS = [
  { id: "TA-01", name: "Cox & Kings", contact: "Sanjay Gupta", commission: 10, bookings: 45, revenue: 1850000, rating: 4.5 },
  { id: "TA-02", name: "Thomas Cook India", contact: "Neha Sharma", commission: 12, bookings: 32, revenue: 1240000, rating: 4.2 },
  { id: "TA-03", name: "SOTC Travel", contact: "Rahul Verma", commission: 8, bookings: 28, revenue: 980000, rating: 3.9 },
  { id: "TA-04", name: "Kuoni Travel", contact: "Meena Iyer", commission: 10, bookings: 18, revenue: 720000, rating: 4.7 },
];

const MOCK_CORPORATES = [
  { id: "CP-01", name: "Tata Consultancy Services", code: "TCS", rooms: 150, rate: 3500, contract: "2025-03-31", status: "active" },
  { id: "CP-02", name: "Infosys Limited", code: "INFY", rooms: 85, rate: 3800, contract: "2025-06-30", status: "active" },
  { id: "CP-03", name: "Wipro Technologies", code: "WIPRO", rooms: 60, rate: 3200, contract: "2025-01-15", status: "expiring" },
  { id: "CP-04", name: "HCL Technologies", code: "HCL", rooms: 45, rate: 3600, contract: "2025-09-30", status: "active" },
  { id: "CP-05", name: "Reliance Industries", code: "RIL", rooms: 30, rate: 4500, contract: "2024-12-31", status: "expired" },
];

const MOCK_MEMBERSHIPS = [
  { id: "MB-01", tier: "Platinum", members: 24, benefits: "Free upgrade, Late checkout, Spa access", fee: 25000, color: "#7C3AED" },
  { id: "MB-02", tier: "Gold", members: 68, benefits: "Room upgrade, Early check-in, Lounge access", fee: 15000, color: "#C9952A" },
  { id: "MB-03", tier: "Silver", members: 145, benefits: "Welcome drink, 5% F&B discount", fee: 5000, color: "#6B7280" },
  { id: "MB-04", tier: "Classic", members: 320, benefits: "Member rate, Newsletter", fee: 0, color: "#0369A1" },
];

const MOCK_LOYALTY = [
  { id: "LY-01", member: "Rajesh Sharma", tier: "Platinum", points: 48500, redeemed: 12000, earned: "2025-01-14", nextReward: "Free night at 50,000 pts" },
  { id: "LY-02", member: "Meera Patel", tier: "Platinum", points: 62000, redeemed: 25000, earned: "2025-01-15", nextReward: "Spa package at 65,000 pts" },
  { id: "LY-03", member: "Priya Nair", tier: "Gold", points: 27600, redeemed: 5000, earned: "2025-01-12", nextReward: "Room upgrade at 30,000 pts" },
  { id: "LY-04", member: "Suresh Menon", tier: "Silver", points: 8900, redeemed: 0, earned: "2025-01-08", nextReward: "F&B voucher at 10,000 pts" },
  { id: "LY-05", member: "Arun Kumar", tier: "Gold", points: 19200, redeemed: 8000, earned: "2025-01-10", nextReward: "Late checkout at 20,000 pts" },
];

// ─── STATUS META ─────────────────────────────────────────────────────

const STAGE_META: Record<string, { label: string; cls: string }> = {
  lead: { label: "Lead", cls: "bg-[#E5E7EB] text-[#374151] border-[#6B7280]" },
  qualified: { label: "Qualified", cls: "bg-[#DBEAFE] text-[#1B3A6B] border-[#0369A1]" },
  proposal: { label: "Proposal", cls: "bg-[#FEF3C7] text-[#78350F] border-[#D97706]" },
  negotiation: { label: "Negotiation", cls: "bg-[#F3E8FF] text-[#4C1D95] border-[#7C3AED]" },
  won: { label: "Won", cls: "bg-[#DCFCE7] text-[#14532D] border-[#16A34A]" },
  lost: { label: "Lost", cls: "bg-[#FFE4E6] text-[#881337] border-[#DC2626]" },
};

const CORP_STATUS_META: Record<string, { label: string; cls: string }> = {
  active: { label: "Active", cls: "bg-[#DCFCE7] text-[#14532D] border-[#16A34A]" },
  expiring: { label: "Expiring", cls: "bg-[#FEF3C7] text-[#78350F] border-[#D97706]" },
  expired: { label: "Expired", cls: "bg-[#FFE4E6] text-[#881337] border-[#DC2626]" },
};

// ─── MAIN COMPONENT ──────────────────────────────────────────────────

export function CrmModule() {
  const { refreshTick } = useAppStore();
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("guest-crm");

  // Dialog states
  const [guestDialogOpen, setGuestDialogOpen] = useState(false);
  const [leadDialogOpen, setLeadDialogOpen] = useState(false);
  const [corporateDialogOpen, setCorporateDialogOpen] = useState(false);
  const [leadDetailDialogOpen, setLeadDetailDialogOpen] = useState(false);
  const [membersDialogOpen, setMembersDialogOpen] = useState(false);
  const [selectedTier, setSelectedTier] = useState("");
  const [selectedLead, setSelectedLead] = useState<typeof MOCK_LEADS[0] | null>(null);

  // Guest form state
  const [guestForm, setGuestForm] = useState({ firstName: "", lastName: "", email: "", phone: "", city: "", preferences: "", vipStatus: false });

  // Lead form state
  const [leadForm, setLeadForm] = useState({ companyName: "", contactName: "", contactEmail: "", contactPhone: "", source: "direct", estimatedValue: 0, probability: 20, notes: "" });

  // Corporate form state
  const [corporateForm, setCorporateForm] = useState({ companyName: "", code: "", contactPerson: "", email: "", phone: "", negotiatedRate: 0, roomsPerYear: 0, contractUntil: "", status: "active" });

  const [submitting, setSubmitting] = useState(false);

  const totalGuests = MOCK_GUEST_PROFILES.length;
  const vipGuests = MOCK_GUEST_PROFILES.filter((g) => g.vip).length;
  const activeLeads = MOCK_LEADS.filter((l) => l.stage !== "won" && l.stage !== "lost").length;
  const pipelineValue = MOCK_LEADS.filter((l) => l.stage !== "lost").reduce((s, l) => s + l.value, 0);

  // ─── Guest form submit ─────────────────────────────────────────
  const handleAddGuest = async () => {
    if (!guestForm.firstName.trim() || !guestForm.lastName.trim()) {
      toast.error("First name and last name are required");
      return;
    }
    setSubmitting(true);
    try {
      await apiPost("/api/crm/guests", {
        firstName: guestForm.firstName,
        lastName: guestForm.lastName,
        email: guestForm.email || undefined,
        phone: guestForm.phone || undefined,
        city: guestForm.city || undefined,
        preferences: guestForm.preferences ? { notes: guestForm.preferences } : undefined,
        vipStatus: guestForm.vipStatus,
      });
      toast.success(`Guest ${guestForm.firstName} ${guestForm.lastName} added successfully`);
      setGuestDialogOpen(false);
      setGuestForm({ firstName: "", lastName: "", email: "", phone: "", city: "", preferences: "", vipStatus: false });
    } catch (e: any) {
      toast.error(e.message || "Failed to add guest");
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Lead form submit ──────────────────────────────────────────
  const handleAddLead = async () => {
    if (!leadForm.companyName.trim() || !leadForm.contactName.trim()) {
      toast.error("Company name and contact name are required");
      return;
    }
    setSubmitting(true);
    try {
      await apiPost("/api/crm/leads", {
        companyName: leadForm.companyName,
        contactName: leadForm.contactName,
        contactEmail: leadForm.contactEmail || undefined,
        contactPhone: leadForm.contactPhone || undefined,
        source: leadForm.source,
        estimatedValue: leadForm.estimatedValue,
        probability: leadForm.probability,
        notes: leadForm.notes || undefined,
      });
      toast.success(`Lead for ${leadForm.companyName} added successfully`);
      setLeadDialogOpen(false);
      setLeadForm({ companyName: "", contactName: "", contactEmail: "", contactPhone: "", source: "direct", estimatedValue: 0, probability: 20, notes: "" });
    } catch (e: any) {
      toast.error(e.message || "Failed to add lead");
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Corporate form submit ─────────────────────────────────────
  const handleAddCorporate = async () => {
    if (!corporateForm.companyName.trim() || !corporateForm.code.trim()) {
      toast.error("Company name and code are required");
      return;
    }
    setSubmitting(true);
    try {
      await apiPost("/api/crm/corporates", {
        companyName: corporateForm.companyName,
        code: corporateForm.code,
        contactPerson: corporateForm.contactPerson || undefined,
        email: corporateForm.email || undefined,
        phone: corporateForm.phone || undefined,
        negotiatedRate: corporateForm.negotiatedRate,
        roomsPerYear: corporateForm.roomsPerYear,
        contractUntil: corporateForm.contractUntil || undefined,
        status: corporateForm.status,
      });
      toast.success(`Corporate account ${corporateForm.companyName} added successfully`);
      setCorporateDialogOpen(false);
      setCorporateForm({ companyName: "", code: "", contactPerson: "", email: "", phone: "", negotiatedRate: 0, roomsPerYear: 0, contractUntil: "", status: "active" });
    } catch (e: any) {
      toast.error(e.message || "Failed to add corporate account");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-display font-bold text-foreground flex items-center gap-2">
            <Users className="h-5 w-5 text-navy" /> CRM & Guest Relations
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">Guest profiles, sales pipeline, partnerships & loyalty</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input placeholder="Search CRM..." className="pl-8 h-9 w-48" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Button className="bg-navy hover:bg-navy-light text-white h-9" onClick={() => setGuestDialogOpen(true)}><Plus className="h-4 w-4 mr-1" /> Add Guest</Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        <KpiCard label="Guest Profiles" value={totalGuests} icon={Users} accent="navy" />
        <KpiCard label="VIP Guests" value={vipGuests} icon={Crown} accent="gold" />
        <KpiCard label="Active Leads" value={activeLeads} icon={Target} accent="info" />
        <KpiCard label="Pipeline Value" value={fmtINR(pipelineValue)} icon={TrendingUp} accent="success" />
        <KpiCard label="Loyalty Members" value={557} icon={Gem} accent="navy" />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="guest-crm" className="text-xs">Guest CRM</TabsTrigger>
          <TabsTrigger value="lead-crm" className="text-xs">Lead CRM</TabsTrigger>
          <TabsTrigger value="travel-agents" className="text-xs">Travel Agents</TabsTrigger>
          <TabsTrigger value="corporate" className="text-xs">Corporate</TabsTrigger>
          <TabsTrigger value="membership" className="text-xs">Membership</TabsTrigger>
          <TabsTrigger value="loyalty" className="text-xs">Loyalty</TabsTrigger>
        </TabsList>

        {/* ── Guest CRM Tab ── */}
        <TabsContent value="guest-crm" className="mt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {MOCK_GUEST_PROFILES.map((g) => (
              <Card key={g.id} className="hover:shadow-card-lg transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-navy/10 text-navy text-xs font-bold">{g.name.split(" ").map((n) => n[0]).join("")}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold truncate">{g.name}</p>
                        {g.vip && <span className="inline-flex items-center rounded-md border border-[#C9952A] bg-[#C9952A]/10 px-1 py-0 text-[9px] font-bold text-[#C9952A]">VIP</span>}
                      </div>
                      <p className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" />{g.city}</p>
                      <div className="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground">
                        <span className="flex items-center gap-0.5"><Heart className="h-3 w-3" />{g.visits} stays</span>
                        <span>{fmtINR(g.totalSpent)} spent</span>
                      </div>
                      <div className="mt-2 pt-2 border-t border-border">
                        <p className="text-[10px] text-muted-foreground"><span className="font-medium">Prefs:</span> {g.preferences}</p>
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2" onClick={() => window.open(`tel:${g.phone}`)}><Phone className="h-3 w-3 mr-1" />Call</Button>
                        <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2" onClick={() => window.open(`mailto:${g.email}`)}><Mail className="h-3 w-3 mr-1" />Email</Button>
                        <span className="text-[10px] text-muted-foreground ml-auto">Last: {fmtDate(g.lastVisit)}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* ── Lead CRM Tab ── */}
        <TabsContent value="lead-crm" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Target className="h-4 w-4 text-navy" /> Sales Pipeline
                </CardTitle>
                <Button size="sm" className="bg-navy hover:bg-navy-light text-white h-7 text-xs" onClick={() => setLeadDialogOpen(true)}><Plus className="h-3 w-3 mr-1" /> Add Lead</Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-[11px]">ID</TableHead>
                    <TableHead className="text-[11px]">Company</TableHead>
                    <TableHead className="text-[11px]">Contact</TableHead>
                    <TableHead className="text-[11px] text-right">Value</TableHead>
                    <TableHead className="text-[11px]">Stage</TableHead>
                    <TableHead className="text-[11px] text-right">Probability</TableHead>
                    <TableHead className="text-[11px]">Source</TableHead>
                    <TableHead className="text-[11px]">Next Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {MOCK_LEADS.map((l) => {
                    const st = STAGE_META[l.stage] ?? STAGE_META.lead;
                    return (
                      <TableRow key={l.id} className="hover:bg-muted/50 cursor-pointer" onClick={() => { setSelectedLead(l); setLeadDetailDialogOpen(true); }}>
                        <TableCell className="text-xs font-mono text-muted-foreground">{l.id}</TableCell>
                        <TableCell className="text-xs font-medium">{l.company}</TableCell>
                        <TableCell className="text-xs">{l.contact}</TableCell>
                        <TableCell className="text-xs text-right tabular-nums">{fmtINR(l.value)}</TableCell>
                        <TableCell><span className={cn("inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-medium", st.cls)}>{st.label}</span></TableCell>
                        <TableCell className="text-xs text-right tabular-nums">{l.probability}%</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{l.source}</TableCell>
                        <TableCell className="text-xs max-w-[180px] truncate">{l.nextAction}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Travel Agents Tab ── */}
        <TabsContent value="travel-agents" className="mt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {MOCK_TRAVEL_AGENTS.map((ta) => (
              <Card key={ta.id} className="hover:shadow-card-lg transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#0369A1]/10 text-[#0369A1] shrink-0">
                      <Plane className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{ta.name}</p>
                      <p className="text-xs text-muted-foreground">{ta.contact}</p>
                      <div className="grid grid-cols-3 gap-2 mt-3">
                        <div>
                          <p className="text-[10px] text-muted-foreground">Bookings</p>
                          <p className="text-sm font-bold">{ta.bookings}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-muted-foreground">Revenue</p>
                          <p className="text-xs font-bold">{fmtINR(ta.revenue)}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-muted-foreground">Commission</p>
                          <p className="text-sm font-bold">{ta.commission}%</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-3 pt-2 border-t border-border">
                        <span className="text-[10px] text-[#D97706] font-medium">★ {ta.rating}</span>
                        <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2" onClick={() => { setSelectedTier(ta.name); setMembersDialogOpen(true); }}><Handshake className="h-3 w-3 mr-1" />Manage</Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* ── Corporate Tab ── */}
        <TabsContent value="corporate" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-navy" /> Corporate Accounts
                </CardTitle>
                <Button size="sm" className="bg-navy hover:bg-navy-light text-white h-7 text-xs" onClick={() => setCorporateDialogOpen(true)}><Plus className="h-3 w-3 mr-1" /> Add Corporate</Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-[11px]">Code</TableHead>
                    <TableHead className="text-[11px]">Company</TableHead>
                    <TableHead className="text-[11px] text-right">Rooms/Yr</TableHead>
                    <TableHead className="text-[11px] text-right">Negotiated Rate</TableHead>
                    <TableHead className="text-[11px]">Contract Until</TableHead>
                    <TableHead className="text-[11px]">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {MOCK_CORPORATES.map((c) => {
                    const st = CORP_STATUS_META[c.status] ?? CORP_STATUS_META.active;
                    return (
                      <TableRow key={c.id} className="hover:bg-muted/50 cursor-pointer">
                        <TableCell className="text-xs font-mono text-muted-foreground">{c.code}</TableCell>
                        <TableCell className="text-xs font-medium">{c.name}</TableCell>
                        <TableCell className="text-xs text-right tabular-nums">{c.rooms}</TableCell>
                        <TableCell className="text-xs text-right tabular-nums">{fmtINR(c.rate)}</TableCell>
                        <TableCell className="text-xs">{fmtDate(c.contract)}</TableCell>
                        <TableCell><span className={cn("inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-medium", st.cls)}>{st.label}</span></TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Membership Tab ── */}
        <TabsContent value="membership" className="mt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {MOCK_MEMBERSHIPS.map((m) => (
              <Card key={m.id} className="hover:shadow-card-lg transition-shadow" style={{ borderTopColor: m.color, borderTopWidth: 3 }}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="h-8 w-8 flex items-center justify-center rounded-lg" style={{ backgroundColor: m.color + "20" }}>
                      {m.tier === "Platinum" ? <Gem className="h-4 w-4" style={{ color: m.color }} /> :
                       m.tier === "Gold" ? <Crown className="h-4 w-4" style={{ color: m.color }} /> :
                       m.tier === "Silver" ? <Award className="h-4 w-4" style={{ color: m.color }} /> :
                       <Star className="h-4 w-4" style={{ color: m.color }} />}
                    </div>
                    <div>
                      <p className="text-sm font-bold" style={{ color: m.color }}>{m.tier}</p>
                      <p className="text-[10px] text-muted-foreground">{m.members} members</p>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">{m.benefits}</p>
                  <div className="pt-2 border-t border-border flex items-center justify-between">
                    <span className="text-xs font-medium">{m.fee > 0 ? fmtINR(m.fee) + "/yr" : "Free"}</span>
                    <Button variant="outline" size="sm" className="h-6 text-[10px] px-2" onClick={() => { setSelectedTier(m.tier); setMembersDialogOpen(true); }}>View Members</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* ── Loyalty Tab ── */}
        <TabsContent value="loyalty" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Gift className="h-4 w-4 text-navy" /> Loyalty Points & Rewards
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-[11px]">Member</TableHead>
                    <TableHead className="text-[11px]">Tier</TableHead>
                    <TableHead className="text-[11px] text-right">Current Points</TableHead>
                    <TableHead className="text-[11px] text-right">Redeemed</TableHead>
                    <TableHead className="text-[11px]">Next Reward</TableHead>
                    <TableHead className="text-[11px]">Last Earned</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {MOCK_LOYALTY.map((ly) => (
                    <TableRow key={ly.id} className="hover:bg-muted/50 cursor-pointer">
                      <TableCell className="text-xs font-medium">{ly.member}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px]" style={{ color: ly.tier === "Platinum" ? "#7C3AED" : ly.tier === "Gold" ? "#C9952A" : "#6B7280", borderColor: ly.tier === "Platinum" ? "#7C3AED" : ly.tier === "Gold" ? "#C9952A" : "#6B7280" }}>
                          {ly.tier}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-right tabular-nums font-medium">{ly.points.toLocaleString()}</TableCell>
                      <TableCell className="text-xs text-right tabular-nums text-muted-foreground">{ly.redeemed.toLocaleString()}</TableCell>
                      <TableCell className="text-xs max-w-[180px] truncate">{ly.nextReward}</TableCell>
                      <TableCell className="text-xs">{fmtDate(ly.earned)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ── Add Guest Dialog ── */}
      <Dialog open={guestDialogOpen} onOpenChange={setGuestDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><UserPlus className="h-5 w-5 text-navy" /> Add Guest</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">First Name *</Label>
                <Input className="h-8 text-sm" value={guestForm.firstName} onChange={(e) => setGuestForm({ ...guestForm, firstName: e.target.value })} placeholder="First name" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Last Name *</Label>
                <Input className="h-8 text-sm" value={guestForm.lastName} onChange={(e) => setGuestForm({ ...guestForm, lastName: e.target.value })} placeholder="Last name" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Email</Label>
                <Input className="h-8 text-sm" type="email" value={guestForm.email} onChange={(e) => setGuestForm({ ...guestForm, email: e.target.value })} placeholder="email@example.com" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Phone</Label>
                <Input className="h-8 text-sm" value={guestForm.phone} onChange={(e) => setGuestForm({ ...guestForm, phone: e.target.value })} placeholder="+91 98765 00000" />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">City</Label>
              <Input className="h-8 text-sm" value={guestForm.city} onChange={(e) => setGuestForm({ ...guestForm, city: e.target.value })} placeholder="City" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Preferences</Label>
              <Input className="h-8 text-sm" value={guestForm.preferences} onChange={(e) => setGuestForm({ ...guestForm, preferences: e.target.value })} placeholder="e.g. King bed, High floor" />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="vipStatus" checked={guestForm.vipStatus} onChange={(e) => setGuestForm({ ...guestForm, vipStatus: e.target.checked })} className="rounded" />
              <Label htmlFor="vipStatus" className="text-xs">VIP Status</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGuestDialogOpen(false)} disabled={submitting}>Cancel</Button>
            <Button className="bg-navy hover:bg-navy-light text-white" onClick={handleAddGuest} disabled={submitting}>{submitting ? "Adding..." : "Add Guest"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Add Lead Dialog ── */}
      <Dialog open={leadDialogOpen} onOpenChange={setLeadDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Target className="h-5 w-5 text-navy" /> Add Lead</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Company Name *</Label>
              <Input className="h-8 text-sm" value={leadForm.companyName} onChange={(e) => setLeadForm({ ...leadForm, companyName: e.target.value })} placeholder="Company name" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Contact Name *</Label>
                <Input className="h-8 text-sm" value={leadForm.contactName} onChange={(e) => setLeadForm({ ...leadForm, contactName: e.target.value })} placeholder="Contact person" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Source</Label>
                <Input className="h-8 text-sm" value={leadForm.source} onChange={(e) => setLeadForm({ ...leadForm, source: e.target.value })} placeholder="direct, referral, etc." />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Email</Label>
                <Input className="h-8 text-sm" type="email" value={leadForm.contactEmail} onChange={(e) => setLeadForm({ ...leadForm, contactEmail: e.target.value })} placeholder="email@company.com" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Phone</Label>
                <Input className="h-8 text-sm" value={leadForm.contactPhone} onChange={(e) => setLeadForm({ ...leadForm, contactPhone: e.target.value })} placeholder="+91 98765 00000" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Estimated Value (₹)</Label>
                <Input className="h-8 text-sm" type="number" value={leadForm.estimatedValue} onChange={(e) => setLeadForm({ ...leadForm, estimatedValue: Number(e.target.value) })} placeholder="0" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Probability (%)</Label>
                <Input className="h-8 text-sm" type="number" min={0} max={100} value={leadForm.probability} onChange={(e) => setLeadForm({ ...leadForm, probability: Number(e.target.value) })} placeholder="20" />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Notes</Label>
              <Input className="h-8 text-sm" value={leadForm.notes} onChange={(e) => setLeadForm({ ...leadForm, notes: e.target.value })} placeholder="Additional notes" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLeadDialogOpen(false)} disabled={submitting}>Cancel</Button>
            <Button className="bg-navy hover:bg-navy-light text-white" onClick={handleAddLead} disabled={submitting}>{submitting ? "Adding..." : "Add Lead"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Lead Detail Dialog ── */}
      <Dialog open={leadDetailDialogOpen} onOpenChange={setLeadDetailDialogOpen}>
        <DialogContent className="max-w-md">
          {selectedLead && (() => {
            const st = STAGE_META[selectedLead.stage] ?? STAGE_META.lead;
            return (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2"><Target className="h-5 w-5 text-navy" /> Lead: {selectedLead.company}</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-[10px] text-muted-foreground">Contact</p>
                      <p className="text-sm font-medium">{selectedLead.contact}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground">Value</p>
                      <p className="text-sm font-bold">{fmtINR(selectedLead.value)}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <p className="text-[10px] text-muted-foreground">Stage</p>
                      <span className={cn("inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-medium", st.cls)}>{st.label}</span>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground">Probability</p>
                      <p className="text-sm font-medium">{selectedLead.probability}%</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground">Source</p>
                      <p className="text-sm">{selectedLead.source}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground">Next Action</p>
                    <p className="text-sm">{selectedLead.nextAction}</p>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setLeadDetailDialogOpen(false)}>Close</Button>
                </DialogFooter>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* ── Add Corporate Dialog ── */}
      <Dialog open={corporateDialogOpen} onOpenChange={setCorporateDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Building2 className="h-5 w-5 text-navy" /> Add Corporate Account</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Company Name *</Label>
                <Input className="h-8 text-sm" value={corporateForm.companyName} onChange={(e) => setCorporateForm({ ...corporateForm, companyName: e.target.value })} placeholder="Company name" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Code *</Label>
                <Input className="h-8 text-sm" value={corporateForm.code} onChange={(e) => setCorporateForm({ ...corporateForm, code: e.target.value.toUpperCase() })} placeholder="e.g. TCS" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Contact Person</Label>
                <Input className="h-8 text-sm" value={corporateForm.contactPerson} onChange={(e) => setCorporateForm({ ...corporateForm, contactPerson: e.target.value })} placeholder="Contact name" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Email</Label>
                <Input className="h-8 text-sm" type="email" value={corporateForm.email} onChange={(e) => setCorporateForm({ ...corporateForm, email: e.target.value })} placeholder="email@company.com" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Phone</Label>
                <Input className="h-8 text-sm" value={corporateForm.phone} onChange={(e) => setCorporateForm({ ...corporateForm, phone: e.target.value })} placeholder="+91 98765 00000" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Contract Until</Label>
                <Input className="h-8 text-sm" type="date" value={corporateForm.contractUntil} onChange={(e) => setCorporateForm({ ...corporateForm, contractUntil: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Negotiated Rate (₹)</Label>
                <Input className="h-8 text-sm" type="number" value={corporateForm.negotiatedRate} onChange={(e) => setCorporateForm({ ...corporateForm, negotiatedRate: Number(e.target.value) })} placeholder="0" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Rooms/Year</Label>
                <Input className="h-8 text-sm" type="number" value={corporateForm.roomsPerYear} onChange={(e) => setCorporateForm({ ...corporateForm, roomsPerYear: Number(e.target.value) })} placeholder="0" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCorporateDialogOpen(false)} disabled={submitting}>Cancel</Button>
            <Button className="bg-navy hover:bg-navy-light text-white" onClick={handleAddCorporate} disabled={submitting}>{submitting ? "Adding..." : "Add Corporate"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── View Members Dialog ── */}
      <Dialog open={membersDialogOpen} onOpenChange={setMembersDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Users className="h-5 w-5 text-navy" /> {selectedTier} Members</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {MOCK_LOYALTY.filter((ly) => {
              if (selectedTier === "Platinum") return ly.tier === "Platinum";
              if (selectedTier === "Gold") return ly.tier === "Gold";
              if (selectedTier === "Silver") return ly.tier === "Silver";
              return true; // For travel agent names or "Classic", show all
            }).map((ly) => (
              <div key={ly.id} className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="text-sm font-medium">{ly.member}</p>
                  <p className="text-[10px] text-muted-foreground">{ly.tier} · {ly.points.toLocaleString()} pts</p>
                </div>
                <Badge variant="outline" className="text-[10px]">{ly.tier}</Badge>
              </div>
            ))}
            {MOCK_LOYALTY.filter((ly) => {
              if (selectedTier === "Platinum") return ly.tier === "Platinum";
              if (selectedTier === "Gold") return ly.tier === "Gold";
              if (selectedTier === "Silver") return ly.tier === "Silver";
              return true;
            }).length === 0 && (
              <p className="text-center text-sm text-muted-foreground py-4">No members found</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMembersDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
