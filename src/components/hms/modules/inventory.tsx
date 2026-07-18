// ARIA HMS — Inventory Module (5 tabs: Overview, Stock Items, Procurement, Vendors, Stock Movement)
"use client";

import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { useApi, apiPost } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import { KpiCard, fmtINR, fmtDate } from "../shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  Package, AlertTriangle, ShoppingCart, IndianRupee, ArrowUpDown,
  Plus, Search, Warehouse, Truck, ArrowUpRight, ArrowDownRight,
  Filter, Download, ClipboardList,
} from "lucide-react";

// ─── MOCK DATA (fallback) ────────────────────────────────────────────

const MOCK_STOCK_ITEMS = [
  { id: "SK-001", name: "Bath Towels (White)", item: "Bath Towels (White)", category: "Linen", quantity: 340, reorder: 100, reorderLevel: 100, unit: "Pcs", value: 170000, unitCost: 500, status: "in_stock" },
  { id: "SK-002", name: "Mini Bar Items Kit", item: "Mini Bar Items Kit", category: "F&B Supplies", quantity: 45, reorder: 50, reorderLevel: 50, unit: "Kits", value: 22500, unitCost: 500, status: "low_stock" },
  { id: "SK-003", name: "Room Key Cards", item: "Room Key Cards", category: "Front Office", quantity: 520, reorder: 200, reorderLevel: 200, unit: "Pcs", value: 52000, unitCost: 100, status: "in_stock" },
  { id: "SK-004", name: "Cleaning Chemicals", item: "Cleaning Chemicals", category: "Housekeeping", quantity: 28, reorder: 30, reorderLevel: 30, unit: "Ltr", value: 8400, unitCost: 300, status: "low_stock" },
  { id: "SK-005", name: "Bed Sheets (King)", item: "Bed Sheets (King)", category: "Linen", quantity: 180, reorder: 60, reorderLevel: 60, unit: "Pcs", value: 126000, unitCost: 700, status: "in_stock" },
  { id: "SK-006", name: "Toiletry Kit Premium", item: "Toiletry Kit Premium", category: "Housekeeping", quantity: 650, reorder: 200, reorderLevel: 200, unit: "Kits", value: 97500, unitCost: 150, status: "in_stock" },
  { id: "SK-007", name: "Coffee Capsules", item: "Coffee Capsules", category: "F&B Supplies", quantity: 15, reorder: 100, reorderLevel: 100, unit: "Boxes", value: 4500, unitCost: 300, status: "critical" },
  { id: "SK-008", name: "LED Bulbs 9W", item: "LED Bulbs 9W", category: "Engineering", quantity: 200, reorder: 50, reorderLevel: 50, unit: "Pcs", value: 10000, unitCost: 50, status: "in_stock" },
];

const MOCK_PURCHASE_ORDERS = [
  { id: "PO-2401", vendor: { name: "Linen Solutions Pvt Ltd" }, items: "Towels, Bed Sheets", qty: 200, totalAmount: 150000, value: 150000, status: "approved", date: "2025-01-10", createdAt: "2025-01-10" },
  { id: "PO-2402", vendor: { name: "CleanPro Chemicals" }, items: "Cleaning Chemicals", qty: 100, totalAmount: 28000, value: 28000, status: "pending", date: "2025-01-12", createdAt: "2025-01-12" },
  { id: "PO-2403", vendor: { name: "Premium Supplies Co" }, items: "Toiletry Kits", qty: 500, totalAmount: 75000, value: 75000, status: "delivered", date: "2025-01-05", createdAt: "2025-01-05" },
  { id: "PO-2404", vendor: { name: "TechKey Solutions" }, items: "Key Cards", qty: 300, totalAmount: 30000, value: 30000, status: "in_transit", date: "2025-01-14", createdAt: "2025-01-14" },
  { id: "PO-2405", vendor: { name: "Coffee Bean Traders" }, items: "Coffee Capsules", qty: 50, totalAmount: 15000, value: 15000, status: "pending", date: "2025-01-15", createdAt: "2025-01-15" },
];

const MOCK_VENDORS = [
  { id: "V-001", name: "Linen Solutions Pvt Ltd", category: "Linen", contactPerson: "Ramesh Kumar", phone: "+91 98765 00111", rating: 4.5, orders: 24 },
  { id: "V-002", name: "CleanPro Chemicals", category: "Housekeeping", contactPerson: "Anita Sharma", phone: "+91 98765 00222", rating: 4.2, orders: 18 },
  { id: "V-003", name: "Premium Supplies Co", category: "Multi-category", contactPerson: "Vikram Patel", phone: "+91 98765 00333", rating: 4.8, orders: 42 },
  { id: "V-004", name: "TechKey Solutions", category: "Technology", contactPerson: "Priya Nair", phone: "+91 98765 00444", rating: 3.9, orders: 12 },
  { id: "V-005", name: "Coffee Bean Traders", category: "F&B", contactPerson: "Sunil Rao", phone: "+91 98765 00555", rating: 4.6, orders: 30 },
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
  draft: { label: "Draft", cls: "bg-[#E5E7EB] text-[#374151] border-[#6B7280]" },
  submitted: { label: "Submitted", cls: "bg-[#DBEAFE] text-[#1B3A6B] border-[#0369A1]" },
  approved: { label: "Approved", cls: "bg-[#DBEAFE] text-[#1B3A6B] border-[#0369A1]" },
  in_transit: { label: "In Transit", cls: "bg-[#F3E8FF] text-[#4C1D95] border-[#7C3AED]" },
  received: { label: "Received", cls: "bg-[#DCFCE7] text-[#14532D] border-[#16A34A]" },
  delivered: { label: "Delivered", cls: "bg-[#DCFCE7] text-[#14532D] border-[#16A34A]" },
  cancelled: { label: "Cancelled", cls: "bg-[#FFE4E6] text-[#881337] border-[#DC2626]" },
};

// ─── HELPERS ─────────────────────────────────────────────────────────

function getStockStatus(quantity: number, reorderLevel: number): string {
  if (quantity <= 0) return "out_of_stock";
  if (quantity <= reorderLevel * 0.5) return "critical";
  if (quantity <= reorderLevel) return "low_stock";
  return "in_stock";
}

/** Get display name for a stock item (supports both `name` and `item` fields) */
function itemName(s: any): string {
  return s.name || s.item || "Unknown";
}

/** Get reorder level (supports both `reorderLevel` and `reorder` fields) */
function reorderLvl(s: any): number {
  return s.reorderLevel ?? s.reorder ?? 0;
}

/** Get value for a stock item (computed from unitCost * quantity or direct `value`) */
function stockValue(s: any): number {
  if (s.value != null) return s.value;
  return (s.unitCost ?? 0) * (s.quantity ?? 0);
}

/** Get vendor name from a PO (supports object and string) */
function vendorName(po: any): string {
  if (typeof po.vendor === "string") return po.vendor;
  return po.vendor?.name || po.vendorName || "—";
}

/** Get PO total amount */
function poAmount(po: any): number {
  return po.totalAmount ?? po.value ?? 0;
}

/** Get PO date */
function poDate(po: any): string {
  return po.date || po.createdAt || po.orderedAt || "";
}

// ─── ADD ITEM DIALOG ─────────────────────────────────────────────────

function AddItemDialog({ open, onOpenChange, onSuccess }: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSuccess: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "", sku: "", category: "", unit: "pcs", quantity: "",
    reorderLevel: "", unitCost: "", location: "",
  });

  const reset = () => setForm({ name: "", sku: "", category: "", unit: "pcs", quantity: "", reorderLevel: "", unitCost: "", location: "" });

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error("Item name is required"); return; }
    setSaving(true);
    try {
      await apiPost("/api/inventory/stock", {
        name: form.name,
        sku: form.sku || null,
        category: form.category || null,
        unit: form.unit,
        quantity: Number(form.quantity) || 0,
        reorderLevel: Number(form.reorderLevel) || 0,
        unitCost: Number(form.unitCost) || 0,
        location: form.location || null,
      });
      toast.success("Stock item created");
      reset();
      onOpenChange(false);
      onSuccess();
    } catch (e: any) {
      toast.error(e.message || "Failed to create item");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-4 w-4 text-navy" /> Add Stock Item
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 py-2">
          <div className="grid gap-1.5">
            <Label className="text-xs">Name *</Label>
            <Input placeholder="Item name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label className="text-xs">SKU</Label>
              <Input placeholder="SKU code" value={form.sku} onChange={(e) => setForm((f) => ({ ...f, sku: e.target.value }))} />
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs">Category</Label>
              <Select value={form.category} onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Linen">Linen</SelectItem>
                  <SelectItem value="F&B Supplies">F&B Supplies</SelectItem>
                  <SelectItem value="Front Office">Front Office</SelectItem>
                  <SelectItem value="Housekeeping">Housekeeping</SelectItem>
                  <SelectItem value="Engineering">Engineering</SelectItem>
                  <SelectItem value="Medical">Medical</SelectItem>
                  <SelectItem value="Stationery">Stationery</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="grid gap-1.5">
              <Label className="text-xs">Unit</Label>
              <Select value={form.unit} onValueChange={(v) => setForm((f) => ({ ...f, unit: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pcs">Pcs</SelectItem>
                  <SelectItem value="kg">Kg</SelectItem>
                  <SelectItem value="liter">Liter</SelectItem>
                  <SelectItem value="box">Box</SelectItem>
                  <SelectItem value="pack">Pack</SelectItem>
                  <SelectItem value="set">Set</SelectItem>
                  <SelectItem value="Kits">Kits</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs">Quantity</Label>
              <Input type="number" placeholder="0" value={form.quantity} onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))} />
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs">Reorder Level</Label>
              <Input type="number" placeholder="0" value={form.reorderLevel} onChange={(e) => setForm((f) => ({ ...f, reorderLevel: e.target.value }))} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label className="text-xs">Unit Cost (₹)</Label>
              <Input type="number" placeholder="0" value={form.unitCost} onChange={(e) => setForm((f) => ({ ...f, unitCost: e.target.value }))} />
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs">Location</Label>
              <Select value={form.location} onValueChange={(v) => setForm((f) => ({ ...f, location: v }))}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="warehouse">Warehouse</SelectItem>
                  <SelectItem value="kitchen">Kitchen</SelectItem>
                  <SelectItem value="bar">Bar</SelectItem>
                  <SelectItem value="store">Store</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => { reset(); onOpenChange(false); }} disabled={saving}>Cancel</Button>
          <Button className="bg-navy hover:bg-navy-light text-white" size="sm" onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Add Item"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── NEW PO DIALOG ───────────────────────────────────────────────────

function NewPODialog({ open, onOpenChange, onSuccess, vendors }: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSuccess: () => void;
  vendors: any[];
}) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ vendorId: "", totalAmount: "", notes: "" });

  const reset = () => setForm({ vendorId: "", totalAmount: "", notes: "" });

  const handleSave = async () => {
    if (!form.totalAmount || Number(form.totalAmount) <= 0) {
      toast.error("Total amount is required");
      return;
    }
    setSaving(true);
    try {
      await apiPost("/api/purchasing/orders", {
        vendorId: form.vendorId || null,
        totalAmount: Number(form.totalAmount),
        notes: form.notes || null,
        status: "draft",
      });
      toast.success("Purchase order created");
      reset();
      onOpenChange(false);
      onSuccess();
    } catch (e: any) {
      toast.error(e.message || "Failed to create PO");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-navy" /> New Purchase Order
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 py-2">
          <div className="grid gap-1.5">
            <Label className="text-xs">Vendor</Label>
            <Select value={form.vendorId} onValueChange={(v) => setForm((f) => ({ ...f, vendorId: v }))}>
              <SelectTrigger><SelectValue placeholder="Select vendor" /></SelectTrigger>
              <SelectContent>
                {vendors.map((v) => (
                  <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label className="text-xs">Total Amount (₹) *</Label>
            <Input type="number" placeholder="0" value={form.totalAmount} onChange={(e) => setForm((f) => ({ ...f, totalAmount: e.target.value }))} />
          </div>
          <div className="grid gap-1.5">
            <Label className="text-xs">Notes</Label>
            <Input placeholder="Order details or notes" value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => { reset(); onOpenChange(false); }} disabled={saving}>Cancel</Button>
          <Button className="bg-navy hover:bg-navy-light text-white" size="sm" onClick={handleSave} disabled={saving}>
            {saving ? "Creating..." : "Create PO"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── MAIN COMPONENT ──────────────────────────────────────────────────

export function InventoryModule() {
  const { refreshTick, triggerRefresh } = useAppStore();
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("overview");
  const [addItemOpen, setAddItemOpen] = useState(false);
  const [newPOOpen, setNewPOOpen] = useState(false);

  // ── API Calls ─────────────────────────────────────────────────────
  const { data: stockData, loading: stockLoading, error: stockError, reload: stockReload } = useApi<any>(
    `/api/inventory/stock?search=${search}`,
    [search, refreshTick]
  );
  const { data: poData, loading: poLoading, error: poError, reload: poReload } = useApi<any>(
    "/api/purchasing/orders",
    [refreshTick]
  );
  const { data: vendorData, loading: vendorLoading, error: vendorError, reload: vendorReload } = useApi<any>(
    "/api/inventory/vendors",
    [refreshTick]
  );

  // ── Normalize API responses ───────────────────────────────────────
  const stockItems: any[] = useMemo(() =>
    Array.isArray(stockData) ? stockData : (stockData?.items ?? stockData?.data ?? []),
    [stockData]
  );
  const purchaseOrders: any[] = useMemo(() =>
    Array.isArray(poData) ? poData : (poData?.items ?? poData?.data ?? []),
    [poData]
  );
  const vendors: any[] = useMemo(() =>
    Array.isArray(vendorData) ? vendorData : (vendorData?.items ?? vendorData?.data ?? []),
    [vendorData]
  );

  // ── Fallback to MOCK when API returns empty/error ─────────────────
  const isLiveStock = stockItems.length > 0;
  const isLivePO = purchaseOrders.length > 0;
  const isLiveVendors = vendors.length > 0;

  const displayStock = isLiveStock ? stockItems : MOCK_STOCK_ITEMS;
  const displayPOs = isLivePO ? purchaseOrders : MOCK_PURCHASE_ORDERS;
  const displayVendors = isLiveVendors ? vendors : MOCK_VENDORS;

  // ── Enrich stock items with computed status ───────────────────────
  const enrichedStock = useMemo(() =>
    displayStock.map((s) => ({
      ...s,
      computedStatus: s.status || getStockStatus(s.quantity ?? 0, reorderLvl(s)),
    })),
    [displayStock]
  );

  // ── KPIs from real data (or fallback) ─────────────────────────────
  const lowStockCount = useMemo(() => {
    if (isLiveStock && stockData?.meta?.lowStockCount != null) return stockData.meta.lowStockCount;
    return enrichedStock.filter((s) => s.computedStatus === "low_stock" || s.computedStatus === "critical" || s.computedStatus === "out_of_stock").length;
  }, [enrichedStock, isLiveStock, stockData]);

  const pendingOrders = useMemo(() =>
    displayPOs.filter((p) => p.status === "pending" || p.status === "draft" || p.status === "submitted" || p.status === "approved").length,
    [displayPOs]
  );

  const totalValue = useMemo(() =>
    enrichedStock.reduce((sum, s) => sum + stockValue(s), 0),
    [enrichedStock]
  );

  const isLive = isLiveStock || isLivePO || isLiveVendors;
  const hasError = stockError || poError || vendorError;

  // ── Handlers ──────────────────────────────────────────────────────
  const handleAddItemSuccess = () => {
    triggerRefresh();
    stockReload();
  };

  const handleNewPOSuccess = () => {
    triggerRefresh();
    poReload();
  };

  // ── Loading state ─────────────────────────────────────────────────
  const isLoading = stockLoading && poLoading && vendorLoading;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-display font-bold text-foreground flex items-center gap-2">
            <Warehouse className="h-5 w-5 text-navy" /> Inventory Management
            <span className={cn("ml-2 inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-medium",
              isLive
                ? "bg-[#DCFCE7] text-[#14532D] border-[#16A34A]"
                : "bg-[#FEF3C7] text-[#78350F] border-[#D97706]"
            )}>
              <span className={cn("h-1.5 w-1.5 rounded-full", isLive ? "bg-[#16A34A]" : "bg-[#D97706]")} />
              {isLive ? "Live" : "Sample"}
            </span>
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">Stock tracking, procurement & vendor management</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input placeholder="Search items..." className="pl-8 h-9 w-48" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Button variant="outline" size="sm" className="h-9" onClick={() => {
            const items = displayStock;
            const csv = ["Name,Category,SKU,Quantity,Unit,ReorderLevel,UnitPrice,Status",
              ...items.map(i => `"${i.name}","${i.category}","${i.sku ?? ""}",${i.quantity ?? 0},"${i.unit ?? ""}",${i.reorderLevel ?? 0},${i.unitPrice ?? 0},"${i.status ?? ""}"`)
            ].join("\n");
            const blob = new Blob([csv], { type: "text/csv" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a"); a.href = url; a.download = "inventory.csv"; a.click();
            URL.revokeObjectURL(url);
            toast.success("Inventory exported as CSV");
          }}><Download className="h-3.5 w-3.5 mr-1" /> Export</Button>
          <Button className="bg-navy hover:bg-navy-light text-white h-9" onClick={() => setAddItemOpen(true)}>
            <Plus className="h-4 w-4 mr-1" /> Add Item
          </Button>
        </div>
      </div>

      {/* Error Banner */}
      {hasError && (
        <div className="flex items-center gap-2 rounded-lg border border-[#FFE4E6] bg-[#FFF1F2] px-4 py-2.5 text-xs text-[#881337]">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>Failed to load live data. Showing sample data.</span>
          <Button variant="outline" size="sm" className="ml-auto h-6 text-[10px] px-2" onClick={() => { stockReload(); poReload(); vendorReload(); }}>
            Retry
          </Button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {stockLoading ? (
          <>
            <Skeleton className="h-24 rounded-xl" />
            <Skeleton className="h-24 rounded-xl" />
            <Skeleton className="h-24 rounded-xl" />
            <Skeleton className="h-24 rounded-xl" />
          </>
        ) : (
          <>
            <KpiCard label="Total Items" value={enrichedStock.length} icon={Package} accent="navy" delta={3} deltaLabel="vs last month" />
            <KpiCard label="Low Stock" value={lowStockCount} icon={AlertTriangle} accent="warning" />
            <KpiCard label="Pending Orders" value={pendingOrders} icon={ShoppingCart} accent="info" />
            <KpiCard label="Total Value" value={fmtINR(totalValue)} icon={IndianRupee} accent="success" />
          </>
        )}
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
              <CardContent className="space-y-2 max-h-96 overflow-y-auto">
                {stockLoading ? (
                  Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-lg" />)
                ) : (
                  enrichedStock
                    .filter((s) => s.computedStatus === "low_stock" || s.computedStatus === "critical" || s.computedStatus === "out_of_stock")
                    .map((item) => {
                      const st = STOCK_STATUS_META[item.computedStatus] ?? STOCK_STATUS_META.in_stock;
                      return (
                        <div key={item.id} className="flex items-center justify-between p-2 rounded-lg border border-border hover:bg-muted/50">
                          <div className="flex items-center gap-3">
                            <div className={cn("h-8 w-8 flex items-center justify-center rounded-lg", item.computedStatus === "critical" || item.computedStatus === "out_of_stock" ? "bg-[#FFE4E6]" : "bg-[#FEF3C7]")}>
                              <Package className="h-4 w-4" style={{ color: item.computedStatus === "critical" || item.computedStatus === "out_of_stock" ? "#DC2626" : "#D97706" }} />
                            </div>
                            <div>
                              <p className="text-xs font-medium">{itemName(item)}</p>
                              <p className="text-[10px] text-muted-foreground">{item.quantity ?? 0} {item.unit || "Pcs"} remaining · Reorder at {reorderLvl(item)}</p>
                            </div>
                          </div>
                          <span className={cn("inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-medium", st.cls)}>{st.label}</span>
                        </div>
                      );
                    })
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <ShoppingCart className="h-4 w-4 text-[#0369A1]" /> Recent Purchase Orders
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 max-h-96 overflow-y-auto">
                {poLoading ? (
                  Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-lg" />)
                ) : (
                  displayPOs.slice(0, 4).map((po) => {
                    const st = PO_STATUS_META[po.status] ?? PO_STATUS_META.pending;
                    return (
                      <div key={po.id} className="flex items-center justify-between p-2 rounded-lg border border-border hover:bg-muted/50">
                        <div>
                          <p className="text-xs font-medium">{po.poNumber || po.id} — {vendorName(po)}</p>
                          <p className="text-[10px] text-muted-foreground">{po.items || po.notes || "—"} · {fmtINR(poAmount(po))}</p>
                        </div>
                        <span className={cn("inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-medium", st.cls)}>{st.label}</span>
                      </div>
                    );
                  })
                )}
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
                  <span className="text-[10px] text-muted-foreground font-normal">({enrichedStock.length})</span>
                </CardTitle>
                <Button variant="outline" size="sm" className="h-7 text-xs"><Filter className="h-3 w-3 mr-1" /> Filter</Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {stockLoading ? (
                <div className="p-4 space-y-2">
                  {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
                </div>
              ) : (
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
                    {enrichedStock.map((s) => {
                      const st = STOCK_STATUS_META[s.computedStatus] ?? STOCK_STATUS_META.in_stock;
                      return (
                        <TableRow key={s.id} className="hover:bg-muted/50 cursor-pointer">
                          <TableCell className="text-xs font-mono text-muted-foreground">{s.sku || s.id}</TableCell>
                          <TableCell className="text-xs font-medium">{itemName(s)}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{s.category || "—"}</TableCell>
                          <TableCell className="text-xs text-right tabular-nums">{(s.quantity ?? 0).toLocaleString()}</TableCell>
                          <TableCell className="text-xs text-right tabular-nums text-muted-foreground">{reorderLvl(s).toLocaleString()}</TableCell>
                          <TableCell className="text-xs">{s.unit || "—"}</TableCell>
                          <TableCell className="text-xs text-right tabular-nums">{fmtINR(stockValue(s))}</TableCell>
                          <TableCell><span className={cn("inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-medium", st.cls)}>{st.label}</span></TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
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
                  <span className="text-[10px] text-muted-foreground font-normal">({displayPOs.length})</span>
                </CardTitle>
                <Button size="sm" className="bg-navy hover:bg-navy-light text-white h-7 text-xs" onClick={() => setNewPOOpen(true)}>
                  <Plus className="h-3 w-3 mr-1" /> New PO
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {poLoading ? (
                <div className="p-4 space-y-2">
                  {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-[11px]">PO #</TableHead>
                      <TableHead className="text-[11px]">Vendor</TableHead>
                      <TableHead className="text-[11px]">Items / Notes</TableHead>
                      <TableHead className="text-[11px] text-right">Value</TableHead>
                      <TableHead className="text-[11px]">Status</TableHead>
                      <TableHead className="text-[11px]">Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {displayPOs.map((po) => {
                      const st = PO_STATUS_META[po.status] ?? PO_STATUS_META.pending;
                      return (
                        <TableRow key={po.id} className="hover:bg-muted/50 cursor-pointer">
                          <TableCell className="text-xs font-mono text-muted-foreground">{po.poNumber || po.id}</TableCell>
                          <TableCell className="text-xs font-medium">{vendorName(po)}</TableCell>
                          <TableCell className="text-xs">{po.items || po.notes || "—"}</TableCell>
                          <TableCell className="text-xs text-right tabular-nums">{fmtINR(poAmount(po))}</TableCell>
                          <TableCell><span className={cn("inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-medium", st.cls)}>{st.label}</span></TableCell>
                          <TableCell className="text-xs">{fmtDate(poDate(po))}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Vendors Tab ── */}
        <TabsContent value="vendors" className="mt-4">
          {vendorLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-36 rounded-xl" />)}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {displayVendors.map((v) => (
                <Card key={v.id} className="hover:shadow-card-lg transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-navy/10 text-navy font-bold text-sm shrink-0">
                        {v.name.split(" ").slice(0, 2).map((n: string) => n[0]).join("")}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">{v.name}</p>
                        <p className="text-xs text-muted-foreground">{v.category || "—"}</p>
                        <div className="flex items-center gap-3 mt-2">
                          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <Truck className="h-3 w-3" /> {v.orders ?? v._count?.purchaseOrders ?? "—"} orders
                          </span>
                          <span className="text-[10px] text-[#D97706] font-medium">★ {v.rating ?? "—"}</span>
                        </div>
                        <div className="flex items-center justify-between mt-3 pt-2 border-t border-border">
                          <span className="text-[10px] text-muted-foreground">{v.contactPerson || v.contact || "—"}</span>
                          <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2">Contact</Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── Stock Movement Tab ── */}
        <TabsContent value="stock-movement" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <ArrowUpDown className="h-4 w-4 text-navy" /> Stock Movement Log
                <span className="inline-flex items-center gap-1 ml-2 rounded-md border border-[#D97706] bg-[#FEF3C7] px-1.5 py-0.5 text-[10px] font-medium text-[#78350F]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#D97706]" /> Sample
                </span>
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

      {/* Dialogs */}
      <AddItemDialog open={addItemOpen} onOpenChange={setAddItemOpen} onSuccess={handleAddItemSuccess} />
      <NewPODialog open={newPOOpen} onOpenChange={setNewPOOpen} onSuccess={handleNewPOSuccess} vendors={displayVendors} />
    </div>
  );
}
