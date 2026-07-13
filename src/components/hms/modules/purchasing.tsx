// ARIA HMS — Purchasing / Procurement Module (5 tabs: Purchase Orders, Amenity Mgmt, Stock Transactions, Season Config, Inspections)
"use client";

import { useState, useMemo, useCallback } from "react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/lib/store";
import { useApi, api } from "@/lib/api";
import { KpiCard, fmtINR, fmtDate, fmtDateTime } from "../shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  ShoppingCart, AlertTriangle, IndianRupee, ClipboardCheck,
  Plus, Search, ArrowUpRight, ArrowDownRight,
  ClipboardList, CalendarDays, Sun, Snowflake, CloudRain,
  CheckCircle2, Clock, XCircle, Eye,
  ArrowRightLeft, TrendingUp, Wrench, Bed, Bath, Coffee, Tv, Shield, PenTool, Sofa,
  ChevronDown, ChevronUp, FileText, Send, ThumbsUp,
  Inbox, Palette, Thermometer, Play, Loader2,
} from "lucide-react";

// ─── TYPES ──────────────────────────────────────────────────────────

const CHART_COLORS = ["#1B3A6B", "#C9952A", "#16A34A", "#0369A1", "#D97706", "#7C3AED"];

type POStatus = "draft" | "submitted" | "approved" | "received" | "cancelled";
type AmenityCategory =
  | "bedroom_linen"
  | "bathroom_linen"
  | "minibar"
  | "kitchen"
  | "bathroom_amenity"
  | "electronics"
  | "safety"
  | "stationery"
  | "living_room";
type Condition = "new" | "good" | "fair" | "poor" | "damaged" | "needs_replacement";
type TransactionType =
  | "purchase"
  | "issued_to_room"
  | "returned_from_room"
  | "damaged"
  | "lost"
  | "inventory_adjustment"
  | "season_stock_up"
  | "transfer";
type InspectionPriority = "low" | "normal" | "high" | "urgent";
type InspectionStatus = "pending" | "in_progress" | "completed";

interface PurchaseOrder {
  id: string;
  poNumber: string;
  vendorId: string | null;
  vendor: { id: string; name: string; category: string | null; rating: number } | null;
  status: POStatus;
  totalAmount: number;
  notes: string | null;
  createdAt: string;
  orderedAt: string | null;
  approvedById: string | null;
  receivedAt: string | null;
}

interface AmenityItem {
  id: string;
  name: string;
  category: AmenityCategory;
  quantity: number;
  issuedQty: number;
  availableQty: number;
  parLevel: number;
  maxStock: number;
  reorderQty: number;
  seasonBuffer: number;
  condition: Condition;
  lifecycleDays: number;
  unit: string;
  unitCost: number;
  purchaseDate: string | null;
  lastInventory: string | null;
  vendor: { id: string; name: string; rating: number } | null;
  roomType: { id: string; name: string; code: string } | null;
  isBelowPar: boolean;
  location: string;
  isConsumable: boolean;
  minPerRoom: number;
  sku: string | null;
  subCategory: string | null;
  isActive: boolean;
  _count?: { stockTransactions: number; inspections: number };
}

interface StockTransaction {
  id: string;
  amenityItemId: string;
  transactionType: TransactionType;
  quantity: number;
  previousQty: number;
  newQty: number;
  notes: string | null;
  performedBy: string | null;
  costPerUnit: number;
  totalCost: number;
  referenceId: string | null;
  referenceType: string | null;
  createdAt: string;
  amenityItem: { id: string; name: string; category: string; unit: string; location: string };
}

interface SeasonConfig {
  id: string;
  name: string;
  category: AmenityCategory;
  multiplier: number;
  startDate: string;
  endDate: string;
  autoReorder: boolean;
  isActive: boolean;
}

interface InspectionRecord {
  id: string;
  amenityItemId: string;
  inspectedBy: string;
  condition: Condition;
  notes: string | null;
  actionRequired: string | null;
  priority: InspectionPriority;
  status: InspectionStatus;
  completedAt: string | null;
  roomId: string | null;
  amenityItem: { id: string; name: string; category: string; condition: string; location: string };
  createdAt: string;
}

interface Vendor {
  id: string;
  name: string;
  category: string | null;
  rating: number;
  paymentTerms: string | null;
  email: string | null;
  phone: string | null;
  isActive: boolean;
}

// ─── CATEGORY META ──────────────────────────────────────────────────

const CATEGORY_META: Record<AmenityCategory, { label: string; icon: any; color: string }> = {
  bedroom_linen: { label: "Bedroom Linen", icon: Bed, color: "#1B3A6B" },
  bathroom_linen: { label: "Bathroom Linen", icon: Bath, color: "#C9952A" },
  minibar: { label: "Mini Bar Items", icon: Coffee, color: "#D97706" },
  kitchen: { label: "Kitchen Equipment", icon: Thermometer, color: "#16A34A" },
  bathroom_amenity: { label: "Bathroom Amenities", icon: Palette, color: "#0369A1" },
  electronics: { label: "Electronics", icon: Tv, color: "#7C3AED" },
  safety: { label: "Safety Items", icon: Shield, color: "#B45309" },
  stationery: { label: "Stationery", icon: PenTool, color: "#6B7280" },
  living_room: { label: "Living Room", icon: Sofa, color: "#1B3A6B" },
};

const CATEGORY_DESCRIPTIONS: Record<AmenityCategory, string> = {
  bedroom_linen: "Bed sheets, pillow covers, blankets, duvets",
  bathroom_linen: "Bath towels, face towels, hand towels, bath mats",
  minibar: "Chocolates, chips, drinks, water",
  kitchen: "Kettles, irons, trays",
  bathroom_amenity: "Soap, shampoo, conditioner, lotion, shower cap",
  electronics: "TV remote, hair dryer, safe",
  safety: "Fire extinguisher, flashlight, first aid kit",
  stationery: "Notepad, pen, envelope, folder",
  living_room: "Cushion covers, throws, magazines",
};

const PO_STATUS_META: Record<POStatus, { label: string; cls: string; icon: any }> = {
  draft: { label: "Draft", cls: "bg-[#E5E7EB] text-[#374151] border-[#6B7280]", icon: FileText },
  submitted: { label: "Submitted", cls: "bg-[#FEF3C7] text-[#78350F] border-[#D97706]", icon: Send },
  approved: { label: "Approved", cls: "bg-[#DCFCE7] text-[#14532D] border-[#16A34A]", icon: ThumbsUp },
  received: { label: "Received", cls: "bg-[#DBEAFE] text-[#1B3A6B] border-[#0369A1]", icon: Inbox },
  cancelled: { label: "Cancelled", cls: "bg-[#FEE2E2] text-[#7F1D1D] border-[#991B1B]", icon: XCircle },
};

const CONDITION_META: Record<string, { label: string; cls: string }> = {
  new: { label: "New", cls: "bg-[#DCFCE7] text-[#14532D] border-[#16A34A]" },
  good: { label: "Good", cls: "bg-[#DBEAFE] text-[#1B3A6B] border-[#0369A1]" },
  fair: { label: "Fair", cls: "bg-[#FEF3C7] text-[#78350F] border-[#D97706]" },
  poor: { label: "Poor", cls: "bg-[#FEE2E2] text-[#7F1D1D] border-[#991B1B]" },
  damaged: { label: "Damaged", cls: "bg-[#FEE2E2] text-[#7F1D1D] border-[#991B1B]" },
  needs_replacement: { label: "Needs Replacement", cls: "bg-[#FEE2E2] text-[#7F1D1D] border-[#991B1B]" },
};

const TRANSACTION_TYPE_META: Record<TransactionType, { label: string; cls: string; icon: any; direction: "in" | "out" | "neutral" }> = {
  purchase: { label: "Purchase", cls: "text-[#16A34A]", icon: ArrowDownRight, direction: "in" },
  issued_to_room: { label: "Issued to Room", cls: "text-[#0369A1]", icon: ArrowUpRight, direction: "out" },
  returned_from_room: { label: "Returned", cls: "text-[#7C3AED]", icon: ArrowDownRight, direction: "in" },
  damaged: { label: "Damaged", cls: "text-[#DC2626]", icon: XCircle, direction: "out" },
  lost: { label: "Lost", cls: "text-[#991B1B]", icon: XCircle, direction: "out" },
  inventory_adjustment: { label: "Adjustment", cls: "text-[#D97706]", icon: ArrowRightLeft, direction: "neutral" },
  season_stock_up: { label: "Season Stock Up", cls: "text-[#7C3AED]", icon: TrendingUp, direction: "in" },
  transfer: { label: "Transfer", cls: "text-[#0369A1]", icon: ArrowRightLeft, direction: "neutral" },
};

const PRIORITY_META: Record<string, { label: string; cls: string }> = {
  low: { label: "Low", cls: "bg-[#E5E7EB] text-[#374151] border-[#6B7280]" },
  normal: { label: "Normal", cls: "bg-[#FEF3C7] text-[#78350F] border-[#D97706]" },
  high: { label: "High", cls: "bg-[#FEE2E2] text-[#7F1D1D] border-[#991B1B]" },
  urgent: { label: "Urgent", cls: "bg-[#FEE2E2] text-[#7F1D1D] border-[#991B1B]" },
};

const INSPECTION_STATUS_META: Record<InspectionStatus, { label: string; cls: string }> = {
  pending: { label: "Pending", cls: "bg-[#FEF3C7] text-[#78350F] border-[#D97706]" },
  in_progress: { label: "In Progress", cls: "bg-[#DBEAFE] text-[#1B3A6B] border-[#0369A1]" },
  completed: { label: "Completed", cls: "bg-[#DCFCE7] text-[#14532D] border-[#16A34A]" },
};

// ─── HELPER FUNCTIONS ───────────────────────────────────────────────

function getActiveSeasonMultiplier(category: AmenityCategory, seasons: SeasonConfig[]): number {
  const activeSeasons = seasons.filter((s) => s.category === category && s.isActive);
  if (activeSeasons.length === 0) return 1;
  return Math.max(...activeSeasons.map((s) => s.multiplier));
}

function calculateAdjustedPAR(item: AmenityItem, seasons: SeasonConfig[]): number {
  const multiplier = getActiveSeasonMultiplier(item.category, seasons);
  return Math.ceil(item.parLevel * multiplier);
}

function calculateReorderNeeded(item: AmenityItem, seasons: SeasonConfig[]): number {
  const adjustedPAR = calculateAdjustedPAR(item, seasons);
  if (item.quantity >= adjustedPAR) return 0;
  const needed = adjustedPAR - item.quantity;
  return Math.ceil(needed / item.reorderQty) * item.reorderQty;
}

function isBelowPAR(item: AmenityItem, seasons: SeasonConfig[]): boolean {
  return item.quantity < calculateAdjustedPAR(item, seasons);
}

function stockStatus(item: AmenityItem, seasons: SeasonConfig[]): "ok" | "low" | "critical" {
  const adjustedPAR = calculateAdjustedPAR(item, seasons);
  if (item.quantity >= adjustedPAR) return "ok";
  if (item.quantity >= adjustedPAR * 0.5) return "low";
  return "critical";
}

// ─── SKELETON HELPERS ───────────────────────────────────────────────

function KpiSkeleton() {
  return <Skeleton className="h-[88px] rounded-xl" />;
}

function TableSkeleton({ rows = 5, cols = 7 }: { rows?: number; cols?: number }) {
  return (
    <div className="space-y-2 p-4">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4">
          {Array.from({ length: cols }).map((_, j) => (
            <Skeleton key={j} className="h-8 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

// ─── MAIN COMPONENT ─────────────────────────────────────────────────

export function PurchasingModule() {
  const { refreshTick } = useAppStore();
  const [activeTab, setActiveTab] = useState("purchase-orders");
  const [search, setSearch] = useState("");
  const [poSearch, setPoSearch] = useState("");
  const [poStatusFilter, setPoStatusFilter] = useState<string>("all");
  const [amenityCategory, setAmenityCategory] = useState<string>("all");
  const [showBelowParOnly, setShowBelowParOnly] = useState(false);
  const [expandedCategory, setExpandedCategory] = useState<string | null>("bedroom_linen");
  const [txTypeFilter, setTxTypeFilter] = useState<string>("all");
  const [txDateFrom, setTxDateFrom] = useState("");
  const [txDateTo, setTxDateTo] = useState("");
  const [showNewPO, setShowNewPO] = useState(false);
  const [showNewInspection, setShowNewInspection] = useState(false);
  const [showPODetail, setShowPODetail] = useState<PurchaseOrder | null>(null);
  const [showInspectionDetail, setShowInspectionDetail] = useState<InspectionRecord | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [updatingPO, setUpdatingPO] = useState<string | null>(null);
  const [updatingInspection, setUpdatingInspection] = useState<string | null>(null);

  // ─── API Data Fetching ───
  const { data: purchaseOrders = [], loading: poLoading, reload: reloadPOs } = useApi<PurchaseOrder[]>("/api/purchasing/orders?limit=100", [refreshTick]);
  const { data: amenities = [], loading: amenityLoading, reload: reloadAmenities } = useApi<AmenityItem[]>("/api/purchasing/amenities?limit=100", [refreshTick]);
  const { data: transactions = [], loading: txLoading, reload: reloadTx } = useApi<StockTransaction[]>("/api/purchasing/stock-transactions?limit=100", [refreshTick]);
  const { data: seasons = [], loading: seasonLoading, reload: reloadSeasons } = useApi<SeasonConfig[]>("/api/purchasing/season-config", [refreshTick]);
  const { data: inspections = [], loading: inspectionLoading, reload: reloadInspections } = useApi<InspectionRecord[]>("/api/purchasing/inspections?limit=100", [refreshTick]);
  const { data: vendors = [] } = useApi<Vendor[]>("/api/inventory/vendors");

  // ─── New PO Form State ───
  const [newPOVendorId, setNewPOVendorId] = useState("");
  const [newPONotes, setNewPONotes] = useState("");
  const [newPOAmount, setNewPOAmount] = useState("");

  // ─── New Inspection Form State ───
  const [newInspItemId, setNewInspItemId] = useState("");
  const [newInspCondition, setNewInspCondition] = useState<string>("");
  const [newInspPriority, setNewInspPriority] = useState<string>("");
  const [newInspDepartment, setNewInspDepartment] = useState<string>("");
  const [newInspAction, setNewInspAction] = useState("");
  const [newInspNotes, setNewInspNotes] = useState("");
  const [newInspInspectedBy, setNewInspInspectedBy] = useState("");

  // ─── Computed values ───
  const totalPOs = purchaseOrders.length;
  const pendingApprovals = purchaseOrders.filter((po) => po.status === "submitted").length;
  const itemsBelowPAR = amenities.filter((a) => isBelowPAR(a, seasons)).length;
  const activeSeasonCount = seasons.filter((s) => s.isActive).length;

  const filteredPOs = useMemo(() => {
    return purchaseOrders.filter((po) => {
      const vendorName = po.vendor?.name || "";
      const matchesSearch = po.poNumber.toLowerCase().includes(poSearch.toLowerCase()) ||
        vendorName.toLowerCase().includes(poSearch.toLowerCase());
      const matchesStatus = poStatusFilter === "all" || po.status === poStatusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [purchaseOrders, poSearch, poStatusFilter]);

  const filteredAmenities = useMemo(() => {
    return amenities.filter((a) => {
      const matchesCategory = amenityCategory === "all" || a.category === amenityCategory;
      const matchesBelowPAR = !showBelowParOnly || isBelowPAR(a, seasons);
      const matchesSearch = a.name.toLowerCase().includes(search.toLowerCase());
      return matchesCategory && matchesBelowPAR && matchesSearch;
    });
  }, [amenities, amenityCategory, showBelowParOnly, search, seasons]);

  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      const matchesType = txTypeFilter === "all" || tx.transactionType === txTypeFilter;
      const matchesFrom = !txDateFrom || new Date(tx.createdAt) >= new Date(txDateFrom);
      const matchesTo = !txDateTo || new Date(tx.createdAt) <= new Date(txDateTo + "T23:59:59");
      return matchesType && matchesFrom && matchesTo;
    });
  }, [transactions, txTypeFilter, txDateFrom, txDateTo]);

  const totalPOValue = purchaseOrders.reduce((sum, po) => sum + po.totalAmount, 0);
  const totalReorderValue = amenities.reduce((sum, a) => {
    const reorder = calculateReorderNeeded(a, seasons);
    return sum + (reorder * a.unitCost);
  }, 0);

  // ─── Group amenities by category ───
  const amenitiesByCategory = useMemo(() => {
    const groups: Record<string, AmenityItem[]> = {};
    filteredAmenities.forEach((a) => {
      if (!groups[a.category]) groups[a.category] = [];
      groups[a.category].push(a);
    });
    return groups;
  }, [filteredAmenities]);

  // ─── PO Status Change Handler ───
  const handlePOStatusChange = useCallback(async (poId: string, newStatus: POStatus) => {
    setUpdatingPO(poId);
    try {
      await api(`/api/purchasing/orders/${poId}`, {
        method: "PUT",
        body: JSON.stringify({ status: newStatus }),
      });
      toast.success(`PO ${newStatus === "submitted" ? "submitted" : newStatus === "approved" ? "approved" : newStatus === "received" ? "marked received" : "cancelled"} successfully`);
      reloadPOs();
    } catch (err: any) {
      toast.error(err.message || "Failed to update PO status");
    } finally {
      setUpdatingPO(null);
    }
  }, [reloadPOs]);

  // ─── Create PO Handler ───
  const handleCreatePO = useCallback(async (status: "draft" | "submitted") => {
    if (!newPOVendorId) {
      toast.error("Please select a vendor");
      return;
    }
    if (!newPOAmount || Number(newPOAmount) <= 0) {
      toast.error("Please enter a valid total amount");
      return;
    }
    setSubmitting(true);
    try {
      await api("/api/purchasing/orders", {
        method: "POST",
        body: JSON.stringify({
          vendorId: newPOVendorId,
          totalAmount: Number(newPOAmount),
          status,
          notes: newPONotes || undefined,
        }),
      });
      toast.success(status === "draft" ? "PO saved as draft" : "PO submitted for approval");
      setShowNewPO(false);
      resetNewPOForm();
      reloadPOs();
    } catch (err: any) {
      toast.error(err.message || "Failed to create PO");
    } finally {
      setSubmitting(false);
    }
  }, [newPOVendorId, newPOAmount, newPONotes, reloadPOs]);

  const resetNewPOForm = () => {
    setNewPOVendorId("");
    setNewPONotes("");
    setNewPOAmount("");
  };

  // ─── Create Inspection Handler ───
  const handleCreateInspection = useCallback(async () => {
    if (!newInspItemId) {
      toast.error("Please select an amenity item");
      return;
    }
    if (!newInspCondition) {
      toast.error("Please select a condition");
      return;
    }
    if (!newInspInspectedBy) {
      toast.error("Please enter the inspector name");
      return;
    }
    setSubmitting(true);
    try {
      await api("/api/purchasing/inspections", {
        method: "POST",
        body: JSON.stringify({
          amenityItemId: newInspItemId,
          condition: newInspCondition,
          inspectedBy: newInspInspectedBy,
          priority: newInspPriority || "normal",
          actionRequired: newInspAction || undefined,
          notes: newInspNotes || undefined,
          status: "pending",
        }),
      });
      toast.success("Inspection logged successfully");
      setShowNewInspection(false);
      resetNewInspectionForm();
      reloadInspections();
      reloadAmenities();
    } catch (err: any) {
      toast.error(err.message || "Failed to log inspection");
    } finally {
      setSubmitting(false);
    }
  }, [newInspItemId, newInspCondition, newInspInspectedBy, newInspPriority, newInspAction, newInspNotes, reloadInspections, reloadAmenities]);

  const resetNewInspectionForm = () => {
    setNewInspItemId("");
    setNewInspCondition("");
    setNewInspPriority("");
    setNewInspDepartment("");
    setNewInspAction("");
    setNewInspNotes("");
    setNewInspInspectedBy("");
  };

  // ─── Inspection Status Change Handler ───
  const handleInspectionStatusChange = useCallback(async (inspId: string, newStatus: InspectionStatus) => {
    setUpdatingInspection(inspId);
    try {
      await api(`/api/purchasing/inspections/${inspId}`, {
        method: "PUT",
        body: JSON.stringify({ status: newStatus }),
      });
      toast.success(`Inspection ${newStatus === "in_progress" ? "started" : "completed"} successfully`);
      reloadInspections();
      // Also update the detail view if open
      setShowInspectionDetail((prev) => {
        if (prev && prev.id === inspId) {
          return { ...prev, status: newStatus, completedAt: newStatus === "completed" ? new Date().toISOString() : prev.completedAt };
        }
        return prev;
      });
    } catch (err: any) {
      toast.error(err.message || "Failed to update inspection status");
    } finally {
      setUpdatingInspection(null);
    }
  }, [reloadInspections]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-display font-bold text-foreground flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-navy" /> Purchasing &amp; Procurement
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">Purchase orders, amenity management &amp; stock tracking</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input placeholder="Search..." className="pl-8 h-9 w-48" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Button className="bg-navy hover:bg-navy-light text-white h-9" onClick={() => setShowNewPO(true)}><Plus className="h-4 w-4 mr-1" /> New PO</Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {poLoading ? <KpiSkeleton /> : <KpiCard label="Total POs" value={totalPOs} icon={ClipboardList} accent="navy" delta={12} deltaLabel="vs last month" />}
        {poLoading ? <KpiSkeleton /> : <KpiCard label="Pending Approvals" value={pendingApprovals} icon={Clock} accent="warning" />}
        {amenityLoading ? <KpiSkeleton /> : <KpiCard label="Items Below PAR" value={itemsBelowPAR} icon={AlertTriangle} accent="error" hint={`${fmtINR(totalReorderValue)} reorder value`} />}
        {seasonLoading ? <KpiSkeleton /> : <KpiCard label="Active Seasons" value={activeSeasonCount} icon={Sun} accent="info" hint="Affecting PAR levels" />}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="purchase-orders" className="text-xs">Purchase Orders</TabsTrigger>
          <TabsTrigger value="amenities" className="text-xs">Amenity Management</TabsTrigger>
          <TabsTrigger value="transactions" className="text-xs">Stock Transactions</TabsTrigger>
          <TabsTrigger value="seasons" className="text-xs">Season Config</TabsTrigger>
          <TabsTrigger value="inspections" className="text-xs">Inspections</TabsTrigger>
        </TabsList>

        {/* ═══════════════ PURCHASE ORDERS TAB ═══════════════ */}
        <TabsContent value="purchase-orders" className="mt-4">
          {/* PO Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
            {(["draft", "submitted", "approved", "received", "cancelled"] as POStatus[]).map((status) => {
              const meta = PO_STATUS_META[status];
              const count = purchaseOrders.filter((po) => po.status === status).length;
              const Icon = meta.icon;
              return (
                <Card
                  key={status}
                  className={cn("cursor-pointer hover:shadow-card-lg transition-shadow", poStatusFilter === status && "ring-2 ring-navy")}
                  onClick={() => setPoStatusFilter(poStatusFilter === status ? "all" : status)}
                >
                  <CardContent className="p-3 flex items-center gap-3">
                    <div className={cn("h-8 w-8 flex items-center justify-center rounded-lg", meta.cls.split(" ")[0])}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-lg font-bold tabular-nums">{poLoading ? <Skeleton className="h-6 w-6 inline-block" /> : count}</p>
                      <p className="text-[10px] text-muted-foreground">{meta.label}</p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* PO Table */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <ClipboardList className="h-4 w-4 text-navy" /> Purchase Orders
                  <Badge variant="secondary" className="text-[10px]">{filteredPOs.length}</Badge>
                </CardTitle>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                    <Input placeholder="Search POs..." className="pl-8 h-8 w-44 text-xs" value={poSearch} onChange={(e) => setPoSearch(e.target.value)} />
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {poLoading ? <TableSkeleton rows={5} cols={7} /> : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-[11px]">PO #</TableHead>
                        <TableHead className="text-[11px]">Vendor</TableHead>
                        <TableHead className="text-[11px] text-right">Amount</TableHead>
                        <TableHead className="text-[11px]">Status</TableHead>
                        <TableHead className="text-[11px]">Created</TableHead>
                        <TableHead className="text-[11px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredPOs.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-xs text-muted-foreground py-8">
                            No purchase orders found
                          </TableCell>
                        </TableRow>
                      ) : filteredPOs.map((po) => {
                        const st = PO_STATUS_META[po.status];
                        const StIcon = st.icon;
                        const isUpdating = updatingPO === po.id;
                        return (
                          <TableRow key={po.id} className="hover:bg-muted/50 cursor-pointer" onClick={() => setShowPODetail(po)}>
                            <TableCell className="text-xs font-mono text-navy font-semibold">{po.poNumber}</TableCell>
                            <TableCell className="text-xs font-medium">{po.vendor?.name || "—"}</TableCell>
                            <TableCell className="text-xs text-right tabular-nums font-semibold">{fmtINR(po.totalAmount)}</TableCell>
                            <TableCell>
                              <span className={cn("inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-medium", st.cls)}>
                                <StIcon className="h-3 w-3" />
                                {st.label}
                              </span>
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">{fmtDate(po.createdAt)}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                                {po.status === "draft" && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 text-[10px] px-1.5 text-[#D97706] hover:text-[#B45309]"
                                    disabled={isUpdating}
                                    onClick={() => handlePOStatusChange(po.id, "submitted")}
                                  >
                                    {isUpdating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3 mr-0.5" />} Submit
                                  </Button>
                                )}
                                {po.status === "submitted" && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 text-[10px] px-1.5 text-[#16A34A] hover:text-[#14532D]"
                                    disabled={isUpdating}
                                    onClick={() => handlePOStatusChange(po.id, "approved")}
                                  >
                                    {isUpdating ? <Loader2 className="h-3 w-3 animate-spin" /> : <ThumbsUp className="h-3 w-3 mr-0.5" />} Approve
                                  </Button>
                                )}
                                {po.status === "approved" && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 text-[10px] px-1.5 text-[#0369A1] hover:text-[#1B3A6B]"
                                    disabled={isUpdating}
                                    onClick={() => handlePOStatusChange(po.id, "received")}
                                  >
                                    {isUpdating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Inbox className="h-3 w-3 mr-0.5" />} Receive
                                  </Button>
                                )}
                                {(po.status === "draft" || po.status === "submitted") && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 text-[10px] px-1.5 text-[#DC2626] hover:text-[#991B1B]"
                                    disabled={isUpdating}
                                    onClick={() => handlePOStatusChange(po.id, "cancelled")}
                                  >
                                    {isUpdating ? <Loader2 className="h-3 w-3 animate-spin" /> : <XCircle className="h-3 w-3" />}
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
              {/* PO Total */}
              <div className="border-t border-border px-4 py-2 flex items-center justify-between bg-muted/30">
                <span className="text-xs text-muted-foreground">Total PO Value ({filteredPOs.length} orders)</span>
                <span className="text-sm font-bold tabular-nums">{fmtINR(filteredPOs.reduce((s, po) => s + po.totalAmount, 0))}</span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══════════════ AMENITY MANAGEMENT TAB ═══════════════ */}
        <TabsContent value="amenities" className="mt-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-4">
            <Select value={amenityCategory} onValueChange={setAmenityCategory}>
              <SelectTrigger className="h-8 w-48 text-xs">
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {(Object.entries(CATEGORY_META) as [AmenityCategory, typeof CATEGORY_META[AmenityCategory]][]).map(([key, meta]) => (
                  <SelectItem key={key} value={key}>
                    <span className="flex items-center gap-2">
                      <meta.icon className="h-3 w-3" style={{ color: meta.color }} />
                      {meta.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2">
              <Switch checked={showBelowParOnly} onCheckedChange={setShowBelowParOnly} />
              <Label className="text-xs text-muted-foreground">Show below PAR only</Label>
            </div>
            <div className="flex-1" />
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input placeholder="Search amenities..." className="pl-8 h-8 w-44 text-xs" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </div>

          {/* Category Groups */}
          <div className="space-y-3">
            {amenityLoading ? (
              <Card><CardContent className="p-4"><TableSkeleton rows={5} cols={10} /></CardContent></Card>
            ) : (Object.entries(amenitiesByCategory) as [AmenityCategory, AmenityItem[]][]).map(([catKey, items]) => {
              const catMeta = CATEGORY_META[catKey];
              const CatIcon = catMeta.icon;
              const belowParCount = items.filter((a) => isBelowPAR(a, seasons)).length;
              const isExpanded = expandedCategory === catKey;

              return (
                <Card key={catKey}>
                  <CardHeader
                    className="py-2.5 cursor-pointer hover:bg-muted/30 transition-colors"
                    onClick={() => setExpandedCategory(isExpanded ? null : catKey)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-7 w-7 flex items-center justify-center rounded-lg" style={{ backgroundColor: `${catMeta.color}15` }}>
                          <CatIcon className="h-3.5 w-3.5" style={{ color: catMeta.color }} />
                        </div>
                        <div>
                          <CardTitle className="text-xs font-semibold">{catMeta.label}</CardTitle>
                          <p className="text-[10px] text-muted-foreground">{CATEGORY_DESCRIPTIONS[catKey]}</p>
                        </div>
                        <Badge variant="secondary" className="text-[10px] ml-2">{items.length} items</Badge>
                        {belowParCount > 0 && (
                          <Badge className="text-[10px] bg-[#FEE2E2] text-[#7F1D1D] border-[#991B1B]">
                            <AlertTriangle className="h-2.5 w-2.5 mr-0.5" /> {belowParCount} below PAR
                          </Badge>
                        )}
                      </div>
                      {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                    </div>
                  </CardHeader>

                  {isExpanded && (
                    <CardContent className="p-0">
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="text-[10px]">Item Name</TableHead>
                              <TableHead className="text-[10px] text-center">Current Stock</TableHead>
                              <TableHead className="text-[10px] text-center">PAR Level</TableHead>
                              <TableHead className="text-[10px] text-center">Adjusted PAR</TableHead>
                              <TableHead className="text-[10px] text-center">Max Stock</TableHead>
                              <TableHead className="text-[10px] text-center">Reorder Qty</TableHead>
                              <TableHead className="text-[10px] text-center">Season Buffer</TableHead>
                              <TableHead className="text-[10px]">Condition</TableHead>
                              <TableHead className="text-[10px] text-right">Unit Cost</TableHead>
                              <TableHead className="text-[10px] text-right">Reorder Need</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {items.map((item) => {
                              const adjustedPAR = calculateAdjustedPAR(item, seasons);
                              const reorderNeed = calculateReorderNeeded(item, seasons);
                              const below = isBelowPAR(item, seasons);
                              const condMeta = CONDITION_META[item.condition] || CONDITION_META.good;
                              const stStatus = stockStatus(item, seasons);

                              return (
                                <TableRow
                                  key={item.id}
                                  className={cn(
                                    "hover:bg-muted/50",
                                    below && "bg-[#FEE2E2]/60 dark:bg-[#7F1D1D]/10",
                                    stStatus === "critical" && "bg-[#FEE2E2]/80 dark:bg-[#7F1D1D]/10"
                                  )}
                                >
                                  <TableCell className="text-xs font-medium">{item.name}</TableCell>
                                  <TableCell className={cn("text-xs text-center tabular-nums font-semibold", below ? "text-[#DC2626]" : "text-foreground")}>
                                    {item.quantity} {item.unit}
                                  </TableCell>
                                  <TableCell className="text-xs text-center tabular-nums text-muted-foreground">{item.parLevel}</TableCell>
                                  <TableCell className="text-xs text-center tabular-nums">
                                    <span className={cn("font-medium", adjustedPAR > item.parLevel ? "text-[#D97706]" : "text-muted-foreground")}>
                                      {adjustedPAR}
                                      {adjustedPAR > item.parLevel && <TrendingUp className="h-2.5 w-2.5 inline ml-0.5" />}
                                    </span>
                                  </TableCell>
                                  <TableCell className="text-xs text-center tabular-nums text-muted-foreground">{item.maxStock}</TableCell>
                                  <TableCell className="text-xs text-center tabular-nums">{item.reorderQty}</TableCell>
                                  <TableCell className="text-xs text-center tabular-nums">
                                    <span className={cn("font-medium", item.seasonBuffer > 0 ? "text-[#D97706]" : "text-muted-foreground")}>
                                      {item.seasonBuffer > 0 ? `${(item.seasonBuffer * 100).toFixed(0)}%` : "—"}
                                    </span>
                                  </TableCell>
                                  <TableCell>
                                    <span className={cn("inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-medium", condMeta.cls)}>{condMeta.label}</span>
                                  </TableCell>
                                  <TableCell className="text-xs text-right tabular-nums">{fmtINR(item.unitCost)}</TableCell>
                                  <TableCell className="text-xs text-right">
                                    {reorderNeed > 0 ? (
                                      <div>
                                        <span className="font-semibold text-[#DC2626]">{reorderNeed}</span>
                                        <span className="text-[10px] text-muted-foreground ml-1">({fmtINR(reorderNeed * item.unitCost)})</span>
                                      </div>
                                    ) : (
                                      <span className="text-[#16A34A] text-[10px] font-medium flex items-center justify-end gap-0.5">
                                        <CheckCircle2 className="h-3 w-3" /> OK
                                      </span>
                                    )}
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                      {/* Category Summary */}
                      <div className="border-t border-border px-4 py-2 flex items-center justify-between bg-muted/30">
                        <div className="flex items-center gap-4">
                          <span className="text-[10px] text-muted-foreground">Total items: {items.length}</span>
                          <span className="text-[10px] text-[#DC2626] font-medium">Below PAR: {belowParCount}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-muted-foreground">Reorder value:</span>
                          <span className="text-xs font-bold tabular-nums">
                            {fmtINR(items.reduce((sum, a) => sum + calculateReorderNeeded(a, seasons) * a.unitCost, 0))}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  )}
                </Card>
              );
            })}
            {!amenityLoading && filteredAmenities.length === 0 && (
              <Card>
                <CardContent className="py-8 text-center text-xs text-muted-foreground">
                  No amenity items found
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* ═══════════════ STOCK TRANSACTIONS TAB ═══════════════ */}
        <TabsContent value="transactions" className="mt-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row sm:items-end gap-3 mb-4">
            <div className="space-y-1">
              <Label className="text-[10px] text-muted-foreground">Transaction Type</Label>
              <Select value={txTypeFilter} onValueChange={setTxTypeFilter}>
                <SelectTrigger className="h-8 w-44 text-xs">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {(Object.entries(TRANSACTION_TYPE_META) as [TransactionType, typeof TRANSACTION_TYPE_META[TransactionType]][]).map(([key, meta]) => (
                    <SelectItem key={key} value={key}>{meta.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] text-muted-foreground">From Date</Label>
              <Input type="date" className="h-8 w-36 text-xs" value={txDateFrom} onChange={(e) => setTxDateFrom(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] text-muted-foreground">To Date</Label>
              <Input type="date" className="h-8 w-36 text-xs" value={txDateTo} onChange={(e) => setTxDateTo(e.target.value)} />
            </div>
            <div className="flex-1" />
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => { setTxTypeFilter("all"); setTxDateFrom(""); setTxDateTo(""); }}>
              Reset
            </Button>
          </div>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <ArrowRightLeft className="h-4 w-4 text-navy" /> Stock Transaction Log
                <Badge variant="secondary" className="text-[10px]">{filteredTransactions.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {txLoading ? <TableSkeleton rows={6} cols={8} /> : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-[11px]">Item</TableHead>
                        <TableHead className="text-[11px]">Type</TableHead>
                        <TableHead className="text-[11px] text-right">Qty</TableHead>
                        <TableHead className="text-[11px] text-right">Prev Qty</TableHead>
                        <TableHead className="text-[11px] text-right">New Qty</TableHead>
                        <TableHead className="text-[11px] text-right">Cost/Unit</TableHead>
                        <TableHead className="text-[11px]">Performed By</TableHead>
                        <TableHead className="text-[11px]">Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredTransactions.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center text-xs text-muted-foreground py-8">
                            No transactions found for the selected filters
                          </TableCell>
                        </TableRow>
                      ) : filteredTransactions.map((tx) => {
                        const typeKey = tx.transactionType as TransactionType;
                        const typeMeta = TRANSACTION_TYPE_META[typeKey] || TRANSACTION_TYPE_META.purchase;
                        const TypeIcon = typeMeta.icon;
                        return (
                          <TableRow key={tx.id} className="hover:bg-muted/50">
                            <TableCell className="text-xs font-medium">{tx.amenityItem?.name || "—"}</TableCell>
                            <TableCell>
                              <span className={cn("inline-flex items-center gap-0.5 text-[10px] font-medium", typeMeta.cls)}>
                                <TypeIcon className="h-3 w-3" />
                                {typeMeta.label}
                              </span>
                            </TableCell>
                            <TableCell className={cn("text-xs text-right tabular-nums font-semibold", tx.quantity >= 0 ? "text-[#16A34A]" : "text-[#DC2626]")}>
                              {tx.quantity >= 0 ? "+" : ""}{tx.quantity}
                            </TableCell>
                            <TableCell className="text-xs text-right tabular-nums text-muted-foreground">{tx.previousQty}</TableCell>
                            <TableCell className="text-xs text-right tabular-nums font-semibold">{tx.newQty}</TableCell>
                            <TableCell className="text-xs text-right tabular-nums">{fmtINR(tx.costPerUnit)}</TableCell>
                            <TableCell className="text-xs">{tx.performedBy || "—"}</TableCell>
                            <TableCell className="text-[10px] text-muted-foreground">{fmtDateTime(tx.createdAt)}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══════════════ SEASON CONFIG TAB ═══════════════ */}
        <TabsContent value="seasons" className="mt-4">
          {/* Season Impact Summary */}
          <Card className="mb-4">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Sun className="h-4 w-4 text-[#D97706]" /> Season Impact on PAR Levels
              </CardTitle>
            </CardHeader>
            <CardContent>
              {seasonLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-lg" />)}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {(Object.entries(CATEGORY_META) as [AmenityCategory, typeof CATEGORY_META[AmenityCategory]][]).map(([catKey, catMeta]) => {
                    const CatIcon = catMeta.icon;
                    const multiplier = getActiveSeasonMultiplier(catKey, seasons);
                    const activeSeasonsForCat = seasons.filter((s) => s.category === catKey && s.isActive);
                    const itemsInCat = amenities.filter((a) => a.category === catKey);
                    const belowPAR = itemsInCat.filter((a) => isBelowPAR(a, seasons)).length;

                    return (
                      <div key={catKey} className="rounded-lg border border-border p-3 hover:bg-muted/30 transition-colors">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="h-6 w-6 flex items-center justify-center rounded-md" style={{ backgroundColor: `${catMeta.color}15` }}>
                            <CatIcon className="h-3 w-3" style={{ color: catMeta.color }} />
                          </div>
                          <span className="text-xs font-semibold">{catMeta.label}</span>
                          {multiplier > 1 && (
                            <Badge className="text-[9px] bg-[#FEF3C7] text-[#78350F] border-[#D97706]">
                              {multiplier}x
                            </Badge>
                          )}
                        </div>
                        {activeSeasonsForCat.length > 0 ? (
                          <div className="space-y-1">
                            {activeSeasonsForCat.map((season) => (
                              <div key={season.id} className="flex items-center justify-between text-[10px]">
                                <span className="text-muted-foreground">{season.name}</span>
                                <span className="font-medium text-[#D97706]">
                                  {((season.multiplier - 1) * 100).toFixed(0)}% more stock needed
                                </span>
                              </div>
                            ))}
                            <div className="pt-1 border-t border-border mt-1 flex items-center justify-between">
                              <span className="text-[10px] text-muted-foreground">Items below adjusted PAR</span>
                              <span className={cn("text-[10px] font-bold", belowPAR > 0 ? "text-[#DC2626]" : "text-[#16A34A]")}>
                                {belowPAR}/{itemsInCat.length}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <p className="text-[10px] text-muted-foreground">No active seasons — using base PAR levels</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Season Configurations Table */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-navy" /> Season Configurations
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {seasonLoading ? <TableSkeleton rows={5} cols={7} /> : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-[11px]">Season</TableHead>
                        <TableHead className="text-[11px]">Category</TableHead>
                        <TableHead className="text-[11px] text-center">Multiplier</TableHead>
                        <TableHead className="text-[11px] text-center">Effect</TableHead>
                        <TableHead className="text-[11px]">Start Date</TableHead>
                        <TableHead className="text-[11px]">End Date</TableHead>
                        <TableHead className="text-[11px] text-center">Auto-Reorder</TableHead>
                        <TableHead className="text-[11px] text-center">Active</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {seasons.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center text-xs text-muted-foreground py-8">
                            No season configurations found
                          </TableCell>
                        </TableRow>
                      ) : seasons.map((season) => {
                        const catMeta = CATEGORY_META[season.category as AmenityCategory];
                        const CatIcon = catMeta?.icon;
                        const effectPercent = ((season.multiplier - 1) * 100).toFixed(0);

                        return (
                          <TableRow key={season.id} className={cn("hover:bg-muted/50", !season.isActive && "opacity-60")}>
                            <TableCell className="text-xs font-semibold flex items-center gap-1.5">
                              {season.name.includes("Summer") && <Sun className="h-3 w-3 text-[#D97706]" />}
                              {season.name.includes("Monsoon") && <CloudRain className="h-3 w-3 text-[#0369A1]" />}
                              {season.name.includes("Winter") && <Snowflake className="h-3 w-3 text-[#0369A1]" />}
                              {season.name.includes("Conference") && <FileText className="h-3 w-3 text-[#7C3AED]" />}
                              {season.name}
                            </TableCell>
                            <TableCell>
                              {catMeta && CatIcon ? (
                                <span className="inline-flex items-center gap-1 text-xs">
                                  <CatIcon className="h-3 w-3" style={{ color: catMeta.color }} />
                                  {catMeta.label}
                                </span>
                              ) : (
                                <span className="text-xs">{season.category}</span>
                              )}
                            </TableCell>
                            <TableCell className="text-xs text-center tabular-nums font-semibold">{season.multiplier}x</TableCell>
                            <TableCell className="text-xs text-center">
                              <span className={cn("text-[10px] font-medium", season.multiplier > 1 ? "text-[#D97706]" : "text-muted-foreground")}>
                                +{effectPercent}% stock
                              </span>
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">{fmtDate(season.startDate)}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">{fmtDate(season.endDate)}</TableCell>
                            <TableCell className="text-center">
                              {season.autoReorder ? (
                                <CheckCircle2 className="h-4 w-4 text-[#16A34A] inline" />
                              ) : (
                                <XCircle className="h-4 w-4 text-muted-foreground inline" />
                              )}
                            </TableCell>
                            <TableCell className="text-center">
                              <Switch checked={season.isActive} disabled className="scale-75" />
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══════════════ INSPECTIONS TAB ═══════════════ */}
        <TabsContent value="inspections" className="mt-4">
          {/* Inspection Summary */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
            {(["pending", "in_progress", "completed"] as InspectionStatus[]).map((status) => {
              const meta = INSPECTION_STATUS_META[status];
              const count = inspections.filter((i) => i.status === status).length;
              const dotColor = status === "pending" ? "#D97706" : status === "in_progress" ? "#0369A1" : "#16A34A";
              return (
                <Card key={status}>
                  <CardContent className="p-3 flex items-center gap-3">
                    <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: dotColor }} />
                    <div>
                      <p className="text-lg font-bold tabular-nums">{inspectionLoading ? <Skeleton className="h-6 w-6 inline-block" /> : count}</p>
                      <p className="text-[10px] text-muted-foreground">{meta.label}</p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Critical inspections alert */}
          {!inspectionLoading && inspections.filter((i) => (i.priority === "urgent" || i.priority === "high") && i.status !== "completed").length > 0 && (
            <div className="rounded-lg border border-[#991B1B]/30 bg-[#FEE2E2]/60 dark:bg-[#7F1D1D]/10 p-3 mb-4 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-[#991B1B] mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-semibold text-[#7F1D1D] dark:text-[#FCA5A5]">Critical Inspections Require Attention</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {inspections.filter((i) => (i.priority === "urgent" || i.priority === "high") && i.status !== "completed").length} items have high/urgent priority and need immediate action.
                </p>
              </div>
            </div>
          )}

          {/* Inspections Table */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <ClipboardCheck className="h-4 w-4 text-navy" /> Inspection Records
                  <Badge variant="secondary" className="text-[10px]">{inspections.length}</Badge>
                </CardTitle>
                <Button size="sm" className="bg-navy hover:bg-navy-light text-white h-7 text-xs" onClick={() => setShowNewInspection(true)}>
                  <Plus className="h-3 w-3 mr-1" /> Log Inspection
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {inspectionLoading ? <TableSkeleton rows={5} cols={8} /> : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-[11px]">Item</TableHead>
                        <TableHead className="text-[11px]">Condition</TableHead>
                        <TableHead className="text-[11px]">Action Required</TableHead>
                        <TableHead className="text-[11px]">Priority</TableHead>
                        <TableHead className="text-[11px]">Status</TableHead>
                        <TableHead className="text-[11px]">Inspected By</TableHead>
                        <TableHead className="text-[11px]">Date</TableHead>
                        <TableHead className="text-[11px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {inspections.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center text-xs text-muted-foreground py-8">
                            No inspection records found
                          </TableCell>
                        </TableRow>
                      ) : inspections.map((insp) => {
                        const condMeta = CONDITION_META[insp.condition] || CONDITION_META.good;
                        const prioMeta = PRIORITY_META[insp.priority] || PRIORITY_META.normal;
                        const statusMeta = INSPECTION_STATUS_META[insp.status] || INSPECTION_STATUS_META.pending;
                        const isUpdating = updatingInspection === insp.id;

                        return (
                          <TableRow
                            key={insp.id}
                            className={cn(
                              "hover:bg-muted/50 cursor-pointer",
                              (insp.priority === "urgent" || insp.priority === "high") && insp.status === "pending" && "bg-[#FEE2E2]/40 dark:bg-[#7F1D1D]/10"
                            )}
                            onClick={() => setShowInspectionDetail(insp)}
                          >
                            <TableCell className="text-xs font-medium">{insp.amenityItem?.name || "—"}</TableCell>
                            <TableCell>
                              <span className={cn("inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-medium", condMeta.cls)}>
                                {condMeta.label}
                              </span>
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate" title={insp.actionRequired || undefined}>
                              {insp.actionRequired || "—"}
                            </TableCell>
                            <TableCell>
                              <span className={cn("inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-medium", prioMeta.cls)}>
                                {prioMeta.label}
                              </span>
                            </TableCell>
                            <TableCell>
                              <span className={cn("inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-medium", statusMeta.cls)}>
                                {statusMeta.label}
                              </span>
                            </TableCell>
                            <TableCell className="text-xs">{insp.inspectedBy}</TableCell>
                            <TableCell className="text-[10px] text-muted-foreground">{fmtDateTime(insp.createdAt)}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                                {insp.status === "pending" && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 text-[10px] px-1.5 text-[#0369A1]"
                                    disabled={isUpdating}
                                    onClick={() => handleInspectionStatusChange(insp.id, "in_progress")}
                                  >
                                    {isUpdating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />} Start
                                  </Button>
                                )}
                                {insp.status === "in_progress" && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 text-[10px] px-1.5 text-[#16A34A]"
                                    disabled={isUpdating}
                                    onClick={() => handleInspectionStatusChange(insp.id, "completed")}
                                  >
                                    {isUpdating ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />} Resolve
                                  </Button>
                                )}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 text-[10px] px-1.5"
                                  onClick={() => setShowInspectionDetail(insp)}
                                >
                                  <Eye className="h-3 w-3" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ═══════════════ NEW PO DIALOG ═══════════════ */}
      <Dialog open={showNewPO} onOpenChange={(open) => { if (!open) { setShowNewPO(false); resetNewPOForm(); } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-navy" /> Create New Purchase Order
            </DialogTitle>
            <DialogDescription>Enter PO details and submit for approval</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Vendor *</Label>
                <Select value={newPOVendorId} onValueChange={setNewPOVendorId}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Select vendor" />
                  </SelectTrigger>
                  <SelectContent>
                    {vendors.map((v) => (
                      <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Total Amount (₹) *</Label>
                <Input
                  type="number"
                  className="h-9 text-xs"
                  placeholder="Enter total amount"
                  value={newPOAmount}
                  onChange={(e) => setNewPOAmount(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Notes</Label>
              <Textarea
                className="text-xs"
                placeholder="Add any notes or special instructions..."
                rows={2}
                value={newPONotes}
                onChange={(e) => setNewPONotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setShowNewPO(false); resetNewPOForm(); }} className="h-9" disabled={submitting}>Cancel</Button>
            <Button
              variant="outline"
              className="h-9"
              disabled={submitting}
              onClick={() => handleCreatePO("draft")}
            >
              {submitting ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <FileText className="h-3.5 w-3.5 mr-1" />} Save Draft
            </Button>
            <Button
              className="bg-navy hover:bg-navy-light text-white h-9"
              disabled={submitting}
              onClick={() => handleCreatePO("submitted")}
            >
              {submitting ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Send className="h-3.5 w-3.5 mr-1" />} Submit for Approval
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══════════════ PO DETAIL DIALOG ═══════════════ */}
      <Dialog open={!!showPODetail} onOpenChange={(open) => { if (!open) setShowPODetail(null); }}>
        {showPODetail && (
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5 text-navy" />
                {showPODetail.poNumber}
                <span className={cn("inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium ml-2", PO_STATUS_META[showPODetail.status].cls)}>
                  {PO_STATUS_META[showPODetail.status].label}
                </span>
              </DialogTitle>
              <DialogDescription>{showPODetail.vendor?.name || "No vendor"}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              {/* PO Info Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <p className="text-[10px] text-muted-foreground">Created</p>
                  <p className="text-xs font-medium">{fmtDate(showPODetail.createdAt)}</p>
                </div>
                {showPODetail.orderedAt && (
                  <div>
                    <p className="text-[10px] text-muted-foreground">Submitted</p>
                    <p className="text-xs font-medium">{fmtDate(showPODetail.orderedAt)}</p>
                  </div>
                )}
                {showPODetail.receivedAt && (
                  <div>
                    <p className="text-[10px] text-muted-foreground">Received</p>
                    <p className="text-xs font-medium">{fmtDate(showPODetail.receivedAt)}</p>
                  </div>
                )}
              </div>

              {/* Amount */}
              <div className="rounded-lg border border-border p-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Total Amount</span>
                  <span className="text-lg font-bold tabular-nums">{fmtINR(showPODetail.totalAmount)}</span>
                </div>
              </div>

              {showPODetail.notes && (
                <div className="rounded-lg border border-border p-3">
                  <p className="text-[10px] text-muted-foreground mb-1">Notes</p>
                  <p className="text-xs">{showPODetail.notes}</p>
                </div>
              )}
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setShowPODetail(null)} className="h-9">Close</Button>
              {showPODetail.status === "submitted" && (
                <Button
                  className="bg-[#16A34A] hover:bg-[#14532D] text-white h-9"
                  disabled={updatingPO === showPODetail.id}
                  onClick={() => { handlePOStatusChange(showPODetail.id, "approved"); setShowPODetail(null); }}
                >
                  {updatingPO === showPODetail.id ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <ThumbsUp className="h-3.5 w-3.5 mr-1" />} Approve PO
                </Button>
              )}
              {showPODetail.status === "approved" && (
                <Button
                  className="bg-[#0369A1] hover:bg-[#1B3A6B] text-white h-9"
                  disabled={updatingPO === showPODetail.id}
                  onClick={() => { handlePOStatusChange(showPODetail.id, "received"); setShowPODetail(null); }}
                >
                  {updatingPO === showPODetail.id ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Inbox className="h-3.5 w-3.5 mr-1" />} Mark Received
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>

      {/* ═══════════════ NEW INSPECTION DIALOG ═══════════════ */}
      <Dialog open={showNewInspection} onOpenChange={(open) => { if (!open) { setShowNewInspection(false); resetNewInspectionForm(); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5 text-navy" /> Log New Inspection
            </DialogTitle>
            <DialogDescription>Record amenity condition and required actions</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Amenity Item *</Label>
                <Select value={newInspItemId} onValueChange={setNewInspItemId}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Select item" />
                  </SelectTrigger>
                  <SelectContent className="max-h-48">
                    {amenities.map((a) => (
                      <SelectItem key={a.id} value={a.id}>{a.name} ({(CATEGORY_META[a.category as AmenityCategory]?.label || a.category)})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Condition *</Label>
                <Select value={newInspCondition} onValueChange={setNewInspCondition}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Select condition" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="good">Good</SelectItem>
                    <SelectItem value="fair">Fair</SelectItem>
                    <SelectItem value="poor">Poor</SelectItem>
                    <SelectItem value="damaged">Damaged</SelectItem>
                    <SelectItem value="needs_replacement">Needs Replacement</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Priority</Label>
                <Select value={newInspPriority} onValueChange={setNewInspPriority}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Inspected By *</Label>
                <Input
                  className="h-9 text-xs"
                  placeholder="Inspector name"
                  value={newInspInspectedBy}
                  onChange={(e) => setNewInspInspectedBy(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Action Required</Label>
              <Textarea
                className="text-xs"
                placeholder="Describe the issue and required action..."
                rows={2}
                value={newInspAction}
                onChange={(e) => setNewInspAction(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Additional Notes</Label>
              <Textarea
                className="text-xs"
                placeholder="Any additional observations..."
                rows={2}
                value={newInspNotes}
                onChange={(e) => setNewInspNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setShowNewInspection(false); resetNewInspectionForm(); }} className="h-9" disabled={submitting}>Cancel</Button>
            <Button
              className="bg-navy hover:bg-navy-light text-white h-9"
              disabled={submitting}
              onClick={handleCreateInspection}
            >
              {submitting ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <ClipboardCheck className="h-3.5 w-3.5 mr-1" />} Log Inspection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══════════════ INSPECTION DETAIL DIALOG ═══════════════ */}
      <Dialog open={!!showInspectionDetail} onOpenChange={(open) => { if (!open) setShowInspectionDetail(null); }}>
        {showInspectionDetail && (
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ClipboardCheck className="h-5 w-5 text-navy" />
                {showInspectionDetail.amenityItem?.name || "Unknown Item"}
              </DialogTitle>
              <DialogDescription>Inspection Detail</DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[10px] text-muted-foreground">Condition</p>
                  <span className={cn("inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-medium mt-0.5", (CONDITION_META[showInspectionDetail.condition] || CONDITION_META.good).cls)}>
                    {(CONDITION_META[showInspectionDetail.condition] || CONDITION_META.good).label}
                  </span>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">Priority</p>
                  <span className={cn("inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-medium mt-0.5", (PRIORITY_META[showInspectionDetail.priority] || PRIORITY_META.normal).cls)}>
                    {(PRIORITY_META[showInspectionDetail.priority] || PRIORITY_META.normal).label}
                  </span>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">Status</p>
                  <span className={cn("inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-medium mt-0.5", (INSPECTION_STATUS_META[showInspectionDetail.status] || INSPECTION_STATUS_META.pending).cls)}>
                    {(INSPECTION_STATUS_META[showInspectionDetail.status] || INSPECTION_STATUS_META.pending).label}
                  </span>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">Category</p>
                  <p className="text-xs font-medium">{(CATEGORY_META[showInspectionDetail.amenityItem?.category as AmenityCategory]?.label || showInspectionDetail.amenityItem?.category || "—")}</p>
                </div>
              </div>
              {showInspectionDetail.actionRequired && (
                <div className="rounded-lg border border-border p-3">
                  <p className="text-[10px] text-muted-foreground mb-1">Action Required</p>
                  <p className="text-xs">{showInspectionDetail.actionRequired}</p>
                </div>
              )}
              {showInspectionDetail.notes && (
                <div className="rounded-lg border border-border p-3">
                  <p className="text-[10px] text-muted-foreground mb-1">Notes</p>
                  <p className="text-xs">{showInspectionDetail.notes}</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[10px] text-muted-foreground">Inspected By</p>
                  <p className="text-xs font-medium">{showInspectionDetail.inspectedBy}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">Inspection Date</p>
                  <p className="text-xs font-medium">{fmtDateTime(showInspectionDetail.createdAt)}</p>
                </div>
                {showInspectionDetail.completedAt && (
                  <div>
                    <p className="text-[10px] text-muted-foreground">Completed Date</p>
                    <p className="text-xs font-medium">{fmtDateTime(showInspectionDetail.completedAt)}</p>
                  </div>
                )}
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setShowInspectionDetail(null)} className="h-9">Close</Button>
              {showInspectionDetail.status === "pending" && (
                <Button
                  className="bg-[#0369A1] hover:bg-[#1B3A6B] text-white h-9"
                  disabled={updatingInspection === showInspectionDetail.id}
                  onClick={() => handleInspectionStatusChange(showInspectionDetail.id, "in_progress")}
                >
                  {updatingInspection === showInspectionDetail.id ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Play className="h-3.5 w-3.5 mr-1" />} Start Work
                </Button>
              )}
              {showInspectionDetail.status === "in_progress" && (
                <Button
                  className="bg-[#16A34A] hover:bg-[#14532D] text-white h-9"
                  disabled={updatingInspection === showInspectionDetail.id}
                  onClick={() => handleInspectionStatusChange(showInspectionDetail.id, "completed")}
                >
                  {updatingInspection === showInspectionDetail.id ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5 mr-1" />} Mark Resolved
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
