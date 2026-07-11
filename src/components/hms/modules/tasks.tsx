// ARIA HMS — Tasks Module (Kanban board with filters)
"use client";

import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/lib/store";
import { KpiCard, fmtDate } from "../shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  CheckSquare, Plus, Clock, AlertCircle, User, Flag,
  Calendar, ListChecks, Loader, CheckCircle2, Circle,
  LayoutGrid, List, Filter,
} from "lucide-react";

// ─── TYPES ───────────────────────────────────────────────────────────

type TaskStatus = "todo" | "in_progress" | "done";
type TaskPriority = "urgent" | "high" | "medium" | "low";

interface Task {
  id: string;
  title: string;
  assignee: string;
  priority: TaskPriority;
  status: TaskStatus;
  dueDate: string;
  description: string;
  department: string;
}

// ─── MOCK DATA ──────────────────────────────────────────────────────

const MOCK_TASKS: Task[] = [
  { id: "TSK-001", title: "Prepare monthly revenue report", assignee: "Priya Sharma", priority: "high", status: "in_progress", dueDate: "2025-01-18", description: "Compile all revenue data for January", department: "Finance" },
  { id: "TSK-002", title: "Guest complaint follow-up - Room 302", assignee: "Ravi Kumar", priority: "urgent", status: "todo", dueDate: "2025-01-16", description: "AC not working, guest requested compensation", department: "Front Office" },
  { id: "TSK-003", title: "Update OTA rates for February", assignee: "Anita Desai", priority: "high", status: "todo", dueDate: "2025-01-20", description: "Revise pricing across all OTA channels", department: "Revenue" },
  { id: "TSK-004", title: "Staff training - New POS system", assignee: "Suresh Menon", priority: "medium", status: "in_progress", dueDate: "2025-01-22", description: "Conduct training sessions for F&B team", department: "F&B" },
  { id: "TSK-005", title: "Deep cleaning - Conference Hall B", assignee: "Lakshmi Devi", priority: "medium", status: "todo", dueDate: "2025-01-17", description: "Full deep clean before corporate event", department: "Housekeeping" },
  { id: "TSK-006", title: "Vendor payment processing", assignee: "Priya Sharma", priority: "high", status: "done", dueDate: "2025-01-15", description: "Process all pending vendor invoices", department: "Finance" },
  { id: "TSK-007", title: "Fire safety inspection", assignee: "Raj Malhotra", priority: "urgent", status: "in_progress", dueDate: "2025-01-16", description: "Annual fire safety compliance check", department: "Engineering" },
  { id: "TSK-008", title: "New menu tasting - Indian section", assignee: "Chef Arvind", priority: "low", status: "todo", dueDate: "2025-01-25", description: "Taste and finalize new menu items", department: "F&B" },
  { id: "TSK-009", title: "Corporate contract renewal - TCS", assignee: "Karan Rao", priority: "high", status: "done", dueDate: "2025-01-14", description: "Renew annual corporate agreement", department: "Sales" },
  { id: "TSK-010", title: "Pool maintenance schedule", assignee: "Raj Malhotra", priority: "low", status: "done", dueDate: "2025-01-13", description: "Schedule weekly pool maintenance", department: "Engineering" },
  { id: "TSK-011", title: "Inventory audit - Mini bar", assignee: "Suresh Menon", priority: "medium", status: "todo", dueDate: "2025-01-19", description: "Verify mini bar stock across all rooms", department: "F&B" },
  { id: "TSK-012", title: "Website photo shoot", assignee: "Anita Desai", priority: "low", status: "in_progress", dueDate: "2025-01-23", description: "Update property photos for website and OTAs", department: "Marketing" },
];

// ─── STATUS META ─────────────────────────────────────────────────────

const PRIORITY_META: Record<TaskPriority, { label: string; cls: string; icon: any; color: string }> = {
  urgent: { label: "Urgent", cls: "bg-[#FFE4E6] text-[#881337] border-[#DC2626]", icon: AlertCircle, color: "#DC2626" },
  high: { label: "High", cls: "bg-[#FEF3C7] text-[#78350F] border-[#D97706]", icon: Flag, color: "#D97706" },
  medium: { label: "Medium", cls: "bg-[#DBEAFE] text-[#1B3A6B] border-[#0369A1]", icon: Circle, color: "#0369A1" },
  low: { label: "Low", cls: "bg-[#E5E7EB] text-[#374151] border-[#6B7280]", icon: Circle, color: "#6B7280" },
};

const STATUS_META: Record<TaskStatus, { label: string; icon: any; color: string }> = {
  todo: { label: "To Do", icon: ListChecks, color: "#6B7280" },
  in_progress: { label: "In Progress", icon: Loader, color: "#0369A1" },
  done: { label: "Done", icon: CheckCircle2, color: "#16A34A" },
};

// ─── MAIN COMPONENT ──────────────────────────────────────────────────

export function TasksModule() {
  const { refreshTick } = useAppStore();
  const [filterAssignee, setFilterAssignee] = useState<string>("all");
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"board" | "list">("board");

  const assignees = useMemo(() => [...new Set(MOCK_TASKS.map((t) => t.assignee))], []);

  const filteredTasks = useMemo(() => {
    return MOCK_TASKS.filter((t) => {
      if (filterAssignee !== "all" && t.assignee !== filterAssignee) return false;
      if (filterPriority !== "all" && t.priority !== filterPriority) return false;
      return true;
    });
  }, [filterAssignee, filterPriority]);

  const todoTasks = filteredTasks.filter((t) => t.status === "todo");
  const inProgressTasks = filteredTasks.filter((t) => t.status === "in_progress");
  const doneTasks = filteredTasks.filter((t) => t.status === "done");

  const overdueCount = MOCK_TASKS.filter((t) => t.status !== "done" && new Date(t.dueDate) < new Date()).length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-display font-bold text-foreground flex items-center gap-2">
            <CheckSquare className="h-5 w-5 text-navy" /> Task Management
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">Organize, track and manage tasks across departments</p>
        </div>
        <Button className="bg-navy hover:bg-navy-light text-white h-9"><Plus className="h-4 w-4 mr-1" /> Add Task</Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Total Tasks" value={MOCK_TASKS.length} icon={CheckSquare} accent="navy" />
        <KpiCard label="In Progress" value={MOCK_TASKS.filter((t) => t.status === "in_progress").length} icon={Loader} accent="info" />
        <KpiCard label="Completed" value={MOCK_TASKS.filter((t) => t.status === "done").length} icon={CheckCircle2} accent="success" />
        <KpiCard label="Overdue" value={overdueCount} icon={AlertCircle} accent="error" />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <Select value={filterAssignee} onValueChange={setFilterAssignee}>
          <SelectTrigger className="w-44 h-8 text-xs"><SelectValue placeholder="Filter by assignee" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Assignees</SelectItem>
            {assignees.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterPriority} onValueChange={setFilterPriority}>
          <SelectTrigger className="w-36 h-8 text-xs"><SelectValue placeholder="Priority" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priorities</SelectItem>
            <SelectItem value="urgent">Urgent</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>
        <div className="ml-auto flex items-center gap-1 border border-border rounded-md p-0.5">
          <Button variant={viewMode === "board" ? "default" : "ghost"} size="sm" className="h-7 text-xs px-2" onClick={() => setViewMode("board")}><LayoutGrid className="h-3 w-3 mr-1" />Board</Button>
          <Button variant={viewMode === "list" ? "default" : "ghost"} size="sm" className="h-7 text-xs px-2" onClick={() => setViewMode("list")}><List className="h-3 w-3 mr-1" />List</Button>
        </div>
      </div>

      {/* Board View */}
      {viewMode === "board" ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {(["todo", "in_progress", "done"] as TaskStatus[]).map((status) => {
            const meta = STATUS_META[status];
            const tasks = status === "todo" ? todoTasks : status === "in_progress" ? inProgressTasks : doneTasks;
            const StatusIcon = meta.icon;
            return (
              <div key={status} className="space-y-3">
                <div className="flex items-center gap-2 px-1">
                  <StatusIcon className="h-4 w-4" style={{ color: meta.color }} />
                  <span className="text-sm font-semibold">{meta.label}</span>
                  <Badge variant="secondary" className="text-[10px] h-5">{tasks.length}</Badge>
                </div>
                <div className="space-y-2 min-h-[200px]">
                  {tasks.map((task) => {
                    const pri = PRIORITY_META[task.priority];
                    const PriIcon = pri.icon;
                    const isOverdue = task.status !== "done" && new Date(task.dueDate) < new Date();
                    return (
                      <Card key={task.id} className="hover:shadow-card-lg transition-shadow cursor-pointer">
                        <CardContent className="p-3">
                          <div className="flex items-start justify-between gap-2 mb-1.5">
                            <p className="text-xs font-semibold leading-tight">{task.title}</p>
                            <span className={cn("inline-flex items-center gap-0.5 rounded border px-1 py-0 text-[9px] font-medium shrink-0", pri.cls)}>
                              <PriIcon className="h-2.5 w-2.5" />{pri.label}
                            </span>
                          </div>
                          <p className="text-[10px] text-muted-foreground mb-2 line-clamp-2">{task.description}</p>
                          <div className="flex items-center justify-between pt-1.5 border-t border-border">
                            <div className="flex items-center gap-1.5">
                              <div className="h-5 w-5 rounded-full bg-navy/10 flex items-center justify-center text-[8px] font-bold text-navy">
                                {task.assignee.split(" ").map((n) => n[0]).join("")}
                              </div>
                              <span className="text-[10px] text-muted-foreground truncate max-w-[80px]">{task.assignee}</span>
                            </div>
                            <span className={cn("text-[10px] flex items-center gap-0.5", isOverdue ? "text-[#DC2626] font-medium" : "text-muted-foreground")}>
                              <Calendar className="h-3 w-3" />{fmtDate(task.dueDate)}
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* List View */
        <Card>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {filteredTasks.map((task) => {
                const pri = PRIORITY_META[task.priority];
                const statusMeta = STATUS_META[task.status];
                const StatusIcon = statusMeta.icon;
                const isOverdue = task.status !== "done" && new Date(task.dueDate) < new Date();
                return (
                  <div key={task.id} className="flex items-center gap-3 p-3 hover:bg-muted/50 cursor-pointer">
                    <StatusIcon className="h-4 w-4 shrink-0" style={{ color: statusMeta.color }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-medium truncate">{task.title}</p>
                        <span className={cn("inline-flex items-center rounded border px-1 py-0 text-[9px] font-medium shrink-0", pri.cls)}>{pri.label}</span>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground">
                        <span className="flex items-center gap-0.5"><User className="h-3 w-3" />{task.assignee}</span>
                        <span>{task.department}</span>
                      </div>
                    </div>
                    <span className={cn("text-[10px] shrink-0 flex items-center gap-0.5", isOverdue ? "text-[#DC2626] font-medium" : "text-muted-foreground")}>
                      <Calendar className="h-3 w-3" />{fmtDate(task.dueDate)}
                    </span>
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
