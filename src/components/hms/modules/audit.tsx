// Audit Log module
"use client";

import { useState } from "react";
import { useApi } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ShieldCheck, Search, AlertTriangle } from "lucide-react";
import { fmtDateTime, timeAgo } from "../shared";

const ACTION_CATEGORIES: Record<string, { label: string; color: string }> = {
  LOGIN: { label: "Login", color: "#0284C7" },
  LOGOUT: { label: "Logout", color: "#64748B" },
  CHECKIN: { label: "Check-in", color: "#16A34A" },
  CHECKOUT: { label: "Check-out", color: "#0369A1" },
  RESERVATION_CREATED: { label: "Reservation Created", color: "#1B3A6B" },
  RESERVATION_CANCELLED: { label: "Reservation Cancelled", color: "#DC2626" },
  RATE_OVERRIDE: { label: "Rate Override", color: "#D97706" },
  ROOM_STATUS_CHANGED: { label: "Room Status", color: "#0369A1" },
  PAYMENT_PROCESSED: { label: "Payment", color: "#16A34A" },
  VOID_LINE: { label: "Void Line", color: "#DC2626" },
  DISCOUNT_APPLIED: { label: "Discount", color: "#7C3AED" },
  HK_TASK_ASSIGNED: { label: "HK Task", color: "#0F766E" },
  MENU_PRICE_UPDATED: { label: "Menu Price", color: "#C9952A" },
  NIGHT_AUDIT_COMPLETED: { label: "Night Audit", color: "#1B3A6B" },
};

export function AuditModule() {
  const [actionFilter, setActionFilter] = useState("all");
  const [search, setSearch] = useState("");
  const { data, loading, error, reload } = useApi<any[]>(`/api/audit-log?limit=80${actionFilter !== "all" ? `&action=${actionFilter}` : ""}`, [actionFilter]);

  // Fallback audit log entries when API fails
  const FALLBACK_AUDIT_LOG = [
    { id: "al1", action: "CHECKIN", entityType: "Reservation", user_email: "reception@ariahotel.in", userRole: "receptionist", ipAddress: "192.168.1.45", occurredAt: new Date(Date.now() - 1800000).toISOString(), newValue: { guest: "Rajesh Kumar", room: "301" } },
    { id: "al2", action: "PAYMENT_PROCESSED", entityType: "Folio", user_email: "frontdesk@ariahotel.in", userRole: "front_desk", ipAddress: "192.168.1.42", occurredAt: new Date(Date.now() - 3600000).toISOString(), newValue: { amount: 15000, method: "UPI" } },
    { id: "al3", action: "RESERVATION_CREATED", entityType: "Reservation", user_email: "reservations@ariahotel.in", userRole: "reservation_agent", ipAddress: "192.168.1.38", occurredAt: new Date(Date.now() - 7200000).toISOString(), newValue: { guest: "Priya Sharma", confirmation: "ARI-2025-0143" } },
    { id: "al4", action: "ROOM_STATUS_CHANGED", entityType: "Room", user_email: "housekeeping@ariahotel.in", userRole: "hk_supervisor", ipAddress: "192.168.1.50", occurredAt: new Date(Date.now() - 10800000).toISOString(), newValue: { room: "801", from: "occupied", to: "dirty" } },
    { id: "al5", action: "NIGHT_AUDIT_COMPLETED", entityType: "System", user_email: "nightaudit@ariahotel.in", userRole: "night_auditor", ipAddress: "192.168.1.10", occurredAt: new Date(Date.now() - 28800000).toISOString(), newValue: { postingsCount: 24, revenuePosted: 148500 } },
    { id: "al6", action: "RATE_OVERRIDE", entityType: "Reservation", user_email: "gm@ariahotel.in", userRole: "gm", ipAddress: "192.168.1.5", occurredAt: new Date(Date.now() - 43200000).toISOString(), newValue: { from: 6500, to: 5200, reason: "Corporate rate" } },
  ];

  const rawData = data ?? FALLBACK_AUDIT_LOG;

  const filtered = (rawData || []).filter((l: any) =>
    !search ||
    l.action.toLowerCase().includes(search.toLowerCase()) ||
    (l.user_email || "").toLowerCase().includes(search.toLowerCase()) ||
    (l.entityType || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>Could not load live data. Showing sample data instead.</span>
          <button onClick={reload} className="ml-auto text-xs font-medium underline">Retry</button>
        </div>
      )}
      <Card className="border-gold/30 bg-gradient-to-r from-navy to-[#2E5FA3] text-white">
        <CardContent className="p-4 flex items-center gap-3">
          <ShieldCheck className="h-8 w-8 text-gold" />
          <div>
            <p className="font-display text-lg font-bold">Immutable Audit Trail</p>
            <p className="text-xs text-white/70">Every state change recorded · GDPR · PCI-DSS · ISO 27001 compliant</p>
          </div>
          <Badge className="ml-auto bg-gold text-navy">{filtered.length} events</Badge>
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center gap-2">
        <Select value={actionFilter} onValueChange={setActionFilter}>
          <SelectTrigger className="w-52 h-8 text-xs"><SelectValue placeholder="All actions" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All actions</SelectItem>
            {Object.entries(ACTION_CATEGORIES).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 flex-1 min-w-48">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Filter by user, entity…" className="w-full bg-transparent text-sm outline-none" />
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-14" />)}</div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="max-h-[70vh] overflow-y-auto">
              {filtered.map((l: any, i: number) => {
                const cat = ACTION_CATEGORIES[l.action] || { label: l.action, color: "#64748B" };
                return (
                  <div key={l.id} className="flex items-start gap-3 px-4 py-3 border-b border-border/60 last:border-0 hover:bg-muted/30">
                    <div className="flex flex-col items-center mt-1">
                      <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: cat.color }} />
                      {i < filtered.length - 1 && <div className="w-px flex-1 bg-border mt-1" style={{ minHeight: 24 }} />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold" style={{ color: cat.color }}>{cat.label}</span>
                        {l.entityType && <Badge variant="outline" className="text-[9px]">{l.entityType}</Badge>}
                        {l.ipAddress && <span className="text-[10px] text-muted-foreground font-mono-num">{l.ipAddress}</span>}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {l.user_email || "system"} · {l.userRole || "—"}
                      </p>
                      {l.newValue && (
                        <pre className="mt-1 text-[10px] text-muted-foreground bg-muted/40 rounded p-1.5 overflow-x-auto max-w-md">{JSON.stringify(l.newValue)}</pre>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-[10px] text-muted-foreground">{fmtDateTime(l.occurredAt)}</p>
                      <p className="text-[10px] text-muted-foreground/70">{timeAgo(l.occurredAt)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
