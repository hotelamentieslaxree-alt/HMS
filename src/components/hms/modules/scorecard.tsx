// ARIA HMS — Performance Scorecard Module (standalone)
"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useApi, apiPost, apiPut } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import { KpiCard, fmtDate } from "../shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import {
  Award,
  Star,
  TrendingUp,
  Users,
  BarChart3,
  Trophy,
  Plus,
  Pencil,
  ChevronLeft,
  Search,
  Medal,
  ArrowUpRight,
  ArrowDownRight,
  PieChart as PieChartIcon,
} from "lucide-react";
import {
  BarChart,
  Bar,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  LineChart,
  Line,
  ReferenceLine,
} from "recharts";

// ─── Constants ────────────────────────────────────────────────────
const NAVY = "#1B3A6B";
const GOLD = "#C9952A";
const SUCCESS = "#16A34A";

const GRADE_COLORS: Record<string, string> = {
  "A+": "bg-[#DCFCE7] text-[#14532D]",
  A: "bg-[#DCFCE7] text-[#16A34A]",
  "B+": "bg-[#DBEAFE] text-[#1B3A6B]",
  B: "bg-[#DBEAFE] text-[#0369A1]",
  C: "bg-[#FEF3C7] text-[#78350F]",
  D: "bg-[#FFE4E6] text-[#881337]",
};

const METRIC_DEFS: {
  key: string;
  label: string;
  weight: number;
  max: number;
  unit: string;
}[] = [
  { key: "attendance", label: "Attendance", weight: 15, max: 100, unit: "%" },
  { key: "punctuality", label: "Punctuality", weight: 10, max: 10, unit: "/10" },
  { key: "taskCompletion", label: "Task Completion", weight: 20, max: 100, unit: "%" },
  { key: "guestFeedback", label: "Guest Feedback", weight: 15, max: 10, unit: "/10" },
  { key: "teamwork", label: "Teamwork", weight: 10, max: 10, unit: "/10" },
  { key: "initiative", label: "Initiative", weight: 10, max: 10, unit: "/10" },
  { key: "grooming", label: "Grooming", weight: 10, max: 10, unit: "/10" },
  { key: "communication", label: "Communication", weight: 10, max: 10, unit: "/10" },
];

const now = new Date();

function currentPeriod() {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function periodLabel(p: string) {
  const [y, m] = p.split("-");
  const months = [
    "Jan","Feb","Mar","Apr","May","Jun",
    "Jul","Aug","Sep","Oct","Nov","Dec",
  ];
  return `${months[Number(m) - 1]} ${y}`;
}

function last12Periods(): string[] {
  const periods: string[] = [];
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    periods.push(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
    );
  }
  return periods;
}

// ─── Types ────────────────────────────────────────────────────────
interface ScorecardRow {
  id: string;
  period: string;
  userId: string;
  userName: string | null;
  department: string | null;
  departmentCode: string | null;
  attendance: number;
  punctuality: number;
  taskCompletion: number;
  guestFeedback: number;
  teamwork: number;
  initiative: number;
  grooming: number;
  communication: number;
  overallScore: number;
  grade: string;
  remarks: string | null;
  reviewedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ScorecardData {
  overallStats: {
    averageScore: number;
    totalEmployees: number;
    byGrade: Record<string, number>;
  };
  departmentAverages: Record<
    string,
    { average: number; count: number }
  >;
  scorecards: ScorecardRow[];
}

interface Employee {
  id: string;
  fullName: string;
  department: string | null;
  departmentCode: string | null;
  role: string;
  isActive: boolean;
}

// ─── Main Component ───────────────────────────────────────────────
const SC_TABS = [
  { key: "overview", label: "Overview", icon: BarChart3 },
  { key: "scorecards", label: "Scorecards", icon: Award },
  { key: "leaderboard", label: "Leaderboard", icon: PieChartIcon },
];

export function ScorecardModule() {
  const { activeSubModule, setActiveSubModule } = useAppStore();
  const [localTab, setLocalTab] = useState("overview");
  const tab = (activeSubModule && SC_TABS.some(t => t.key === activeSubModule)) ? activeSubModule : localTab;
  const [selectedEmployee, setSelectedEmployee] = useState<{
    userId: string;
    userName: string;
  } | null>(null);

  const handleTabChange = (newTab: string) => {
    setLocalTab(newTab);
    if (SC_TABS.some(t => t.key === newTab)) {
      setActiveSubModule(newTab);
    }
  };

  const activeTabMeta = SC_TABS.find(t => t.key === tab);

  const handleViewEmployee = (userId: string, userName: string) => {
    setSelectedEmployee({ userId, userName });
    setLocalTab("detail");
  };

  const handleBackFromDetail = () => {
    setSelectedEmployee(null);
    setLocalTab("overview");
    setActiveSubModule("overview");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#C9952A]/10">
          <Award className="h-4.5 w-4.5 text-[#C9952A]" />
        </div>
        <div className="min-w-0">
          <h2 className="font-display text-lg font-bold tracking-tight text-foreground">Scorecard</h2>
          <p className="text-xs text-muted-foreground">{activeTabMeta?.label ?? "Overview"} · Performance Evaluation</p>
        </div>
      </div>

      <Tabs value={tab} onValueChange={handleTabChange} className="space-y-4">
        <TabsList className="flex-wrap">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="scorecards">Scorecards</TabsTrigger>
          <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
          <TabsTrigger value="detail" disabled={!selectedEmployee}>
            {selectedEmployee
              ? selectedEmployee.userName
              : "Employee Detail"}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <OverviewTab onViewEmployee={handleViewEmployee} />
        </TabsContent>
        <TabsContent value="scorecards">
          <ScorecardsTab onViewEmployee={handleViewEmployee} />
        </TabsContent>
        <TabsContent value="leaderboard">
          <LeaderboardTab onViewEmployee={handleViewEmployee} />
        </TabsContent>
        <TabsContent value="detail">
          {selectedEmployee && (
            <EmployeeDetailTab
              userId={selectedEmployee.userId}
              userName={selectedEmployee.userName}
              onBack={handleBackFromDetail}
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─── Overview Tab ─────────────────────────────────────────────────
function OverviewTab({
  onViewEmployee,
}: {
  onViewEmployee: (userId: string, userName: string) => void;
}) {
  const [period, setPeriod] = useState(currentPeriod());
  const { data, loading, error } = useApi<ScorecardData>(
    `/api/hr/scorecards?period=${period}`,
    [period]
  );

  if (loading || !data) return <SkeletonOverview />;
  if (error)
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-center text-sm text-destructive">
        Failed to load scorecard data: {error}
      </div>
    );

  const { overallStats, departmentAverages, scorecards } = data;
  const byGrade = overallStats.byGrade || {};
  const topPerformer =
    scorecards.length > 0 ? scorecards[0] : null;

  // Grade distribution for chart
  const gradeOrder = ["A+", "A", "B+", "B", "C", "D"];
  const gradeDist = gradeOrder
    .filter((g) => (byGrade[g] || 0) > 0)
    .map((g) => ({ grade: g, count: byGrade[g] || 0 }));

  // Department averages chart
  const deptChartData = Object.entries(departmentAverages).map(
    ([dept, d]) => ({
      department: dept,
      average: d.average,
      count: d.count,
    })
  );

  return (
    <div className="space-y-5">
      {/* Period Selector */}
      <div className="flex items-center gap-2">
        <Label className="text-xs text-muted-foreground">Period</Label>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {last12Periods().map((p) => (
              <SelectItem key={p} value={p}>
                {periodLabel(p)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard
          label="Avg Score"
          value={overallStats.averageScore}
          unit="/100"
          icon={BarChart3}
          accent="navy"
        />
        <KpiCard
          label="Top Performer"
          value={topPerformer?.userName?.split(" ")[0] ?? "N/A"}
          hint={topPerformer ? `Score: ${topPerformer.overallScore}` : undefined}
          icon={Star}
          accent="gold"
        />
        <KpiCard
          label="Employees Evaluated"
          value={overallStats.totalEmployees}
          icon={Users}
          accent="success"
        />
        <KpiCard
          label="A+ Achievers"
          value={byGrade["A+"] || 0}
          icon={Trophy}
          accent="gold"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Grade Distribution */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="font-display text-sm">
              Grade Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            {gradeDist.length === 0 ? (
              <div className="flex items-center justify-center h-[200px] text-sm text-muted-foreground">
                No data for this period
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={gradeDist} barSize={48}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="grade"
                    tick={{ fontSize: 12, fontWeight: 600 }}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 11 }}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 8,
                      fontSize: 12,
                      border: "1px solid #e5e7eb",
                    }}
                  />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                    {gradeDist.map((entry) => {
                      const colorMap: Record<string, string> = {
                        "A+": "#16A34A",
                        A: "#22C55E",
                        "B+": "#0369A1",
                        B: "#38BDF8",
                        C: "#D97706",
                        D: "#DC2626",
                      };
                      return (
                        <rect
                          key={entry.grade}
                          fill={colorMap[entry.grade] || NAVY}
                        />
                      );
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Department Averages */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="font-display text-sm">
              Department Averages
            </CardTitle>
          </CardHeader>
          <CardContent>
            {deptChartData.length === 0 ? (
              <div className="flex items-center justify-center h-[200px] text-sm text-muted-foreground">
                No department data
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart
                  data={deptChartData}
                  layout="vertical"
                  barSize={18}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis
                    type="number"
                    domain={[0, 100]}
                    tick={{ fontSize: 11 }}
                  />
                  <YAxis
                    type="category"
                    dataKey="department"
                    tick={{ fontSize: 11 }}
                    width={110}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 8,
                      fontSize: 12,
                      border: "1px solid #e5e7eb",
                    }}
                    formatter={(value: number) => [
                      `${value.toFixed(1)}`,
                      "Avg Score",
                    ]}
                  />
                  <Bar
                    dataKey="average"
                    fill={GOLD}
                    radius={[0, 6, 6, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top 5 Performers Quick View */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="font-display text-sm flex items-center gap-2">
            <Trophy className="h-4 w-4 text-gold" />
            Top Performers — {periodLabel(period)}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {scorecards.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No scorecards for this period
            </div>
          ) : (
            <div className="space-y-2">
              {scorecards.slice(0, 5).map((sc, idx) => (
                <div
                  key={sc.id}
                  className="flex items-center gap-3 rounded-lg border px-3 py-2.5 hover:bg-accent/50 transition-colors cursor-pointer"
                  onClick={() =>
                    onViewEmployee(sc.userId, sc.userName || "Unknown")
                  }
                >
                  <div
                    className={cn(
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                      idx === 0
                        ? "bg-[#C9952A]/20 text-[#C9952A]"
                        : idx === 1
                          ? "bg-[#9CA3AF]/20 text-[#6B7280]"
                          : idx === 2
                            ? "bg-[#D97706]/20 text-[#D97706]"
                            : "bg-muted text-muted-foreground"
                    )}
                  >
                    {idx === 0 ? (
                      <Medal className="h-4 w-4" />
                    ) : (
                      idx + 1
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">
                      {sc.userName}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {sc.department || "Unassigned"}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold tabular-nums">
                      {sc.overallScore}
                    </p>
                    <Badge
                      className={cn(
                        "text-[10px] border-0",
                        GRADE_COLORS[sc.grade] || ""
                      )}
                    >
                      {sc.grade}
                    </Badge>
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

// ─── Scorecards Table Tab ─────────────────────────────────────────
function ScorecardsTab({
  onViewEmployee,
}: {
  onViewEmployee: (userId: string, userName: string) => void;
}) {
  const [period, setPeriod] = useState(currentPeriod());
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("all");
  const [addOpen, setAddOpen] = useState(false);
  const [editSc, setEditSc] = useState<ScorecardRow | null>(null);

  const { data, loading, reload } = useApi<ScorecardData>(
    `/api/hr/scorecards?period=${period}`,
    [period]
  );
  const { data: empData } = useApi<Employee[]>(
    "/api/hr/employees?isActive=true",
    []
  );
  const { triggerRefresh } = useAppStore();

  const employees: Employee[] = Array.isArray(empData) ? empData : [];
  const scorecards: ScorecardRow[] = data?.scorecards || [];
  const departments = useMemo(() => {
    const deptSet = new Set<string>();
    scorecards.forEach((sc) => {
      if (sc.department) deptSet.add(sc.department);
    });
    return Array.from(deptSet).sort();
  }, [scorecards]);

  const filtered = useMemo(() => {
    let result = scorecards;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (sc) =>
          sc.userName?.toLowerCase().includes(q) ||
          sc.department?.toLowerCase().includes(q)
      );
    }
    if (deptFilter !== "all") {
      result = result.filter((sc) => sc.department === deptFilter);
    }
    return result;
  }, [scorecards, search, deptFilter]);

  const handleSave = async (metrics: MetricFormState) => {
    try {
      if (editSc) {
        await apiPut("/api/hr/scorecards", {
          id: editSc.id,
          ...metrics,
          period,
        });
        toast.success("Scorecard updated");
      } else {
        await apiPost("/api/hr/scorecards", { ...metrics, period });
        toast.success("Scorecard saved");
      }
      setAddOpen(false);
      setEditSc(null);
      reload();
      triggerRefresh();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  if (loading || !data) return <SkeletonOverview />;

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {last12Periods().map((p) => (
              <SelectItem key={p} value={p}>
                {periodLabel(p)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="w-52 pl-8"
            placeholder="Search employee…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <Select value={deptFilter} onValueChange={setDeptFilter}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Departments</SelectItem>
            {departments.map((d) => (
              <SelectItem key={d} value={d}>
                {d}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="ml-auto">
          <Button
            size="sm"
            onClick={() => {
              setEditSc(null);
              setAddOpen(true);
            }}
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            Add Scorecard
          </Button>
        </div>
      </div>

      {/* Summary Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <KpiCard
          label="Avg Score"
          value={data.overallStats.averageScore}
          unit="/100"
          icon={BarChart3}
          accent="navy"
        />
        <KpiCard
          label="Evaluated"
          value={filtered.length}
          icon={Users}
          accent="success"
        />
        <KpiCard
          label="A+ Achievers"
          value={(data.overallStats.byGrade || {})["A+"] || 0}
          icon={Trophy}
          accent="gold"
        />
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[160px]">Employee</TableHead>
              <TableHead>Dept</TableHead>
              <TableHead className="text-center">Att%</TableHead>
              <TableHead className="text-center">Punct.</TableHead>
              <TableHead className="text-center">Task%</TableHead>
              <TableHead className="text-center">Feedback</TableHead>
              <TableHead className="text-center">Team</TableHead>
              <TableHead className="text-center">Init.</TableHead>
              <TableHead className="text-center">Groom.</TableHead>
              <TableHead className="text-center">Comm.</TableHead>
              <TableHead className="text-center font-bold">Overall</TableHead>
              <TableHead className="text-center">Grade</TableHead>
              <TableHead className="text-center">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={13}
                  className="text-center text-muted-foreground py-10"
                >
                  No scorecards found for {periodLabel(period)}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((sc) => (
                <TableRow
                  key={sc.id}
                  className="cursor-pointer hover:bg-accent/30 transition-colors"
                  onClick={() =>
                    onViewEmployee(sc.userId, sc.userName || "Unknown")
                  }
                >
                  <TableCell className="font-medium">
                    {sc.userName || "—"}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {sc.department || "—"}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-center">
                    {sc.attendance}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-center">
                    {sc.punctuality}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-center">
                    {sc.taskCompletion}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-center">
                    {sc.guestFeedback}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-center">
                    {sc.teamwork}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-center">
                    {sc.initiative}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-center">
                    {sc.grooming}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-center">
                    {sc.communication}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-center font-bold">
                    {sc.overallScore}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge
                      className={cn(
                        "text-[10px] border-0",
                        GRADE_COLORS[sc.grade] || ""
                      )}
                    >
                      {sc.grade}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditSc(sc);
                        setAddOpen(true);
                      }}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Add/Edit Dialog */}
      <ScorecardDialog
        open={addOpen}
        onOpenChange={(v) => {
          setAddOpen(v);
          if (!v) setEditSc(null);
        }}
        editSc={editSc}
        employees={employees}
        period={period}
        onSave={handleSave}
      />
    </div>
  );
}

// ─── Leaderboard Tab ──────────────────────────────────────────────
function LeaderboardTab({
  onViewEmployee,
}: {
  onViewEmployee: (userId: string, userName: string) => void;
}) {
  const [period, setPeriod] = useState(currentPeriod());
  const { data, loading } = useApi<ScorecardData>(
    `/api/hr/scorecards?period=${period}`,
    [period]
  );

  if (loading || !data)
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-16" />
        ))}
      </div>
    );

  const scorecards = data.scorecards || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Label className="text-xs text-muted-foreground">Period</Label>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {last12Periods().map((p) => (
              <SelectItem key={p} value={p}>
                {periodLabel(p)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {scorecards.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Trophy className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>No scorecards for this period</p>
        </div>
      ) : (
        <div className="space-y-2">
          {scorecards.map((sc, idx) => {
            const prevSc =
              idx < scorecards.length - 1 ? scorecards[idx + 1] : null;
            const scoreDiff = prevSc
              ? sc.overallScore - prevSc.overallScore
              : 0;

            return (
              <div
                key={sc.id}
                className="flex items-center gap-4 rounded-xl border px-4 py-3 hover:shadow-md hover:bg-accent/30 transition-all cursor-pointer"
                onClick={() =>
                  onViewEmployee(sc.userId, sc.userName || "Unknown")
                }
              >
                {/* Rank */}
                <div
                  className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold",
                    idx === 0
                      ? "bg-[#C9952A]/20 text-[#C9952A] ring-2 ring-[#C9952A]/30"
                      : idx === 1
                        ? "bg-[#9CA3AF]/20 text-[#6B7280] ring-2 ring-[#9CA3AF]/30"
                        : idx === 2
                          ? "bg-[#D97706]/20 text-[#D97706] ring-2 ring-[#D97706]/30"
                          : "bg-muted text-muted-foreground"
                  )}
                >
                  {idx < 3 ? (
                    <Medal className="h-5 w-5" />
                  ) : (
                    `#${idx + 1}`
                  )}
                </div>

                {/* Employee Info */}
                <div className="min-w-0 flex-1">
                  <p className="font-semibold truncate">
                    {sc.userName || "Unknown"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {sc.department || "Unassigned"}
                  </p>
                </div>

                {/* Score Bar */}
                <div className="hidden sm:flex items-center gap-3 w-48">
                  <div className="flex-1 h-2.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${sc.overallScore}%`,
                        backgroundColor:
                          sc.overallScore >= 90
                            ? SUCCESS
                            : sc.overallScore >= 70
                              ? NAVY
                              : sc.overallScore >= 50
                                ? GOLD
                                : "#DC2626",
                      }}
                    />
                  </div>
                </div>

                {/* Score + Grade + Diff */}
                <div className="text-right shrink-0 flex items-center gap-2">
                  {scoreDiff !== 0 && (
                    <span
                      className={cn(
                        "inline-flex items-center gap-0.5 text-[10px] font-medium",
                        scoreDiff > 0
                          ? "text-[#16A34A]"
                          : "text-[#DC2626]"
                      )}
                    >
                      {scoreDiff > 0 ? (
                        <ArrowUpRight className="h-3 w-3" />
                      ) : (
                        <ArrowDownRight className="h-3 w-3" />
                      )}
                      {Math.abs(scoreDiff).toFixed(1)}
                    </span>
                  )}
                  <div>
                    <p className="text-lg font-bold tabular-nums leading-none">
                      {sc.overallScore}
                    </p>
                    <Badge
                      className={cn(
                        "text-[10px] border-0 mt-1",
                        GRADE_COLORS[sc.grade] || ""
                      )}
                    >
                      {sc.grade}
                    </Badge>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Employee Detail Tab ──────────────────────────────────────────
function EmployeeDetailTab({
  userId,
  userName,
  onBack,
}: {
  userId: string;
  userName: string;
  onBack: () => void;
}) {
  const [period, setPeriod] = useState(currentPeriod());
  const periods = last12Periods();

  // Fetch all scorecards for this employee across periods (fetch current period, plus previous)
  // We need to fetch multiple periods for the trend. We'll use the current period's data and also
  // fetch the employee's scorecards by making requests for multiple periods.
  const { data: currentData, loading: l1 } = useApi<ScorecardData>(
    `/api/hr/scorecards?period=${period}&userId=${userId}`,
    [period, userId]
  );

  // For trend chart, we fetch data for multiple periods
  const [trendData, setTrendData] = useState<
    { period: string; overallScore: number; grade: string }[]
  >([]);
  const [trendLoading, setTrendLoading] = useState(true);

  const loadTrend = useCallback(async () => {
    setTrendLoading(true);
    try {
      const results: { period: string; overallScore: number; grade: string }[] =
        [];
      // Fetch last 6 periods for the trend
      for (const p of periods.slice(0, 6)) {
        try {
          const res = await fetch(
            `/api/hr/scorecards?period=${p}&userId=${userId}`,
            {
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${JSON.parse(localStorage.getItem("aria_auth") || "{}").token || ""}`,
              },
            }
          );
          const json = await res.json();
          if (json.success && json.data?.scorecards?.length > 0) {
            const sc = json.data.scorecards[0];
            results.push({
              period: p,
              overallScore: sc.overallScore,
              grade: sc.grade,
            });
          }
        } catch {
          // skip failed periods
        }
      }
      // Sort by period ascending
      results.sort((a, b) => a.period.localeCompare(b.period));
      setTrendData(results);
    } finally {
      setTrendLoading(false);
    }
  }, [userId, periods]);

  // Load trend on mount
  useMemo(() => {
    loadTrend();
  }, [loadTrend]);

  const currentSc = currentData?.scorecards?.[0] || null;

  // Radar chart data for current scorecard
  const radarData = currentSc
    ? METRIC_DEFS.map((m) => {
        const raw = (currentSc as any)[m.key] as number;
        // Normalize everything to 0-100 scale for the radar
        const normalized = m.max === 10 ? raw * 10 : raw;
        return {
          metric: m.label,
          score: normalized,
          weight: m.weight,
          fullMark: 100,
        };
      })
    : [];

  // Trend chart data
  const trendChartData = trendData.map((t) => ({
    period: periodLabel(t.period),
    score: t.overallScore,
    grade: t.grade,
  }));

  return (
    <div className="space-y-4">
      {/* Back button + Header */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={onBack}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#1B3A6B] text-white font-bold text-sm">
          {userName
            .split(" ")
            .map((n) => n[0])
            .join("")
            .slice(0, 2)}
        </div>
        <div>
          <h2 className="font-display text-lg font-bold">{userName}</h2>
          <p className="text-xs text-muted-foreground">
            {currentSc?.department || "Unassigned"} · Performance History
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {periods.map((p) => (
                <SelectItem key={p} value={p}>
                  {periodLabel(p)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {l1 ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      ) : !currentSc ? (
        <div className="text-center py-16 text-muted-foreground">
          <Award className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>No scorecard found for {periodLabel(period)}</p>
          <p className="text-xs mt-1">
            Try selecting a different period
          </p>
        </div>
      ) : (
        <>
          {/* Score Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <KpiCard
              label="Overall Score"
              value={currentSc.overallScore}
              unit="/100"
              icon={BarChart3}
              accent="navy"
            />
            <KpiCard
              label="Grade"
              value={currentSc.grade}
              icon={Award}
              accent={
                currentSc.grade.startsWith("A")
                  ? "success"
                  : currentSc.grade.startsWith("B")
                    ? "info"
                    : currentSc.grade === "C"
                      ? "warning"
                      : "error"
              }
            />
            <KpiCard
              label="Task Completion"
              value={currentSc.taskCompletion}
              unit="%"
              icon={TrendingUp}
              accent="gold"
            />
            <KpiCard
              label="Guest Feedback"
              value={currentSc.guestFeedback}
              unit="/10"
              icon={Star}
              accent="success"
            />
          </div>

          {/* Radar + Trend */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Radar Chart */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="font-display text-sm flex items-center gap-2">
                  <Award className="h-4 w-4" />
                  Metric Breakdown — {periodLabel(period)}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={320}>
                  <RadarChart
                    data={radarData}
                    cx="50%"
                    cy="50%"
                    outerRadius="70%"
                  >
                    <PolarGrid stroke="#e5e7eb" />
                    <PolarAngleAxis
                      dataKey="metric"
                      tick={{ fontSize: 10, fill: "#6B7280" }}
                    />
                    <PolarRadiusAxis
                      angle={90}
                      domain={[0, 100]}
                      tick={{ fontSize: 9 }}
                    />
                    <Radar
                      name="Score"
                      dataKey="score"
                      stroke={NAVY}
                      fill={NAVY}
                      fillOpacity={0.2}
                      strokeWidth={2}
                    />
                    <Tooltip
                      contentStyle={{
                        borderRadius: 8,
                        fontSize: 12,
                        border: "1px solid #e5e7eb",
                      }}
                      formatter={(value: number, name: string) => [
                        `${value.toFixed(0)}/100`,
                        "Normalized Score",
                      ]}
                    />
                  </RadarChart>
                </ResponsiveContainer>
                {/* Weight Legend */}
                <div className="mt-2 flex flex-wrap justify-center gap-x-3 gap-y-1">
                  {METRIC_DEFS.map((m) => (
                    <span
                      key={m.key}
                      className="text-[10px] text-muted-foreground"
                    >
                      {m.label}{" "}
                      <span className="font-semibold text-foreground">
                        {m.weight}%
                      </span>
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Trend Chart */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="font-display text-sm flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Score Trend
                </CardTitle>
              </CardHeader>
              <CardContent>
                {trendLoading ? (
                  <div className="flex items-center justify-center h-[320px]">
                    <Skeleton className="h-[280px] w-full" />
                  </div>
                ) : trendChartData.length === 0 ? (
                  <div className="flex items-center justify-center h-[320px] text-sm text-muted-foreground">
                    No historical data available
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={320}>
                    <LineChart data={trendChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="period"
                        tick={{ fontSize: 11 }}
                      />
                      <YAxis
                        domain={[0, 100]}
                        tick={{ fontSize: 11 }}
                      />
                      <Tooltip
                        contentStyle={{
                          borderRadius: 8,
                          fontSize: 12,
                          border: "1px solid #e5e7eb",
                        }}
                        formatter={(value: number) => [
                          `${value.toFixed(1)}`,
                          "Score",
                        ]}
                      />
                      <Line
                        type="monotone"
                        dataKey="score"
                        stroke={GOLD}
                        strokeWidth={2.5}
                        dot={{
                          fill: NAVY,
                          r: 4,
                          strokeWidth: 2,
                          stroke: GOLD,
                        }}
                        activeDot={{ r: 6 }}
                      />
                      {/* Reference lines for grade boundaries */}
                      <ReferenceLine y={90} stroke="#16A34A" strokeDasharray="4 4" label={{ value: "A+", position: "right", fontSize: 9, fill: "#16A34A" }} />
                      <ReferenceLine y={80} stroke="#0369A1" strokeDasharray="4 4" label={{ value: "A", position: "right", fontSize: 9, fill: "#0369A1" }} />
                      <ReferenceLine y={70} stroke="#1B3A6B" strokeDasharray="4 4" label={{ value: "B+", position: "right", fontSize: 9, fill: "#1B3A6B" }} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Detailed Metric Scores */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="font-display text-sm">
                Detailed Scores — {periodLabel(period)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {METRIC_DEFS.map((m) => {
                  const raw = (currentSc as any)[m.key] as number;
                  const normalized = m.max === 10 ? raw * 10 : raw;
                  const pct = Math.min(
                    100,
                    (normalized / 100) * 100
                  );
                  return (
                    <div
                      key={m.key}
                      className="rounded-lg border p-3 space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-muted-foreground">
                          {m.label}
                        </span>
                        <span className="text-[10px] font-semibold text-muted-foreground">
                          {m.weight}%
                        </span>
                      </div>
                      <div className="flex items-end gap-1">
                        <span className="text-lg font-bold tabular-nums leading-none">
                          {raw}
                        </span>
                        <span className="text-xs text-muted-foreground mb-0.5">
                          {m.unit}
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${pct}%`,
                            backgroundColor:
                              normalized >= 80
                                ? SUCCESS
                                : normalized >= 60
                                  ? NAVY
                                  : normalized >= 40
                                    ? GOLD
                                    : "#DC2626",
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Remarks */}
          {currentSc.remarks && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="font-display text-sm">
                  Remarks
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {currentSc.remarks}
                </p>
                {currentSc.reviewedBy && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Reviewed by: {currentSc.reviewedBy}
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

// ─── Add/Edit Scorecard Dialog ────────────────────────────────────
interface MetricFormState {
  userId: string;
  attendance: number;
  punctuality: number;
  taskCompletion: number;
  guestFeedback: number;
  teamwork: number;
  initiative: number;
  grooming: number;
  communication: number;
  remarks: string;
}

function defaultFormState(): MetricFormState {
  return {
    userId: "",
    attendance: 90,
    punctuality: 8,
    taskCompletion: 85,
    guestFeedback: 8,
    teamwork: 7,
    initiative: 7,
    grooming: 9,
    communication: 8,
    remarks: "",
  };
}

function ScorecardDialog({
  open,
  onOpenChange,
  editSc,
  employees,
  period,
  onSave,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editSc: ScorecardRow | null;
  employees: Employee[];
  period: string;
  onSave: (metrics: MetricFormState) => void;
}) {
  const [form, setForm] = useState<MetricFormState>(defaultFormState());
  const [saving, setSaving] = useState(false);

  // Reset form when dialog opens or editSc changes
  const handleOpenChange = (v: boolean) => {
    if (v) {
      if (editSc) {
        setForm({
          userId: editSc.userId,
          attendance: editSc.attendance,
          punctuality: editSc.punctuality,
          taskCompletion: editSc.taskCompletion,
          guestFeedback: editSc.guestFeedback,
          teamwork: editSc.teamwork,
          initiative: editSc.initiative,
          grooming: editSc.grooming,
          communication: editSc.communication,
          remarks: editSc.remarks || "",
        });
      } else {
        setForm(defaultFormState());
      }
    }
    onOpenChange(v);
  };

  // Compute live preview of overall score
  const previewScore = useMemo(() => {
    const s = form;
    const raw =
      s.attendance * 0.15 +
      s.punctuality * 10 * 0.1 +
      s.taskCompletion * 0.2 +
      s.guestFeedback * 10 * 0.15 +
      s.teamwork * 10 * 0.1 +
      s.initiative * 10 * 0.1 +
      s.grooming * 10 * 0.1 +
      s.communication * 10 * 0.1;
    return Math.round(raw * 100) / 100;
  }, [form]);

  const previewGrade = useMemo(() => {
    if (previewScore >= 90) return "A+";
    if (previewScore >= 80) return "A";
    if (previewScore >= 70) return "B+";
    if (previewScore >= 60) return "B";
    if (previewScore >= 50) return "C";
    return "D";
  }, [previewScore]);

  const handleSave = async () => {
    if (!form.userId) {
      toast.error("Please select an employee");
      return;
    }
    setSaving(true);
    try {
      await onSave(form);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">
            {editSc ? "Edit Scorecard" : "Add Scorecard"} —{" "}
            {periodLabel(period)}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Employee Selection */}
          <div>
            <Label className="text-sm font-medium">Employee</Label>
            <Select
              value={form.userId}
              onValueChange={(v) =>
                setForm((f) => ({ ...f, userId: v }))
              }
              disabled={!!editSc}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select employee" />
              </SelectTrigger>
              <SelectContent>
                {employees.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.fullName}
                    {e.department ? ` — ${e.department}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Metrics with Sliders */}
          <div className="space-y-4">
            {METRIC_DEFS.map((m) => {
              const value = (form as any)[m.key] as number;
              return (
                <div key={m.key} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">
                      {m.label}{" "}
                      <span className="text-muted-foreground text-xs font-normal">
                        ({m.weight}% weight)
                      </span>
                    </Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min={0}
                        max={m.max}
                        value={value}
                        onChange={(e) => {
                          let v = Number(e.target.value);
                          if (v < 0) v = 0;
                          if (v > m.max) v = m.max;
                          setForm((f) => ({ ...f, [m.key]: v }));
                        }}
                        className="w-16 h-8 text-center text-sm tabular-nums"
                      />
                      <span className="text-xs text-muted-foreground w-8">
                        {m.unit}
                      </span>
                    </div>
                  </div>
                  <Slider
                    min={0}
                    max={m.max}
                    step={m.max === 100 ? 1 : 0.5}
                    value={[value]}
                    onValueChange={([v]) =>
                      setForm((f) => ({ ...f, [m.key]: v }))
                    }
                    className="w-full"
                  />
                  {/* Progress bar visual */}
                  <div className="h-1 rounded-full bg-muted overflow-hidden -mt-1">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${(value / m.max) * 100}%`,
                        backgroundColor:
                          value / m.max >= 0.8
                            ? SUCCESS
                            : value / m.max >= 0.6
                              ? NAVY
                              : value / m.max >= 0.4
                                ? GOLD
                                : "#DC2626",
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Remarks */}
          <div>
            <Label className="text-sm font-medium">Remarks</Label>
            <Input
              className="mt-1"
              placeholder="Optional remarks…"
              value={form.remarks}
              onChange={(e) =>
                setForm((f) => ({ ...f, remarks: e.target.value }))
              }
            />
          </div>

          {/* Live Preview */}
          <div className="rounded-lg border-2 border-dashed border-[#1B3A6B]/20 bg-[#1B3A6B]/5 p-4">
            <p className="text-xs font-semibold text-[#1B3A6B] uppercase tracking-wider mb-2">
              Live Preview
            </p>
            <div className="flex items-center gap-4">
              <div>
                <p className="text-3xl font-bold tabular-nums text-foreground">
                  {previewScore}
                </p>
                <p className="text-xs text-muted-foreground">
                  Weighted Overall
                </p>
              </div>
              <div className="flex-1" />
              <Badge
                className={cn(
                  "text-lg px-3 py-1 border-0 font-bold",
                  GRADE_COLORS[previewGrade] || ""
                )}
              >
                {previewGrade}
              </Badge>
            </div>
            {/* Mini breakdown */}
            <div className="mt-3 grid grid-cols-4 gap-2">
              {METRIC_DEFS.map((m) => {
                const raw = (form as any)[m.key] as number;
                const weighted =
                  m.max === 100
                    ? raw * (m.weight / 100)
                    : raw * 10 * (m.weight / 100);
                return (
                  <div key={m.key} className="text-center">
                    <p className="text-[10px] text-muted-foreground truncate">
                      {m.label}
                    </p>
                    <p className="text-xs font-semibold tabular-nums">
                      {weighted.toFixed(1)}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || !form.userId}
          >
            {saving
              ? "Saving…"
              : editSc
                ? "Update Scorecard"
                : "Save Scorecard"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Skeletons ────────────────────────────────────────────────────
function SkeletonOverview() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Skeleton className="h-[280px]" />
        <Skeleton className="h-[280px]" />
      </div>
    </div>
  );
}


