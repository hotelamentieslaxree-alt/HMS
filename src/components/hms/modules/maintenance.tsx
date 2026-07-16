// Maintenance module
"use client";

import { useState } from "react";
import { useApi, apiPost } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Wrench, Plus, Zap, Droplets, Wind, Hammer, Building, Tv, Cpu, AlertTriangle } from "lucide-react";
import { timeAgo } from "../shared";
import { cn } from "@/lib/utils";

const PRIORITY_META: Record<string, { color: string; label: string }> = {
  urgent: { color: "#DC2626", label: "Urgent" },
  high: { color: "#D97706", label: "High" },
  normal: { color: "#0284C7", label: "Normal" },
  low: { color: "#64748B", label: "Low" },
};

const CATEGORY_META: Record<string, { icon: any; color: string }> = {
  electrical: { icon: Zap, color: "#D97706" },
  plumbing: { icon: Droplets, color: "#0284C7" },
  hvac: { icon: Wind, color: "#0369A1" },
  carpentry: { icon: Hammer, color: "#92400E" },
  civil: { icon: Building, color: "#64748B" },
  av: { icon: Tv, color: "#7C3AED" },
  it: { icon: Cpu, color: "#1B3A6B" },
};

// ─── Fallback data when API fails ────────────────────────────────
const FALLBACK_MAINTENANCE = {
  summary: { open: 5, in_progress: 3, completed: 12 },
  tickets: [
    { id: "mt1", title: "AC not cooling in Room 305", description: "Guest reported warm air from AC unit", category: "hvac", priority: "urgent", status: "open", room: { number: "305" }, createdAt: new Date(Date.now() - 7200000).toISOString() },
    { id: "mt2", title: "Leaking faucet — Room 412", description: "Bathroom tap dripping continuously", category: "plumbing", priority: "high", status: "in_progress", room: { number: "412" }, createdAt: new Date(Date.now() - 14400000).toISOString() },
    { id: "mt3", title: "Replace lobby chandelier bulb", description: "One of the LED panels is flickering", category: "electrical", priority: "normal", status: "open", room: null, createdAt: new Date(Date.now() - 28800000).toISOString() },
    { id: "mt4", title: "Wi-Fi router reset — Floor 3", description: "Intermittent connectivity on 3rd floor", category: "it", priority: "normal", status: "in_progress", room: null, createdAt: new Date(Date.now() - 43200000).toISOString() },
    { id: "mt5", title: "Room 201 wardrobe hinge broken", category: "carpentry", priority: "low", status: "open", room: { number: "201" }, createdAt: new Date(Date.now() - 86400000).toISOString() },
  ],
};

export function MaintenanceModule() {
  const { refreshTick, triggerRefresh } = useAppStore();
  const [showNew, setShowNew] = useState(false);
  const { data, loading, error, reload } = useApi<any>("/api/maintenance", [refreshTick]);
  const maintenanceData = data ?? FALLBACK_MAINTENANCE;

  if (loading) return <Skeleton className="h-96" />;

  const s = maintenanceData.summary;

  return (
    <div className="space-y-4">
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>Could not load live data. Showing sample data instead.</span>
          <button onClick={reload} className="ml-auto text-xs font-medium underline">Retry</button>
        </div>
      )}
      <div className="flex items-center justify-between">
        <div className="grid grid-cols-3 gap-3 flex-1">
          <Card><CardContent className="p-4 flex items-center justify-between"><div><p className="text-[10px] uppercase text-muted-foreground">Open</p><p className="font-display text-2xl font-bold text-[#DC2626]">{s.open}</p></div><Wrench className="h-5 w-5 text-[#DC2626]" /></CardContent></Card>
          <Card><CardContent className="p-4 flex items-center justify-between"><div><p className="text-[10px] uppercase text-muted-foreground">In Progress</p><p className="font-display text-2xl font-bold text-[#D97706]">{s.in_progress}</p></div><Hammer className="h-5 w-5 text-[#D97706]" /></CardContent></Card>
          <Card><CardContent className="p-4 flex items-center justify-between"><div><p className="text-[10px] uppercase text-muted-foreground">Completed</p><p className="font-display text-2xl font-bold text-[#16A34A]">{s.completed}</p></div><Hammer className="h-5 w-5 text-[#16A34A]" /></CardContent></Card>
        </div>
        <Button onClick={() => setShowNew(true)} className="ml-3 bg-navy hover:bg-navy-light"><Plus className="h-4 w-4 mr-1" /> New Ticket</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {maintenanceData.tickets.map((t: any) => {
          const cat = CATEGORY_META[t.category || "civil"] || CATEGORY_META.civil;
          const pri = PRIORITY_META[t.priority] || PRIORITY_META.normal;
          const CatIcon = cat.icon;
          return (
            <Card key={t.id} className={cn("hover:shadow-card-lg transition-shadow", t.status === "open" && "border-l-4")} style={t.status === "open" ? { borderLeftColor: pri.color } : {}}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg" style={{ backgroundColor: cat.color + "20" }}>
                      <CatIcon className="h-4 w-4" style={{ color: cat.color }} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold leading-tight">{t.title}</p>
                      <p className="text-[10px] text-muted-foreground capitalize">{t.category || "uncategorized"} · {t.room ? `Room ${t.room.number}` : "Common area"}</p>
                    </div>
                  </div>
                  <span className="rounded px-1.5 py-0.5 text-[9px] font-bold text-white whitespace-nowrap" style={{ backgroundColor: pri.color }}>{pri.label}</span>
                </div>
                {t.description && <p className="text-xs text-muted-foreground mb-2">{t.description}</p>}
                <div className="flex items-center justify-between pt-2 border-t border-border">
                  <Badge variant={t.status === "completed" ? "default" : t.status === "in_progress" ? "secondary" : "outline"} className="text-[10px] capitalize">{t.status.replace("_", " ")}</Badge>
                  <p className="text-[10px] text-muted-foreground">{timeAgo(t.createdAt)}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {showNew && <NewTicketDialog onClose={() => setShowNew(false)} onCreated={() => { setShowNew(false); triggerRefresh(); reload(); }} />}
    </div>
  );
}

function NewTicketDialog({ onClose, onCreated }: any) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("normal");
  const [category, setCategory] = useState("electrical");
  const [roomId, setRoomId] = useState("");
  const { data: roomsData } = useApi<any>("/api/rooms", []);

  const submit = async () => {
    if (!title) { toast.error("Title required"); return; }
    try {
      await apiPost("/api/maintenance", { title, description, priority, category, roomId: roomId || undefined });
      toast.success("Maintenance ticket created");
      onCreated();
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle className="font-display">New Maintenance Ticket</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Title *</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. AC not cooling in room 305" /></div>
          <div><Label>Description</Label><Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Additional details…" /></div>
          <div className="grid grid-cols-2 gap-2">
            <div><Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(CATEGORY_META).map(([k]) => <SelectItem key={k} value={k} className="capitalize">{k}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Priority</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(PRIORITY_META).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div><Label>Room (optional)</Label>
            <Select value={roomId} onValueChange={setRoomId}>
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Common area" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">Common area</SelectItem>
                {roomsData?.rooms?.map((r: any) => <SelectItem key={r.id} value={r.id}>{r.roomNumber} · {r.category.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} className="bg-navy hover:bg-navy-light">Create Ticket</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
