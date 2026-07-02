// ARIA HMS — Sales Pipeline Module
"use client";

import { useState, useMemo, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useApi, apiPost, apiPut } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import { KpiCard, fmtINR, fmtDate, timeAgo } from "../shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import {
  TrendingUp, Users, DollarSign, Target, Phone, Mail, Building2,
  Award, BarChart3, Plus, Search, ChevronRight, ChevronLeft,
  Filter, Trophy, XCircle, Clock, UserCircle,
  Briefcase, Percent, Handshake, CircleDot, Globe, Activity,
} from "lucide-react";
import {
  BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area,
  ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";

// ─── Constants ────────────────────────────────────────────────────────────────
const NAVY = "#1B3A6B";
const GOLD = "#C9952A";
const SUCCESS = "#16A34A";

const PIPELINE_STAGES = [
  { key: "new", label: "New", color: "#6366F1", bg: "#EEF2FF" },
  { key: "contacted", label: "Contacted", color: "#0284C7", bg: "#E0F2FE" },
  { key: "qualified", label: "Qualified", color: "#7C3AED", bg: "#F3E8FF" },
  { key: "proposal", label: "Proposal", color: "#D97706", bg: "#FEF3C7" },
  { key: "negotiation", label: "Negotiation", color: "#EA580C", bg: "#FFF7ED" },
  { key: "won", label: "Won", color: "#16A34A", bg: "#DCFCE7" },
  { key: "lost", label: "Lost", color: "#DC2626", bg: "#FFE4E6" },
] as const;

const DEAL_STAGES = [
  { key: "prospecting", label: "Prospecting", color: "#6366F1" },
  { key: "qualification", label: "Qualification", color: "#0284C7" },
  { key: "proposal", label: "Proposal", color: "#7C3AED" },
  { key: "negotiation", label: "Negotiation", color: "#D97706" },
  { key: "closed_won", label: "Closed Won", color: "#16A34A" },
  { key: "closed_lost", label: "Closed Lost", color: "#DC2626" },
] as const;

const SOURCE_META: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  direct: { label: "Direct", color: "#2563EB", bg: "#DBEAFE", icon: Phone },
  referral: { label: "Referral", color: "#16A34A", bg: "#DCFCE7", icon: Users },
  website: { label: "Website", color: "#7C3AED", bg: "#F3E8FF", icon: Globe },
  linkedin: { label: "LinkedIn", color: "#0A66C2", bg: "#E0F2FE", icon: Briefcase },
  expo: { label: "Expo", color: "#EA580C", bg: "#FFF7ED", icon: Award },
  cold_call: { label: "Cold Call", color: "#DC2626", bg: "#FFE4E6", icon: Phone },
  ota_partner: { label: "OTA Partner", color: "#0D9488", bg: "#CCFBF1", icon: Handshake },
};

const STATUS_FLOW = ["new", "contacted", "qualified", "proposal", "negotiation", "won", "lost"] as const;

const ASSIGNEES = ["Priya Nair", "Vikram Singh", "Arjun Mehta"];

const SALES_TABS = [
  { key: "pipeline", label: "Pipeline", icon: Target },
  { key: "leads", label: "Leads", icon: Users },
  { key: "deals", label: "Deals", icon: Briefcase },
  { key: "analytics", label: "Analytics", icon: Activity },
];

// ─── Types ────────────────────────────────────────────────────────────────────
interface Lead {
  id: string;
  company: string;
  contact: string;
  email: string;
  phone: string;
  source: string;
  status: string;
  estimatedValue: number;
  probability: number;
  assignedTo: string;
  lastContacted: string;
  notes: string;
}

interface Deal {
  id: string;
  title: string;
  leadId: string;
  leadCompany: string;
  value: number;
  stage: string;
  probability: number;
  closeDate: string;
  assignedTo: string;
  createdAt: string;
}

// ─── Custom Tooltip for Recharts ──────────────────────────────────────────────
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 shadow-card-lg text-xs">
      {label && <p className="font-semibold text-foreground mb-1">{label}</p>}
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color }} className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: p.color }} />
          {p.name}: <span className="font-mono-num font-bold">{typeof p.value === "number" && p.value > 999 ? fmtINR(p.value) : p.value}</span>
        </p>
      ))}
    </div>
  );
}

// ─── Source Badge ─────────────────────────────────────────────────────────────
function SourceBadge({ source }: { source: string }) {
  const meta = SOURCE_META[source];
  if (!meta) return <Badge variant="secondary" className="text-[10px]">{source}</Badge>;
  const Icon = meta.icon;
  return (
    <span
      className="inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-semibold"
      style={{ color: meta.color, borderColor: meta.color + "40", backgroundColor: meta.bg }}
    >
      <Icon className="h-3 w-3" />
      {meta.label}
    </span>
  );
}

// ─── Pipeline Column ──────────────────────────────────────────────────────────
function PipelineColumn({
  stage,
  leads,
  onMoveLead,
}: {
  stage: typeof PIPELINE_STAGES[number];
  leads: Lead[];
  onMoveLead: (id: string, newStatus: string) => void;
}) {
  const stageLeads = leads.filter((l) => l.status === stage.key);
  const totalValue = stageLeads.reduce((s, l) => s + l.estimatedValue, 0);
  const prevStage = STATUS_FLOW[STATUS_FLOW.indexOf(stage.key as any) - 1];
  const nextStage = STATUS_FLOW[STATUS_FLOW.indexOf(stage.key as any) + 1];

  return (
    <div className="flex flex-col min-w-[260px] w-[260px] shrink-0">
      {/* Stage header */}
      <div className="flex items-center gap-2 mb-2 px-1">
        <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: stage.color }} />
        <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">{stage.label}</h3>
        <span className="ml-auto text-[10px] font-mono-num font-bold px-1.5 py-0.5 rounded-full" style={{ backgroundColor: stage.bg, color: stage.color }}>
          {stageLeads.length}
        </span>
      </div>
      <div className="mb-2 px-1">
        <p className="text-[10px] text-muted-foreground">Pipeline Value</p>
        <p className="text-sm font-mono-num font-bold" style={{ color: stage.color }}>{fmtINR(totalValue)}</p>
      </div>

      {/* Lead cards */}
      <div className="flex-1 space-y-2 overflow-y-auto max-h-[calc(100vh-340px)] pr-1 scrollbar-thin">
        {stageLeads.length === 0 ? (
          <div className="flex items-center justify-center h-20 rounded-lg border border-dashed border-border text-[11px] text-muted-foreground">
            No leads
          </div>
        ) : (
          stageLeads.map((lead) => (
            <Card key={lead.id} className="group shadow-card hover:shadow-card-lg transition-all cursor-default">
              <CardContent className="p-3">
                <div className="flex items-start justify-between gap-1 mb-1.5">
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-foreground truncate">{lead.company}</p>
                    <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <UserCircle className="h-3 w-3" /> {lead.contact}
                    </p>
                  </div>
                  <span className="text-[10px] font-mono-num font-bold px-1.5 py-0.5 rounded" style={{ backgroundColor: stage.bg, color: stage.color }}>
                    {lead.probability}%
                  </span>
                </div>

                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-mono-num font-bold" style={{ color: NAVY }}>{fmtINR(lead.estimatedValue)}</span>
                  <SourceBadge source={lead.source} />
                </div>

                <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-2">
                  <span className="flex items-center gap-0.5"><Clock className="h-3 w-3" />{timeAgo(lead.lastContacted)}</span>
                  <span>{lead.assignedTo.split(" ")[0]}</span>
                </div>

                {/* Move buttons */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {prevStage && stage.key !== "won" && stage.key !== "lost" && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-6 text-[10px] px-2 flex-1"
                      onClick={() => onMoveLead(lead.id, prevStage)}
                    >
                      <ChevronLeft className="h-3 w-3 mr-0.5" />
                      {PIPELINE_STAGES.find((s) => s.key === prevStage)?.label}
                    </Button>
                  )}
                  {nextStage && stage.key !== "won" && stage.key !== "lost" && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-6 text-[10px] px-2 flex-1"
                      onClick={() => onMoveLead(lead.id, nextStage)}
                    >
                      {PIPELINE_STAGES.find((s) => s.key === nextStage)?.label}
                      <ChevronRight className="h-3 w-3 ml-0.5" />
                    </Button>
                  )}
                  {stage.key !== "won" && stage.key !== "lost" && (
                    <>
                      <Button
                        size="sm"
                        className="h-6 text-[10px] px-2 bg-[#16A34A] hover:bg-[#15803D] text-white"
                        onClick={() => onMoveLead(lead.id, "won")}
                      >
                        <Trophy className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-6 text-[10px] px-2 text-[#DC2626] border-[#DC2626]/40 hover:bg-[#FFE4E6]"
                        onClick={() => onMoveLead(lead.id, "lost")}
                      >
                        <XCircle className="h-3 w-3" />
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

// ─── Lead Form Dialog ─────────────────────────────────────────────────────────
function LeadFormDialog({
  open,
  onClose,
  onSave,
  initial,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
  initial?: Lead | null;
}) {
  const initVal = initial
    ? { company: initial.company, contact: initial.contact, email: initial.email, phone: initial.phone, source: initial.source, status: initial.status, estimatedValue: String(initial.estimatedValue), probability: String(initial.probability), assignedTo: initial.assignedTo, notes: initial.notes }
    : { company: "", contact: "", email: "", phone: "", source: "direct", status: "new", estimatedValue: "", probability: "10", assignedTo: "", notes: "" };
  const [form, setForm] = useState(initVal);

  const handleSubmit = () => {
    if (!form.company.trim() || !form.contact.trim()) {
      toast.error("Company and Contact are required");
      return;
    }
    onSave({
      ...(initial ? { id: initial.id } : {}),
      company: form.company,
      contact: form.contact,
      email: form.email,
      phone: form.phone,
      source: form.source,
      status: form.status,
      estimatedValue: Number(form.estimatedValue) || 0,
      probability: Number(form.probability) || 10,
      assignedTo: form.assignedTo || "Unassigned",
      notes: form.notes,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-navy font-display">
            {initial ? "Edit Lead" : "Add New Lead"}
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Company *</Label>
              <Input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} placeholder="Company name" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Contact Person *</Label>
              <Input value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} placeholder="Full name" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Email</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="email@company.com" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Phone</Label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+91 98XXX XXXXX" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Source</Label>
              <Select value={form.source} onValueChange={(v) => setForm({ ...form, source: v })}>
                <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(SOURCE_META).map(([k, m]) => (
                    <SelectItem key={k} value={k} className="text-xs">{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUS_FLOW.map((s) => (
                    <SelectItem key={s} value={s} className="text-xs capitalize">{s.replace("_", " ")}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Assigned To</Label>
              <Select value={form.assignedTo} onValueChange={(v) => setForm({ ...form, assignedTo: v })}>
                <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {ASSIGNEES.map((a) => (
                    <SelectItem key={a} value={a} className="text-xs">{a}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Estimated Value (₹)</Label>
              <Input type="number" value={form.estimatedValue} onChange={(e) => setForm({ ...form, estimatedValue: e.target.value })} placeholder="0" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Probability (%)</Label>
              <Input type="number" min="0" max="100" value={form.probability} onChange={(e) => setForm({ ...form, probability: e.target.value })} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Notes</Label>
            <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Additional notes..." />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button className="bg-navy hover:bg-navy/90 text-white" onClick={handleSubmit}>
            {initial ? "Update Lead" : "Create Lead"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Deal Form Dialog ─────────────────────────────────────────────────────────
function DealFormDialog({
  open,
  onClose,
  onSave,
  leads,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
  leads: Lead[];
}) {
  const [form, setForm] = useState({
    title: "", leadId: "", value: "", stage: "prospecting",
    probability: "10", closeDate: "", assignedTo: "",
  });

  const selectedLead = leads.find((l) => l.id === form.leadId);

  const handleSubmit = () => {
    if (!form.title.trim()) {
      toast.error("Deal title is required");
      return;
    }
    onSave({
      title: form.title,
      leadId: form.leadId,
      leadCompany: selectedLead?.company || "",
      value: Number(form.value) || 0,
      stage: form.stage,
      probability: Number(form.probability) || 10,
      closeDate: form.closeDate || new Date(Date.now() + 30 * 86400000).toISOString(),
      assignedTo: form.assignedTo || "Unassigned",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-navy font-display">Add New Deal</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Deal Title *</Label>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Deal title" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Associated Lead</Label>
              <Select value={form.leadId} onValueChange={(v) => {
                const lead = leads.find((l) => l.id === v);
                setForm({ ...form, leadId: v, value: lead ? String(lead.estimatedValue) : form.value });
              }}>
                <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Select lead" /></SelectTrigger>
                <SelectContent>
                  {leads.map((l) => (
                    <SelectItem key={l.id} value={l.id} className="text-xs">{l.company} — {l.contact}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Value (₹)</Label>
              <Input type="number" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} placeholder="0" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Stage</Label>
              <Select value={form.stage} onValueChange={(v) => setForm({ ...form, stage: v })}>
                <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DEAL_STAGES.map((s) => (
                    <SelectItem key={s.key} value={s.key} className="text-xs">{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Probability (%)</Label>
              <Input type="number" min="0" max="100" value={form.probability} onChange={(e) => setForm({ ...form, probability: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Close Date</Label>
              <Input type="date" value={form.closeDate} onChange={(e) => setForm({ ...form, closeDate: e.target.value })} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Assigned To</Label>
            <Select value={form.assignedTo} onValueChange={(v) => setForm({ ...form, assignedTo: v })}>
              <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                {ASSIGNEES.map((a) => (
                  <SelectItem key={a} value={a} className="text-xs">{a}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button className="bg-navy hover:bg-navy/90 text-white" onClick={handleSubmit}>Create Deal</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Pipeline Tab ─────────────────────────────────────────────────────────────
function PipelineTab({ leads, onMoveLead }: { leads: Lead[]; onMoveLead: (id: string, status: string) => void }) {
  const [filterSource, setFilterSource] = useState("all");
  const [filterAssignee, setFilterAssignee] = useState("all");

  const filtered = useMemo(() => {
    let result = [...leads];
    if (filterSource !== "all") result = result.filter((l) => l.source === filterSource);
    if (filterAssignee !== "all") result = result.filter((l) => l.assignedTo === filterAssignee);
    return result;
  }, [leads, filterSource, filterAssignee]);

  const totalPipeline = filtered.reduce((s, l) => s + l.estimatedValue, 0);
  const weightedPipeline = filtered.reduce((s, l) => s + l.estimatedValue * (l.probability / 100), 0);

  return (
    <div className="space-y-4">
      {/* Pipeline summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiCard label="Total Pipeline" value={fmtINR(totalPipeline)} icon={DollarSign} accent="navy" />
        <KpiCard label="Weighted Value" value={fmtINR(Math.round(weightedPipeline))} icon={TrendingUp} accent="gold" hint="Value × Probability" />
        <KpiCard label="Active Leads" value={filtered.filter((l) => !["won", "lost"].includes(l.status)).length} icon={Users} accent="info" />
        <KpiCard label="Won This Month" value={filtered.filter((l) => l.status === "won").length} icon={Trophy} accent="success" />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <Select value={filterSource} onValueChange={setFilterSource}>
          <SelectTrigger className="h-8 w-[140px] text-xs"><SelectValue placeholder="Source" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-xs">All Sources</SelectItem>
            {Object.entries(SOURCE_META).map(([k, m]) => (
              <SelectItem key={k} value={k} className="text-xs">{m.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterAssignee} onValueChange={setFilterAssignee}>
          <SelectTrigger className="h-8 w-[150px] text-xs"><SelectValue placeholder="Assigned To" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-xs">All Assignees</SelectItem>
            {ASSIGNEES.map((a) => (
              <SelectItem key={a} value={a} className="text-xs">{a}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Kanban board */}
      <div className="overflow-x-auto pb-4 -mx-4 px-4">
        <div className="flex gap-4 min-w-max">
          {PIPELINE_STAGES.map((stage) => (
            <PipelineColumn key={stage.key} stage={stage} leads={filtered} onMoveLead={onMoveLead} />
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Leads Tab ────────────────────────────────────────────────────────────────
function LeadsTab({ leads, loading, onEdit, onQuickAction, onAdd }: {
  leads: Lead[];
  loading: boolean;
  onEdit: (lead: Lead) => void;
  onQuickAction: (id: string, action: string) => void;
  onAdd: () => void;
}) {
  const [search, setSearch] = useState("");
  const [filterSource, setFilterSource] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  const filtered = useMemo(() => {
    let result = [...leads];
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (l) => l.company.toLowerCase().includes(q) || l.contact.toLowerCase().includes(q) || l.email.toLowerCase().includes(q)
      );
    }
    if (filterSource !== "all") result = result.filter((l) => l.source === filterSource);
    if (filterStatus !== "all") result = result.filter((l) => l.status === filterStatus);
    return result;
  }, [leads, search, filterSource, filterStatus]);

  const statusBadge = (status: string) => {
    const stage = PIPELINE_STAGES.find((s) => s.key === status);
    if (!stage) return <Badge variant="secondary" className="text-[10px] capitalize">{status}</Badge>;
    return (
      <span
        className="inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-semibold capitalize"
        style={{ color: stage.color, borderColor: stage.color + "40", backgroundColor: stage.bg }}
      >
        <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: stage.color }} />
        {stage.label}
      </span>
    );
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search leads..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9 text-xs" />
        </div>
        <div className="flex items-center gap-2">
          <Select value={filterSource} onValueChange={setFilterSource}>
            <SelectTrigger className="h-9 w-[130px] text-xs"><SelectValue placeholder="Source" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">All Sources</SelectItem>
              {Object.entries(SOURCE_META).map(([k, m]) => (
                <SelectItem key={k} value={k} className="text-xs">{m.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="h-9 w-[130px] text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">All Statuses</SelectItem>
              {STATUS_FLOW.map((s) => (
                <SelectItem key={s} value={s} className="text-xs capitalize">{s.replace("_", " ")}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" className="h-9 bg-navy hover:bg-navy/90 text-white" onClick={onAdd}>
            <Plus className="h-4 w-4 mr-1" /> Add Lead
          </Button>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
      ) : (
        <div className="rounded-lg border border-border overflow-hidden">
          <div className="overflow-x-auto max-h-[calc(100vh-320px)]">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="text-[11px] font-semibold whitespace-nowrap">Company</TableHead>
                  <TableHead className="text-[11px] font-semibold whitespace-nowrap">Contact</TableHead>
                  <TableHead className="text-[11px] font-semibold whitespace-nowrap hidden md:table-cell">Email</TableHead>
                  <TableHead className="text-[11px] font-semibold whitespace-nowrap hidden lg:table-cell">Phone</TableHead>
                  <TableHead className="text-[11px] font-semibold whitespace-nowrap">Source</TableHead>
                  <TableHead className="text-[11px] font-semibold whitespace-nowrap">Status</TableHead>
                  <TableHead className="text-[11px] font-semibold whitespace-nowrap text-right">Est. Value</TableHead>
                  <TableHead className="text-[11px] font-semibold whitespace-nowrap text-center">Prob.</TableHead>
                  <TableHead className="text-[11px] font-semibold whitespace-nowrap hidden xl:table-cell">Assigned To</TableHead>
                  <TableHead className="text-[11px] font-semibold whitespace-nowrap hidden xl:table-cell">Last Contacted</TableHead>
                  <TableHead className="text-[11px] font-semibold whitespace-nowrap text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center py-8 text-sm text-muted-foreground">
                      No leads found
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((lead) => (
                    <TableRow key={lead.id} className="group hover:bg-muted/30 cursor-pointer" onClick={() => onEdit(lead)}>
                      <TableCell className="text-xs font-semibold whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          {lead.company}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs whitespace-nowrap">{lead.contact}</TableCell>
                      <TableCell className="text-xs whitespace-nowrap hidden md:table-cell">
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <Mail className="h-3 w-3" /> {lead.email}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs whitespace-nowrap hidden lg:table-cell">
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <Phone className="h-3 w-3" /> {lead.phone}
                        </span>
                      </TableCell>
                      <TableCell className="whitespace-nowrap"><SourceBadge source={lead.source} /></TableCell>
                      <TableCell className="whitespace-nowrap">{statusBadge(lead.status)}</TableCell>
                      <TableCell className="text-xs font-mono-num font-bold text-right whitespace-nowrap">{fmtINR(lead.estimatedValue)}</TableCell>
                      <TableCell className="text-xs text-center whitespace-nowrap">
                        <span className="font-mono-num font-semibold" style={{ color: lead.probability >= 70 ? SUCCESS : lead.probability >= 40 ? GOLD : "#64748B" }}>
                          {lead.probability}%
                        </span>
                      </TableCell>
                      <TableCell className="text-xs whitespace-nowrap hidden xl:table-cell">{lead.assignedTo}</TableCell>
                      <TableCell className="text-[11px] text-muted-foreground whitespace-nowrap hidden xl:table-cell">{timeAgo(lead.lastContacted)}</TableCell>
                      <TableCell className="whitespace-nowrap">
                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          {lead.status === "new" && (
                            <Button size="sm" variant="outline" className="h-6 text-[10px] px-2" onClick={() => onQuickAction(lead.id, "contacted")}>
                              <Phone className="h-3 w-3 mr-0.5" /> Contact
                            </Button>
                          )}
                          {(lead.status === "qualified" || lead.status === "contacted") && (
                            <Button size="sm" variant="outline" className="h-6 text-[10px] px-2" onClick={() => onQuickAction(lead.id, "proposal")}>
                              <Mail className="h-3 w-3 mr-0.5" /> Proposal
                            </Button>
                          )}
                          {lead.status !== "won" && lead.status !== "lost" && (
                            <>
                              <Button size="sm" className="h-6 text-[10px] px-2 bg-[#16A34A] hover:bg-[#15803D] text-white" onClick={() => onQuickAction(lead.id, "won")}>
                                <Trophy className="h-3 w-3" />
                              </Button>
                              <Button size="sm" variant="outline" className="h-6 text-[10px] px-2 text-[#DC2626] border-[#DC2626]/30 hover:bg-[#FFE4E6]" onClick={() => onQuickAction(lead.id, "lost")}>
                                <XCircle className="h-3 w-3" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Deals Tab ────────────────────────────────────────────────────────────────
function DealsTab({ deals, loading, onAdd, onStageChange }: {
  deals: Deal[];
  loading: boolean;
  onAdd: () => void;
  onStageChange: (id: string, stage: string) => void;
}) {
  const [filterStage, setFilterStage] = useState("all");

  const filtered = useMemo(() => {
    let result = [...deals];
    if (filterStage !== "all") result = result.filter((d) => d.stage === filterStage);
    return result;
  }, [deals, filterStage]);

  const totalValue = filtered.reduce((s, d) => s + d.value, 0);
  const weightedValue = filtered.reduce((s, d) => s + d.value * (d.probability / 100), 0);
  const wonDeals = deals.filter((d) => d.stage === "closed_won");

  // Value distribution chart data
  const distributionData = useMemo(() => {
    return DEAL_STAGES.map((s) => ({
      name: s.label,
      value: deals.filter((d) => d.stage === s.key).reduce((sum, d) => sum + d.value, 0),
      weighted: deals.filter((d) => d.stage === s.key).reduce((sum, d) => sum + d.value * (d.probability / 100), 0),
      count: deals.filter((d) => d.stage === s.key).length,
      fill: s.color,
    }));
  }, [deals]);

  const stageBadge = (stage: string) => {
    const s = DEAL_STAGES.find((st) => st.key === stage);
    if (!s) return <Badge variant="secondary" className="text-[10px]">{stage}</Badge>;
    return (
      <span className="inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-semibold" style={{ color: s.color, borderColor: s.color + "40", backgroundColor: s.color + "15" }}>
        {s.label}
      </span>
    );
  };

  return (
    <div className="space-y-4">
      {/* Summary KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiCard label="Total Deal Value" value={fmtINR(totalValue)} icon={DollarSign} accent="navy" />
        <KpiCard label="Weighted Pipeline" value={fmtINR(Math.round(weightedValue))} icon={Target} accent="gold" hint="Value × Probability" />
        <KpiCard label="Active Deals" value={filtered.filter((d) => !["closed_won", "closed_lost"].includes(d.stage)).length} icon={Briefcase} accent="info" />
        <KpiCard label="Won Revenue" value={fmtINR(wonDeals.reduce((s, d) => s + d.value, 0))} icon={Trophy} accent="success" />
      </div>

      {/* Distribution chart + deal list */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Chart */}
        <Card className="xl:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold text-navy flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-gold" /> Value by Stage
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={distributionData} margin={{ top: 8, right: 8, left: -10, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-30} textAnchor="end" height={60} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `₹${(v / 100000).toFixed(0)}L`} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="value" name="Total Value" radius={[4, 4, 0, 0]}>
                  {distributionData.map((entry, idx) => (
                    <Cell key={idx} fill={entry.fill} fillOpacity={0.85} />
                  ))}
                </Bar>
                <Bar dataKey="weighted" name="Weighted Value" radius={[4, 4, 0, 0]} fillOpacity={0.5}>
                  {distributionData.map((entry, idx) => (
                    <Cell key={idx} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Deal list */}
        <Card className="xl:col-span-2">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-bold text-navy">Deals</CardTitle>
              <div className="flex items-center gap-2">
                <Select value={filterStage} onValueChange={setFilterStage}>
                  <SelectTrigger className="h-8 w-[140px] text-xs"><SelectValue placeholder="Stage" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="text-xs">All Stages</SelectItem>
                    {DEAL_STAGES.map((s) => (
                      <SelectItem key={s.key} value={s.key} className="text-xs">{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button size="sm" className="h-8 bg-navy hover:bg-navy/90 text-white text-xs" onClick={onAdd}>
                  <Plus className="h-3 w-3 mr-1" /> Deal
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
            ) : (
              <div className="overflow-x-auto max-h-[360px]">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="text-[11px] font-semibold whitespace-nowrap">Title</TableHead>
                      <TableHead className="text-[11px] font-semibold whitespace-nowrap hidden md:table-cell">Lead</TableHead>
                      <TableHead className="text-[11px] font-semibold whitespace-nowrap text-right">Value</TableHead>
                      <TableHead className="text-[11px] font-semibold whitespace-nowrap">Stage</TableHead>
                      <TableHead className="text-[11px] font-semibold whitespace-nowrap text-center">Wtd.</TableHead>
                      <TableHead className="text-[11px] font-semibold whitespace-nowrap hidden lg:table-cell">Close Date</TableHead>
                      <TableHead className="text-[11px] font-semibold whitespace-nowrap hidden xl:table-cell">Assigned To</TableHead>
                      <TableHead className="text-[11px] font-semibold whitespace-nowrap text-center">Move</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-6 text-sm text-muted-foreground">No deals found</TableCell>
                      </TableRow>
                    ) : (
                      filtered.map((deal) => {
                        const stageIdx = DEAL_STAGES.findIndex((s) => s.key === deal.stage);
                        const canMoveForward = stageIdx < DEAL_STAGES.length - 1 && deal.stage !== "closed_won" && deal.stage !== "closed_lost";
                        const canMoveBack = stageIdx > 0 && deal.stage !== "closed_won" && deal.stage !== "closed_lost";
                        return (
                          <TableRow key={deal.id} className="hover:bg-muted/30">
                            <TableCell className="text-xs font-semibold whitespace-nowrap max-w-[200px] truncate">{deal.title}</TableCell>
                            <TableCell className="text-xs text-muted-foreground whitespace-nowrap hidden md:table-cell">{deal.leadCompany}</TableCell>
                            <TableCell className="text-xs font-mono-num font-bold text-right whitespace-nowrap">{fmtINR(deal.value)}</TableCell>
                            <TableCell className="whitespace-nowrap">{stageBadge(deal.stage)}</TableCell>
                            <TableCell className="text-xs font-mono-num text-center whitespace-nowrap text-muted-foreground">{fmtINR(Math.round(deal.value * deal.probability / 100))}</TableCell>
                            <TableCell className="text-xs text-muted-foreground whitespace-nowrap hidden lg:table-cell">{fmtDate(deal.closeDate)}</TableCell>
                            <TableCell className="text-xs whitespace-nowrap hidden xl:table-cell">{deal.assignedTo}</TableCell>
                            <TableCell className="whitespace-nowrap">
                              <div className="flex items-center justify-center gap-1">
                                {canMoveBack && (
                                  <Button size="sm" variant="outline" className="h-6 w-6 p-0" onClick={() => onStageChange(deal.id, DEAL_STAGES[stageIdx - 1].key)}>
                                    <ChevronLeft className="h-3 w-3" />
                                  </Button>
                                )}
                                {canMoveForward && (
                                  <Button size="sm" variant="outline" className="h-6 w-6 p-0" onClick={() => onStageChange(deal.id, DEAL_STAGES[stageIdx + 1].key)}>
                                    <ChevronRight className="h-3 w-3" />
                                  </Button>
                                )}
                                {deal.stage !== "closed_won" && deal.stage !== "closed_lost" && (
                                  <>
                                    <Button size="sm" className="h-6 w-6 p-0 bg-[#16A34A] hover:bg-[#15803D] text-white" onClick={() => onStageChange(deal.id, "closed_won")}>
                                      <Trophy className="h-3 w-3" />
                                    </Button>
                                    <Button size="sm" variant="outline" className="h-6 w-6 p-0 text-[#DC2626] border-[#DC2626]/30 hover:bg-[#FFE4E6]" onClick={() => onStageChange(deal.id, "closed_lost")}>
                                      <XCircle className="h-3 w-3" />
                                    </Button>
                                  </>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ─── Analytics Tab ────────────────────────────────────────────────────────────
function AnalyticsTab({ leads, deals }: { leads: Lead[]; deals: Deal[] }) {
  // ─── KPIs
  const totalPipeline = leads.reduce((s, l) => s + l.estimatedValue, 0);
  const wonThisMonth = leads.filter((l) => l.status === "won");
  const wonValue = wonThisMonth.reduce((s, l) => s + l.estimatedValue, 0);
  const closedDeals = deals.filter((d) => d.stage === "closed_won" || d.stage === "closed_lost");
  const winRate = closedDeals.length > 0 ? Math.round((deals.filter((d) => d.stage === "closed_won").length / closedDeals.length) * 100) : 0;
  const avgDealSize = wonThisMonth.length > 0 ? Math.round(wonValue / wonThisMonth.length) : 0;
  const salesCycle = 18; // mock average days
  const targetAchievement = Math.round((wonValue / 25000000) * 100); // mock target ₹2.5 Cr

  // ─── Pipeline by Stage (funnel data)
  const pipelineByStage = useMemo(() =>
    PIPELINE_STAGES.filter((s) => s.key !== "lost").map((stage) => ({
      name: stage.label,
      value: leads.filter((l) => l.status === stage.key).reduce((s, l) => s + l.estimatedValue, 0),
      count: leads.filter((l) => l.status === stage.key).length,
      fill: stage.color,
    }))
  , [leads]);

  // ─── Monthly Revenue (mock area chart)
  const monthlyRevenue = useMemo(() => [
    { month: "Jan", revenue: 3200000, deals: 4 },
    { month: "Feb", revenue: 4100000, deals: 5 },
    { month: "Mar", revenue: 2800000, deals: 3 },
    { month: "Apr", revenue: 5600000, deals: 6 },
    { month: "May", revenue: 4800000, deals: 5 },
    { month: "Jun", revenue: 6200000, deals: 7 },
    { month: "Jul", revenue: wonValue + 1500000, deals: wonThisMonth.length + 2 },
  ], [wonValue, wonThisMonth.length]);

  // ─── Win/Loss Analysis
  const winLossData = useMemo(() => [
    { name: "Won", value: deals.filter((d) => d.stage === "closed_won").length, fill: SUCCESS },
    { name: "Lost", value: deals.filter((d) => d.stage === "closed_lost").length, fill: "#DC2626" },
    { name: "In Progress", value: deals.filter((d) => !["closed_won", "closed_lost"].includes(d.stage)).length, fill: GOLD },
  ], [deals]);

  // ─── Sales by Source
  const salesBySource = useMemo(() => {
    return Object.entries(SOURCE_META).map(([key, meta]) => ({
      name: meta.label,
      value: leads.filter((l) => l.source === key).reduce((s, l) => s + l.estimatedValue, 0),
      count: leads.filter((l) => l.source === key).length,
      fill: meta.color,
    })).filter((s) => s.value > 0).sort((a, b) => b.value - a.value);
  }, [leads]);

  // ─── Top Performers
  const topPerformers = useMemo(() => {
    return ASSIGNEES.map((name) => {
      const wonLeads = leads.filter((l) => l.assignedTo === name && l.status === "won");
      const activeLeads = leads.filter((l) => l.assignedTo === name && !["won", "lost"].includes(l.status));
      const totalWonValue = wonLeads.reduce((s, l) => s + l.estimatedValue, 0);
      const totalActiveValue = activeLeads.reduce((s, l) => s + l.estimatedValue, 0);
      return { name, wonLeads: wonLeads.length, activeLeads: activeLeads.length, totalWonValue, totalActiveValue };
    }).sort((a, b) => b.totalWonValue - a.totalWonValue);
  }, [leads]);

  return (
    <div className="space-y-4">
      {/* KPI Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <KpiCard label="Total Pipeline" value={fmtINR(totalPipeline)} icon={DollarSign} accent="navy" />
        <KpiCard label="Won This Month" value={fmtINR(wonValue)} icon={Trophy} accent="success" />
        <KpiCard label="Win Rate" value={`${winRate}%`} icon={Target} accent="gold" />
        <KpiCard label="Avg Deal Size" value={fmtINR(avgDealSize)} icon={BarChart3} accent="info" />
        <KpiCard label="Sales Cycle" value={`${salesCycle}d`} icon={Clock} accent="warning" />
        <KpiCard label="Target Achieved" value={`${Math.min(targetAchievement, 100)}%`} icon={Award} accent={targetAchievement >= 100 ? "success" : "warning"} hint="of ₹2.5 Cr target" />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Pipeline by Stage */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold text-navy flex items-center gap-2">
              <CircleDot className="h-4 w-4 text-gold" /> Pipeline by Stage
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={pipelineByStage} layout="vertical" margin={{ top: 4, right: 16, left: 10, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={(v) => `₹${(v / 100000).toFixed(0)}L`} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={85} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="value" name="Pipeline Value" radius={[0, 6, 6, 0]} barSize={28}>
                  {pipelineByStage.map((entry, idx) => (
                    <Cell key={idx} fill={entry.fill} fillOpacity={0.85} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Monthly Revenue */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold text-navy flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-gold" /> Monthly Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={monthlyRevenue} margin={{ top: 4, right: 16, left: -10, bottom: 4 }}>
                <defs>
                  <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={NAVY} stopOpacity={0.25} />
                    <stop offset="95%" stopColor={NAVY} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `₹${(v / 100000).toFixed(0)}L`} />
                <Tooltip content={<ChartTooltip />} />
                <Area type="monotone" dataKey="revenue" name="Revenue" stroke={NAVY} strokeWidth={2.5} fill="url(#revenueGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Win/Loss Analysis */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold text-navy flex items-center gap-2">
              <Percent className="h-4 w-4 text-gold" /> Win / Loss Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={winLossData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={3}
                  dataKey="value"
                  label={({ name, value, percent }) => `${name} ${value} (${(percent * 100).toFixed(0)}%)`}
                >
                  {winLossData.map((entry, idx) => (
                    <Cell key={idx} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip content={<ChartTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Sales by Source */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold text-navy flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-gold" /> Sales by Source
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={salesBySource} layout="vertical" margin={{ top: 4, right: 16, left: 10, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={(v) => `₹${(v / 100000).toFixed(0)}L`} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={80} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="value" name="Pipeline Value" radius={[0, 6, 6, 0]} barSize={20}>
                  {salesBySource.map((entry, idx) => (
                    <Cell key={idx} fill={entry.fill} fillOpacity={0.85} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top Performers */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold text-navy flex items-center gap-2">
              <Award className="h-4 w-4 text-gold" /> Top Performers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topPerformers.map((p, idx) => (
                <div key={p.name} className="flex items-center gap-3">
                  <div className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white shrink-0",
                    idx === 0 ? "bg-gold" : idx === 1 ? "bg-[#94A3B8]" : "bg-[#CD7F32]"
                  )}>
                    {idx + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold truncate">{p.name}</p>
                      <p className="text-xs font-mono-num font-bold" style={{ color: NAVY }}>{fmtINR(p.totalWonValue)}</p>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <Trophy className="h-3 w-3 text-[#16A34A]" /> {p.wonLeads} won
                      </span>
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <CircleDot className="h-3 w-3 text-[#0284C7]" /> {p.activeLeads} active
                      </span>
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                        Pipeline: {fmtINR(p.totalActiveValue)}
                      </span>
                    </div>
                    {/* Progress bar */}
                    <div className="mt-1 h-1.5 w-full rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${Math.min((p.totalWonValue / (topPerformers[0]?.totalWonValue || 1)) * 100, 100)}%`,
                          backgroundColor: idx === 0 ? GOLD : idx === 1 ? "#94A3B8" : "#CD7F32",
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ─── Main Module ──────────────────────────────────────────────────────────────
export function SalesModule() {
  const { refreshTick, triggerRefresh, activeSubModule, setActiveSubModule } = useAppStore();
  const [localTab, setLocalTab] = useState("pipeline");
  const tab = (activeSubModule && SALES_TABS.some(t => t.key === activeSubModule)) ? activeSubModule : localTab;

  const activeTabMeta = SALES_TABS.find(t => t.key === tab);

  const handleTabChange = (newTab: string) => {
    setLocalTab(newTab);
    setActiveSubModule(newTab);
  };
  const [leadDialog, setLeadDialog] = useState<{ open: boolean; lead: Lead | null }>({ open: false, lead: null });
  const [dealDialog, setDealDialog] = useState(false);

  const { data: leadsData, loading: leadsLoading, reload: reloadLeads } = useApi<Lead[]>("/api/sales/leads", [refreshTick]);
  const { data: dealsData, loading: dealsLoading, reload: reloadDeals } = useApi<Deal[]>("/api/sales/deals", [refreshTick]);

  const leads = leadsData ?? [];
  const deals = dealsData ?? [];

  // ─── Move lead to new stage
  const handleMoveLead = async (id: string, newStatus: string) => {
    try {
      await apiPut("/api/sales/leads", { id, status: newStatus });
      const stageLabel = PIPELINE_STAGES.find((s) => s.key === newStatus)?.label ?? newStatus;
      toast.success(`Lead moved to ${stageLabel}`);
      triggerRefresh();
    } catch (e: any) {
      toast.error(e.message || "Failed to move lead");
    }
  };

  // ─── Quick action on lead
  const handleQuickAction = async (id: string, action: string) => {
    try {
      await apiPut("/api/sales/leads", { id, status: action });
      const stageLabel = PIPELINE_STAGES.find((s) => s.key === action)?.label ?? action;
      toast.success(`Lead marked as ${stageLabel}`);
      triggerRefresh();
    } catch (e: any) {
      toast.error(e.message || "Action failed");
    }
  };

  // ─── Save lead
  const handleSaveLead = async (data: any) => {
    try {
      if (data.id) {
        await apiPut("/api/sales/leads", data);
        toast.success("Lead updated successfully");
      } else {
        await apiPost("/api/sales/leads", data);
        toast.success("Lead created successfully");
      }
      setLeadDialog({ open: false, lead: null });
      triggerRefresh();
    } catch (e: any) {
      toast.error(e.message || "Failed to save lead");
    }
  };

  // ─── Save deal
  const handleSaveDeal = async (data: any) => {
    try {
      await apiPost("/api/sales/deals", data);
      toast.success("Deal created successfully");
      setDealDialog(false);
      triggerRefresh();
    } catch (e: any) {
      toast.error(e.message || "Failed to create deal");
    }
  };

  // ─── Move deal stage
  const handleDealStageChange = async (id: string, stage: string) => {
    try {
      await apiPut("/api/sales/deals", { id, stage });
      const stageLabel = DEAL_STAGES.find((s) => s.key === stage)?.label ?? stage;
      toast.success(`Deal moved to ${stageLabel}`);
      triggerRefresh();
    } catch (e: any) {
      toast.error(e.message || "Failed to move deal");
    }
  };

  return (
    <div className="space-y-5">
      {/* Module Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#EA580C]/10">
            <TrendingUp className="h-4.5 w-4.5 text-[#EA580C]" />
          </div>
          <div className="min-w-0">
            <h2 className="font-display text-lg font-bold tracking-tight text-foreground">Sales Pipeline</h2>
            <p className="text-xs text-muted-foreground">{activeTabMeta?.label ?? "Pipeline"} · Sales & Business Development</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" className="text-xs" onClick={() => { triggerRefresh(); toast.success("Data refreshed"); }}>
            ↻ Refresh
          </Button>
          <Button size="sm" className="bg-navy hover:bg-navy/90 text-white text-xs" onClick={() => setLeadDialog({ open: true, lead: null })}>
            <Plus className="h-4 w-4 mr-1" /> New Lead
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={handleTabChange}>
        <TabsList className="grid w-full grid-cols-4 max-w-lg">
          <TabsTrigger value="pipeline" className="text-xs">Pipeline</TabsTrigger>
          <TabsTrigger value="leads" className="text-xs">Leads</TabsTrigger>
          <TabsTrigger value="deals" className="text-xs">Deals</TabsTrigger>
          <TabsTrigger value="analytics" className="text-xs">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="pipeline" className="mt-4">
          {leadsLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)}</div>
          ) : (
            <PipelineTab leads={leads} onMoveLead={handleMoveLead} />
          )}
        </TabsContent>

        <TabsContent value="leads" className="mt-4">
          <LeadsTab
            leads={leads}
            loading={leadsLoading}
            onEdit={(lead) => setLeadDialog({ open: true, lead })}
            onQuickAction={handleQuickAction}
            onAdd={() => setLeadDialog({ open: true, lead: null })}
          />
        </TabsContent>

        <TabsContent value="deals" className="mt-4">
          <DealsTab
            deals={deals}
            loading={dealsLoading}
            onAdd={() => setDealDialog(true)}
            onStageChange={handleDealStageChange}
          />
        </TabsContent>

        <TabsContent value="analytics" className="mt-4">
          <AnalyticsTab leads={leads} deals={deals} />
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <LeadFormDialog
        key={leadDialog.lead?.id ?? "new"}
        open={leadDialog.open}
        onClose={() => setLeadDialog({ open: false, lead: null })}
        onSave={handleSaveLead}
        initial={leadDialog.lead}
      />
      <DealFormDialog
        key={dealDialog ? "open" : "closed"}
        open={dealDialog}
        onClose={() => setDealDialog(false)}
        onSave={handleSaveDeal}
        leads={leads}
      />
    </div>
  );
}
