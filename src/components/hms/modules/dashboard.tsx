// Dashboard module — Role-specific dashboards
"use client";

import { cn } from "@/lib/utils";
import { useApi } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import { KpiCard, RoomStatusBadge, ROOM_STATUS_META, ResStatusBadge, SOURCE_META, VipBadge, fmtINR, fmtDate, timeAgo } from "../shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useEffect } from "react";
import {
  BedDouble, IndianRupee, TrendingUp, Percent, LogIn, LogOut, Sparkles,
  Wrench, UtensilsCrossed, AlertCircle, Activity, ArrowRight, Users,
  Shield, DollarSign, BarChart3, Clock, CheckCircle2, AlertTriangle,
  ClipboardList, ChefHat, CreditCard, Wallet, FileText, UserCog, Building2,
  MoonStar,
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, ResponsiveContainer,
  XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from "recharts";

const CHART_COLORS = ["#1B3A6B", "#C9952A", "#16A34A", "#0369A1", "#D97706", "#7C3AED"];

export function DashboardModule() {
  const { role } = useAppStore();

  // Route to the correct dashboard based on role
  const roleLevel = role.includes("owner") ? "owner" :
    role === "gm" ? "gm" :
    role === "fom" || role === "receptionist" ? "frontdesk" :
    role === "hk_mgr" || role === "hk_attendant" ? "housekeeping" :
    role === "fb_mgr" || role === "waiter" ? "fnb" :
    role === "fin_mgr" ? "finance" :
    role === "eng_mgr" || role === "technician" ? "engineering" :
    role === "rev_mgr" ? "revenue" :
    role === "hr_mgr" ? "hr" :
    "gm"; // fallback

  switch (roleLevel) {
    case "owner": return <OwnerDashboard />;
    case "gm": return <GMDashboard />;
    case "frontdesk": return <FrontDeskDashboard />;
    case "housekeeping": return <HousekeepingDashboard />;
    case "fnb": return <FnBDashboard />;
    case "finance": return <FinanceDashboard />;
    case "engineering": return <EngineeringDashboard />;
    case "revenue": return <RevenueDashboard />;
    case "hr": return <HRDashboard />;
    default: return <GMDashboard />;
  }
}

// ─── Shared hook for dashboard data ─────────────────────────────
function useDashboardData() {
  const { data, loading, reload } = useApi<any>("/api/dashboard", []);
  const { refreshTick } = useAppStore();
  useEffect(() => {
    if (refreshTick > 0) reload();
  }, [refreshTick, reload]);
  return { data, loading };
}

// ─── OWNER DASHBOARD ────────────────────────────────────────────
function OwnerDashboard() {
  const { data, loading } = useDashboardData();
  const { setActiveModule } = useAppStore();

  if (loading || !data) return <DashboardSkeleton />;

  const k = data.kpis;
  const revenueSeries = data.revenueSeries?.slice(-14) ?? [];
  const channelSeries = data.channelSeries ?? [];

  return (
    <div className="space-y-6">
      {/* Owner banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#7C3AED]/30 bg-gradient-to-r from-[#1B3A6B] to-[#2E5FA3] px-5 py-4 text-white shadow-card">
        <div>
          <p className="text-[11px] uppercase tracking-widest text-[#F0C96A]/90">Owner Command Center</p>
          <p className="font-display text-xl font-bold">{fmtDate(data.businessDate)}</p>
        </div>
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <Metric label="Occupancy" value={`${k.occupancyRate}%`} />
          <Divider />
          <Metric label="In-house" value={`${data.inHouseCount}`} />
          <Divider />
          <Metric label="Room Rev" value={fmtINR(k.adr * k.occupiedRooms)} />
          <Divider />
          <Metric label="RevPAR" value={fmtINR(k.revpar)} />
        </div>
        <Button size="sm" variant="secondary" onClick={() => setActiveModule("reports")} className="bg-gold text-navy hover:bg-gold-light font-semibold">
          Full Reports
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <KpiCard label="Occupancy" value={k.occupancyRate} unit="%" icon={Percent} accent="navy" hint={`${k.occupiedRooms}/${k.availableRooms} rooms`} delta={4.2} deltaLabel="vs last week" />
        <KpiCard label="ADR" value={fmtINR(k.adr)} icon={IndianRupee} accent="gold" hint="Avg daily rate" delta={2.8} deltaLabel="WoW" />
        <KpiCard label="RevPAR" value={fmtINR(k.revpar)} icon={TrendingUp} accent="success" hint="Per available room" delta={3.5} deltaLabel="WoW" />
        <KpiCard label="TRevPAR" value={fmtINR(k.trevpar)} icon={TrendingUp} accent="info" hint="Total revenue / room" delta={5.1} deltaLabel="WoW" />
        <KpiCard label="GOPPAR" value={fmtINR(k.goppar)} icon={IndianRupee} accent="navy" hint="Gross operating profit" delta={1.9} deltaLabel="WoW" />
        <KpiCard label="CPOR" value={fmtINR(k.cpor)} icon={BedDouble} accent="warning" hint="Cost per occupied room" delta={-1.2} deltaLabel="WoW" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-display">Revenue Trend (14 days)</CardTitle>
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
                <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #E2E8F0", fontSize: 12 }} formatter={(v: any) => fmtINR(v)} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Area type="monotone" dataKey="room" name="Room" stroke="#1B3A6B" strokeWidth={2} fill="url(#gRoom)" />
                <Area type="monotone" dataKey="fb" name="F&B" stroke="#C9952A" strokeWidth={2} fill="url(#gFb)" />
                <Area type="monotone" dataKey="other" name="Other" stroke="#16A34A" strokeWidth={2} fill="transparent" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-display">Channel Mix</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={channelSeries} dataKey="revenue" nameKey="source" cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={2}>
                  {channelSeries.map((_: any, i: number) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #E2E8F0", fontSize: 12 }} formatter={(v: any, n: any) => [fmtINR(v), SOURCE_META[n] || n]} />
                <Legend wrapperStyle={{ fontSize: 10 }} formatter={(v) => SOURCE_META[v] || v} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Department health + Arrivals */}
      <DepartmentHealthAndArrivals data={data} setActiveModule={setActiveModule} />
    </div>
  );
}

// ─── GM DASHBOARD ────────────────────────────────────────────────
function GMDashboard() {
  const { data, loading } = useDashboardData();
  const { setActiveModule } = useAppStore();

  if (loading || !data) return <DashboardSkeleton />;

  const k = data.kpis;

  return (
    <div className="space-y-6">
      {/* GM banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gold/30 bg-gradient-to-r from-navy to-[#2E5FA3] px-5 py-4 text-white shadow-card">
        <div>
          <p className="text-[11px] uppercase tracking-widest text-gold/90">General Manager · Operations Overview</p>
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

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <KpiCard label="Occupancy" value={k.occupancyRate} unit="%" icon={Percent} accent="navy" hint={`${k.occupiedRooms}/${k.availableRooms} rooms`} />
        <KpiCard label="ADR" value={fmtINR(k.adr)} icon={IndianRupee} accent="gold" hint="Avg daily rate" />
        <KpiCard label="RevPAR" value={fmtINR(k.revpar)} icon={TrendingUp} accent="success" />
        <KpiCard label="TRevPAR" value={fmtINR(k.trevpar)} icon={TrendingUp} accent="info" />
        <KpiCard label="GOPPAR" value={fmtINR(k.goppar)} icon={IndianRupee} accent="navy" />
        <KpiCard label="CPOR" value={fmtINR(k.cpor)} icon={BedDouble} accent="warning" />
      </div>

      {/* Room status + Arrivals/Departures */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <RoomStatusCard statusCounts={data.statusCounts} k={k} setActiveModule={setActiveModule} />
        <ArrivalsCard arrivals={data.arrivalsToday} />
        <DeparturesCard departures={data.departuresToday} />
      </div>

      {/* Department health + Activity */}
      <DepartmentHealthAndArrivals data={data} setActiveModule={setActiveModule} />
    </div>
  );
}

// ─── FRONT DESK DASHBOARD ────────────────────────────────────────
function FrontDeskDashboard() {
  const { data, loading } = useDashboardData();
  const { setActiveModule } = useAppStore();

  if (loading || !data) return <DashboardSkeleton />;

  return (
    <div className="space-y-6">
      {/* Front Desk banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#0369A1]/30 bg-gradient-to-r from-[#0369A1] to-[#0284C7] px-5 py-4 text-white shadow-card">
        <div>
          <p className="text-[11px] uppercase tracking-widest text-white/70">Front Office · Today's Operations</p>
          <p className="font-display text-xl font-bold">{fmtDate(data.businessDate)}</p>
        </div>
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <Metric label="Arrivals" value={`${data.arrivalsToday.length}`} />
          <Divider />
          <Metric label="Departures" value={`${data.departuresToday.length}`} />
          <Divider />
          <Metric label="In-house" value={`${data.inHouseCount}`} />
        </div>
        <Button size="sm" variant="secondary" onClick={() => setActiveModule("reservations")} className="bg-white text-[#0369A1] hover:bg-white/90 font-semibold">
          New Reservation
        </Button>
      </div>

      {/* Front desk KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Expected Arrivals" value={data.arrivalsToday.length} icon={LogIn} accent="info" />
        <KpiCard label="Expected Departures" value={data.departuresToday.length} icon={LogOut} accent="warning" />
        <KpiCard label="In-House Guests" value={data.inHouseCount ?? 0} icon={Users} accent="navy" />
        <KpiCard label="Occupancy" value={data.kpis.occupancyRate} unit="%" icon={Percent} accent="gold" />
      </div>

      {/* Arrivals + Departures */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ArrivalsCard arrivals={data.arrivalsToday} />
        <DeparturesCard departures={data.departuresToday} />
      </div>

      {/* Room status */}
      <RoomStatusCard statusCounts={data.statusCounts} k={data.kpis} setActiveModule={setActiveModule} />
    </div>
  );
}

// ─── HOUSEKEEPING DASHBOARD ──────────────────────────────────────
function HousekeepingDashboard() {
  const { data, loading } = useDashboardData();
  const { setActiveModule } = useAppStore();
  const { data: hkData } = useApi<any>("/api/housekeeping", []);

  if (loading || !data) return <DashboardSkeleton />;

  const hk = hkData?.summary ?? data.hkSummary;
  const tasks = hkData?.tasks ?? [];

  return (
    <div className="space-y-6">
      {/* HK banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#0F766E]/30 bg-gradient-to-r from-[#0F766E] to-[#14B8A6] px-5 py-4 text-white shadow-card">
        <div>
          <p className="text-[11px] uppercase tracking-widest text-white/70">Housekeeping Department</p>
          <p className="font-display text-xl font-bold">{fmtDate(data.businessDate)}</p>
        </div>
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <Metric label="Pending" value={`${hk?.pending ?? 0}`} />
          <Divider />
          <Metric label="In Progress" value={`${hk?.in_progress ?? 0}`} />
          <Divider />
          <Metric label="Completed" value={`${hk?.completed ?? 0}`} />
          <Divider />
          <Metric label="Inspected" value={`${hk?.inspected ?? 0}`} />
        </div>
        <Button size="sm" variant="secondary" onClick={() => setActiveModule("housekeeping")} className="bg-white text-[#0F766E] hover:bg-white/90 font-semibold">
          Task Board
        </Button>
      </div>

      {/* HK KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Total Tasks" value={hk?.total ?? 0} icon={ClipboardList} accent="navy" />
        <KpiCard label="Pending" value={hk?.pending ?? 0} icon={Clock} accent="warning" />
        <KpiCard label="In Progress" value={hk?.in_progress ?? 0} icon={Sparkles} accent="info" />
        <KpiCard label="Completed" value={(hk?.completed ?? 0) + (hk?.inspected ?? 0)} icon={CheckCircle2} accent="success" />
      </div>

      {/* Room status grid */}
      <RoomStatusCard statusCounts={data.statusCounts} k={data.kpis} setActiveModule={setActiveModule} />

      {/* Task list */}
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-base font-display flex items-center gap-2"><Sparkles className="h-4 w-4 text-gold" /> Today's Tasks</CardTitle>
          <Badge variant="secondary" className="text-[10px]">{tasks.length} tasks</Badge>
        </CardHeader>
        <CardContent>
          <div className="max-h-80 overflow-y-auto space-y-1.5">
            {tasks.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-8">No tasks found</p>
            ) : tasks.slice(0, 15).map((t: any) => (
              <div key={t.id} className="flex items-center gap-3 rounded-lg border border-border/60 px-3 py-2 hover:bg-muted/40">
                <div className={cn("h-2 w-2 rounded-full", {
                  "bg-[#DC2626]": t.priority === "urgent",
                  "bg-[#D97706]": t.priority === "high",
                  "bg-[#0369A1]": t.priority === "normal",
                  "bg-[#6B7280]": t.priority === "low",
                })} />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold">Room {t.room?.number ?? "—"} · {t.taskType?.replace(/_/g, " ")}</p>
                  <p className="text-[10px] text-muted-foreground">{t.assignee?.name ?? "Unassigned"}</p>
                </div>
                <Badge variant="outline" className={cn("text-[10px]", {
                  "border-[#DC2626] text-[#DC2626]": t.status === "pending",
                  "border-[#D97706] text-[#D97706]": t.status === "in_progress",
                  "border-[#16A34A] text-[#16A34A]": t.status === "completed",
                  "border-[#0369A1] text-[#0369A1]": t.status === "inspected",
                })}>{t.status?.replace(/_/g, " ")}</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── F&B DASHBOARD ───────────────────────────────────────────────
function FnBDashboard() {
  const { data, loading } = useDashboardData();
  const { setActiveModule } = useAppStore();
  const { data: posData } = useApi<any>("/api/pos/outlets", []);

  if (loading || !data) return <DashboardSkeleton />;

  const outlets = Array.isArray(posData) ? posData : (posData?.outlets ?? []);

  return (
    <div className="space-y-6">
      {/* F&B banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#B45309]/30 bg-gradient-to-r from-[#B45309] to-[#D97706] px-5 py-4 text-white shadow-card">
        <div>
          <p className="text-[11px] uppercase tracking-widest text-white/70">Food & Beverage Department</p>
          <p className="font-display text-xl font-bold">{fmtDate(data.businessDate)}</p>
        </div>
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <Metric label="Outlets" value={`${outlets.length}`} />
          <Divider />
          <Metric label="Occupancy" value={`${data.kpis.occupancyRate}%`} />
        </div>
        <Button size="sm" variant="secondary" onClick={() => setActiveModule("pos")} className="bg-white text-[#B45309] hover:bg-white/90 font-semibold">
          Open POS
        </Button>
      </div>

      {/* F&B KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Active Outlets" value={outlets.length} icon={UtensilsCrossed} accent="gold" />
        <KpiCard label="Occupancy" value={data.kpis.occupancyRate} unit="%" icon={Percent} accent="navy" />
        <KpiCard label="In-House Guests" value={data.inHouseCount ?? 0} icon={Users} accent="info" />
        <KpiCard label="Tables Available" value={outlets.reduce((sum: number, o: any) => sum + (o.tableCount ?? 0), 0)} icon={CheckCircle2} accent="success" />
      </div>

      {/* Outlets grid */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-display flex items-center gap-2"><ChefHat className="h-4 w-4 text-gold" /> Outlets</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {outlets.map((o: any) => (
              <div key={o.id} className="rounded-xl border border-border p-3 hover:shadow-card transition-shadow">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gold/10">
                    <UtensilsCrossed className="h-4 w-4 text-gold" />
                  </div>
                  <Badge variant="outline" className={cn("text-[10px]", o.isActive ? "border-[#16A34A] text-[#16A34A]" : "border-[#DC2626] text-[#DC2626]")}>
                    {o.isActive ? "Open" : "Closed"}
                  </Badge>
                </div>
                <p className="text-sm font-semibold">{o.name}</p>
                <p className="text-[10px] text-muted-foreground">{o.type?.replace(/_/g, " ")} · {o.tableCount} tables</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── FINANCE DASHBOARD ───────────────────────────────────────────
function FinanceDashboard() {
  const { data, loading } = useDashboardData();
  const { setActiveModule } = useAppStore();
  const { data: reportData } = useApi<any>("/api/reports?type=daily_revenue", []);

  if (loading || !data) return <DashboardSkeleton />;

  const k = data.kpis;

  return (
    <div className="space-y-6">
      {/* Finance banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#15803D]/30 bg-gradient-to-r from-[#15803D] to-[#16A34A] px-5 py-4 text-white shadow-card">
        <div>
          <p className="text-[11px] uppercase tracking-widest text-white/70">Finance & Accounts</p>
          <p className="font-display text-xl font-bold">{fmtDate(data.businessDate)}</p>
        </div>
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <Metric label="Room Revenue" value={fmtINR(k.adr * k.occupiedRooms)} />
          <Divider />
          <Metric label="ADR" value={fmtINR(k.adr)} />
          <Divider />
          <Metric label="RevPAR" value={fmtINR(k.revpar)} />
        </div>
        <Button size="sm" variant="secondary" onClick={() => setActiveModule("folios")} className="bg-white text-[#15803D] hover:bg-white/90 font-semibold">
          View Folios
        </Button>
      </div>

      {/* Finance KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="TRevPAR" value={fmtINR(k.trevpar)} icon={DollarSign} accent="success" />
        <KpiCard label="GOPPAR" value={fmtINR(k.goppar)} icon={TrendingUp} accent="navy" />
        <KpiCard label="ADR" value={fmtINR(k.adr)} icon={IndianRupee} accent="gold" />
        <KpiCard label="CPOR" value={fmtINR(k.cpor)} icon={CreditCard} accent="warning" />
      </div>

      {/* Revenue trend */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-display flex items-center gap-2"><BarChart3 className="h-4 w-4 text-gold" /> Revenue Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.revenueSeries?.slice(-14) ?? []} margin={{ top: 4, right: 8, left: -8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 10 }} tickFormatter={(d) => d.slice(5)} stroke="#94A3B8" />
              <YAxis tick={{ fontSize: 10 }} stroke="#94A3B8" tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
              <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #E2E8F0", fontSize: 12 }} formatter={(v: any) => fmtINR(v)} />
              <Bar dataKey="room" name="Room" fill="#1B3A6B" radius={[4, 4, 0, 0]} />
              <Bar dataKey="fb" name="F&B" fill="#C9952A" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Quick actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <QuickAction icon={FileText} label="Daily Revenue" onClick={() => setActiveModule("reports")} />
        <QuickAction icon={Wallet} label="GST Report" onClick={() => setActiveModule("reports")} />
        <QuickAction icon={CreditCard} label="Payment Methods" onClick={() => setActiveModule("reports")} />
        <QuickAction icon={MoonStar} label="Night Audit" onClick={() => setActiveModule("night-audit")} />
      </div>
    </div>
  );
}

// ─── ENGINEERING DASHBOARD ───────────────────────────────────────
function EngineeringDashboard() {
  const { data, loading } = useDashboardData();
  const { setActiveModule } = useAppStore();
  const { data: maintData } = useApi<any>("/api/maintenance", []);

  if (loading || !data) return <DashboardSkeleton />;

  const tickets = maintData?.tickets ?? [];
  const openTickets = tickets.filter((t: any) => t.status === "open" || t.status === "in_progress");

  return (
    <div className="space-y-6">
      {/* Engineering banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#DC2626]/30 bg-gradient-to-r from-[#7F1D1D] to-[#DC2626] px-5 py-4 text-white shadow-card">
        <div>
          <p className="text-[11px] uppercase tracking-widest text-white/70">Engineering & Maintenance</p>
          <p className="font-display text-xl font-bold">{fmtDate(data.businessDate)}</p>
        </div>
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <Metric label="Open Tickets" value={`${openTickets.length}`} />
          <Divider />
          <Metric label="OOO Rooms" value={`${data.statusCounts?.out_of_order ?? 0}`} />
        </div>
        <Button size="sm" variant="secondary" onClick={() => setActiveModule("maintenance")} className="bg-white text-[#DC2626] hover:bg-white/90 font-semibold">
          All Tickets
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Open Tickets" value={openTickets.length} icon={AlertTriangle} accent="error" />
        <KpiCard label="OOO Rooms" value={data.statusCounts?.out_of_order ?? 0} icon={Wrench} accent="warning" />
        <KpiCard label="OOS Rooms" value={data.statusCounts?.out_of_service ?? 0} icon={Building2} accent="info" />
        <KpiCard label="Occupancy" value={data.kpis.occupancyRate} unit="%" icon={Percent} accent="navy" />
      </div>

      {/* Ticket list */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-display flex items-center gap-2"><Wrench className="h-4 w-4 text-gold" /> Active Tickets</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="max-h-96 overflow-y-auto space-y-1.5">
            {openTickets.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-8">No active tickets</p>
            ) : openTickets.map((t: any) => (
              <div key={t.id} className="flex items-center gap-3 rounded-lg border border-border/60 px-3 py-2 hover:bg-muted/40">
                <div className={cn("h-2 w-2 rounded-full", {
                  "bg-[#DC2626]": t.priority === "urgent",
                  "bg-[#D97706]": t.priority === "high",
                  "bg-[#0369A1]": t.priority === "normal",
                  "bg-[#6B7280]": t.priority === "low",
                })} />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold">{t.title}</p>
                  <p className="text-[10px] text-muted-foreground">{t.room ? `Room ${t.room.number}` : "General"} · {t.category ?? "General"}</p>
                </div>
                <Badge variant="outline" className={cn("text-[10px]", {
                  "border-[#DC2626] text-[#DC2626]": t.status === "open",
                  "border-[#D97706] text-[#D97706]": t.status === "in_progress",
                })}>{t.status?.replace(/_/g, " ")}</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── REVENUE DASHBOARD ───────────────────────────────────────────
function RevenueDashboard() {
  const { data, loading } = useDashboardData();
  const { setActiveModule } = useAppStore();

  if (loading || !data) return <DashboardSkeleton />;

  const k = data.kpis;
  const revenueSeries = data.revenueSeries?.slice(-14) ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#7C3AED]/30 bg-gradient-to-r from-[#5B21B6] to-[#7C3AED] px-5 py-4 text-white shadow-card">
        <div>
          <p className="text-[11px] uppercase tracking-widest text-white/70">Revenue Management</p>
          <p className="font-display text-xl font-bold">{fmtDate(data.businessDate)}</p>
        </div>
        <Button size="sm" variant="secondary" onClick={() => setActiveModule("reports")} className="bg-white text-[#7C3AED] hover:bg-white/90 font-semibold">
          Analytics
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Occupancy" value={k.occupancyRate} unit="%" icon={Percent} accent="navy" delta={4.2} deltaLabel="WoW" />
        <KpiCard label="ADR" value={fmtINR(k.adr)} icon={IndianRupee} accent="gold" delta={2.8} deltaLabel="WoW" />
        <KpiCard label="RevPAR" value={fmtINR(k.revpar)} icon={TrendingUp} accent="success" delta={3.5} deltaLabel="WoW" />
        <KpiCard label="TRevPAR" value={fmtINR(k.trevpar)} icon={BarChart3} accent="info" delta={5.1} deltaLabel="WoW" />
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-display">Revenue Trend (14 days)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={320}>
            <AreaChart data={revenueSeries} margin={{ top: 4, right: 8, left: -8, bottom: 0 }}>
              <defs>
                <linearGradient id="gRoom2" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#7C3AED" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="#7C3AED" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 10 }} tickFormatter={(d) => d.slice(5)} stroke="#94A3B8" />
              <YAxis tick={{ fontSize: 10 }} stroke="#94A3B8" tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
              <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #E2E8F0", fontSize: 12 }} formatter={(v: any) => fmtINR(v)} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Area type="monotone" dataKey="room" name="Room" stroke="#7C3AED" strokeWidth={2} fill="url(#gRoom2)" />
              <Area type="monotone" dataKey="fb" name="F&B" stroke="#C9952A" strokeWidth={2} fill="transparent" />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Channel breakdown */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-display">Channel Production</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {(data.channelSeries ?? []).map((c: any, i: number) => (
              <div key={c.source} className="flex items-center gap-3">
                <span className="text-xs w-24 font-medium">{SOURCE_META[c.source] || c.source}</span>
                <div className="flex-1 h-4 rounded-full bg-border overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${Math.min(100, (c.revenue / (data.channelSeries[0]?.revenue || 1)) * 100)}%`, backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                </div>
                <span className="text-xs font-mono-num font-semibold w-20 text-right">{fmtINR(c.revenue)}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── HR DASHBOARD ────────────────────────────────────────────────
function HRDashboard() {
  const { data, loading } = useDashboardData();
  const { setActiveModule } = useAppStore();
  const { data: staffData } = useApi<any>("/api/staff", []);

  if (loading || !data) return <DashboardSkeleton />;

  // Staff API returns an array of users directly
  const staff = Array.isArray(staffData) ? staffData : (staffData?.users ?? []);
  // Derive departments from staff data
  const deptMap = new Map<string, { id: string; name: string; code: string }>();
  staff.forEach((s: any) => {
    if (s.department && s.departmentCode) {
      deptMap.set(s.departmentCode, { id: s.departmentCode, name: s.department, code: s.departmentCode });
    }
  });
  const departments = Array.from(deptMap.values());

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#BE185D]/30 bg-gradient-to-r from-[#9D174D] to-[#BE185D] px-5 py-4 text-white shadow-card">
        <div>
          <p className="text-[11px] uppercase tracking-widest text-white/70">Human Resources</p>
          <p className="font-display text-xl font-bold">{fmtDate(data.businessDate)}</p>
        </div>
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <Metric label="Staff" value={`${staff.length}`} />
          <Divider />
          <Metric label="Departments" value={`${departments.length}`} />
        </div>
        <Button size="sm" variant="secondary" onClick={() => setActiveModule("staff")} className="bg-white text-[#BE185D] hover:bg-white/90 font-semibold">
          Manage Staff
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Total Staff" value={staff.length} icon={Users} accent="navy" />
        <KpiCard label="Departments" value={departments.length} icon={Building2} accent="gold" />
        <KpiCard label="Active" value={staff.filter((s: any) => s.isActive).length} icon={UserCog} accent="success" />
        <KpiCard label="Occupancy" value={data.kpis.occupancyRate} unit="%" icon={Percent} accent="info" />
      </div>

      {/* Department breakdown */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-display">Department Staffing</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {departments.map((d: any) => {
              const deptStaff = staff.filter((s: any) => s.departmentCode === d.code);
              return (
                <div key={d.id} className="rounded-xl border border-border p-3">
                  <p className="text-sm font-semibold">{d.name}</p>
                  <p className="text-lg font-display font-bold">{deptStaff.length}</p>
                  <p className="text-[10px] text-muted-foreground">{d.code} department</p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Shared Components ───────────────────────────────────────────

function DashboardSkeleton() {
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

function RoomStatusCard({ statusCounts, k, setActiveModule }: any) {
  return (
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
          </div>
          <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
            <span>0</span>
            <span className="font-semibold text-foreground">{k.occupiedRooms} occupied</span>
            <span>{k.totalRooms}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ArrivalsCard({ arrivals }: any) {
  return (
    <Card>
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-base font-display flex items-center gap-2"><LogIn className="h-4 w-4 text-[#16A34A]" /> Arrivals Today</CardTitle>
        <Badge variant="secondary" className="text-[10px]">{arrivals?.length ?? 0}</Badge>
      </CardHeader>
      <CardContent>
        <div className="max-h-64 overflow-y-auto space-y-1.5 -mx-1 px-1">
          {!arrivals?.length ? (
            <p className="text-center text-sm text-muted-foreground py-8">No arrivals today</p>
          ) : arrivals.map((r: any) => (
            <div key={r.id} className="flex items-center gap-2 rounded-lg border border-border/60 px-2 py-1.5 hover:bg-muted/40">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-navy/10 text-xs font-bold text-navy">
                {r.guestName?.split(" ").slice(1, 3).map((w: string) => w[0]).join("") ?? "?"}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold truncate flex items-center gap-1">
                  {r.guestName} <VipBadge vip={r.vip} />
                </p>
                <p className="text-[10px] text-muted-foreground">{r.category} · {r.nights}N</p>
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
  );
}

function DeparturesCard({ departures }: any) {
  return (
    <Card>
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-base font-display flex items-center gap-2"><LogOut className="h-4 w-4 text-[#D97706]" /> Departures Today</CardTitle>
        <Badge variant="secondary" className="text-[10px]">{departures?.length ?? 0}</Badge>
      </CardHeader>
      <CardContent>
        <div className="max-h-64 overflow-y-auto space-y-1.5 -mx-1 px-1">
          {!departures?.length ? (
            <p className="text-center text-sm text-muted-foreground py-8">No departures today</p>
          ) : departures.map((r: any) => (
            <div key={r.id} className="flex items-center gap-2 rounded-lg border border-border/60 px-2 py-1.5 hover:bg-muted/40">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#D97706]/10 text-xs font-bold text-[#D97706]">
                {r.guestName?.split(" ").slice(1, 3).map((w: string) => w[0]).join("") ?? "?"}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold truncate">{r.guestName}</p>
                <p className="text-[10px] text-muted-foreground">{r.category} · {r.nights}N</p>
              </div>
              <p className="text-xs font-mono-num font-semibold">{r.roomNumber ?? "—"}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function DepartmentHealthAndArrivals({ data, setActiveModule }: any) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <Card className="lg:col-span-2">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-display">Department Health</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {(data.departmentHealth ?? []).map((d: any) => {
              const Icon = d.code === "FO" ? Users : d.code === "HK" ? Sparkles : d.code === "FB" ? UtensilsCrossed : Wrench;
              const statusColor = d.status === "healthy" ? "#16A34A" : d.status === "busy" ? "#D97706" : "#DC2626";
              return (
                <div key={d.code} className="rounded-xl border border-border p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted"><Icon className="h-4 w-4 text-navy" /></div>
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: statusColor }} />
                  </div>
                  <p className="text-sm font-semibold">{d.name}</p>
                  <p className="text-lg font-display font-bold text-foreground">{d.metric}</p>
                  <p className="text-[10px] text-muted-foreground line-clamp-1">{d.detail}</p>
                </div>
              );
            })}
          </div>
          {/* HK progress */}
          <div className="mt-4 rounded-lg bg-muted/40 p-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold flex items-center gap-1.5"><Sparkles className="h-3.5 w-3.5 text-gold" /> Housekeeping progress</p>
              <p className="text-xs text-muted-foreground">{(data.hkSummary?.completed ?? 0) + (data.hkSummary?.inspected ?? 0)}/{data.hkSummary?.total ?? 0} done</p>
            </div>
            <div className="flex h-2.5 w-full rounded-full overflow-hidden bg-border">
              <div className="bg-[#16A34A]" style={{ width: `${((data.hkSummary?.inspected ?? 0) / (data.hkSummary?.total || 1)) * 100}%` }} />
              <div className="bg-[#86EFAC]" style={{ width: `${((data.hkSummary?.completed ?? 0) / (data.hkSummary?.total || 1)) * 100}%` }} />
              <div className="bg-[#D97706]" style={{ width: `${((data.hkSummary?.inProgress ?? 0) / (data.hkSummary?.total || 1)) * 100}%` }} />
              <div className="bg-[#E2E8F0]" style={{ width: `${((data.hkSummary?.pending ?? 0) / (data.hkSummary?.total || 1)) * 100}%` }} />
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-base font-display flex items-center gap-2"><Activity className="h-4 w-4 text-gold" /> Activity Feed</CardTitle>
          <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => setActiveModule("audit")}>Full log</Button>
        </CardHeader>
        <CardContent>
          <div className="max-h-80 overflow-y-auto space-y-2 -mx-1 px-1">
            {(data.auditFeed ?? []).map((a: any, i: number) => (
              <div key={a.id} className="flex gap-2.5">
                <div className="flex flex-col items-center">
                  <div className="h-2 w-2 rounded-full bg-gold mt-1.5" />
                  {i < (data.auditFeed?.length ?? 0) - 1 && <div className="w-px flex-1 bg-border" />}
                </div>
                <div className="min-w-0 pb-2">
                  <p className="text-xs font-semibold text-foreground">{a.action?.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c: string) => c.toUpperCase())}</p>
                  <p className="text-[10px] text-muted-foreground">{a.userRole} · {a.userEmail}</p>
                  <p className="text-[10px] text-muted-foreground/70">{timeAgo(a.occurredAt)}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function QuickAction({ icon: Icon, label, onClick }: { icon: any; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 hover:shadow-card transition-shadow text-left w-full">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted"><Icon className="h-4 w-4 text-navy" /></div>
      <p className="text-sm font-semibold">{label}</p>
    </button>
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


