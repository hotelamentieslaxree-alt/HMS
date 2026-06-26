// Dashboard module — Owner/GM command center
"use client";

import { useApi } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import { KpiCard, RoomStatusBadge, ROOM_STATUS_META, ResStatusBadge, SOURCE_META, VipBadge, fmtINR, fmtDate, timeAgo } from "../shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BedDouble, IndianRupee, TrendingUp, Percent, LogIn, LogOut, Sparkles,
  Wrench, UtensilsCrossed, AlertCircle, Activity, ArrowRight, Users,
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, ResponsiveContainer,
  XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from "recharts";

const CHART_COLORS = ["#1B3A6B", "#C9952A", "#16A34A", "#0369A1", "#D97706", "#7C3AED"];

export function DashboardModule() {
  const { data, loading, reload } = useApi<any>("/api/dashboard", []);
  const { refreshTick, setActiveModule } = useAppStore();

  // re-fetch when refreshTick changes
  useApi<any>("/api/dashboard", [refreshTick]);

  if (loading || !data) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Skeleton className="h-80 rounded-xl lg:col-span-2" />
          <Skeleton className="h-80 rounded-xl" />
        </div>
      </div>
    );
  }

  const k = data.kpis;
  const statusCounts = data.statusCounts;
  const revenueSeries = data.revenueSeries?.slice(-14) ?? [];
  const channelSeries = data.channelSeries ?? [];

  return (
    <div className="space-y-6">
      {/* Business date banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gold/30 bg-gradient-to-r from-navy to-[#2E5FA3] px-5 py-4 text-white shadow-card">
        <div>
          <p className="text-[11px] uppercase tracking-widest text-gold/90">Business Date</p>
          <p className="font-display text-xl font-bold">{fmtDate(data.businessDate)}</p>
        </div>
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <Metric label="Occupancy" value={`${k.occupancyRate}%`} />
          <Divider />
          <Metric label="In-house" value={`${data.inHouseCount}`} />
          <Divider />
          <Metric label="Arrivals" value={`${data.arrivalsToday.length}`} />
          <Divider />
          <Metric label="Departures" value={`${data.departuresToday.length}`} />
        </div>
        <Button size="sm" variant="secondary" onClick={() => setActiveModule("night-audit")} className="bg-gold text-navy hover:bg-gold-light font-semibold">
          Run Night Audit
        </Button>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <KpiCard label="Occupancy" value={k.occupancyRate} unit="%" icon={Percent} accent="navy" hint={`${k.occupiedRooms}/${k.availableRooms} rooms`} delta={4.2} deltaLabel="vs last week" />
        <KpiCard label="ADR" value={fmtINR(k.adr)} icon={IndianRupee} accent="gold" hint="Avg daily rate" delta={2.8} deltaLabel="WoW" />
        <KpiCard label="RevPAR" value={fmtINR(k.revpar)} icon={TrendingUp} accent="success" hint="Per available room" delta={3.5} deltaLabel="WoW" />
        <KpiCard label="TRevPAR" value={fmtINR(k.trevpar)} icon={TrendingUp} accent="info" hint="Total revenue / room" delta={5.1} deltaLabel="WoW" />
        <KpiCard label="GOPPAR" value={fmtINR(k.goppar)} icon={IndianRupee} accent="navy" hint="Gross operating profit" delta={1.9} deltaLabel="WoW" />
        <KpiCard label="CPOR" value={fmtINR(k.cpor)} icon={BedDouble} accent="warning" hint="Cost per occupied room" delta={-1.2} deltaLabel="WoW" />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Revenue trend */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-display">Revenue Trend</CardTitle>
              <p className="text-xs text-muted-foreground">Last 14 days · Room vs F&B vs Other</p>
            </div>
            <Badge variant="secondary" className="text-[10px]">DAILY</Badge>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={revenueSeries} margin={{ top: 4, right: 8, left: -8, bottom: 0 }}>
                <defs>
                  <linearGradient id="gRoom" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#1B3A6B" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="#1B3A6B" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gFb" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#C9952A" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="#C9952A" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 10 }} tickFormatter={(d) => d.slice(5)} stroke="#94A3B8" />
                <YAxis tick={{ fontSize: 10 }} stroke="#94A3B8" tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{ borderRadius: 8, border: "1px solid #E2E8F0", fontSize: 12 }}
                  formatter={(v: any) => fmtINR(v)}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Area type="monotone" dataKey="room" name="Room" stroke="#1B3A6B" strokeWidth={2} fill="url(#gRoom)" />
                <Area type="monotone" dataKey="fb" name="F&B" stroke="#C9952A" strokeWidth={2} fill="url(#gFb)" />
                <Area type="monotone" dataKey="other" name="Other" stroke="#16A34A" strokeWidth={2} fill="transparent" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Channel mix */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-display">Channel Mix</CardTitle>
            <p className="text-xs text-muted-foreground">Revenue by booking source</p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={channelSeries}
                  dataKey="revenue"
                  nameKey="source"
                  cx="50%" cy="50%"
                  innerRadius={55} outerRadius={90}
                  paddingAngle={2}
                >
                  {channelSeries.map((_: any, i: number) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ borderRadius: 8, border: "1px solid #E2E8F0", fontSize: 12 }}
                  formatter={(v: any, n: any) => [fmtINR(v), SOURCE_META[n] || n]}
                />
                <Legend wrapperStyle={{ fontSize: 10 }} formatter={(v) => SOURCE_META[v] || v} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Room status + Arrivals/Departures */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Room status legend + mini grid */}
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-base font-display">Room Status Board</CardTitle>
            <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => setActiveModule("rooms")}>
              View all <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              {Object.entries(ROOM_STATUS_META).map(([key, m]) => (
                <div key={key} className={`rounded-lg border p-2 ${m.cls}`}>
                  <p className="text-lg font-bold tabular-nums">{statusCounts[key] ?? 0}</p>
                  <p className="text-[10px] font-medium uppercase">{m.short}</p>
                </div>
              ))}
            </div>
            <div className="rounded-lg bg-muted/40 p-3">
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground mb-2">Live occupancy gauge</p>
              <div className="relative h-3 w-full rounded-full bg-border overflow-hidden">
                <div className="absolute inset-y-0 left-0 bg-navy rounded-full" style={{ width: `${k.occupancyRate}%` }} />
                <div className="absolute inset-y-0 left-0 bg-gold/40 rounded-full" style={{ width: `${k.occupancyRate * 0.85}%` }} />
              </div>
              <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                <span>0</span>
                <span className="font-semibold text-foreground">{k.occupiedRooms} occupied</span>
                <span>{k.totalRooms}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Arrivals today */}
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-base font-display flex items-center gap-2"><LogIn className="h-4 w-4 text-[#16A34A]" /> Arrivals Today</CardTitle>
            <Badge variant="secondary" className="text-[10px]">{data.arrivalsToday.length}</Badge>
          </CardHeader>
          <CardContent>
            <div className="max-h-64 overflow-y-auto space-y-1.5 -mx-1 px-1">
              {data.arrivalsToday.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-8">No arrivals today</p>
              ) : data.arrivalsToday.map((r: any) => (
                <div key={r.id} className="flex items-center gap-2 rounded-lg border border-border/60 px-2 py-1.5 hover:bg-muted/40">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-navy/10 text-xs font-bold text-navy">
                    {r.guestName.split(" ").slice(1, 3).map((w: string) => w[0]).join("")}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold truncate flex items-center gap-1">
                      {r.guestName} <VipBadge vip={r.vip} />
                    </p>
                    <p className="text-[10px] text-muted-foreground">{r.category} · {r.nights}N · {SOURCE_META[r.bookingSource]}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-mono-num font-semibold">{r.assignedRoom ?? "—"}</p>
                    <p className="text-[10px] text-muted-foreground">{fmtINR(r.ratePerNight)}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Departures today */}
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-base font-display flex items-center gap-2"><LogOut className="h-4 w-4 text-[#D97706]" /> Departures Today</CardTitle>
            <Badge variant="secondary" className="text-[10px]">{data.departuresToday.length}</Badge>
          </CardHeader>
          <CardContent>
            <div className="max-h-64 overflow-y-auto space-y-1.5 -mx-1 px-1">
              {data.departuresToday.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-8">No departures today</p>
              ) : data.departuresToday.map((r: any) => (
                <div key={r.id} className="flex items-center gap-2 rounded-lg border border-border/60 px-2 py-1.5 hover:bg-muted/40">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#D97706]/10 text-xs font-bold text-[#D97706]">
                    {r.guestName.split(" ").slice(1, 3).map((w: string) => w[0]).join("")}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold truncate flex items-center gap-1">
                      {r.guestName} <VipBadge vip={r.vip} />
                    </p>
                    <p className="text-[10px] text-muted-foreground">{r.category} · {r.nights}N</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-mono-num font-semibold">{r.roomNumber ?? "—"}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Department health + Activity feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Department health */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-display">Department Health</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {data.departmentHealth.map((d: any) => {
                const Icon = d.code === "FO" ? Users : d.code === "HK" ? Sparkles : d.code === "FB" ? UtensilsCrossed : Wrench;
                const statusColor = d.status === "healthy" ? "#16A34A" : d.status === "busy" ? "#D97706" : "#DC2626";
                return (
                  <div key={d.code} className="rounded-xl border border-border p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
                        <Icon className="h-4 w-4 text-navy" />
                      </div>
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: statusColor }} />
                    </div>
                    <p className="text-sm font-semibold">{d.name}</p>
                    <p className="text-lg font-display font-bold text-foreground">{d.metric}</p>
                    <p className="text-[10px] text-muted-foreground line-clamp-1">{d.detail}</p>
                  </div>
                );
              })}
            </div>
            {/* HK task progress */}
            <div className="mt-4 rounded-lg bg-muted/40 p-3">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold flex items-center gap-1.5"><Sparkles className="h-3.5 w-3.5 text-gold" /> Housekeeping progress</p>
                <p className="text-xs text-muted-foreground">{data.hkSummary.completed + data.hkSummary.inspected}/{data.hkSummary.total} done</p>
              </div>
              <div className="flex h-2.5 w-full rounded-full overflow-hidden bg-border">
                <div className="bg-[#16A34A]" style={{ width: `${(data.hkSummary.inspected / data.hkSummary.total) * 100}%` }} title="Inspected" />
                <div className="bg-[#86EFAC]" style={{ width: `${(data.hkSummary.completed / data.hkSummary.total) * 100}%` }} title="Completed" />
                <div className="bg-[#D97706]" style={{ width: `${(data.hkSummary.inProgress / data.hkSummary.total) * 100}%` }} title="In progress" />
                <div className="bg-[#E2E8F0]" style={{ width: `${(data.hkSummary.pending / data.hkSummary.total) * 100}%` }} title="Pending" />
              </div>
              <div className="flex flex-wrap gap-3 mt-2 text-[10px] text-muted-foreground">
                <Legend2 color="#16A34A" label={`Inspected ${data.hkSummary.inspected}`} />
                <Legend2 color="#86EFAC" label={`Completed ${data.hkSummary.completed}`} />
                <Legend2 color="#D97706" label={`In progress ${data.hkSummary.inProgress}`} />
                <Legend2 color="#E2E8F0" label={`Pending ${data.hkSummary.pending}`} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Activity feed */}
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-base font-display flex items-center gap-2"><Activity className="h-4 w-4 text-gold" /> Activity Feed</CardTitle>
            <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => setActiveModule("audit")}>Full log</Button>
          </CardHeader>
          <CardContent>
            <div className="max-h-80 overflow-y-auto space-y-2 -mx-1 px-1">
              {data.auditFeed.map((a: any, i: number) => (
                <div key={a.id} className="flex gap-2.5">
                  <div className="flex flex-col items-center">
                    <div className="h-2 w-2 rounded-full bg-gold mt-1.5" />
                    {i < data.auditFeed.length - 1 && <div className="w-px flex-1 bg-border" />}
                  </div>
                  <div className="min-w-0 pb-2">
                    <p className="text-xs font-semibold text-foreground">{a.action.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, c => c.toUpperCase())}</p>
                    <p className="text-[10px] text-muted-foreground">{a.userRole} · {a.userEmail}</p>
                    <p className="text-[10px] text-muted-foreground/70">{timeAgo(a.occurredAt)}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts row */}
      {data.notifications?.length > 0 && (
        <Card className="border-gold/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-display flex items-center gap-2"><AlertCircle className="h-4 w-4 text-gold" /> Active Alerts & Approvals</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
              {data.notifications.slice(0, 6).map((n: any) => (
                <div key={n.id} className={`rounded-lg border p-3 ${
                  n.type === "error" ? "border-[#DC2626]/30 bg-[#DC2626]/5" :
                  n.type === "warning" ? "border-[#D97706]/30 bg-[#D97706]/5" :
                  n.type === "alert" ? "border-gold/30 bg-gold/5" :
                  n.type === "approval" ? "border-[#7C3AED]/30 bg-[#7C3AED]/5" :
                  "border-border bg-muted/30"
                }`}>
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs font-semibold text-foreground">{n.title}</p>
                    <span className="text-[9px] uppercase tracking-wider text-muted-foreground">{n.type}</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center">
      <p className="text-[10px] uppercase tracking-wider text-white/60">{label}</p>
      <p className="font-display text-lg font-bold">{value}</p>
    </div>
  );
}
function Divider() { return <div className="h-8 w-px bg-white/20" />; }
function Legend2({ color, label }: { color: string; label: string }) {
  return <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />{label}</span>;
}
