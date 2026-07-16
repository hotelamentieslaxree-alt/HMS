// ARIA HMS — HR Hub Module (4 tabs: Overview, Employees, Payroll, Events & Birthdays)
"use client";

import { useState, useEffect, useMemo } from "react";
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
  Users, UserCheck, Percent, Star, Briefcase, IndianRupee,
  CalendarDays, Clock, CheckCheck, Plus, Pencil, Trash2,
  Eye, FileText, Printer, BarChart3, Award, Calendar, MapPin,
  UserCircle, Search, Building2, Cake, Gift, PartyPopper,
  ChevronRight, TrendingUp, Activity, ClipboardCheck, Sparkles,
  Heart, UsersRound, Wallet, Receipt,
  AlertTriangle,
} from "lucide-react";
import {
  BarChart, Bar, PieChart, Pie, Cell, ResponsiveContainer,
  XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from "recharts";

// ─── Fallback data when API fails ────────────────────────────────
const FALLBACK_EMP_DATA = [
  { id: "e1", firstName: "Vikram", lastName: "Singh", email: "vikram.singh@ariahotel.in", phone: "+91-98100-12345", employeeCode: "EMP-001", role: "gm", isActive: true, isOnLeave: false, department: "Management", departmentCode: "Management" },
  { id: "e2", firstName: "Deepa", lastName: "Nair", email: "deepa.nair@ariahotel.in", phone: "+91-98200-23456", employeeCode: "EMP-002", role: "fom", isActive: true, isOnLeave: false, department: "Front Office", departmentCode: "Front Office" },
  { id: "e3", firstName: "Ramesh", lastName: "Patel", email: "ramesh.patel@ariahotel.in", phone: "+91-98300-34567", employeeCode: "EMP-003", role: "receptionist", isActive: true, isOnLeave: false, department: "Front Office", departmentCode: "Front Office" },
  { id: "e4", firstName: "Sunita", lastName: "Devi", email: "sunita.devi@ariahotel.in", phone: "+91-98400-45678", employeeCode: "EMP-004", role: "hk_mgr", isActive: true, isOnLeave: false, department: "Housekeeping", departmentCode: "Housekeeping" },
  { id: "e5", firstName: "Arjun", lastName: "Reddy", email: "arjun.reddy@ariahotel.in", phone: "+91-98500-56789", employeeCode: "EMP-005", role: "fb_mgr", isActive: false, isOnLeave: false, department: "Food & Beverage", departmentCode: "Food & Beverage" },
  { id: "e6", firstName: "Kavita", lastName: "Sharma", email: "kavita.sharma@ariahotel.in", phone: "+91-98600-67890", employeeCode: "EMP-006", role: "hr_mgr", isActive: true, isOnLeave: true, department: "Human Resources", departmentCode: "Human Resources" },
];

const FALLBACK_ATT_DATA = {
  summary: { attendanceRate: 92, totalPresent: 38, totalAbsent: 3, totalLate: 2 },
  todayAttendance: [
    { id: "att1", employeeId: "e1", status: "present", checkIn: "09:00", checkOut: null, date: new Date().toISOString() },
    { id: "att2", employeeId: "e2", status: "present", checkIn: "08:45", checkOut: null, date: new Date().toISOString() },
    { id: "att3", employeeId: "e3", status: "late", checkIn: "10:15", checkOut: null, date: new Date().toISOString() },
  ],
  attendance: [],
};

const FALLBACK_PAYROLL_DATA = {
  summary: { totalGrossPay: 840000, totalDeductions: 126000, totalNetPay: 714000, employeeCount: 6, byDepartment: { Management: 1, "Front Office": 2, Housekeeping: 1, "Food & Beverage": 1, "Human Resources": 1 } },
  records: [
    { id: "pr1", employeeId: "e1", employeeName: "Vikram Singh", department: "Management", grossPay: 150000, deductions: 22500, netPay: 127500, status: "paid" },
    { id: "pr2", employeeId: "e2", employeeName: "Deepa Nair", department: "Front Office", grossPay: 95000, deductions: 14250, netPay: 80750, status: "paid" },
    { id: "pr3", employeeId: "e3", employeeName: "Ramesh Patel", department: "Front Office", grossPay: 55000, deductions: 8250, netPay: 46750, status: "processed" },
    { id: "pr4", employeeId: "e4", employeeName: "Sunita Devi", department: "Housekeeping", grossPay: 75000, deductions: 11250, netPay: 63750, status: "processed" },
    { id: "pr5", employeeId: "e5", employeeName: "Arjun Reddy", department: "Food & Beverage", grossPay: 85000, deductions: 12750, netPay: 72250, status: "draft" },
    { id: "pr6", employeeId: "e6", employeeName: "Kavita Sharma", department: "Human Resources", grossPay: 80000, deductions: 12000, netPay: 68000, status: "draft" },
  ],
};

const FALLBACK_EVENT_DATA = {
  events: [
    { id: "ev1", title: "Quarterly Review Meeting", type: "meeting", eventDate: new Date().toISOString(), endDate: null, venue: "Conference Room A", description: "Q1 performance review" },
    { id: "ev2", title: "Fire Safety Training", type: "training", eventDate: new Date(Date.now() + 86400000).toISOString(), endDate: null, venue: "Basement Hall", description: "Annual fire safety drill" },
    { id: "ev3", title: "Holi Celebration", type: "festival", eventDate: new Date(Date.now() + 172800000).toISOString(), endDate: new Date(Date.now() + 172800000).toISOString(), venue: "Poolside", description: "Festival of colours celebration" },
  ],
};

// ─── CONSTANTS ────────────────────────────────────────────────────────
const CC = ["#1B3A6B", "#C9952A", "#16A34A", "#0369A1", "#D97706", "#7C3AED"];
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const now = new Date();

const EVENT_COLORS: Record<string, string> = {
  festival: "bg-[#FEF3C7] text-[#78350F] border-[#D97706]",
  training: "bg-[#DBEAFE] text-[#1B3A6B] border-[#0369A1]",
  meeting: "bg-[#1B3A6B] text-white border-[#1B3A6B]",
  celebration: "bg-[#DCFCE7] text-[#14532D] border-[#16A34A]",
  audit: "bg-[#FFE4E6] text-[#881337] border-[#DC2626]",
  inspection: "bg-[#FFE4E6] text-[#881337] border-[#DC2626]",
  birthday: "bg-[#F3E8FF] text-[#4C1D95] border-[#7C3AED]",
};

const EVENT_ICONS: Record<string, any> = {
  festival: Sparkles,
  training: Award,
  meeting: Users,
  celebration: PartyPopper,
  audit: ClipboardCheck,
  inspection: ClipboardCheck,
  birthday: Cake,
};

const PAYROLL_COLORS: Record<string, string> = {
  draft: "bg-[#FEF3C7] text-[#78350F] border-[#D97706]",
  processed: "bg-[#DBEAFE] text-[#1B3A6B] border-[#0369A1]",
  paid: "bg-[#DCFCE7] text-[#14532D] border-[#16A34A]",
};

const ROLES = ["owner","gm","fom","receptionist","hk_mgr","hk_attendant","fb_mgr","waiter","rev_mgr","fin_mgr","eng_mgr","technician","hr_mgr","sales_mgr","sales_exec","mkt_mgr","mkt_exec"];
const ROLE_LABEL: Record<string, string> = {
  owner:"Owner/CEO", gm:"General Manager", fom:"Front Office Mgr", receptionist:"Receptionist",
  hk_mgr:"Housekeeping Mgr", hk_attendant:"HK Attendant", fb_mgr:"F&B Manager", waiter:"Waiter",
  rev_mgr:"Revenue Mgr", fin_mgr:"Finance Mgr", eng_mgr:"Engineering Mgr", technician:"Technician",
  hr_mgr:"HR Manager", sales_mgr:"Sales Manager", sales_exec:"Sales Executive",
  mkt_mgr:"Marketing Manager", mkt_exec:"Marketing Executive",
};

const DEPT_OPTIONS = [
  { code: "FO", label: "Front Office" },
  { code: "HK", label: "Housekeeping" },
  { code: "FB", label: "F&B" },
  { code: "ENG", label: "Engineering" },
  { code: "HR", label: "Human Resources" },
  { code: "FIN", label: "Finance" },
  { code: "SALES", label: "Sales" },
  { code: "MKT", label: "Marketing" },
  { code: "REV", label: "Revenue" },
];

// Mock birthday data (since User model doesn't have birthDate)
const MOCK_BIRTHDAYS: { name: string; department: string; role: string; birthDay: number; birthMonth: number; avatar?: string }[] = [
  { name: "Priya Sharma", department: "Front Office", role: "fom", birthDay: 8, birthMonth: now.getMonth() + 1 },
  { name: "Rajesh Kumar", department: "Engineering", role: "eng_mgr", birthDay: 15, birthMonth: now.getMonth() + 1 },
  { name: "Anita Desai", department: "Housekeeping", role: "hk_mgr", birthDay: 22, birthMonth: now.getMonth() + 1 },
  { name: "Vikram Singh", department: "F&B", role: "fb_mgr", birthDay: 5, birthMonth: now.getMonth() + 2 > 12 ? 1 : now.getMonth() + 2 },
  { name: "Meera Patel", department: "Sales", role: "sales_mgr", birthDay: 12, birthMonth: now.getMonth() + 2 > 12 ? 1 : now.getMonth() + 2 },
  { name: "Arjun Reddy", department: "Finance", role: "fin_mgr", birthDay: 28, birthMonth: now.getMonth() + 1 },
  { name: "Sneha Iyer", department: "HR", role: "hr_mgr", birthDay: 3, birthMonth: now.getMonth() + 2 > 12 ? 1 : now.getMonth() + 2 },
  { name: "Karan Malhotra", department: "Marketing", role: "mkt_mgr", birthDay: 18, birthMonth: now.getMonth() + 1 },
  { name: "Deepa Nair", department: "Front Office", role: "receptionist", birthDay: 25, birthMonth: now.getMonth() + 1 },
  { name: "Suresh Menon", department: "Revenue", role: "rev_mgr", birthDay: 10, birthMonth: now.getMonth() + 2 > 12 ? 1 : now.getMonth() + 2 },
];

// ─── MAIN COMPONENT ──────────────────────────────────────────────────
const HR_TABS = [
  { key: "overview", label: "Overview", icon: BarChart3 },
  { key: "employees", label: "Employees", icon: Users },
  { key: "payroll", label: "Payroll", icon: IndianRupee },
  { key: "events", label: "Events & Birthdays", icon: Cake },
];

export function HRModule() {
  const { activeSubModule, setActiveSubModule } = useAppStore();
  const [localTab, setLocalTab] = useState("overview");
  const tab = (activeSubModule && HR_TABS.some(t => t.key === activeSubModule)) ? activeSubModule : localTab;

  const handleTabChange = (newTab: string) => {
    setLocalTab(newTab);
    setActiveSubModule(newTab);
  };

  const activeTabMeta = HR_TABS.find(t => t.key === tab);

  return (
    <div className="space-y-4">
      {/* Compact Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#1B3A6B]/10">
          <Users className="h-4.5 w-4.5 text-[#1B3A6B]" />
        </div>
        <div className="min-w-0">
          <h2 className="font-display text-lg font-bold tracking-tight text-foreground">HR Hub</h2>
          <p className="text-xs text-muted-foreground">{activeTabMeta?.label ?? "Overview"} · Human Resources</p>
        </div>
      </div>

      <Tabs value={tab} onValueChange={handleTabChange} className="space-y-4">
        <TabsList className="flex-wrap">
          {HR_TABS.map(t => {
            const TIcon = t.icon;
            return <TabsTrigger key={t.key} value={t.key} className="gap-1.5"><TIcon className="h-3.5 w-3.5" />{t.label}</TabsTrigger>;
          })}
        </TabsList>
        <TabsContent value="overview"><OverviewTab /></TabsContent>
        <TabsContent value="employees"><EmployeesTab /></TabsContent>
        <TabsContent value="payroll"><PayrollTab /></TabsContent>
        <TabsContent value="events"><EventsTab /></TabsContent>
      </Tabs>
    </div>
  );
}

// ─── TAB 1: OVERVIEW ─────────────────────────────────────────────────
function OverviewTab() {
  const { data: empData, loading: l1, error: e1 } = useApi<any>("/api/hr/employees?isActive=all", []);
  const { data: attData, loading: l2 } = useApi<any>(`/api/hr/attendance?month=${now.getMonth()+1}&year=${now.getFullYear()}`, []);
  const { data: payrollData, loading: l3 } = useApi<any>(`/api/hr/payroll?month=${now.getMonth()+1}&year=${now.getFullYear()}`, []);
  const { data: eventData, loading: l4 } = useApi<any>(`/api/hr/events?month=${now.getMonth()+1}&year=${now.getFullYear()}`, []);

  const loading = l1 || l2 || l3 || l4;
  const apiError = e1;

  const safeEmpData = empData ?? FALLBACK_EMP_DATA;

  if (loading) return <SkeletonGrid />;

  const emps: any[] = Array.isArray(safeEmpData) ? safeEmpData : [];
  const totalEmployees = emps.length;
  const activeCount = emps.filter((e: any) => e.isActive).length;
  const byDepartment: Record<string, number> = {};
  for (const e of emps) {
    const d = e.department || "Unassigned";
    byDepartment[d] = (byDepartment[d] || 0) + 1;
  }

  const attSummary = (attData as any)?.summary || FALLBACK_ATT_DATA.summary;
  const payrollSummary = (payrollData as any)?.summary || FALLBACK_PAYROLL_DATA.summary;
  const events: any[] = (eventData as any)?.events || FALLBACK_EVENT_DATA.events;

  // Upcoming birthdays this/next month
  const thisMonth = now.getMonth() + 1;
  const nextMonth = thisMonth === 12 ? 1 : thisMonth + 1;
  const upcomingBdays = MOCK_BIRTHDAYS.filter(b => b.birthMonth === thisMonth || b.birthMonth === nextMonth)
    .sort((a, b) => {
      if (a.birthMonth !== b.birthMonth) return a.birthMonth - b.birthMonth;
      return a.birthDay - b.birthDay;
    });

  // Attendance trend (last 7 days)
  const attRecords: any[] = (attData as any)?.attendance || [];
  const trend: { name: string; Present: number; Absent: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const ds = d.toISOString().slice(0, 10);
    const dayRecs = attRecords.filter((r: any) => new Date(r.date).toISOString().slice(0, 10) === ds);
    trend.push({
      name: d.toLocaleDateString("en-IN", { weekday: "short" }),
      Present: dayRecs.filter((r: any) => r.status === "present" || r.status === "late").length,
      Absent: dayRecs.filter((r: any) => r.status === "absent").length,
    });
  }

  const deptPie = Object.entries(byDepartment).map(([name, value]) => ({ name, value: value as number }));

  // Estimate monthly payroll
  const avgSalary = 45000;
  const estPayroll = (payrollSummary.totalNetPay as number) || activeCount * avgSalary;

  return (
    <div className="space-y-5">
      {apiError && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>Could not load live data. Showing sample data instead.</span>
        </div>
      )}
      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <KpiCard label="Total Employees" value={totalEmployees} icon={Users} accent="navy" />
        <KpiCard label="Attendance Rate" value={attSummary.attendanceRate ?? 92} unit="%" icon={UserCheck} accent="success" />
        <KpiCard label="Payroll This Month" value={fmtINR(estPayroll)} icon={IndianRupee} accent="gold" />
        <KpiCard label="Upcoming Events" value={events.length} icon={CalendarDays} accent="info" />
        <KpiCard label="Upcoming Birthdays" value={upcomingBdays.length} icon={Cake} accent="error" hint="This & next month" />
        <KpiCard label="Avg Scorecard" value={78.5} icon={Star} accent="warning" />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="font-display text-sm">Attendance Trend (7 days)</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="Present" fill={CC[2]} radius={[4,4,0,0]} />
                <Bar dataKey="Absent" fill={CC[4]} radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="font-display text-sm">Department Distribution</CardTitle></CardHeader>
          <CardContent>
            {deptPie.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={deptPie} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80}
                    label={({ name, percent }) => `${name} ${(percent*100).toFixed(0)}%`} labelLine={false}>
                    {deptPie.map((_, i) => <Cell key={i} fill={CC[i % CC.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-10">No department data</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Events + Birthdays Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent Events */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="font-display text-sm">Recent Events</CardTitle></CardHeader>
          <CardContent className="max-h-64 overflow-y-auto">
            {events.length === 0 ? (
              <p className="text-sm text-muted-foreground">No events this month</p>
            ) : (
              events.slice(0, 8).map((e: any, idx: number) => {
                const IconComp = EVENT_ICONS[e.type] || Calendar;
                return (
                  <div key={e.id || idx} className="flex items-center gap-3 py-2 border-b last:border-0">
                    <Badge className={cn("text-[10px] border", EVENT_COLORS[e.type] || "bg-muted")}>{e.type}</Badge>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{e.title}</p>
                      <p className="text-xs text-muted-foreground">{fmtDate(e.eventDate)}</p>
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* Upcoming Birthdays */}
        <Card className="border-[#7C3AED]/20">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="font-display text-sm flex items-center gap-2">
                <Cake className="h-4 w-4 text-[#7C3AED]" /> Upcoming Birthdays
              </CardTitle>
              <Badge className="bg-[#F3E8FF] text-[#4C1D95] border-[#7C3AED] text-[10px]">{upcomingBdays.length} upcoming</Badge>
            </div>
          </CardHeader>
          <CardContent className="max-h-64 overflow-y-auto">
            {upcomingBdays.length === 0 ? (
              <p className="text-sm text-muted-foreground">No upcoming birthdays</p>
            ) : (
              upcomingBdays.map((b, idx) => {
                const isThisMonth = b.birthMonth === thisMonth;
                const bDate = new Date(now.getFullYear(), b.birthMonth - 1, b.birthDay);
                const isToday = b.birthDay === now.getDate() && b.birthMonth === thisMonth;
                const daysUntil = Math.ceil((bDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                const daysLabel = isToday ? "Today! 🎉" : daysUntil < 0 ? "Passed" : daysUntil === 0 ? "Today!" : `${daysUntil}d away`;
                return (
                  <div key={idx} className={cn("flex items-center gap-3 py-2 border-b last:border-0", isToday && "bg-[#F3E8FF]/50 -mx-4 px-4 rounded-lg")}>
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[#F3E8FF] to-[#E9D5FF] text-[#7C3AED] text-sm font-bold border-2 border-[#7C3AED]/30">
                      {b.name.split(" ").map(n => n[0]).join("")}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{b.name}</p>
                      <p className="text-[11px] text-muted-foreground">{b.department} · {b.birthDay} {MONTHS[b.birthMonth - 1]}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={cn("text-[11px] font-medium", isToday ? "text-[#7C3AED]" : "text-muted-foreground")}>{daysLabel}</p>
                      {isThisMonth && <Badge className="bg-[#F3E8FF] text-[#4C1D95] text-[9px] h-4 mt-0.5">This Month</Badge>}
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="font-display text-sm">Quick Actions</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { icon: Plus, label: "Add Employee", desc: "Onboard new staff", color: "bg-[#1B3A6B]" },
              { icon: CalendarDays, label: "Schedule Event", desc: "Create event/training", color: "bg-[#0369A1]" },
              { icon: IndianRupee, label: "Run Payroll", desc: "Generate salary slips", color: "bg-[#16A34A]" },
              { icon: Cake, label: "Plan Birthday", desc: "Celebrate team member", color: "bg-[#7C3AED]" },
            ].map(({ icon: Ic, label, desc, color }) => (
              <button key={label} className="flex items-center gap-3 rounded-lg border p-3 text-left hover:bg-accent/50 transition-colors">
                <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white", color)}>
                  <Ic className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-medium">{label}</p>
                  <p className="text-[11px] text-muted-foreground">{desc}</p>
                </div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── TAB 2: EMPLOYEES ────────────────────────────────────────────────
function EmployeesTab() {
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [addOpen, setAddOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [form, setForm] = useState({
    firstName: "", lastName: "", email: "", role: "", department: "", phone: "",
  });

  const queryParams = new URLSearchParams({ isActive: statusFilter });
  if (search) queryParams.set("search", search);
  if (deptFilter !== "all") queryParams.set("department", deptFilter);
  if (roleFilter !== "all") queryParams.set("role", roleFilter);

  const { data, loading, error, reload } = useApi<any>(`/api/hr/employees?${queryParams.toString()}`, [search, deptFilter, roleFilter, statusFilter]);
  const { triggerRefresh } = useAppStore();

  const employees: any[] = Array.isArray(data) ? data : Array.isArray(FALLBACK_EMP_DATA) ? FALLBACK_EMP_DATA : [];
  const summary = (data as any)?.summary || FALLBACK_PAYROLL_DATA.summary;
  const departments: string[] = Object.keys(summary.byDepartment || {});

  const resetForm = () => setForm({ firstName: "", lastName: "", email: "", role: "", department: "", phone: "" });

  const handleSave = async () => {
    try {
      const body = { ...form, departmentId: form.department || undefined };
      if (editItem) {
        await apiPut("/api/hr/employees", { id: editItem.id, ...body });
        toast.success("Employee updated");
      } else {
        await apiPost("/api/hr/employees", body);
        toast.success("Employee added");
      }
      setAddOpen(false); setEditItem(null); resetForm(); reload(); triggerRefresh();
    } catch (e: any) { toast.error(e.message); }
  };

  const handleDelete = async (id: string) => {
    try {
      await apiPut("/api/hr/employees", { id, isActive: false });
      toast.success("Employee deactivated"); reload(); triggerRefresh();
    } catch (e: any) { toast.error(e.message); }
  };

  if (loading) return <SkeletonGrid />;

  return (
    <div className="space-y-4">
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>Could not load live data. Showing sample data instead.</span>
          <button onClick={reload} className="ml-auto text-xs font-medium underline">Retry</button>
        </div>
      )}
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search employees..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={deptFilter} onValueChange={setDeptFilter}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Department" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Departments</SelectItem>
            {DEPT_OPTIONS.map(d => <SelectItem key={d.code} value={d.code}>{d.label}</SelectItem>)}
            {departments.filter(d => !DEPT_OPTIONS.some(opt => opt.code === d)).map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Role" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            {ROLES.map(r => <SelectItem key={r} value={r}>{ROLE_LABEL[r]}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-28"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="true">Active</SelectItem>
            <SelectItem value="false">Inactive</SelectItem>
          </SelectContent>
        </Select>
        <Button size="sm" onClick={() => { resetForm(); setEditItem(null); setAddOpen(true); }}>
          <Plus className="h-3.5 w-3.5 mr-1" />Add Employee
        </Button>
      </div>

      {/* Mini stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Total" value={employees.length} icon={Users} accent="navy" />
        <KpiCard label="Active" value={employees.filter(e => e.isActive).length} icon={UserCheck} accent="success" />
        <KpiCard label="Departments" value={departments.length || DEPT_OPTIONS.length} icon={Building2} accent="info" />
        <KpiCard label="Open Positions" value={3} icon={Briefcase} accent="warning" hint="Chef, FOM, HK" />
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Photo</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Code</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {employees.length === 0 ? (
              <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">No employees found</TableCell></TableRow>
            ) : employees.map((e: any) => (
              <TableRow key={e.id} className="hover:bg-accent/30 transition-colors">
                <TableCell>
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[#1B3A6B] to-[#2E5FA3] text-white text-xs font-bold">
                    {e.firstName?.[0]}{e.lastName?.[0]}
                  </div>
                </TableCell>
                <TableCell className="font-medium">{e.fullName || `${e.firstName} ${e.lastName}`}</TableCell>
                <TableCell className="font-mono text-xs">{e.employeeCode}</TableCell>
                <TableCell className="text-xs">{e.department || "—"}</TableCell>
                <TableCell className="text-xs">{ROLE_LABEL[e.role] || e.role}</TableCell>
                <TableCell className="text-xs">{e.phone || "—"}</TableCell>
                <TableCell className="text-xs truncate max-w-[180px]">{e.email}</TableCell>
                <TableCell>
                  <Badge className={cn("text-[10px]", e.isActive ? "bg-[#DCFCE7] text-[#14532D]" : "bg-muted text-muted-foreground")}>
                    {e.isActive ? "Active" : "Inactive"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => {
                      setForm({
                        firstName: e.firstName, lastName: e.lastName, email: e.email,
                        role: e.role, department: e.departmentCode || "", phone: e.phone || "",
                      });
                      setEditItem(e);
                      setAddOpen(true);
                    }}>
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-[#DC2626]" onClick={() => handleDelete(e.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display">{editItem ? "Edit Employee" : "Add Employee"}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>First Name</Label><Input value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))} /></div>
            <div><Label>Last Name</Label><Input value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))} /></div>
            <div className="col-span-2"><Label>Email</Label><Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
            <div>
              <Label>Role</Label>
              <Select value={form.role} onValueChange={v => setForm(f => ({ ...f, role: v }))}>
                <SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger>
                <SelectContent>{ROLES.map(r => <SelectItem key={r} value={r}>{ROLE_LABEL[r]}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Department</Label>
              <Select value={form.department} onValueChange={v => setForm(f => ({ ...f, department: v }))}>
                <SelectTrigger><SelectValue placeholder="Select dept" /></SelectTrigger>
                <SelectContent>
                  {DEPT_OPTIONS.map(d => <SelectItem key={d.code} value={d.code}>{d.label}</SelectItem>)}
                  {departments.filter(d => !DEPT_OPTIONS.some(opt => opt.code === d)).map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2"><Label>Phone</Label><Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setAddOpen(false); setEditItem(null); }}>Cancel</Button>
            <Button onClick={handleSave}>{editItem ? "Update" : "Add"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── TAB 3: PAYROLL ──────────────────────────────────────────────────
function PayrollTab() {
  const [month, setMonth] = useState(String(now.getMonth() + 1));
  const [year, setYear] = useState(String(now.getFullYear()));
  const [statusFilter, setStatusFilter] = useState("all");
  const [slipItem, setSlipItem] = useState<any>(null);

  const { data, loading, error, reload } = useApi<any>(
    `/api/hr/payroll?month=${month}&year=${year}${statusFilter !== "all" ? `&status=${statusFilter}` : ""}`,
    [month, year, statusFilter]
  );
  const { triggerRefresh } = useAppStore();

  const summary = data?.summary || FALLBACK_PAYROLL_DATA.summary;
  const records: any[] = data?.records || FALLBACK_PAYROLL_DATA.records;

  const handleAction = async (action: string) => {
    try {
      const res: any = await apiPost("/api/hr/payroll", { action, month: Number(month), year: Number(year) });
      toast.success(res.message || `${action} done`); reload(); triggerRefresh();
    } catch (e: any) { toast.error(e.message); }
  };

  if (loading) return <SkeletonGrid />;

  return (
    <div className="space-y-4">
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>Could not load live data. Showing sample data instead.</span>
          <button onClick={reload} className="ml-auto text-xs font-medium underline">Retry</button>
        </div>
      )}
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-2">
        <Select value={month} onValueChange={setMonth}>
          <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
          <SelectContent>{MONTHS.map((m, i) => <SelectItem key={i} value={String(i+1)}>{m}</SelectItem>)}</SelectContent>
        </Select>
        <Input className="w-24" value={year} onChange={e => setYear(e.target.value)} placeholder="Year" />
        <div className="flex gap-1">
          {[
            { v: "all", l: "All" },
            { v: "draft", l: "Draft" },
            { v: "processed", l: "Processed" },
            { v: "paid", l: "Paid" },
          ].map(({ v, l }) => (
            <Button key={v} size="sm" variant={statusFilter === v ? "default" : "outline"} onClick={() => setStatusFilter(v)}>{l}</Button>
          ))}
        </div>
        <div className="ml-auto flex gap-2">
          <Button size="sm" variant="outline" onClick={() => handleAction("generate")}>
            <FileText className="h-3.5 w-3.5 mr-1" />Generate
          </Button>
          <Button size="sm" variant="outline" onClick={() => handleAction("process")}>
            <CheckCheck className="h-3.5 w-3.5 mr-1" />Process All
          </Button>
          <Button size="sm" onClick={() => handleAction("pay")}>
            <IndianRupee className="h-3.5 w-3.5 mr-1" />Mark Paid
          </Button>
        </div>
      </div>

      {/* Payroll KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Total Gross" value={fmtINR(summary.totalGrossEarnings ?? 0)} icon={Wallet} accent="navy" />
        <KpiCard label="Total Deductions" value={fmtINR(summary.totalDeductions ?? 0)} icon={Receipt} accent="error" />
        <KpiCard label="Total Net Pay" value={fmtINR(summary.totalNetPay ?? 0)} icon={IndianRupee} accent="success" />
        <KpiCard label="Employees" value={summary.employeeCount ?? 0} icon={Users} accent="gold" />
      </div>

      {/* Workflow Progress */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="font-display text-sm">Payroll Workflow — {MONTHS[Number(month) - 1]} {year}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            {[
              { step: "generate", label: "Generate", icon: FileText, color: "bg-[#D97706]" },
              { step: "process", label: "Process", icon: CheckCheck, color: "bg-[#0369A1]" },
              { step: "pay", label: "Pay", icon: IndianRupee, color: "bg-[#16A34A]" },
            ].map(({ step, label, icon: Ic, color }, idx) => {
              const statuses = records.map(r => r.status);
              const isDone = statuses.some(s => step === "generate" ? s !== "draft" : step === "process" ? s === "paid" : false) || (step === "generate" && records.length > 0);
              return (
                <div key={step} className="flex items-center gap-2 flex-1">
                  <div className={cn("flex items-center gap-2 rounded-lg px-4 py-2.5 flex-1", isDone ? `${color} text-white` : "bg-muted text-muted-foreground")}>
                    <Ic className="h-4 w-4" />
                    <span className="text-sm font-medium">{label}</span>
                  </div>
                  {idx < 2 && <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Payroll Table */}
      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Employee</TableHead>
              <TableHead>Basic</TableHead>
              <TableHead>HRA</TableHead>
              <TableHead>DA</TableHead>
              <TableHead>Convey.</TableHead>
              <TableHead>Medical</TableHead>
              <TableHead>Special</TableHead>
              <TableHead>Gross</TableHead>
              <TableHead>PF</TableHead>
              <TableHead>ESI</TableHead>
              <TableHead>PT</TableHead>
              <TableHead>Total Ded.</TableHead>
              <TableHead>Net Pay</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {records.length === 0 ? (
              <TableRow><TableCell colSpan={15} className="text-center text-muted-foreground py-8">No payroll records. Click Generate to create.</TableCell></TableRow>
            ) : records.map((r: any) => (
              <TableRow key={r.id} className="hover:bg-accent/30 transition-colors">
                <TableCell className="font-medium">
                  {r.user?.fullName || r.userName}
                  <p className="text-[10px] text-muted-foreground">{r.user?.employeeCode || r.employeeCode}</p>
                </TableCell>
                <TableCell className="font-mono text-xs">{fmtINR(r.basicSalary)}</TableCell>
                <TableCell className="font-mono text-xs">{fmtINR(r.hra)}</TableCell>
                <TableCell className="font-mono text-xs">{fmtINR(r.da)}</TableCell>
                <TableCell className="font-mono text-xs">{fmtINR(r.conveyance)}</TableCell>
                <TableCell className="font-mono text-xs">{fmtINR(r.medical)}</TableCell>
                <TableCell className="font-mono text-xs">{fmtINR(r.specialAllow)}</TableCell>
                <TableCell className="font-mono text-xs font-semibold">{fmtINR(r.grossEarnings)}</TableCell>
                <TableCell className="font-mono text-xs text-[#DC2626]">{fmtINR(r.pf)}</TableCell>
                <TableCell className="font-mono text-xs text-[#DC2626]">{fmtINR(r.esi)}</TableCell>
                <TableCell className="font-mono text-xs text-[#DC2626]">{fmtINR(r.pt)}</TableCell>
                <TableCell className="font-mono text-xs text-[#DC2626] font-semibold">{fmtINR(r.totalDeductions)}</TableCell>
                <TableCell className="font-mono text-xs font-bold text-[#16A34A]">{fmtINR(r.netPay)}</TableCell>
                <TableCell>
                  <Badge className={cn("text-[10px] border", PAYROLL_COLORS[r.status] || "")}>{r.status}</Badge>
                </TableCell>
                <TableCell>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setSlipItem(r)}>
                    <Eye className="h-3 w-3" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Salary Slip Dialog */}
      <Dialog open={!!slipItem} onOpenChange={() => setSlipItem(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display text-center">The Aurelian Grand — Salary Slip</DialogTitle>
          </DialogHeader>
          {slipItem && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-2 border-b pb-3">
                <p><span className="text-muted-foreground">Name:</span> <strong>{slipItem.user?.fullName || slipItem.userName}</strong></p>
                <p><span className="text-muted-foreground">Code:</span> {slipItem.user?.employeeCode || slipItem.employeeCode}</p>
                <p><span className="text-muted-foreground">Department:</span> {slipItem.user?.department || slipItem.department || "—"}</p>
                <p><span className="text-muted-foreground">Period:</span> {MONTHS[(slipItem.month||1)-1]} {slipItem.year}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="font-semibold mb-1 text-xs uppercase tracking-wider text-muted-foreground">Earnings</p>
                  {[
                    ["Basic Salary", slipItem.basicSalary], ["HRA", slipItem.hra], ["DA", slipItem.da],
                    ["Conveyance", slipItem.conveyance], ["Medical", slipItem.medical], ["Special Allow.", slipItem.specialAllow],
                    ["Overtime", slipItem.overtime], ["Bonus", slipItem.bonus],
                  ].map(([l, v]) => (
                    <div key={l as string} className="flex justify-between py-0.5">
                      <span className="text-muted-foreground">{l}</span>
                      <span className="font-mono">{fmtINR(v as number)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between border-t pt-1 mt-1 font-bold">
                    <span>Gross Earnings</span>
                    <span className="font-mono">{fmtINR(slipItem.grossEarnings)}</span>
                  </div>
                </div>
                <div>
                  <p className="font-semibold mb-1 text-xs uppercase tracking-wider text-muted-foreground">Deductions</p>
                  {[
                    ["Provident Fund", slipItem.pf], ["ESI", slipItem.esi], ["Tax (TDS)", slipItem.tax],
                    ["Prof. Tax", slipItem.pt], ["Loan Deduction", slipItem.loanDeduction], ["Other Ded.", slipItem.otherDeductions],
                  ].map(([l, v]) => (
                    <div key={l as string} className="flex justify-between py-0.5">
                      <span className="text-muted-foreground">{l}</span>
                      <span className="font-mono text-[#DC2626]">{fmtINR(v as number)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between border-t pt-1 mt-1 font-bold">
                    <span>Total Ded.</span>
                    <span className="font-mono text-[#DC2626]">{fmtINR(slipItem.totalDeductions)}</span>
                  </div>
                </div>
              </div>
              <div className="rounded-xl bg-gradient-to-r from-[#1B3A6B] to-[#2E5FA3] text-white p-4 text-center shadow-card">
                <p className="text-xs uppercase tracking-wider text-white/70">Net Pay</p>
                <p className="font-display text-3xl font-bold font-mono">{fmtINR(slipItem.netPay)}</p>
                <p className="text-[10px] text-white/60 mt-1">Indian Rupees · {MONTHS[(slipItem.month||1)-1]} {slipItem.year}</p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => toast.info("Print functionality coming soon")}>
              <Printer className="h-3.5 w-3.5 mr-1" />Print
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── TAB 4: EVENTS & BIRTHDAYS ───────────────────────────────────────
function EventsTab() {
  const [month, setMonth] = useState(String(now.getMonth() + 1));
  const [year, setYear] = useState(String(now.getFullYear()));
  const [addOpen, setAddOpen] = useState(false);
  const [editEvent, setEditEvent] = useState<any>(null);
  const [form, setForm] = useState({
    title: "", type: "meeting", eventDate: "", endDate: "", venue: "", description: "",
  });
  const [birthdayEventOpen, setBirthdayEventOpen] = useState(false);
  const [birthdayForm, setBirthdayForm] = useState({ personName: "", birthDay: "", birthMonth: "" });

  const { data, loading, error, reload } = useApi<any>(`/api/hr/events?month=${month}&year=${year}`, [month, year]);
  const { triggerRefresh } = useAppStore();

  const events: any[] = data?.events || FALLBACK_EVENT_DATA.events;

  // Upcoming birthdays
  const thisMonth = now.getMonth() + 1;
  const nextMonth = thisMonth === 12 ? 1 : thisMonth + 1;
  const upcomingBdays = useMemo(() =>
    MOCK_BIRTHDAYS
      .filter(b => b.birthMonth === thisMonth || b.birthMonth === nextMonth)
      .sort((a, b) => {
        if (a.birthMonth !== b.birthMonth) return a.birthMonth - b.birthMonth;
        return a.birthDay - b.birthDay;
      }),
    [thisMonth, nextMonth]
  );

  const handleSave = async () => {
    try {
      if (editEvent) {
        await apiPut("/api/hr/events", { id: editEvent.id, ...form });
        toast.success("Event updated");
      } else {
        await apiPost("/api/hr/events", form);
        toast.success("Event created");
      }
      setAddOpen(false); setEditEvent(null);
      setForm({ title: "", type: "meeting", eventDate: "", endDate: "", venue: "", description: "" });
      reload(); triggerRefresh();
    } catch (e: any) { toast.error(e.message); }
  };

  const handleDeleteEvent = async (id: string) => {
    try {
      await apiPut("/api/hr/events", { id, status: "cancelled" });
      toast.success("Event cancelled"); reload(); triggerRefresh();
    } catch (e: any) { toast.error(e.message); }
  };

  const handleCreateBirthdayEvent = (b: typeof MOCK_BIRTHDAYS[0]) => {
    const bDate = new Date(now.getFullYear(), b.birthMonth - 1, b.birthDay);
    // If birthday already passed this year, use next year
    if (bDate < now) bDate.setFullYear(bDate.getFullYear() + 1);
    setBirthdayForm({
      personName: b.name,
      birthDay: String(b.birthDay),
      birthMonth: String(b.birthMonth),
    });
    setBirthdayEventOpen(true);
  };

  const handleBirthdayEventSave = async () => {
    try {
      const bDate = new Date(now.getFullYear(), Number(birthdayForm.birthMonth) - 1, Number(birthdayForm.birthDay));
      if (bDate < now) bDate.setFullYear(bDate.getFullYear() + 1);
      const eventBody = {
        title: `🎂 Birthday Celebration — ${birthdayForm.personName}`,
        type: "birthday",
        eventDate: bDate.toISOString().slice(0, 10),
        endDate: bDate.toISOString().slice(0, 10),
        venue: "Hotel Lobby / Cafeteria",
        description: `Birthday celebration for ${birthdayForm.personName}. Cake cutting ceremony and team gathering.`,
      };
      await apiPost("/api/hr/events", eventBody);
      toast.success("Birthday celebration event created!");
      setBirthdayEventOpen(false);
      reload(); triggerRefresh();
    } catch (e: any) { toast.error(e.message); }
  };

  const resetForm = () => setForm({ title: "", type: "meeting", eventDate: "", endDate: "", venue: "", description: "" });

  if (loading) return <SkeletonGrid />;

  return (
    <div className="space-y-5">
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>Could not load live data. Showing sample data instead.</span>
          <button onClick={reload} className="ml-auto text-xs font-medium underline">Retry</button>
        </div>
      )}
      {/* Events Controls */}
      <div className="flex flex-wrap items-center gap-2">
        <Select value={month} onValueChange={setMonth}>
          <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
          <SelectContent>{MONTHS.map((m, i) => <SelectItem key={i} value={String(i+1)}>{m}</SelectItem>)}</SelectContent>
        </Select>
        <Input className="w-24" value={year} onChange={e => setYear(e.target.value)} placeholder="Year" />
        <div className="ml-auto flex gap-2">
          <Button size="sm" onClick={() => { resetForm(); setEditEvent(null); setAddOpen(true); }}>
            <Plus className="h-3.5 w-3.5 mr-1" />Add Event
          </Button>
        </div>
      </div>

      {/* Upcoming Birthdays Section */}
      <Card className="border-[#7C3AED]/20 overflow-hidden">
        <div className="bg-gradient-to-r from-[#F3E8FF] via-[#E9D5FF] to-[#DDD6FE] px-5 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#7C3AED] text-white">
                <Cake className="h-4 w-4" />
              </div>
              <div>
                <h3 className="font-display text-sm font-bold text-[#4C1D95]">Upcoming Birthdays</h3>
                <p className="text-[11px] text-[#7C3AED]/70">{upcomingBdays.length} birthdays this & next month</p>
              </div>
            </div>
            <Badge className="bg-[#7C3AED] text-white border-[#7C3AED] text-[10px]">
              <Gift className="h-3 w-3 mr-1" /> Celebrate!
            </Badge>
          </div>
        </div>
        <CardContent className="p-4">
          {upcomingBdays.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No upcoming birthdays</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 max-h-[320px] overflow-y-auto">
              {upcomingBdays.map((b, idx) => {
                const bDate = new Date(now.getFullYear(), b.birthMonth - 1, b.birthDay);
                const isToday = b.birthDay === now.getDate() && b.birthMonth === thisMonth;
                const daysUntil = Math.ceil((bDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                const daysLabel = isToday ? "Today! 🎉" : daysUntil < 0 ? `Next year` : daysUntil === 0 ? "Today!" : `${daysUntil}d away`;
                return (
                  <div
                    key={idx}
                    className={cn(
                      "relative rounded-xl border-2 p-3 transition-all hover:shadow-card-lg",
                      isToday ? "border-[#7C3AED] bg-[#F3E8FF]/40" : "border-[#7C3AED]/20 bg-card hover:border-[#7C3AED]/40"
                    )}
                  >
                    {isToday && (
                      <div className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-[#7C3AED] text-white text-xs">
                        🎂
                      </div>
                    )}
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#F3E8FF] to-[#DDD6FE] text-[#7C3AED] text-sm font-bold border-2 border-[#7C3AED]/30">
                        {b.name.split(" ").map(n => n[0]).join("")}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold truncate">{b.name}</p>
                        <p className="text-[11px] text-muted-foreground">{b.department}</p>
                        <p className="text-[11px] text-[#7C3AED]">{b.birthDay} {MONTHS[b.birthMonth - 1]}</p>
                      </div>
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <span className={cn("text-[10px] font-medium", isToday ? "text-[#7C3AED]" : "text-muted-foreground")}>{daysLabel}</span>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-6 text-[10px] border-[#7C3AED]/30 text-[#7C3AED] hover:bg-[#F3E8FF] hover:text-[#4C1D95]"
                        onClick={() => handleCreateBirthdayEvent(b)}
                      >
                        <PartyPopper className="h-3 w-3 mr-1" />Plan
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Events List */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-display text-sm font-semibold">Company Events — {MONTHS[Number(month) - 1]} {year}</h3>
          <div className="flex items-center gap-1.5 flex-wrap">
            {Object.entries(EVENT_COLORS).map(([type, cls]) => {
              const IconComp = EVENT_ICONS[type] || Calendar;
              const isActive = events.some(e => e.type === type);
              return (
                <span key={type} className={cn("inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[9px] font-medium", cls, !isActive && "opacity-40")}>
                  <IconComp className="h-2.5 w-2.5" />{type}
                </span>
              );
            })}
          </div>
        </div>

        {events.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <CalendarDays className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>No events this month</p>
            <p className="text-xs mt-1">Click &quot;Add Event&quot; to create one</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 max-h-[600px] overflow-y-auto">
            {events.map((e: any) => {
              const IconComp = EVENT_ICONS[e.type] || Calendar;
              const isBirthday = e.type === "birthday";
              return (
                <Card
                  key={e.id}
                  className={cn(
                    "hover:shadow-card-lg transition-all group",
                    isBirthday && "border-[#7C3AED]/30"
                  )}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2 min-w-0">
                        <div className={cn(
                          "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                          isBirthday ? "bg-[#F3E8FF] text-[#7C3AED]" : "bg-muted text-muted-foreground"
                        )}>
                          <IconComp className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold truncate text-sm">{e.title}</p>
                          <Badge className={cn("mt-1 text-[10px] border", EVENT_COLORS[e.type] || "bg-muted")}>{e.type}</Badge>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-[10px] shrink-0">{e.status}</Badge>
                    </div>
                    <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                      <p className="flex items-center gap-1.5"><Calendar className="h-3 w-3" />{fmtDate(e.eventDate)}{e.endDate && e.endDate !== e.eventDate ? ` — ${fmtDate(e.endDate)}` : ""}</p>
                      {e.venue && <p className="flex items-center gap-1.5"><MapPin className="h-3 w-3" />{e.venue}</p>}
                      {e.organizerName && <p className="flex items-center gap-1.5"><UserCircle className="h-3 w-3" />{e.organizerName}</p>}
                      {e.description && <p className="text-muted-foreground/70 line-clamp-2 mt-1">{e.description}</p>}
                    </div>
                    <div className="mt-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button size="sm" variant="ghost" className="h-6 text-[10px]" onClick={() => {
                        setForm({
                          title: e.title, type: e.type, eventDate: e.eventDate?.slice(0,10) || "",
                          endDate: e.endDate?.slice(0,10) || "", venue: e.venue || "", description: e.description || "",
                        });
                        setEditEvent(e);
                        setAddOpen(true);
                      }}>
                        <Pencil className="h-3 w-3 mr-1" />Edit
                      </Button>
                      <Button size="sm" variant="ghost" className="h-6 text-[10px] text-[#DC2626]" onClick={() => handleDeleteEvent(e.id)}>
                        <Trash2 className="h-3 w-3 mr-1" />Cancel
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Add/Edit Event Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display">{editEvent ? "Edit Event" : "Add Event"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div><Label>Title</Label><Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} /></div>
            <div>
              <Label>Type</Label>
              <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["festival","training","meeting","celebration","audit","inspection","birthday"].map(t => {
                    const IconComp = EVENT_ICONS[t] || Calendar;
                    return (
                      <SelectItem key={t} value={t}>
                        <span className="flex items-center gap-2">
                          <IconComp className="h-3 w-3" />{t.charAt(0).toUpperCase() + t.slice(1)}
                        </span>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Start Date</Label><Input type="date" value={form.eventDate} onChange={e => setForm(f => ({ ...f, eventDate: e.target.value }))} /></div>
              <div><Label>End Date</Label><Input type="date" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} /></div>
            </div>
            <div><Label>Venue</Label><Input value={form.venue} onChange={e => setForm(f => ({ ...f, venue: e.target.value }))} /></div>
            <div><Label>Description</Label><Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setAddOpen(false); setEditEvent(null); }}>Cancel</Button>
            <Button onClick={handleSave}>{editEvent ? "Update" : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Birthday Event Planning Dialog */}
      <Dialog open={birthdayEventOpen} onOpenChange={setBirthdayEventOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2">
              <Cake className="h-5 w-5 text-[#7C3AED]" />Plan Birthday Celebration
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-xl bg-gradient-to-r from-[#F3E8FF] to-[#E9D5FF] p-4 text-center">
              <p className="text-[#4C1D95] font-semibold text-lg">{birthdayForm.personName}</p>
              <p className="text-[#7C3AED] text-sm">{birthdayForm.birthDay} {MONTHS[Number(birthdayForm.birthMonth) - 1]}</p>
            </div>
            <div className="space-y-3">
              <div>
                <Label>Venue</Label>
                <Select defaultValue="lobby" onValueChange={() => {}}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="lobby">Hotel Lobby</SelectItem>
                    <SelectItem value="cafeteria">Staff Cafeteria</SelectItem>
                    <SelectItem value="conference">Conference Room</SelectItem>
                    <SelectItem value="garden">Garden Terrace</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Budget</Label><Input type="number" placeholder="e.g., 5000" defaultValue="3000" /></div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="cake" defaultChecked className="rounded" />
                <Label htmlFor="cake" className="text-sm">Order Birthday Cake</Label>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="decor" defaultChecked className="rounded" />
                <Label htmlFor="decor" className="text-sm">Decorations</Label>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="team-lunch" className="rounded" />
                <Label htmlFor="team-lunch" className="text-sm">Team Lunch/Dinner</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBirthdayEventOpen(false)}>Cancel</Button>
            <Button className="bg-[#7C3AED] hover:bg-[#6D28D9]" onClick={handleBirthdayEventSave}>
              <PartyPopper className="h-3.5 w-3.5 mr-1" />Create Celebration
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── HELPERS ──────────────────────────────────────────────────────────
function SkeletonGrid() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    </div>
  );
}
