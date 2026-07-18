// ARIA HMS — Kitchen Display Module (KOT orders, timer, completion, analytics)
"use client";

import { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/lib/store";
import { useApi, apiPost, apiPut } from "@/lib/api";
import { KpiCard, fmtINR } from "../shared";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  ChefHat, Clock, CheckCircle2, AlertTriangle, Flame,
  Timer, Plus, Bell,
  Utensils, Coffee, Sandwich,
} from "lucide-react";

// ─── TYPES ───────────────────────────────────────────────────────────

type OrderStatus = "new" | "preparing" | "ready";

interface KitchenOrder {
  id: string;
  kotNumber: string;
  items: { name: string; qty: number; special?: string }[];
  table: string;
  orderTime: string;
  status: OrderStatus;
  priority: "normal" | "urgent";
  orderType: "dine-in" | "room-service" | "takeaway";
  elapsed: number; // minutes
}

// ─── FALLBACK DATA ──────────────────────────────────────────────────

const FALLBACK_ORDERS: KitchenOrder[] = [
  {
    id: "KO-001", kotNumber: "KOT-1015", table: "T-05",
    items: [
      { name: "Butter Chicken", qty: 1, special: "Less spicy" },
      { name: "Naan Basket", qty: 2 },
      { name: "Dal Makhani", qty: 1 },
    ],
    orderTime: new Date(Date.now() - 3 * 60000).toISOString(), status: "new", priority: "normal",
    orderType: "dine-in", elapsed: 3,
  },
  {
    id: "KO-002", kotNumber: "KOT-1014", table: "Room 301",
    items: [
      { name: "Club Sandwich", qty: 1 },
      { name: "French Fries", qty: 1 },
      { name: "Coffee", qty: 2 },
    ],
    orderTime: new Date(Date.now() - 13 * 60000).toISOString(), status: "preparing", priority: "normal",
    orderType: "room-service", elapsed: 13,
  },
  {
    id: "KO-003", kotNumber: "KOT-1013", table: "T-12",
    items: [
      { name: "Paneer Tikka", qty: 1 },
      { name: "Tandoori Roti", qty: 4 },
      { name: "Veg Biryani", qty: 2, special: "Extra raita" },
    ],
    orderTime: new Date(Date.now() - 23 * 60000).toISOString(), status: "preparing", priority: "normal",
    orderType: "dine-in", elapsed: 23,
  },
  {
    id: "KO-004", kotNumber: "KOT-1012", table: "T-02",
    items: [
      { name: "Grilled Fish", qty: 1, special: "Well done" },
      { name: "Mashed Potatoes", qty: 1 },
      { name: "Caesar Salad", qty: 1 },
    ],
    orderTime: new Date(Date.now() - 33 * 60000).toISOString(), status: "preparing", priority: "urgent",
    orderType: "dine-in", elapsed: 33,
  },
  {
    id: "KO-005", kotNumber: "KOT-1011", table: "T-08",
    items: [
      { name: "Masala Dosa", qty: 2 },
      { name: "Filter Coffee", qty: 2 },
    ],
    orderTime: new Date(Date.now() - 38 * 60000).toISOString(), status: "ready", priority: "normal",
    orderType: "dine-in", elapsed: 38,
  },
  {
    id: "KO-006", kotNumber: "KOT-1010", table: "Room 105",
    items: [
      { name: "Pasta Alfredo", qty: 1, special: "No mushrooms" },
      { name: "Garlic Bread", qty: 1 },
      { name: "Lemonade", qty: 1 },
    ],
    orderTime: new Date(Date.now() - 43 * 60000).toISOString(), status: "ready", priority: "normal",
    orderType: "room-service", elapsed: 43,
  },
];

// ─── API STATUS ↔ KITCHEN STATUS MAPPING ────────────────────────────

const API_TO_KITCHEN: Record<string, OrderStatus | null> = {
  sent_to_kitchen: "new",
  in_preparation: "preparing",
  ready: "ready",
  // served, billed, paid, void, draft → not shown in kitchen
};

// What API status to send for each kitchen button action
const KITCHEN_ACTION_TO_API: Record<string, string> = {
  start_preparing: "in_preparation",
  mark_ready: "ready",
  picked_up: "served",
};

function mapApiOrderToKitchen(apiOrder: any): KitchenOrder | null {
  const kitchenStatus = API_TO_KITCHEN[apiOrder.status];
  if (!kitchenStatus) return null;

  const elapsed = Math.max(0, Math.round((Date.now() - new Date(apiOrder.createdAt).getTime()) / 60000));

  const tableLabel = apiOrder.table
    ? `T-${apiOrder.table.number}`
    : apiOrder.orderType === "room_service"
      ? "Room Service"
      : "Takeaway";

  const orderTypeMap: Record<string, "dine-in" | "room-service" | "takeaway"> = {
    dine_in: "dine-in",
    room_service: "room-service",
    takeaway: "takeaway",
  };

  return {
    id: apiOrder.id,
    kotNumber: apiOrder.kotNumber ? `KOT-${apiOrder.kotNumber}` : "—",
    items: (apiOrder.lines || []).map((l: any) => ({
      name: l.name,
      qty: l.quantity,
      special: l.specialInstructions || undefined,
    })),
    table: tableLabel,
    orderTime: apiOrder.createdAt,
    status: kitchenStatus,
    priority: elapsed > 25 ? "urgent" : "normal",
    orderType: orderTypeMap[apiOrder.orderType] || "dine-in",
    elapsed,
  };
}

// ─── STATUS META ─────────────────────────────────────────────────────

const ORDER_STATUS_META: Record<OrderStatus, { label: string; color: string; bgColor: string }> = {
  new: { label: "New", color: "#DC2626", bgColor: "#FFE4E6" },
  preparing: { label: "Preparing", color: "#D97706", bgColor: "#FEF3C7" },
  ready: { label: "Ready", color: "#16A34A", bgColor: "#DCFCE7" },
};

const ORDER_TYPE_ICON: Record<string, { icon: any; color: string }> = {
  "dine-in": { icon: Utensils, color: "#1B3A6B" },
  "room-service": { icon: Coffee, color: "#7C3AED" },
  "takeaway": { icon: Sandwich, color: "#0369A1" },
};

// ─── MAIN COMPONENT ──────────────────────────────────────────────────

export function KitchenModule() {
  const { refreshTick, triggerRefresh } = useAppStore();
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [orders, setOrders] = useState<KitchenOrder[]>(FALLBACK_ORDERS);
  const [updatingIds, setUpdatingIds] = useState<Set<string>>(new Set());

  // New KOT dialog state
  const [newKotOpen, setNewKotOpen] = useState(false);

  // Fetch orders from API
  const { data: apiOrders, loading, reload } = useApi<any[]>("/api/pos/orders", [refreshTick]);

  // Fetch outlets for the New KOT dialog
  const { data: outlets } = useApi<any[]>("/api/pos/outlets", [refreshTick]);

  // New KOT form state
  const [kotForm, setKotForm] = useState({
    outletId: "",
    tableNumber: "",
    orderType: "dine_in",
    notes: "",
  });
  const [kotLines, setKotLines] = useState<{ itemName: string; quantity: number }[]>([
    { itemName: "", quantity: 1 },
  ]);
  const [submittingKot, setSubmittingKot] = useState(false);

  // Map API orders to kitchen format
  useEffect(() => {
    if (apiOrders) {
      const mapped = apiOrders
        .map(mapApiOrderToKitchen)
        .filter((o: KitchenOrder | null): o is KitchenOrder => o !== null);
      if (mapped.length > 0) {
        setOrders(mapped);
      } else {
        setOrders(FALLBACK_ORDERS);
      }
    }
  }, [apiOrders]);

  // Timer effect
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(Date.now()), 30000);
    return () => clearInterval(interval);
  }, []);

  // Update elapsed times periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setOrders((prev) =>
        prev.map((o) => ({
          ...o,
          elapsed: Math.max(0, Math.round((Date.now() - new Date(o.orderTime).getTime()) / 60000)),
        }))
      );
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const newOrders = orders.filter((o) => o.status === "new");
  const preparingOrders = orders.filter((o) => o.status === "preparing");
  const readyOrders = orders.filter((o) => o.status === "ready");
  const urgentOrders = orders.filter((o) => o.priority === "urgent" && o.status !== "ready");

  // ─── Status update handler (optimistic) ──────────────────────────────
  const handleKitchenAction = useCallback(async (
    orderId: string,
    action: "start_preparing" | "mark_ready" | "picked_up",
    toastLabel: string,
  ) => {
    const apiStatus = KITCHEN_ACTION_TO_API[action];

    // Optimistic: update local state immediately
    setOrders((prev) => {
      if (action === "start_preparing") {
        return prev.map((o) => (o.id === orderId ? { ...o, status: "preparing" as OrderStatus } : o));
      } else if (action === "mark_ready") {
        return prev.map((o) => (o.id === orderId ? { ...o, status: "ready" as OrderStatus } : o));
      } else {
        // picked_up → remove from kitchen display (served orders don't show)
        return prev.filter((o) => o.id !== orderId);
      }
    });
    setUpdatingIds((prev) => new Set(prev).add(orderId));

    try {
      await apiPut(`/api/pos/orders/${orderId}/status`, { status: apiStatus });
      toast.success(toastLabel);
      triggerRefresh();
    } catch (e: any) {
      // Revert on failure — reload from API
      toast.error(e.message || "Failed to update order status");
      reload();
    } finally {
      setUpdatingIds((prev) => {
        const next = new Set(prev);
        next.delete(orderId);
        return next;
      });
    }
  }, [triggerRefresh, reload]);

  // ─── New KOT handlers ────────────────────────────────────────────────
  const handleNewKotLine = () => {
    setKotLines((prev) => [...prev, { itemName: "", quantity: 1 }]);
  };

  const handleRemoveKotLine = (idx: number) => {
    setKotLines((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleKotLineChange = (idx: number, field: "itemName" | "quantity", value: string | number) => {
    setKotLines((prev) =>
      prev.map((l, i) => (i === idx ? { ...l, [field]: value } : l))
    );
  };

  const handleSubmitNewKot = async () => {
    if (!kotForm.outletId) {
      toast.error("Please select an outlet");
      return;
    }
    const validLines = kotLines.filter((l) => l.itemName.trim());
    if (validLines.length === 0) {
      toast.error("Add at least one item");
      return;
    }

    setSubmittingKot(true);
    try {
      // Fetch the outlet menu to match item names to IDs
      const menuRes = await fetch(`/api/pos/outlets/${kotForm.outletId}/menu`);
      const menuJson = await menuRes.json();
      const menuData = menuJson.data;
      const allMenuItems: { id: string; name: string; price: number }[] = menuData?.categories?.flatMap((c: any) => c.items) ?? [];

      const lines = validLines
        .map((l) => {
          const match = allMenuItems.find((mi) => mi.name.toLowerCase() === l.itemName.trim().toLowerCase());
          return match ? { itemId: match.id, quantity: l.quantity } : null;
        })
        .filter((l): l is { itemId: string; quantity: number } => l !== null);

      if (lines.length === 0) {
        toast.error("No matching menu items found. Please create items in Menu Builder first.");
        setSubmittingKot(false);
        return;
      }

      const result = await apiPost("/api/pos/orders", {
        outletId: kotForm.outletId,
        tableNumber: kotForm.tableNumber || undefined,
        orderType: kotForm.orderType,
        notes: kotForm.notes || undefined,
        lines,
        guestsCount: 1,
      });

      toast.success(`KOT created · #${result.kotNumber} · ${fmtINR(result.total)}`);
      setNewKotOpen(false);
      setKotForm({ outletId: "", tableNumber: "", orderType: "dine_in", notes: "" });
      setKotLines([{ itemName: "", quantity: 1 }]);
      triggerRefresh();
    } catch (e: any) {
      toast.error(e.message || "Failed to create KOT");
    } finally {
      setSubmittingKot(false);
    }
  };

  if (loading && !apiOrders) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-9 w-24" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20" />)}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-64" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-display font-bold text-foreground flex items-center gap-2">
            <ChefHat className="h-5 w-5 text-navy" /> Kitchen Display
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">Real-time order tracking, KOT management & kitchen analytics</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {new Date(currentTime).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })}
          </Badge>
          <Button className="bg-navy hover:bg-navy-light text-white h-9" onClick={() => setNewKotOpen(true)}>
            <Plus className="h-4 w-4 mr-1" /> New KOT
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="New Orders" value={newOrders.length} icon={Bell} accent="error" />
        <KpiCard label="Preparing" value={preparingOrders.length} icon={Flame} accent="warning" />
        <KpiCard label="Ready for Pickup" value={readyOrders.length} icon={CheckCircle2} accent="success" />
        <KpiCard label="Urgent" value={urgentOrders.length} icon={AlertTriangle} accent="error" />
      </div>

      {/* Kitchen Analytics Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rounded-lg border border-border p-3 bg-card">
          <p className="text-[10px] uppercase text-muted-foreground">Avg Prep Time</p>
          <p className="text-lg font-bold font-display mt-1">18<span className="text-sm text-muted-foreground ml-1">min</span></p>
        </div>
        <div className="rounded-lg border border-border p-3 bg-card">
          <p className="text-[10px] uppercase text-muted-foreground">Orders Today</p>
          <p className="text-lg font-bold font-display mt-1">{orders.length}</p>
        </div>
        <div className="rounded-lg border border-border p-3 bg-card">
          <p className="text-[10px] uppercase text-muted-foreground">Completed</p>
          <p className="text-lg font-bold font-display mt-1 text-[#16A34A]">39</p>
        </div>
        <div className="rounded-lg border border-border p-3 bg-card">
          <p className="text-[10px] uppercase text-muted-foreground">Kitchen Load</p>
          <div className="mt-1">
            <div className="bg-muted rounded-full h-2"><div className="bg-[#D97706] rounded-full h-2" style={{ width: `${Math.min(100, Math.round((newOrders.length + preparingOrders.length) / Math.max(1, orders.length) * 100))}%` }} /></div>
            <p className="text-[10px] text-muted-foreground mt-1">{Math.min(100, Math.round((newOrders.length + preparingOrders.length) / Math.max(1, orders.length) * 100))}% capacity</p>
          </div>
        </div>
      </div>

      {/* Order Columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* New Orders */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <div className="h-3 w-3 rounded-full bg-[#DC2626]" />
            <span className="text-sm font-semibold">New Orders</span>
            <Badge className="bg-[#FFE4E6] text-[#881337] border-[#DC2626] hover:bg-[#FFE4E6] text-[10px]">{newOrders.length}</Badge>
          </div>
          <div className="space-y-3">
            {newOrders.map((order) => (
              <OrderCard key={order.id} order={order} onAction={handleKitchenAction} updating={updatingIds.has(order.id)} />
            ))}
            {newOrders.length === 0 && (
              <div className="text-center py-8 text-muted-foreground text-xs border border-dashed border-border rounded-lg">
                No new orders
              </div>
            )}
          </div>
        </div>

        {/* Preparing */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <div className="h-3 w-3 rounded-full bg-[#D97706]" />
            <span className="text-sm font-semibold">Preparing</span>
            <Badge className="bg-[#FEF3C7] text-[#78350F] border-[#D97706] hover:bg-[#FEF3C7] text-[10px]">{preparingOrders.length}</Badge>
          </div>
          <div className="space-y-3">
            {preparingOrders.map((order) => (
              <OrderCard key={order.id} order={order} onAction={handleKitchenAction} updating={updatingIds.has(order.id)} />
            ))}
          </div>
        </div>

        {/* Ready */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <div className="h-3 w-3 rounded-full bg-[#16A34A]" />
            <span className="text-sm font-semibold">Ready for Pickup</span>
            <Badge className="bg-[#DCFCE7] text-[#14532D] border-[#16A34A] hover:bg-[#DCFCE7] text-[10px]">{readyOrders.length}</Badge>
          </div>
          <div className="space-y-3">
            {readyOrders.map((order) => (
              <OrderCard key={order.id} order={order} onAction={handleKitchenAction} updating={updatingIds.has(order.id)} />
            ))}
          </div>
        </div>
      </div>

      {/* New KOT Dialog */}
      <Dialog open={newKotOpen} onOpenChange={setNewKotOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">New KOT Order</DialogTitle>
            <DialogDescription>Create a new Kitchen Order Ticket to send to the kitchen</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label htmlFor="kotOutlet">Outlet</Label>
              <Select value={kotForm.outletId} onValueChange={(v) => setKotForm((f) => ({ ...f, outletId: v }))}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Select outlet" />
                </SelectTrigger>
                <SelectContent>
                  {(outlets ?? []).map((o: any) => (
                    <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="kotTable">Table #</Label>
                <Input
                  id="kotTable"
                  placeholder="e.g. 5"
                  value={kotForm.tableNumber}
                  onChange={(e) => setKotForm((f) => ({ ...f, tableNumber: e.target.value }))}
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="kotType">Order Type</Label>
                <Select value={kotForm.orderType} onValueChange={(v) => setKotForm((f) => ({ ...f, orderType: v }))}>
                  <SelectTrigger className="mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dine_in">Dine-in</SelectItem>
                    <SelectItem value="room_service">Room Service</SelectItem>
                    <SelectItem value="takeaway">Takeaway</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Items</Label>
              <div className="space-y-2 mt-1.5">
                {kotLines.map((line, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <Input
                      placeholder="Item name"
                      value={line.itemName}
                      onChange={(e) => handleKotLineChange(idx, "itemName", e.target.value)}
                      className="flex-1"
                    />
                    <Input
                      type="number"
                      min={1}
                      value={line.quantity}
                      onChange={(e) => handleKotLineChange(idx, "quantity", parseInt(e.target.value) || 1)}
                      className="w-16"
                    />
                    {kotLines.length > 1 && (
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-[#DC2626]" onClick={() => handleRemoveKotLine(idx)}>
                        ×
                      </Button>
                    )}
                  </div>
                ))}
                <Button variant="outline" size="sm" className="w-full h-8 text-xs" onClick={handleNewKotLine}>
                  <Plus className="h-3 w-3 mr-1" /> Add Item
                </Button>
              </div>
            </div>
            <div>
              <Label htmlFor="kotNotes">Notes</Label>
              <Input
                id="kotNotes"
                placeholder="Special instructions..."
                value={kotForm.notes}
                onChange={(e) => setKotForm((f) => ({ ...f, notes: e.target.value }))}
                className="mt-1.5"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewKotOpen(false)}>Cancel</Button>
            <Button className="bg-[#1B3A6B] hover:bg-[#1B3A6B]/90" onClick={handleSubmitNewKot} disabled={submittingKot}>
              {submittingKot ? "Creating..." : "Send to Kitchen"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── ORDER CARD SUB-COMPONENT ────────────────────────────────────────

type KitchenAction = "start_preparing" | "mark_ready" | "picked_up";

function OrderCard({ order, onAction, updating }: {
  order: KitchenOrder;
  onAction: (orderId: string, action: KitchenAction, toastLabel: string) => void;
  updating: boolean;
}) {
  const statusMeta = ORDER_STATUS_META[order.status];
  const typeMeta = ORDER_TYPE_ICON[order.orderType] ?? ORDER_TYPE_ICON["dine-in"];
  const TypeIcon = typeMeta.icon;
  const isOverdue = order.elapsed > 25 && order.status !== "ready";
  const isWarning = order.elapsed > 15 && order.elapsed <= 25 && order.status !== "ready";

  const handleStartPreparing = () => {
    if (updating) return;
    onAction(order.id, "start_preparing", `KOT ${order.kotNumber} → Preparing`);
  };

  const handleMarkReady = () => {
    if (updating) return;
    onAction(order.id, "mark_ready", `KOT ${order.kotNumber} → Ready for Pickup`);
  };

  const handlePickedUp = () => {
    if (updating) return;
    onAction(order.id, "picked_up", `KOT ${order.kotNumber} picked up`);
  };

  return (
    <Card className={cn(
      "hover:shadow-card-lg transition-shadow",
      isOverdue && "border-[#DC2626]/50",
      isWarning && "border-[#D97706]/50",
    )}>
      <CardContent className="p-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold font-mono">{order.kotNumber}</span>
              {order.priority === "urgent" && (
                <span className="inline-flex items-center gap-0.5 rounded px-1 py-0 text-[9px] font-bold bg-[#FFE4E6] text-[#DC2626]">
                  <Flame className="h-2.5 w-2.5" />URGENT
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-0.5 text-[10px] text-muted-foreground">
              <span className="flex items-center gap-0.5"><TypeIcon className="h-3 w-3" style={{ color: typeMeta.color }} />{order.table}</span>
              <span className="capitalize">{order.orderType.replace("-", " ")}</span>
            </div>
          </div>
          <div className={cn(
            "flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-bold",
            isOverdue ? "bg-[#FFE4E6] text-[#DC2626]" :
            isWarning ? "bg-[#FEF3C7] text-[#D97706]" :
            "bg-muted text-muted-foreground"
          )}>
            <Timer className="h-3 w-3" />{order.elapsed}m
          </div>
        </div>

        {/* Items */}
        <div className="space-y-1 mb-3">
          {order.items.map((item, i) => (
            <div key={i} className="flex items-center justify-between">
              <span className="text-xs">
                <span className="font-medium">{item.qty}×</span> {item.name}
              </span>
              {item.special && (
                <span className="text-[9px] text-[#D97706] bg-[#FEF3C7] px-1 py-0 rounded">{item.special}</span>
              )}
            </div>
          ))}
        </div>

        {/* Action Button */}
        <div className="pt-2 border-t border-border">
          {order.status === "new" && (
            <Button size="sm" className="w-full h-7 text-[10px] bg-[#D97706] hover:bg-[#D97706]/80 text-white" onClick={handleStartPreparing} disabled={updating}>
              <Flame className="h-3 w-3 mr-1" /> {updating ? "Updating..." : "Start Preparing"}
            </Button>
          )}
          {order.status === "preparing" && (
            <Button size="sm" className="w-full h-7 text-[10px] bg-[#16A34A] hover:bg-[#16A34A]/80 text-white" onClick={handleMarkReady} disabled={updating}>
              <CheckCircle2 className="h-3 w-3 mr-1" /> {updating ? "Updating..." : "Mark Ready"}
            </Button>
          )}
          {order.status === "ready" && (
            <Button size="sm" variant="outline" className="w-full h-7 text-[10px]" onClick={handlePickedUp} disabled={updating}>
              <CheckCircle2 className="h-3 w-3 mr-1" /> {updating ? "Updating..." : "Picked Up"}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
