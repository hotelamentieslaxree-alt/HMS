// ARIA HMS — Automation Center Module (Workflows, Templates, Approval Flows, Communication)
"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { useApi } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import { KpiCard, fmtDate, fmtDateTime } from "../shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import {
  Zap, Workflow, Mail, MessageSquare, Smartphone, CheckCircle2,
  Clock, Play, Pause, Plus, ArrowRight, Settings, Shield,
  Calendar, Bell, Send, FileCheck, Users, Bot,
  GitBranch, Layers, Timer, RefreshCw, Sparkles,
} from "lucide-react";

// ─── MOCK DATA ──────────────────────────────────────────────────────

const MOCK_WORKFLOWS = [
  { id: "WF-001", name: "Guest Check-in Automation", trigger: "Reservation checked in", actions: 4, status: "active", lastRun: "2025-01-15T10:30:00", runs: 156 },
  { id: "WF-002", name: "Pre-Arrival Email", trigger: "1 day before arrival", actions: 2, status: "active", lastRun: "2025-01-15T08:00:00", runs: 210 },
  { id: "WF-003", name: "Post-Checkout Survey", trigger: "Guest checks out", actions: 3, status: "active", lastRun: "2025-01-14T14:20:00", runs: 189 },
  { id: "WF-004", name: "Low Stock Alert", trigger: "Stock below reorder level", actions: 2, status: "paused", lastRun: "2025-01-10T11:00:00", runs: 34 },
  { id: "WF-005", name: "VIP Guest Welcome", trigger: "VIP guest reservation created", actions: 5, status: "active", lastRun: "2025-01-15T09:15:00", runs: 42 },
  { id: "WF-006", name: "Maintenance Escalation", trigger: "Ticket open > 24hrs", actions: 3, status: "active", lastRun: "2025-01-14T16:45:00", runs: 18 },
];

const MOCK_TEMPLATES = [
  { id: "TPL-01", name: "Welcome Email Series", category: "Guest Communication", actions: 3, popular: true },
  { id: "TPL-02", name: "Feedback Collection", category: "Guest Satisfaction", actions: 2, popular: true },
  { id: "TPL-03", name: "Room Ready Notification", category: "Operations", actions: 2, popular: false },
  { id: "TPL-04", name: "Payment Reminder", category: "Finance", actions: 3, popular: true },
  { id: "TPL-05", name: "Staff Shift Reminder", category: "HR", actions: 1, popular: false },
  { id: "TPL-06", name: "OTA Review Request", category: "Marketing", actions: 2, popular: true },
  { id: "TPL-07", name: "Complaint Escalation", category: "Operations", actions: 4, popular: false },
  { id: "TPL-08", name: "Birthday Greeting", category: "CRM", actions: 2, popular: false },
];

const MOCK_APPROVALS = [
  { id: "APR-001", title: "Corporate rate approval - TCS Ltd", requestedBy: "Karan Rao", type: "Rate", amount: 3500, status: "pending", date: "2025-01-15" },
  { id: "APR-002", title: "Vendor payment - Linen Solutions", requestedBy: "Priya Sharma", type: "Payment", amount: 150000, status: "pending", date: "2025-01-14" },
  { id: "APR-003", title: "Event discount - Wedding reception", requestedBy: "Suresh Menon", type: "Discount", amount: 25000, status: "approved", date: "2025-01-13" },
  { id: "APR-004", title: "Staff overtime - Housekeeping", requestedBy: "Lakshmi Devi", type: "HR", amount: 8500, status: "approved", date: "2025-01-12" },
  { id: "APR-005", title: "Refund - Guest complaint Room 302", requestedBy: "Ravi Kumar", type: "Refund", amount: 4500, status: "rejected", date: "2025-01-11" },
];

const MOCK_COMM_STATUS = [
  { channel: "Email", icon: Mail, active: true, sentToday: 45, pending: 3, provider: "SendGrid" },
  { channel: "WhatsApp", icon: MessageSquare, active: true, sentToday: 28, pending: 5, provider: "WhatsApp Business API" },
  { channel: "SMS", icon: Smartphone, active: true, sentToday: 12, pending: 0, provider: "MSG91" },
];

const MOCK_TASK_AUTOMATIONS = [
  { id: "TA-01", rule: "Auto-assign housekeeping on check-out", trigger: "Check-out event", enabled: true },
  { id: "TA-02", rule: "Create maintenance ticket for room issues", trigger: "Guest complaint", enabled: true },
  { id: "TA-03", rule: "Send invoice 2 hours after check-out", trigger: "Check-out event", enabled: true },
  { id: "TA-04", rule: "Auto-cancel unconfirmed reservations after 6PM", trigger: "Daily at 6PM", enabled: false },
  { id: "TA-05", rule: "Flag high-value folios for review", trigger: "Folio > ₹50,000", enabled: true },
];

// ─── STATUS META ─────────────────────────────────────────────────────

const APPROVAL_STATUS_META: Record<string, { label: string; cls: string }> = {
  pending: { label: "Pending", cls: "bg-[#FEF3C7] text-[#78350F] border-[#D97706]" },
  approved: { label: "Approved", cls: "bg-[#DCFCE7] text-[#14532D] border-[#16A34A]" },
  rejected: { label: "Rejected", cls: "bg-[#FFE4E6] text-[#881337] border-[#DC2626]" },
};

// ─── MAIN COMPONENT ──────────────────────────────────────────────────

export function AutomationModule() {
  const { refreshTick } = useAppStore();
  const [activeTab, setActiveTab] = useState("workflows");

  const activeWorkflows = MOCK_WORKFLOWS.filter((w) => w.status === "active").length;
  const totalRuns = MOCK_WORKFLOWS.reduce((s, w) => s + w.runs, 0);
  const pendingApprovals = MOCK_APPROVALS.filter((a) => a.status === "pending").length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-display font-bold text-foreground flex items-center gap-2">
            <Zap className="h-5 w-5 text-[#D97706]" /> Automation Center
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">Workflow automation, approval flows & communication triggers</p>
        </div>
        <Button className="bg-navy hover:bg-navy-light text-white h-9"><Plus className="h-4 w-4 mr-1" /> Create Workflow</Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Active Workflows" value={activeWorkflows} icon={Workflow} accent="navy" />
        <KpiCard label="Total Automations" value={MOCK_WORKFLOWS.length} icon={Zap} accent="gold" />
        <KpiCard label="Total Runs" value={totalRuns} icon={Play} accent="success" delta={15} deltaLabel="this week" />
        <KpiCard label="Pending Approvals" value={pendingApprovals} icon={Clock} accent="warning" />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="workflows" className="text-xs">Workflows</TabsTrigger>
          <TabsTrigger value="templates" className="text-xs">Templates</TabsTrigger>
          <TabsTrigger value="approvals" className="text-xs">Approval Flows</TabsTrigger>
          <TabsTrigger value="communication" className="text-xs">Communication</TabsTrigger>
          <TabsTrigger value="task-automation" className="text-xs">Task Automation</TabsTrigger>
        </TabsList>

        {/* ── Workflows Tab ── */}
        <TabsContent value="workflows" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {MOCK_WORKFLOWS.map((wf) => (
              <Card key={wf.id} className="hover:shadow-card-lg transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                      <div className={cn("h-8 w-8 flex items-center justify-center rounded-lg", wf.status === "active" ? "bg-[#16A34A]/10" : "bg-muted")}>
                        <Workflow className="h-4 w-4" style={{ color: wf.status === "active" ? "#16A34A" : "#6B7280" }} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold">{wf.name}</p>
                        <p className="text-[10px] text-muted-foreground">{wf.actions} actions</p>
                      </div>
                    </div>
                    <Badge variant={wf.status === "active" ? "default" : "secondary"} className="text-[10px] capitalize">
                      {wf.status}
                    </Badge>
                  </div>
                  <div className="rounded-lg border border-border p-2 mb-3">
                    <p className="text-[10px] text-muted-foreground mb-0.5">Trigger</p>
                    <p className="text-xs font-medium">{wf.trigger}</p>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-border">
                    <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                      <span className="flex items-center gap-0.5"><RefreshCw className="h-3 w-3" />{wf.runs} runs</span>
                      <span className="flex items-center gap-0.5"><Timer className="h-3 w-3" />Last: {fmtDateTime(wf.lastRun)}</span>
                    </div>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                      {wf.status === "active" ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* ── Templates Tab ── */}
        <TabsContent value="templates" className="mt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {MOCK_TEMPLATES.map((tpl) => (
              <Card key={tpl.id} className="hover:shadow-card-lg transition-shadow cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="h-8 w-8 flex items-center justify-center rounded-lg bg-[#D97706]/10">
                      <Layers className="h-4 w-4 text-[#D97706]" />
                    </div>
                    {tpl.popular && <span className="text-[9px] font-bold text-[#D97706] bg-[#FEF3C7] px-1.5 py-0.5 rounded">POPULAR</span>}
                  </div>
                  <p className="text-xs font-semibold mb-1">{tpl.name}</p>
                  <p className="text-[10px] text-muted-foreground mb-3">{tpl.category} · {tpl.actions} actions</p>
                  <Button variant="outline" size="sm" className="w-full h-7 text-[10px]">
                    <Plus className="h-3 w-3 mr-1" /> Use Template
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* ── Approvals Tab ── */}
        <TabsContent value="approvals" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Shield className="h-4 w-4 text-navy" /> Approval Queue
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-[11px]">ID</TableHead>
                    <TableHead className="text-[11px]">Title</TableHead>
                    <TableHead className="text-[11px]">Requested By</TableHead>
                    <TableHead className="text-[11px]">Type</TableHead>
                    <TableHead className="text-[11px] text-right">Amount</TableHead>
                    <TableHead className="text-[11px]">Status</TableHead>
                    <TableHead className="text-[11px]">Date</TableHead>
                    <TableHead className="text-[11px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {MOCK_APPROVALS.map((apr) => {
                    const st = APPROVAL_STATUS_META[apr.status] ?? APPROVAL_STATUS_META.pending;
                    return (
                      <TableRow key={apr.id} className="hover:bg-muted/50">
                        <TableCell className="text-xs font-mono text-muted-foreground">{apr.id}</TableCell>
                        <TableCell className="text-xs font-medium">{apr.title}</TableCell>
                        <TableCell className="text-xs">{apr.requestedBy}</TableCell>
                        <TableCell className="text-xs"><Badge variant="outline" className="text-[10px]">{apr.type}</Badge></TableCell>
                        <TableCell className="text-xs text-right tabular-nums">{apr.amount > 0 ? `₹${apr.amount.toLocaleString("en-IN")}` : "-"}</TableCell>
                        <TableCell><span className={cn("inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-medium", st.cls)}>{st.label}</span></TableCell>
                        <TableCell className="text-xs">{fmtDate(apr.date)}</TableCell>
                        <TableCell>
                          {apr.status === "pending" ? (
                            <div className="flex items-center gap-1">
                              <Button variant="outline" size="sm" className="h-6 text-[10px] px-2 text-[#16A34A]"><CheckCircle2 className="h-3 w-3 mr-1" />Approve</Button>
                              <Button variant="outline" size="sm" className="h-6 text-[10px] px-2 text-[#DC2626]"><span>✕</span></Button>
                            </div>
                          ) : (
                            <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2"><Settings className="h-3 w-3" /></Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Communication Tab ── */}
        <TabsContent value="communication" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {MOCK_COMM_STATUS.map((comm) => {
              const CommIcon = comm.icon;
              return (
                <Card key={comm.channel} className="hover:shadow-card-lg transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <div className="h-10 w-10 flex items-center justify-center rounded-lg bg-navy/10">
                          <CommIcon className="h-5 w-5 text-navy" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold">{comm.channel}</p>
                          <p className="text-[10px] text-muted-foreground">{comm.provider}</p>
                        </div>
                      </div>
                      <Switch checked={comm.active} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-lg border border-border p-2">
                        <p className="text-[10px] text-muted-foreground">Sent Today</p>
                        <p className="text-lg font-bold font-display">{comm.sentToday}</p>
                      </div>
                      <div className="rounded-lg border border-border p-2">
                        <p className="text-[10px] text-muted-foreground">Pending</p>
                        <p className="text-lg font-bold font-display">{comm.pending}</p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" className="w-full h-7 text-[10px] mt-3"><Send className="h-3 w-3 mr-1" /> Send Message</Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* ── Task Automation Tab ── */}
        <TabsContent value="task-automation" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Bot className="h-4 w-4 text-navy" /> Task Automation Rules
                </CardTitle>
                <Button size="sm" className="bg-navy hover:bg-navy-light text-white h-7 text-xs"><Plus className="h-3 w-3 mr-1" /> Add Rule</Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {MOCK_TASK_AUTOMATIONS.map((ta) => (
                <div key={ta.id} className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/50">
                  <div className="flex items-center gap-3">
                    <div className={cn("h-8 w-8 flex items-center justify-center rounded-lg", ta.enabled ? "bg-[#16A34A]/10" : "bg-muted")}>
                      <GitBranch className="h-4 w-4" style={{ color: ta.enabled ? "#16A34A" : "#6B7280" }} />
                    </div>
                    <div>
                      <p className="text-xs font-medium">{ta.rule}</p>
                      <p className="text-[10px] text-muted-foreground">Trigger: {ta.trigger}</p>
                    </div>
                  </div>
                  <Switch checked={ta.enabled} />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
