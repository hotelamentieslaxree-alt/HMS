// Rooms module — live status board
"use client";

import { useState } from "react";
import { useApi, apiPut, apiPost, apiDelete } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import { RoomStatusBadge, ROOM_STATUS_META, fmtINR } from "../shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { DoorOpen, Ban, CheckCircle2, Wrench, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Fallback rooms data when API fails ──────────────────────────
const FALLBACK_ROOMS = {
  rooms: [
    { id: "rm101", roomNumber: "101", floor: 1, wing: "East", currentStatus: "vacant_clean", category: { id: "c1", name: "Standard Double", code: "STD", baseRate: 3500, maxAdults: 2, maxChildren: 1, amenities: ["WiFi", "TV", "AC"] }, isAccessible: false, blockedReason: null },
    { id: "rm102", roomNumber: "102", floor: 1, wing: "East", currentStatus: "occupied_clean", category: { id: "c1", name: "Standard Double", code: "STD", baseRate: 3500, maxAdults: 2, maxChildren: 1, amenities: ["WiFi", "TV", "AC"] }, isAccessible: true, blockedReason: null },
    { id: "rm103", roomNumber: "103", floor: 1, wing: "East", currentStatus: "vacant_dirty", category: { id: "c2", name: "Deluxe King", code: "DLX", baseRate: 5500, maxAdults: 2, maxChildren: 1, amenities: ["WiFi", "TV", "AC", "Minibar"] }, isAccessible: false, blockedReason: null },
    { id: "rm104", roomNumber: "104", floor: 1, wing: "West", currentStatus: "out_of_order", category: { id: "c1", name: "Standard Double", code: "STD", baseRate: 3500, maxAdults: 2, maxChildren: 1, amenities: ["WiFi", "TV", "AC"] }, isAccessible: false, blockedReason: "AC repair" },
    { id: "rm201", roomNumber: "201", floor: 2, wing: "East", currentStatus: "occupied_clean", category: { id: "c2", name: "Deluxe King", code: "DLX", baseRate: 5500, maxAdults: 2, maxChildren: 1, amenities: ["WiFi", "TV", "AC", "Minibar"] }, isAccessible: false, blockedReason: null },
    { id: "rm202", roomNumber: "202", floor: 2, wing: "East", currentStatus: "occupied_dirty", category: { id: "c2", name: "Deluxe King", code: "DLX", baseRate: 5500, maxAdults: 2, maxChildren: 1, amenities: ["WiFi", "TV", "AC", "Minibar"] }, isAccessible: false, blockedReason: null },
    { id: "rm203", roomNumber: "203", floor: 2, wing: "West", currentStatus: "vacant_clean", category: { id: "c3", name: "Superior Twin", code: "SUP", baseRate: 4800, maxAdults: 3, maxChildren: 2, amenities: ["WiFi", "TV", "AC", "Minibar", "Safe"] }, isAccessible: false, blockedReason: null },
    { id: "rm301", roomNumber: "301", floor: 3, wing: "East", currentStatus: "occupied_clean", category: { id: "c4", name: "Royal Suite", code: "SUI", baseRate: 12000, maxAdults: 2, maxChildren: 1, amenities: ["WiFi", "TV", "AC", "Minibar", "Safe", "Bathtub", "Lounge"] }, isAccessible: false, blockedReason: null },
    { id: "rm302", roomNumber: "302", floor: 3, wing: "East", currentStatus: "vacant_clean", category: { id: "c3", name: "Superior Twin", code: "SUP", baseRate: 4800, maxAdults: 3, maxChildren: 2, amenities: ["WiFi", "TV", "AC", "Minibar", "Safe"] }, isAccessible: false, blockedReason: null },
    { id: "rm303", roomNumber: "303", floor: 3, wing: "West", currentStatus: "out_of_service", category: { id: "c1", name: "Standard Double", code: "STD", baseRate: 3500, maxAdults: 2, maxChildren: 1, amenities: ["WiFi", "TV", "AC"] }, isAccessible: false, blockedReason: "Deep cleaning" },
  ],
  counts: {
    vacant_clean: 4,
    vacant_dirty: 1,
    occupied_clean: 3,
    occupied_dirty: 1,
    out_of_order: 1,
    out_of_service: 1,
  },
};

export function RoomsModule() {
  const { refreshTick, triggerRefresh } = useAppStore();
  const [filter, setFilter] = useState("all");
  const [floorFilter, setFloorFilter] = useState("all");
  const [actionRoom, setActionRoom] = useState<any>(null);
  const { data: rawData, loading, error, reload } = useApi<any>(`/api/rooms`, [refreshTick]);

  if (loading) return <div className="grid grid-cols-2 md:grid-cols-4 gap-3">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-28" />)}</div>;

  const data = rawData ?? FALLBACK_ROOMS;

  const floors = Array.from(new Set(data.rooms.map((r: any) => r.floor))).sort();
  let rooms = data.rooms;
  if (filter !== "all") rooms = rooms.filter((r: any) => r.currentStatus === filter);
  if (floorFilter !== "all") rooms = rooms.filter((r: any) => r.floor === Number(floorFilter));

  const setStatus = async (id: string, status: string) => {
    try {
      await apiPut(`/api/rooms/${id}/status`, { status });
      toast.success(`Room marked ${ROOM_STATUS_META[status].label}`);
      triggerRefresh();
      reload();
      setActionRoom(null);
    } catch (e: any) { toast.error(e.message); }
  };

  const blockRoom = async (id: string, reason: string, type: string) => {
    try {
      await apiPost(`/api/rooms/${id}/block`, { reason, type });
      toast.success("Room blocked");
      triggerRefresh();
      reload();
      setActionRoom(null);
    } catch (e: any) { toast.error(e.message); }
  };

  const unblock = async (id: string) => {
    try {
      await apiDelete(`/api/rooms/${id}/block`);
      toast.success("Room unblocked");
      triggerRefresh();
      reload();
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <div className="space-y-4">
      {/* API error banner */}
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-300">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>Could not load live data. Showing sample data instead.</span>
          <button onClick={reload} className="ml-auto text-xs font-medium underline hover:no-underline">Retry</button>
        </div>
      )}
      {/* Stats + filters */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-2">
        {Object.entries(ROOM_STATUS_META).map(([key, m]) => {
          const count = data.counts[key] ?? 0;
          return (
            <button
              key={key}
              onClick={() => setFilter(filter === key ? "all" : key)}
              className={cn("rounded-xl border p-3 text-left transition-all hover:shadow-card", m.cls, filter === key && "ring-2 ring-offset-1")}
              style={filter === key ? { borderColor: m.dot } : {}}
            >
              <p className="text-2xl font-display font-bold tabular-nums">{count}</p>
              <p className="text-[10px] font-semibold uppercase tracking-wider">{m.label}</p>
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Select value={floorFilter} onValueChange={setFloorFilter}>
          <SelectTrigger className="w-32 h-8 text-xs"><SelectValue placeholder="All floors" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All floors</SelectItem>
            {floors.map((f: number) => <SelectItem key={f} value={String(f)}>Floor {f}</SelectItem>)}
          </SelectContent>
        </Select>
        <Badge variant="secondary" className="text-xs">{rooms.length} rooms shown</Badge>
        {filter !== "all" && <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setFilter("all")}>Clear filter</Button>}
      </div>

      {/* Room grid grouped by floor */}
      <div className="space-y-4">
        {floors.filter(f => floorFilter === "all" || String(f) === floorFilter).map((floor: number) => {
          const floorRooms = rooms.filter((r: any) => r.floor === floor);
          if (!floorRooms.length) return null;
          return (
            <Card key={floor}>
              <CardHeader className="py-3 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-display flex items-center gap-2">
                  <DoorOpen className="h-4 w-4 text-navy" /> Floor {floor}
                  <span className="text-xs text-muted-foreground font-normal">· {floorRooms[0]?.wing} wing</span>
                </CardTitle>
                <Badge variant="outline" className="text-[10px]">{floorRooms.length} rooms</Badge>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-2">
                  {floorRooms.map((r: any) => {
                    const m = ROOM_STATUS_META[r.currentStatus];
                    return (
                      <button
                        key={r.id}
                        onClick={() => setActionRoom(r)}
                        className={cn("group relative rounded-lg border-2 p-2 text-left transition-all hover:scale-[1.03] hover:shadow-card", m.cls)}
                        title={`${r.roomNumber} · ${m.label} · ${r.category.name}`}
                      >
                        <p className="font-display text-lg font-bold leading-none">{r.roomNumber}</p>
                        <p className="text-[9px] font-semibold uppercase opacity-80 mt-0.5">{m.short}</p>
                        <p className="text-[9px] opacity-60 truncate mt-0.5">{r.category.code}</p>
                        {r.isAccessible && <span className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-blue-500" title="Accessible" />}
                        {r.currentStatus === "out_of_order" && <Ban className="absolute top-1 right-1 h-3 w-3 opacity-60" />}
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {actionRoom && (
        <RoomActionDialog
          room={actionRoom}
          onClose={() => setActionRoom(null)}
          onStatus={setStatus}
          onBlock={blockRoom}
          onUnblock={unblock}
        />
      )}
    </div>
  );
}

function RoomActionDialog({ room, onClose, onStatus, onBlock, onUnblock }: any) {
  const isBlocked = room.currentStatus === "out_of_order" || room.currentStatus === "out_of_service";
  const [blockReason, setBlockReason] = useState("");
  const [blockType, setBlockType] = useState("out_of_order");
  const m = ROOM_STATUS_META[room.currentStatus];

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            Room {room.roomNumber}
            <RoomStatusBadge status={room.currentStatus} />
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div><p className="text-[10px] text-muted-foreground uppercase">Category</p><p className="font-medium">{room.category.name}</p></div>
            <div><p className="text-[10px] text-muted-foreground uppercase">Floor</p><p className="font-medium">{room.floor} · {room.wing}</p></div>
            <div><p className="text-[10px] text-muted-foreground uppercase">Base rate</p><p className="font-mono-num font-semibold">{fmtINR(room.category.baseRate)}</p></div>
            <div><p className="text-[10px] text-muted-foreground uppercase">Capacity</p><p className="font-medium">{room.category.maxAdults}A + {room.category.maxChildren}C</p></div>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground uppercase mb-1">Amenities</p>
            <div className="flex flex-wrap gap-1">
              {room.category.amenities.map((a: string, i: number) => <Badge key={i} variant="secondary" className="text-[10px]">{a}</Badge>)}
            </div>
          </div>
          {isBlocked && room.blockedReason && (
            <div className="rounded-lg border border-[#DC2626]/30 bg-[#DC2626]/5 p-2 text-xs">
              <p className="font-semibold text-[#DC2626] flex items-center gap-1"><Ban className="h-3 w-3" /> Blocked: {room.blockedReason}</p>
            </div>
          )}

          <div className="border-t border-border pt-3">
            <p className="text-xs font-semibold mb-2">Change status</p>
            <div className="grid grid-cols-3 gap-2">
              <Button size="sm" variant="outline" className="text-xs h-8" onClick={() => onStatus(room.id, "vacant_clean")}>
                <CheckCircle2 className="h-3 w-3 mr-1 text-[#16A34A]" /> Vacant Clean
              </Button>
              <Button size="sm" variant="outline" className="text-xs h-8" onClick={() => onStatus(room.id, "vacant_dirty")}>
                Vacant Dirty
              </Button>
              <Button size="sm" variant="outline" className="text-xs h-8" onClick={() => onStatus(room.id, "occupied_clean")}>
                Occupied
              </Button>
            </div>
          </div>

          {isBlocked ? (
            <Button className="w-full" variant="default" onClick={() => onUnblock(room.id)}>
              Unblock Room
            </Button>
          ) : (
            <div className="border-t border-border pt-3 space-y-2">
              <p className="text-xs font-semibold flex items-center gap-1"><Wrench className="h-3 w-3" /> Block room</p>
              <Select value={blockType} onValueChange={setBlockType}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="out_of_order">Out of Order</SelectItem>
                  <SelectItem value="out_of_service">Out of Service</SelectItem>
                </SelectContent>
              </Select>
              <Input value={blockReason} onChange={(e) => setBlockReason(e.target.value)} placeholder="Reason (e.g. AC repair)" className="h-8 text-xs" />
              <Button size="sm" variant="destructive" className="w-full" disabled={!blockReason} onClick={() => onBlock(room.id, blockReason, blockType)}>
                Block Room
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
