// ARIA HMS — Vendors Module (3 tabs: Vendor Directory, Contracts, Performance)
"use client";

import { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/lib/store";
import { useApi, api } from "@/lib/api";
import { KpiCard, fmtINR, fmtDate } from "../shared";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import {
  Building2, FileSignature, Star, Phone, Mail,
  Plus, Search, Filter, Download, ArrowUpDown, Users,
  IndianRupee, AlertCircle, CheckCircle2, Clock, XCircle,
  TrendingUp, TrendingDown, Truck, Shield, Loader2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

// ─── CHART COLORS ──────────────────────────────────────────────────────
const CHART_COLORS = ["#1B3A6B", "#C9952A", "#16A34A", "#0369A1", "#D97706", "#7C3AED"];

// ─── TYPES ─────────────────────────────────────────────────────────────

/** Shape returned by /api/inventory/vendors (Prisma Vendor model) */
interface ApiVendor {
  id: string;
  propertyId: string;
  name: string;
  contactPerson: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  gstNumber: string | null;
  panNumber: string | null;
  category: string | null;
  rating: number; // 1-10 scale
  paymentTerms: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Shape returned by /api/purchasing/orders (enriched with vendor) */
interface ApiPurchaseOrder {
  id: string;
  propertyId: string;
  vendorId: string | null;
  poNumber: string;
  status: string;
  totalAmount: number;
  notes: string | null;
  requestedById: string | null;
  approvedById: string | null;
  orderedAt: string | null;
  receivedAt: string | null;
  createdAt: string;
  updatedAt: string;
  vendor: {
    id: string;
    name: string;
    category: string | null;
    rating: number;
    paymentTerms: string | null;
    email: string | null;
    phone: string | null;
  } | null;
}

/** Shape returned by /api/purchasing/vendor-ratings (enriched with vendor) */
interface ApiVendorRating {
  id: string;
  propertyId: string;
  vendorId: string;
  orderId: string | null;
  qualityScore: number;   // 1-10
  deliveryScore: number;  // 1-10
  priceScore: number;     // 1-10
  communicationScore: number; // 1-10
  overallScore: number;   // weighted average
  review: string | null;
  ratedBy: string | null;
  createdAt: string;
  vendor: {
    id: string;
    name: string;
    category: string | null;
    rating: number;
    email: string | null;
    phone: string | null;
  };
}

/** Display-oriented vendor type for the directory table */
interface DisplayVendor {
  id: string;
  name: string;
  category: string;
  contact: string;
  phone: string;
  email: string;
  rating: number; // 1-5 scale for star display
  status: "active" | "inactive" | "pending" | "blacklisted";
  totalOrders: number;
  totalSpent: number;
  joinedDate: string;
  // Keep raw API data for form submission
  _raw: ApiVendor;
}

interface Contract {
  id: string;
  vendorId: string;
  vendorName: string;
  title: string;
  value: number;
  startDate: string;
  endDate: string;
  status: "active" | "expired" | "pending_renewal" | "terminated";
  type: string;
}

interface PerformanceRecord {
  vendorId: string;
  vendorName: string;
  category: string;
  overallRating: number;
  deliveryScore: number;
  qualityScore: number;
  responsiveness: number;
  pricing: number;
  onTimeDelivery: number;
  defectRate: number;
  avgLeadTime: number;
  trend: "up" | "down" | "stable";
}

// ─── FALLBACK DATA ─────────────────────────────────────────────────────

const FALLBACK_CONTRACTS: Contract[] = [
  { id: "CTR-001", vendorId: "VND-001", vendorName: "Linen Solutions Pvt Ltd", title: "Annual Linen Supply Agreement", value: 2400000, startDate: "2024-04-01", endDate: "2025-03-31", status: "active", type: "Supply" },
  { id: "CTR-002", vendorId: "VND-002", vendorName: "CleanPro Chemicals", title: "Cleaning Chemicals Supply", value: 680000, startDate: "2024-07-01", endDate: "2025-06-30", status: "active", type: "Supply" },
  { id: "CTR-003", vendorId: "VND-003", vendorName: "Premium Supplies Co", title: "Multi-category Supply Contract", value: 3000000, startDate: "2024-01-01", endDate: "2024-12-31", status: "pending_renewal", type: "Supply" },
  { id: "CTR-004", vendorId: "VND-004", vendorName: "TechKey Solutions", title: "PMS System Support", value: 500000, startDate: "2024-10-01", endDate: "2025-09-30", status: "active", type: "Service" },
  { id: "CTR-005", vendorId: "VND-005", vendorName: "Coffee Bean Traders", title: "Coffee & Beverage Supply", value: 1200000, startDate: "2024-06-01", endDate: "2025-05-31", status: "active", type: "Supply" },
  { id: "CTR-006", vendorId: "VND-006", vendorName: "Fresh Harvest Organics", title: "Organic Produce Supply", value: 1800000, startDate: "2024-01-01", endDate: "2024-12-31", status: "expired", type: "Supply" },
  { id: "CTR-007", vendorId: "VND-008", vendorName: "GreenScape Gardens", title: "Landscaping Maintenance", value: 800000, startDate: "2024-04-01", endDate: "2025-03-31", status: "active", type: "Service" },
  { id: "CTR-008", vendorId: "VND-010", vendorName: "Elegant Interiors", title: "Room Renovation Phase 2", value: 4500000, startDate: "2024-09-01", endDate: "2025-02-28", status: "active", type: "Project" },
  { id: "CTR-009", vendorId: "VND-007", vendorName: "SafeGuard Security", title: "Security Services Contract", value: 600000, startDate: "2023-04-01", endDate: "2024-03-31", status: "terminated", type: "Service" },
];

const FALLBACK_PERFORMANCE: PerformanceRecord[] = [
  { vendorId: "VND-001", vendorName: "Linen Solutions Pvt Ltd", category: "Linen & Laundry", overallRating: 4.5, deliveryScore: 92, qualityScore: 88, responsiveness: 85, pricing: 78, onTimeDelivery: 94, defectRate: 2.1, avgLeadTime: 3, trend: "up" },
  { vendorId: "VND-002", vendorName: "CleanPro Chemicals", category: "Housekeeping", overallRating: 4.2, deliveryScore: 88, qualityScore: 85, responsiveness: 80, pricing: 82, onTimeDelivery: 90, defectRate: 3.5, avgLeadTime: 2, trend: "stable" },
  { vendorId: "VND-003", vendorName: "Premium Supplies Co", category: "Multi-category", overallRating: 4.8, deliveryScore: 96, qualityScore: 95, responsiveness: 92, pricing: 80, onTimeDelivery: 98, defectRate: 0.8, avgLeadTime: 4, trend: "up" },
  { vendorId: "VND-004", vendorName: "TechKey Solutions", category: "Technology", overallRating: 3.9, deliveryScore: 75, qualityScore: 82, responsiveness: 68, pricing: 85, onTimeDelivery: 72, defectRate: 5.2, avgLeadTime: 7, trend: "down" },
  { vendorId: "VND-005", vendorName: "Coffee Bean Traders", category: "F&B", overallRating: 4.6, deliveryScore: 94, qualityScore: 90, responsiveness: 88, pricing: 76, onTimeDelivery: 96, defectRate: 1.5, avgLeadTime: 1, trend: "up" },
  { vendorId: "VND-006", vendorName: "Fresh Harvest Organics", category: "F&B", overallRating: 4.3, deliveryScore: 90, qualityScore: 92, responsiveness: 78, pricing: 70, onTimeDelivery: 88, defectRate: 2.8, avgLeadTime: 1, trend: "stable" },
  { vendorId: "VND-008", vendorName: "GreenScape Gardens", category: "Landscaping", overallRating: 4.1, deliveryScore: 86, qualityScore: 84, responsiveness: 82, pricing: 75, onTimeDelivery: 85, defectRate: 3.0, avgLeadTime: 2, trend: "stable" },
  { vendorId: "VND-010", vendorName: "Elegant Interiors", category: "Interior Design", overallRating: 4.7, deliveryScore: 93, qualityScore: 96, responsiveness: 90, pricing: 72, onTimeDelivery: 90, defectRate: 1.0, avgLeadTime: 14, trend: "up" },
];

// ─── STATUS META ───────────────────────────────────────────────────────

const VENDOR_STATUS_META: Record<string, { label: string; cls: string; icon: any }> = {
  active: { label: "Active", cls: "bg-[#DCFCE7] text-[#14532D] border-[#16A34A]", icon: CheckCircle2 },
  inactive: { label: "Inactive", cls: "bg-[#E5E7EB] text-[#374151] border-[#6B7280]", icon: XCircle },
  pending: { label: "Pending", cls: "bg-[#FEF3C7] text-[#78350F] border-[#D97706]", icon: Clock },
  blacklisted: { label: "Blacklisted", cls: "bg-[#FFE4E6] text-[#881337] border-[#DC2626]", icon: AlertCircle },
};

const CONTRACT_STATUS_META: Record<string, { label: string; cls: string }> = {
  active: { label: "Active", cls: "bg-[#DCFCE7] text-[#14532D] border-[#16A34A]" },
  expired: { label: "Expired", cls: "bg-[#E5E7EB] text-[#374151] border-[#6B7280]" },
  pending_renewal: { label: "Pending Renewal", cls: "bg-[#FEF3C7] text-[#78350F] border-[#D97706]" },
  terminated: { label: "Terminated", cls: "bg-[#FFE4E6] text-[#881337] border-[#DC2626]" },
};

// ─── RATING STARS ──────────────────────────────────────────────────────

function RatingStars({ rating, size = "sm" }: { rating: number; size?: "sm" | "md" }) {
  const fullStars = Math.floor(rating);
  const hasHalf = rating - fullStars >= 0.3;
  const emptyStars = 5 - fullStars - (hasHalf ? 1 : 0);
  const starClass = size === "md" ? "h-4 w-4" : "h-3 w-3";

  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: fullStars }).map((_, i) => (
        <Star key={`f-${i}`} className={cn(starClass, "fill-[#C9952A] text-[#C9952A]")} />
      ))}
      {hasHalf && (
        <div className="relative">
          <Star className={cn(starClass, "text-[#E5E7EB]")} />
          <div className="absolute inset-0 overflow-hidden w-1/2">
            <Star className={cn(starClass, "fill-[#C9952A] text-[#C9952A]")} />
          </div>
        </div>
      )}
      {Array.from({ length: emptyStars }).map((_, i) => (
        <Star key={`e-${i}`} className={cn(starClass, "text-[#E5E7EB]")} />
      ))}
      <span className={cn("font-medium text-[#C9952A] ml-1", size === "md" ? "text-sm" : "text-xs")}>{rating.toFixed(1)}</span>
    </div>
  );
}

// ─── PERFORMANCE BAR ───────────────────────────────────────────────────

function PerformanceBar({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-muted-foreground">{label}</span>
        <span className="text-[11px] font-semibold tabular-nums">{value}%</span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${value}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

// ─── SORT HELPERS ──────────────────────────────────────────────────────

type SortDir = "asc" | "desc";

function useSort<T>(data: T[], keyFn: (item: T) => any, initialDir: SortDir = "asc") {
  const [dir, setDir] = useState<SortDir>(initialDir);
  const sorted = [...data].sort((a, b) => {
    const va = keyFn(a);
    const vb = keyFn(b);
    if (typeof va === "number" && typeof vb === "number") return dir === "asc" ? va - vb : vb - va;
    return dir === "asc" ? String(va).localeCompare(String(vb)) : String(vb).localeCompare(String(va));
  });
  const toggle = () => setDir((d) => (d === "asc" ? "desc" : "asc"));
  return { sorted, dir, toggle };
}

// ─── DATA MAPPING HELPERS ──────────────────────────────────────────────

/** Convert API vendor + purchase-order aggregates into the display shape */
function toDisplayVendor(v: ApiVendor, orderCount: number, totalSpent: number): DisplayVendor {
  // API rating is 1-10; convert to 1-5 for star display
  const starRating = Math.round((v.rating / 2) * 10) / 10;
  const status: DisplayVendor["status"] = v.isActive ? "active" : "inactive";
  return {
    id: v.id,
    name: v.name,
    category: v.category ?? "General",
    contact: v.contactPerson ?? "N/A",
    phone: v.phone ?? "N/A",
    email: v.email ?? "N/A",
    rating: starRating,
    status,
    totalOrders: orderCount,
    totalSpent,
    joinedDate: v.createdAt ? new Date(v.createdAt).toISOString().split("T")[0] : "",
    _raw: v,
  };
}

/** Map purchase orders to contract-like display objects */
function ordersToContracts(orders: ApiPurchaseOrder[]): Contract[] {
  const statusMap: Record<string, Contract["status"]> = {
    approved: "active",
    submitted: "active",
    received: "active",
    draft: "pending_renewal",
    cancelled: "terminated",
  };
  return orders.map((o) => ({
    id: o.poNumber,
    vendorId: o.vendorId ?? "",
    vendorName: o.vendor?.name ?? "Unknown",
    title: o.notes ?? `PO ${o.poNumber}`,
    value: o.totalAmount,
    startDate: o.orderedAt ?? o.createdAt,
    endDate: o.receivedAt ?? o.createdAt,
    status: statusMap[o.status] ?? "active",
    type: "Supply",
  }));
}

/** Aggregate vendor-ratings into performance records per vendor */
function ratingsToPerformance(ratings: ApiVendorRating[]): PerformanceRecord[] {
  // Group by vendor
  const byVendor = new Map<string, ApiVendorRating[]>();
  for (const r of ratings) {
    const arr = byVendor.get(r.vendorId) ?? [];
    arr.push(r);
    byVendor.set(r.vendorId, arr);
  }

  const records: PerformanceRecord[] = [];
  for (const [vendorId, vendorRatings] of byVendor) {
    const first = vendorRatings[0];
    const n = vendorRatings.length;
    const avgQuality = vendorRatings.reduce((s, r) => s + r.qualityScore, 0) / n;
    const avgDelivery = vendorRatings.reduce((s, r) => s + r.deliveryScore, 0) / n;
    const avgPrice = vendorRatings.reduce((s, r) => s + r.priceScore, 0) / n;
    const avgCommunication = vendorRatings.reduce((s, r) => s + r.communicationScore, 0) / n;
    const avgOverall = vendorRatings.reduce((s, r) => s + r.overallScore, 0) / n;

    // Determine trend: compare most recent half vs older half
    let trend: PerformanceRecord["trend"] = "stable";
    if (n >= 4) {
      const half = Math.floor(n / 2);
      const recentAvg = vendorRatings.slice(0, half).reduce((s, r) => s + r.overallScore, 0) / half;
      const olderAvg = vendorRatings.slice(half).reduce((s, r) => s + r.overallScore, 0) / (n - half);
      if (recentAvg > olderAvg + 0.3) trend = "up";
      else if (recentAvg < olderAvg - 0.3) trend = "down";
    } else if (n >= 2) {
      const recent = vendorRatings[0].overallScore;
      const older = vendorRatings[n - 1].overallScore;
      if (recent > older + 0.3) trend = "up";
      else if (recent < older - 0.3) trend = "down";
    }

    // Convert 1-10 scores to 0-100 percentage for display bars
    records.push({
      vendorId,
      vendorName: first.vendor?.name ?? "Unknown",
      category: first.vendor?.category ?? "General",
      overallRating: Math.round((avgOverall / 2) * 10) / 10, // 1-5 scale
      deliveryScore: Math.round(avgDelivery * 10),   // 1-10 → 10-100
      qualityScore: Math.round(avgQuality * 10),
      responsiveness: Math.round(avgCommunication * 10),
      pricing: Math.round(avgPrice * 10),
      onTimeDelivery: Math.round(avgDelivery * 10),
      defectRate: Math.round(Math.max(0, 10 - avgQuality) * 10) / 10,
      avgLeadTime: Math.round(Math.max(1, 10 - avgDelivery)),
      trend,
    });
  }
  return records;
}

// ─── LOADING SKELETON ──────────────────────────────────────────────────

function SkeletonRow({ cols = 7 }: { cols?: number }) {
  return (
    <TableRow>
      {Array.from({ length: cols }).map((_, i) => (
        <TableCell key={i}>
          <div className="h-4 bg-muted animate-pulse rounded" />
        </TableCell>
      ))}
    </TableRow>
  );
}

// ─── MAIN COMPONENT ────────────────────────────────────────────────────

export function VendorsModule() {
  const { refreshTick } = useAppStore();
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("directory");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [contractStatusFilter, setContractStatusFilter] = useState("all");

  // ── Fetch real data from APIs
  const { data: apiVendors, loading: vendorsLoading, reload: reloadVendors } = useApi<ApiVendor[]>("/api/inventory/vendors");
  const { data: apiOrders, loading: ordersLoading } = useApi<ApiPurchaseOrder[]>("/api/purchasing/orders?limit=100");
  const { data: apiRatingsRaw, loading: ratingsLoading } = useApi<any>("/api/purchasing/vendor-ratings?limit=100");

  // Extract the ratings array from the paginated response
  const apiRatings: ApiVendorRating[] = Array.isArray(apiRatingsRaw) ? apiRatingsRaw : (apiRatingsRaw?.data ?? []);

  // Add Vendor dialog state
  const [addOpen, setAddOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newVendor, setNewVendor] = useState({
    name: "",
    category: "",
    contactPerson: "",
    phone: "",
    email: "",
    address: "",
    gstNumber: "",
    paymentTerms: "",
  });

  // ── Compute order aggregates per vendor
  const orderAggregates = new Map<string, { count: number; spent: number }>();
  if (apiOrders) {
    for (const o of apiOrders) {
      if (!o.vendorId) continue;
      const agg = orderAggregates.get(o.vendorId) ?? { count: 0, spent: 0 };
      agg.count += 1;
      if (o.status !== "cancelled") agg.spent += o.totalAmount;
      orderAggregates.set(o.vendorId, agg);
    }
  }

  // ── Map API vendors to display vendors
  const vendors: DisplayVendor[] = (apiVendors ?? []).map((v) => {
    const agg = orderAggregates.get(v.id) ?? { count: 0, spent: 0 };
    return toDisplayVendor(v, agg.count, agg.spent);
  });

  // ── Contracts: real from purchase orders, fallback to mock
  const contracts: Contract[] = apiOrders && apiOrders.length > 0
    ? ordersToContracts(apiOrders)
    : FALLBACK_CONTRACTS;

  // ── Performance: real from vendor ratings, fallback to mock
  const performance: PerformanceRecord[] = apiRatings && apiRatings.length > 0
    ? ratingsToPerformance(apiRatings)
    : FALLBACK_PERFORMANCE;

  // ── KPI values
  const totalVendors = vendors.length;
  const activeContracts = contracts.filter((c) => c.status === "active").length;
  const avgRating = vendors.length > 0 ? vendors.reduce((s, v) => s + v.rating, 0) / vendors.length : 0;
  const pendingPayments = 345000; // placeholder — would come from invoices API

  // ── Filtered vendors for directory
  const filteredVendors = vendors.filter((v) => {
    const matchSearch =
      v.name.toLowerCase().includes(search.toLowerCase()) ||
      v.contact.toLowerCase().includes(search.toLowerCase()) ||
      v.category.toLowerCase().includes(search.toLowerCase()) ||
      v.id.toLowerCase().includes(search.toLowerCase());
    const matchCategory = categoryFilter === "all" || v.category === categoryFilter;
    const matchStatus = statusFilter === "all" || v.status === statusFilter;
    return matchSearch && matchCategory && matchStatus;
  });

  // ── Filtered contracts
  const filteredContracts = contracts.filter((c) => {
    const matchSearch =
      c.vendorName.toLowerCase().includes(search.toLowerCase()) ||
      c.title.toLowerCase().includes(search.toLowerCase()) ||
      c.id.toLowerCase().includes(search.toLowerCase());
    const matchStatus = contractStatusFilter === "all" || c.status === contractStatusFilter;
    return matchSearch && matchStatus;
  });

  // ── Unique categories
  const categories = [...new Set(vendors.map((v) => v.category))].sort();

  // ── Add vendor handler — POST to API
  const handleAddVendor = useCallback(async () => {
    if (!newVendor.name || !newVendor.category) return;
    setSaving(true);
    try {
      await api("/api/inventory/vendors", {
        method: "POST",
        body: JSON.stringify({
          name: newVendor.name,
          category: newVendor.category,
          contactPerson: newVendor.contactPerson || null,
          phone: newVendor.phone || null,
          email: newVendor.email || null,
          address: newVendor.address || null,
          gstNumber: newVendor.gstNumber || null,
          paymentTerms: newVendor.paymentTerms || null,
          isActive: true,
          rating: 5,
        }),
      });
      toast.success(`Vendor "${newVendor.name}" created successfully`);
      setNewVendor({ name: "", category: "", contactPerson: "", phone: "", email: "", address: "", gstNumber: "", paymentTerms: "" });
      setAddOpen(false);
      reloadVendors();
    } catch (err: any) {
      toast.error(err.message || "Failed to create vendor");
    } finally {
      setSaving(false);
    }
  }, [newVendor, reloadVendors]);

  // ── Sort for vendor table
  const { sorted: sortedVendors, dir: vendorSortDir, toggle: toggleVendorSort } = useSort(filteredVendors, (v) => v.name);

  // ── Loading flag
  const isLoading = vendorsLoading && vendors.length === 0;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-display font-bold text-foreground flex items-center gap-2">
            <Building2 className="h-5 w-5 text-navy" /> Vendor Management
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">Vendor directory, contracts & performance tracking</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input placeholder="Search vendors..." className="pl-8 h-9 w-48" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Button variant="outline" size="sm" className="h-9"><Download className="h-3.5 w-3.5 mr-1" /> Export</Button>
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button className="bg-[#1B3A6B] hover:bg-[#1B3A6B]/90 text-white h-9"><Plus className="h-4 w-4 mr-1" /> Add Vendor</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-navy" /> Add New Vendor
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Vendor Name *</label>
                  <Input placeholder="Enter vendor name" value={newVendor.name} onChange={(e) => setNewVendor({ ...newVendor, name: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Category *</label>
                  <Select value={newVendor.category} onValueChange={(val) => setNewVendor({ ...newVendor, category: val })}>
                    <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                    <SelectContent>
                      {["F&B", "Housekeeping", "Linen & Laundry", "Technology", "Security", "Engineering", "Landscaping", "Interior Design", "Multi-category", "Other"].map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Contact Person</label>
                    <Input placeholder="Name" value={newVendor.contactPerson} onChange={(e) => setNewVendor({ ...newVendor, contactPerson: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Phone</label>
                    <Input placeholder="+91 XXXXX XXXXX" value={newVendor.phone} onChange={(e) => setNewVendor({ ...newVendor, phone: e.target.value })} />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Email</label>
                  <Input placeholder="email@vendor.com" type="email" value={newVendor.email} onChange={(e) => setNewVendor({ ...newVendor, email: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Address</label>
                  <Input placeholder="Vendor address" value={newVendor.address} onChange={(e) => setNewVendor({ ...newVendor, address: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">GST Number</label>
                    <Input placeholder="22AAAAA0000A1Z5" value={newVendor.gstNumber} onChange={(e) => setNewVendor({ ...newVendor, gstNumber: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Payment Terms</label>
                    <Input placeholder="Net 30" value={newVendor.paymentTerms} onChange={(e) => setNewVendor({ ...newVendor, paymentTerms: e.target.value })} />
                  </div>
                </div>
              </div>
              <DialogFooter className="gap-2">
                <DialogClose asChild>
                  <Button variant="outline" size="sm">Cancel</Button>
                </DialogClose>
                <Button size="sm" className="bg-[#1B3A6B] hover:bg-[#1B3A6B]/90 text-white" onClick={handleAddVendor} disabled={!newVendor.name || !newVendor.category || saving}>
                  {saving ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Plus className="h-3.5 w-3.5 mr-1" />} Add Vendor
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Total Vendors" value={vendorsLoading ? "—" : totalVendors} icon={Users} accent="navy" delta={5} deltaLabel="vs last quarter" />
        <KpiCard label="Active Contracts" value={ordersLoading ? "—" : activeContracts} icon={FileSignature} accent="gold" />
        <KpiCard label="Avg Rating" value={vendorsLoading ? "—" : avgRating.toFixed(1)} icon={Star} accent="success" delta={3} deltaLabel="vs last quarter" />
        <KpiCard label="Pending Payments" value={fmtINR(pendingPayments)} icon={IndianRupee} accent="warning" />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="directory" className="text-xs">Vendor Directory</TabsTrigger>
          <TabsTrigger value="contracts" className="text-xs">Contracts</TabsTrigger>
          <TabsTrigger value="performance" className="text-xs">Performance</TabsTrigger>
        </TabsList>

        {/* ── Vendor Directory Tab ── */}
        <TabsContent value="directory" className="mt-4">
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <Filter className="h-3.5 w-3.5 text-muted-foreground" />
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="h-8 w-40 text-xs"><SelectValue placeholder="Category" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-8 w-36 text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="blacklisted">Blacklisted</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-xs text-muted-foreground ml-auto">{filteredVendors.length} vendor(s)</span>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-[11px]">
                      <button className="inline-flex items-center gap-1 hover:text-foreground" onClick={toggleVendorSort}>
                        Vendor <ArrowUpDown className="h-3 w-3" />
                      </button>
                    </TableHead>
                    <TableHead className="text-[11px]">Category</TableHead>
                    <TableHead className="text-[11px]">Contact</TableHead>
                    <TableHead className="text-[11px]">Phone</TableHead>
                    <TableHead className="text-[11px]">Email</TableHead>
                    <TableHead className="text-[11px]">Rating</TableHead>
                    <TableHead className="text-[11px]">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} cols={7} />)
                  ) : sortedVendors.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground text-sm">No vendors found matching your criteria.</TableCell>
                    </TableRow>
                  ) : (
                    sortedVendors.map((v) => {
                      const st = VENDOR_STATUS_META[v.status] ?? VENDOR_STATUS_META.active;
                      return (
                        <TableRow key={v.id} className="hover:bg-muted/50 cursor-pointer">
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#1B3A6B]/10 text-[#1B3A6B] font-bold text-[10px] shrink-0">
                                {v.name.split(" ").slice(0, 2).map((n) => n[0]).join("")}
                              </div>
                              <div>
                                <p className="text-xs font-medium">{v.name}</p>
                                <p className="text-[10px] text-muted-foreground">{v.id.slice(0, 8)}… · {v.totalOrders} orders · {fmtINR(v.totalSpent)}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-[10px] font-normal">{v.category}</Badge>
                          </TableCell>
                          <TableCell className="text-xs">{v.contact}</TableCell>
                          <TableCell className="text-xs">
                            <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3 text-muted-foreground" />{v.phone}</span>
                          </TableCell>
                          <TableCell className="text-xs">
                            <span className="inline-flex items-center gap-1"><Mail className="h-3 w-3 text-muted-foreground" />{v.email}</span>
                          </TableCell>
                          <TableCell><RatingStars rating={v.rating} /></TableCell>
                          <TableCell>
                            <span className={cn("inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-medium", st.cls)}>
                              <st.icon className="h-3 w-3" />{st.label}
                            </span>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Contracts Tab ── */}
        <TabsContent value="contracts" className="mt-4">
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <Filter className="h-3.5 w-3.5 text-muted-foreground" />
            <Select value={contractStatusFilter} onValueChange={setContractStatusFilter}>
              <SelectTrigger className="h-8 w-40 text-xs"><SelectValue placeholder="Contract Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
                <SelectItem value="pending_renewal">Pending Renewal</SelectItem>
                <SelectItem value="terminated">Terminated</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-xs text-muted-foreground ml-auto">{filteredContracts.length} contract(s) · Total value: {fmtINR(filteredContracts.reduce((s, c) => s + c.value, 0))}</span>
          </div>

          {/* Contract summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            {[
              { label: "Active", count: contracts.filter((c) => c.status === "active").length, color: "#16A34A" },
              { label: "Pending Renewal", count: contracts.filter((c) => c.status === "pending_renewal").length, color: "#D97706" },
              { label: "Expired", count: contracts.filter((c) => c.status === "expired").length, color: "#6B7280" },
              { label: "Terminated", count: contracts.filter((c) => c.status === "terminated").length, color: "#DC2626" },
            ].map((cs) => (
              <div key={cs.label} className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card">
                <div className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `${cs.color}15` }}>
                  <FileSignature className="h-4 w-4" style={{ color: cs.color }} />
                </div>
                <div>
                  <p className="text-lg font-bold font-display tabular-nums">{cs.count}</p>
                  <p className="text-[10px] text-muted-foreground">{cs.label}</p>
                </div>
              </div>
            ))}
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-[11px]">Contract #</TableHead>
                    <TableHead className="text-[11px]">Vendor</TableHead>
                    <TableHead className="text-[11px]">Title</TableHead>
                    <TableHead className="text-[11px]">Type</TableHead>
                    <TableHead className="text-[11px] text-right">Value</TableHead>
                    <TableHead className="text-[11px]">Start Date</TableHead>
                    <TableHead className="text-[11px]">End Date</TableHead>
                    <TableHead className="text-[11px]">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ordersLoading ? (
                    Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} cols={8} />)
                  ) : filteredContracts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground text-sm">No contracts found.</TableCell>
                    </TableRow>
                  ) : (
                    filteredContracts.map((c) => {
                      const st = CONTRACT_STATUS_META[c.status] ?? CONTRACT_STATUS_META.active;
                      const daysLeft = Math.ceil((new Date(c.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                      return (
                        <TableRow key={c.id} className="hover:bg-muted/50 cursor-pointer">
                          <TableCell className="text-xs font-mono text-muted-foreground">{c.id}</TableCell>
                          <TableCell className="text-xs font-medium">{c.vendorName}</TableCell>
                          <TableCell className="text-xs">{c.title}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-[10px] font-normal">{c.type}</Badge>
                          </TableCell>
                          <TableCell className="text-xs text-right tabular-nums font-medium">{fmtINR(c.value)}</TableCell>
                          <TableCell className="text-xs">{fmtDate(c.startDate)}</TableCell>
                          <TableCell className="text-xs">
                            <div>
                              <span>{fmtDate(c.endDate)}</span>
                              {c.status === "active" && daysLeft <= 90 && daysLeft > 0 && (
                                <span className="block text-[10px] text-[#D97706]">{daysLeft} days left</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className={cn("inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-medium", st.cls)}>{st.label}</span>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Performance Tab ── */}
        <TabsContent value="performance" className="mt-4">
          {/* Performance overview cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <div className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card">
              <div className="h-8 w-8 rounded-lg flex items-center justify-center bg-[#1B3A6B]/10 shrink-0">
                <Truck className="h-4 w-4 text-[#1B3A6B]" />
              </div>
              <div>
                <p className="text-lg font-bold font-display tabular-nums">
                  {ratingsLoading ? "—" : Math.round(performance.reduce((s, p) => s + p.onTimeDelivery, 0) / (performance.length || 1))}%
                </p>
                <p className="text-[10px] text-muted-foreground">Avg On-Time</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card">
              <div className="h-8 w-8 rounded-lg flex items-center justify-center bg-[#C9952A]/10 shrink-0">
                <Shield className="h-4 w-4 text-[#C9952A]" />
              </div>
              <div>
                <p className="text-lg font-bold font-display tabular-nums">
                  {ratingsLoading ? "—" : (performance.reduce((s, p) => s + p.defectRate, 0) / (performance.length || 1)).toFixed(1)}%
                </p>
                <p className="text-[10px] text-muted-foreground">Avg Defect Rate</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card">
              <div className="h-8 w-8 rounded-lg flex items-center justify-center bg-[#16A34A]/10 shrink-0">
                <TrendingUp className="h-4 w-4 text-[#16A34A]" />
              </div>
              <div>
                <p className="text-lg font-bold font-display tabular-nums">{performance.filter((p) => p.trend === "up").length}</p>
                <p className="text-[10px] text-muted-foreground">Improving</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card">
              <div className="h-8 w-8 rounded-lg flex items-center justify-center bg-[#DC2626]/10 shrink-0">
                <TrendingDown className="h-4 w-4 text-[#DC2626]" />
              </div>
              <div>
                <p className="text-lg font-bold font-display tabular-nums">{performance.filter((p) => p.trend === "down").length}</p>
                <p className="text-[10px] text-muted-foreground">Declining</p>
              </div>
            </div>
          </div>

          {/* Performance detail cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {ratingsLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-4 space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 bg-muted animate-pulse rounded-lg" />
                      <div className="space-y-2 flex-1">
                        <div className="h-4 bg-muted animate-pulse rounded w-32" />
                        <div className="h-3 bg-muted animate-pulse rounded w-20" />
                      </div>
                    </div>
                    <div className="space-y-3">
                      {Array.from({ length: 4 }).map((_, j) => (
                        <div key={j} className="h-6 bg-muted animate-pulse rounded" />
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : performance.length === 0 ? (
              <div className="col-span-full text-center py-8 text-muted-foreground text-sm">No performance data available.</div>
            ) : (
              performance.map((p, idx) => {
                const colorIdx = idx % CHART_COLORS.length;
                const accentColor = CHART_COLORS[colorIdx];
                const trendIcon = p.trend === "up" ? TrendingUp : p.trend === "down" ? TrendingDown : null;
                const trendColor = p.trend === "up" ? "#16A34A" : p.trend === "down" ? "#DC2626" : "#6B7280";

                return (
                  <Card key={p.vendorId} className="hover:shadow-card-lg transition-shadow">
                    <CardContent className="p-4 space-y-4">
                      {/* Header */}
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg shrink-0" style={{ backgroundColor: `${accentColor}15` }}>
                            <Building2 className="h-5 w-5" style={{ color: accentColor }} />
                          </div>
                          <div>
                            <p className="text-sm font-semibold">{p.vendorName}</p>
                            <p className="text-xs text-muted-foreground">{p.category}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {trendIcon && <trendIcon className="h-4 w-4" style={{ color: trendColor }} />}
                          <RatingStars rating={p.overallRating} size="md" />
                        </div>
                      </div>

                      {/* Performance bars */}
                      <div className="space-y-3">
                        <PerformanceBar value={p.deliveryScore} label="Delivery" color={CHART_COLORS[0]} />
                        <PerformanceBar value={p.qualityScore} label="Quality" color={CHART_COLORS[1]} />
                        <PerformanceBar value={p.responsiveness} label="Responsiveness" color={CHART_COLORS[2]} />
                        <PerformanceBar value={p.pricing} label="Pricing" color={CHART_COLORS[3]} />
                      </div>

                      {/* Metrics row */}
                      <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border">
                        <div className="text-center">
                          <p className="text-sm font-bold tabular-nums" style={{ color: p.onTimeDelivery >= 90 ? "#16A34A" : p.onTimeDelivery >= 75 ? "#D97706" : "#DC2626" }}>{p.onTimeDelivery}%</p>
                          <p className="text-[10px] text-muted-foreground">On-Time</p>
                        </div>
                        <div className="text-center">
                          <p className="text-sm font-bold tabular-nums" style={{ color: p.defectRate <= 2 ? "#16A34A" : p.defectRate <= 4 ? "#D97706" : "#DC2626" }}>{p.defectRate}%</p>
                          <p className="text-[10px] text-muted-foreground">Defect Rate</p>
                        </div>
                        <div className="text-center">
                          <p className="text-sm font-bold tabular-nums">{p.avgLeadTime}d</p>
                          <p className="text-[10px] text-muted-foreground">Avg Lead</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
