// ARIA HMS — Attendance Module (HR-only, standalone)
"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { cn } from "@/lib/utils";
import { useApi, apiPost, apiPut } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import { KpiCard, fmtINR, fmtDate, fmtDateTime, timeAgo } from "../shared";
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
  Users, UserCheck, Clock, Calendar, CalendarDays, Upload, Plus, Search,
  ChevronLeft, ChevronRight, FileSpreadsheet, ClipboardList, CheckCheck,
  BarChart3, TrendingUp, AlertTriangle as AlertTriangleIcon, Timer, Coffee,
  Download, Filter, X, FileText,
} from "lucide-react";
import {
  BarChart, Bar, PieChart, Pie, Cell, ResponsiveContainer,
  XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from "recharts";

// ─── Fallback data when API fails ────────────────────────────────
const FALLBACK_ATT_DATA = {
  summary: { attendanceRate: 92, totalPresent: 38, totalAbsent: 3, totalLate: 2, totalOnLeave: 1 },
  todayAttendance: [
    { id: "att1", userId: "e1", status: "present", checkIn: new Date().toISOString(), checkOut: null, date: new Date().toISOString(), user: { firstName: "Vikram", lastName: "Singh", employeeCode: "EMP-001", department: "Management" } },
    { id: "att2", userId: "e2", status: "present", checkIn: new Date().toISOString(), checkOut: null, date: new Date().toISOString(), user: { firstName: "Deepa", lastName: "Nair", employeeCode: "EMP-002", department: "Front Office" } },
    { id: "att3", userId: "e3", status: "late", checkIn: new Date().toISOString(), checkOut: null, date: new Date().toISOString(), user: { firstName: "Ramesh", lastName: "Patel", employeeCode: "EMP-003", department: "Front Office" } },
  ],
  attendance: [],
};

const FALLBACK_EMP_DATA = [
  { id: "e1", firstName: "Vikram", lastName: "Singh", fullName: "Vikram Singh", email: "vikram.singh@ariahotel.in", phone: "+91-98100-12345", employeeCode: "EMP-001", role: "gm", isActive: true, isOnLeave: false, department: "Management", departmentCode: "Management" },
  { id: "e2", firstName: "Deepa", lastName: "Nair", fullName: "Deepa Nair", email: "deepa.nair@ariahotel.in", phone: "+91-98200-23456", employeeCode: "EMP-002", role: "fom", isActive: true, isOnLeave: false, department: "Front Office", departmentCode: "Front Office" },
  { id: "e3", firstName: "Ramesh", lastName: "Patel", fullName: "Ramesh Patel", email: "ramesh.patel@ariahotel.in", phone: "+91-98300-34567", employeeCode: "EMP-003", role: "receptionist", isActive: true, isOnLeave: false, department: "Front Office", departmentCode: "Front Office" },
  { id: "e4", firstName: "Sunita", lastName: "Devi", fullName: "Sunita Devi", email: "sunita.devi@ariahotel.in", phone: "+91-98400-45678", employeeCode: "EMP-004", role: "hk_mgr", isActive: true, isOnLeave: false, department: "Housekeeping", departmentCode: "Housekeeping" },
];

const API_ERROR_BANNER = ({ error, reload }: { error: string | null; reload?: () => void }) => {
  if (!error) return null;
  return (
    <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
      <AlertTriangleIcon className="h-4 w-4 shrink-0" />
      <span>Could not load live data. Showing sample data instead.</span>
      {reload && <button onClick={reload} className="ml-auto text-xs font-medium underline">Retry</button>}
    </div>
  );
};

// ─── Constants ────────────────────────────────────────────────────────

const CC = ["#1B3A6B", "#C9952A", "#16A34A", "#0369A1", "#D97706", "#7C3AED", "#DC2626", "#0F766E"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTH_FULL = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DAYS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAYS_MIN = ["S", "M", "T", "W", "T", "F", "S"];
const STATUS_OPTIONS = ["present", "absent", "late", "half_day", "on_leave"] as const;

const ATTENDANCE_COLORS: Record<string, string> = {
  present: "bg-[#DCFCE7] text-[#14532D] border-[#16A34A]",
  absent: "bg-[#FFE4E6] text-[#881337] border-[#DC2626]",
  late: "bg-[#FEF3C7] text-[#78350F] border-[#D97706]",
  half_day: "bg-[#DBEAFE] text-[#1B3A6B] border-[#0369A1]",
  on_leave: "bg-[#F3E8FF] text-[#4C1D95] border-[#7C3AED]",
  holiday: "bg-muted text-muted-foreground border-border",
  weekly_off: "bg-muted text-muted-foreground border-border",
};

const ATTENDANCE_DOT: Record<string, string> = {
  present: "#16A34A",
  absent: "#DC2626",
  late: "#D97706",
  half_day: "#0369A1",
  on_leave: "#7C3AED",
  holiday: "#6B7280",
  weekly_off: "#6B7280",
};

const STATUS_LABEL: Record<string, string> = {
  present: "Present",
  absent: "Absent",
  late: "Late",
  half_day: "Half Day",
  on_leave: "On Leave",
  holiday: "Holiday",
  weekly_off: "Weekly Off",
};

const now = new Date();

// ─── Helpers ──────────────────────────────────────────────────────────

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month - 1, 1).getDay();
}

function isToday(year: number, month: number, day: number): boolean {
  const t = new Date();
  return t.getFullYear() === year && t.getMonth() + 1 === month && t.getDate() === day;
}

function isWeekend(year: number, month: number, day: number): boolean {
  const d = new Date(year, month - 1, day).getDay();
  return d === 0;
}

function fmtTime(d: string | Date | null): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  if (isNaN(date.getTime())) return "—";
  return date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
}

function fmtHours(h: number | null | undefined): string {
  if (h == null) return "—";
  return `${h.toFixed(1)}h`;
}

function statusBadge(status: string) {
  const cls = ATTENDANCE_COLORS[status] || "bg-muted text-muted-foreground border-border";
  const label = STATUS_LABEL[status] || status;
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide", cls)}>
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: ATTENDANCE_DOT[status] || "#6B7280" }} />
      {label}
    </span>
  );
}

// ─── Skeleton Loader ──────────────────────────────────────────────────

function SkeletonGrid() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-64 rounded-xl" />
      <Skeleton className="h-48 rounded-xl" />
    </div>
  );
}

// ─── Sidebar-synced sub-module tabs ────────────────────────────────────

const ATT_TABS = [
  { key: "overview", label: "Overview", icon: BarChart3 },
  { key: "calendar", label: "Calendar", icon: Calendar },
  { key: "table", label: "Attendance Table", icon: ClipboardList },
  { key: "manual", label: "Manual Entry", icon: Clock },
  { key: "reports", label: "Reports", icon: FileText },
];

// ─── MAIN COMPONENT ───────────────────────────────────────────────────

// All valid tab keys (sidebar sub-modules + component-only tabs)
const ATT_ALL_TABS = ["overview", "calendar", "table", "manual", "upload", "reports"];

export function AttendanceModule() {
  const { activeSubModule, setActiveSubModule } = useAppStore();

  // Single source of truth: derive active tab from the store.
  // Sidebar navigation sets activeSubModule → this reacts instantly.
  // No local tab state needed — avoids stale-sync bugs and useEffect+setState lint issues.
  const tab = ATT_ALL_TABS.includes(activeSubModule) ? activeSubModule : "overview";

  const handleTabChange = (newTab: string) => {
    // Always sync tab selection back to the store so sidebar highlight stays in sync
    setActiveSubModule(newTab);
  };

  const activeTabMeta = ATT_TABS.find((t) => t.key === tab);

  return (
    <div className="space-y-4">
      {/* Module header */}
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#1B3A6B]/10">
          <Clock className="h-4.5 w-4.5 text-[#1B3A6B]" />
        </div>
        <div className="min-w-0">
          <h2 className="font-display text-lg font-bold tracking-tight text-foreground">Attendance</h2>
          <p className="text-xs text-muted-foreground">{activeTabMeta?.label ?? "Overview"} · HR Department Only</p>
        </div>
      </div>

      <Tabs value={tab} onValueChange={handleTabChange} className="space-y-4">
        <TabsList className="flex-wrap">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="calendar">Calendar</TabsTrigger>
          <TabsTrigger value="table">Attendance Table</TabsTrigger>
          <TabsTrigger value="manual">Manual Entry</TabsTrigger>
          <TabsTrigger value="upload">Bulk Upload</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>
        <TabsContent value="overview"><OverviewTab /></TabsContent>
        <TabsContent value="calendar"><CalendarTab /></TabsContent>
        <TabsContent value="table"><AttendanceTableTab /></TabsContent>
        <TabsContent value="manual"><ManualEntryTab /></TabsContent>
        <TabsContent value="upload"><BulkUploadTab /></TabsContent>
        <TabsContent value="reports"><ReportsTab /></TabsContent>
      </Tabs>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// TAB 1: OVERVIEW
// ═══════════════════════════════════════════════════════════════════════

function OverviewTab() {
  const m = now.getMonth() + 1;
  const y = now.getFullYear();
  const { data: attData, loading: l1, error: e1 } = useApi<any>(`/api/hr/attendance?month=${m}&year=${y}&view=daily`, [m, y]);
  const { data: empData, loading: l2 } = useApi<any>("/api/hr/employees?isActive=true", []);
  const { data: monthlyData, loading: l3 } = useApi<any>(`/api/hr/attendance?month=${m}&year=${y}&view=monthly`, [m, y]);

  const safeAttData = attData ?? FALLBACK_ATT_DATA;
  const summary = safeAttData.summary || {};
  const todayRecords: any[] = safeAttData.todayAttendance || [];
  const monthlyRecords: any[] = monthlyData?.attendance || [];
  const employees: any[] = Array.isArray(empData) ? empData : FALLBACK_EMP_DATA;
  const totalStaff = employees.length;

  // Today's KPIs
  const todayPresent = todayRecords.filter((r: any) => r.status === "present").length;
  const todayAbsent = todayRecords.filter((r: any) => r.status === "absent").length;
  const todayLate = todayRecords.filter((r: any) => r.status === "late").length;
  const todayOnLeave = todayRecords.filter((r: any) => r.status === "on_leave").length;
  const todayHalfDay = todayRecords.filter((r: any) => r.status === "half_day").length;
  const checkedIn = todayRecords.filter((r: any) => r.checkIn).length;
  const checkedOut = todayRecords.filter((r: any) => r.checkOut).length;

  // Attendance rate for today
  const totalMarked = todayRecords.length;
  const attRate = totalMarked > 0 ? Math.round(((todayPresent + todayLate + todayHalfDay) / totalMarked) * 10000) / 100 : 0;

  // Trend data with proper labels — hooks must be above early return
  const trendData = useMemo(() => {
    const sorted = [...monthlyRecords].sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const uniqueDays = [...new Set(sorted.map((r: any) => new Date(r.date).toISOString().slice(0, 10)))].slice(-7);
    return uniqueDays.map((ds) => {
      const dayRecs = monthlyRecords.filter((r: any) => new Date(r.date).toISOString().slice(0, 10) === ds);
      return {
        name: new Date(ds).toLocaleDateString("en-IN", { weekday: "short", day: "numeric" }),
        Present: dayRecs.filter((r: any) => r.status === "present" || r.status === "half_day").length,
        Absent: dayRecs.filter((r: any) => r.status === "absent").length,
        Late: dayRecs.filter((r: any) => r.status === "late").length,
      };
    });
  }, [monthlyRecords]);

  if (l1 || l2 || l3) return <SkeletonGrid />;

  // Status distribution pie
  const statusPie = [
    { name: "Present", value: summary.totalPresent || todayPresent, color: CC[2] },
    { name: "Absent", value: summary.totalAbsent || todayAbsent, color: CC[6] },
    { name: "Late", value: summary.totalLate || todayLate, color: CC[4] },
    { name: "Half Day", value: summary.totalHalfDay || todayHalfDay, color: CC[3] },
    { name: "On Leave", value: summary.totalOnLeave || todayOnLeave, color: CC[5] },
  ].filter((d) => d.value > 0);

  // Recent activity
  const recentRecords = [...monthlyRecords]
    .sort((a: any, b: any) => new Date(b.updatedAt || b.date).getTime() - new Date(a.updatedAt || a.date).getTime())
    .slice(0, 8);

  return (
    <div className="space-y-5">
      <API_ERROR_BANNER error={e1} />
      {/* Today's KPIs */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <h2 className="font-display text-sm font-semibold text-foreground">Today&apos;s Overview</h2>
          <Badge variant="outline" className="text-[10px]">{fmtDate(now)}</Badge>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
          <KpiCard label="Present" value={todayPresent} icon={UserCheck} accent="success" hint={`${checkedIn} checked in`} />
          <KpiCard label="Absent" value={todayAbsent} icon={Users} accent="error" />
          <KpiCard label="Late Arrivals" value={todayLate} icon={Timer} accent="warning" />
          <KpiCard label="On Leave" value={todayOnLeave} icon={Coffee} accent="navy" />
          <KpiCard label="Half Day" value={todayHalfDay} icon={Clock} accent="info" />
        </div>
      </div>

      {/* Secondary KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Attendance Rate" value={attRate} unit="%" icon={TrendingUp} accent="gold" />
        <KpiCard label="Total Staff" value={totalStaff} icon={Users} accent="navy" />
        <KpiCard label="Checked In" value={checkedIn} icon={UserCheck} accent="success" hint={`of ${totalStaff} staff`} />
        <KpiCard label="Checked Out" value={checkedOut} icon={Clock} accent="info" />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="font-display text-sm">Attendance Trend (Last 7 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            {trendData.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="Present" fill={CC[2]} radius={[3, 3, 0, 0]} />
                  <Bar dataKey="Late" fill={CC[4]} radius={[3, 3, 0, 0]} />
                  <Bar dataKey="Absent" fill={CC[6]} radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-16">No attendance data available</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="font-display text-sm">Status Distribution (This Month)</CardTitle>
          </CardHeader>
          <CardContent>
            {statusPie.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={statusPie} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} innerRadius={50}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                    {statusPie.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-16">No data for this month</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="font-display text-sm">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent className="max-h-72 overflow-y-auto">
          {recentRecords.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No recent attendance records</p>
          ) : (
            <div className="space-y-2">
              {recentRecords.map((r: any) => (
                <div key={r.id} className="flex items-center gap-3 py-2 border-b last:border-0">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#1B3A6B]/10 text-[#1B3A6B] text-xs font-bold">
                    {(r.user?.firstName || "?")[0]}{(r.user?.lastName || "")[0]}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{r.user?.firstName} {r.user?.lastName}</p>
                    <p className="text-[11px] text-muted-foreground">{r.user?.employeeCode} · {r.user?.department || "—"}</p>
                  </div>
                  <div className="text-right">
                    {statusBadge(r.status)}
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {fmtTime(r.checkIn)} – {fmtTime(r.checkOut)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// TAB 2: CALENDAR VIEW
// ═══════════════════════════════════════════════════════════════════════

function CalendarTab() {
  const [calMonth, setCalMonth] = useState(now.getMonth() + 1);
  const [calYear, setCalYear] = useState(now.getFullYear());
  const [selectedEmp, setSelectedEmp] = useState<string>("all");

  const { data: empData, loading: le, error: calError } = useApi<any>("/api/hr/employees?isActive=true", []);
  const { data, loading: la, error: calAttError } = useApi<any>(`/api/hr/attendance?month=${calMonth}&year=${calYear}`, [calMonth, calYear]);

  const employees: any[] = Array.isArray(empData) ? empData : FALLBACK_EMP_DATA;
  const safeData = data ?? { attendance: [] };
  const records: any[] = safeData.attendance || [];

  // Filter records by selected employee
  const filteredRecords = selectedEmp === "all" ? records : records.filter((r: any) => r.userId === selectedEmp);

  // Build a map: "YYYY-MM-DD" -> records[]
  const recordsByDate = useMemo(() => {
    const map: Record<string, any[]> = {};
    for (const r of filteredRecords) {
      const key = new Date(r.date).toISOString().slice(0, 10);
      if (!map[key]) map[key] = [];
      map[key].push(r);
    }
    return map;
  }, [filteredRecords]);

  // Build a map: "YYYY-MM-DD" -> dominant status for the day
  const dayStatusMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const [date, recs] of Object.entries(recordsByDate)) {
      // Pick the most common status for that day
      const counts: Record<string, number> = {};
      for (const r of recs) {
        counts[r.status] = (counts[r.status] || 0) + 1;
      }
      const dominant = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || "";
      map[date] = dominant;
    }
    return map;
  }, [recordsByDate]);

  // Per-employee status for calendar cells
  const empDayStatus = useMemo(() => {
    const map: Record<string, Record<string, string>> = {}; // userId -> date -> status
    for (const r of filteredRecords) {
      const dateKey = new Date(r.date).toISOString().slice(0, 10);
      if (!map[r.userId]) map[r.userId] = {};
      map[r.userId][dateKey] = r.status;
    }
    return map;
  }, [filteredRecords]);

  const daysInMonth = getDaysInMonth(calYear, calMonth);
  const firstDay = getFirstDayOfMonth(calYear, calMonth);

  const prevMonth = () => {
    if (calMonth === 1) { setCalMonth(12); setCalYear(calYear - 1); }
    else setCalMonth(calMonth - 1);
  };

  const nextMonth = () => {
    if (calMonth === 12) { setCalMonth(1); setCalYear(calYear + 1); }
    else setCalMonth(calMonth + 1);
  };

  const goToToday = () => {
    setCalMonth(now.getMonth() + 1);
    setCalYear(now.getFullYear());
  };

  if (le || la) return <SkeletonGrid />;

  // Build calendar grid
  const calendarCells: { day: number; dateStr: string; isWeekend: boolean; isCurrentMonth: boolean }[] = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${calYear}-${String(calMonth).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    calendarCells.push({ day: d, dateStr, isWeekend: isWeekend(calYear, calMonth, d), isCurrentMonth: true });
  }

  // Display employees for the per-employee calendar
  const displayEmployees = selectedEmp === "all" ? employees.slice(0, 15) : employees.filter((e: any) => e.id === selectedEmp);

  return (
    <div className="space-y-4">
      <API_ERROR_BANNER error={calError || calAttError} />
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" variant="outline" onClick={prevMonth}><ChevronLeft className="h-4 w-4" /></Button>
        <Button size="sm" variant="outline" onClick={goToToday}>Today</Button>
        <Button size="sm" variant="outline" onClick={nextMonth}><ChevronRight className="h-4 w-4" /></Button>
        <span className="font-display font-semibold text-sm ml-2">{MONTH_FULL[calMonth - 1]} {calYear}</span>

        <div className="ml-auto flex items-center gap-2">
          <Select value={selectedEmp} onValueChange={setSelectedEmp}>
            <SelectTrigger className="w-48"><SelectValue placeholder="All Employees" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Employees</SelectItem>
              {employees.map((e: any) => (
                <SelectItem key={e.id} value={e.id}>{e.fullName || `${e.firstName} ${e.lastName}`}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-3">
        {Object.entries(ATTENDANCE_COLORS).map(([status, cls]) => (
          <div key={status} className="flex items-center gap-1.5">
            <span className={cn("h-3 w-3 rounded-sm border", cls)} />
            <span className="text-[11px] text-muted-foreground">{STATUS_LABEL[status]}</span>
          </div>
        ))}
      </div>

      {/* Monthly Calendar Grid */}
      <Card>
        <CardContent className="p-4">
          {/* Day headers */}
          <div className="grid grid-cols-7 gap-1 mb-1">
            {DAYS_MIN.map((d, i) => (
              <div key={i} className={cn("text-center text-[10px] font-semibold uppercase tracking-wider py-1", i === 0 ? "text-[#DC2626]/60" : "text-muted-foreground")}>
                {d}
              </div>
            ))}
          </div>

          {/* Calendar rows */}
          <div className="grid grid-cols-7 gap-1">
            {/* Empty cells for offset */}
            {Array.from({ length: firstDay }).map((_, i) => (
              <div key={`empty-${i}`} className="aspect-square rounded-lg" />
            ))}

            {calendarCells.map((cell) => {
              const dayRecords = recordsByDate[cell.dateStr] || [];
              const dominant = dayStatusMap[cell.dateStr];
              const isTodayCell = isToday(calYear, calMonth, cell.day);
              const statusCls = dominant ? ATTENDANCE_COLORS[dominant] : "";

              return (
                <div
                  key={cell.day}
                  className={cn(
                    "aspect-square rounded-lg border p-1 flex flex-col items-center justify-center gap-0.5 transition-colors cursor-default",
                    isTodayCell ? "ring-2 ring-[#1B3A6B] ring-offset-1" : "",
                    cell.isWeekend && !dominant ? "bg-muted/30" : "",
                    statusCls || "bg-background border-border"
                  )}
                >
                  <span className={cn("text-xs font-bold", isTodayCell ? "text-[#1B3A6B]" : cell.isWeekend && !dominant ? "text-[#DC2626]/60" : "text-foreground")}>
                    {cell.day}
                  </span>
                  {dayRecords.length > 0 && (
                    <span className="text-[9px] font-medium leading-tight text-center">
                      {dayRecords.length}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Per-Employee Calendar Grid */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="font-display text-sm">Employee Attendance Grid</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-xs border-collapse min-w-[800px]">
            <thead>
              <tr>
                <th className="text-left py-1.5 px-2 font-semibold text-muted-foreground sticky left-0 bg-card z-10 min-w-[140px]">Employee</th>
                {calendarCells.map((cell) => (
                  <th
                    key={cell.day}
                    className={cn(
                      "py-1 px-0.5 font-medium text-center min-w-[28px]",
                      isToday(calYear, calMonth, cell.day) ? "text-[#1B3A6B] font-bold" : "text-muted-foreground",
                      cell.isWeekend ? "text-[#DC2626]/50" : ""
                    )}
                  >
                    {cell.day}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {displayEmployees.length === 0 ? (
                <tr>
                  <td colSpan={calendarCells.length + 1} className="text-center text-muted-foreground py-8">
                    No employees found
                  </td>
                </tr>
              ) : (
                displayEmployees.map((emp: any) => {
                  const empStatuses = empDayStatus[emp.id] || {};
                  return (
                    <tr key={emp.id} className="border-t hover:bg-muted/30 transition-colors">
                      <td className="py-1.5 px-2 font-medium sticky left-0 bg-card z-10">
                        <div className="flex items-center gap-2">
                          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#1B3A6B] text-white text-[9px] font-bold shrink-0">
                            {emp.firstName?.[0]}{emp.lastName?.[0]}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-[11px] font-semibold">{emp.firstName} {emp.lastName}</p>
                            <p className="text-[9px] text-muted-foreground">{emp.employeeCode}</p>
                          </div>
                        </div>
                      </td>
                      {calendarCells.map((cell) => {
                        const status = empStatuses[cell.dateStr];
                        const statusCls = status ? ATTENDANCE_COLORS[status] : "";
                        const isTodayCell = isToday(calYear, calMonth, cell.day);
                        return (
                          <td key={cell.day} className="py-1 px-0.5 text-center">
                            <div
                              className={cn(
                                "mx-auto h-5 w-5 rounded flex items-center justify-center text-[8px] font-bold",
                                statusCls || (cell.isWeekend ? "bg-muted/50 text-muted-foreground/50" : "bg-transparent"),
                                isTodayCell && !statusCls ? "ring-1 ring-[#1B3A6B]/30" : ""
                              )}
                              title={status ? `${STATUS_LABEL[status]} — ${emp.firstName} ${emp.lastName} — ${cell.dateStr}` : ""}
                            >
                              {status ? STATUS_LABEL[status]?.[0] || "" : cell.isWeekend ? "W" : ""}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// TAB 3: ATTENDANCE TABLE
// ═══════════════════════════════════════════════════════════════════════

function AttendanceTableTab() {
  const [month, setMonth] = useState(String(now.getMonth() + 1));
  const [year, setYear] = useState(String(now.getFullYear()));
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [view, setView] = useState("monthly");

  const { data, loading, error, reload } = useApi<any>(
    `/api/hr/attendance?month=${month}&year=${year}&view=${view}`,
    [month, year, view]
  );

  const summary = data?.summary || FALLBACK_ATT_DATA.summary;
  const rawRecords: any[] = data?.attendance || data?.todayAttendance || FALLBACK_ATT_DATA.todayAttendance;

  // Client-side filtering
  const filtered = useMemo(() => {
    let recs = rawRecords;
    if (statusFilter !== "all") {
      recs = recs.filter((r: any) => r.status === statusFilter);
    }
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      recs = recs.filter((r: any) =>
        `${r.user?.firstName} ${r.user?.lastName}`.toLowerCase().includes(q) ||
        (r.user?.employeeCode || "").toLowerCase().includes(q) ||
        (r.user?.department || "").toLowerCase().includes(q)
      );
    }
    return recs;
  }, [rawRecords, statusFilter, searchTerm]);

  if (loading) return <SkeletonGrid />;

  return (
    <div className="space-y-4">
      <API_ERROR_BANNER error={error} reload={reload} />
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search employee..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <Select value={month} onValueChange={setMonth}>
          <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
          <SelectContent>
            {MONTHS.map((m, i) => <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>)}
          </SelectContent>
        </Select>

        <Input className="w-24" value={year} onChange={(e) => setYear(e.target.value)} placeholder="Year" />

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {STATUS_OPTIONS.map((s) => (
              <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex gap-1">
          {(["daily", "weekly", "monthly"] as const).map((v) => (
            <Button key={v} size="sm" variant={view === v ? "default" : "outline"} onClick={() => setView(v)}>
              {v.charAt(0).toUpperCase() + v.slice(1)}
            </Button>
          ))}
        </div>

        {(statusFilter !== "all" || searchTerm) && (
          <Button size="sm" variant="ghost" onClick={() => { setStatusFilter("all"); setSearchTerm(""); }}>
            <X className="h-3.5 w-3.5 mr-1" />Clear
          </Button>
        )}
      </div>

      {/* Quick summary */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <KpiCard label="Present" value={summary.totalPresent ?? 0} icon={UserCheck} accent="success" />
        <KpiCard label="Absent" value={summary.totalAbsent ?? 0} icon={Users} accent="error" />
        <KpiCard label="Late" value={summary.totalLate ?? 0} icon={Timer} accent="warning" />
        <KpiCard label="Half Day" value={summary.totalHalfDay ?? 0} icon={Clock} accent="info" />
        <KpiCard label="On Leave" value={summary.totalOnLeave ?? 0} icon={CalendarDays} accent="navy" />
        <KpiCard label="Att. Rate" value={summary.attendanceRate ?? 0} unit="%" icon={BarChart3} accent="gold" />
      </div>

      {/* Results count */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span>{filtered.length} record{filtered.length !== 1 ? "s" : ""} found</span>
        {(statusFilter !== "all" || searchTerm) && <span className="text-[#1B3A6B] font-medium">(filtered)</span>}
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Employee</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Check-In</TableHead>
              <TableHead>Check-Out</TableHead>
              <TableHead>Work Hours</TableHead>
              <TableHead>Overtime</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Source</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-muted-foreground py-12">
                  <div className="flex flex-col items-center gap-2">
                    <AlertTriangleIcon className="h-8 w-8 text-muted-foreground/40" />
                    <p>No attendance records found</p>
                    <p className="text-[11px]">Try adjusting filters or selecting a different month</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((r: any) => (
                <TableRow key={r.id} className="hover:bg-muted/30 transition-colors">
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#1B3A6B] text-white text-[10px] font-bold shrink-0">
                        {(r.user?.firstName || "?")[0]}{(r.user?.lastName || "")[0]}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{r.user?.firstName} {r.user?.lastName}</p>
                        <p className="text-[10px] text-muted-foreground">{r.user?.employeeCode}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-xs">{r.user?.department || "—"}</TableCell>
                  <TableCell className="font-mono text-xs">{fmtDate(r.date)}</TableCell>
                  <TableCell className="font-mono text-xs">{fmtTime(r.checkIn)}</TableCell>
                  <TableCell className="font-mono text-xs">{fmtTime(r.checkOut)}</TableCell>
                  <TableCell className="font-mono text-xs">{fmtHours(r.workHours)}</TableCell>
                  <TableCell className="font-mono text-xs">{r.overtimeHours ? `${r.overtimeHours.toFixed(1)}h` : "—"}</TableCell>
                  <TableCell>{statusBadge(r.status)}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-[10px] capitalize">{r.source || "manual"}</Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// TAB 4: MANUAL ENTRY
// ═══════════════════════════════════════════════════════════════════════

function ManualEntryTab() {
  const [markOpen, setMarkOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    userId: "",
    date: now.toISOString().slice(0, 10),
    checkIn: "09:00",
    checkOut: "18:00",
    status: "present",
    notes: "",
  });

  const { data: empData, loading: le, error: meError } = useApi<any>("/api/hr/employees?isActive=true", []);
  const m = now.getMonth() + 1;
  const y = now.getFullYear();
  const { data: attData, loading: la, reload, error: meAttError } = useApi<any>(`/api/hr/attendance?month=${m}&year=${y}&view=daily`, [m, y]);
  const { triggerRefresh } = useAppStore();

  const employees: any[] = Array.isArray(empData) ? empData : FALLBACK_EMP_DATA;
  const safeAttData = attData ?? FALLBACK_ATT_DATA;
  const todayRecords: any[] = safeAttData.todayAttendance || [];

  const handleMark = async () => {
    if (!form.userId) { toast.error("Please select an employee"); return; }
    if (!form.date) { toast.error("Please select a date"); return; }
    setSaving(true);
    try {
      const dateStr = form.date;
      const checkInDate = form.checkIn ? new Date(`${dateStr}T${form.checkIn}:00`) : null;
      const checkOutDate = form.checkOut ? new Date(`${dateStr}T${form.checkOut}:00`) : null;

      await apiPost("/api/hr/attendance", {
        userId: form.userId,
        date: form.date,
        checkIn: checkInDate?.toISOString(),
        checkOut: checkOutDate?.toISOString(),
        status: form.status,
        notes: form.notes || undefined,
        source: "manual",
      });
      toast.success("Attendance recorded successfully");
      setMarkOpen(false);
      setForm({ userId: "", date: now.toISOString().slice(0, 10), checkIn: "09:00", checkOut: "18:00", status: "present", notes: "" });
      reload();
      triggerRefresh();
    } catch (e: any) {
      toast.error(e.message || "Failed to record attendance");
    } finally {
      setSaving(false);
    }
  };

  const markAllPresent = async () => {
    if (employees.length === 0) { toast.error("No employees found"); return; }
    setSaving(true);
    try {
      const today = now.toISOString().slice(0, 10);
      const recs = employees.map((e: any) => ({
        userId: e.id,
        date: today,
        status: "present" as const,
        checkIn: new Date(`${today}T09:00:00`).toISOString(),
        checkOut: null,
        source: "manual",
      }));
      await apiPut("/api/hr/attendance", { records: recs });
      toast.success(`Marked ${recs.length} employees as present`);
      reload();
      triggerRefresh();
    } catch (e: any) {
      toast.error(e.message || "Failed to mark attendance");
    } finally {
      setSaving(false);
    }
  };

  if (le || la) return <SkeletonGrid />;

  // Employees without today's record
  const markedIds = new Set(todayRecords.map((r: any) => r.userId));
  const unmarked = employees.filter((e: any) => !markedIds.has(e.id));

  return (
    <div className="space-y-4">
      <API_ERROR_BANNER error={meError || meAttError} reload={reload} />
      {/* Action buttons */}
      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={() => setMarkOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />Mark Attendance
        </Button>
        <Button variant="outline" onClick={markAllPresent} disabled={saving || unmarked.length === 0}>
          <CheckCheck className="h-4 w-4 mr-2" />Mark All Present ({unmarked.length} unmarked)
        </Button>
      </div>

      {/* Unmarked employees alert */}
      {unmarked.length > 0 && (
        <Card className="border-[#D97706]/30 bg-[#FEF3C7]/30">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertTriangleIcon className="h-5 w-5 text-[#D97706] shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-[#78350F]">
                  {unmarked.length} employee{unmarked.length !== 1 ? "s" : ""} without today&apos;s attendance
                </p>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {unmarked.slice(0, 10).map((e: any) => (
                    <Badge key={e.id} variant="outline" className="text-[10px]">{e.firstName} {e.lastName}</Badge>
                  ))}
                  {unmarked.length > 10 && (
                    <Badge variant="outline" className="text-[10px]">+{unmarked.length - 10} more</Badge>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Today's attendance records */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="font-display text-sm">Today&apos;s Attendance ({todayRecords.length} marked)</CardTitle>
            <Badge variant="outline" className="text-[10px]">{fmtDate(now)}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {todayRecords.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Clock className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
              <p className="text-sm">No attendance records for today</p>
              <p className="text-[11px] mt-1">Click &quot;Mark Attendance&quot; to add records</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Check-In</TableHead>
                    <TableHead>Check-Out</TableHead>
                    <TableHead>Hours</TableHead>
                    <TableHead>Overtime</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Source</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {todayRecords.map((r: any) => (
                    <TableRow key={r.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#1B3A6B] text-white text-[10px] font-bold shrink-0">
                            {(r.user?.firstName || "?")[0]}{(r.user?.lastName || "")[0]}
                          </div>
                          <div>
                            <p className="font-medium text-sm">{r.user?.firstName} {r.user?.lastName}</p>
                            <p className="text-[10px] text-muted-foreground">{r.user?.employeeCode} · {r.user?.department || "—"}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{fmtTime(r.checkIn)}</TableCell>
                      <TableCell className="font-mono text-xs">{fmtTime(r.checkOut)}</TableCell>
                      <TableCell className="font-mono text-xs">{fmtHours(r.workHours)}</TableCell>
                      <TableCell className="font-mono text-xs">{r.overtimeHours ? `${r.overtimeHours.toFixed(1)}h` : "—"}</TableCell>
                      <TableCell>{statusBadge(r.status)}</TableCell>
                      <TableCell><Badge variant="outline" className="text-[10px] capitalize">{r.source || "manual"}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Manual entry dialog */}
      <Dialog open={markOpen} onOpenChange={setMarkOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="font-display">Mark Attendance</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Employee select */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Employee</Label>
              <Select value={form.userId} onValueChange={(v) => setForm((f) => ({ ...f, userId: v }))}>
                <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                <SelectContent>
                  {employees.map((e: any) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.fullName || `${e.firstName} ${e.lastName}`} ({e.employeeCode})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Date</Label>
              <Input type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} />
            </div>

            {/* Check-in / Check-out */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Check-In Time</Label>
                <Input type="time" value={form.checkIn} onChange={(e) => setForm((f) => ({ ...f, checkIn: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Check-Out Time</Label>
                <Input type="time" value={form.checkOut} onChange={(e) => setForm((f) => ({ ...f, checkOut: e.target.value }))} />
              </div>
            </div>

            {/* Status */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s} value={s}>
                      <div className="flex items-center gap-2">
                        <span className={cn("h-2 w-2 rounded-full", ATTENDANCE_COLORS[s]?.split(" ")[0])} />
                        {STATUS_LABEL[s]}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Notes (optional)</Label>
              <Input
                placeholder="e.g. Late due to traffic"
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMarkOpen(false)} disabled={saving}>Cancel</Button>
            <Button onClick={handleMark} disabled={saving || !form.userId}>
              {saving ? "Saving..." : "Save Record"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// TAB 5: BULK UPLOAD
// ═══════════════════════════════════════════════════════════════════════

function BulkUploadTab() {
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [previewData, setPreviewData] = useState<any[] | null>(null);
  const [uploadResult, setUploadResult] = useState<{ processed: number; total: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { triggerRefresh } = useAppStore();

  const { data: empData } = useApi<any>("/api/hr/employees?isActive=true", []);
  const employees: any[] = Array.isArray(empData) ? empData : FALLBACK_EMP_DATA;

  // Build employee lookup by code
  const empByCode = useMemo(() => {
    const map: Record<string, any> = {};
    for (const e of employees) {
      if (e.employeeCode) map[e.employeeCode.toUpperCase()] = e;
    }
    return map;
  }, [employees]);

  const parseCSV = (text: string): any[] => {
    const lines = text.trim().split("\n");
    if (lines.length < 2) return [];
    const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
    const records: any[] = [];

    for (let i = 1; i < lines.length; i++) {
      const vals = lines[i].split(",").map((v) => v.trim());
      const row: Record<string, string> = {};
      headers.forEach((h, idx) => { row[h] = vals[idx] || ""; });

      // Match employee by code or name
      const empCode = (row["employee_code"] || row["employeecode"] || row["code"] || "").toUpperCase();
      const emp = empByCode[empCode];
      if (!emp) continue;

      const dateVal = row["date"] || "";
      const status = (row["status"] || "present").toLowerCase().replace(" ", "_");
      const checkIn = row["check_in"] || row["checkin"] || "";
      const checkOut = row["check_out"] || row["checkout"] || "";

      records.push({
        userId: emp.id,
        employeeName: `${emp.firstName} ${emp.lastName}`,
        employeeCode: emp.employeeCode,
        date: dateVal,
        status: Object.keys(STATUS_LABEL).includes(status) ? status : "present",
        checkIn,
        checkOut,
        _valid: !!dateVal,
      });
    }
    return records;
  };

  const handleFile = async (file: File) => {
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (ext !== "csv" && ext !== "xlsx" && ext !== "xls") {
      toast.error("Please upload a CSV or Excel file");
      return;
    }

    if (ext === "csv") {
      const text = await file.text();
      const records = parseCSV(text);
      if (records.length === 0) {
        toast.error("No valid records found. Ensure CSV has columns: employee_code, date, status");
        return;
      }
      setPreviewData(records);
      setUploadResult(null);
    } else {
      // For Excel, show template info since we can't parse xlsx client-side
      toast.info("Excel files will be processed server-side. Please ensure the format matches the template.");
      // Create minimal preview from first rows
      setPreviewData([{ _info: true, fileName: file.name, fileSize: `${(file.size / 1024).toFixed(1)} KB` }]);
      setUploadResult(null);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = () => setDragActive(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const handleUpload = async () => {
    if (!previewData) return;
    setUploading(true);
    try {
      const records = previewData
        .filter((r) => !r._info && r._valid)
        .map((r) => {
          const dateStr = r.date;
          const checkInDate = r.checkIn ? new Date(`${dateStr}T${r.checkIn}:00`) : null;
          const checkOutDate = r.checkOut ? new Date(`${dateStr}T${r.checkOut}:00`) : null;
          return {
            userId: r.userId,
            date: dateStr,
            checkIn: checkInDate?.toISOString(),
            checkOut: checkOutDate?.toISOString(),
            status: r.status,
            source: "excel",
          };
        });

      if (records.length === 0) {
        toast.error("No valid records to upload");
        setUploading(false);
        return;
      }

      const result = await apiPut("/api/hr/attendance", { records });
      setUploadResult({ processed: (result as any)?.summary?.processed ?? records.length, total: records.length });
      toast.success(`${records.length} attendance records uploaded successfully`);
      setPreviewData(null);
      triggerRefresh();
    } catch (e: any) {
      toast.error(e.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const downloadTemplate = () => {
    const header = "employee_code,date,status,check_in,check_out";
    const sampleRows = [
      "EMP-001,2025-01-15,present,09:00,18:00",
      "EMP-002,2025-01-15,late,09:45,18:00",
      "EMP-003,2025-01-15,absent,,",
      "EMP-004,2025-01-15,half_day,09:00,13:00",
      "EMP-005,2025-01-15,on_leave,,",
    ];
    const csv = [header, ...sampleRows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "attendance_template.csv";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Template downloaded");
  };

  return (
    <div className="space-y-4">
      {/* Template download */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="font-display text-sm">Download Template</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-3">
            Download the CSV template with the required column format before uploading attendance data.
          </p>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={downloadTemplate}>
              <Download className="h-4 w-4 mr-2" />Download CSV Template
            </Button>
          </div>
          <div className="mt-3 p-3 rounded-lg bg-muted/50">
            <p className="text-[11px] font-semibold text-muted-foreground mb-1">Required Columns:</p>
            <code className="text-[11px] text-foreground">employee_code, date, status, check_in, check_out</code>
            <p className="text-[11px] text-muted-foreground mt-1">
              Status values: present, absent, late, half_day, on_leave · Time format: HH:MM (24h) · Date format: YYYY-MM-DD
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Upload area */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="font-display text-sm">Upload Attendance Data</CardTitle>
        </CardHeader>
        <CardContent>
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className={cn(
              "relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 transition-colors cursor-pointer",
              dragActive ? "border-[#1B3A6B] bg-[#1B3A6B]/5" : "border-border hover:border-[#1B3A6B]/40 hover:bg-muted/20"
            )}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              className="hidden"
              onChange={handleInputChange}
            />
            <FileSpreadsheet className={cn("h-10 w-10 mb-3", dragActive ? "text-[#1B3A6B]" : "text-muted-foreground/40")} />
            <p className="text-sm font-medium">
              {dragActive ? "Drop file here" : "Drag & drop your CSV/Excel file here"}
            </p>
            <p className="text-[11px] text-muted-foreground mt-1">or click to browse · CSV, XLSX, XLS supported</p>
          </div>
        </CardContent>
      </Card>

      {/* Preview */}
      {previewData && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="font-display text-sm">Preview ({previewData.length} records)</CardTitle>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => { setPreviewData(null); setUploadResult(null); }}>
                  <X className="h-3.5 w-3.5 mr-1" />Cancel
                </Button>
                <Button size="sm" onClick={handleUpload} disabled={uploading}>
                  <Upload className="h-3.5 w-3.5 mr-1" />
                  {uploading ? "Uploading..." : "Confirm Upload"}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded-lg border max-h-72 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee Code</TableHead>
                    <TableHead>Employee Name</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Check-In</TableHead>
                    <TableHead>Check-Out</TableHead>
                    <TableHead>Valid</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewData.map((r: any, i: number) => (
                    <TableRow key={i}>
                      <TableCell className="font-mono text-xs">{r.employeeCode || "—"}</TableCell>
                      <TableCell className="text-sm">{r.employeeName || "—"}</TableCell>
                      <TableCell className="font-mono text-xs">{r.date || "—"}</TableCell>
                      <TableCell>{statusBadge(r.status)}</TableCell>
                      <TableCell className="font-mono text-xs">{r.checkIn || "—"}</TableCell>
                      <TableCell className="font-mono text-xs">{r.checkOut || "—"}</TableCell>
                      <TableCell>
                        {r._valid ? (
                          <Badge className="bg-[#DCFCE7] text-[#14532D] border-[#16A34A] text-[10px] border">✓</Badge>
                        ) : (
                          <Badge className="bg-[#FFE4E6] text-[#881337] border-[#DC2626] text-[10px] border">✗</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upload result */}
      {uploadResult && (
        <Card className="border-[#16A34A]/30 bg-[#DCFCE7]/20">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#16A34A] text-white shrink-0">
                <CheckCheck className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold text-[#14532D]">Upload Successful</p>
                <p className="text-sm text-[#14532D]/80">
                  {uploadResult.processed} of {uploadResult.total} records processed and saved.
                </p>
                <Button size="sm" variant="outline" className="mt-2" onClick={() => setUploadResult(null)}>
                  Upload More
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// TAB 6: REPORTS
// ═══════════════════════════════════════════════════════════════════════

function ReportsTab() {
  const [reportMonth, setReportMonth] = useState(String(now.getMonth() + 1));
  const [reportYear, setReportYear] = useState(String(now.getFullYear()));
  const [reportView, setReportView] = useState<"monthly" | "weekly" | "daily">("monthly");

  const { data: monthlyData, loading: l1 } = useApi<any>(
    `/api/hr/attendance?month=${reportMonth}&year=${reportYear}&view=monthly`,
    [reportMonth, reportYear]
  );
  const { data: weeklyData, loading: l2 } = useApi<any>(
    `/api/hr/attendance?month=${reportMonth}&year=${reportYear}&view=weekly`,
    [reportMonth, reportYear]
  );
  const { data: dailyData, loading: l3 } = useApi<any>(
    `/api/hr/attendance?month=${reportMonth}&year=${reportYear}&view=daily`,
    [reportMonth, reportYear]
  );

  const loading = l1 || l2 || l3;

  const monthlyRecords: any[] = monthlyData?.attendance || [];
  const summary = monthlyData?.summary || {};
  const weeklyDataArr: any[] = weeklyData?.weeklyData || [];
  const todayRecords: any[] = dailyData?.todayAttendance || [];

  // Daily breakdown for the month — hooks must be above early return
  const dailyBreakdown = useMemo(() => {
    const days: Record<string, any[]> = {};
    for (const r of monthlyRecords) {
      const key = new Date(r.date).toISOString().slice(0, 10);
      if (!days[key]) days[key] = [];
      days[key].push(r);
    }
    return Object.entries(days)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, recs]) => ({
        date,
        label: new Date(date).toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
        Present: recs.filter((r: any) => r.status === "present").length,
        Absent: recs.filter((r: any) => r.status === "absent").length,
        Late: recs.filter((r: any) => r.status === "late").length,
        Half_Day: recs.filter((r: any) => r.status === "half_day").length,
        On_Leave: recs.filter((r: any) => r.status === "on_leave").length,
        total: recs.length,
        attendanceRate: recs.length > 0
          ? Math.round(((recs.filter((r: any) => ["present", "late", "half_day"].includes(r.status)).length) / recs.length) * 100)
          : 0,
      }));
  }, [monthlyRecords]);

  // Weekly breakdown for chart
  const weeklyBreakdown = useMemo(() => {
    if (!weeklyDataArr || weeklyDataArr.length === 0) return [];
    return weeklyDataArr.map((w: any) => ({
      name: `Wk ${w.week}`,
      Present: w.summary?.totalPresent || 0,
      Absent: w.summary?.totalAbsent || 0,
      Late: w.summary?.totalLate || 0,
      Half_Day: w.summary?.totalHalfDay || 0,
      On_Leave: w.summary?.totalOnLeave || 0,
    }));
  }, [weeklyDataArr]);

  // Department-wise breakdown
  const deptBreakdown = useMemo(() => {
    const depts: Record<string, { present: number; absent: number; late: number; halfDay: number; onLeave: number; total: number }> = {};
    for (const r of monthlyRecords) {
      const dept = r.user?.department || "Unassigned";
      if (!depts[dept]) depts[dept] = { present: 0, absent: 0, late: 0, halfDay: 0, onLeave: 0, total: 0 };
      depts[dept].total++;
      if (r.status === "present") depts[dept].present++;
      else if (r.status === "absent") depts[dept].absent++;
      else if (r.status === "late") depts[dept].late++;
      else if (r.status === "half_day") depts[dept].halfDay++;
      else if (r.status === "on_leave") depts[dept].onLeave++;
    }
    return Object.entries(depts).map(([dept, v]) => ({
      department: dept,
      ...v,
      rate: v.total > 0 ? Math.round(((v.present + v.late + v.halfDay) / v.total) * 100) : 0,
    }));
  }, [monthlyRecords]);

  // Status pie for reports
  const reportStatusPie = [
    { name: "Present", value: summary.totalPresent || 0, color: CC[2] },
    { name: "Absent", value: summary.totalAbsent || 0, color: CC[6] },
    { name: "Late", value: summary.totalLate || 0, color: CC[4] },
    { name: "Half Day", value: summary.totalHalfDay || 0, color: CC[3] },
    { name: "On Leave", value: summary.totalOnLeave || 0, color: CC[5] },
  ].filter((d) => d.value > 0);

  // Average work hours
  const avgWorkHours = useMemo(() => {
    const withHours = monthlyRecords.filter((r: any) => r.workHours > 0);
    if (withHours.length === 0) return 0;
    return Math.round((withHours.reduce((sum: number, r: any) => sum + r.workHours, 0) / withHours.length) * 10) / 10;
  }, [monthlyRecords]);

  // Total overtime
  const totalOvertime = useMemo(() => {
    return monthlyRecords.reduce((sum: number, r: any) => sum + (r.overtimeHours || 0), 0);
  }, [monthlyRecords]);

  if (loading) return <SkeletonGrid />;

  return (
    <div className="space-y-4">
      {/* Report controls */}
      <div className="flex flex-wrap items-center gap-2">
        <Select value={reportMonth} onValueChange={setReportMonth}>
          <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
          <SelectContent>
            {MONTHS.map((m, i) => <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>)}
          </SelectContent>
        </Select>
        <Input className="w-24" value={reportYear} onChange={(e) => setReportYear(e.target.value)} placeholder="Year" />
        <div className="flex gap-1">
          {(["daily", "weekly", "monthly"] as const).map((v) => (
            <Button key={v} size="sm" variant={reportView === v ? "default" : "outline"} onClick={() => setReportView(v)}>
              {v.charAt(0).toUpperCase() + v.slice(1)}
            </Button>
          ))}
        </div>
        <Button size="sm" variant="outline" className="ml-auto">
          <Download className="h-3.5 w-3.5 mr-1" />Export Report
        </Button>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-3">
        <KpiCard label="Total Records" value={summary.totalRecords ?? 0} icon={BarChart3} accent="navy" />
        <KpiCard label="Present" value={summary.totalPresent ?? 0} icon={UserCheck} accent="success" />
        <KpiCard label="Absent" value={summary.totalAbsent ?? 0} icon={Users} accent="error" />
        <KpiCard label="Late" value={summary.totalLate ?? 0} icon={Timer} accent="warning" />
        <KpiCard label="Half Day" value={summary.totalHalfDay ?? 0} icon={Clock} accent="info" />
        <KpiCard label="On Leave" value={summary.totalOnLeave ?? 0} icon={CalendarDays} accent="navy" />
        <KpiCard label="Att. Rate" value={summary.attendanceRate ?? 0} unit="%" icon={TrendingUp} accent="gold" />
      </div>

      {/* Work hours & overtime summary */}
      <div className="grid grid-cols-2 gap-3">
        <KpiCard label="Avg Work Hours" value={avgWorkHours} unit="h/day" icon={Clock} accent="navy" />
        <KpiCard label="Total Overtime" value={totalOvertime.toFixed(1)} unit="h" icon={TrendingUp} accent="gold" />
      </div>

      {/* Charts */}
      {reportView === "daily" && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="font-display text-sm">Daily Attendance Breakdown — {MONTH_FULL[parseInt(reportMonth) - 1]} {reportYear}</CardTitle>
          </CardHeader>
          <CardContent>
            {dailyBreakdown.length > 0 ? (
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={dailyBreakdown}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 10 }} angle={-45} textAnchor="end" height={60} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="Present" stackId="a" fill={CC[2]} />
                  <Bar dataKey="Late" stackId="a" fill={CC[4]} />
                  <Bar dataKey="Half_Day" stackId="a" fill={CC[3]} />
                  <Bar dataKey="On_Leave" stackId="a" fill={CC[5]} />
                  <Bar dataKey="Absent" stackId="a" fill={CC[6]} radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-16">No daily data available</p>
            )}
          </CardContent>
        </Card>
      )}

      {reportView === "weekly" && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="font-display text-sm">Weekly Attendance Summary — {MONTH_FULL[parseInt(reportMonth) - 1]} {reportYear}</CardTitle>
          </CardHeader>
          <CardContent>
            {weeklyBreakdown.length > 0 ? (
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={weeklyBreakdown}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="Present" fill={CC[2]} radius={[3, 3, 0, 0]} />
                  <Bar dataKey="Late" fill={CC[4]} radius={[3, 3, 0, 0]} />
                  <Bar dataKey="Absent" fill={CC[6]} radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-16">No weekly data available</p>
            )}
          </CardContent>
        </Card>
      )}

      {reportView === "monthly" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="font-display text-sm">Status Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              {reportStatusPie.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie data={reportStatusPie} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} innerRadius={55}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                      {reportStatusPie.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-16">No data available</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="font-display text-sm">Daily Attendance Trend</CardTitle>
            </CardHeader>
            <CardContent>
              {dailyBreakdown.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={dailyBreakdown}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="Present" fill={CC[2]} radius={[3, 3, 0, 0]} />
                    <Bar dataKey="Absent" fill={CC[6]} radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-16">No data available</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Department-wise summary table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="font-display text-sm">Department-wise Attendance Summary</CardTitle>
        </CardHeader>
        <CardContent>
          {deptBreakdown.length > 0 ? (
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Department</TableHead>
                    <TableHead className="text-center">Total</TableHead>
                    <TableHead className="text-center">Present</TableHead>
                    <TableHead className="text-center">Absent</TableHead>
                    <TableHead className="text-center">Late</TableHead>
                    <TableHead className="text-center">Half Day</TableHead>
                    <TableHead className="text-center">On Leave</TableHead>
                    <TableHead className="text-center">Att. Rate</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {deptBreakdown.map((d) => (
                    <TableRow key={d.department}>
                      <TableCell className="font-medium text-sm">{d.department}</TableCell>
                      <TableCell className="text-center font-mono text-xs">{d.total}</TableCell>
                      <TableCell className="text-center">
                        <Badge className="bg-[#DCFCE7] text-[#14532D] border-[#16A34A] text-[10px] border">{d.present}</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge className="bg-[#FFE4E6] text-[#881337] border-[#DC2626] text-[10px] border">{d.absent}</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge className="bg-[#FEF3C7] text-[#78350F] border-[#D97706] text-[10px] border">{d.late}</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge className="bg-[#DBEAFE] text-[#1B3A6B] border-[#0369A1] text-[10px] border">{d.halfDay}</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge className="bg-[#F3E8FF] text-[#4C1D95] border-[#7C3AED] text-[10px] border">{d.onLeave}</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={cn(
                          "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-bold",
                          d.rate >= 90 ? "bg-[#DCFCE7] text-[#14532D]" :
                          d.rate >= 75 ? "bg-[#FEF3C7] text-[#78350F]" :
                          "bg-[#FFE4E6] text-[#881337]"
                        )}>
                          {d.rate}%
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">No department data available</p>
          )}
        </CardContent>
      </Card>

      {/* Attendance rate by day */}
      {reportView === "monthly" && dailyBreakdown.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="font-display text-sm">Attendance Rate by Day</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={dailyBreakdown}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 11 }} domain={[0, 100]} />
                <Tooltip formatter={(v: number) => `${v}%`} />
                <Bar dataKey="attendanceRate" fill={CC[0]} radius={[3, 3, 0, 0]} name="Attendance Rate %" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
