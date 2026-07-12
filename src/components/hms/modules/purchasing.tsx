// ARIA HMS — Purchasing / Procurement Module (5 tabs: Purchase Orders, Amenity Mgmt, Stock Transactions, Season Config, Inspections)
"use client";

import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/lib/store";
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
import {
  ShoppingCart, AlertTriangle, Package, IndianRupee, ClipboardCheck,
  Plus, Search, Warehouse, Truck, ArrowUpRight, ArrowDownRight,
  Filter, Download, ClipboardList, CalendarDays, Sun, Snowflake,
  CheckCircle2, Clock, XCircle, Eye, Edit3, Trash2, ArrowRightLeft,
  TrendingUp, Wrench, Bed, Bath, Coffee, Tv, Shield, PenTool, Sofa,
  ChevronDown, ChevronUp, RefreshCw, FileText, Send, ThumbsUp,
  Inbox, Bug, ShieldCheck, Palette, Thermometer, Play,
} from "lucide-react";

// ─── TYPES ──────────────────────────────────────────────────────────

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
type Condition = "new" | "good" | "fair" | "poor" | "damaged";
type TransactionType =
  | "purchase"
  | "issued_to_room"
  | "returned"
  | "damaged"
  | "lost"
  | "adjustment"
  | "season_stock_up"
  | "transfer";
type InspectionPriority = "low" | "medium" | "high" | "critical";
type InspectionStatus = "open" | "in_progress" | "resolved" | "closed";

interface POLineItem {
  id: string;
  item: string;
  category: AmenityCategory;
  qty: number;
  unitPrice: number;
  total: number;
}

interface PurchaseOrder {
  id: string;
  poNumber: string;
  vendor: string;
  status: POStatus;
  lineItems: POLineItem[];
  totalAmount: number;
  createdDate: string;
  submittedDate?: string;
  approvedDate?: string;
  receivedDate?: string;
  notes?: string;
}

interface AmenityItem {
  id: string;
  name: string;
  category: AmenityCategory;
  currentStock: number;
  parLevel: number;
  maxStock: number;
  reorderQty: number;
  seasonBuffer: number;
  condition: Condition;
  lifecycle: string;
  perRoomType: { standard: number; deluxe: number; suite: number; presidential: number };
  unit: string;
  unitCost: number;
  lastOrdered?: string;
}

interface StockTransaction {
  id: string;
  itemId: string;
  itemName: string;
  type: TransactionType;
  qty: number;
  date: string;
  from?: string;
  to?: string;
  reference?: string;
  notes?: string;
  by: string;
}

interface SeasonConfig {
  id: string;
  name: string;
  category: AmenityCategory;
  multiplier: number;
  startDate: string;
  endDate: string;
  autoReorder: boolean;
  active: boolean;
}

interface InspectionRecord {
  id: string;
  amenityItemId: string;
  amenityItemName: string;
  condition: Condition;
  actionRequired?: string;
  priority: InspectionPriority;
  status: InspectionStatus;
  inspectedBy: string;
  department: "housekeeping" | "engineering";
  date: string;
  notes?: string;
  resolvedDate?: string;
}

// ─── CATEGORY META ──────────────────────────────────────────────────

const CATEGORY_META: Record<AmenityCategory, { label: string; icon: any; color: string }> = {
  bedroom_linen: { label: "Bedroom Linen", icon: Bed, color: "#7C3AED" },
  bathroom_linen: { label: "Bathroom Linen", icon: Bath, color: "#0284C7" },
  minibar: { label: "Mini Bar Items", icon: Coffee, color: "#D97706" },
  kitchen: { label: "Kitchen Equipment", icon: Thermometer, color: "#DC2626" },
  bathroom_amenity: { label: "Bathroom Amenities", icon: Palette, color: "#16A34A" },
  electronics: { label: "Electronics", icon: Tv, color: "#0369A1" },
  safety: { label: "Safety Items", icon: Shield, color: "#B45309" },
  stationery: { label: "Stationery", icon: PenTool, color: "#6B7280" },
  living_room: { label: "Living Room", icon: Sofa, color: "#9333EA" },
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
  cancelled: { label: "Cancelled", cls: "bg-[#FFE4E6] text-[#881337] border-[#DC2626]", icon: XCircle },
};

const CONDITION_META: Record<Condition, { label: string; cls: string }> = {
  new: { label: "New", cls: "bg-[#DCFCE7] text-[#14532D] border-[#16A34A]" },
  good: { label: "Good", cls: "bg-[#DBEAFE] text-[#1B3A6B] border-[#0369A1]" },
  fair: { label: "Fair", cls: "bg-[#FEF3C7] text-[#78350F] border-[#D97706]" },
  poor: { label: "Poor", cls: "bg-[#FFE4E6] text-[#881337] border-[#DC2626]" },
  damaged: { label: "Damaged", cls: "bg-[#FEE2E2] text-[#7F1D1D] border-[#991B1B]" },
};

const TRANSACTION_TYPE_META: Record<TransactionType, { label: string; cls: string; icon: any; direction: "in" | "out" | "neutral" }> = {
  purchase: { label: "Purchase", cls: "text-[#16A34A]", icon: ArrowDownRight, direction: "in" },
  issued_to_room: { label: "Issued to Room", cls: "text-[#0369A1]", icon: ArrowUpRight, direction: "out" },
  returned: { label: "Returned", cls: "text-[#7C3AED]", icon: ArrowDownRight, direction: "in" },
  damaged: { label: "Damaged", cls: "text-[#DC2626]", icon: XCircle, direction: "out" },
  lost: { label: "Lost", cls: "text-[#991B1B]", icon: XCircle, direction: "out" },
  adjustment: { label: "Adjustment", cls: "text-[#D97706]", icon: ArrowRightLeft, direction: "neutral" },
  season_stock_up: { label: "Season Stock Up", cls: "text-[#7C3AED]", icon: TrendingUp, direction: "in" },
  transfer: { label: "Transfer", cls: "text-[#0284C7]", icon: ArrowRightLeft, direction: "neutral" },
};

const PRIORITY_META: Record<InspectionPriority, { label: string; cls: string }> = {
  low: { label: "Low", cls: "bg-[#E5E7EB] text-[#374151] border-[#6B7280]" },
  medium: { label: "Medium", cls: "bg-[#FEF3C7] text-[#78350F] border-[#D97706]" },
  high: { label: "High", cls: "bg-[#FFE4E6] text-[#881337] border-[#DC2626]" },
  critical: { label: "Critical", cls: "bg-[#FEE2E2] text-[#7F1D1D] border-[#991B1B]" },
};

const INSPECTION_STATUS_META: Record<InspectionStatus, { label: string; cls: string }> = {
  open: { label: "Open", cls: "bg-[#FEF3C7] text-[#78350F] border-[#D97706]" },
  in_progress: { label: "In Progress", cls: "bg-[#DBEAFE] text-[#1B3A6B] border-[#0369A1]" },
  resolved: { label: "Resolved", cls: "bg-[#DCFCE7] text-[#14532D] border-[#16A34A]" },
  closed: { label: "Closed", cls: "bg-[#E5E7EB] text-[#374151] border-[#6B7280]" },
};

// ─── MOCK DATA ──────────────────────────────────────────────────────

const MOCK_PURCHASE_ORDERS: PurchaseOrder[] = [
  {
    id: "po-1", poNumber: "PO-2025-001", vendor: "Linen Solutions Pvt Ltd", status: "approved",
    lineItems: [
      { id: "li-1", item: "Bath Towels (White)", category: "bathroom_linen", qty: 200, unitPrice: 450, total: 90000 },
      { id: "li-2", item: "Bed Sheets (King)", category: "bedroom_linen", qty: 150, unitPrice: 650, total: 97500 },
      { id: "li-3", item: "Pillow Covers", category: "bedroom_linen", qty: 300, unitPrice: 180, total: 54000 },
    ],
    totalAmount: 241500, createdDate: "2025-01-10", submittedDate: "2025-01-11", approvedDate: "2025-01-12",
  },
  {
    id: "po-2", poNumber: "PO-2025-002", vendor: "CleanPro Chemicals", status: "submitted",
    lineItems: [
      { id: "li-4", item: "Cleaning Chemicals (5L)", category: "bathroom_amenity", qty: 50, unitPrice: 320, total: 16000 },
      { id: "li-5", item: "Shampoo Bottles (30ml)", category: "bathroom_amenity", qty: 500, unitPrice: 28, total: 14000 },
    ],
    totalAmount: 30000, createdDate: "2025-01-14", submittedDate: "2025-01-15",
  },
  {
    id: "po-3", poNumber: "PO-2025-003", vendor: "Premium Supplies Co", status: "received",
    lineItems: [
      { id: "li-6", item: "Toiletry Kit Premium", category: "bathroom_amenity", qty: 500, unitPrice: 150, total: 75000 },
    ],
    totalAmount: 75000, createdDate: "2025-01-05", submittedDate: "2025-01-06", approvedDate: "2025-01-07", receivedDate: "2025-01-10",
  },
  {
    id: "po-4", poNumber: "PO-2025-004", vendor: "TechKey Solutions", status: "draft",
    lineItems: [
      { id: "li-7", item: "TV Remote (Universal)", category: "electronics", qty: 30, unitPrice: 350, total: 10500 },
      { id: "li-8", item: "Hair Dryer (1600W)", category: "electronics", qty: 15, unitPrice: 1800, total: 27000 },
    ],
    totalAmount: 37500, createdDate: "2025-01-16",
  },
  {
    id: "po-5", poNumber: "PO-2025-005", vendor: "Coffee Bean Traders", status: "cancelled",
    lineItems: [
      { id: "li-9", item: "Coffee Capsules (Nespresso)", category: "minibar", qty: 100, unitPrice: 90, total: 9000 },
    ],
    totalAmount: 9000, createdDate: "2025-01-08", notes: "Cancelled — vendor unable to fulfill timeline",
  },
  {
    id: "po-6", poNumber: "PO-2025-006", vendor: "SafeHouse Security", status: "approved",
    lineItems: [
      { id: "li-10", item: "Fire Extinguisher (2kg)", category: "safety", qty: 20, unitPrice: 1200, total: 24000 },
      { id: "li-11", item: "First Aid Kit", category: "safety", qty: 25, unitPrice: 650, total: 16250 },
    ],
    totalAmount: 40250, createdDate: "2025-01-13", submittedDate: "2025-01-14", approvedDate: "2025-01-15",
  },
];

const MOCK_AMENITIES: AmenityItem[] = [
  { id: "AM-001", name: "Bed Sheets (King)", category: "bedroom_linen", currentStock: 180, parLevel: 120, maxStock: 300, reorderQty: 60, seasonBuffer: 0.2, condition: "good", lifecycle: "18 months", perRoomType: { standard: 3, deluxe: 3, suite: 4, presidential: 6 }, unit: "Pcs", unitCost: 650, lastOrdered: "2025-01-10" },
  { id: "AM-002", name: "Pillow Covers", category: "bedroom_linen", currentStock: 95, parLevel: 120, maxStock: 300, reorderQty: 60, seasonBuffer: 0.2, condition: "good", lifecycle: "12 months", perRoomType: { standard: 4, deluxe: 4, suite: 6, presidential: 8 }, unit: "Pcs", unitCost: 180, lastOrdered: "2025-01-10" },
  { id: "AM-003", name: "Duvet (King)", category: "bedroom_linen", currentStock: 45, parLevel: 60, maxStock: 120, reorderQty: 30, seasonBuffer: 0.15, condition: "new", lifecycle: "36 months", perRoomType: { standard: 1, deluxe: 1, suite: 2, presidential: 2 }, unit: "Pcs", unitCost: 2200 },
  { id: "AM-004", name: "Blanket (Wool)", category: "bedroom_linen", currentStock: 30, parLevel: 60, maxStock: 100, reorderQty: 30, seasonBuffer: 0.5, condition: "fair", lifecycle: "24 months", perRoomType: { standard: 1, deluxe: 1, suite: 2, presidential: 3 }, unit: "Pcs", unitCost: 1200 },
  { id: "AM-005", name: "Bath Towels (White)", category: "bathroom_linen", currentStock: 340, parLevel: 200, maxStock: 500, reorderQty: 100, seasonBuffer: 0.3, condition: "good", lifecycle: "12 months", perRoomType: { standard: 3, deluxe: 3, suite: 4, presidential: 6 }, unit: "Pcs", unitCost: 450 },
  { id: "AM-006", name: "Face Towels", category: "bathroom_linen", currentStock: 160, parLevel: 200, maxStock: 400, reorderQty: 100, seasonBuffer: 0.3, condition: "good", lifecycle: "12 months", perRoomType: { standard: 2, deluxe: 2, suite: 3, presidential: 4 }, unit: "Pcs", unitCost: 120 },
  { id: "AM-007", name: "Hand Towels", category: "bathroom_linen", currentStock: 85, parLevel: 200, maxStock: 400, reorderQty: 100, seasonBuffer: 0.3, condition: "fair", lifecycle: "12 months", perRoomType: { standard: 2, deluxe: 2, suite: 3, presidential: 4 }, unit: "Pcs", unitCost: 180 },
  { id: "AM-008", name: "Bath Mats", category: "bathroom_linen", currentStock: 150, parLevel: 100, maxStock: 250, reorderQty: 50, seasonBuffer: 0.2, condition: "good", lifecycle: "18 months", perRoomType: { standard: 1, deluxe: 1, suite: 2, presidential: 2 }, unit: "Pcs", unitCost: 350 },
  { id: "AM-009", name: "Chocolates (Premium)", category: "minibar", currentStock: 48, parLevel: 100, maxStock: 200, reorderQty: 60, seasonBuffer: 0.4, condition: "new", lifecycle: "3 months", perRoomType: { standard: 2, deluxe: 3, suite: 4, presidential: 6 }, unit: "Pcs", unitCost: 80 },
  { id: "AM-010", name: "Chips (Assorted)", category: "minibar", currentStock: 35, parLevel: 80, maxStock: 160, reorderQty: 50, seasonBuffer: 0.4, condition: "new", lifecycle: "3 months", perRoomType: { standard: 2, deluxe: 3, suite: 4, presidential: 6 }, unit: "Pcs", unitCost: 40 },
  { id: "AM-011", name: "Water Bottles (1L)", category: "minibar", currentStock: 250, parLevel: 200, maxStock: 500, reorderQty: 100, seasonBuffer: 0.5, condition: "new", lifecycle: "6 months", perRoomType: { standard: 2, deluxe: 2, suite: 3, presidential: 4 }, unit: "Pcs", unitCost: 25 },
  { id: "AM-012", name: "Soft Drinks (Assorted)", category: "minibar", currentStock: 60, parLevel: 120, maxStock: 300, reorderQty: 80, seasonBuffer: 0.4, condition: "new", lifecycle: "6 months", perRoomType: { standard: 2, deluxe: 3, suite: 4, presidential: 5 }, unit: "Pcs", unitCost: 45 },
  { id: "AM-013", name: "Electric Kettle (1.5L)", category: "kitchen", currentStock: 40, parLevel: 50, maxStock: 80, reorderQty: 15, seasonBuffer: 0.1, condition: "good", lifecycle: "24 months", perRoomType: { standard: 1, deluxe: 1, suite: 1, presidential: 1 }, unit: "Pcs", unitCost: 1200 },
  { id: "AM-014", name: "Iron (Steam Press)", category: "kitchen", currentStock: 28, parLevel: 50, maxStock: 80, reorderQty: 15, seasonBuffer: 0.1, condition: "fair", lifecycle: "24 months", perRoomType: { standard: 1, deluxe: 1, suite: 1, presidential: 1 }, unit: "Pcs", unitCost: 1500 },
  { id: "AM-015", name: "Service Tray", category: "kitchen", currentStock: 55, parLevel: 50, maxStock: 100, reorderQty: 20, seasonBuffer: 0.1, condition: "good", lifecycle: "36 months", perRoomType: { standard: 1, deluxe: 1, suite: 2, presidential: 2 }, unit: "Pcs", unitCost: 450 },
  { id: "AM-016", name: "Soap (Herbal 30g)", category: "bathroom_amenity", currentStock: 620, parLevel: 500, maxStock: 1200, reorderQty: 250, seasonBuffer: 0.3, condition: "new", lifecycle: "2 months", perRoomType: { standard: 2, deluxe: 2, suite: 3, presidential: 4 }, unit: "Pcs", unitCost: 35 },
  { id: "AM-017", name: "Shampoo (40ml)", category: "bathroom_amenity", currentStock: 180, parLevel: 500, maxStock: 1200, reorderQty: 250, seasonBuffer: 0.3, condition: "new", lifecycle: "2 months", perRoomType: { standard: 1, deluxe: 2, suite: 2, presidential: 3 }, unit: "Pcs", unitCost: 42 },
  { id: "AM-018", name: "Conditioner (40ml)", category: "bathroom_amenity", currentStock: 160, parLevel: 500, maxStock: 1200, reorderQty: 250, seasonBuffer: 0.3, condition: "new", lifecycle: "2 months", perRoomType: { standard: 1, deluxe: 2, suite: 2, presidential: 3 }, unit: "Pcs", unitCost: 42 },
  { id: "AM-019", name: "Body Lotion (50ml)", category: "bathroom_amenity", currentStock: 350, parLevel: 400, maxStock: 1000, reorderQty: 200, seasonBuffer: 0.3, condition: "new", lifecycle: "2 months", perRoomType: { standard: 1, deluxe: 2, suite: 2, presidential: 3 }, unit: "Pcs", unitCost: 55 },
  { id: "AM-020", name: "Shower Cap", category: "bathroom_amenity", currentStock: 400, parLevel: 300, maxStock: 800, reorderQty: 150, seasonBuffer: 0.2, condition: "new", lifecycle: "1 month", perRoomType: { standard: 1, deluxe: 1, suite: 2, presidential: 2 }, unit: "Pcs", unitCost: 15 },
  { id: "AM-021", name: "TV Remote (Universal)", category: "electronics", currentStock: 22, parLevel: 30, maxStock: 60, reorderQty: 15, seasonBuffer: 0.05, condition: "good", lifecycle: "18 months", perRoomType: { standard: 1, deluxe: 1, suite: 1, presidential: 1 }, unit: "Pcs", unitCost: 350 },
  { id: "AM-022", name: "Hair Dryer (1600W)", category: "electronics", currentStock: 12, parLevel: 30, maxStock: 60, reorderQty: 15, seasonBuffer: 0.05, condition: "fair", lifecycle: "24 months", perRoomType: { standard: 0, deluxe: 1, suite: 1, presidential: 1 }, unit: "Pcs", unitCost: 1800 },
  { id: "AM-023", name: "Safe (Electronic)", category: "electronics", currentStock: 45, parLevel: 50, maxStock: 70, reorderQty: 10, seasonBuffer: 0.05, condition: "good", lifecycle: "48 months", perRoomType: { standard: 1, deluxe: 1, suite: 1, presidential: 1 }, unit: "Pcs", unitCost: 5500 },
  { id: "AM-024", name: "Fire Extinguisher (2kg)", category: "safety", currentStock: 48, parLevel: 50, maxStock: 80, reorderQty: 10, seasonBuffer: 0, condition: "good", lifecycle: "60 months", perRoomType: { standard: 1, deluxe: 1, suite: 1, presidential: 2 }, unit: "Pcs", unitCost: 1200 },
  { id: "AM-025", name: "Flashlight (LED)", category: "safety", currentStock: 35, parLevel: 50, maxStock: 80, reorderQty: 15, seasonBuffer: 0, condition: "good", lifecycle: "36 months", perRoomType: { standard: 1, deluxe: 1, suite: 1, presidential: 1 }, unit: "Pcs", unitCost: 280 },
  { id: "AM-026", name: "First Aid Kit", category: "safety", currentStock: 25, parLevel: 50, maxStock: 80, reorderQty: 15, seasonBuffer: 0, condition: "good", lifecycle: "12 months", perRoomType: { standard: 1, deluxe: 1, suite: 1, presidential: 1 }, unit: "Pcs", unitCost: 650 },
  { id: "AM-027", name: "Notepad (A5)", category: "stationery", currentStock: 500, parLevel: 300, maxStock: 800, reorderQty: 200, seasonBuffer: 0.2, condition: "new", lifecycle: "6 months", perRoomType: { standard: 1, deluxe: 1, suite: 2, presidential: 2 }, unit: "Pcs", unitCost: 25 },
  { id: "AM-028", name: "Pen (Branded)", category: "stationery", currentStock: 420, parLevel: 300, maxStock: 800, reorderQty: 200, seasonBuffer: 0.2, condition: "new", lifecycle: "3 months", perRoomType: { standard: 2, deluxe: 2, suite: 3, presidential: 4 }, unit: "Pcs", unitCost: 18 },
  { id: "AM-029", name: "Envelope Set", category: "stationery", currentStock: 180, parLevel: 200, maxStock: 500, reorderQty: 100, seasonBuffer: 0.2, condition: "new", lifecycle: "6 months", perRoomType: { standard: 2, deluxe: 2, suite: 3, presidential: 4 }, unit: "Sets", unitCost: 30 },
  { id: "AM-030", name: "Folder (Welcome Kit)", category: "stationery", currentStock: 90, parLevel: 150, maxStock: 400, reorderQty: 80, seasonBuffer: 0.2, condition: "new", lifecycle: "6 months", perRoomType: { standard: 1, deluxe: 1, suite: 1, presidential: 1 }, unit: "Pcs", unitCost: 65 },
  { id: "AM-031", name: "Cushion Covers", category: "living_room", currentStock: 40, parLevel: 60, maxStock: 120, reorderQty: 30, seasonBuffer: 0.2, condition: "good", lifecycle: "18 months", perRoomType: { standard: 0, deluxe: 2, suite: 4, presidential: 6 }, unit: "Pcs", unitCost: 380 },
  { id: "AM-032", name: "Throws (Decorative)", category: "living_room", currentStock: 18, parLevel: 30, maxStock: 60, reorderQty: 15, seasonBuffer: 0.3, condition: "good", lifecycle: "24 months", perRoomType: { standard: 0, deluxe: 1, suite: 2, presidential: 3 }, unit: "Pcs", unitCost: 950 },
  { id: "AM-033", name: "Magazines (Assorted)", category: "living_room", currentStock: 80, parLevel: 60, maxStock: 150, reorderQty: 30, seasonBuffer: 0.4, condition: "new", lifecycle: "1 month", perRoomType: { standard: 0, deluxe: 2, suite: 3, presidential: 5 }, unit: "Pcs", unitCost: 120 },
];

const MOCK_TRANSACTIONS: StockTransaction[] = [
  { id: "TX-001", itemId: "AM-005", itemName: "Bath Towels (White)", type: "purchase", qty: 200, date: "2025-01-15T09:15:00", from: "Vendor", to: "Main Store", reference: "PO-2025-001", by: "Anita S." },
  { id: "TX-002", itemId: "AM-002", itemName: "Pillow Covers", type: "issued_to_room", qty: 40, date: "2025-01-15T10:30:00", from: "Main Store", to: "Room 301-320", by: "Ramesh K." },
  { id: "TX-003", itemId: "AM-016", itemName: "Soap (Herbal 30g)", type: "issued_to_room", qty: 100, date: "2025-01-15T08:00:00", from: "Main Store", to: "All Floors", by: "Priya N." },
  { id: "TX-004", itemId: "AM-007", itemName: "Hand Towels", type: "returned", qty: 15, date: "2025-01-14T16:20:00", from: "Laundry", to: "Main Store", by: "Sunil R." },
  { id: "TX-005", itemId: "AM-009", itemName: "Chocolates (Premium)", type: "damaged", qty: 8, date: "2025-01-14T14:00:00", from: "Minibar Store", notes: "Melted during transit", by: "Raj M." },
  { id: "TX-006", itemId: "AM-021", itemName: "TV Remote (Universal)", type: "lost", qty: 3, date: "2025-01-14T11:30:00", from: "Rooms 505, 507, 512", notes: "Missing at checkout", by: "Front Office" },
  { id: "TX-007", itemId: "AM-011", itemName: "Water Bottles (1L)", type: "season_stock_up", qty: 200, date: "2025-01-13T09:00:00", from: "Vendor", to: "Main Store", reference: "SEASON-2025-Q2", by: "Auto-Reorder" },
  { id: "TX-008", itemId: "AM-014", itemName: "Iron (Steam Press)", type: "adjustment", qty: -2, date: "2025-01-13T15:00:00", notes: "Audit correction — physical count variance", by: "Finance Dept" },
  { id: "TX-009", itemId: "AM-005", itemName: "Bath Towels (White)", type: "transfer", qty: 50, date: "2025-01-12T10:00:00", from: "Main Store", to: "Pool Store", by: "Vikram P." },
  { id: "TX-010", itemId: "AM-017", itemName: "Shampoo (40ml)", type: "purchase", qty: 500, date: "2025-01-11T11:30:00", from: "Premium Supplies Co", to: "Main Store", reference: "PO-2025-003", by: "Anita S." },
  { id: "TX-011", itemId: "AM-031", itemName: "Cushion Covers", type: "issued_to_room", qty: 12, date: "2025-01-10T14:00:00", from: "Main Store", to: "Suites 601-606", by: "Ramesh K." },
  { id: "TX-012", itemId: "AM-028", itemName: "Pen (Branded)", type: "issued_to_room", qty: 60, date: "2025-01-10T08:30:00", from: "Main Store", to: "All Rooms", by: "Housekeeping" },
];

const MOCK_SEASONS: SeasonConfig[] = [
  { id: "S-001", name: "Peak Summer", category: "minibar", multiplier: 1.5, startDate: "2025-04-01", endDate: "2025-06-30", autoReorder: true, active: true },
  { id: "S-002", name: "Peak Summer", category: "bathroom_amenity", multiplier: 1.4, startDate: "2025-04-01", endDate: "2025-06-30", autoReorder: true, active: true },
  { id: "S-003", name: "Peak Summer", category: "bathroom_linen", multiplier: 1.3, startDate: "2025-04-01", endDate: "2025-06-30", autoReorder: false, active: true },
  { id: "S-004", name: "Monsoon", category: "bedroom_linen", multiplier: 1.2, startDate: "2025-07-01", endDate: "2025-09-30", autoReorder: true, active: false },
  { id: "S-005", name: "Monsoon", category: "bathroom_linen", multiplier: 1.4, startDate: "2025-07-01", endDate: "2025-09-30", autoReorder: true, active: false },
  { id: "S-006", name: "Winter Festive", category: "bedroom_linen", multiplier: 1.3, startDate: "2025-11-01", endDate: "2026-01-31", autoReorder: true, active: false },
  { id: "S-007", name: "Winter Festive", category: "living_room", multiplier: 1.5, startDate: "2025-11-01", endDate: "2026-01-31", autoReorder: false, active: false },
  { id: "S-008", name: "Conference Season", category: "stationery", multiplier: 2.0, startDate: "2025-03-01", endDate: "2025-03-31", autoReorder: true, active: true },
  { id: "S-009", name: "Peak Summer", category: "living_room", multiplier: 1.2, startDate: "2025-04-01", endDate: "2025-06-30", autoReorder: false, active: true },
];

const MOCK_INSPECTIONS: InspectionRecord[] = [
  { id: "INS-001", amenityItemId: "AM-004", amenityItemName: "Blanket (Wool)", condition: "fair", actionRequired: "Replace 10 blankets — visible wear and thinning", priority: "medium", status: "open", inspectedBy: "Sunita Devi", department: "housekeeping", date: "2025-01-15T10:00:00", notes: "Found during quarterly inspection of Floor 3-4" },
  { id: "INS-002", amenityItemId: "AM-014", amenityItemName: "Iron (Steam Press)", condition: "fair", actionRequired: "Service 5 irons — inconsistent heating", priority: "high", status: "in_progress", inspectedBy: "Rajesh Kumar", department: "engineering", date: "2025-01-14T14:30:00", notes: "Guest complaint from Room 402 about iron not heating properly" },
  { id: "INS-003", amenityItemId: "AM-022", amenityItemName: "Hair Dryer (1600W)", condition: "poor", actionRequired: "Replace 3 units — motor failure", priority: "critical", status: "open", inspectedBy: "Rajesh Kumar", department: "engineering", date: "2025-01-14T11:00:00" },
  { id: "INS-004", amenityItemId: "AM-007", amenityItemName: "Hand Towels", condition: "fair", actionRequired: "Launder with extra bleach — visible discoloration", priority: "low", status: "resolved", inspectedBy: "Sunita Devi", department: "housekeeping", date: "2025-01-13T09:00:00", resolvedDate: "2025-01-14T16:00:00" },
  { id: "INS-005", amenityItemId: "AM-023", amenityItemName: "Safe (Electronic)", condition: "good", actionRequired: "Reset codes for 2 safes — guest locked out", priority: "high", status: "resolved", inspectedBy: "Amit Patel", department: "engineering", date: "2025-01-12T15:00:00", resolvedDate: "2025-01-12T16:30:00", notes: "Rooms 501 & 505 — codes reset successfully" },
  { id: "INS-006", amenityItemId: "AM-032", amenityItemName: "Throws (Decorative)", condition: "fair", actionRequired: "Dry clean 6 throws — stains visible", priority: "medium", status: "in_progress", inspectedBy: "Meena Kumari", department: "housekeeping", date: "2025-01-12T10:30:00" },
  { id: "INS-007", amenityItemId: "AM-026", amenityItemName: "First Aid Kit", condition: "poor", actionRequired: "Restock all kits — expired medicines in 15 kits", priority: "critical", status: "open", inspectedBy: "Dr. Anand", department: "housekeeping", date: "2025-01-11T09:00:00", notes: "Safety compliance issue — must resolve within 48 hours" },
  { id: "INS-008", amenityItemId: "AM-013", amenityItemName: "Electric Kettle (1.5L)", condition: "good", actionRequired: "Descale 8 kettles — mineral buildup", priority: "low", status: "closed", inspectedBy: "Rajesh Kumar", department: "engineering", date: "2025-01-10T14:00:00", resolvedDate: "2025-01-11T10:00:00" },
];

// ─── HELPER FUNCTIONS ───────────────────────────────────────────────

function getActiveSeasonMultiplier(category: AmenityCategory): number {
  const activeSeasons = MOCK_SEASONS.filter((s) => s.category === category && s.active);
  if (activeSeasons.length === 0) return 1;
  return Math.max(...activeSeasons.map((s) => s.multiplier));
}

function calculateAdjustedPAR(item: AmenityItem): number {
  const multiplier = getActiveSeasonMultiplier(item.category);
  return Math.ceil(item.parLevel * multiplier);
}

function calculateReorderNeeded(item: AmenityItem): number {
  const adjustedPAR = calculateAdjustedPAR(item);
  if (item.currentStock >= adjustedPAR) return 0;
  const needed = adjustedPAR - item.currentStock;
  // Round up to reorder quantity multiples
  return Math.ceil(needed / item.reorderQty) * item.reorderQty;
}

function isBelowPAR(item: AmenityItem): boolean {
  return item.currentStock < calculateAdjustedPAR(item);
}

function stockStatus(item: AmenityItem): "ok" | "low" | "critical" {
  const adjustedPAR = calculateAdjustedPAR(item);
  if (item.currentStock >= adjustedPAR) return "ok";
  if (item.currentStock >= adjustedPAR * 0.5) return "low";
  return "critical";
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

  // ─── Computed values ───
  const totalPOs = MOCK_PURCHASE_ORDERS.length;
  const pendingApprovals = MOCK_PURCHASE_ORDERS.filter((po) => po.status === "submitted").length;
  const itemsBelowPAR = MOCK_AMENITIES.filter((a) => isBelowPAR(a)).length;
  const activeSeasons = MOCK_SEASONS.filter((s) => s.active).length;

  const filteredPOs = useMemo(() => {
    return MOCK_PURCHASE_ORDERS.filter((po) => {
      const matchesSearch = po.poNumber.toLowerCase().includes(poSearch.toLowerCase()) ||
        po.vendor.toLowerCase().includes(poSearch.toLowerCase());
      const matchesStatus = poStatusFilter === "all" || po.status === poStatusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [poSearch, poStatusFilter]);

  const filteredAmenities = useMemo(() => {
    return MOCK_AMENITIES.filter((a) => {
      const matchesCategory = amenityCategory === "all" || a.category === amenityCategory;
      const matchesBelowPAR = !showBelowParOnly || isBelowPAR(a);
      const matchesSearch = a.name.toLowerCase().includes(search.toLowerCase());
      return matchesCategory && matchesBelowPAR && matchesSearch;
    });
  }, [amenityCategory, showBelowParOnly, search]);

  const filteredTransactions = useMemo(() => {
    return MOCK_TRANSACTIONS.filter((tx) => {
      const matchesType = txTypeFilter === "all" || tx.type === txTypeFilter;
      const matchesFrom = !txDateFrom || new Date(tx.date) >= new Date(txDateFrom);
      const matchesTo = !txDateTo || new Date(tx.date) <= new Date(txDateTo + "T23:59:59");
      return matchesType && matchesFrom && matchesTo;
    });
  }, [txTypeFilter, txDateFrom, txDateTo]);

  const totalPOValue = MOCK_PURCHASE_ORDERS.reduce((sum, po) => sum + po.totalAmount, 0);
  const totalReorderValue = MOCK_AMENITIES.reduce((sum, a) => {
    const reorder = calculateReorderNeeded(a);
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
          <Button variant="outline" size="sm" className="h-9"><Download className="h-3.5 w-3.5 mr-1" /> Export</Button>
          <Button className="bg-navy hover:bg-navy-light text-white h-9" onClick={() => setShowNewPO(true)}><Plus className="h-4 w-4 mr-1" /> New PO</Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Total POs" value={totalPOs} icon={ClipboardList} accent="navy" delta={12} deltaLabel="vs last month" />
        <KpiCard label="Pending Approvals" value={pendingApprovals} icon={Clock} accent="warning" />
        <KpiCard label="Items Below PAR" value={itemsBelowPAR} icon={AlertTriangle} accent="error" hint={`${fmtINR(totalReorderValue)} reorder value`} />
        <KpiCard label="Active Seasons" value={activeSeasons} icon={Sun} accent="info" hint="Affecting PAR levels" />
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
              const count = MOCK_PURCHASE_ORDERS.filter((po) => po.status === status).length;
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
                      <p className="text-lg font-bold tabular-nums">{count}</p>
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
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-[11px]">PO #</TableHead>
                      <TableHead className="text-[11px]">Vendor</TableHead>
                      <TableHead className="text-[11px]">Items</TableHead>
                      <TableHead className="text-[11px] text-right">Amount</TableHead>
                      <TableHead className="text-[11px]">Status</TableHead>
                      <TableHead className="text-[11px]">Created</TableHead>
                      <TableHead className="text-[11px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPOs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-xs text-muted-foreground py-8">
                          No purchase orders found
                        </TableCell>
                      </TableRow>
                    ) : filteredPOs.map((po) => {
                      const st = PO_STATUS_META[po.status];
                      const StIcon = st.icon;
                      return (
                        <TableRow key={po.id} className="hover:bg-muted/50 cursor-pointer" onClick={() => setShowPODetail(po)}>
                          <TableCell className="text-xs font-mono text-navy font-semibold">{po.poNumber}</TableCell>
                          <TableCell className="text-xs font-medium">{po.vendor}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{po.lineItems.map((li) => li.item).join(", ").substring(0, 40)}{po.lineItems.map((li) => li.item).join(", ").length > 40 ? "..." : ""}</TableCell>
                          <TableCell className="text-xs text-right tabular-nums font-semibold">{fmtINR(po.totalAmount)}</TableCell>
                          <TableCell>
                            <span className={cn("inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-medium", st.cls)}>
                              <StIcon className="h-3 w-3" />
                              {st.label}
                            </span>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">{fmtDate(po.createdDate)}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                              {po.status === "draft" && (
                                <Button variant="ghost" size="sm" className="h-6 text-[10px] px-1.5 text-[#D97706] hover:text-[#B45309]">
                                  <Send className="h-3 w-3 mr-0.5" /> Submit
                                </Button>
                              )}
                              {po.status === "submitted" && (
                                <Button variant="ghost" size="sm" className="h-6 text-[10px] px-1.5 text-[#16A34A] hover:text-[#14532D]">
                                  <ThumbsUp className="h-3 w-3 mr-0.5" /> Approve
                                </Button>
                              )}
                              {po.status === "approved" && (
                                <Button variant="ghost" size="sm" className="h-6 text-[10px] px-1.5 text-[#0369A1] hover:text-[#1B3A6B]">
                                  <Inbox className="h-3 w-3 mr-0.5" /> Receive
                                </Button>
                              )}
                              {(po.status === "draft" || po.status === "submitted") && (
                                <Button variant="ghost" size="sm" className="h-6 text-[10px] px-1.5 text-[#DC2626] hover:text-[#991B1B]">
                                  <XCircle className="h-3 w-3" />
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
            {(Object.entries(amenitiesByCategory) as [AmenityCategory, AmenityItem[]][]).map(([catKey, items]) => {
              const catMeta = CATEGORY_META[catKey];
              const CatIcon = catMeta.icon;
              const belowParCount = items.filter((a) => isBelowPAR(a)).length;
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
                          <Badge className="text-[10px] bg-[#FFE4E6] text-[#881337] border-[#DC2626]">
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
                              <TableHead className="text-[10px]">ID</TableHead>
                              <TableHead className="text-[10px]">Item Name</TableHead>
                              <TableHead className="text-[10px] text-center">Current Stock</TableHead>
                              <TableHead className="text-[10px] text-center">PAR Level</TableHead>
                              <TableHead className="text-[10px] text-center">Adjusted PAR</TableHead>
                              <TableHead className="text-[10px] text-center">Max Stock</TableHead>
                              <TableHead className="text-[10px] text-center">Reorder Qty</TableHead>
                              <TableHead className="text-[10px] text-center">Season Buffer</TableHead>
                              <TableHead className="text-[10px]">Condition</TableHead>
                              <TableHead className="text-[10px]">Lifecycle</TableHead>
                              <TableHead className="text-[10px] text-center">Std</TableHead>
                              <TableHead className="text-[10px] text-center">Deluxe</TableHead>
                              <TableHead className="text-[10px] text-center">Suite</TableHead>
                              <TableHead className="text-[10px] text-center">Pres.</TableHead>
                              <TableHead className="text-[10px] text-right">Reorder Need</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {items.map((item) => {
                              const adjustedPAR = calculateAdjustedPAR(item);
                              const reorderNeed = calculateReorderNeeded(item);
                              const below = isBelowPAR(item);
                              const condMeta = CONDITION_META[item.condition];
                              const stStatus = stockStatus(item);

                              return (
                                <TableRow
                                  key={item.id}
                                  className={cn(
                                    "hover:bg-muted/50",
                                    below && "bg-[#FFF5F5] dark:bg-[#FFE4E6]/10",
                                    stStatus === "critical" && "bg-[#FFE4E6]/50 dark:bg-[#FFE4E6]/10"
                                  )}
                                >
                                  <TableCell className="text-[10px] font-mono text-muted-foreground">{item.id}</TableCell>
                                  <TableCell className="text-xs font-medium">{item.name}</TableCell>
                                  <TableCell className={cn("text-xs text-center tabular-nums font-semibold", below ? "text-[#DC2626]" : "text-foreground")}>
                                    {item.currentStock} {item.unit}
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
                                  <TableCell className="text-[10px] text-muted-foreground">{item.lifecycle}</TableCell>
                                  <TableCell className="text-[10px] text-center tabular-nums">{item.perRoomType.standard}</TableCell>
                                  <TableCell className="text-[10px] text-center tabular-nums">{item.perRoomType.deluxe}</TableCell>
                                  <TableCell className="text-[10px] text-center tabular-nums">{item.perRoomType.suite}</TableCell>
                                  <TableCell className="text-[10px] text-center tabular-nums">{item.perRoomType.presidential}</TableCell>
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
                            {fmtINR(items.reduce((sum, a) => sum + calculateReorderNeeded(a) * a.unitCost, 0))}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  )}
                </Card>
              );
            })}
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
              <RefreshCw className="h-3 w-3 mr-1" /> Reset
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
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-[11px]">ID</TableHead>
                      <TableHead className="text-[11px]">Item</TableHead>
                      <TableHead className="text-[11px]">Type</TableHead>
                      <TableHead className="text-[11px] text-right">Qty</TableHead>
                      <TableHead className="text-[11px]">From</TableHead>
                      <TableHead className="text-[11px]">To</TableHead>
                      <TableHead className="text-[11px]">Reference</TableHead>
                      <TableHead className="text-[11px]">By</TableHead>
                      <TableHead className="text-[11px]">Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTransactions.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center text-xs text-muted-foreground py-8">
                          No transactions found for the selected filters
                        </TableCell>
                      </TableRow>
                    ) : filteredTransactions.map((tx) => {
                      const typeMeta = TRANSACTION_TYPE_META[tx.type];
                      const TypeIcon = typeMeta.icon;
                      return (
                        <TableRow key={tx.id} className="hover:bg-muted/50">
                          <TableCell className="text-[10px] font-mono text-muted-foreground">{tx.id}</TableCell>
                          <TableCell className="text-xs font-medium">{tx.itemName}</TableCell>
                          <TableCell>
                            <span className={cn("inline-flex items-center gap-0.5 text-[10px] font-medium", typeMeta.cls)}>
                              <TypeIcon className="h-3 w-3" />
                              {typeMeta.label}
                            </span>
                          </TableCell>
                          <TableCell className={cn("text-xs text-right tabular-nums font-semibold", tx.qty >= 0 ? "text-[#16A34A]" : "text-[#DC2626]")}>
                            {tx.qty >= 0 ? "+" : ""}{tx.qty}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">{tx.from || "—"}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{tx.to || "—"}</TableCell>
                          <TableCell className="text-[10px] font-mono text-muted-foreground">{tx.reference || "—"}</TableCell>
                          <TableCell className="text-xs">{tx.by}</TableCell>
                          <TableCell className="text-[10px] text-muted-foreground">{fmtDateTime(tx.date)}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
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
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {(Object.entries(CATEGORY_META) as [AmenityCategory, typeof CATEGORY_META[AmenityCategory]][]).map(([catKey, catMeta]) => {
                  const CatIcon = catMeta.icon;
                  const multiplier = getActiveSeasonMultiplier(catKey);
                  const activeSeasonsForCat = MOCK_SEASONS.filter((s) => s.category === catKey && s.active);
                  const itemsInCat = MOCK_AMENITIES.filter((a) => a.category === catKey);
                  const belowPAR = itemsInCat.filter((a) => isBelowPAR(a)).length;

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
            </CardContent>
          </Card>

          {/* Season Configurations Table */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-navy" /> Season Configurations
                </CardTitle>
                <Button size="sm" className="bg-navy hover:bg-navy-light text-white h-7 text-xs">
                  <Plus className="h-3 w-3 mr-1" /> Add Season
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
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
                      <TableHead className="text-[11px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {MOCK_SEASONS.map((season) => {
                      const catMeta = CATEGORY_META[season.category];
                      const CatIcon = catMeta.icon;
                      const effectPercent = ((season.multiplier - 1) * 100).toFixed(0);

                      return (
                        <TableRow key={season.id} className={cn("hover:bg-muted/50", !season.active && "opacity-60")}>
                          <TableCell className="text-xs font-semibold flex items-center gap-1.5">
                            {season.name.includes("Summer") && <Sun className="h-3 w-3 text-[#D97706]" />}
                            {season.name.includes("Monsoon") && <CloudRain className="h-3 w-3 text-[#0284C7]" />}
                            {season.name.includes("Winter") && <Snowflake className="h-3 w-3 text-[#0369A1]" />}
                            {season.name.includes("Conference") && <FileText className="h-3 w-3 text-[#7C3AED]" />}
                            {season.name}
                          </TableCell>
                          <TableCell>
                            <span className="inline-flex items-center gap-1 text-xs">
                              <CatIcon className="h-3 w-3" style={{ color: catMeta.color }} />
                              {catMeta.label}
                            </span>
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
                            <Switch checked={season.active} disabled className="scale-75" />
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button variant="ghost" size="sm" className="h-6 text-[10px] px-1.5"><Edit3 className="h-3 w-3" /></Button>
                              <Button variant="ghost" size="sm" className="h-6 text-[10px] px-1.5 text-[#DC2626]"><Trash2 className="h-3 w-3" /></Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══════════════ INSPECTIONS TAB ═══════════════ */}
        <TabsContent value="inspections" className="mt-4">
          {/* Inspection Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            {(["open", "in_progress", "resolved", "closed"] as InspectionStatus[]).map((status) => {
              const meta = INSPECTION_STATUS_META[status];
              const count = MOCK_INSPECTIONS.filter((i) => i.status === status).length;
              return (
                <Card key={status}>
                  <CardContent className="p-3 flex items-center gap-3">
                    <div className={cn("h-2.5 w-2.5 rounded-full", meta.cls.split(" ")[0].replace("bg-", "bg-"))} style={{ backgroundColor: status === "open" ? "#D97706" : status === "in_progress" ? "#0369A1" : status === "resolved" ? "#16A34A" : "#6B7280" }} />
                    <div>
                      <p className="text-lg font-bold tabular-nums">{count}</p>
                      <p className="text-[10px] text-muted-foreground">{meta.label}</p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Critical inspections alert */}
          {MOCK_INSPECTIONS.filter((i) => i.priority === "critical" && i.status !== "closed" && i.status !== "resolved").length > 0 && (
            <div className="rounded-lg border border-[#DC2626]/30 bg-[#FFE4E6]/50 p-3 mb-4 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-[#DC2626] mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-semibold text-[#DC2626]">Critical Inspections Require Attention</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {MOCK_INSPECTIONS.filter((i) => i.priority === "critical" && i.status !== "closed" && i.status !== "resolved").length} items have critical priority and need immediate action.
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
                  <Badge variant="secondary" className="text-[10px]">{MOCK_INSPECTIONS.length}</Badge>
                </CardTitle>
                <Button size="sm" className="bg-navy hover:bg-navy-light text-white h-7 text-xs" onClick={() => setShowNewInspection(true)}>
                  <Plus className="h-3 w-3 mr-1" /> Log Inspection
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-[11px]">ID</TableHead>
                      <TableHead className="text-[11px]">Item</TableHead>
                      <TableHead className="text-[11px]">Condition</TableHead>
                      <TableHead className="text-[11px]">Action Required</TableHead>
                      <TableHead className="text-[11px]">Priority</TableHead>
                      <TableHead className="text-[11px]">Status</TableHead>
                      <TableHead className="text-[11px]">Dept</TableHead>
                      <TableHead className="text-[11px]">Inspected By</TableHead>
                      <TableHead className="text-[11px]">Date</TableHead>
                      <TableHead className="text-[11px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {MOCK_INSPECTIONS.map((insp) => {
                      const condMeta = CONDITION_META[insp.condition];
                      const prioMeta = PRIORITY_META[insp.priority];
                      const statusMeta = INSPECTION_STATUS_META[insp.status];

                      return (
                        <TableRow
                          key={insp.id}
                          className={cn(
                            "hover:bg-muted/50 cursor-pointer",
                            insp.priority === "critical" && insp.status === "open" && "bg-[#FFE4E6]/30 dark:bg-[#FFE4E6]/10"
                          )}
                          onClick={() => setShowInspectionDetail(insp)}
                        >
                          <TableCell className="text-[10px] font-mono text-muted-foreground">{insp.id}</TableCell>
                          <TableCell className="text-xs font-medium">{insp.amenityItemName}</TableCell>
                          <TableCell>
                            <span className={cn("inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-medium", condMeta.cls)}>
                              {condMeta.label}
                            </span>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate" title={insp.actionRequired}>
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
                          <TableCell className="text-[10px] capitalize">{insp.department === "housekeeping" ? "HK" : "Eng"}</TableCell>
                          <TableCell className="text-xs">{insp.inspectedBy}</TableCell>
                          <TableCell className="text-[10px] text-muted-foreground">{fmtDateTime(insp.date)}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                              {insp.status === "open" && (
                                <Button variant="ghost" size="sm" className="h-6 text-[10px] px-1.5 text-[#0369A1]">
                                  <Play className="h-3 w-3" /> Start
                                </Button>
                              )}
                              {insp.status === "in_progress" && (
                                <Button variant="ghost" size="sm" className="h-6 text-[10px] px-1.5 text-[#16A34A]">
                                  <CheckCircle2 className="h-3 w-3" /> Resolve
                                </Button>
                              )}
                              <Button variant="ghost" size="sm" className="h-6 text-[10px] px-1.5">
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
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ═══════════════ NEW PO DIALOG ═══════════════ */}
      <Dialog open={showNewPO} onOpenChange={setShowNewPO}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-navy" /> Create New Purchase Order
            </DialogTitle>
            <DialogDescription>Add line items and submit for approval</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Vendor</Label>
                <Select>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Select vendor" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="linen">Linen Solutions Pvt Ltd</SelectItem>
                    <SelectItem value="cleanpro">CleanPro Chemicals</SelectItem>
                    <SelectItem value="premium">Premium Supplies Co</SelectItem>
                    <SelectItem value="techkey">TechKey Solutions</SelectItem>
                    <SelectItem value="coffee">Coffee Bean Traders</SelectItem>
                    <SelectItem value="safehouse">SafeHouse Security</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">PO Date</Label>
                <Input type="date" className="h-9 text-xs" defaultValue={new Date().toISOString().split("T")[0]} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Notes</Label>
              <Textarea className="text-xs" placeholder="Add any notes or special instructions..." rows={2} />
            </div>

            {/* Line Items */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold">Line Items</Label>
                <Button variant="outline" size="sm" className="h-7 text-xs">
                  <Plus className="h-3 w-3 mr-1" /> Add Item
                </Button>
              </div>
              <div className="rounded-lg border border-border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-[10px]">Item</TableHead>
                      <TableHead className="text-[10px]">Category</TableHead>
                      <TableHead className="text-[10px] text-right">Qty</TableHead>
                      <TableHead className="text-[10px] text-right">Unit Price</TableHead>
                      <TableHead className="text-[10px] text-right">Total</TableHead>
                      <TableHead className="text-[10px] w-8"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="text-xs">
                        <Input className="h-7 text-xs" placeholder="Item name" />
                      </TableCell>
                      <TableCell className="text-xs">
                        <Select>
                          <SelectTrigger className="h-7 text-[10px] w-32">
                            <SelectValue placeholder="Category" />
                          </SelectTrigger>
                          <SelectContent>
                            {(Object.entries(CATEGORY_META) as [AmenityCategory, typeof CATEGORY_META[AmenityCategory]][]).map(([key, meta]) => (
                              <SelectItem key={key} value={key}>{meta.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-xs text-right">
                        <Input type="number" className="h-7 text-xs w-16 text-right" placeholder="0" />
                      </TableCell>
                      <TableCell className="text-xs text-right">
                        <Input type="number" className="h-7 text-xs w-24 text-right" placeholder="₹0" />
                      </TableCell>
                      <TableCell className="text-xs text-right tabular-nums font-semibold">₹0</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-[#DC2626]">
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
              <div className="flex justify-end">
                <div className="text-right">
                  <span className="text-xs text-muted-foreground">Total Amount</span>
                  <p className="text-lg font-bold tabular-nums">{fmtINR(0)}</p>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowNewPO(false)} className="h-9">Cancel</Button>
            <Button variant="outline" className="h-9"><FileText className="h-3.5 w-3.5 mr-1" /> Save Draft</Button>
            <Button className="bg-navy hover:bg-navy-light text-white h-9" onClick={() => setShowNewPO(false)}>
              <Send className="h-3.5 w-3.5 mr-1" /> Submit for Approval
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
              <DialogDescription>{showPODetail.vendor}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              {/* PO Info Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <p className="text-[10px] text-muted-foreground">Created</p>
                  <p className="text-xs font-medium">{fmtDate(showPODetail.createdDate)}</p>
                </div>
                {showPODetail.submittedDate && (
                  <div>
                    <p className="text-[10px] text-muted-foreground">Submitted</p>
                    <p className="text-xs font-medium">{fmtDate(showPODetail.submittedDate)}</p>
                  </div>
                )}
                {showPODetail.approvedDate && (
                  <div>
                    <p className="text-[10px] text-muted-foreground">Approved</p>
                    <p className="text-xs font-medium">{fmtDate(showPODetail.approvedDate)}</p>
                  </div>
                )}
                {showPODetail.receivedDate && (
                  <div>
                    <p className="text-[10px] text-muted-foreground">Received</p>
                    <p className="text-xs font-medium">{fmtDate(showPODetail.receivedDate)}</p>
                  </div>
                )}
              </div>

              {/* Line Items */}
              <div className="rounded-lg border border-border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-[10px]">Item</TableHead>
                      <TableHead className="text-[10px]">Category</TableHead>
                      <TableHead className="text-[10px] text-right">Qty</TableHead>
                      <TableHead className="text-[10px] text-right">Unit Price</TableHead>
                      <TableHead className="text-[10px] text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {showPODetail.lineItems.map((li) => {
                      const catMeta = CATEGORY_META[li.category];
                      return (
                        <TableRow key={li.id}>
                          <TableCell className="text-xs font-medium">{li.item}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{catMeta.label}</TableCell>
                          <TableCell className="text-xs text-right tabular-nums">{li.qty}</TableCell>
                          <TableCell className="text-xs text-right tabular-nums">{fmtINR(li.unitPrice)}</TableCell>
                          <TableCell className="text-xs text-right tabular-nums font-semibold">{fmtINR(li.total)}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
                <div className="border-t border-border px-4 py-2 flex justify-between bg-muted/30">
                  <span className="text-xs font-semibold">Total</span>
                  <span className="text-sm font-bold tabular-nums">{fmtINR(showPODetail.totalAmount)}</span>
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
                <Button className="bg-[#16A34A] hover:bg-[#14532D] text-white h-9">
                  <ThumbsUp className="h-3.5 w-3.5 mr-1" /> Approve PO
                </Button>
              )}
              {showPODetail.status === "approved" && (
                <Button className="bg-[#0369A1] hover:bg-[#1B3A6B] text-white h-9">
                  <Inbox className="h-3.5 w-3.5 mr-1" /> Mark Received
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>

      {/* ═══════════════ NEW INSPECTION DIALOG ═══════════════ */}
      <Dialog open={showNewInspection} onOpenChange={setShowNewInspection}>
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
                <Label className="text-xs">Amenity Item</Label>
                <Select>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Select item" />
                  </SelectTrigger>
                  <SelectContent className="max-h-48">
                    {MOCK_AMENITIES.map((a) => (
                      <SelectItem key={a.id} value={a.id}>{a.name} ({CATEGORY_META[a.category].label})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Condition</Label>
                <Select>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Select condition" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">New</SelectItem>
                    <SelectItem value="good">Good</SelectItem>
                    <SelectItem value="fair">Fair</SelectItem>
                    <SelectItem value="poor">Poor</SelectItem>
                    <SelectItem value="damaged">Damaged</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Priority</Label>
                <Select>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Department</Label>
                <Select>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="housekeeping">Housekeeping</SelectItem>
                    <SelectItem value="engineering">Engineering</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Action Required</Label>
              <Textarea className="text-xs" placeholder="Describe the issue and required action..." rows={2} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Additional Notes</Label>
              <Textarea className="text-xs" placeholder="Any additional observations..." rows={2} />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowNewInspection(false)} className="h-9">Cancel</Button>
            <Button className="bg-navy hover:bg-navy-light text-white h-9" onClick={() => setShowNewInspection(false)}>
              <ClipboardCheck className="h-3.5 w-3.5 mr-1" /> Log Inspection
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
                {showInspectionDetail.id} — {showInspectionDetail.amenityItemName}
              </DialogTitle>
              <DialogDescription>Inspection Detail</DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[10px] text-muted-foreground">Condition</p>
                  <span className={cn("inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-medium mt-0.5", CONDITION_META[showInspectionDetail.condition].cls)}>
                    {CONDITION_META[showInspectionDetail.condition].label}
                  </span>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">Priority</p>
                  <span className={cn("inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-medium mt-0.5", PRIORITY_META[showInspectionDetail.priority].cls)}>
                    {PRIORITY_META[showInspectionDetail.priority].label}
                  </span>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">Status</p>
                  <span className={cn("inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-medium mt-0.5", INSPECTION_STATUS_META[showInspectionDetail.status].cls)}>
                    {INSPECTION_STATUS_META[showInspectionDetail.status].label}
                  </span>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">Department</p>
                  <p className="text-xs font-medium capitalize">{showInspectionDetail.department === "housekeeping" ? "Housekeeping" : "Engineering"}</p>
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
                  <p className="text-xs font-medium">{fmtDateTime(showInspectionDetail.date)}</p>
                </div>
                {showInspectionDetail.resolvedDate && (
                  <div>
                    <p className="text-[10px] text-muted-foreground">Resolved Date</p>
                    <p className="text-xs font-medium">{fmtDateTime(showInspectionDetail.resolvedDate)}</p>
                  </div>
                )}
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setShowInspectionDetail(null)} className="h-9">Close</Button>
              {showInspectionDetail.status === "open" && (
                <Button className="bg-[#0369A1] hover:bg-[#1B3A6B] text-white h-9">
                  <Play className="h-3.5 w-3.5 mr-1" /> Start Work
                </Button>
              )}
              {showInspectionDetail.status === "in_progress" && (
                <Button className="bg-[#16A34A] hover:bg-[#14532D] text-white h-9">
                  <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Mark Resolved
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}

// CloudRain icon — not available in lucide-react by default, use a workaround
function CloudRain(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242" />
      <path d="M8 19v1" />
      <path d="M8 14v1" />
      <path d="M16 19v1" />
      <path d="M16 14v1" />
      <path d="M12 21v1" />
      <path d="M12 16v1" />
    </svg>
  );
}
