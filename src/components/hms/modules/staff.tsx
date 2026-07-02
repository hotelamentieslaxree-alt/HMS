// ARIA HMS — Staff Directory Module
"use client";

import { useState, useMemo, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useApi, apiPost, apiPut } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import { KpiCard, fmtINR, fmtDate, fmtDateTime, timeAgo } from "../shared";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Users, UserCheck, Search, Building2, Phone, Mail,
  MapPin, Filter, ChevronRight, ChevronDown, UserCircle,
  Briefcase, GitBranch, PhoneCall, MailOpen,
  PieChart as PieChartIcon,
} from "lucide-react";
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend,
} from "recharts";

// ─── CONSTANTS ──────────────────────────────────────────────────────
const NAVY = "#1B3A6B";
const GOLD = "#C9952A";
const SUCCESS = "#16A34A";
const CHART_COLORS = [NAVY, GOLD, SUCCESS, "#0369A1", "#D97706", "#7C3AED", "#BE185D", "#0F766E"];

const ROLE_LABEL: Record<string, string> = {
  owner: "Owner/CEO",
  gm: "General Manager",
  fom: "Front Office Mgr",
  receptionist: "Receptionist",
  hk_mgr: "Housekeeping Mgr",
  hk_attendant: "HK Attendant",
  fb_mgr: "F&B Manager",
  waiter: "Waiter",
  rev_mgr: "Revenue Mgr",
  fin_mgr: "Finance Mgr",
  eng_mgr: "Engineering Mgr",
  technician: "Technician",
  hr_mgr: "HR Manager",
  sales_mgr: "Sales Manager",
  sales_exec: "Sales Executive",
  mkt_mgr: "Marketing Manager",
  mkt_exec: "Marketing Executive",
};

const ROLE_LEVEL: Record<string, number> = {
  owner: 1, gm: 2,
  fom: 3, hk_mgr: 3, fb_mgr: 3, rev_mgr: 3, fin_mgr: 3, eng_mgr: 3, hr_mgr: 3, sales_mgr: 3, mkt_mgr: 3,
  receptionist: 4, hk_attendant: 4, waiter: 4, technician: 4, sales_exec: 4, mkt_exec: 4,
};

const ROLE_DEPT: Record<string, string> = {
  owner: "Management", gm: "Management",
  fom: "Front Office", receptionist: "Front Office", rev_mgr: "Front Office",
  hk_mgr: "Housekeeping", hk_attendant: "Housekeeping",
  fb_mgr: "Food & Beverage", waiter: "Food & Beverage",
  fin_mgr: "Finance",
  eng_mgr: "Engineering", technician: "Engineering",
  hr_mgr: "Human Resources",
  sales_mgr: "Sales", sales_exec: "Sales",
  mkt_mgr: "Marketing", mkt_exec: "Marketing",
};

const DEPT_ICONS: Record<string, any> = {
  Management: Briefcase,
  "Front Office": UserCheck,
  Housekeeping: Building2,
  "Food & Beverage": Users,
  Finance: Briefcase,
  Engineering: Building2,
  "Human Resources": Users,
  Sales: Briefcase,
  Marketing: Briefcase,
};

const STATUS_META: Record<string, { label: string; cls: string }> = {
  active: { label: "Active", cls: "bg-[#DCFCE7] text-[#14532D] border-[#16A34A]" },
  inactive: { label: "Inactive", cls: "bg-[#FFE4E6] text-[#881337] border-[#DC2626]" },
  on_leave: { label: "On Leave", cls: "bg-[#FEF3C7] text-[#78350F] border-[#D97706]" },
};

// ─── HELPERS ────────────────────────────────────────────────────────
function getInitials(firstName?: string, lastName?: string): string {
  const f = firstName?.trim()?.[0] ?? "";
  const l = lastName?.trim()?.[0] ?? "";
  return (f + l).toUpperCase() || "?";
}

function getDepartment(emp: any): string {
  if (emp.department?.name) return emp.department.name;
  if (emp.departmentCode) return emp.departmentCode;
  return ROLE_DEPT[emp.role] || "Unassigned";
}

function getRoleLabel(role: string): string {
  return ROLE_LABEL[role] || role?.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) || "Staff";
}

function getStatus(emp: any): string {
  if (emp.isActive === false) return "inactive";
  if (emp.isOnLeave) return "on_leave";
  return "active";
}

// ─── EMPLOYEE DETAIL DIALOG ────────────────────────────────────────
function EmployeeDetailDialog({ employee, open, onClose }: { employee: any | null; open: boolean; onClose: () => void }) {
  if (!employee) return null;
  const status = getStatus(employee);
  const statusMeta = STATUS_META[status] || STATUS_META.active;
  const dept = getDepartment(employee);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Avatar className="h-14 w-14 border-2 border-[#1B3A6B]">
              {employee.avatarUrl ? <AvatarImage src={employee.avatarUrl} alt={employee.firstName} /> : null}
              <AvatarFallback className="bg-[#1B3A6B] text-white text-lg font-bold">
                {getInitials(employee.firstName, employee.lastName)}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-lg font-semibold">{employee.firstName} {employee.lastName}</p>
              <p className="text-sm text-muted-foreground">{getRoleLabel(employee.role)}</p>
            </div>
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="flex items-center gap-2">
            <Badge className={cn("text-xs border", statusMeta.cls)}>{statusMeta.label}</Badge>
            {employee.employeeCode && <Badge variant="outline" className="text-xs">{employee.employeeCode}</Badge>}
          </div>
          <Separator />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-muted-foreground">Department:</span>
              <span className="font-medium">{dept}</span>
            </div>
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-muted-foreground">Email:</span>
              <span className="font-medium truncate">{employee.email || "—"}</span>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-muted-foreground">Phone:</span>
              <span className="font-medium">{employee.phone || "—"}</span>
            </div>
            <div className="flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-muted-foreground">Joined:</span>
              <span className="font-medium">{employee.joinDate ? fmtDate(employee.joinDate) : "—"}</span>
            </div>
          </div>
          {employee.property?.name && (
            <>
              <Separator />
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-muted-foreground">Property:</span>
                <span className="font-medium">{employee.property.name}</span>
              </div>
            </>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── SKELETON LOADER ───────────────────────────────────────────────
function SkeletonGrid() {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-80 rounded-xl" />
    </div>
  );
}

// ─── MAIN COMPONENT ────────────────────────────────────────────────
const STAFF_TABS = [
  { key: "directory", label: "Directory", icon: Users },
  { key: "departments", label: "Departments", icon: Building2 },
  { key: "orgchart", label: "Org Chart", icon: PieChartIcon },
];

export function StaffModule() {
  const { activeSubModule, setActiveSubModule } = useAppStore();
  const [localTab, setLocalTab] = useState("directory");
  const tab = (activeSubModule && STAFF_TABS.some(t => t.key === activeSubModule)) ? activeSubModule : localTab;

  const handleTabChange = (newTab: string) => {
    setLocalTab(newTab);
    if (STAFF_TABS.some(t => t.key === newTab)) {
      setActiveSubModule(newTab);
    }
  };

  const activeTabMeta = STAFF_TABS.find(t => t.key === tab);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#1B3A6B]/10">
          <UserCheck className="h-4.5 w-4.5 text-[#1B3A6B]" />
        </div>
        <div className="min-w-0">
          <h2 className="font-display text-lg font-bold tracking-tight text-foreground">Staff Directory</h2>
          <p className="text-xs text-muted-foreground">{activeTabMeta?.label ?? "Directory"} · People & Organization</p>
        </div>
      </div>

      <Tabs value={tab} onValueChange={handleTabChange} className="space-y-4">
        <TabsList className="flex-wrap">
          <TabsTrigger value="directory">Directory</TabsTrigger>
          <TabsTrigger value="departments">Departments</TabsTrigger>
          <TabsTrigger value="orgchart">Org Chart</TabsTrigger>
        </TabsList>
        <TabsContent value="directory"><DirectoryTab /></TabsContent>
        <TabsContent value="departments"><DepartmentsTab /></TabsContent>
        <TabsContent value="orgchart"><OrgChartTab /></TabsContent>
      </Tabs>
    </div>
  );
}

// ─── TAB 1: DIRECTORY ──────────────────────────────────────────────
function DirectoryTab() {
  const { data: empData, loading, error } = useApi<any>("/api/hr/employees?isActive=all", []);
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedEmp, setSelectedEmp] = useState<any | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const employees: any[] = useMemo(() => {
    if (!empData) return [];
    return Array.isArray(empData) ? empData : [];
  }, [empData]);

  // Derive department list from data
  const departments = useMemo(() => {
    const set = new Set<string>();
    employees.forEach((e) => set.add(getDepartment(e)));
    return Array.from(set).sort();
  }, [employees]);

  // Filtered list
  const filtered = useMemo(() => {
    let list = [...employees];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (e) =>
          `${e.firstName} ${e.lastName}`.toLowerCase().includes(q) ||
          (e.email || "").toLowerCase().includes(q) ||
          (e.phone || "").includes(q) ||
          (e.employeeCode || "").toLowerCase().includes(q) ||
          getRoleLabel(e.role).toLowerCase().includes(q) ||
          getDepartment(e).toLowerCase().includes(q)
      );
    }
    if (deptFilter !== "all") {
      list = list.filter((e) => getDepartment(e) === deptFilter);
    }
    if (statusFilter !== "all") {
      if (statusFilter === "active") list = list.filter((e) => getStatus(e) === "active");
      else if (statusFilter === "inactive") list = list.filter((e) => getStatus(e) === "inactive");
      else if (statusFilter === "on_leave") list = list.filter((e) => getStatus(e) === "on_leave");
    }
    // Sort: active first, then by role level, then name
    list.sort((a, b) => {
      const sa = getStatus(a) === "active" ? 0 : getStatus(a) === "on_leave" ? 1 : 2;
      const sb = getStatus(b) === "active" ? 0 : getStatus(b) === "on_leave" ? 1 : 2;
      if (sa !== sb) return sa - sb;
      const la = ROLE_LEVEL[a.role] ?? 9;
      const lb = ROLE_LEVEL[b.role] ?? 9;
      if (la !== lb) return la - lb;
      return `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`);
    });
    return list;
  }, [employees, search, deptFilter, statusFilter]);

  // KPI stats
  const totalStaff = employees.length;
  const activeStaff = employees.filter((e) => getStatus(e) === "active").length;
  const onLeave = employees.filter((e) => getStatus(e) === "on_leave").length;
  const deptCount = departments.length;

  const openDetail = (emp: any) => {
    setSelectedEmp(emp);
    setDetailOpen(true);
  };

  if (loading) return <SkeletonGrid />;

  return (
    <div className="space-y-5">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Total Staff" value={totalStaff} icon={Users} accent="navy" />
        <KpiCard label="Active" value={activeStaff} icon={UserCheck} accent="success" />
        <KpiCard label="On Leave" value={onLeave} icon={MapPin} accent="warning" />
        <KpiCard label="Departments" value={deptCount} icon={Building2} accent="gold" />
      </div>

      {/* Search & Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, role, department..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={deptFilter} onValueChange={setDeptFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <Building2 className="h-4 w-4 mr-2 text-muted-foreground" />
                <SelectValue placeholder="Department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {departments.map((d) => (
                  <SelectItem key={d} value={d}>{d}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[140px]">
                <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="on_leave">On Leave</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Staff Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="font-display text-base">Staff Directory</CardTitle>
          <CardDescription className="text-xs">
            Showing {filtered.length} of {totalStaff} employees
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Users className="h-12 w-12 text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">No employees found</p>
              <p className="text-xs text-muted-foreground mt-1">Try adjusting your search or filters</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-[280px]">Employee</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead className="hidden md:table-cell">Department</TableHead>
                    <TableHead className="hidden lg:table-cell">Email</TableHead>
                    <TableHead className="hidden lg:table-cell">Phone</TableHead>
                    <TableHead className="w-[100px]">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((emp) => {
                    const status = getStatus(emp);
                    const statusMeta = STATUS_META[status] || STATUS_META.active;
                    const dept = getDepartment(emp);
                    return (
                      <TableRow
                        key={emp.id}
                        className="cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => openDetail(emp)}
                      >
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-9 w-9 border border-border">
                              {emp.avatarUrl ? <AvatarImage src={emp.avatarUrl} alt={emp.firstName} /> : null}
                              <AvatarFallback
                                className="text-xs font-bold"
                                style={{
                                  backgroundColor: NAVY,
                                  color: "white",
                                }}
                              >
                                {getInitials(emp.firstName, emp.lastName)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold truncate">
                                {emp.firstName} {emp.lastName}
                              </p>
                              <p className="text-[11px] text-muted-foreground truncate">
                                {emp.employeeCode || "—"}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">{getRoleLabel(emp.role)}</span>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <span className="text-sm text-muted-foreground">{dept}</span>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          <span className="text-sm text-muted-foreground truncate max-w-[180px] block">
                            {emp.email || "—"}
                          </span>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          <span className="text-sm text-muted-foreground">{emp.phone || "—"}</span>
                        </TableCell>
                        <TableCell>
                          <Badge className={cn("text-[10px] border", statusMeta.cls)}>
                            {statusMeta.label}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Employee Detail Dialog */}
      <EmployeeDetailDialog
        employee={selectedEmp}
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
      />
    </div>
  );
}

// ─── TAB 2: DEPARTMENTS ────────────────────────────────────────────
function DepartmentsTab() {
  const { data: empData, loading } = useApi<any>("/api/hr/employees?isActive=all", []);

  const employees: any[] = useMemo(() => {
    if (!empData) return [];
    return Array.isArray(empData) ? empData : [];
  }, [empData]);

  // Group by department
  const deptGroups = useMemo(() => {
    const map = new Map<string, any[]>();
    employees.forEach((emp) => {
      const dept = getDepartment(emp);
      if (!map.has(dept)) map.set(dept, []);
      map.get(dept)!.push(emp);
    });
    // Sort employees within each department by role level
    map.forEach((emps) => {
      emps.sort((a, b) => (ROLE_LEVEL[a.role] ?? 9) - (ROLE_LEVEL[b.role] ?? 9));
    });
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [employees]);

  // Pie chart data
  const pieData = useMemo(
    () => deptGroups.map(([name, emps]) => ({ name, value: emps.length })),
    [deptGroups]
  );

  const [selectedEmp, setSelectedEmp] = useState<any | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const openDetail = (emp: any) => {
    setSelectedEmp(emp);
    setDetailOpen(true);
  };

  if (loading) return <SkeletonGrid />;

  return (
    <div className="space-y-5">
      {/* Department Distribution Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="font-display text-sm">Department Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    innerRadius={50}
                    paddingAngle={3}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={true}
                  >
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number, name: string) => [`${value} employees`, name]}
                    contentStyle={{ borderRadius: "8px", border: "1px solid #e5e7eb", fontSize: "13px" }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[280px] text-sm text-muted-foreground">
                No department data available
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="font-display text-sm">Department Summary</CardTitle>
          </CardHeader>
          <CardContent>
            {deptGroups.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-10">No departments found</p>
            ) : (
              <div className="space-y-2">
                {deptGroups.map(([dept, emps], idx) => {
                  const activeCount = emps.filter((e) => getStatus(e) === "active").length;
                  const color = CHART_COLORS[idx % CHART_COLORS.length];
                  return (
                    <div
                      key={dept}
                      className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/30 transition-colors"
                    >
                      <div
                        className="h-10 w-10 rounded-lg flex items-center justify-center shrink-0"
                        style={{ backgroundColor: color + "18" }}
                      >
                        <Building2 className="h-5 w-5" style={{ color }} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold">{dept}</p>
                        <p className="text-xs text-muted-foreground">
                          {emps.length} member{emps.length !== 1 ? "s" : ""} &middot; {activeCount} active
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold" style={{ color }}>
                          {emps.length}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Department Cards */}
      <div className="space-y-4">
        {deptGroups.map(([dept, emps], idx) => {
          const color = CHART_COLORS[idx % CHART_COLORS.length];
          const head = emps.find((e) => ROLE_LEVEL[e.role] <= 3);
          return (
            <Card key={dept} className="overflow-hidden">
              <div className="h-1.5" style={{ backgroundColor: color }} />
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="h-10 w-10 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: color + "18" }}
                    >
                      <Building2 className="h-5 w-5" style={{ color }} />
                    </div>
                    <div>
                      <CardTitle className="font-display text-base">{dept}</CardTitle>
                      <CardDescription className="text-xs">
                        {emps.length} member{emps.length !== 1 ? "s" : ""}
                        {head ? ` · Head: ${head.firstName} ${head.lastName}` : ""}
                      </CardDescription>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs" style={{ borderColor: color, color }}>
                    {emps.length}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pb-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                  {emps.map((emp) => {
                    const status = getStatus(emp);
                    const statusMeta = STATUS_META[status] || STATUS_META.active;
                    return (
                      <div
                        key={emp.id}
                        className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/30 cursor-pointer transition-colors"
                        onClick={() => openDetail(emp)}
                      >
                        <Avatar className="h-10 w-10 border shrink-0" style={{ borderColor: color }}>
                          {emp.avatarUrl ? <AvatarImage src={emp.avatarUrl} alt={emp.firstName} /> : null}
                          <AvatarFallback className="text-xs font-bold" style={{ backgroundColor: color, color: "white" }}>
                            {getInitials(emp.firstName, emp.lastName)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold truncate">{emp.firstName} {emp.lastName}</p>
                          <p className="text-[11px] text-muted-foreground truncate">{getRoleLabel(emp.role)}</p>
                          <Badge className={cn("text-[9px] border mt-1 px-1.5 py-0", statusMeta.cls)}>
                            {statusMeta.label}
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Employee Detail Dialog */}
      <EmployeeDetailDialog
        employee={selectedEmp}
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
      />
    </div>
  );
}

// ─── TAB 3: ORG CHART ──────────────────────────────────────────────
function OrgChartTab() {
  const { data: empData, loading } = useApi<any>("/api/hr/employees?isActive=all", []);

  const employees: any[] = useMemo(() => {
    if (!empData) return [];
    return Array.isArray(empData) ? empData : [];
  }, [empData]);

  // Build hierarchy: group by role level, then by department
  const hierarchy = useMemo(() => {
    const levels = new Map<number, Map<string, any[]>>();

    employees.forEach((emp) => {
      const level = ROLE_LEVEL[emp.role] ?? 9;
      const dept = getDepartment(emp);

      if (!levels.has(level)) levels.set(level, new Map());
      const deptMap = levels.get(level)!;
      if (!deptMap.has(dept)) deptMap.set(dept, []);
      deptMap.get(dept)!.push(emp);
    });

    // Sort each level's employees by name
    levels.forEach((deptMap) => {
      deptMap.forEach((emps) => {
        emps.sort((a, b) => `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`));
      });
    });

    return Array.from(levels.entries()).sort(([a], [b]) => a - b);
  }, [employees]);

  const LEVEL_LABELS: Record<number, string> = {
    1: "Executive Leadership",
    2: "General Management",
    3: "Department Heads",
    4: "Team Members",
  };

  const [selectedEmp, setSelectedEmp] = useState<any | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [expandedDepts, setExpandedDepts] = useState<Set<string>>(new Set());

  const toggleDept = (key: string) => {
    setExpandedDepts((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const openDetail = (emp: any) => {
    setSelectedEmp(emp);
    setDetailOpen(true);
  };

  if (loading) return <SkeletonGrid />;

  return (
    <div className="space-y-5">
      {/* Org Overview KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard
          label="Leadership"
          value={employees.filter((e) => (ROLE_LEVEL[e.role] ?? 9) <= 2).length}
          icon={GitBranch}
          accent="navy"
        />
        <KpiCard
          label="Dept Heads"
          value={employees.filter((e) => (ROLE_LEVEL[e.role] ?? 9) === 3).length}
          icon={Briefcase}
          accent="gold"
        />
        <KpiCard
          label="Team Members"
          value={employees.filter((e) => (ROLE_LEVEL[e.role] ?? 9) >= 4).length}
          icon={Users}
          accent="success"
        />
        <KpiCard
          label="Departments"
          value={new Set(employees.map((e) => getDepartment(e))).size}
          icon={Building2}
          accent="info"
        />
      </div>

      {/* Hierarchy Cards */}
      <div className="space-y-6">
        {hierarchy.map(([level, deptMap]) => {
          const levelLabel = LEVEL_LABELS[level] || `Level ${level}`;
          const isExecutive = level <= 2;
          const isHead = level === 3;
          const accentColor = isExecutive ? NAVY : isHead ? GOLD : SUCCESS;

          return (
            <div key={level}>
              {/* Level Header */}
              <div className="flex items-center gap-3 mb-3">
                <div
                  className="h-8 w-1.5 rounded-full"
                  style={{ backgroundColor: accentColor }}
                />
                <h3 className="font-display text-base font-semibold" style={{ color: accentColor }}>
                  {levelLabel}
                </h3>
                <div className="flex-1 border-b border-dashed" />
                <Badge variant="outline" className="text-xs">
                  {Array.from(deptMap.values()).reduce((sum, emps) => sum + emps.length, 0)} people
                </Badge>
              </div>

              {/* Executive / GM — special centered layout */}
              {isExecutive ? (
                <div className="flex flex-wrap justify-center gap-4">
                  {Array.from(deptMap.values())
                    .flat()
                    .map((emp) => (
                      <OrgPersonCard
                        key={emp.id}
                        emp={emp}
                        accentColor={accentColor}
                        large
                        onClick={() => openDetail(emp)}
                      />
                    ))}
                </div>
              ) : (
                /* Department Heads & Members — grouped by department */
                <div className="space-y-3 ml-4">
                  {Array.from(deptMap.entries()).map(([dept, emps]) => {
                    const deptKey = `${level}-${dept}`;
                    const isExpanded = expandedDepts.has(deptKey);
                    const deptColor = CHART_COLORS[
                      Array.from(
                        new Set(employees.map((e) => getDepartment(e)))
                      ).indexOf(dept) % CHART_COLORS.length
                    ] || SUCCESS;

                    return (
                      <Card key={dept} className="overflow-hidden">
                        <div
                          className="flex items-center gap-3 p-3 cursor-pointer hover:bg-muted/30 transition-colors"
                          onClick={() => toggleDept(deptKey)}
                        >
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                          )}
                          <div
                            className="h-6 w-1.5 rounded-full"
                            style={{ backgroundColor: deptColor }}
                          />
                          <span className="text-sm font-semibold">{dept}</span>
                          <Badge variant="outline" className="text-[10px] ml-auto">
                            {emps.length}
                          </Badge>
                        </div>
                        {isExpanded && (
                          <CardContent className="pt-0 pb-3 px-3">
                            <div className="flex flex-wrap gap-3 ml-6">
                              {emps.map((emp) => (
                                <OrgPersonCard
                                  key={emp.id}
                                  emp={emp}
                                  accentColor={deptColor}
                                  onClick={() => openDetail(emp)}
                                />
                              ))}
                            </div>
                          </CardContent>
                        )}
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Employee Detail Dialog */}
      <EmployeeDetailDialog
        employee={selectedEmp}
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
      />
    </div>
  );
}

// ─── ORG PERSON CARD ───────────────────────────────────────────────
function OrgPersonCard({
  emp,
  accentColor,
  large = false,
  onClick,
}: {
  emp: any;
  accentColor: string;
  large?: boolean;
  onClick: () => void;
}) {
  const status = getStatus(emp);
  const statusMeta = STATUS_META[status] || STATUS_META.active;
  const dept = getDepartment(emp);

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-xl border bg-card hover:shadow-md cursor-pointer transition-all",
        large ? "p-4 min-w-[240px]" : "p-3"
      )}
      onClick={onClick}
    >
      <Avatar className={cn("border-2 shrink-0", large ? "h-14 w-14" : "h-10 w-10")} style={{ borderColor: accentColor }}>
        {emp.avatarUrl ? <AvatarImage src={emp.avatarUrl} alt={emp.firstName} /> : null}
        <AvatarFallback
          className={cn("font-bold", large ? "text-base" : "text-xs")}
          style={{ backgroundColor: accentColor, color: "white" }}
        >
          {getInitials(emp.firstName, emp.lastName)}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0">
        <p className={cn("font-semibold truncate", large ? "text-base" : "text-sm")}>
          {emp.firstName} {emp.lastName}
        </p>
        <p className="text-xs text-muted-foreground truncate">{getRoleLabel(emp.role)}</p>
        {large && (
          <div className="flex items-center gap-2 mt-1.5">
            <Badge className={cn("text-[9px] border px-1.5 py-0", statusMeta.cls)}>{statusMeta.label}</Badge>
            <span className="text-[11px] text-muted-foreground">{dept}</span>
          </div>
        )}
        {large && emp.email && (
          <div className="flex items-center gap-1 mt-1">
            <MailOpen className="h-3 w-3 text-muted-foreground" />
            <span className="text-[11px] text-muted-foreground truncate">{emp.email}</span>
          </div>
        )}
        {large && emp.phone && (
          <div className="flex items-center gap-1 mt-0.5">
            <PhoneCall className="h-3 w-3 text-muted-foreground" />
            <span className="text-[11px] text-muted-foreground">{emp.phone}</span>
          </div>
        )}
      </div>
    </div>
  );
}
