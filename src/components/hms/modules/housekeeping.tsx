// ARIA HMS — Housekeeping Module (Task Board, Inspections, Room Board)
"use client";

import { useState, useEffect, useCallback } from "react";
import { useApi, apiPost, apiPut } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import { KpiCard, RoomStatusBadge, ROOM_STATUS_META, fmtDate, fmtDateTime } from "../shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Sparkles, Clock, CheckCircle2, Eye, Play, AlertCircle, AlertTriangle,
  DoorOpen, ShieldCheck, ClipboardList, Star, ThumbsUp, ThumbsDown,
  User, CalendarDays, MessageSquare, PenLine, LayoutGrid, Building2,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Priority & Type metadata ────────────────────────────────────
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

// ─── Room board color mapping ────────────────────────────────────
const ROOM_BOARD_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  vacant_clean: { bg: "bg-[#DCFCE7]", border: "border-[#16A34A]", text: "text-[#14532D]" },
  vacant_dirty: { bg: "bg-[#FEF3C7]", border: "border-[#D97706]", text: "text-[#78350F]" },
  occupied_clean: { bg: "bg-[#DBEAFE]", border: "border-[#0369A1]", text: "text-[#0C4A6E]" },
  occupied_dirty: { bg: "bg-[#FFE4E6]", border: "border-[#DC2626]", text: "text-[#881337]" },
  out_of_order: { bg: "bg-[#E5E7EB]", border: "border-[#6B7280]", text: "text-[#374151]" },
  out_of_service: { bg: "bg-[#F3E8FF]", border: "border-[#7C3AED]", text: "text-[#4C1D95]" },
};

// ─── Fallback data when API fails ────────────────────────────────
const FALLBACK_HK_DATA = {
  summary: { pending: 4, in_progress: 3, completed: 8, inspected: 5, total: 20 },
  tasks: [
    { id: "hk1", room: { number: "101", category: "Standard Double", floor: 1 }, taskType: "checkout_cleaning", priority: "urgent", status: "pending", assignee: { name: "Ramesh K." }, notes: "Guest checked out early", checklist: [{ item: "Change linens", done: false }, { item: "Restock amenities", done: false }] },
    { id: "hk2", room: { number: "204", category: "Deluxe King", floor: 2 }, taskType: "stayover", priority: "normal", status: "pending", assignee: { name: "Sunita M." }, notes: null, checklist: [{ item: "Make bed", done: false }, { item: "Replace towels", done: false }] },
    { id: "hk3", room: { number: "305", category: "Superior Twin", floor: 3 }, taskType: "turndown", priority: "low", status: "pending", assignee: null, notes: "VIP turndown service", checklist: [] },
    { id: "hk4", room: { number: "102", category: "Standard Double", floor: 1 }, taskType: "deep_clean", priority: "high", status: "in_progress", assignee: { name: "Gita P." }, notes: null, checklist: [{ item: "Scrub bathroom", done: true }, { item: "Polish furniture", done: false }] },
    { id: "hk5", room: { number: "201", category: "Deluxe King", floor: 2 }, taskType: "stayover", priority: "normal", status: "in_progress", assignee: { name: "Ramesh K." }, notes: null, checklist: [{ item: "Vacuum carpet", done: true }, { item: "Clean bathroom", done: true }] },
    { id: "hk6", room: { number: "103", category: "Deluxe King", floor: 1 }, taskType: "checkout_cleaning", priority: "high", status: "in_progress", assignee: { name: "Sunita M." }, notes: null, checklist: [{ item: "Strip bed", done: true }, { item: "Wipe surfaces", done: false }] },
    { id: "hk7", room: { number: "301", category: "Royal Suite", floor: 3 }, taskType: "inspection", priority: "normal", status: "completed", assignee: { name: "Gita P." }, notes: null, checklist: [{ item: "Check amenities", done: true }, { item: "Verify cleanliness", done: true }] },
    { id: "hk8", room: { number: "202", category: "Deluxe King", floor: 2 }, taskType: "stayover", priority: "low", status: "completed", assignee: { name: "Ramesh K." }, notes: null, checklist: [{ item: "Refresh towels", done: true }, { item: "Empty trash", done: true }] },
    { id: "hk9", room: { number: "302", category: "Superior Twin", floor: 3 }, taskType: "checkout_cleaning", priority: "normal", status: "inspected", assignee: { name: "Sunita M." }, notes: "Passed QC", checklist: [{ item: "Full cleaning", done: true }, { item: "Amenities restocked", done: true }] },
  ],
};

// ─── Mock Room Board data (30+ rooms across 3 floors) ────────────
const MOCK_ROOM_BOARD: Array<{
  id: string;
  number: string;
  floor: number;
  wing: string;
  status: string;
  category: string;
  guest: string | null;
  tasksPending: number;
  lastCleaned: string | null;
}> = [
  // Floor 1 (12 rooms)
  { id: "rb101", number: "101", floor: 1, wing: "East", status: "vacant_clean", category: "Standard Double", guest: null, tasksPending: 0, lastCleaned: "2025-03-14T08:30:00" },
  { id: "rb102", number: "102", floor: 1, wing: "East", status: "occupied_clean", category: "Standard Double", guest: "Rajesh Sharma", tasksPending: 0, lastCleaned: "2025-03-14T09:00:00" },
  { id: "rb103", number: "103", floor: 1, wing: "East", status: "vacant_dirty", category: "Deluxe King", guest: null, tasksPending: 1, lastCleaned: "2025-03-13T14:00:00" },
  { id: "rb104", number: "104", floor: 1, wing: "East", status: "occupied_dirty", category: "Standard Double", guest: "Priya Nair", tasksPending: 1, lastCleaned: "2025-03-14T07:00:00" },
  { id: "rb105", number: "105", floor: 1, wing: "West", status: "vacant_clean", category: "Deluxe King", guest: null, tasksPending: 0, lastCleaned: "2025-03-14T10:00:00" },
  { id: "rb106", number: "106", floor: 1, wing: "West", status: "occupied_clean", category: "Standard Double", guest: "Amit Verma", tasksPending: 0, lastCleaned: "2025-03-14T08:45:00" },
  { id: "rb107", number: "107", floor: 1, wing: "West", status: "out_of_order", category: "Standard Double", guest: null, tasksPending: 0, lastCleaned: null },
  { id: "rb108", number: "108", floor: 1, wing: "West", status: "vacant_clean", category: "Deluxe King", guest: null, tasksPending: 0, lastCleaned: "2025-03-14T11:00:00" },
  { id: "rb109", number: "109", floor: 1, wing: "East", status: "occupied_clean", category: "Superior Twin", guest: "Meera Patel", tasksPending: 0, lastCleaned: "2025-03-14T09:30:00" },
  { id: "rb110", number: "110", floor: 1, wing: "East", status: "vacant_dirty", category: "Standard Double", guest: null, tasksPending: 1, lastCleaned: "2025-03-13T18:00:00" },
  { id: "rb111", number: "111", floor: 1, wing: "West", status: "occupied_dirty", category: "Deluxe King", guest: "Sunil Reddy", tasksPending: 2, lastCleaned: "2025-03-14T06:30:00" },
  { id: "rb112", number: "112", floor: 1, wing: "West", status: "vacant_clean", category: "Standard Double", guest: null, tasksPending: 0, lastCleaned: "2025-03-14T12:00:00" },
  // Floor 2 (12 rooms)
  { id: "rb201", number: "201", floor: 2, wing: "East", status: "occupied_clean", category: "Deluxe King", guest: "Vikram Singh", tasksPending: 0, lastCleaned: "2025-03-14T09:15:00" },
  { id: "rb202", number: "202", floor: 2, wing: "East", status: "occupied_dirty", category: "Deluxe King", guest: "Anita Desai", tasksPending: 1, lastCleaned: "2025-03-14T07:30:00" },
  { id: "rb203", number: "203", floor: 2, wing: "East", status: "vacant_clean", category: "Superior Twin", guest: null, tasksPending: 0, lastCleaned: "2025-03-14T10:30:00" },
  { id: "rb204", number: "204", floor: 2, wing: "East", status: "vacant_dirty", category: "Deluxe King", guest: null, tasksPending: 1, lastCleaned: "2025-03-13T16:00:00" },
  { id: "rb205", number: "205", floor: 2, wing: "West", status: "occupied_clean", category: "Standard Double", guest: "Kavita Joshi", tasksPending: 0, lastCleaned: "2025-03-14T08:00:00" },
  { id: "rb206", number: "206", floor: 2, wing: "West", status: "vacant_clean", category: "Standard Double", guest: null, tasksPending: 0, lastCleaned: "2025-03-14T11:30:00" },
  { id: "rb207", number: "207", floor: 2, wing: "West", status: "occupied_dirty", category: "Deluxe King", guest: "Deepak Gupta", tasksPending: 1, lastCleaned: "2025-03-14T06:00:00" },
  { id: "rb208", number: "208", floor: 2, wing: "East", status: "vacant_clean", category: "Superior Twin", guest: null, tasksPending: 0, lastCleaned: "2025-03-14T12:30:00" },
  { id: "rb209", number: "209", floor: 2, wing: "East", status: "out_of_order", category: "Standard Double", guest: null, tasksPending: 0, lastCleaned: null },
  { id: "rb210", number: "210", floor: 2, wing: "West", status: "occupied_clean", category: "Deluxe King", guest: "Ritu Sharma", tasksPending: 0, lastCleaned: "2025-03-14T09:45:00" },
  { id: "rb211", number: "211", floor: 2, wing: "West", status: "vacant_dirty", category: "Standard Double", guest: null, tasksPending: 1, lastCleaned: "2025-03-13T19:00:00" },
  { id: "rb212", number: "212", floor: 2, wing: "East", status: "vacant_clean", category: "Deluxe King", guest: null, tasksPending: 0, lastCleaned: "2025-03-14T13:00:00" },
  // Floor 3 (10 rooms)
  { id: "rb301", number: "301", floor: 3, wing: "East", status: "occupied_clean", category: "Royal Suite", guest: "Arjun Kapoor", tasksPending: 0, lastCleaned: "2025-03-14T08:15:00" },
  { id: "rb302", number: "302", floor: 3, wing: "East", status: "vacant_clean", category: "Superior Twin", guest: null, tasksPending: 0, lastCleaned: "2025-03-14T10:00:00" },
  { id: "rb303", number: "303", floor: 3, wing: "West", status: "occupied_dirty", category: "Royal Suite", guest: "Neha Singh", tasksPending: 1, lastCleaned: "2025-03-14T07:00:00" },
  { id: "rb304", number: "304", floor: 3, wing: "East", status: "vacant_dirty", category: "Superior Twin", guest: null, tasksPending: 1, lastCleaned: "2025-03-13T15:00:00" },
  { id: "rb305", number: "305", floor: 3, wing: "East", status: "occupied_clean", category: "Superior Twin", guest: "Pooja Mehta", tasksPending: 0, lastCleaned: "2025-03-14T09:00:00" },
  { id: "rb306", number: "306", floor: 3, wing: "West", status: "vacant_clean", category: "Royal Suite", guest: null, tasksPending: 0, lastCleaned: "2025-03-14T11:00:00" },
  { id: "rb307", number: "307", floor: 3, wing: "West", status: "out_of_order", category: "Superior Twin", guest: null, tasksPending: 0, lastCleaned: null },
  { id: "rb308", number: "308", floor: 3, wing: "East", status: "occupied_clean", category: "Royal Suite", guest: "Kiran Rao", tasksPending: 0, lastCleaned: "2025-03-14T08:30:00" },
  { id: "rb309", number: "309", floor: 3, wing: "West", status: "vacant_dirty", category: "Superior Twin", guest: null, tasksPending: 1, lastCleaned: "2025-03-13T20:00:00" },
  { id: "rb310", number: "310", floor: 3, wing: "East", status: "vacant_clean", category: "Royal Suite", guest: null, tasksPending: 0, lastCleaned: "2025-03-14T12:00:00" },
];

// ─── Mock Inspections data ───────────────────────────────────────
interface InspectionItem {
  id: string;
  room: string;
  floor: number;
  category: string;
  taskType: string;
  completedAt: string;
  assignee: string;
  status: "pending_inspection" | "passed" | "failed";
  checklist: Array<{ item: string; passed: boolean | null }>;
  rating: number;
  inspector: string | null;
  inspectedAt: string | null;
  notes: string;
}

const MOCK_INSPECTIONS: InspectionItem[] = [
  {
    id: "insp1", room: "101", floor: 1, category: "Standard Double", taskType: "checkout_cleaning",
    completedAt: "2025-03-14T09:30:00", assignee: "Ramesh K.", status: "pending_inspection",
    checklist: [
      { item: "Bed linens changed & pressed", passed: null },
      { item: "Bathroom sanitized", passed: null },
      { item: "Amenities restocked", passed: null },
      { item: "Floor vacuumed/mopped", passed: null },
      { item: "Mirrors & glass cleaned", passed: null },
      { item: "Dust bins emptied", passed: null },
    ],
    rating: 0, inspector: null, inspectedAt: null, notes: "",
  },
  {
    id: "insp2", room: "202", floor: 2, category: "Deluxe King", taskType: "stayover",
    completedAt: "2025-03-14T10:15:00", assignee: "Sunita M.", status: "pending_inspection",
    checklist: [
      { item: "Bed made properly", passed: null },
      { item: "Towels replaced", passed: null },
      { item: "Trash emptied", passed: null },
      { item: "Bathroom cleaned", passed: null },
      { item: "Minibar checked", passed: null },
    ],
    rating: 0, inspector: null, inspectedAt: null, notes: "",
  },
  {
    id: "insp3", room: "301", floor: 3, category: "Royal Suite", taskType: "inspection",
    completedAt: "2025-03-14T08:45:00", assignee: "Gita P.", status: "passed",
    checklist: [
      { item: "All amenities present", passed: true },
      { item: "Suite living area spotless", passed: true },
      { item: "Bedroom perfect condition", passed: true },
      { item: "Bathroom deep cleaned", passed: true },
      { item: "Balcony furniture clean", passed: true },
      { item: "Minibar fully stocked", passed: true },
      { item: "Welcome amenities set", passed: true },
    ],
    rating: 5, inspector: "Raj M.", inspectedAt: "2025-03-14T09:00:00", notes: "Excellent condition. VIP suite ready.",
  },
  {
    id: "insp4", room: "103", floor: 1, category: "Deluxe King", taskType: "checkout_cleaning",
    completedAt: "2025-03-14T07:00:00", assignee: "Gita P.", status: "failed",
    checklist: [
      { item: "Bed linens changed & pressed", passed: true },
      { item: "Bathroom sanitized", passed: true },
      { item: "Amenities restocked", passed: false },
      { item: "Floor vacuumed/mopped", passed: false },
      { item: "Mirrors & glass cleaned", passed: true },
      { item: "Dust bins emptied", passed: true },
    ],
    rating: 2, inspector: "Raj M.", inspectedAt: "2025-03-14T07:30:00", notes: "Floor not mopped properly. Missing shampoo and soap in bathroom. Needs re-cleaning.",
  },
  {
    id: "insp5", room: "302", floor: 3, category: "Superior Twin", taskType: "checkout_cleaning",
    completedAt: "2025-03-14T11:00:00", assignee: "Sunita M.", status: "passed",
    checklist: [
      { item: "Full cleaning completed", passed: true },
      { item: "Amenities restocked", passed: true },
      { item: "Linen changed", passed: true },
      { item: "Windows cleaned", passed: true },
    ],
    rating: 4, inspector: "Raj M.", inspectedAt: "2025-03-14T11:20:00", notes: "Good overall. Minor streak on window.",
  },
  {
    id: "insp6", room: "204", floor: 2, category: "Deluxe King", taskType: "stayover",
    completedAt: "2025-03-14T06:30:00", assignee: "Ramesh K.", status: "pending_inspection",
    checklist: [
      { item: "Bed made", passed: null },
      { item: "Bathroom refreshed", passed: null },
      { item: "Towels replaced", passed: null },
      { item: "Minibar checked", passed: null },
      { item: "Room tidied", passed: null },
    ],
    rating: 0, inspector: null, inspectedAt: null, notes: "",
  },
  {
    id: "insp7", room: "105", floor: 1, category: "Deluxe King", taskType: "deep_clean",
    completedAt: "2025-03-14T12:00:00", assignee: "Gita P.", status: "pending_inspection",
    checklist: [
      { item: "Carpet deep shampooed", passed: null },
      { item: "Upholstery cleaned", passed: null },
      { item: "Curtains dusted", passed: null },
      { item: "Bathroom grout scrubbed", passed: null },
      { item: "AC vents cleaned", passed: null },
      { item: "Under furniture cleaned", passed: null },
    ],
    rating: 0, inspector: null, inspectedAt: null, notes: "",
  },
];

// ─── Main component ──────────────────────────────────────────────
export function HousekeepingModule() {
  const { refreshTick, triggerRefresh, activeSubModule, setActiveSubModule } = useAppStore();
  const [view, setView] = useState<string>("task-board");
  const [tab, setTab] = useState("all");

  // Sync sidebar sub-module → internal view
  useEffect(() => {
    const subMap: Record<string, string> = {
      overview: "task-board",
      inspections: "inspections",
      "room-board": "room-board",
    };
    if (activeSubModule && subMap[activeSubModule]) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing external store navigation to local view state
      setView(subMap[activeSubModule]);
    } else if (!activeSubModule || activeSubModule === "") {
      setView("task-board");
    }
  }, [activeSubModule]);

  // Bidirectional: when internal view changes, update store
  const handleViewChange = useCallback((newView: string) => {
    setView(newView);
    const reverseMap: Record<string, string> = {
      "task-board": "overview",
      inspections: "inspections",
      "room-board": "room-board",
    };
    setActiveSubModule(reverseMap[newView] || "overview");
  }, [setActiveSubModule]);

  const { data: rawData, loading, error, reload } = useApi<any>(`/api/housekeeping${tab !== "all" ? `?status=${tab}` : ""}`, [tab, refreshTick]);

  if (loading && view === "task-board") {
    return <div className="grid grid-cols-1 md:grid-cols-4 gap-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32" />)}</div>;
  }

  const data = rawData ?? FALLBACK_HK_DATA;

  return (
    <div className="space-y-4">
      {/* API error banner */}
      {error && view === "task-board" && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-300">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>Could not load live data. Showing sample data instead.</span>
          <button onClick={reload} className="ml-auto text-xs font-medium underline hover:no-underline">Retry</button>
        </div>
      )}

      {/* Sub-module navigation tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-display font-bold text-foreground flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-[#C9952A]" /> Housekeeping
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">Room operations, inspections & task management</p>
        </div>
        <div className="flex items-center gap-1 rounded-lg border border-border bg-muted/50 p-1">
          <button
            onClick={() => handleViewChange("task-board")}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
              view === "task-board"
                ? "bg-[#1B3A6B] text-white shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
          >
            <ClipboardList className="h-3.5 w-3.5" /> Task Board
          </button>
          <button
            onClick={() => handleViewChange("room-board")}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
              view === "room-board"
                ? "bg-[#1B3A6B] text-white shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
          >
            <LayoutGrid className="h-3.5 w-3.5" /> Room Board
          </button>
          <button
            onClick={() => handleViewChange("inspections")}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
              view === "inspections"
                ? "bg-[#1B3A6B] text-white shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
          >
            <ShieldCheck className="h-3.5 w-3.5" /> Inspections
          </button>
        </div>
      </div>

      {/* ── Task Board View ── */}
      {view === "task-board" && <TaskBoardView data={data} tab={tab} setTab={setTab} triggerRefresh={triggerRefresh} reload={reload} />}

      {/* ── Room Board View ── */}
      {view === "room-board" && <RoomBoardView />}

      {/* ── Inspections View ── */}
      {view === "inspections" && <InspectionsView />}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────
// Task Board View (existing kanban)
// ──────────────────────────────────────────────────────────────────
function TaskBoardView({ data, tab, setTab, triggerRefresh, reload }: any) {
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
    <>
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <KpiCard label="Pending" value={s.pending} icon={Clock} accent="warning" />
        <KpiCard label="In Progress" value={s.in_progress} icon={Play} accent="info" />
        <KpiCard label="Completed" value={s.completed} icon={CheckCircle2} accent="success" />
        <KpiCard label="Inspected" value={s.inspected} icon={Eye} accent="navy" />
        <KpiCard label="Total Today" value={s.total} icon={Sparkles} accent="gold" />
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
                    {t.notes && <p className="text-[10px] text-muted-foreground italic mt-1">&quot;{t.notes}&quot;</p>}
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
    </>
  );
}

// ──────────────────────────────────────────────────────────────────
// Room Board View
// ──────────────────────────────────────────────────────────────────
function RoomBoardView() {
  const [selectedRoom, setSelectedRoom] = useState<any>(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [assignRoom, setAssignRoom] = useState<any>(null);
  const [assigneeName, setAssigneeName] = useState("");
  const [taskType, setTaskType] = useState("checkout_cleaning");

  const rooms = MOCK_ROOM_BOARD;

  // Compute stats
  const stats = Object.entries(ROOM_STATUS_META).map(([key, meta]) => ({
    key,
    label: meta.label,
    short: meta.short,
    dot: meta.dot,
    count: rooms.filter((r) => r.status === key).length,
  }));

  // Filter rooms
  const filteredRooms = statusFilter === "all" ? rooms : rooms.filter((r) => r.status === statusFilter);

  // Group by floor
  const floors = Array.from(new Set(rooms.map((r) => r.floor))).sort();

  const handleRoomClick = (room: any) => {
    setSelectedRoom(room);
  };

  const handleAssignTask = (room: any) => {
    setAssignRoom(room);
    setAssigneeName("");
    setTaskType("checkout_cleaning");
    setAssignDialogOpen(true);
  };

  const submitAssign = () => {
    if (!assigneeName.trim()) {
      toast.error("Please enter assignee name");
      return;
    }
    toast.success(`Task assigned to ${assigneeName} for Room ${assignRoom.number}`);
    setAssignDialogOpen(false);
    setAssignRoom(null);
    setAssigneeName("");
  };

  return (
    <>
      {/* Status summary */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        {stats.map((s) => (
          <button
            key={s.key}
            onClick={() => setStatusFilter(statusFilter === s.key ? "all" : s.key)}
            className={cn(
              "rounded-xl border p-3 text-center transition-all hover:shadow-sm",
              statusFilter === s.key ? "border-2 shadow-md ring-1" : "border-border"
            )}
            style={statusFilter === s.key ? { borderColor: s.dot, ringColor: s.dot + "40" } : {}}
          >
            <div className="flex items-center justify-center gap-1.5 mb-1">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: s.dot }} />
              <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{s.short}</span>
            </div>
            <p className="font-display text-2xl font-bold" style={{ color: s.dot }}>{s.count}</p>
            <p className="text-[9px] text-muted-foreground mt-0.5">{s.label}</p>
          </button>
        ))}
      </div>

      {/* Floor-wise room grid */}
      <div className="space-y-4">
        {floors.map((floor) => {
          const floorRooms = filteredRooms.filter((r) => r.floor === floor);
          if (floorRooms.length === 0) return null;
          return (
            <Card key={floor}>
              <CardHeader className="py-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-[#1B3A6B]" /> Floor {floor}
                  <Badge variant="secondary" className="text-[10px] ml-1">{floorRooms.length} rooms</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 xl:grid-cols-12 gap-2">
                  {floorRooms.map((room) => {
                    const colors = ROOM_BOARD_COLORS[room.status] || ROOM_BOARD_COLORS.vacant_clean;
                    const meta = ROOM_STATUS_META[room.status] || ROOM_STATUS_META.vacant_clean;
                    return (
                      <button
                        key={room.id}
                        onClick={() => handleRoomClick(room)}
                        className={cn(
                          "relative flex flex-col items-center justify-center rounded-lg border-2 p-2 transition-all hover:shadow-md hover:scale-105 min-h-[72px]",
                          colors.bg, colors.border
                        )}
                      >
                        <span className={cn("font-display text-base font-bold", colors.text)}>{room.number}</span>
                        <span className={cn("text-[8px] font-medium leading-tight", colors.text)}>{meta.short}</span>
                        {room.tasksPending > 0 && (
                          <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#DC2626] text-[8px] font-bold text-white">
                            {room.tasksPending}
                          </span>
                        )}
                        {room.guest && (
                          <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 h-1.5 w-1.5 rounded-full bg-[#0369A1]" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-muted/30 p-3">
        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Legend:</span>
        {Object.entries(ROOM_STATUS_META).map(([key, meta]) => (
          <div key={key} className="flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: meta.dot }} />
            <span className="text-[10px] text-muted-foreground">{meta.label}</span>
          </div>
        ))}
        <div className="flex items-center gap-1 ml-2">
          <span className="h-1.5 w-1.5 rounded-full bg-[#0369A1]" />
          <span className="text-[10px] text-muted-foreground">Has Guest</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#DC2626] text-[7px] font-bold text-white">!</span>
          <span className="text-[10px] text-muted-foreground">Pending Tasks</span>
        </div>
      </div>

      {/* Room detail dialog */}
      <Dialog open={!!selectedRoom} onOpenChange={(open) => !open && setSelectedRoom(null)}>
        <DialogContent className="max-w-md">
          {selectedRoom && (() => {
            const room = selectedRoom;
            const colors = ROOM_BOARD_COLORS[room.status] || ROOM_BOARD_COLORS.vacant_clean;
            const meta = ROOM_STATUS_META[room.status] || ROOM_STATUS_META.vacant_clean;
            return (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <DoorOpen className="h-5 w-5 text-[#1B3A6B]" />
                    Room {room.number}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-2">
                  <div className="flex items-center justify-between">
                    <RoomStatusBadge status={room.status} />
                    <Badge variant="outline" className="text-[10px]">Floor {room.floor} · {room.wing}</Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-lg bg-muted/50 p-3">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Category</p>
                      <p className="text-sm font-medium mt-0.5">{room.category}</p>
                    </div>
                    <div className="rounded-lg bg-muted/50 p-3">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Guest</p>
                      <p className="text-sm font-medium mt-0.5">{room.guest || "—"}</p>
                    </div>
                    <div className="rounded-lg bg-muted/50 p-3">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Pending Tasks</p>
                      <p className="text-sm font-medium mt-0.5">{room.tasksPending > 0 ? `${room.tasksPending} task${room.tasksPending > 1 ? "s" : ""}` : "None"}</p>
                    </div>
                    <div className="rounded-lg bg-muted/50 p-3">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Last Cleaned</p>
                      <p className="text-sm font-medium mt-0.5">{room.lastCleaned ? fmtDateTime(room.lastCleaned) : "—"}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      className="flex-1 bg-[#1B3A6B] hover:bg-[#1B3A6B]/90 text-white"
                      onClick={() => {
                        handleAssignTask(room);
                        setSelectedRoom(null);
                      }}
                    >
                      <Sparkles className="h-4 w-4 mr-1.5" /> Assign Task
                    </Button>
                    <Button variant="outline" className="flex-1" onClick={() => setSelectedRoom(null)}>
                      Close
                    </Button>
                  </div>
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Assign task dialog */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-[#C9952A]" />
              Assign Task — Room {assignRoom?.number}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-xs">Assignee Name</Label>
              <Input
                placeholder="Enter staff name"
                value={assigneeName}
                onChange={(e) => setAssigneeName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Task Type</Label>
              <Select value={taskType} onValueChange={setTaskType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(TASK_TYPE_LABEL).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignDialogOpen(false)}>Cancel</Button>
            <Button className="bg-[#1B3A6B] hover:bg-[#1B3A6B]/90 text-white" onClick={submitAssign}>Assign</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ──────────────────────────────────────────────────────────────────
// Inspections View
// ──────────────────────────────────────────────────────────────────
function InspectionsView() {
  const [inspections, setInspections] = useState<InspectionItem[]>(MOCK_INSPECTIONS);
  const [selectedInspection, setSelectedInspection] = useState<InspectionItem | null>(null);
  const [inspectorName, setInspectorName] = useState("");
  const [inspectionNotes, setInspectionNotes] = useState("");
  const [inspectionRating, setInspectionRating] = useState(0);
  const [checklistState, setChecklistState] = useState<Record<string, boolean | null>>({});
  const [filterStatus, setFilterStatus] = useState("all");

  // Initialize checklist state when selecting an inspection
  const openInspection = (insp: InspectionItem) => {
    setSelectedInspection(insp);
    setInspectorName("");
    setInspectionNotes(insp.notes);
    setInspectionRating(insp.rating);
    const state: Record<string, boolean | null> = {};
    insp.checklist.forEach((item, idx) => {
      state[`${idx}`] = item.passed;
    });
    setChecklistState(state);
  };

  const toggleChecklistItem = (idx: number) => {
    setChecklistState((prev) => {
      const current = prev[`${idx}`];
      if (current === null) return { ...prev, [`${idx}`]: true };
      if (current === true) return { ...prev, [`${idx}`]: false };
      return { ...prev, [`${idx}`]: null };
    });
  };

  const handleApprove = () => {
    if (!selectedInspection) return;
    if (!inspectorName.trim()) {
      toast.error("Please enter inspector name");
      return;
    }
    const updated = inspections.map((insp) => {
      if (insp.id === selectedInspection.id) {
        return {
          ...insp,
          status: "passed" as const,
          inspector: inspectorName,
          inspectedAt: new Date().toISOString(),
          notes: inspectionNotes,
          rating: inspectionRating,
          checklist: insp.checklist.map((item, idx) => ({
            ...item,
            passed: checklistState[`${idx}`] ?? item.passed,
          })),
        };
      }
      return insp;
    });
    setInspections(updated);
    setSelectedInspection(null);
    toast.success(`Room ${selectedInspection.room} — Inspection PASSED`);
  };

  const handleReject = () => {
    if (!selectedInspection) return;
    if (!inspectorName.trim()) {
      toast.error("Please enter inspector name");
      return;
    }
    const updated = inspections.map((insp) => {
      if (insp.id === selectedInspection.id) {
        return {
          ...insp,
          status: "failed" as const,
          inspector: inspectorName,
          inspectedAt: new Date().toISOString(),
          notes: inspectionNotes,
          rating: inspectionRating,
          checklist: insp.checklist.map((item, idx) => ({
            ...item,
            passed: checklistState[`${idx}`] ?? item.passed,
          })),
        };
      }
      return insp;
    });
    setInspections(updated);
    setSelectedInspection(null);
    toast.error(`Room ${selectedInspection.room} — Inspection FAILED`);
  };

  const pendingCount = inspections.filter((i) => i.status === "pending_inspection").length;
  const passedCount = inspections.filter((i) => i.status === "passed").length;
  const failedCount = inspections.filter((i) => i.status === "failed").length;

  const filteredInspections = filterStatus === "all"
    ? inspections
    : inspections.filter((i) => i.status === filterStatus);

  const INSP_STATUS_META: Record<string, { label: string; cls: string; icon: any }> = {
    pending_inspection: { label: "Pending", cls: "bg-[#FEF3C7] text-[#78350F] border-[#D97706]", icon: Clock },
    passed: { label: "Passed", cls: "bg-[#DCFCE7] text-[#14532D] border-[#16A34A]", icon: CheckCircle2 },
    failed: { label: "Failed", cls: "bg-[#FFE4E6] text-[#881337] border-[#DC2626]", icon: AlertCircle },
  };

  return (
    <>
      {/* KPI summary */}
      <div className="grid grid-cols-3 gap-3">
        <KpiCard label="Pending Inspection" value={pendingCount} icon={Clock} accent="warning" />
        <KpiCard label="Passed" value={passedCount} icon={CheckCircle2} accent="success" />
        <KpiCard label="Failed" value={failedCount} icon={AlertCircle} accent="error" />
      </div>

      {/* Filter */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Filter:</span>
        {["all", "pending_inspection", "passed", "failed"].map((f) => (
          <button
            key={f}
            onClick={() => setFilterStatus(f)}
            className={cn(
              "rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors",
              filterStatus === f
                ? "bg-[#1B3A6B] text-white"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            )}
          >
            {f === "all" ? "All" : INSP_STATUS_META[f]?.label || f}
            {f === "all" ? ` (${inspections.length})` : ` (${inspections.filter((i) => i.status === f).length})`}
          </button>
        ))}
      </div>

      {/* Inspections list */}
      <div className="space-y-2 max-h-[700px] overflow-y-auto pr-1">
        {filteredInspections.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <ShieldCheck className="h-10 w-10 mx-auto text-muted-foreground/30 mb-2" />
              <p className="text-sm text-muted-foreground">No inspections found</p>
            </CardContent>
          </Card>
        ) : filteredInspections.map((insp) => {
          const statusMeta = INSP_STATUS_META[insp.status] || INSP_STATUS_META.pending_inspection;
          const StatusIcon = statusMeta.icon;
          const passedItems = insp.checklist.filter((c) => c.passed === true).length;
          const totalItems = insp.checklist.length;
          return (
            <Card
              key={insp.id}
              className="hover:shadow-card-lg transition-shadow cursor-pointer"
              onClick={() => openInspection(insp)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-display text-lg font-bold text-[#1B3A6B]">Room {insp.room}</span>
                      <Badge variant="outline" className="text-[10px]">{insp.category}</Badge>
                      <Badge variant="outline" className="text-[10px]">Floor {insp.floor}</Badge>
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                      <span className="flex items-center gap-1"><User className="h-3 w-3" /> {insp.assignee}</span>
                      <span className="flex items-center gap-1"><CalendarDays className="h-3 w-3" /> {fmtDateTime(insp.completedAt)}</span>
                      <span className="flex items-center gap-1"><ClipboardList className="h-3 w-3" /> {TASK_TYPE_LABEL[insp.taskType] || insp.taskType}</span>
                    </div>
                    {insp.status !== "pending_inspection" && (
                      <div className="mt-2 flex items-center gap-2">
                        <div className="flex items-center gap-0.5">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                              key={i}
                              className={cn("h-3.5 w-3.5", i < insp.rating ? "text-[#C9952A] fill-[#C9952A]" : "text-muted-foreground/30")}
                            />
                          ))}
                        </div>
                        {insp.inspector && <span className="text-[10px] text-muted-foreground">by {insp.inspector}</span>}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className={cn("inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-medium", statusMeta.cls)}>
                      <StatusIcon className="h-3 w-3" /> {statusMeta.label}
                    </span>
                    <span className="text-[10px] text-muted-foreground">{passedItems}/{totalItems} items</span>
                  </div>
                </div>
                {insp.notes && insp.status !== "pending_inspection" && (
                  <div className="mt-2 rounded-md bg-muted/50 p-2">
                    <p className="text-[11px] text-muted-foreground flex items-start gap-1">
                      <MessageSquare className="h-3 w-3 mt-0.5 shrink-0" /> {insp.notes}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Inspection detail dialog */}
      <Dialog open={!!selectedInspection} onOpenChange={(open) => !open && setSelectedInspection(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          {selectedInspection && (() => {
            const insp = selectedInspection;
            const isPending = insp.status === "pending_inspection";
            return (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-[#1B3A6B]" />
                    Inspection — Room {insp.room}
                    <Badge variant="outline" className="text-[10px]">{insp.category}</Badge>
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-2">
                  {/* Room info */}
                  <div className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
                    <div>
                      <p className="text-xs text-muted-foreground">Completed by</p>
                      <p className="text-sm font-medium">{insp.assignee}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Completed at</p>
                      <p className="text-sm font-medium">{fmtDateTime(insp.completedAt)}</p>
                    </div>
                  </div>

                  {/* Checklist */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <ClipboardList className="h-3.5 w-3.5" /> Inspection Checklist
                    </h4>
                    {insp.checklist.map((item, idx) => {
                      const currentState = checklistState[`${idx}`];
                      return (
                        <div
                          key={idx}
                          onClick={isPending ? () => toggleChecklistItem(idx) : undefined}
                          className={cn(
                            "flex items-center justify-between rounded-lg border p-3 transition-colors",
                            isPending && "cursor-pointer hover:bg-muted/50",
                            currentState === true && "border-[#16A34A] bg-[#DCFCE7]/30",
                            currentState === false && "border-[#DC2626] bg-[#FFE4E6]/30",
                            currentState === null && "border-border bg-card"
                          )}
                        >
                          <span className="text-xs font-medium">{item.item}</span>
                          {currentState === true && <CheckCircle2 className="h-4 w-4 text-[#16A34A]" />}
                          {currentState === false && <AlertCircle className="h-4 w-4 text-[#DC2626]" />}
                          {currentState === null && <span className="h-4 w-4 rounded-full border-2 border-muted-foreground/30" />}
                        </div>
                      );
                    })}
                  </div>

                  {/* Star rating */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <Star className="h-3.5 w-3.5" /> Room Condition Rating
                    </h4>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <button
                          key={i}
                          onClick={() => isPending && setInspectionRating(i + 1)}
                          className={cn(
                            "transition-colors",
                            isPending ? "cursor-pointer hover:scale-110" : "cursor-default"
                          )}
                          disabled={!isPending}
                        >
                          <Star
                            className={cn(
                              "h-7 w-7",
                              i < inspectionRating
                                ? "text-[#C9952A] fill-[#C9952A]"
                                : "text-muted-foreground/30"
                            )}
                          />
                        </button>
                      ))}
                      <span className="ml-2 text-sm font-medium tabular-nums">
                        {inspectionRating > 0 ? `${inspectionRating}/5` : "—"}
                      </span>
                    </div>
                  </div>

                  {/* Digital sign-off */}
                  {isPending && (
                    <div className="space-y-2 rounded-lg border border-[#1B3A6B]/20 bg-[#1B3A6B]/5 p-3">
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-[#1B3A6B] flex items-center gap-1.5">
                        <PenLine className="h-3.5 w-3.5" /> Digital Sign-Off
                      </h4>
                      <div className="space-y-2">
                        <div className="space-y-1">
                          <Label className="text-[11px]">Inspector Name *</Label>
                          <Input
                            placeholder="Enter your name"
                            value={inspectorName}
                            onChange={(e) => setInspectorName(e.target.value)}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[11px]">Timestamp</Label>
                          <div className="rounded-md border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                            {fmtDateTime(new Date())}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Notes/Comments */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <MessageSquare className="h-3.5 w-3.5" /> Notes / Comments
                    </h4>
                    <Textarea
                      placeholder="Add inspection notes..."
                      value={inspectionNotes}
                      onChange={(e) => setInspectionNotes(e.target.value)}
                      disabled={!isPending}
                      rows={3}
                    />
                  </div>

                  {/* Previous sign-off info (for completed inspections) */}
                  {!isPending && insp.inspector && (
                    <div className="rounded-lg border border-[#16A34A]/20 bg-[#DCFCE7]/20 p-3">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium">Signed off by: {insp.inspector}</span>
                        <span className="text-muted-foreground">{insp.inspectedAt ? fmtDateTime(insp.inspectedAt) : ""}</span>
                      </div>
                    </div>
                  )}

                  {/* Action buttons */}
                  {isPending && (
                    <div className="flex gap-2 pt-2">
                      <Button
                        className="flex-1 bg-[#16A34A] hover:bg-[#16A34A]/90 text-white"
                        onClick={handleApprove}
                      >
                        <ThumbsUp className="h-4 w-4 mr-1.5" /> Approve
                      </Button>
                      <Button
                        variant="outline"
                        className="flex-1 border-[#DC2626] text-[#DC2626] hover:bg-[#FFE4E6]"
                        onClick={handleReject}
                      >
                        <ThumbsDown className="h-4 w-4 mr-1.5" /> Reject
                      </Button>
                    </div>
                  )}
                  {!isPending && (
                    <div className="flex justify-end pt-2">
                      <Button variant="outline" onClick={() => setSelectedInspection(null)}>Close</Button>
                    </div>
                  )}
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </>
  );
}
