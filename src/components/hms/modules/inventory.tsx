// ARIA HMS — Inventory Module (5 tabs: Overview, Stock Items, Procurement, Vendors, Stock Movement)
"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { useApi } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import { KpiCard, fmtINR, fmtDate } from "../shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import {
  Package, AlertTriangle, ShoppingCart, IndianRupee, ArrowUpDown,
  Plus, Search, Warehouse, Truck, ArrowUpRight, ArrowDownRight,
  Filter, Download, ClipboardList,
} from "lucide-react";

// ─── MOCK DATA ──────────────────────────────────────────────────────

const MOCK_STOCK_ITEMS = [
  { id: "SK-001", item: "Bath Towels (White)", category: "Linen", quantity: 340, reorder: 100, unit: "Pcs", value: 170000, status: "in_stock" },
  { id: "SK-002", item: "Mini Bar Items Kit", category: "F&B Supplies", quantity: 45, reorder: 50, unit: "Kits", value: 22500, status: "low_stock" },
  { id: "SK-003", item: "Room Key Cards", category: "Front Office", quantity: 520, reorder: 200, unit: "Pcs", value: 52000, status: "in_stock" },
  { id: "SK-004", item: "Cleaning Chemicals", category: "Housekeeping", quantity: 28, reorder: 30, unit: "Ltr", value: 8400, status: "low_stock" },
  { id: "SK-005", item: "Bed Sheets (King)", category: "Linen", quantity: 180, reorder: 60, unit: "Pcs", value: 126000, status: "in_stock" },
  { id: "SK-006", item: "Toiletry Kit Premium", category: "Housekeeping", quantity: 650, reorder: 200, unit: "Kits", value: 97500, status: "in_stock" },
  { id: "SK-007", item: "Coffee Capsules", category: "F&B Supplies", quantity: 15, reorder: 100, unit: "Boxes", value: 4500, status: "critical" },
  { id: "SK-008", item: "LED Bulbs 9W", category: "Engineering", quantity: 200, reorder: 50, unit: "Pcs", value: 10000, status: "in_stock" },
];

const MOCK_PURCHASE_ORDERS = [
  { id: "PO-2401", vendor: "Linen Solutions Pvt Ltd", items: "Towels, Bed Sheets", qty: 200, value: 150000, status: "approved", date: "2025-01-10" },
  { id: "PO-2402", vendor: "CleanPro Chemicals", items: "Cleaning Chemicals", qty: 100, value: 28000, status: "pending", date: "2025-01-12" },
  { id: "PO-2403", vendor: "Premium Supplies Co", items: "Toiletry Kits", qty: 500, value: 75000, status: "delivered", date: "2025-01-05" },
  { id: "PO-2404", vendor: "TechKey Solutions", items: "Key Cards", qty: 300, value: 30000, status: "in_transit", date: "2025-01-14" },
  { id: "PO-2405", vendor: "Coffee Bean Traders", items: "Coffee Capsules", qty: 50, value: 15000, status: "pending", date: "2025-01-15" },
];

const MOCK_VENDORS = [
  { id: "V-001", name: "Linen Solutions Pvt Ltd", category: "Linen", contact: "Ramesh Kumar", phone: "+91 98765 00111", rating: 4.5, orders: 24 },
  { id: "V-002", name: "CleanPro Chemicals", category: "Housekeeping", contact: "Anita Sharma", phone: "+91 98765 00222", rating: 4.2, orders: 18 },
  { id: "V-003", name: "Premium Supplies Co", category: "Multi-category", contact: "Vikram Patel", phone: "+91 98765 00333", rating: 4.8, orders: 42 },
  { id: "V-004", name: "TechKey Solutions", category: "Technology", contact: "Priya Nair", phone: "+91 98765 00444", rating: 3.9, orders: 12 },
  { id: "V-005", name: "Coffee Bean Traders", category: "F&B", contact: "Sunil Rao", phone: "+91 98765 00555", rating: 4.6, orders: 30 },
];

const MOCK_STOCK_MOVEMENT = [
  { id: "SM-001", item: "Bath Towels (White)", type: "out", qty: 20, from: "Main Store", to: "Laundry", date: "2025-01-15T10:30:00", by: "Ramesh K." },
  { id: "SM-002", item: "Toiletry Kit Premium", type: "in", qty: 200, from: "Vendor", to: "Main Store", date: "2025-01-15T09:15:00", by: "Anita S." },
  { id: "SM-003", item: "Coffee Capsules", type: "out", qty: 10, from: "Main Store", to: "Kitchen", date: "2025-01-15T08:45:00", by: "Sunil R." },
  { id: "SM-004", item: "Room Key Cards", type: "in", qty: 100, from: "Vendor", to: "Front Office", date: "2025-01-14T16:20:00", by: "Priya N." },
  { id: "SM-005", item: "LED Bulbs 9W", type: "out", qty: 5, from: "Main Store", to: "Engineering", date: "2025-01-14T14:00:00", by: "Raj M." },
  { id: "SM-006", item: "Cleaning Chemicals", type: "out", qty: 10, from: "Main Store", to: "Housekeeping", date: "2025-01-14T11:30:00", by: "Anita S." },
];

// ─── STATUS META ─────────────────────────────────────────────────────

const STOCK_STATUS_META: Record<string, { label: string; cls: string }> = {
  in_stock: { label: "In Stock", cls: "bg-[#DCFCE7] text-[#14532D] border-[#16A34A]" },
  low_stock: { label: "Low Stock", cls: "bg-[#FEF3C7] text-[#78350F] border-[#D97706]" },
  critical: { label: "Critical", cls: "bg-[#FFE4E6] text-[#881337] border-[#DC2626]" },
  out_of_stock: { label: "Out of Stock", cls: "bg-[#E5E7EB] text-[#374151] border-[#6B7280]" },
};

const PO_STATUS_META: Record<string, { label: string; cls: string }> = {
  pending: { label: "Pending", cls: "bg-[#FEF3C7] text-[#78350F] border-[#D97706]" },
  approved: { label: "Approved", cls: "bg-[#DBEAFE] text-[#1B3A6B] border-[#0369A1]" },
  in_transit: { label: "In Transit", cls: "bg-[#F3E8FF] text-[#4C1D95] border-[#7C3AED]" },
  delivered: { label: "Delivered", cls: "bg-[#DCFCE7] text-[#14532D] border-[#16A34A]" },
  cancelled: { label: "Cancelled", cls: "bg-[#FFE4E6] text-[#881337] border-[#DC2626]" },
};

// ─── MAIN COMPONENT ──────────────────────────────────────────────────

export function InventoryModule() {
  const { refreshTick } = useAppStore();
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("overview");

  const lowStockCount = MOCK_STOCK_ITEMS.filter((s) => s.status === "low_stock" || s.status === "critical").length;
  const pendingOrders = MOCK_PURCHASE_ORDERS.filter((p) => p.status === "pending" || p.status === "approved").length;
  const totalValue = MOCK_STOCK_ITEMS.reduce((sum, s) => sum + s.value, 0);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-display font-bold text-foreground flex items-center gap-2">
            <Warehouse className="h-5 w-5 text-navy" /> Inventory Management
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">Stock tracking, procurement & vendor management</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input placeholder="Search items..." className="pl-8 h-9 w-48" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Button variant="outline" size="sm" className="h-9"><Download className="h-3.5 w-3.5 mr-1" /> Export</Button>
          <Button className="bg-navy hover:bg-navy-light text-white h-9"><Plus className="h-4 w-4 mr-1" /> Add Item</Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Total Items" value={MOCK_STOCK_ITEMS.length} icon={Package} accent="navy" delta={3} deltaLabel="vs last month" />
        <KpiCard label="Low Stock" value={lowStockCount} icon={AlertTriangle} accent="warning" />
        <KpiCard label="Pending Orders" value={pendingOrders} icon={ShoppingCart} accent="info" />
        <KpiCard label="Total Value" value={fmtINR(totalValue)} icon={IndianRupee} accent="success" />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="overview" className="text-xs">Overview</TabsTrigger>
          <TabsTrigger value="stock-items" className="text-xs">Stock Items</TabsTrigger>
          <TabsTrigger value="procurement" className="text-xs">Procurement</TabsTrigger>
          <TabsTrigger value="vendors" className="text-xs">Vendors</TabsTrigger>
          <TabsTrigger value="stock-movement" className="text-xs">Stock Movement</TabsTrigger>
        </TabsList>

        {/* ── Overview Tab ── */}
        <TabsContent value="overview" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-[#D97706]" /> Low Stock Alerts
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {MOCK_STOCK_ITEMS.filter((s) => s.status === "low_stock" || s.status === "critical").map((item) => {
                  const st = STOCK_STATUS_META[item.status];
                  return (
                    <div key={item.id} className="flex items-center justify-between p-2 rounded-lg border border-border hover:bg-muted/50">
                      <div className="flex items-center gap-3">
                        <div className={cn("h-8 w-8 flex items-center justify-center rounded-lg", item.status === "critical" ? "bg-[#FFE4E6]" : "bg-[#FEF3C7]")}>
                          <Package className="h-4 w-4" style={{ color: item.status === "critical" ? "#DC2626" : "#D97706" }} />
                        </div>
                        <div>
                          <p className="text-xs font-medium">{item.item}</p>
                          <p className="text-[10px] text-muted-foreground">{item.quantity} {item.unit} remaining · Reorder at {item.reorder}</p>
                        </div>
                      </div>
                      <span className={cn("inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-medium", st.cls)}>{st.label}</span>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <ShoppingCart className="h-4 w-4 text-[#0369A1]" /> Recent Purchase Orders
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {MOCK_PURCHASE_ORDERS.slice(0, 4).map((po) => {
                  const st = PO_STATUS_META[po.status];
                  return (
                    <div key={po.id} className="flex items-center justify-between p-2 rounded-lg border border-border hover:bg-muted/50">
                      <div>
                        <p className="text-xs font-medium">{po.id} — {po.vendor}</p>
                        <p className="text-[10px] text-muted-foreground">{po.items} · {fmtINR(po.value)}</p>
                      </div>
                      <span className={cn("inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-medium", st.cls)}>{st.label}</span>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── Stock Items Tab ── */}
        <TabsContent value="stock-items" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Package className="h-4 w-4 text-navy" /> Stock Items
                </CardTitle>
                <Button variant="outline" size="sm" className="h-7 text-xs"><Filter className="h-3 w-3 mr-1" /> Filter</Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-[11px]">Code</TableHead>
                    <TableHead className="text-[11px]">Item</TableHead>
                    <TableHead className="text-[11px]">Category</TableHead>
                    <TableHead className="text-[11px] text-right">Quantity</TableHead>
                    <TableHead className="text-[11px] text-right">Reorder Level</TableHead>
                    <TableHead className="text-[11px]">Unit</TableHead>
                    <TableHead className="text-[11px] text-right">Value</TableHead>
                    <TableHead className="text-[11px]">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {MOCK_STOCK_ITEMS.map((s) => {
                    const st = STOCK_STATUS_META[s.status] ?? STOCK_STATUS_META.in_stock;
                    return (
                      <TableRow key={s.id} className="hover:bg-muted/50 cursor-pointer">
                        <TableCell className="text-xs font-mono text-muted-foreground">{s.id}</TableCell>
                        <TableCell className="text-xs font-medium">{s.item}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{s.category}</TableCell>
                        <TableCell className="text-xs text-right tabular-nums">{s.quantity.toLocaleString()}</TableCell>
                        <TableCell className="text-xs text-right tabular-nums text-muted-foreground">{s.reorder.toLocaleString()}</TableCell>
                        <TableCell className="text-xs">{s.unit}</TableCell>
                        <TableCell className="text-xs text-right tabular-nums">{fmtINR(s.value)}</TableCell>
                        <TableCell><span className={cn("inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-medium", st.cls)}>{st.label}</span></TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Procurement Tab ── */}
        <TabsContent value="procurement" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <ClipboardList className="h-4 w-4 text-navy" /> Purchase Orders
                </CardTitle>
                <Button size="sm" className="bg-navy hover:bg-navy-light text-white h-7 text-xs"><Plus className="h-3 w-3 mr-1" /> New PO</Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-[11px]">PO #</TableHead>
                    <TableHead className="text-[11px]">Vendor</TableHead>
                    <TableHead className="text-[11px]">Items</TableHead>
                    <TableHead className="text-[11px] text-right">Qty</TableHead>
                    <TableHead className="text-[11px] text-right">Value</TableHead>
                    <TableHead className="text-[11px]">Status</TableHead>
                    <TableHead className="text-[11px]">Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {MOCK_PURCHASE_ORDERS.map((po) => {
                    const st = PO_STATUS_META[po.status] ?? PO_STATUS_META.pending;
                    return (
                      <TableRow key={po.id} className="hover:bg-muted/50 cursor-pointer">
                        <TableCell className="text-xs font-mono text-muted-foreground">{po.id}</TableCell>
                        <TableCell className="text-xs font-medium">{po.vendor}</TableCell>
                        <TableCell className="text-xs">{po.items}</TableCell>
                        <TableCell className="text-xs text-right tabular-nums">{po.qty}</TableCell>
                        <TableCell className="text-xs text-right tabular-nums">{fmtINR(po.value)}</TableCell>
                        <TableCell><span className={cn("inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-medium", st.cls)}>{st.label}</span></TableCell>
                        <TableCell className="text-xs">{fmtDate(po.date)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Vendors Tab ── */}
        <TabsContent value="vendors" className="mt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {MOCK_VENDORS.map((v) => (
              <Card key={v.id} className="hover:shadow-card-lg transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-navy/10 text-navy font-bold text-sm shrink-0">
                      {v.name.split(" ").slice(0, 2).map((n) => n[0]).join("")}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{v.name}</p>
                      <p className="text-xs text-muted-foreground">{v.category}</p>
                      <div className="flex items-center gap-3 mt-2">
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <Truck className="h-3 w-3" /> {v.orders} orders
                        </span>
                        <span className="text-[10px] text-[#D97706] font-medium">★ {v.rating}</span>
                      </div>
                      <div className="flex items-center justify-between mt-3 pt-2 border-t border-border">
                        <span className="text-[10px] text-muted-foreground">{v.contact}</span>
                        <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2">Contact</Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* ── Stock Movement Tab ── */}
        <TabsContent value="stock-movement" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <ArrowUpDown className="h-4 w-4 text-navy" /> Stock Movement Log
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-[11px]">ID</TableHead>
                    <TableHead className="text-[11px]">Item</TableHead>
                    <TableHead className="text-[11px]">Type</TableHead>
                    <TableHead className="text-[11px] text-right">Qty</TableHead>
                    <TableHead className="text-[11px]">From</TableHead>
                    <TableHead className="text-[11px]">To</TableHead>
                    <TableHead className="text-[11px]">By</TableHead>
                    <TableHead className="text-[11px]">Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {MOCK_STOCK_MOVEMENT.map((m) => (
                    <TableRow key={m.id} className="hover:bg-muted/50">
                      <TableCell className="text-xs font-mono text-muted-foreground">{m.id}</TableCell>
                      <TableCell className="text-xs font-medium">{m.item}</TableCell>
                      <TableCell>
                        <span className={cn("inline-flex items-center gap-0.5 text-[10px] font-medium", m.type === "in" ? "text-[#16A34A]" : "text-[#DC2626]")}>
                          {m.type === "in" ? <ArrowDownRight className="h-3 w-3" /> : <ArrowUpRight className="h-3 w-3" />}
                          {m.type === "in" ? "Stock In" : "Stock Out"}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-right tabular-nums">{m.qty}</TableCell>
                      <TableCell className="text-xs">{m.from}</TableCell>
                      <TableCell className="text-xs">{m.to}</TableCell>
                      <TableCell className="text-xs">{m.by}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{new Date(m.date).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hour12: true })}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
