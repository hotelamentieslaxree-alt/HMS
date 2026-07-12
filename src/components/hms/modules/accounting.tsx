// ARIA HMS — Accounting Module (5 tabs: Chart of Accounts, Journal Entries, Billing Verification, Budget, Trial Balance)
"use client";

import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/lib/store";
import { KpiCard, fmtINR, fmtDate } from "../shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import {
  BookOpen, FileText, ClipboardCheck, PieChart, Scale,
  Plus, Search, Download, Filter, ChevronRight, ChevronDown,
  ArrowUpRight, ArrowDownRight, IndianRupee, TrendingUp,
  CheckCircle2, XCircle, AlertTriangle, Edit, Trash2,
  Hash, Calendar, Building2, Wallet, Landmark,
  ArrowRightLeft, Eye, Ban, ChevronLeft, ChevronRight as ChevronRightIcon,
} from "lucide-react";

// ─── TYPES ────────────────────────────────────────────────────────────────

interface Account {
  code: string;
  name: string;
  type: "asset" | "liability" | "equity" | "revenue" | "expense";
  parentId: string | null;
  balance: number;
  description?: string;
  active: boolean;
}

interface JournalEntryLine {
  id: string;
  accountCode: string;
  accountName: string;
  debit: number;
  credit: number;
  description: string;
}

interface JournalEntry {
  id: string;
  entryNumber: string;
  date: string;
  description: string;
  lines: JournalEntryLine[];
  totalDebit: number;
  totalCredit: number;
  status: "draft" | "posted" | "verified" | "cancelled";
  createdBy: string;
  reference?: string;
}

interface BillVerification {
  id: string;
  verificationType: "invoice" | "purchase_order" | "expense_claim" | "grn";
  reference: string;
  vendor: string;
  amount: number;
  verifiedAmount: number;
  discrepancy: number;
  status: "pending" | "verified" | "approved" | "rejected";
  date: string;
  checklistItems: ChecklistItem[];
  department: string;
}

interface ChecklistItem {
  id: string;
  label: string;
  checked: boolean;
}

interface BudgetEntry {
  accountCode: string;
  accountName: string;
  type: string;
  months: number[]; // 12 monthly budget values
  actuals: number[]; // 12 monthly actual values
}

// ─── MOCK DATA ────────────────────────────────────────────────────────────

const MOCK_ACCOUNTS: Account[] = [
  // Assets
  { code: "1000", name: "Current Assets", type: "asset", parentId: null, balance: 3850000, active: true },
  { code: "1100", name: "Cash & Cash Equivalents", type: "asset", parentId: "1000", balance: 850000, active: true },
  { code: "1110", name: "Cash in Hand", type: "asset", parentId: "1100", balance: 285000, active: true },
  { code: "1120", name: "Bank - SBI Current A/c", type: "asset", parentId: "1100", balance: 565000, active: true },
  { code: "1200", name: "Accounts Receivable", type: "asset", parentId: "1000", balance: 1250000, active: true },
  { code: "1210", name: "Guest Ledger", type: "asset", parentId: "1200", balance: 750000, active: true },
  { code: "1220", name: "City Ledger", type: "asset", parentId: "1200", balance: 350000, active: true },
  { code: "1230", name: "OTA Receivables", type: "asset", parentId: "1200", balance: 150000, active: true },
  { code: "1300", name: "Inventory", type: "asset", parentId: "1000", balance: 1750000, active: true },
  { code: "1310", name: "Food & Beverage Stock", type: "asset", parentId: "1300", balance: 950000, active: true },
  { code: "1320", name: "Linen & Uniforms", type: "asset", parentId: "1300", balance: 480000, active: true },
  { code: "1330", name: "Operating Supplies", type: "asset", parentId: "1300", balance: 320000, active: true },
  { code: "2000", name: "Fixed Assets", type: "asset", parentId: null, balance: 12500000, active: true },
  { code: "2100", name: "Building & Improvements", type: "asset", parentId: "2000", balance: 8500000, active: true },
  { code: "2200", name: "Furniture & Fixtures", type: "asset", parentId: "2000", balance: 1800000, active: true },
  { code: "2300", name: "Equipment & Appliances", type: "asset", parentId: "2000", balance: 1200000, active: true },
  { code: "2400", name: "Vehicles", type: "asset", parentId: "2000", balance: 1000000, active: true },
  // Liabilities
  { code: "3000", name: "Current Liabilities", type: "liability", parentId: null, balance: 1850000, active: true },
  { code: "3100", name: "Accounts Payable", type: "liability", parentId: "3000", balance: 950000, active: true },
  { code: "3110", name: "Vendor Payables", type: "liability", parentId: "3100", balance: 620000, active: true },
  { code: "3120", name: "GST Payable", type: "liability", parentId: "3100", balance: 185000, active: true },
  { code: "3130", name: "TDS Payable", type: "liability", parentId: "3100", balance: 145000, active: true },
  { code: "3200", name: "Advance from Guests", type: "liability", parentId: "3000", balance: 450000, active: true },
  { code: "3300", name: "Accrued Expenses", type: "liability", parentId: "3000", balance: 350000, active: true },
  { code: "3400", name: "Staff Dues Payable", type: "liability", parentId: "3000", balance: 100000, active: true },
  // Equity
  { code: "4000", name: "Equity", type: "equity", parentId: null, balance: 14500000, active: true },
  { code: "4100", name: "Owner's Capital", type: "equity", parentId: "4000", balance: 12000000, active: true },
  { code: "4200", name: "Retained Earnings", type: "equity", parentId: "4000", balance: 2100000, active: true },
  { code: "4300", name: "Current Year P&L", type: "equity", parentId: "4000", balance: 400000, active: true },
  // Revenue
  { code: "5000", name: "Operating Revenue", type: "revenue", parentId: null, balance: 3476400, active: true },
  { code: "5100", name: "Room Revenue", type: "revenue", parentId: "5000", balance: 2183000, active: true },
  { code: "5200", name: "F&B Revenue", type: "revenue", parentId: "5000", balance: 682000, active: true },
  { code: "5300", name: "Banquet Revenue", type: "revenue", parentId: "5000", balance: 385000, active: true },
  { code: "5400", name: "Spa & Wellness Revenue", type: "revenue", parentId: "5000", balance: 132000, active: true },
  { code: "5500", name: "Other Revenue", type: "revenue", parentId: "5000", balance: 94400, active: true },
  // Expenses
  { code: "6000", name: "Operating Expenses", type: "expense", parentId: null, balance: 1374000, active: true },
  { code: "6100", name: "Salaries & Wages", type: "expense", parentId: "6000", balance: 850000, active: true },
  { code: "6200", name: "Utilities", type: "expense", parentId: "6000", balance: 125000, active: true },
  { code: "6300", name: "Supplies & Consumables", type: "expense", parentId: "6000", balance: 140000, active: true },
  { code: "6400", name: "OTA Commissions", type: "expense", parentId: "6000", balance: 87000, active: true },
  { code: "6500", name: "Maintenance & Repairs", type: "expense", parentId: "6000", balance: 32000, active: true },
  { code: "6600", name: "Marketing & Sales", type: "expense", parentId: "6000", balance: 45000, active: true },
  { code: "6700", name: "Depreciation", type: "expense", parentId: "6000", balance: 95000, active: true },
];

const MOCK_JOURNAL_ENTRIES: JournalEntry[] = [
  {
    id: "JE-001", entryNumber: "JE/2025/001", date: "2025-01-15", description: "Room revenue posting - 15 Jan",
    status: "verified", createdBy: "System Auto", reference: "Daily Sales",
    lines: [
      { id: "L1", accountCode: "1120", accountName: "Bank - SBI Current A/c", debit: 45000, credit: 0, description: "Card payments received" },
      { id: "L2", accountCode: "1110", accountName: "Cash in Hand", debit: 12000, credit: 0, description: "Cash received" },
      { id: "L3", accountCode: "5100", accountName: "Room Revenue", debit: 0, credit: 57000, description: "Room charges posted" },
    ],
    totalDebit: 57000, totalCredit: 57000,
  },
  {
    id: "JE-002", entryNumber: "JE/2025/002", date: "2025-01-15", description: "F&B revenue posting",
    status: "posted", createdBy: "System Auto", reference: "POS Settlement",
    lines: [
      { id: "L4", accountCode: "1120", accountName: "Bank - SBI Current A/c", debit: 28000, credit: 0, description: "Card settlements" },
      { id: "L5", accountCode: "1110", accountName: "Cash in Hand", debit: 8500, credit: 0, description: "Cash sales" },
      { id: "L6", accountCode: "5200", accountName: "F&B Revenue", debit: 0, credit: 36500, description: "F&B sales" },
    ],
    totalDebit: 36500, totalCredit: 36500,
  },
  {
    id: "JE-003", entryNumber: "JE/2025/003", date: "2025-01-14", description: "Vendor payment - Linen Solutions",
    status: "verified", createdBy: "Accounts Team", reference: "PO-2401",
    lines: [
      { id: "L7", accountCode: "3110", accountName: "Vendor Payables", debit: 150000, credit: 0, description: "Clearing PO-2401" },
      { id: "L8", accountCode: "1120", accountName: "Bank - SBI Current A/c", debit: 0, credit: 150000, description: "NEFT payment" },
    ],
    totalDebit: 150000, totalCredit: 150000,
  },
  {
    id: "JE-004", entryNumber: "JE/2025/004", date: "2025-01-14", description: "Salary advance - Staff",
    status: "draft", createdBy: "HR Department", reference: "SA-0114",
    lines: [
      { id: "L9", accountCode: "3400", accountName: "Staff Dues Payable", debit: 15000, credit: 0, description: "Advance to staff" },
      { id: "L10", accountCode: "1110", accountName: "Cash in Hand", debit: 0, credit: 15000, description: "Cash disbursed" },
    ],
    totalDebit: 15000, totalCredit: 15000,
  },
  {
    id: "JE-005", entryNumber: "JE/2025/005", date: "2025-01-13", description: "Corporate billing - TCS Ltd",
    status: "posted", createdBy: "Front Office", reference: "INV-2403",
    lines: [
      { id: "L11", accountCode: "1220", accountName: "City Ledger", debit: 147500, credit: 0, description: "Corporate bill TCS" },
      { id: "L12", accountCode: "5100", accountName: "Room Revenue", debit: 0, credit: 125000, description: "Room charges" },
      { id: "L13", accountCode: "3120", accountName: "GST Payable", debit: 0, credit: 22500, description: "GST collected" },
    ],
    totalDebit: 147500, totalCredit: 147500,
  },
  {
    id: "JE-006", entryNumber: "JE/2025/006", date: "2025-01-12", description: "Electricity payment - January",
    status: "cancelled", createdBy: "Accounts Team", reference: "UTIL-0112",
    lines: [
      { id: "L14", accountCode: "6200", accountName: "Utilities", debit: 45000, credit: 0, description: "Electricity bill" },
      { id: "L15", accountCode: "1120", accountName: "Bank - SBI Current A/c", debit: 0, credit: 45000, description: "Bank payment" },
    ],
    totalDebit: 45000, totalCredit: 45000,
  },
];

const MOCK_BILL_VERIFICATIONS: BillVerification[] = [
  {
    id: "BV-001", verificationType: "invoice", reference: "INV-V001", vendor: "Linen Solutions Pvt Ltd",
    amount: 150000, verifiedAmount: 150000, discrepancy: 0, status: "approved",
    date: "2025-01-15", department: "Housekeeping",
    checklistItems: [
      { id: "C1", label: "Invoice matches PO", checked: true },
      { id: "C2", label: "GRN received & verified", checked: true },
      { id: "C3", label: "Quantity matches delivery", checked: true },
      { id: "C4", label: "Price as per agreement", checked: true },
      { id: "C5", label: "GST computation correct", checked: true },
    ],
  },
  {
    id: "BV-002", verificationType: "purchase_order", reference: "PO-2402", vendor: "CleanPro Chemicals",
    amount: 28000, verifiedAmount: 25200, discrepancy: 2800, status: "pending",
    date: "2025-01-14", department: "Housekeeping",
    checklistItems: [
      { id: "C6", label: "Invoice matches PO", checked: true },
      { id: "C7", label: "GRN received & verified", checked: false },
      { id: "C8", label: "Quantity matches delivery", checked: false },
      { id: "C9", label: "Price as per agreement", checked: true },
      { id: "C10", label: "GST computation correct", checked: true },
    ],
  },
  {
    id: "BV-003", verificationType: "expense_claim", reference: "EC-0045", vendor: "Staff - Ramesh Kumar",
    amount: 12500, verifiedAmount: 9800, discrepancy: 2700, status: "pending",
    date: "2025-01-13", department: "Maintenance",
    checklistItems: [
      { id: "C11", label: "Receipts attached", checked: true },
      { id: "C12", label: "Manager approval", checked: true },
      { id: "C13", label: "Within policy limits", checked: false },
      { id: "C14", label: "Amounts reasonable", checked: false },
    ],
  },
  {
    id: "BV-004", verificationType: "grn", reference: "GRN-2403", vendor: "Premium Supplies Co",
    amount: 75000, verifiedAmount: 75000, discrepancy: 0, status: "verified",
    date: "2025-01-12", department: "F&B",
    checklistItems: [
      { id: "C15", label: "Goods physically received", checked: true },
      { id: "C16", label: "Quality check passed", checked: true },
      { id: "C17", label: "Quantity matches PO", checked: true },
      { id: "C18", label: "Damage/shortage reported", checked: true },
    ],
  },
  {
    id: "BV-005", verificationType: "invoice", reference: "INV-V005", vendor: "TechKey Solutions",
    amount: 30000, verifiedAmount: 0, discrepancy: 30000, status: "rejected",
    date: "2025-01-11", department: "IT",
    checklistItems: [
      { id: "C19", label: "Invoice matches PO", checked: false },
      { id: "C20", label: "GRN received & verified", checked: false },
      { id: "C21", label: "Quantity matches delivery", checked: false },
      { id: "C22", label: "Price as per agreement", checked: false },
    ],
  },
  {
    id: "BV-006", verificationType: "invoice", reference: "INV-V006", vendor: "Coffee Bean Traders",
    amount: 15000, verifiedAmount: 15000, discrepancy: 0, status: "pending",
    date: "2025-01-15", department: "F&B",
    checklistItems: [
      { id: "C23", label: "Invoice matches PO", checked: true },
      { id: "C24", label: "GRN received & verified", checked: true },
      { id: "C25", label: "Quality check passed", checked: true },
      { id: "C26", label: "GST computation correct", checked: false },
    ],
  },
];

const MOCK_BUDGET: BudgetEntry[] = [
  { accountCode: "5100", accountName: "Room Revenue", type: "revenue", months: [2100000, 2150000, 2300000, 2200000, 2350000, 2500000, 2600000, 2550000, 2400000, 2250000, 2350000, 2500000], actuals: [2183000, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
  { accountCode: "5200", accountName: "F&B Revenue", type: "revenue", months: [650000, 660000, 700000, 680000, 720000, 750000, 780000, 760000, 710000, 670000, 700000, 750000], actuals: [682000, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
  { accountCode: "5300", accountName: "Banquet Revenue", type: "revenue", months: [350000, 360000, 400000, 380000, 420000, 450000, 470000, 460000, 430000, 400000, 420000, 450000], actuals: [385000, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
  { accountCode: "6100", accountName: "Salaries & Wages", type: "expense", months: [840000, 840000, 840000, 840000, 870000, 870000, 870000, 870000, 870000, 870000, 870000, 870000], actuals: [850000, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
  { accountCode: "6200", accountName: "Utilities", type: "expense", months: [120000, 115000, 110000, 130000, 140000, 150000, 155000, 150000, 140000, 125000, 115000, 110000], actuals: [125000, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
  { accountCode: "6300", accountName: "Supplies & Consumables", type: "expense", months: [130000, 135000, 140000, 135000, 145000, 150000, 155000, 150000, 140000, 135000, 140000, 150000], actuals: [140000, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
  { accountCode: "6400", accountName: "OTA Commissions", type: "expense", months: [80000, 82000, 88000, 85000, 90000, 95000, 100000, 98000, 92000, 87000, 90000, 95000], actuals: [87000, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
  { accountCode: "6500", accountName: "Maintenance & Repairs", type: "expense", months: [30000, 30000, 35000, 30000, 35000, 40000, 40000, 35000, 30000, 30000, 35000, 40000], actuals: [32000, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
  { accountCode: "6600", accountName: "Marketing & Sales", type: "expense", months: [40000, 42000, 45000, 43000, 48000, 50000, 52000, 50000, 47000, 44000, 46000, 50000], actuals: [45000, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
  { accountCode: "6700", accountName: "Depreciation", type: "expense", months: [95000, 95000, 95000, 95000, 95000, 95000, 95000, 95000, 95000, 95000, 95000, 95000], actuals: [95000, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
];

// ─── STATUS META ──────────────────────────────────────────────────────────

const JE_STATUS_META: Record<string, { label: string; cls: string }> = {
  draft: { label: "Draft", cls: "bg-[#E5E7EB] text-[#374151] border-[#6B7280]" },
  posted: { label: "Posted", cls: "bg-[#DBEAFE] text-[#1B3A6B] border-[#0369A1]" },
  verified: { label: "Verified", cls: "bg-[#DCFCE7] text-[#14532D] border-[#16A34A]" },
  cancelled: { label: "Cancelled", cls: "bg-[#FFE4E6] text-[#881337] border-[#DC2626]" },
};

const BV_STATUS_META: Record<string, { label: string; cls: string }> = {
  pending: { label: "Pending", cls: "bg-[#FEF3C7] text-[#78350F] border-[#D97706]" },
  verified: { label: "Verified", cls: "bg-[#DBEAFE] text-[#1B3A6B] border-[#0369A1]" },
  approved: { label: "Approved", cls: "bg-[#DCFCE7] text-[#14532D] border-[#16A34A]" },
  rejected: { label: "Rejected", cls: "bg-[#FFE4E6] text-[#881337] border-[#DC2626]" },
};

const ACCOUNT_TYPE_META: Record<string, { label: string; color: string; icon: any }> = {
  asset: { label: "Assets", color: "#0369A1", icon: Building2 },
  liability: { label: "Liabilities", color: "#DC2626", icon: Landmark },
  equity: { label: "Equity", color: "#7C3AED", icon: Wallet },
  revenue: { label: "Revenue", color: "#16A34A", icon: TrendingUp },
  expense: { label: "Expense", color: "#D97706", icon: IndianRupee },
};

const VERIFICATION_TYPE_META: Record<string, { label: string; icon: any }> = {
  invoice: { label: "Invoice", icon: FileText },
  purchase_order: { label: "Purchase Order", icon: ClipboardCheck },
  expense_claim: { label: "Expense Claim", icon: IndianRupee },
  grn: { label: "GRN", icon: Package },
};

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// ─── CHART OF ACCOUNTS TAB ───────────────────────────────────────────────

function ChartOfAccountsTab() {
  const [search, setSearch] = useState("");
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set(["1000", "2000", "3000", "4000", "5000", "6000"]));
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newAccount, setNewAccount] = useState({ code: "", name: "", type: "asset" as Account["type"], parentId: "(none)", description: "" });

  const toggleNode = (code: string) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  };

  const filteredAccounts = MOCK_ACCOUNTS.filter(
    (a) =>
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.code.includes(search)
  );

  // Build tree
  const rootAccounts = filteredAccounts.filter((a) => a.parentId === null);
  const childrenMap = new Map<string, Account[]>();
  filteredAccounts.forEach((a) => {
    if (a.parentId) {
      const children = childrenMap.get(a.parentId) ?? [];
      children.push(a);
      childrenMap.set(a.parentId, children);
    }
  });

  const renderAccountRow = (account: Account, depth: number) => {
    const hasChildren = childrenMap.has(account.code) && childrenMap.get(account.code)!.length > 0;
    const isExpanded = expandedNodes.has(account.code);
    const typeMeta = ACCOUNT_TYPE_META[account.type];
    const TypeIcon = typeMeta.icon;

    return (
      <div key={account.code}>
        <div
          className={cn(
            "flex items-center gap-2 py-2 px-3 border-b border-border hover:bg-muted/50 cursor-pointer transition-colors",
            depth === 0 && "bg-muted/20"
          )}
          style={{ paddingLeft: `${depth * 24 + 12}px` }}
          onClick={() => hasChildren && toggleNode(account.code)}
        >
          {hasChildren ? (
            isExpanded ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          ) : (
            <span className="w-3.5 shrink-0" />
          )}
          <span className="text-xs font-mono text-muted-foreground w-12 shrink-0">{account.code}</span>
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            {depth === 0 && <TypeIcon className="h-3.5 w-3.5 shrink-0" style={{ color: typeMeta.color }} />}
            <span className={cn("text-xs truncate", depth === 0 ? "font-bold" : depth === 1 ? "font-semibold" : "font-medium")}>
              {account.name}
            </span>
          </div>
          <Badge variant="outline" className="text-[9px] h-5 shrink-0" style={{ color: typeMeta.color, borderColor: typeMeta.color }}>
            {typeMeta.label}
          </Badge>
          <span className={cn("text-xs tabular-nums text-right w-28 shrink-0 font-medium", account.type === "asset" || account.type === "expense" ? "text-[#0369A1]" : account.type === "revenue" ? "text-[#16A34A]" : "text-foreground")}>
            {fmtINR(account.balance)}
          </span>
        </div>
        {hasChildren && isExpanded && childrenMap.get(account.code)!.map((child) => renderAccountRow(child, depth + 1))}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-navy" /> Chart of Accounts
            </CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input placeholder="Search accounts..." className="pl-8 h-8 w-48 text-xs" value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
              <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                <DialogTrigger asChild>
                  <Button size="sm" className="bg-navy hover:bg-navy-light text-white h-8 text-xs">
                    <Plus className="h-3.5 w-3.5 mr-1" /> Add Account
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle className="text-sm font-semibold">Add New Account</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-3 py-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium">Account Code</label>
                        <Input placeholder="e.g. 1340" className="h-8 text-xs" value={newAccount.code} onChange={(e) => setNewAccount({ ...newAccount, code: e.target.value })} />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium">Account Type</label>
                        <Select value={newAccount.type} onValueChange={(v) => setNewAccount({ ...newAccount, type: v as Account["type"] })}>
                          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="asset">Asset</SelectItem>
                            <SelectItem value="liability">Liability</SelectItem>
                            <SelectItem value="equity">Equity</SelectItem>
                            <SelectItem value="revenue">Revenue</SelectItem>
                            <SelectItem value="expense">Expense</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium">Account Name</label>
                      <Input placeholder="e.g. Petty Cash" className="h-8 text-xs" value={newAccount.name} onChange={(e) => setNewAccount({ ...newAccount, name: e.target.value })} />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium">Parent Account</label>
                      <Select value={newAccount.parentId} onValueChange={(v) => setNewAccount({ ...newAccount, parentId: v })}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="(none)">None (Top Level)</SelectItem>
                          {MOCK_ACCOUNTS.filter((a) => a.parentId === null || childrenMap.has(a.code)).map((a) => (
                            <SelectItem key={a.code} value={a.code}>{a.code} — {a.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium">Description</label>
                      <Input placeholder="Optional description" className="h-8 text-xs" value={newAccount.description} onChange={(e) => setNewAccount({ ...newAccount, description: e.target.value })} />
                    </div>
                  </div>
                  <DialogFooter className="gap-2">
                    <DialogClose asChild>
                      <Button variant="outline" size="sm" className="h-8 text-xs">Cancel</Button>
                    </DialogClose>
                    <Button size="sm" className="bg-navy hover:bg-navy-light text-white h-8 text-xs" onClick={() => setShowAddDialog(false)}>
                      Create Account
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {/* Header Row */}
          <div className="flex items-center gap-2 py-2 px-3 border-b-2 border-border bg-muted/30">
            <span className="w-3.5 shrink-0" />
            <span className="text-[10px] font-semibold uppercase text-muted-foreground w-12">Code</span>
            <span className="text-[10px] font-semibold uppercase text-muted-foreground flex-1">Account Name</span>
            <span className="text-[10px] font-semibold uppercase text-muted-foreground shrink-0">Type</span>
            <span className="text-[10px] font-semibold uppercase text-muted-foreground w-28 text-right shrink-0">Balance</span>
          </div>
          {rootAccounts.map((root) => renderAccountRow(root, 0))}
        </CardContent>
      </Card>

      {/* Account Type Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {(["asset", "liability", "equity", "revenue", "expense"] as const).map((type) => {
          const meta = ACCOUNT_TYPE_META[type];
          const Icon = meta.icon;
          const total = MOCK_ACCOUNTS.filter((a) => a.type === type && a.parentId === null).reduce((s, a) => s + a.balance, 0);
          const count = MOCK_ACCOUNTS.filter((a) => a.type === type).length;
          return (
            <Card key={type} className="hover:shadow-card-lg transition-shadow">
              <CardContent className="p-3">
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-7 w-7 flex items-center justify-center rounded-lg" style={{ backgroundColor: `${meta.color}15` }}>
                    <Icon className="h-3.5 w-3.5" style={{ color: meta.color }} />
                  </div>
                  <span className="text-[10px] font-semibold uppercase" style={{ color: meta.color }}>{meta.label}</span>
                </div>
                <p className="text-base font-display font-bold tabular-nums">{fmtINR(total)}</p>
                <p className="text-[10px] text-muted-foreground">{count} accounts</p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// ─── JOURNAL ENTRIES TAB ──────────────────────────────────────────────────

function JournalEntriesTab() {
  const [search, setSearch] = useState("");
  const [expandedEntry, setExpandedEntry] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newEntry, setNewEntry] = useState<{
    date: string;
    description: string;
    reference: string;
    lines: { accountCode: string; debit: string; credit: string; description: string }[];
  }>({
    date: new Date().toISOString().split("T")[0],
    description: "",
    reference: "",
    lines: [
      { accountCode: "", debit: "", credit: "", description: "" },
      { accountCode: "", debit: "", credit: "", description: "" },
    ],
  });

  const filtered = MOCK_JOURNAL_ENTRIES.filter(
    (e) =>
      e.entryNumber.toLowerCase().includes(search.toLowerCase()) ||
      e.description.toLowerCase().includes(search.toLowerCase()) ||
      e.reference?.toLowerCase().includes(search.toLowerCase())
  );

  const toggleEntry = (id: string) => {
    setExpandedEntry((prev) => (prev === id ? null : id));
  };

  const addLine = () => {
    setNewEntry((prev) => ({
      ...prev,
      lines: [...prev.lines, { accountCode: "", debit: "", credit: "", description: "" }],
    }));
  };

  const removeLine = (index: number) => {
    if (newEntry.lines.length <= 2) return;
    setNewEntry((prev) => ({
      ...prev,
      lines: prev.lines.filter((_, i) => i !== index),
    }));
  };

  const updateLine = (index: number, field: string, value: string) => {
    setNewEntry((prev) => ({
      ...prev,
      lines: prev.lines.map((line, i) => (i === index ? { ...line, [field]: value } : line)),
    }));
  };

  const draftCount = MOCK_JOURNAL_ENTRIES.filter((e) => e.status === "draft").length;
  const postedCount = MOCK_JOURNAL_ENTRIES.filter((e) => e.status === "posted" || e.status === "verified").length;

  return (
    <div className="space-y-4">
      {/* Mini KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="hover:shadow-card-lg transition-shadow">
          <CardContent className="p-3 flex items-center gap-3">
            <div className="h-8 w-8 flex items-center justify-center rounded-lg bg-[#E5E7EB]">
              <Hash className="h-4 w-4 text-[#374151]" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase font-medium">Total Entries</p>
              <p className="text-lg font-display font-bold">{MOCK_JOURNAL_ENTRIES.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-card-lg transition-shadow">
          <CardContent className="p-3 flex items-center gap-3">
            <div className="h-8 w-8 flex items-center justify-center rounded-lg bg-[#FEF3C7]">
              <Edit className="h-4 w-4 text-[#D97706]" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase font-medium">Draft</p>
              <p className="text-lg font-display font-bold">{draftCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-card-lg transition-shadow">
          <CardContent className="p-3 flex items-center gap-3">
            <div className="h-8 w-8 flex items-center justify-center rounded-lg bg-[#DCFCE7]">
              <CheckCircle2 className="h-4 w-4 text-[#16A34A]" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase font-medium">Posted / Verified</p>
              <p className="text-lg font-display font-bold">{postedCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-card-lg transition-shadow">
          <CardContent className="p-3 flex items-center gap-3">
            <div className="h-8 w-8 flex items-center justify-center rounded-lg bg-navy/10">
              <IndianRupee className="h-4 w-4 text-navy" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase font-medium">Total Debit</p>
              <p className="text-sm font-display font-bold">{fmtINR(MOCK_JOURNAL_ENTRIES.filter((e) => e.status !== "cancelled").reduce((s, e) => s + e.totalDebit, 0))}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <ArrowRightLeft className="h-4 w-4 text-navy" /> Journal Entry Register
            </CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input placeholder="Search entries..." className="pl-8 h-8 w-48 text-xs" value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
              <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                <DialogTrigger asChild>
                  <Button size="sm" className="bg-navy hover:bg-navy-light text-white h-8 text-xs">
                    <Plus className="h-3.5 w-3.5 mr-1" /> New Entry
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="text-sm font-semibold">Create Journal Entry</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-3">
                    <div className="grid grid-cols-3 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium">Date</label>
                        <Input type="date" className="h-8 text-xs" value={newEntry.date} onChange={(e) => setNewEntry({ ...newEntry, date: e.target.value })} />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium">Reference</label>
                        <Input placeholder="e.g. INV-001" className="h-8 text-xs" value={newEntry.reference} onChange={(e) => setNewEntry({ ...newEntry, reference: e.target.value })} />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium">Description</label>
                        <Input placeholder="Entry description" className="h-8 text-xs" value={newEntry.description} onChange={(e) => setNewEntry({ ...newEntry, description: e.target.value })} />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-semibold">Entry Lines</label>
                        <Button variant="outline" size="sm" className="h-6 text-[10px]" onClick={addLine}>
                          <Plus className="h-3 w-3 mr-1" /> Add Line
                        </Button>
                      </div>
                      <div className="rounded-lg border border-border">
                        <div className="grid grid-cols-[1fr_100px_100px_1fr_28px] gap-2 p-2 bg-muted/30 border-b border-border">
                          <span className="text-[10px] font-semibold uppercase text-muted-foreground">Account</span>
                          <span className="text-[10px] font-semibold uppercase text-muted-foreground text-right">Debit (₹)</span>
                          <span className="text-[10px] font-semibold uppercase text-muted-foreground text-right">Credit (₹)</span>
                          <span className="text-[10px] font-semibold uppercase text-muted-foreground">Description</span>
                          <span />
                        </div>
                        {newEntry.lines.map((line, i) => (
                          <div key={i} className="grid grid-cols-[1fr_100px_100px_1fr_28px] gap-2 p-2 border-b border-border last:border-b-0">
                            <Select value={line.accountCode} onValueChange={(v) => updateLine(i, "accountCode", v)}>
                              <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="Select..." /></SelectTrigger>
                              <SelectContent>
                                {MOCK_ACCOUNTS.filter((a) => a.parentId !== null).map((a) => (
                                  <SelectItem key={a.code} value={a.code}>{a.code} — {a.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Input placeholder="0" className="h-7 text-xs text-right" value={line.debit} onChange={(e) => updateLine(i, "debit", e.target.value)} />
                            <Input placeholder="0" className="h-7 text-xs text-right" value={line.credit} onChange={(e) => updateLine(i, "credit", e.target.value)} />
                            <Input placeholder="Line desc" className="h-7 text-xs" value={line.description} onChange={(e) => updateLine(i, "description", e.target.value)} />
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-[#DC2626]" onClick={() => removeLine(i)} disabled={newEntry.lines.length <= 2}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                      {/* Totals */}
                      <div className="grid grid-cols-[1fr_100px_100px_1fr_28px] gap-2 px-2 pt-2 border-t border-border">
                        <span className="text-xs font-bold">Total</span>
                        <span className="text-xs text-right tabular-nums font-bold">
                          ₹{newEntry.lines.reduce((s, l) => s + (parseFloat(l.debit) || 0), 0).toLocaleString("en-IN")}
                        </span>
                        <span className="text-xs text-right tabular-nums font-bold">
                          ₹{newEntry.lines.reduce((s, l) => s + (parseFloat(l.credit) || 0), 0).toLocaleString("en-IN")}
                        </span>
                        <span />
                        <span />
                      </div>
                    </div>
                  </div>
                  <DialogFooter className="gap-2">
                    <DialogClose asChild>
                      <Button variant="outline" size="sm" className="h-8 text-xs">Cancel</Button>
                    </DialogClose>
                    <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setShowCreateDialog(false)}>
                      Save as Draft
                    </Button>
                    <Button size="sm" className="bg-navy hover:bg-navy-light text-white h-8 text-xs" onClick={() => setShowCreateDialog(false)}>
                      Post Entry
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-[11px] w-8" />
                <TableHead className="text-[11px]">Entry #</TableHead>
                <TableHead className="text-[11px]">Date</TableHead>
                <TableHead className="text-[11px]">Description</TableHead>
                <TableHead className="text-[11px]">Reference</TableHead>
                <TableHead className="text-[11px] text-right">Debit</TableHead>
                <TableHead className="text-[11px] text-right">Credit</TableHead>
                <TableHead className="text-[11px]">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((entry) => {
                const st = JE_STATUS_META[entry.status];
                const isExpanded = expandedEntry === entry.id;
                return (
                  <>
                    <TableRow
                      key={entry.id}
                      className={cn("hover:bg-muted/50 cursor-pointer", isExpanded && "bg-muted/30")}
                      onClick={() => toggleEntry(entry.id)}
                    >
                      <TableCell className="text-xs px-2">
                        {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                      </TableCell>
                      <TableCell className="text-xs font-mono text-muted-foreground">{entry.entryNumber}</TableCell>
                      <TableCell className="text-xs">{fmtDate(entry.date)}</TableCell>
                      <TableCell className="text-xs font-medium">{entry.description}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{entry.reference || "—"}</TableCell>
                      <TableCell className="text-xs text-right tabular-nums">{fmtINR(entry.totalDebit)}</TableCell>
                      <TableCell className="text-xs text-right tabular-nums">{fmtINR(entry.totalCredit)}</TableCell>
                      <TableCell>
                        <span className={cn("inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-medium", st.cls)}>{st.label}</span>
                      </TableCell>
                    </TableRow>
                    {isExpanded && (
                      <TableRow key={`${entry.id}-lines`} className="bg-muted/10">
                        <TableCell colSpan={8} className="p-0">
                          <div className="px-12 py-3">
                            <div className="text-[10px] font-semibold uppercase text-muted-foreground mb-2">Entry Lines</div>
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead className="text-[10px] h-7">Account</TableHead>
                                  <TableHead className="text-[10px] h-7">Description</TableHead>
                                  <TableHead className="text-[10px] h-7 text-right">Debit</TableHead>
                                  <TableHead className="text-[10px] h-7 text-right">Credit</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {entry.lines.map((line) => (
                                  <TableRow key={line.id} className="hover:bg-muted/30">
                                    <TableCell className="text-xs py-1.5">
                                      <span className="font-mono text-muted-foreground mr-1">{line.accountCode}</span>
                                      {line.accountName}
                                    </TableCell>
                                    <TableCell className="text-xs py-1.5 text-muted-foreground">{line.description}</TableCell>
                                    <TableCell className="text-xs py-1.5 text-right tabular-nums">
                                      {line.debit > 0 ? fmtINR(line.debit) : ""}
                                    </TableCell>
                                    <TableCell className="text-xs py-1.5 text-right tabular-nums">
                                      {line.credit > 0 ? fmtINR(line.credit) : ""}
                                    </TableCell>
                                  </TableRow>
                                ))}
                                <TableRow className="border-t-2 border-border">
                                  <TableCell className="text-xs py-1.5 font-bold" colSpan={2}>Total</TableCell>
                                  <TableCell className="text-xs py-1.5 text-right tabular-nums font-bold">{fmtINR(entry.totalDebit)}</TableCell>
                                  <TableCell className="text-xs py-1.5 text-right tabular-nums font-bold">{fmtINR(entry.totalCredit)}</TableCell>
                                </TableRow>
                              </TableBody>
                            </Table>
                            <div className="flex items-center justify-between mt-3 pt-2 border-t border-border">
                              <span className="text-[10px] text-muted-foreground">Created by: {entry.createdBy}</span>
                              <div className="flex gap-2">
                                {entry.status === "draft" && (
                                  <>
                                    <Button variant="outline" size="sm" className="h-6 text-[10px]"><Eye className="h-3 w-3 mr-1" /> Post</Button>
                                    <Button variant="outline" size="sm" className="h-6 text-[10px] text-[#DC2626]"><Ban className="h-3 w-3 mr-1" /> Cancel</Button>
                                  </>
                                )}
                                {entry.status === "posted" && (
                                  <Button variant="outline" size="sm" className="h-6 text-[10px]"><CheckCircle2 className="h-3 w-3 mr-1" /> Verify</Button>
                                )}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── BILLING VERIFICATION TAB ─────────────────────────────────────────────

function BillingVerificationTab() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [expandedBill, setExpandedBill] = useState<string | null>(null);
  const [checklistStates, setChecklistStates] = useState<Record<string, Record<string, boolean>>>(() => {
    const states: Record<string, Record<string, boolean>> = {};
    MOCK_BILL_VERIFICATIONS.forEach((bv) => {
      states[bv.id] = {};
      bv.checklistItems.forEach((item) => {
        states[bv.id][item.id] = item.checked;
      });
    });
    return states;
  });

  const filtered = MOCK_BILL_VERIFICATIONS.filter((bv) => {
    const matchesSearch =
      bv.reference.toLowerCase().includes(search.toLowerCase()) ||
      bv.vendor.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || bv.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const pendingCount = MOCK_BILL_VERIFICATIONS.filter((b) => b.status === "pending").length;
  const totalDiscrepancy = MOCK_BILL_VERIFICATIONS.filter((b) => b.status === "pending").reduce((s, b) => s + b.discrepancy, 0);
  const totalPendingAmount = MOCK_BILL_VERIFICATIONS.filter((b) => b.status === "pending").reduce((s, b) => s + b.amount, 0);

  const toggleChecklist = (billId: string, itemId: string) => {
    setChecklistStates((prev) => ({
      ...prev,
      [billId]: {
        ...prev[billId],
        [itemId]: !prev[billId]?.[itemId],
      },
    }));
  };

  const allChecked = (billId: string) => {
    const bill = MOCK_BILL_VERIFICATIONS.find((b) => b.id === billId);
    if (!bill) return false;
    return bill.checklistItems.every((item) => checklistStates[billId]?.[item.id]);
  };

  return (
    <div className="space-y-4">
      {/* Mini KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="hover:shadow-card-lg transition-shadow">
          <CardContent className="p-3 flex items-center gap-3">
            <div className="h-8 w-8 flex items-center justify-center rounded-lg bg-[#FEF3C7]">
              <AlertTriangle className="h-4 w-4 text-[#D97706]" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase font-medium">Pending</p>
              <p className="text-lg font-display font-bold">{pendingCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-card-lg transition-shadow">
          <CardContent className="p-3 flex items-center gap-3">
            <div className="h-8 w-8 flex items-center justify-center rounded-lg bg-[#DBEAFE]">
              <IndianRupee className="h-4 w-4 text-[#0369A1]" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase font-medium">Pending Amount</p>
              <p className="text-sm font-display font-bold">{fmtINR(totalPendingAmount)}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-card-lg transition-shadow">
          <CardContent className="p-3 flex items-center gap-3">
            <div className="h-8 w-8 flex items-center justify-center rounded-lg bg-[#FFE4E6]">
              <XCircle className="h-4 w-4 text-[#DC2626]" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase font-medium">Discrepancy</p>
              <p className="text-sm font-display font-bold text-[#DC2626]">{fmtINR(totalDiscrepancy)}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-card-lg transition-shadow">
          <CardContent className="p-3 flex items-center gap-3">
            <div className="h-8 w-8 flex items-center justify-center rounded-lg bg-[#DCFCE7]">
              <CheckCircle2 className="h-4 w-4 text-[#16A34A]" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase font-medium">Approved</p>
              <p className="text-lg font-display font-bold">{MOCK_BILL_VERIFICATIONS.filter((b) => b.status === "approved").length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <ClipboardCheck className="h-4 w-4 text-navy" /> Bill Verification
            </CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input placeholder="Search bills..." className="pl-8 h-8 w-48 text-xs" value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-8 w-28 text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="verified">Verified</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-[11px] w-8" />
                <TableHead className="text-[11px]">Type</TableHead>
                <TableHead className="text-[11px]">Reference</TableHead>
                <TableHead className="text-[11px]">Vendor / Entity</TableHead>
                <TableHead className="text-[11px]">Department</TableHead>
                <TableHead className="text-[11px] text-right">Bill Amount</TableHead>
                <TableHead className="text-[11px] text-right">Verified Amt</TableHead>
                <TableHead className="text-[11px] text-right">Discrepancy</TableHead>
                <TableHead className="text-[11px]">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((bv) => {
                const st = BV_STATUS_META[bv.status];
                const vType = VERIFICATION_TYPE_META[bv.verificationType];
                const VIcon = vType.icon;
                const isExpanded = expandedBill === bv.id;
                return (
                  <>
                    <TableRow
                      key={bv.id}
                      className={cn("hover:bg-muted/50 cursor-pointer", isExpanded && "bg-muted/30")}
                      onClick={() => setExpandedBill(isExpanded ? null : bv.id)}
                    >
                      <TableCell className="text-xs px-2">
                        {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <VIcon className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-[10px]">{vType.label}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs font-mono font-medium">{bv.reference}</TableCell>
                      <TableCell className="text-xs">{bv.vendor}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{bv.department}</TableCell>
                      <TableCell className="text-xs text-right tabular-nums">{fmtINR(bv.amount)}</TableCell>
                      <TableCell className="text-xs text-right tabular-nums">{bv.verifiedAmount > 0 ? fmtINR(bv.verifiedAmount) : "—"}</TableCell>
                      <TableCell className="text-xs text-right tabular-nums">
                        {bv.discrepancy > 0 ? (
                          <span className="text-[#DC2626] font-medium">{fmtINR(bv.discrepancy)}</span>
                        ) : (
                          <span className="text-[#16A34A]">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className={cn("inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-medium", st.cls)}>{st.label}</span>
                      </TableCell>
                    </TableRow>
                    {isExpanded && (
                      <TableRow key={`${bv.id}-detail`} className="bg-muted/10">
                        <TableCell colSpan={9} className="p-0">
                          <div className="px-12 py-3 space-y-3">
                            <div className="flex items-center justify-between">
                              <div className="text-[10px] font-semibold uppercase text-muted-foreground">Verification Checklist</div>
                              <div className="text-[10px] text-muted-foreground">{fmtDate(bv.date)}</div>
                            </div>
                            <div className="space-y-1.5">
                              {bv.checklistItems.map((item) => (
                                <label key={item.id} className="flex items-center gap-2 py-1 px-2 rounded hover:bg-muted/50 cursor-pointer">
                                  <Checkbox
                                    checked={checklistStates[bv.id]?.[item.id] ?? false}
                                    onCheckedChange={() => toggleChecklist(bv.id, item.id)}
                                    className="h-3.5 w-3.5"
                                  />
                                  <span className={cn("text-xs", checklistStates[bv.id]?.[item.id] ? "text-foreground" : "text-muted-foreground line-through")}>
                                    {item.label}
                                  </span>
                                </label>
                              ))}
                            </div>
                            {bv.discrepancy > 0 && (
                              <div className="flex items-center gap-2 p-2 rounded-lg bg-[#FFE4E6]/50 border border-[#FFE4E6]">
                                <AlertTriangle className="h-4 w-4 text-[#DC2626] shrink-0" />
                                <div>
                                  <p className="text-xs font-medium text-[#881337]">Discrepancy of {fmtINR(bv.discrepancy)} detected</p>
                                  <p className="text-[10px] text-muted-foreground">Bill amount: {fmtINR(bv.amount)} · Verified amount: {fmtINR(bv.verifiedAmount)}</p>
                                </div>
                              </div>
                            )}
                            {bv.status === "pending" && (
                              <div className="flex items-center gap-2 pt-2 border-t border-border">
                                <Button size="sm" className="bg-[#16A34A] hover:bg-[#15803D] text-white h-7 text-[10px]" disabled={!allChecked(bv.id)}>
                                  <CheckCircle2 className="h-3 w-3 mr-1" /> Verify
                                </Button>
                                <Button size="sm" className="bg-navy hover:bg-navy-light text-white h-7 text-[10px]" disabled={bv.status !== "verified"}>
                                  Approve
                                </Button>
                                <Button variant="outline" size="sm" className="h-7 text-[10px] text-[#DC2626] border-[#DC2626] hover:bg-[#FFE4E6]">
                                  <XCircle className="h-3 w-3 mr-1" /> Reject
                                </Button>
                              </div>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── BUDGET TAB ───────────────────────────────────────────────────────────

function BudgetTab() {
  const [selectedYear, setSelectedYear] = useState("2025");
  const [viewType, setViewType] = useState<"monthly" | "yearly">("monthly");
  const [selectedMonth, setSelectedMonth] = useState(0); // 0 = Jan

  const monthNames = MONTH_NAMES;

  // Calculate yearly totals
  const yearlyData = MOCK_BUDGET.map((b) => ({
    ...b,
    totalBudget: b.months.reduce((s, v) => s + v, 0),
    totalActual: b.actuals.reduce((s, v) => s + v, 0),
  }));

  const totalRevenueBudget = yearlyData.filter((b) => b.type === "revenue").reduce((s, b) => s + b.totalBudget, 0);
  const totalExpenseBudget = yearlyData.filter((b) => b.type === "expense").reduce((s, b) => s + b.totalBudget, 0);
  const totalRevenueActual = yearlyData.filter((b) => b.type === "revenue").reduce((s, b) => s + b.totalActual, 0);
  const totalExpenseActual = yearlyData.filter((b) => b.type === "expense").reduce((s, b) => s + b.totalActual, 0);

  const formatVariance = (budget: number, actual: number, type: string) => {
    const variance = actual - budget;
    const pct = budget > 0 ? ((variance / budget) * 100).toFixed(1) : "0";
    const isGood = type === "revenue" ? variance >= 0 : variance <= 0;
    return { variance, pct, isGood };
  };

  return (
    <div className="space-y-4">
      {/* Mini KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="hover:shadow-card-lg transition-shadow">
          <CardContent className="p-3">
            <p className="text-[10px] text-muted-foreground uppercase font-medium">Revenue Budget (YTD)</p>
            <p className="text-base font-display font-bold">{fmtINR(totalRevenueBudget)}</p>
            <div className="flex items-center gap-1 mt-1">
              {totalRevenueActual > 0 && (
                <>
                  <span className={cn("text-[10px] font-medium", totalRevenueActual >= totalRevenueBudget ? "text-[#16A34A]" : "text-[#DC2626]")}>
                    Actual: {fmtINR(totalRevenueActual)}
                  </span>
                </>
              )}
            </div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-card-lg transition-shadow">
          <CardContent className="p-3">
            <p className="text-[10px] text-muted-foreground uppercase font-medium">Expense Budget (YTD)</p>
            <p className="text-base font-display font-bold">{fmtINR(totalExpenseBudget)}</p>
            <div className="flex items-center gap-1 mt-1">
              {totalExpenseActual > 0 && (
                <>
                  <span className={cn("text-[10px] font-medium", totalExpenseActual <= totalExpenseBudget ? "text-[#16A34A]" : "text-[#DC2626]")}>
                    Actual: {fmtINR(totalExpenseActual)}
                  </span>
                </>
              )}
            </div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-card-lg transition-shadow">
          <CardContent className="p-3">
            <p className="text-[10px] text-muted-foreground uppercase font-medium">Net Budget</p>
            <p className="text-base font-display font-bold">{fmtINR(totalRevenueBudget - totalExpenseBudget)}</p>
            <p className="text-[10px] text-muted-foreground mt-1">Revenue - Expenses</p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-card-lg transition-shadow">
          <CardContent className="p-3">
            <p className="text-[10px] text-muted-foreground uppercase font-medium">Margin Target</p>
            <p className="text-base font-display font-bold">{((totalRevenueBudget - totalExpenseBudget) / totalRevenueBudget * 100).toFixed(1)}%</p>
            <p className="text-[10px] text-muted-foreground mt-1">Profit margin</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <PieChart className="h-4 w-4 text-navy" /> Budget vs Actual
            </CardTitle>
            <div className="flex items-center gap-2">
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger className="h-8 w-20 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="2024">2024</SelectItem>
                  <SelectItem value="2025">2025</SelectItem>
                  <SelectItem value="2026">2026</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex items-center border border-border rounded-md overflow-hidden">
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn("h-8 text-[10px] rounded-none", viewType === "monthly" && "bg-navy text-white hover:bg-navy")}
                  onClick={() => setViewType("monthly")}
                >
                  Monthly
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn("h-8 text-[10px] rounded-none", viewType === "yearly" && "bg-navy text-white hover:bg-navy")}
                  onClick={() => setViewType("yearly")}
                >
                  Yearly
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {viewType === "monthly" && (
            <>
              {/* Month selector */}
              <div className="flex items-center gap-1 px-4 py-2 border-b border-border overflow-x-auto">
                {monthNames.map((m, i) => (
                  <Button
                    key={m}
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "h-7 text-[10px] px-2 shrink-0",
                      selectedMonth === i && "bg-navy text-white hover:bg-navy"
                    )}
                    onClick={() => setSelectedMonth(i)}
                  >
                    {m}
                  </Button>
                ))}
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-[11px]">Account</TableHead>
                    <TableHead className="text-[11px]">Type</TableHead>
                    <TableHead className="text-[11px] text-right">Budgeted</TableHead>
                    <TableHead className="text-[11px] text-right">Actual</TableHead>
                    <TableHead className="text-[11px] text-right">Variance (₹)</TableHead>
                    <TableHead className="text-[11px] text-right">Variance (%)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {yearlyData.map((b) => {
                    const budget = b.months[selectedMonth];
                    const actual = b.actuals[selectedMonth];
                    const { variance, pct, isGood } = formatVariance(budget, actual, b.type);
                    return (
                      <TableRow key={b.accountCode} className="hover:bg-muted/50">
                        <TableCell className="text-xs">
                          <span className="font-mono text-muted-foreground mr-1">{b.accountCode}</span>
                          <span className="font-medium">{b.accountName}</span>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[9px] h-5" style={{
                            color: b.type === "revenue" ? "#16A34A" : "#D97706",
                            borderColor: b.type === "revenue" ? "#16A34A" : "#D97706",
                          }}>
                            {b.type === "revenue" ? "Rev" : "Exp"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-right tabular-nums">{fmtINR(budget)}</TableCell>
                        <TableCell className="text-xs text-right tabular-nums font-medium">
                          {actual > 0 ? fmtINR(actual) : "—"}
                        </TableCell>
                        <TableCell className="text-xs text-right tabular-nums">
                          {actual > 0 ? (
                            <span className={isGood ? "text-[#16A34A]" : "text-[#DC2626]"}>{variance >= 0 ? "+" : ""}{fmtINR(Math.abs(variance)).replace("₹", variance < 0 ? "-₹" : "₹")}</span>
                          ) : "—"}
                        </TableCell>
                        <TableCell className="text-xs text-right tabular-nums">
                          {actual > 0 ? (
                            <span className={cn("inline-flex items-center rounded px-1 py-0.5 text-[10px] font-medium", isGood ? "bg-[#DCFCE7] text-[#16A34A]" : "bg-[#FFE4E6] text-[#DC2626]")}>
                              {actual >= budget ? <ArrowUpRight className="h-2.5 w-2.5" /> : <ArrowDownRight className="h-2.5 w-2.5" />}
                              {Math.abs(parseFloat(pct))}%
                            </span>
                          ) : "—"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {/* Totals row */}
                  <TableRow className="bg-muted/30 font-semibold">
                    <TableCell className="text-xs font-bold" colSpan={2}>Total</TableCell>
                    <TableCell className="text-xs text-right tabular-nums font-bold">
                      {fmtINR(yearlyData.reduce((s, b) => s + b.months[selectedMonth], 0))}
                    </TableCell>
                    <TableCell className="text-xs text-right tabular-nums font-bold">
                      {fmtINR(yearlyData.reduce((s, b) => s + b.actuals[selectedMonth], 0))}
                    </TableCell>
                    <TableCell colSpan={2} />
                  </TableRow>
                </TableBody>
              </Table>
            </>
          )}
          {viewType === "yearly" && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-[11px]">Account</TableHead>
                  <TableHead className="text-[11px]">Type</TableHead>
                  <TableHead className="text-[11px] text-right">Annual Budget</TableHead>
                  <TableHead className="text-[11px] text-right">YTD Actual</TableHead>
                  <TableHead className="text-[11px] text-right">Variance (₹)</TableHead>
                  <TableHead className="text-[11px] text-right">Variance (%)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* Revenue section */}
                <TableRow className="bg-[#DCFCE7]/30">
                  <TableCell className="text-xs font-bold" colSpan={6}>REVENUE</TableCell>
                </TableRow>
                {yearlyData.filter((b) => b.type === "revenue").map((b) => {
                  const { variance, pct, isGood } = formatVariance(b.totalBudget, b.totalActual, b.type);
                  return (
                    <TableRow key={b.accountCode} className="hover:bg-muted/50">
                      <TableCell className="text-xs pl-6">
                        <span className="font-mono text-muted-foreground mr-1">{b.accountCode}</span>
                        <span className="font-medium">{b.accountName}</span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[9px] h-5" style={{ color: "#16A34A", borderColor: "#16A34A" }}>Rev</Badge>
                      </TableCell>
                      <TableCell className="text-xs text-right tabular-nums">{fmtINR(b.totalBudget)}</TableCell>
                      <TableCell className="text-xs text-right tabular-nums font-medium">{b.totalActual > 0 ? fmtINR(b.totalActual) : "—"}</TableCell>
                      <TableCell className="text-xs text-right tabular-nums">
                        {b.totalActual > 0 ? (
                          <span className={isGood ? "text-[#16A34A]" : "text-[#DC2626]"}>{variance >= 0 ? "+" : ""}{fmtINR(Math.abs(variance)).replace("₹", variance < 0 ? "-₹" : "₹")}</span>
                        ) : "—"}
                      </TableCell>
                      <TableCell className="text-xs text-right tabular-nums">
                        {b.totalActual > 0 ? (
                          <span className={cn("inline-flex items-center rounded px-1 py-0.5 text-[10px] font-medium", isGood ? "bg-[#DCFCE7] text-[#16A34A]" : "bg-[#FFE4E6] text-[#DC2626]")}>
                            {b.totalActual >= b.totalBudget ? <ArrowUpRight className="h-2.5 w-2.5" /> : <ArrowDownRight className="h-2.5 w-2.5" />}
                            {Math.abs(parseFloat(pct))}%
                          </span>
                        ) : "—"}
                      </TableCell>
                    </TableRow>
                  );
                })}
                <TableRow className="bg-[#DCFCE7]/20 font-semibold">
                  <TableCell className="text-xs font-bold" colSpan={2}>Total Revenue</TableCell>
                  <TableCell className="text-xs text-right tabular-nums font-bold">{fmtINR(totalRevenueBudget)}</TableCell>
                  <TableCell className="text-xs text-right tabular-nums font-bold">{totalRevenueActual > 0 ? fmtINR(totalRevenueActual) : "—"}</TableCell>
                  <TableCell colSpan={2} />
                </TableRow>
                {/* Expense section */}
                <TableRow className="bg-[#FFE4E6]/30">
                  <TableCell className="text-xs font-bold" colSpan={6}>EXPENSES</TableCell>
                </TableRow>
                {yearlyData.filter((b) => b.type === "expense").map((b) => {
                  const { variance, pct, isGood } = formatVariance(b.totalBudget, b.totalActual, b.type);
                  return (
                    <TableRow key={b.accountCode} className="hover:bg-muted/50">
                      <TableCell className="text-xs pl-6">
                        <span className="font-mono text-muted-foreground mr-1">{b.accountCode}</span>
                        <span className="font-medium">{b.accountName}</span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[9px] h-5" style={{ color: "#D97706", borderColor: "#D97706" }}>Exp</Badge>
                      </TableCell>
                      <TableCell className="text-xs text-right tabular-nums">{fmtINR(b.totalBudget)}</TableCell>
                      <TableCell className="text-xs text-right tabular-nums font-medium">{b.totalActual > 0 ? fmtINR(b.totalActual) : "—"}</TableCell>
                      <TableCell className="text-xs text-right tabular-nums">
                        {b.totalActual > 0 ? (
                          <span className={isGood ? "text-[#16A34A]" : "text-[#DC2626]"}>{variance >= 0 ? "+" : ""}{fmtINR(Math.abs(variance)).replace("₹", variance < 0 ? "-₹" : "₹")}</span>
                        ) : "—"}
                      </TableCell>
                      <TableCell className="text-xs text-right tabular-nums">
                        {b.totalActual > 0 ? (
                          <span className={cn("inline-flex items-center rounded px-1 py-0.5 text-[10px] font-medium", isGood ? "bg-[#DCFCE7] text-[#16A34A]" : "bg-[#FFE4E6] text-[#DC2626]")}>
                            {variance <= 0 ? <ArrowDownRight className="h-2.5 w-2.5" /> : <ArrowUpRight className="h-2.5 w-2.5" />}
                            {Math.abs(parseFloat(pct))}%
                          </span>
                        ) : "—"}
                      </TableCell>
                    </TableRow>
                  );
                })}
                <TableRow className="bg-[#FFE4E6]/20 font-semibold">
                  <TableCell className="text-xs font-bold" colSpan={2}>Total Expenses</TableCell>
                  <TableCell className="text-xs text-right tabular-nums font-bold">{fmtINR(totalExpenseBudget)}</TableCell>
                  <TableCell className="text-xs text-right tabular-nums font-bold">{totalExpenseActual > 0 ? fmtINR(totalExpenseActual) : "—"}</TableCell>
                  <TableCell colSpan={2} />
                </TableRow>
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── TRIAL BALANCE TAB ────────────────────────────────────────────────────

function TrialBalanceTab() {
  const [asOfDate, setAsOfDate] = useState("2025-01-15");
  const [search, setSearch] = useState("");

  // Build trial balance from accounts (only leaf accounts)
  const leafAccounts = MOCK_ACCOUNTS.filter(
    (a) => !MOCK_ACCOUNTS.some((c) => c.parentId === a.code)
  );

  const trialBalanceData = leafAccounts
    .filter((a) => a.active)
    .filter(
      (a) =>
        a.name.toLowerCase().includes(search.toLowerCase()) ||
        a.code.includes(search)
    )
    .map((a) => {
      const isDebit = a.type === "asset" || a.type === "expense";
      return {
        code: a.code,
        name: a.name,
        type: a.type,
        debit: isDebit ? a.balance : 0,
        credit: !isDebit ? a.balance : 0,
      };
    });

  const totalDebit = trialBalanceData.reduce((s, a) => s + a.debit, 0);
  const totalCredit = trialBalanceData.reduce((s, a) => s + a.credit, 0);
  const isBalanced = totalDebit === totalCredit;

  // Grouped by type
  const grouped = (["asset", "liability", "equity", "revenue", "expense"] as const).map((type) => {
    const meta = ACCOUNT_TYPE_META[type];
    const accounts = trialBalanceData.filter((a) => a.type === type);
    const typeDebit = accounts.reduce((s, a) => s + a.debit, 0);
    const typeCredit = accounts.reduce((s, a) => s + a.credit, 0);
    return { type, meta, accounts, typeDebit, typeCredit };
  });

  return (
    <div className="space-y-4">
      {/* Balance indicator */}
      <Card className={cn("border-2", isBalanced ? "border-[#16A34A]" : "border-[#DC2626]")}>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className={cn("h-12 w-12 flex items-center justify-center rounded-xl", isBalanced ? "bg-[#DCFCE7]" : "bg-[#FFE4E6]")}>
                <Scale className={cn("h-6 w-6", isBalanced ? "text-[#16A34A]" : "text-[#DC2626]")} />
              </div>
              <div>
                <h3 className="text-sm font-bold">
                  {isBalanced ? "Trial Balance is Balanced" : "Trial Balance is NOT Balanced"}
                </h3>
                <p className="text-xs text-muted-foreground">
                  As of {fmtDate(asOfDate)} · {trialBalanceData.length} active accounts
                </p>
              </div>
            </div>
            <div className="flex items-center gap-6">
              <div className="text-center">
                <p className="text-[10px] text-muted-foreground uppercase">Total Debit</p>
                <p className="text-lg font-display font-bold tabular-nums text-[#0369A1]">{fmtINR(totalDebit)}</p>
              </div>
              <div className="text-center">
                <p className="text-[10px] text-muted-foreground uppercase">Total Credit</p>
                <p className="text-lg font-display font-bold tabular-nums text-[#16A34A]">{fmtINR(totalCredit)}</p>
              </div>
              <div className="text-center">
                <p className="text-[10px] text-muted-foreground uppercase">Difference</p>
                <p className={cn("text-lg font-display font-bold tabular-nums", isBalanced ? "text-[#16A34A]" : "text-[#DC2626]")}>
                  {fmtINR(Math.abs(totalDebit - totalCredit))}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Scale className="h-4 w-4 text-navy" /> Trial Balance Detail
            </CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input placeholder="Search accounts..." className="pl-8 h-8 w-48 text-xs" value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
              <div className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                <Input type="date" className="h-8 w-36 text-xs" value={asOfDate} onChange={(e) => setAsOfDate(e.target.value)} />
              </div>
              <Button variant="outline" size="sm" className="h-8 text-xs">
                <Download className="h-3 w-3 mr-1" /> Export
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-[11px]">Account Code</TableHead>
                <TableHead className="text-[11px]">Account Name</TableHead>
                <TableHead className="text-[11px]">Type</TableHead>
                <TableHead className="text-[11px] text-right">Debit (₹)</TableHead>
                <TableHead className="text-[11px] text-right">Credit (₹)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {grouped.map(({ type, meta, accounts, typeDebit, typeCredit }) => (
                <>
                  <TableRow key={`header-${type}`} className={cn("bg-muted/20", type === "asset" && "bg-[#0369A1]/5", type === "revenue" && "bg-[#16A34A]/5", type === "expense" && "bg-[#D97706]/5")}>
                    <TableCell className="text-xs font-bold" colSpan={3}>
                      <div className="flex items-center gap-1.5">
                        <meta.icon className="h-3.5 w-3.5" style={{ color: meta.color }} />
                        {meta.label}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-right tabular-nums font-bold">{typeDebit > 0 ? fmtINR(typeDebit) : ""}</TableCell>
                    <TableCell className="text-xs text-right tabular-nums font-bold">{typeCredit > 0 ? fmtINR(typeCredit) : ""}</TableCell>
                  </TableRow>
                  {accounts.map((a) => (
                    <TableRow key={a.code} className="hover:bg-muted/50">
                      <TableCell className="text-xs font-mono text-muted-foreground pl-8">{a.code}</TableCell>
                      <TableCell className="text-xs font-medium">{a.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[9px] h-5" style={{ color: meta.color, borderColor: meta.color }}>
                          {meta.label.slice(0, 3)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-right tabular-nums">{a.debit > 0 ? fmtINR(a.debit) : ""}</TableCell>
                      <TableCell className="text-xs text-right tabular-nums">{a.credit > 0 ? fmtINR(a.credit) : ""}</TableCell>
                    </TableRow>
                  ))}
                </>
              ))}
              {/* Grand Total */}
              <TableRow className={cn("border-t-2 border-border font-bold", isBalanced ? "bg-[#DCFCE7]/20" : "bg-[#FFE4E6]/20")}>
                <TableCell className="text-xs font-bold" colSpan={3}>GRAND TOTAL</TableCell>
                <TableCell className="text-xs text-right tabular-nums font-bold">{fmtINR(totalDebit)}</TableCell>
                <TableCell className="text-xs text-right tabular-nums font-bold">{fmtINR(totalCredit)}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────

export function AccountingModule() {
  const { refreshTick } = useAppStore();
  const [activeTab, setActiveTab] = useState("chart-of-accounts");

  // KPI values
  const totalAssets = MOCK_ACCOUNTS.filter((a) => a.type === "asset" && a.parentId === null).reduce((s, a) => s + a.balance, 0);
  const totalLiabilities = MOCK_ACCOUNTS.filter((a) => a.type === "liability" && a.parentId === null).reduce((s, a) => s + a.balance, 0);
  const totalRevenue = MOCK_ACCOUNTS.filter((a) => a.type === "revenue" && a.parentId === null).reduce((s, a) => s + a.balance, 0);
  const pendingBills = MOCK_BILL_VERIFICATIONS.filter((b) => b.status === "pending").length;
  const draftEntries = MOCK_JOURNAL_ENTRIES.filter((e) => e.status === "draft").length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-display font-bold text-foreground flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-navy" /> Accounting
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">Chart of accounts, journal entries, billing verification & financial statements</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-9">
            <Download className="h-3.5 w-3.5 mr-1" /> Export
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        <KpiCard label="Total Assets" value={fmtINR(totalAssets)} icon={Building2} accent="navy" />
        <KpiCard label="Total Liabilities" value={fmtINR(totalLiabilities)} icon={Landmark} accent="error" />
        <KpiCard label="Revenue (MTD)" value={fmtINR(totalRevenue)} icon={TrendingUp} accent="success" delta={8} deltaLabel="vs last month" />
        <KpiCard label="Pending Bills" value={pendingBills} icon={ClipboardCheck} accent="warning" />
        <KpiCard label="Draft Entries" value={draftEntries} icon={Edit} accent="info" />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="chart-of-accounts" className="text-xs">Chart of Accounts</TabsTrigger>
          <TabsTrigger value="journal-entries" className="text-xs">Journal Entries</TabsTrigger>
          <TabsTrigger value="billing-verification" className="text-xs">Billing Verification</TabsTrigger>
          <TabsTrigger value="budget" className="text-xs">Budget</TabsTrigger>
          <TabsTrigger value="trial-balance" className="text-xs">Trial Balance</TabsTrigger>
        </TabsList>

        <TabsContent value="chart-of-accounts" className="mt-4">
          <ChartOfAccountsTab />
        </TabsContent>

        <TabsContent value="journal-entries" className="mt-4">
          <JournalEntriesTab />
        </TabsContent>

        <TabsContent value="billing-verification" className="mt-4">
          <BillingVerificationTab />
        </TabsContent>

        <TabsContent value="budget" className="mt-4">
          <BudgetTab />
        </TabsContent>

        <TabsContent value="trial-balance" className="mt-4">
          <TrialBalanceTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
