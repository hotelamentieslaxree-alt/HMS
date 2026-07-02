// ARIA HMS — Enhanced HR / Staff Module (6 tabs)
"use client";

import { useState, useEffect } from "react";
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
  CalendarDays, Clock, Upload, CheckCheck, Plus, Pencil, Trash2,
  Eye, FileText, Printer, BarChart3, Award, Calendar, MapPin,
  UserCircle, Search, Building2,
} from "lucide-react";
import {
  BarChart, Bar, PieChart, Pie, Cell, ResponsiveContainer,
  XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from "recharts";

const CC = ["#1B3A6B", "#C9952A", "#16A34A", "#0369A1", "#D97706", "#7C3AED"];
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const now = new Date();

const ATTENDANCE_COLORS: Record<string, string> = {
  present: "bg-[#DCFCE7] text-[#14532D] border-[#16A34A]",
  absent: "bg-[#FFE4E6] text-[#881337] border-[#DC2626]",
  late: "bg-[#FEF3C7] text-[#78350F] border-[#D97706]",
  half_day: "bg-[#DBEAFE] text-[#1B3A6B] border-[#0369A1]",
  on_leave: "bg-[#F3E8FF] text-[#4C1D95] border-[#7C3AED]",
  holiday: "bg-muted text-muted-foreground border-border",
  weekly_off: "bg-muted text-muted-foreground border-border",
};
const PAYROLL_COLORS: Record<string, string> = {
  draft: "bg-[#FEF3C7] text-[#78350F] border-[#D97706]",
  processed: "bg-[#DBEAFE] text-[#1B3A6B] border-[#0369A1]",
  paid: "bg-[#DCFCE7] text-[#14532D] border-[#16A34A]",
};
const EVENT_COLORS: Record<string, string> = {
  festival: "bg-[#FEF3C7] text-[#78350F] border-[#D97706]",
  training: "bg-[#DBEAFE] text-[#1B3A6B] border-[#0369A1]",
  meeting: "bg-[#1B3A6B] text-white border-[#1B3A6B]",
  celebration: "bg-[#DCFCE7] text-[#14532D] border-[#16A34A]",
  audit: "bg-[#FFE4E6] text-[#881337] border-[#DC2626]",
};
const GRADE_COLORS: Record<string, string> = {
  "A+": "bg-[#DCFCE7] text-[#14532D]", A: "bg-[#DCFCE7] text-[#16A34A]",
  "B+": "bg-[#DBEAFE] text-[#1B3A6B]", B: "bg-[#DBEAFE] text-[#0369A1]",
  C: "bg-[#FEF3C7] text-[#78350F]", D: "bg-[#FFE4E6] text-[#881337]",
};
const ROLES = ["owner","gm","fom","receptionist","hk_mgr","hk_attendant","fb_mgr","waiter","rev_mgr","fin_mgr","eng_mgr","technician","hr_mgr"];
const ROLE_LABEL: Record<string, string> = {
  owner:"Owner/CEO", gm:"General Manager", fom:"Front Office Mgr", receptionist:"Receptionist",
  hk_mgr:"Housekeeping Mgr", hk_attendant:"HK Attendant", fb_mgr:"F&B Manager", waiter:"Waiter",
  rev_mgr:"Revenue Mgr", fin_mgr:"Finance Mgr", eng_mgr:"Engineering Mgr", technician:"Technician", hr_mgr:"HR Manager",
};

// ─── MAIN COMPONENT ────────────────────────────────────────────────
export function StaffModule() {
  const [tab, setTab] = useState("overview");
  return (
    <Tabs value={tab} onValueChange={setTab} className="space-y-4">
      <TabsList className="flex-wrap">
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="attendance">Attendance</TabsTrigger>
        <TabsTrigger value="employees">Employees</TabsTrigger>
        <TabsTrigger value="payroll">Payroll</TabsTrigger>
        <TabsTrigger value="events">Events</TabsTrigger>
        <TabsTrigger value="scorecards">Scorecards</TabsTrigger>
      </TabsList>
      <TabsContent value="overview"><OverviewTab /></TabsContent>
      <TabsContent value="attendance"><AttendanceTab /></TabsContent>
      <TabsContent value="employees"><EmployeesTab /></TabsContent>
      <TabsContent value="payroll"><PayrollTab /></TabsContent>
      <TabsContent value="events"><EventsTab /></TabsContent>
      <TabsContent value="scorecards"><ScorecardsTab /></TabsContent>
    </Tabs>
  );
}

// ─── TAB 1: OVERVIEW ───────────────────────────────────────────────
function OverviewTab() {
  const { data: empData, loading: l1 } = useApi<any>("/api/hr/employees?isActive=all", []);
  const { data: attData, loading: l2 } = useApi<any>(`/api/hr/attendance?month=${now.getMonth()+1}&year=${now.getFullYear()}`, []);
  const { data: scoreData, loading: l3 } = useApi<any>(`/api/hr/scorecards?period=${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}`, []);
  const { data: eventData, loading: l4 } = useApi<any>(`/api/hr/events?month=${now.getMonth()+1}&year=${now.getFullYear()}`, []);

  if (l1 || l2 || l3 || l4 || !empData) return <SkeletonGrid />;

  const emps: any[] = Array.isArray(empData) ? empData : [];
  const totalEmployees = emps.length;
  const activeCount = emps.filter((e: any) => e.isActive).length;
  const byDepartment: Record<string, number> = {};
  for (const e of emps) {
    const d = e.department || "Unassigned";
    byDepartment[d] = (byDepartment[d] || 0) + 1;
  }
  const attSummary = (attData as any).summary || {};
  const overallStats = (scoreData as any).overallStats || {};
  const events = (eventData as any).events || [];
  const scorecards = (scoreData as any).scorecards || [];
  const byDept = byDepartment;

  // Attendance trend (last 7 days)
  const attRecords = (attData as any).attendance || [];
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

  const deptPie = Object.entries(byDept).map(([name, value]) => ({ name, value: value as number }));

  // Estimate monthly payroll from active employees
  const avgSalary = 45000;
  const estPayroll = activeCount * avgSalary;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <KpiCard label="Total Staff" value={totalEmployees} icon={Users} accent="navy" />
        <KpiCard label="Active Today" value={activeCount} icon={UserCheck} accent="success" />
        <KpiCard label="Attendance Rate" value={attSummary.attendanceRate ?? 0} unit="%" icon={Percent} accent="gold" />
        <KpiCard label="Avg Score" value={overallStats.averageScore ?? 0} icon={Star} accent="info" />
        <KpiCard label="Open Positions" value={3} icon={Briefcase} accent="warning" hint="FOM, Chef, HK" />
        <KpiCard label="Monthly Payroll" value={fmtINR(estPayroll)} icon={IndianRupee} accent="error" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="font-display text-sm">Attendance Trend (7 days)</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={trend}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} /><Tooltip /><Legend />
                <Bar dataKey="Present" fill={CC[0]} radius={[4,4,0,0]} /><Bar dataKey="Absent" fill={CC[4]} radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="font-display text-sm">Department Distribution</CardTitle></CardHeader>
          <CardContent>
            {deptPie.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart><Pie data={deptPie} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent*100).toFixed(0)}%`} labelLine={false}>
                  {deptPie.map((_, i) => <Cell key={i} fill={CC[i % CC.length]} />)}
                </Pie><Tooltip /></PieChart>
              </ResponsiveContainer>
            ) : <p className="text-sm text-muted-foreground text-center py-10">No department data</p>}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="font-display text-sm">Recent Events</CardTitle></CardHeader>
          <CardContent className="max-h-64 overflow-y-auto">
            {events.length === 0 ? <p className="text-sm text-muted-foreground">No events this month</p> :
              events.slice(0, 8).map((e: any) => (
                <div key={e.id} className="flex items-center gap-3 py-2 border-b last:border-0">
                  <Badge className={cn("text-[10px]", EVENT_COLORS[e.type] || "bg-muted")}>{e.type}</Badge>
                  <div className="min-w-0 flex-1"><p className="text-sm font-medium truncate">{e.title}</p><p className="text-xs text-muted-foreground">{fmtDate(e.eventDate)}</p></div>
                </div>
              ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="font-display text-sm">Top Performers</CardTitle></CardHeader>
          <CardContent className="max-h-64 overflow-y-auto">
            {scorecards.length === 0 ? <p className="text-sm text-muted-foreground">No scorecard data</p> :
              scorecards.slice(0, 6).map((sc: any) => (
                <div key={sc.id} className="flex items-center gap-3 py-2 border-b last:border-0">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#1B3A6B] text-white text-xs font-bold">{(sc.userName||"?")[0]}</div>
                  <div className="min-w-0 flex-1"><p className="text-sm font-medium truncate">{sc.userName}</p><p className="text-xs text-muted-foreground">{sc.department || sc.departmentCode || "—"}</p></div>
                  <Badge className={cn("text-[10px]", GRADE_COLORS[sc.grade] || "")}>{sc.grade} — {sc.overallScore}</Badge>
                </div>
              ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ─── TAB 2: ATTENDANCE ─────────────────────────────────────────────
function AttendanceTab() {
  const [month, setMonth] = useState(String(now.getMonth() + 1));
  const [year, setYear] = useState(String(now.getFullYear()));
  const [view, setView] = useState("monthly");
  const [markOpen, setMarkOpen] = useState(false);
  const [form, setForm] = useState({ userId: "", date: "", checkIn: "", checkOut: "", status: "present" });
  const { data: empData } = useApi<any>("/api/hr/employees?isActive=true", []);
  const { data, loading, reload } = useApi<any>(`/api/hr/attendance?month=${month}&year=${year}&view=${view}`, [month, year, view]);
  const { triggerRefresh } = useAppStore();

  const employees: any[] = Array.isArray(empData) ? empData : [];
  const summary = data?.summary || {};
  const records: any[] = data?.attendance || data?.todayAttendance || [];

  const handleMark = async () => {
    try {
      await apiPost("/api/hr/attendance", { ...form, source: "manual" });
      toast.success("Attendance recorded"); setMarkOpen(false); reload(); triggerRefresh();
    } catch (e: any) { toast.error(e.message); }
  };

  const markAllPresent = async () => {
    try {
      const recs = employees.map((e: any) => ({ userId: e.id, date: new Date().toISOString().slice(0, 10), status: "present" as const }));
      await apiPut("/api/hr/attendance", { records: recs });
      toast.success(`Marked ${recs.length} present`); reload(); triggerRefresh();
    } catch (e: any) { toast.error(e.message); }
  };

  if (loading || !data) return <SkeletonGrid />;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Select value={month} onValueChange={setMonth}>
          <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
          <SelectContent>{MONTHS.map((m, i) => <SelectItem key={i} value={String(i+1)}>{m}</SelectItem>)}</SelectContent>
        </Select>
        <Input className="w-24" value={year} onChange={(e) => setYear(e.target.value)} placeholder="Year" />
        <div className="flex gap-1">
          {["daily","weekly","monthly"].map(v => (
            <Button key={v} size="sm" variant={view === v ? "default" : "outline"} onClick={() => setView(v)}>{v.charAt(0).toUpperCase()+v.slice(1)}</Button>
          ))}
        </div>
        <div className="ml-auto flex gap-2">
          <Button size="sm" variant="outline" onClick={markAllPresent}><CheckCheck className="h-3.5 w-3.5 mr-1" />Mark All Present</Button>
          <Button size="sm" variant="outline" onClick={() => toast.info("Excel upload coming soon")}><Upload className="h-3.5 w-3.5 mr-1" />Upload Excel</Button>
          <Button size="sm" onClick={() => setMarkOpen(true)}><Plus className="h-3.5 w-3.5 mr-1" />Mark Attendance</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <KpiCard label="Present" value={summary.totalPresent ?? 0} icon={UserCheck} accent="success" />
        <KpiCard label="Absent" value={summary.totalAbsent ?? 0} icon={Users} accent="error" />
        <KpiCard label="Late" value={summary.totalLate ?? 0} icon={Clock} accent="warning" />
        <KpiCard label="Half Day" value={summary.totalHalfDay ?? 0} icon={Percent} accent="info" />
        <KpiCard label="On Leave" value={summary.totalOnLeave ?? 0} icon={CalendarDays} accent="navy" />
        <KpiCard label="Att. Rate" value={summary.attendanceRate ?? 0} unit="%" icon={BarChart3} accent="gold" />
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Employee</TableHead><TableHead>Date</TableHead><TableHead>Check-In</TableHead><TableHead>Check-Out</TableHead>
            <TableHead>Hours</TableHead><TableHead>Overtime</TableHead><TableHead>Status</TableHead><TableHead>Source</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {records.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No attendance records</TableCell></TableRow>
            ) : records.map((r: any) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{r.user?.firstName} {r.user?.lastName}<p className="text-[10px] text-muted-foreground">{r.user?.employeeCode}</p></TableCell>
                <TableCell className="font-mono-num text-xs">{fmtDate(r.date)}</TableCell>
                <TableCell className="font-mono-num text-xs">{r.checkIn ? fmtDateTime(r.checkIn) : "—"}</TableCell>
                <TableCell className="font-mono-num text-xs">{r.checkOut ? fmtDateTime(r.checkOut) : "—"}</TableCell>
                <TableCell className="font-mono-num text-xs">{r.workHours ?? "—"}</TableCell>
                <TableCell className="font-mono-num text-xs">{r.overtimeHours || "—"}</TableCell>
                <TableCell><Badge className={cn("text-[10px] border", ATTENDANCE_COLORS[r.status] || "")}>{r.status?.replace("_"," ")}</Badge></TableCell>
                <TableCell className="text-xs capitalize">{r.source}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={markOpen} onOpenChange={setMarkOpen}>
        <DialogContent><DialogHeader><DialogTitle>Mark Attendance</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Employee</Label><Select value={form.userId} onValueChange={v => setForm(f => ({ ...f, userId: v }))}>
              <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
              <SelectContent>{employees.map((e: any) => <SelectItem key={e.id} value={e.id}>{e.fullName}</SelectItem>)}</SelectContent>
            </Select></div>
            <div><Label>Date</Label><Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Check-In</Label><Input type="time" value={form.checkIn} onChange={e => setForm(f => ({ ...f, checkIn: e.target.value }))} /></div>
              <div><Label>Check-Out</Label><Input type="time" value={form.checkOut} onChange={e => setForm(f => ({ ...f, checkOut: e.target.value }))} /></div>
            </div>
            <div><Label>Status</Label><Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{["present","absent","late","half_day","on_leave"].map(s => <SelectItem key={s} value={s}>{s.replace("_"," ")}</SelectItem>)}</SelectContent>
            </Select></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setMarkOpen(false)}>Cancel</Button><Button onClick={handleMark}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── TAB 3: EMPLOYEES ──────────────────────────────────────────────
function EmployeesTab() {
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("all");
  const [addOpen, setAddOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", role: "", department: "", phone: "" });
  const { data, loading, reload } = useApi<any>(`/api/hr/employees?isActive=all${search ? `&search=${search}` : ""}${deptFilter !== "all" ? `&department=${deptFilter}` : ""}`, [search, deptFilter]);
  const { triggerRefresh } = useAppStore();

  const employees: any[] = Array.isArray(data) ? data : [];
  const summary = (data as any)?.summary || {};
  const departments = Object.keys(summary.byDepartment || {});

  const resetForm = () => setForm({ firstName: "", lastName: "", email: "", role: "", department: "", phone: "" });

  const handleSave = async () => {
    try {
      const body = { ...form, departmentId: form.department || undefined };
      if (editItem) { await apiPut("/api/hr/employees", { id: editItem.id, ...body }); toast.success("Employee updated"); }
      else { await apiPost("/api/hr/employees", body); toast.success("Employee added"); }
      setAddOpen(false); setEditItem(null); resetForm(); reload(); triggerRefresh();
    } catch (e: any) { toast.error(e.message); }
  };

  const handleDelete = async (id: string) => {
    try { await apiPut("/api/hr/employees", { id, isActive: false }); toast.success("Employee deactivated"); reload(); triggerRefresh(); }
    catch (e: any) { toast.error(e.message); }
  };

  if (loading || !data) return <SkeletonGrid />;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]"><Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" /><Input className="pl-9" placeholder="Search employees..." value={search} onChange={e => setSearch(e.target.value)} /></div>
        <Select value={deptFilter} onValueChange={setDeptFilter}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Department" /></SelectTrigger>
          <SelectContent><SelectItem value="all">All Departments</SelectItem>{departments.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
        </Select>
        <Button size="sm" onClick={() => { resetForm(); setEditItem(null); setAddOpen(true); }}><Plus className="h-3.5 w-3.5 mr-1" />Add Employee</Button>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Photo</TableHead><TableHead>Name</TableHead><TableHead>Code</TableHead><TableHead>Department</TableHead>
            <TableHead>Role</TableHead><TableHead>Phone</TableHead><TableHead>Email</TableHead><TableHead>Status</TableHead><TableHead>Actions</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {employees.length === 0 ? (
              <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">No employees found</TableCell></TableRow>
            ) : employees.map((e: any) => (
              <TableRow key={e.id}>
                <TableCell><div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#1B3A6B] text-white text-xs font-bold">{e.firstName?.[0]}{e.lastName?.[0]}</div></TableCell>
                <TableCell className="font-medium">{e.fullName}</TableCell>
                <TableCell className="font-mono-num text-xs">{e.employeeCode}</TableCell>
                <TableCell className="text-xs">{e.department || "—"}</TableCell>
                <TableCell className="text-xs">{ROLE_LABEL[e.role] || e.role}</TableCell>
                <TableCell className="text-xs">{e.phone || "—"}</TableCell>
                <TableCell className="text-xs truncate max-w-[180px]">{e.email}</TableCell>
                <TableCell><Badge className={cn("text-[10px]", e.isActive ? "bg-[#DCFCE7] text-[#14532D]" : "bg-muted text-muted-foreground")}>{e.isActive ? "Active" : "Inactive"}</Badge></TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setForm({ firstName: e.firstName, lastName: e.lastName, email: e.email, role: e.role, department: e.departmentCode || "", phone: e.phone || "" }); setEditItem(e); setAddOpen(true); }}><Pencil className="h-3 w-3" /></Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-[#DC2626]" onClick={() => handleDelete(e.id)}><Trash2 className="h-3 w-3" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent><DialogHeader><DialogTitle>{editItem ? "Edit Employee" : "Add Employee"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>First Name</Label><Input value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))} /></div>
            <div><Label>Last Name</Label><Input value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))} /></div>
            <div className="col-span-2"><Label>Email</Label><Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
            <div><Label>Role</Label><Select value={form.role} onValueChange={v => setForm(f => ({ ...f, role: v }))}>
              <SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger>
              <SelectContent>{ROLES.map(r => <SelectItem key={r} value={r}>{ROLE_LABEL[r]}</SelectItem>)}</SelectContent>
            </Select></div>
            <div><Label>Department</Label><Select value={form.department} onValueChange={v => setForm(f => ({ ...f, department: v }))}>
              <SelectTrigger><SelectValue placeholder="Select dept" /></SelectTrigger>
              <SelectContent>{departments.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
            </Select></div>
            <div className="col-span-2"><Label>Phone</Label><Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => { setAddOpen(false); setEditItem(null); }}>Cancel</Button><Button onClick={handleSave}>{editItem ? "Update" : "Add"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── TAB 4: PAYROLL ────────────────────────────────────────────────
function PayrollTab() {
  const [month, setMonth] = useState(String(now.getMonth() + 1));
  const [year, setYear] = useState(String(now.getFullYear()));
  const [statusFilter, setStatusFilter] = useState("all");
  const [slipItem, setSlipItem] = useState<any>(null);
  const { data, loading, reload } = useApi<any>(`/api/hr/payroll?month=${month}&year=${year}${statusFilter !== "all" ? `&status=${statusFilter}` : ""}`, [month, year, statusFilter]);
  const { triggerRefresh } = useAppStore();

  const summary = data?.summary || {};
  const records: any[] = data?.records || [];

  const handleAction = async (action: string) => {
    try {
      const res: any = await apiPost("/api/hr/payroll", { action, month: Number(month), year: Number(year) });
      toast.success(res.message || `${action} done`); reload(); triggerRefresh();
    } catch (e: any) { toast.error(e.message); }
  };

  if (loading || !data) return <SkeletonGrid />;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Select value={month} onValueChange={setMonth}>
          <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
          <SelectContent>{MONTHS.map((m, i) => <SelectItem key={i} value={String(i+1)}>{m}</SelectItem>)}</SelectContent>
        </Select>
        <Input className="w-24" value={year} onChange={e => setYear(e.target.value)} placeholder="Year" />
        <div className="flex gap-1">
          {[{ v: "all", l: "All" }, { v: "draft", l: "Draft" }, { v: "processed", l: "Processed" }, { v: "paid", l: "Paid" }].map(({ v, l }) => (
            <Button key={v} size="sm" variant={statusFilter === v ? "default" : "outline"} onClick={() => setStatusFilter(v)}>{l}</Button>
          ))}
        </div>
        <div className="ml-auto flex gap-2">
          <Button size="sm" variant="outline" onClick={() => handleAction("generate")}><FileText className="h-3.5 w-3.5 mr-1" />Generate</Button>
          <Button size="sm" variant="outline" onClick={() => handleAction("process")}><CheckCheck className="h-3.5 w-3.5 mr-1" />Process All</Button>
          <Button size="sm" onClick={() => handleAction("pay")}><IndianRupee className="h-3.5 w-3.5 mr-1" />Mark Paid</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Total Gross" value={fmtINR(summary.totalGrossEarnings ?? 0)} icon={IndianRupee} accent="navy" />
        <KpiCard label="Total Deductions" value={fmtINR(summary.totalDeductions ?? 0)} icon={Percent} accent="error" />
        <KpiCard label="Total Net Pay" value={fmtINR(summary.totalNetPay ?? 0)} icon={IndianRupee} accent="success" />
        <KpiCard label="Employees" value={summary.employeeCount ?? 0} icon={Users} accent="gold" />
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Employee</TableHead><TableHead>Basic</TableHead><TableHead>HRA</TableHead><TableHead>Gross</TableHead>
            <TableHead>PF/ESI/PT</TableHead><TableHead>Deductions</TableHead><TableHead>Net Pay</TableHead><TableHead>Status</TableHead><TableHead>Action</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {records.length === 0 ? (
              <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">No payroll records. Click Generate to create.</TableCell></TableRow>
            ) : records.map((r: any) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{r.user?.fullName}<p className="text-[10px] text-muted-foreground">{r.user?.employeeCode}</p></TableCell>
                <TableCell className="font-mono-num text-xs">{fmtINR(r.basicSalary)}</TableCell>
                <TableCell className="font-mono-num text-xs">{fmtINR(r.hra)}</TableCell>
                <TableCell className="font-mono-num text-xs">{fmtINR(r.grossEarnings)}</TableCell>
                <TableCell className="font-mono-num text-xs">{fmtINR(r.pf + r.esi + r.pt)}</TableCell>
                <TableCell className="font-mono-num text-xs">{fmtINR(r.totalDeductions)}</TableCell>
                <TableCell className="font-mono-num text-xs font-bold">{fmtINR(r.netPay)}</TableCell>
                <TableCell><Badge className={cn("text-[10px] border", PAYROLL_COLORS[r.status] || "")}>{r.status}</Badge></TableCell>
                <TableCell><Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setSlipItem(r)}><Eye className="h-3 w-3" /></Button></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Salary Slip Dialog */}
      <Dialog open={!!slipItem} onOpenChange={() => setSlipItem(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle className="font-display text-center">The Aurelian Grand — Salary Slip</DialogTitle></DialogHeader>
          {slipItem && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-2 border-b pb-3">
                <p><span className="text-muted-foreground">Name:</span> <strong>{slipItem.user?.fullName}</strong></p>
                <p><span className="text-muted-foreground">Code:</span> {slipItem.user?.employeeCode}</p>
                <p><span className="text-muted-foreground">Department:</span> {slipItem.user?.department || "—"}</p>
                <p><span className="text-muted-foreground">Period:</span> {MONTHS[(slipItem.month||1)-1]} {slipItem.year}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="font-semibold mb-1 text-xs uppercase tracking-wider text-muted-foreground">Earnings</p>
                  {[["Basic", slipItem.basicSalary],["HRA", slipItem.hra],["DA", slipItem.da],["Conveyance", slipItem.conveyance],
                    ["Medical", slipItem.medical],["Special Allow", slipItem.specialAllow],["Overtime", slipItem.overtime],["Bonus", slipItem.bonus],
                  ].map(([l, v]) => <div key={l as string} className="flex justify-between py-0.5"><span className="text-muted-foreground">{l}</span><span className="font-mono-num">{fmtINR(v as number)}</span></div>)
                  }<div className="flex justify-between border-t pt-1 mt-1 font-bold"><span>Gross</span><span className="font-mono-num">{fmtINR(slipItem.grossEarnings)}</span></div>
                </div>
                <div>
                  <p className="font-semibold mb-1 text-xs uppercase tracking-wider text-muted-foreground">Deductions</p>
                  {[["PF", slipItem.pf],["ESI", slipItem.esi],["Tax", slipItem.tax],["PT", slipItem.pt],
                    ["Loan", slipItem.loanDeduction],["Other", slipItem.otherDeductions],
                  ].map(([l, v]) => <div key={l as string} className="flex justify-between py-0.5"><span className="text-muted-foreground">{l}</span><span className="font-mono-num">{fmtINR(v as number)}</span></div>)
                  }<div className="flex justify-between border-t pt-1 mt-1 font-bold"><span>Total Ded.</span><span className="font-mono-num">{fmtINR(slipItem.totalDeductions)}</span></div>
                </div>
              </div>
              <div className="rounded-lg bg-[#1B3A6B] text-white p-3 text-center">
                <p className="text-xs uppercase tracking-wider">Net Pay</p>
                <p className="font-display text-2xl font-bold font-mono-num">{fmtINR(slipItem.netPay)}</p>
              </div>
            </div>
          )}
          <DialogFooter><Button variant="outline" onClick={() => toast.info("Print functionality coming soon")}><Printer className="h-3.5 w-3.5 mr-1" />Print</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── TAB 5: EVENTS ─────────────────────────────────────────────────
function EventsTab() {
  const [month, setMonth] = useState(String(now.getMonth() + 1));
  const [year, setYear] = useState(String(now.getFullYear()));
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({ title: "", type: "meeting", eventDate: "", endDate: "", venue: "", description: "" });
  const { data, loading, reload } = useApi<any>(`/api/hr/events?month=${month}&year=${year}`, [month, year]);
  const { triggerRefresh } = useAppStore();

  const events: any[] = data?.events || [];

  const handleSave = async () => {
    try {
      await apiPost("/api/hr/events", form);
      toast.success("Event created"); setAddOpen(false); setForm({ title: "", type: "meeting", eventDate: "", endDate: "", venue: "", description: "" }); reload(); triggerRefresh();
    } catch (e: any) { toast.error(e.message); }
  };

  if (loading || !data) return <SkeletonGrid />;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Select value={month} onValueChange={setMonth}>
          <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
          <SelectContent>{MONTHS.map((m, i) => <SelectItem key={i} value={String(i+1)}>{m}</SelectItem>)}</SelectContent>
        </Select>
        <Input className="w-24" value={year} onChange={e => setYear(e.target.value)} placeholder="Year" />
        <div className="ml-auto"><Button size="sm" onClick={() => setAddOpen(true)}><Plus className="h-3.5 w-3.5 mr-1" />Add Event</Button></div>
      </div>

      {events.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground"><CalendarDays className="h-12 w-12 mx-auto mb-3 opacity-30" /><p>No events this month</p></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 max-h-[600px] overflow-y-auto">
          {events.map((e: any) => (
            <Card key={e.id} className="hover:shadow-card-lg transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold truncate">{e.title}</p>
                    <Badge className={cn("mt-1 text-[10px] border", EVENT_COLORS[e.type] || "bg-muted")}>{e.type}</Badge>
                  </div>
                  <Badge variant="outline" className="text-[10px] shrink-0">{e.status}</Badge>
                </div>
                <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                  <p className="flex items-center gap-1.5"><Calendar className="h-3 w-3" />{fmtDate(e.eventDate)}{e.endDate ? ` — ${fmtDate(e.endDate)}` : ""}</p>
                  {e.venue && <p className="flex items-center gap-1.5"><MapPin className="h-3 w-3" />{e.venue}</p>}
                  {e.organizerName && <p className="flex items-center gap-1.5"><UserCircle className="h-3 w-3" />{e.organizerName}</p>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent><DialogHeader><DialogTitle>Add Event</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Title</Label><Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} /></div>
            <div><Label>Type</Label><Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{["festival","training","meeting","celebration","audit"].map(t => <SelectItem key={t} value={t}>{t.charAt(0).toUpperCase()+t.slice(1)}</SelectItem>)}</SelectContent>
            </Select></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Start Date</Label><Input type="date" value={form.eventDate} onChange={e => setForm(f => ({ ...f, eventDate: e.target.value }))} /></div>
              <div><Label>End Date</Label><Input type="date" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} /></div>
            </div>
            <div><Label>Venue</Label><Input value={form.venue} onChange={e => setForm(f => ({ ...f, venue: e.target.value }))} /></div>
            <div><Label>Description</Label><Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button><Button onClick={handleSave}>Create</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── TAB 6: SCORECARDS ─────────────────────────────────────────────
function ScorecardsTab() {
  const [period, setPeriod] = useState(`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}`);
  const [addOpen, setAddOpen] = useState(false);
  const { data: empData } = useApi<any>("/api/hr/employees?isActive=true", []);
  const { data, loading, reload } = useApi<any>(`/api/hr/scorecards?period=${period}`, [period]);
  const { triggerRefresh } = useAppStore();
  const [metrics, setMetrics] = useState({ userId: "", attendance: 90, punctuality: 8, taskCompletion: 85, guestFeedback: 8, teamwork: 7, initiative: 7, grooming: 9, communication: 8 });

  const employees: any[] = Array.isArray(empData) ? empData : [];
  const overallStats = data?.overallStats || {};
  const deptAvgs = data?.departmentAverages || {};
  const scorecards: any[] = data?.scorecards || [];

  const deptChartData = Object.entries(deptAvgs).map(([dept, d]: [string, any]) => ({ department: dept, average: d.average }));

  const handleSave = async () => {
    try {
      await apiPost("/api/hr/scorecards", { ...metrics, period });
      toast.success("Scorecard saved"); setAddOpen(false); reload(); triggerRefresh();
    } catch (e: any) { toast.error(e.message); }
  };

  if (loading || !data) return <SkeletonGrid />;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            {Array.from({ length: 12 }, (_, i) => { const m = now.getMonth() - i; const d = new Date(now.getFullYear(), m, 1); const p = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`; return p; })
              .filter((v, i, a) => a.indexOf(v) === i).map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="ml-auto"><Button size="sm" onClick={() => setAddOpen(true)}><Plus className="h-3.5 w-3.5 mr-1" />Add Scorecard</Button></div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <KpiCard label="Avg Score" value={overallStats.averageScore ?? 0} icon={Star} accent="gold" />
        <KpiCard label="A+ Count" value={(overallStats.byGrade || {})["A+"] ?? 0} icon={Award} accent="success" />
        <KpiCard label="Total Evaluated" value={overallStats.totalEmployees ?? 0} icon={Users} accent="navy" />
      </div>

      {deptChartData.length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="font-display text-sm">Department Averages</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={deptChartData} layout="vertical"><CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} /><YAxis type="category" dataKey="department" tick={{ fontSize: 11 }} width={100} />
                <Tooltip /><Bar dataKey="average" fill={CC[0]} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Employee</TableHead><TableHead>Dept</TableHead><TableHead>Att%</TableHead><TableHead>Punct.</TableHead>
            <TableHead>Task%</TableHead><TableHead>Feedback</TableHead><TableHead>Team</TableHead><TableHead>Init.</TableHead>
            <TableHead>Groom.</TableHead><TableHead>Comm.</TableHead><TableHead>Overall</TableHead><TableHead>Grade</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {scorecards.length === 0 ? (
              <TableRow><TableCell colSpan={12} className="text-center text-muted-foreground py-8">No scorecards for this period</TableCell></TableRow>
            ) : scorecards.map((sc: any) => (
              <TableRow key={sc.id}>
                <TableCell className="font-medium">{sc.userName}</TableCell>
                <TableCell className="text-xs">{sc.department || "—"}</TableCell>
                <TableCell className="font-mono-num text-xs">{sc.attendance}</TableCell>
                <TableCell className="font-mono-num text-xs">{sc.punctuality}</TableCell>
                <TableCell className="font-mono-num text-xs">{sc.taskCompletion}</TableCell>
                <TableCell className="font-mono-num text-xs">{sc.guestFeedback}</TableCell>
                <TableCell className="font-mono-num text-xs">{sc.teamwork}</TableCell>
                <TableCell className="font-mono-num text-xs">{sc.initiative}</TableCell>
                <TableCell className="font-mono-num text-xs">{sc.grooming}</TableCell>
                <TableCell className="font-mono-num text-xs">{sc.communication}</TableCell>
                <TableCell className="font-mono-num text-xs font-bold">{sc.overallScore}</TableCell>
                <TableCell><Badge className={cn("text-[10px]", GRADE_COLORS[sc.grade] || "")}>{sc.grade}</Badge></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-md"><DialogHeader><DialogTitle>Add Scorecard</DialogTitle></DialogHeader>
          <div className="space-y-3 max-h-[60vh] overflow-y-auto">
            <div><Label>Employee</Label><Select value={metrics.userId} onValueChange={v => setMetrics(m => ({ ...m, userId: v }))}>
              <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
              <SelectContent>{employees.map((e: any) => <SelectItem key={e.id} value={e.id}>{e.fullName}</SelectItem>)}</SelectContent>
            </Select></div>
            {[
              { key: "attendance", label: "Attendance %", max: 100 }, { key: "punctuality", label: "Punctuality (0-10)", max: 10 },
              { key: "taskCompletion", label: "Task Completion %", max: 100 }, { key: "guestFeedback", label: "Guest Feedback (0-10)", max: 10 },
              { key: "teamwork", label: "Teamwork (0-10)", max: 10 }, { key: "initiative", label: "Initiative (0-10)", max: 10 },
              { key: "grooming", label: "Grooming (0-10)", max: 10 }, { key: "communication", label: "Communication (0-10)", max: 10 },
            ].map(({ key, label, max }) => (
              <div key={key}><Label className="text-xs">{label}</Label><Input type="number" min={0} max={max} value={(metrics as any)[key]} onChange={e => setMetrics(m => ({ ...m, [key]: Number(e.target.value) }))} /></div>
            ))}
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button><Button onClick={handleSave}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── HELPERS ────────────────────────────────────────────────────────
function SkeletonGrid() {
  return <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-24" />)}</div>;
}
