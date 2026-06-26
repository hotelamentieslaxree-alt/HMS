// Housekeeping module — task board
"use client";

import { useState } from "react";
import { useApi, apiPost, apiPut } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Sparkles, Clock, CheckCircle2, Eye, Play, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const PRIORITY_META: Record<string, string> = {
  urgent: "bg-[#DC2626] text-white",
  high: "bg-[#D97706] text-white",
  normal: "bg-[#0284C7] text-white",
  low: "bg-muted text-muted-foreground",
};

const TASK_TYPE_LABEL: Record<string, string> = {
  checkout_cleaning: "Checkout Clean",
  stayover: "Stayover",
  turndown: "Turndown",
  deep_clean: "Deep Clean",
  inspection: "Inspection",
  maintenance_prep: "Maintenance Prep",
};

export function HousekeepingModule() {
  const { refreshTick, triggerRefresh } = useAppStore();
  const [tab, setTab] = useState("all");
  const { data, loading, reload } = useApi<any>(`/api/housekeeping${tab !== "all" ? `?status=${tab}` : ""}`, [tab, refreshTick]);

  if (loading || !data) {
    return <div className="grid grid-cols-1 md:grid-cols-4 gap-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32" />)}</div>;
  }

  const s = data.summary;
  const advance = async (id: string, status: string) => {
    try {
      await apiPut(`/api/housekeeping/tasks/${id}`, { status });
      toast.success(`Task → ${status.replace("_", " ")}`);
      triggerRefresh();
      reload();
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCard label="Pending" value={s.pending} color="#D97706" icon={Clock} />
        <StatCard label="In Progress" value={s.in_progress} color="#0284C7" icon={Play} />
        <StatCard label="Completed" value={s.completed} color="#16A34A" icon={CheckCircle2} />
        <StatCard label="Inspected" value={s.inspected} color="#7C3AED" icon={Eye} />
        <StatCard label="Total Today" value={s.total} color="#1B3A6B" icon={Sparkles} />
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="all">All ({s.total})</TabsTrigger>
          <TabsTrigger value="pending">Pending ({s.pending})</TabsTrigger>
          <TabsTrigger value="in_progress">In Progress ({s.in_progress})</TabsTrigger>
          <TabsTrigger value="completed">Completed ({s.completed})</TabsTrigger>
          <TabsTrigger value="inspected">Inspected ({s.inspected})</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Task columns (Kanban-style) */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
        {(["pending", "in_progress", "completed", "inspected"] as const).map((col) => {
          const tasks = data.tasks.filter((t: any) => t.status === col);
          return (
            <Card key={col} className="bg-muted/30">
              <CardHeader className="py-3 flex flex-row items-center justify-between">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider">{col.replace("_", " ")}</CardTitle>
                <Badge variant="secondary" className="text-[10px]">{tasks.length}</Badge>
              </CardHeader>
              <CardContent className="space-y-2 max-h-[600px] overflow-y-auto">
                {tasks.length === 0 ? (
                  <p className="text-center text-xs text-muted-foreground py-8">No tasks</p>
                ) : tasks.map((t: any) => (
                  <div key={t.id} className="rounded-lg border border-border bg-card p-3 shadow-card">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <p className="font-display text-lg font-bold leading-none">{t.room.number}</p>
                        <p className="text-[10px] text-muted-foreground">{t.room.category} · Floor {t.room.floor}</p>
                      </div>
                      <span className={cn("rounded px-1.5 py-0.5 text-[9px] font-bold uppercase", PRIORITY_META[t.priority])}>{t.priority}</span>
                    </div>
                    <Badge variant="outline" className="text-[10px] mb-2">{TASK_TYPE_LABEL[t.taskType] || t.taskType}</Badge>
                    {t.assignee && <p className="text-[10px] text-muted-foreground">Assigned: {t.assignee.name}</p>}
                    {t.notes && <p className="text-[10px] text-muted-foreground italic mt-1">"{t.notes}"</p>}
                    {t.checklist?.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {t.checklist.slice(0, 4).map((c: any, i: number) => (
                          <span key={i} className={cn("rounded px-1 py-0.5 text-[9px]", c.done ? "bg-[#DCFCE7] text-[#16A34A]" : "bg-muted text-muted-foreground")}>
                            {c.done ? "✓" : "○"} {c.item.slice(0, 12)}
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="mt-2 flex gap-1">
                      {col === "pending" && (
                        <Button size="sm" variant="outline" className="h-7 flex-1 text-xs" onClick={() => advance(t.id, "in_progress")}>
                          <Play className="h-3 w-3 mr-1" /> Start
                        </Button>
                      )}
                      {col === "in_progress" && (
                        <Button size="sm" variant="outline" className="h-7 flex-1 text-xs border-[#16A34A] text-[#16A34A]" onClick={() => advance(t.id, "completed")}>
                          <CheckCircle2 className="h-3 w-3 mr-1" /> Done
                        </Button>
                      )}
                      {col === "completed" && (
                        <Button size="sm" variant="outline" className="h-7 flex-1 text-xs border-[#7C3AED] text-[#7C3AED]" onClick={() => advance(t.id, "inspected")}>
                          <Eye className="h-3 w-3 mr-1" /> Inspect
                        </Button>
                      )}
                      {col === "inspected" && (
                        <Badge variant="secondary" className="text-[10px] text-[#7C3AED]">✓ Passed QC</Badge>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function StatCard({ label, value, color, icon: Icon }: any) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</p>
          <p className="font-display text-2xl font-bold tabular-nums">{value}</p>
        </div>
        <div className="flex h-9 w-9 items-center justify-center rounded-lg" style={{ backgroundColor: color + "20" }}>
          <Icon className="h-4 w-4" style={{ color }} />
        </div>
      </CardContent>
    </Card>
  );
}
