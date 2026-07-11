// ARIA HMS — Kitchen Display Module (KOT orders, timer, completion, analytics)
"use client";

import { useState, useEffect, useMemo } from "react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/lib/store";
import { KpiCard, fmtINR, fmtDate } from "../shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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

// ─── MOCK DATA ──────────────────────────────────────────────────────

const MOCK_ORDERS: KitchenOrder[] = [
  {
    id: "KO-001", kotNumber: "KOT-1015", table: "T-05",
    items: [
      { name: "Butter Chicken", qty: 1, special: "Less spicy" },
      { name: "Naan Basket", qty: 2 },
      { name: "Dal Makhani", qty: 1 },
    ],
    orderTime: "2025-01-15T12:15:00", status: "new", priority: "normal",
    orderType: "dine-in", elapsed: 3,
  },
  {
    id: "KO-002", kotNumber: "KOT-1014", table: "Room 301",
    items: [
      { name: "Club Sandwich", qty: 1 },
      { name: "French Fries", qty: 1 },
      { name: "Coffee", qty: 2 },
    ],
    orderTime: "2025-01-15T12:05:00", status: "preparing", priority: "normal",
    orderType: "room-service", elapsed: 13,
  },
  {
    id: "KO-003", kotNumber: "KOT-1013", table: "T-12",
    items: [
      { name: "Paneer Tikka", qty: 1 },
      { name: "Tandoori Roti", qty: 4 },
      { name: "Veg Biryani", qty: 2, special: "Extra raita" },
    ],
    orderTime: "2025-01-15T11:55:00", status: "preparing", priority: "normal",
    orderType: "dine-in", elapsed: 23,
  },
  {
    id: "KO-004", kotNumber: "KOT-1012", table: "T-02",
    items: [
      { name: "Grilled Fish", qty: 1, special: "Well done" },
      { name: "Mashed Potatoes", qty: 1 },
      { name: "Caesar Salad", qty: 1 },
    ],
    orderTime: "2025-01-15T11:45:00", status: "preparing", priority: "urgent",
    orderType: "dine-in", elapsed: 33,
  },
  {
    id: "KO-005", kotNumber: "KOT-1011", table: "T-08",
    items: [
      { name: "Masala Dosa", qty: 2 },
      { name: "Filter Coffee", qty: 2 },
    ],
    orderTime: "2025-01-15T11:40:00", status: "ready", priority: "normal",
    orderType: "dine-in", elapsed: 38,
  },
  {
    id: "KO-006", kotNumber: "KOT-1010", table: "Room 105",
    items: [
      { name: "Pasta Alfredo", qty: 1, special: "No mushrooms" },
      { name: "Garlic Bread", qty: 1 },
      { name: "Lemonade", qty: 1 },
    ],
    orderTime: "2025-01-15T11:35:00", status: "ready", priority: "normal",
    orderType: "room-service", elapsed: 43,
  },
  {
    id: "KO-007", kotNumber: "KOT-1016", table: "T-15",
    items: [
      { name: "Chicken Biryani", qty: 2 },
      { name: "Raita", qty: 2 },
      { name: "Gulab Jamun", qty: 2 },
    ],
    orderTime: "2025-01-15T12:20:00", status: "new", priority: "urgent",
    orderType: "dine-in", elapsed: 0,
  },
  {
    id: "KO-008", kotNumber: "KOT-1009", table: "Takeaway",
    items: [
      { name: "Chilli Paneer", qty: 1 },
      { name: "Fried Rice", qty: 1 },
    ],
    orderTime: "2025-01-15T11:30:00", status: "ready", priority: "normal",
    orderType: "takeaway", elapsed: 48,
  },
];

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
  const { refreshTick } = useAppStore();
  const [currentTime, setCurrentTime] = useState(Date.now());

  // Timer effect
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(Date.now()), 30000);
    return () => clearInterval(interval);
  }, []);

  const newOrders = MOCK_ORDERS.filter((o) => o.status === "new");
  const preparingOrders = MOCK_ORDERS.filter((o) => o.status === "preparing");
  const readyOrders = MOCK_ORDERS.filter((o) => o.status === "ready");
  const urgentOrders = MOCK_ORDERS.filter((o) => o.priority === "urgent" && o.status !== "ready");

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
          <Button className="bg-navy hover:bg-navy-light text-white h-9"><Plus className="h-4 w-4 mr-1" /> New KOT</Button>
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
          <p className="text-lg font-bold font-display mt-1">47</p>
        </div>
        <div className="rounded-lg border border-border p-3 bg-card">
          <p className="text-[10px] uppercase text-muted-foreground">Completed</p>
          <p className="text-lg font-bold font-display mt-1 text-[#16A34A]">39</p>
        </div>
        <div className="rounded-lg border border-border p-3 bg-card">
          <p className="text-[10px] uppercase text-muted-foreground">Kitchen Load</p>
          <div className="mt-1">
            <div className="bg-muted rounded-full h-2"><div className="bg-[#D97706] rounded-full h-2" style={{ width: "65%" }} /></div>
            <p className="text-[10px] text-muted-foreground mt-1">65% capacity</p>
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
              <OrderCard key={order.id} order={order} />
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
              <OrderCard key={order.id} order={order} />
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
              <OrderCard key={order.id} order={order} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── ORDER CARD SUB-COMPONENT ────────────────────────────────────────

function OrderCard({ order }: { order: KitchenOrder }) {
  const statusMeta = ORDER_STATUS_META[order.status];
  const typeMeta = ORDER_TYPE_ICON[order.orderType] ?? ORDER_TYPE_ICON["dine-in"];
  const TypeIcon = typeMeta.icon;
  const isOverdue = order.elapsed > 25 && order.status !== "ready";
  const isWarning = order.elapsed > 15 && order.elapsed <= 25 && order.status !== "ready";

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
            <Button size="sm" className="w-full h-7 text-[10px] bg-[#D97706] hover:bg-[#D97706]/80 text-white">
              <Flame className="h-3 w-3 mr-1" /> Start Preparing
            </Button>
          )}
          {order.status === "preparing" && (
            <Button size="sm" className="w-full h-7 text-[10px] bg-[#16A34A] hover:bg-[#16A34A]/80 text-white">
              <CheckCircle2 className="h-3 w-3 mr-1" /> Mark Ready
            </Button>
          )}
          {order.status === "ready" && (
            <Button size="sm" variant="outline" className="w-full h-7 text-[10px]">
              <CheckCircle2 className="h-3 w-3 mr-1" /> Picked Up
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
