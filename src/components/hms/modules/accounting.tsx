// ARIA HMS — Accounting Module (5 tabs: Chart of Accounts, Journal Entries, Billing Verification, Budget, Trial Balance)
"use client";

import { useState, useMemo, useCallback } from "react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/lib/store";
import { useApi, apiPost, apiPut } from "@/lib/api";
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
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  BookOpen, FileText, ClipboardCheck, PieChart, Scale,
  Plus, Search, Download, Filter, ChevronRight, ChevronDown,
  ArrowUpRight, ArrowDownRight, IndianRupee, TrendingUp,
  CheckCircle2, XCircle, AlertTriangle, Edit, Trash2,
  Hash, Calendar, Building2, Wallet, Landmark,
  ArrowRightLeft, Eye, Ban, ChevronLeft, ChevronRight as ChevronRightIcon,
  Package, Loader2,
} from "lucide-react";

// ─── API TYPES ─────────────────────────────────────────────────────────────

interface ApiAccount {
  id: string;
  code: string;
  name: string;
  accountType: "asset" | "liability" | "equity" | "revenue" | "expense";
  subType: string | null;
  parentAccountId: string | null;
  balance: number;
  normalBalance: "debit" | "credit";
  isSystem: boolean;
  isActive: boolean;
  parentAccount: { id: string; code: string; name: string } | null;
  childAccounts: { id: string; code: string; name: string; balance: number }[];
}

interface ApiJournalEntryLine {
  id: string;
  accountId: string;
  debit: number;
  credit: number;
  description: string | null;
  costCenter: string | null;
  account: { id: string; code: string; name: string; accountType: string };
}

interface ApiJournalEntry {
  id: string;
  entryNumber: string;
  entryDate: string;
  description: string;
  referenceId: string | null;
  referenceType: string;
  totalDebit: number;
  totalCredit: number;
  status: "draft" | "posted" | "verified" | "cancelled";
  postedBy: string | null;
  verifiedBy: string | null;
  postedAt: string | null;
  verifiedAt: string | null;
  lines: ApiJournalEntryLine[];
}

interface ApiBillingVerification {
  id: string;
  invoiceId: string | null;
  expenseId: string | null;
  verificationType: string;
  referenceNumber: string | null;
  amount: number;
  verifiedAmount: number;
  discrepancy: number;
  status: "pending" | "verified" | "approved" | "rejected";
  verifiedBy: string | null;
  approvedBy: string | null;
  notes: string | null;
  checklist: string;
  createdAt: string;
}

interface ApiBudgetEntry {
  id: string;
  accountId: string;
  year: number;
  month: number;
  budgetedAmount: number;
  actualAmount: number;
  variance: number;
  notes: string | null;
  account: { id: string; code: string; name: string; accountType: string };
}

interface ApiTrialBalanceRow {
  accountId: string;
  code: string;
  name: string;
  accountType: string;
  normalBalance: string;
  totalDebit: number;
  totalCredit: number;
  balance: number;
  debitBalance: number;
  creditBalance: number;
  parentAccount: { id: string; code: string; name: string } | null;
  childAccounts: { id: string; code: string; name: string; balance: number }[];
}

// ─── FALLBACK DATA ─────────────────────────────────────────────────────────

const FALLBACK_ACCOUNTS: ApiAccount[] = [
  { id: "fa-1000", code: "1000", name: "Current Assets", accountType: "asset", subType: null, parentAccountId: null, balance: 3850000, normalBalance: "debit", isSystem: false, isActive: true, parentAccount: null, childAccounts: [] },
  { id: "fa-1100", code: "1100", name: "Cash & Cash Equivalents", accountType: "asset", subType: null, parentAccountId: "fa-1000", balance: 850000, normalBalance: "debit", isSystem: false, isActive: true, parentAccount: { id: "fa-1000", code: "1000", name: "Current Assets" }, childAccounts: [] },
  { id: "fa-1110", code: "1110", name: "Cash in Hand", accountType: "asset", subType: null, parentAccountId: "fa-1100", balance: 285000, normalBalance: "debit", isSystem: false, isActive: true, parentAccount: { id: "fa-1100", code: "1100", name: "Cash & Cash Equivalents" }, childAccounts: [] },
  { id: "fa-1120", code: "1120", name: "Bank - SBI Current A/c", accountType: "asset", subType: null, parentAccountId: "fa-1100", balance: 565000, normalBalance: "debit", isSystem: false, isActive: true, parentAccount: { id: "fa-1100", code: "1100", name: "Cash & Cash Equivalents" }, childAccounts: [] },
  { id: "fa-1200", code: "1200", name: "Accounts Receivable", accountType: "asset", subType: null, parentAccountId: "fa-1000", balance: 1250000, normalBalance: "debit", isSystem: false, isActive: true, parentAccount: { id: "fa-1000", code: "1000", name: "Current Assets" }, childAccounts: [] },
  { id: "fa-2000", code: "2000", name: "Fixed Assets", accountType: "asset", subType: null, parentAccountId: null, balance: 12500000, normalBalance: "debit", isSystem: false, isActive: true, parentAccount: null, childAccounts: [] },
  { id: "fa-3000", code: "3000", name: "Current Liabilities", accountType: "liability", subType: null, parentAccountId: null, balance: 1850000, normalBalance: "credit", isSystem: false, isActive: true, parentAccount: null, childAccounts: [] },
  { id: "fa-4000", code: "4000", name: "Equity", accountType: "equity", subType: null, parentAccountId: null, balance: 14500000, normalBalance: "credit", isSystem: false, isActive: true, parentAccount: null, childAccounts: [] },
  { id: "fa-5000", code: "5000", name: "Operating Revenue", accountType: "revenue", subType: null, parentAccountId: null, balance: 3476400, normalBalance: "credit", isSystem: false, isActive: true, parentAccount: null, childAccounts: [] },
  { id: "fa-6000", code: "6000", name: "Operating Expenses", accountType: "expense", subType: null, parentAccountId: null, balance: 1374000, normalBalance: "debit", isSystem: false, isActive: true, parentAccount: null, childAccounts: [] },
];

const FALLBACK_JOURNAL_ENTRIES: ApiJournalEntry[] = [
  {
    id: "fje-001", entryNumber: "JE/2025/001", entryDate: "2025-01-15T00:00:00.000Z",
    description: "Room revenue posting - 15 Jan", referenceId: null, referenceType: "Daily Sales",
    totalDebit: 57000, totalCredit: 57000, status: "verified", postedBy: null, verifiedBy: null, postedAt: null, verifiedAt: null,
    lines: [
      { id: "fl1", accountId: "fa-1120", debit: 45000, credit: 0, description: "Card payments received", costCenter: null, account: { id: "fa-1120", code: "1120", name: "Bank - SBI Current A/c", accountType: "asset" } },
      { id: "fl2", accountId: "fa-1110", debit: 12000, credit: 0, description: "Cash received", costCenter: null, account: { id: "fa-1110", code: "1110", name: "Cash in Hand", accountType: "asset" } },
      { id: "fl3", accountId: "fa-5000", debit: 0, credit: 57000, description: "Room charges posted", costCenter: null, account: { id: "fa-5000", code: "5100", name: "Room Revenue", accountType: "revenue" } },
    ],
  },
];

const FALLBACK_BILL_VERIFICATIONS: ApiBillingVerification[] = [
  {
    id: "fbv-001", invoiceId: null, expenseId: null, verificationType: "invoice",
    referenceNumber: "INV-V001", amount: 150000, verifiedAmount: 150000, discrepancy: 0,
    status: "approved", verifiedBy: null, approvedBy: null, notes: "Linen Solutions Pvt Ltd — Housekeeping",
    checklist: JSON.stringify([
      { id: "C1", label: "Invoice matches PO", checked: true },
      { id: "C2", label: "GRN received & verified", checked: true },
      { id: "C3", label: "Quantity matches delivery", checked: true },
      { id: "C4", label: "Price as per agreement", checked: true },
      { id: "C5", label: "GST computation correct", checked: true },
    ]),
    createdAt: "2025-01-15T00:00:00.000Z",
  },
  {
    id: "fbv-002", invoiceId: null, expenseId: null, verificationType: "purchase_order",
    referenceNumber: "PO-2402", amount: 28000, verifiedAmount: 25200, discrepancy: 2800,
    status: "pending", verifiedBy: null, approvedBy: null, notes: "CleanPro Chemicals — Housekeeping",
    checklist: JSON.stringify([
      { id: "C6", label: "Invoice matches PO", checked: true },
      { id: "C7", label: "GRN received & verified", checked: false },
      { id: "C8", label: "Quantity matches delivery", checked: false },
      { id: "C9", label: "Price as per agreement", checked: true },
      { id: "C10", label: "GST computation correct", checked: true },
    ]),
    createdAt: "2025-01-14T00:00:00.000Z",
  },
  {
    id: "fbv-003", invoiceId: null, expenseId: null, verificationType: "expense_claim",
    referenceNumber: "EC-0045", amount: 12500, verifiedAmount: 9800, discrepancy: 2700,
    status: "pending", verifiedBy: null, approvedBy: null, notes: "Staff - Ramesh Kumar — Maintenance",
    checklist: JSON.stringify([
      { id: "C11", label: "Receipts attached", checked: true },
      { id: "C12", label: "Manager approval", checked: true },
      { id: "C13", label: "Within policy limits", checked: false },
      { id: "C14", label: "Amounts reasonable", checked: false },
    ]),
    createdAt: "2025-01-13T00:00:00.000Z",
  },
];

const FALLBACK_BUDGET: ApiBudgetEntry[] = [
  { id: "fbe-1", accountId: "fa-5100", year: 2025, month: 1, budgetedAmount: 2100000, actualAmount: 2183000, variance: 83000, notes: null, account: { id: "fa-5100", code: "5100", name: "Room Revenue", accountType: "revenue" } },
  { id: "fbe-2", accountId: "fa-5100", year: 2025, month: 2, budgetedAmount: 2150000, actualAmount: 0, variance: -2150000, notes: null, account: { id: "fa-5100", code: "5100", name: "Room Revenue", accountType: "revenue" } },
  { id: "fbe-3", accountId: "fa-6100", year: 2025, month: 1, budgetedAmount: 840000, actualAmount: 850000, variance: 10000, notes: null, account: { id: "fa-6100", code: "6100", name: "Salaries & Wages", accountType: "expense" } },
  { id: "fbe-4", accountId: "fa-6100", year: 2025, month: 2, budgetedAmount: 840000, actualAmount: 0, variance: -840000, notes: null, account: { id: "fa-6100", code: "6100", name: "Salaries & Wages", accountType: "expense" } },
  { id: "fbe-5", accountId: "fa-6200", year: 2025, month: 1, budgetedAmount: 120000, actualAmount: 125000, variance: 5000, notes: null, account: { id: "fa-6200", code: "6200", name: "Utilities", accountType: "expense" } },
  { id: "fbe-6", accountId: "fa-5200", year: 2025, month: 1, budgetedAmount: 650000, actualAmount: 682000, variance: 32000, notes: null, account: { id: "fa-5200", code: "5200", name: "F&B Revenue", accountType: "revenue" } },
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
  expense: { label: "Expense", icon: IndianRupee },
  folio: { label: "Folio", icon: FileText },
  grn: { label: "GRN", icon: Package },
};

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// ─── HELPER: parse checklist JSON ──────────────────────────────────────────

interface ChecklistItem { id: string; label: string; checked: boolean; }

function parseChecklist(raw: string): ChecklistItem[] {
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
    return [];
  } catch {
    return [];
  }
}

// ─── CHART OF ACCOUNTS TAB ───────────────────────────────────────────────

function ChartOfAccountsTab() {
  const { refreshTick } = useAppStore();
  const {
    data: rawAccounts,
    loading: accLoading,
    reload: reloadAccounts,
  } = useApi<ApiAccount[]>("/api/accounting/accounts?limit=100", [refreshTick]);

  const accounts = rawAccounts ?? FALLBACK_ACCOUNTS;

  const [search, setSearch] = useState("");
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [newAccount, setNewAccount] = useState({
    code: "",
    name: "",
    accountType: "asset" as ApiAccount["accountType"],
    parentAccountId: "(none)",
    description: "",
  });

  const toggleNode = (id: string) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Expand root nodes on data load
  useMemo(() => {
    if (accounts.length > 0 && expandedNodes.size === 0) {
      const roots = accounts.filter((a) => !a.parentAccountId).map((a) => a.id);
      setExpandedNodes(new Set(roots));
    }
  }, [accounts]);

  const filteredAccounts = accounts.filter(
    (a) =>
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.code.includes(search)
  );

  // Build tree
  const rootAccounts = filteredAccounts.filter((a) => !a.parentAccountId);
  const childrenMap = new Map<string, ApiAccount[]>();
  filteredAccounts.forEach((a) => {
    if (a.parentAccountId) {
      const children = childrenMap.get(a.parentAccountId) ?? [];
      children.push(a);
      childrenMap.set(a.parentAccountId, children);
    }
  });

  const handleCreateAccount = async () => {
    if (!newAccount.code.trim() || !newAccount.name.trim()) {
      toast.error("Account code and name are required");
      return;
    }
    setSubmitting(true);
    try {
      await apiPost("/api/accounting/accounts", {
        code: newAccount.code,
        name: newAccount.name,
        accountType: newAccount.accountType,
        parentAccountId: newAccount.parentAccountId === "(none)" ? null : newAccount.parentAccountId,
        subType: newAccount.description || null,
      });
      toast.success("Account created successfully");
      setShowAddDialog(false);
      setNewAccount({ code: "", name: "", accountType: "asset", parentAccountId: "(none)", description: "" });
      reloadAccounts();
    } catch (e: any) {
      toast.error(e.message || "Failed to create account");
    } finally {
      setSubmitting(false);
    }
  };

  const renderAccountRow = (account: ApiAccount, depth: number) => {
    const hasChildren = childrenMap.has(account.id) && childrenMap.get(account.id)!.length > 0;
    const isExpanded = expandedNodes.has(account.id);
    const typeMeta = ACCOUNT_TYPE_META[account.accountType] || ACCOUNT_TYPE_META.asset;
    const TypeIcon = typeMeta.icon;

    return (
      <div key={account.id}>
        <div
          className={cn(
            "flex items-center gap-2 py-2 px-3 border-b border-border hover:bg-muted/50 cursor-pointer transition-colors",
            depth === 0 && "bg-muted/20"
          )}
          style={{ paddingLeft: `${depth * 24 + 12}px` }}
          onClick={() => hasChildren && toggleNode(account.id)}
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
          <span className={cn("text-xs tabular-nums text-right w-28 shrink-0 font-medium", account.accountType === "asset" || account.accountType === "expense" ? "text-[#0369A1]" : account.accountType === "revenue" ? "text-[#16A34A]" : "text-foreground")}>
            {fmtINR(account.balance)}
          </span>
        </div>
        {hasChildren && isExpanded && childrenMap.get(account.id)!.map((child) => renderAccountRow(child, depth + 1))}
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
                        <Select value={newAccount.accountType} onValueChange={(v) => setNewAccount({ ...newAccount, accountType: v as ApiAccount["accountType"] })}>
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
                      <Select value={newAccount.parentAccountId} onValueChange={(v) => setNewAccount({ ...newAccount, parentAccountId: v })}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="(none)">None (Top Level)</SelectItem>
                          {accounts.filter((a) => !a.parentAccountId || childrenMap.has(a.id)).map((a) => (
                            <SelectItem key={a.id} value={a.id}>{a.code} — {a.name}</SelectItem>
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
                    <Button size="sm" className="bg-navy hover:bg-navy-light text-white h-8 text-xs" onClick={handleCreateAccount} disabled={submitting}>
                      {submitting && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
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
          {accLoading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-4 w-12" />
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-20 ml-auto" />
                </div>
              ))}
            </div>
          ) : (
            rootAccounts.map((root) => renderAccountRow(root, 0))
          )}
        </CardContent>
      </Card>

      {/* Account Type Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {(["asset", "liability", "equity", "revenue", "expense"] as const).map((type) => {
          const meta = ACCOUNT_TYPE_META[type];
          const Icon = meta.icon;
          const total = accounts.filter((a) => a.accountType === type && !a.parentAccountId).reduce((s, a) => s + a.balance, 0);
          const count = accounts.filter((a) => a.accountType === type).length;
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
  const { refreshTick } = useAppStore();
  const {
    data: rawAccounts,
    loading: accLoading,
  } = useApi<ApiAccount[]>("/api/accounting/accounts?limit=100", [refreshTick]);

  const {
    data: rawJE,
    loading: jeLoading,
    reload: reloadJE,
  } = useApi<ApiJournalEntry[]>("/api/accounting/journal-entries?limit=50", [refreshTick]);

  const accounts = rawAccounts ?? FALLBACK_ACCOUNTS;
  const journalEntries = rawJE ?? FALLBACK_JOURNAL_ENTRIES;

  const [search, setSearch] = useState("");
  const [expandedEntry, setExpandedEntry] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [newEntry, setNewEntry] = useState<{
    date: string;
    description: string;
    reference: string;
    lines: { accountId: string; debit: string; credit: string; description: string }[];
  }>({
    date: new Date().toISOString().split("T")[0],
    description: "",
    reference: "",
    lines: [
      { accountId: "", debit: "", credit: "", description: "" },
      { accountId: "", debit: "", credit: "", description: "" },
    ],
  });

  const filtered = journalEntries.filter(
    (e) =>
      e.entryNumber.toLowerCase().includes(search.toLowerCase()) ||
      e.description.toLowerCase().includes(search.toLowerCase()) ||
      (e.referenceType || "").toLowerCase().includes(search.toLowerCase())
  );

  const toggleEntry = (id: string) => {
    setExpandedEntry((prev) => (prev === id ? null : id));
  };

  const addLine = () => {
    setNewEntry((prev) => ({
      ...prev,
      lines: [...prev.lines, { accountId: "", debit: "", credit: "", description: "" }],
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

  const handleCreateEntry = async (status: "draft" | "posted") => {
    if (!newEntry.description.trim()) {
      toast.error("Description is required");
      return;
    }
    const validLines = newEntry.lines.filter((l) => l.accountId);
    if (validLines.length < 2) {
      toast.error("At least 2 lines with accounts are required");
      return;
    }
    const totalDebit = validLines.reduce((s, l) => s + (parseFloat(l.debit) || 0), 0);
    const totalCredit = validLines.reduce((s, l) => s + (parseFloat(l.credit) || 0), 0);
    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      toast.error(`Entry must balance: Debit ${totalDebit} ≠ Credit ${totalCredit}`);
      return;
    }

    setSubmitting(true);
    try {
      await apiPost("/api/accounting/journal-entries", {
        description: newEntry.description,
        entryDate: newEntry.date,
        referenceType: newEntry.reference || "manual",
        status,
        lines: validLines.map((l) => ({
          accountId: l.accountId,
          debit: parseFloat(l.debit) || 0,
          credit: parseFloat(l.credit) || 0,
          description: l.description || null,
        })),
      });
      toast.success(status === "posted" ? "Journal entry posted successfully" : "Journal entry saved as draft");
      setShowCreateDialog(false);
      setNewEntry({
        date: new Date().toISOString().split("T")[0],
        description: "",
        reference: "",
        lines: [
          { accountId: "", debit: "", credit: "", description: "" },
          { accountId: "", debit: "", credit: "", description: "" },
        ],
      });
      reloadJE();
    } catch (e: any) {
      toast.error(e.message || "Failed to create journal entry");
    } finally {
      setSubmitting(false);
    }
  };

  const draftCount = journalEntries.filter((e) => e.status === "draft").length;
  const postedCount = journalEntries.filter((e) => e.status === "posted" || e.status === "verified").length;
  const isLoading = jeLoading || accLoading;

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
              <p className="text-lg font-display font-bold">{jeLoading ? "—" : journalEntries.length}</p>
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
              <p className="text-sm font-display font-bold">{fmtINR(journalEntries.filter((e) => e.status !== "cancelled").reduce((s, e) => s + e.totalDebit, 0))}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <ArrowRightLeft className="h-4 w-4 text-navy" /> Journal Entry Register
              {!jeLoading && <span className="text-muted-foreground font-normal">({filtered.length})</span>}
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
                            <Select value={line.accountId} onValueChange={(v) => updateLine(i, "accountId", v)}>
                              <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="Select..." /></SelectTrigger>
                              <SelectContent>
                                {accounts.filter((a) => a.parentAccountId !== null).map((a) => (
                                  <SelectItem key={a.id} value={a.id}>{a.code} — {a.name}</SelectItem>
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
                    <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => handleCreateEntry("draft")} disabled={submitting}>
                      {submitting && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                      Save as Draft
                    </Button>
                    <Button size="sm" className="bg-navy hover:bg-navy-light text-white h-8 text-xs" onClick={() => handleCreateEntry("posted")} disabled={submitting}>
                      {submitting && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                      Post Entry
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {jeLoading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-20 ml-auto" />
                </div>
              ))}
            </div>
          ) : (
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
                        <TableCell className="text-xs">{fmtDate(entry.entryDate)}</TableCell>
                        <TableCell className="text-xs font-medium">{entry.description}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{entry.referenceType || "—"}</TableCell>
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
                                        <span className="font-mono text-muted-foreground mr-1">{line.account?.code || "—"}</span>
                                        {line.account?.name || "—"}
                                      </TableCell>
                                      <TableCell className="text-xs py-1.5 text-muted-foreground">{line.description || "—"}</TableCell>
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
                                <span className="text-[10px] text-muted-foreground">Status: {JE_STATUS_META[entry.status]?.label || entry.status}</span>
                                <div className="flex gap-2">
                                  {entry.status === "draft" && (
                                    <>
                                      <Button variant="outline" size="sm" className="h-6 text-[10px]" onClick={async () => { try { await apiPut(`/api/accounting/journal-entries/${entry.id}`, { status: "posted" }); toast.success("Journal entry posted"); reloadJE(); } catch (e: any) { toast.error(e.message || "Failed to post entry"); } }}><Eye className="h-3 w-3 mr-1" /> Post</Button>
                                      <Button variant="outline" size="sm" className="h-6 text-[10px] text-[#DC2626]" onClick={async () => { try { await apiPut(`/api/accounting/journal-entries/${entry.id}`, { status: "cancelled" }); toast.success("Journal entry cancelled"); reloadJE(); } catch (e: any) { toast.error(e.message || "Failed to cancel entry"); } }}><Ban className="h-3 w-3 mr-1" /> Cancel</Button>
                                    </>
                                  )}
                                  {entry.status === "posted" && (
                                    <Button variant="outline" size="sm" className="h-6 text-[10px]" onClick={async () => { try { await apiPut(`/api/accounting/journal-entries/${entry.id}`, { status: "verified" }); toast.success("Journal entry verified"); reloadJE(); } catch (e: any) { toast.error(e.message || "Failed to verify entry"); } }}><CheckCircle2 className="h-3 w-3 mr-1" /> Verify</Button>
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
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── BILLING VERIFICATION TAB ─────────────────────────────────────────────

function BillingVerificationTab() {
  const { refreshTick } = useAppStore();
  const {
    data: rawBV,
    loading: bvLoading,
    reload: reloadBV,
  } = useApi<ApiBillingVerification[]>("/api/accounting/billing-verification?limit=50", [refreshTick]);

  const billVerifications = rawBV ?? FALLBACK_BILL_VERIFICATIONS;

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [expandedBill, setExpandedBill] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newBV, setNewBV] = useState({
    verificationType: "invoice",
    referenceNumber: "",
    amount: "",
    verifiedAmount: "",
    notes: "",
  });

  // Parse checklist states from API data
  const checklistStates = useMemo<Record<string, Record<string, boolean>>>(() => {
    const states: Record<string, Record<string, boolean>> = {};
    billVerifications.forEach((bv) => {
      states[bv.id] = {};
      const items = parseChecklist(bv.checklist);
      items.forEach((item: ChecklistItem) => {
        states[bv.id][item.id] = item.checked;
      });
    });
    return states;
  }, [billVerifications]);

  const [localChecklist, setLocalChecklist] = useState<Record<string, Record<string, boolean>>>({});

  const getChecklistState = (billId: string, itemId: string): boolean => {
    return localChecklist[billId]?.[itemId] ?? checklistStates[billId]?.[itemId] ?? false;
  };

  const toggleChecklist = (billId: string, itemId: string) => {
    setLocalChecklist((prev) => ({
      ...prev,
      [billId]: {
        ...prev[billId],
        [itemId]: !getChecklistState(billId, itemId),
      },
    }));
  };

  const allChecked = (billId: string) => {
    const bill = billVerifications.find((b) => b.id === billId);
    if (!bill) return false;
    const items = parseChecklist(bill.checklist);
    return items.every((item: ChecklistItem) => getChecklistState(billId, item.id));
  };

  const filtered = billVerifications.filter((bv) => {
    const matchesSearch =
      (bv.referenceNumber || "").toLowerCase().includes(search.toLowerCase()) ||
      (bv.notes || "").toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || bv.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const pendingCount = billVerifications.filter((b) => b.status === "pending").length;
  const totalDiscrepancy = billVerifications.filter((b) => b.status === "pending").reduce((s, b) => s + b.discrepancy, 0);
  const totalPendingAmount = billVerifications.filter((b) => b.status === "pending").reduce((s, b) => s + b.amount, 0);

  const handleCreateBV = async () => {
    const amount = parseFloat(newBV.amount);
    if (!newBV.verificationType || isNaN(amount)) {
      toast.error("Verification type and valid amount are required");
      return;
    }
    setSubmitting(true);
    try {
      await apiPost("/api/accounting/billing-verification", {
        verificationType: newBV.verificationType,
        referenceNumber: newBV.referenceNumber || null,
        amount,
        verifiedAmount: parseFloat(newBV.verifiedAmount) || 0,
        notes: newBV.notes || null,
        status: "pending",
      });
      toast.success("Billing verification created successfully");
      setShowCreateDialog(false);
      setNewBV({ verificationType: "invoice", referenceNumber: "", amount: "", verifiedAmount: "", notes: "" });
      reloadBV();
    } catch (e: any) {
      toast.error(e.message || "Failed to create billing verification");
    } finally {
      setSubmitting(false);
    }
  };

  // Helper to extract vendor/department from notes
  const parseNotes = (notes: string | null): { vendor: string; department: string } => {
    if (!notes) return { vendor: "—", department: "—" };
    const parts = notes.split("—").map((s) => s.trim());
    return {
      vendor: parts[0] || "—",
      department: parts[1] || "—",
    };
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
              <p className="text-lg font-display font-bold">{bvLoading ? "—" : pendingCount}</p>
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
              <p className="text-lg font-display font-bold">{billVerifications.filter((b) => b.status === "approved").length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <ClipboardCheck className="h-4 w-4 text-navy" /> Bill Verification
              {!bvLoading && <span className="text-muted-foreground font-normal">({filtered.length})</span>}
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
              <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                <DialogTrigger asChild>
                  <Button size="sm" className="bg-navy hover:bg-navy-light text-white h-8 text-xs">
                    <Plus className="h-3.5 w-3.5 mr-1" /> New Verification
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle className="text-sm font-semibold">New Bill Verification</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-3 py-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium">Verification Type</label>
                        <Select value={newBV.verificationType} onValueChange={(v) => setNewBV({ ...newBV, verificationType: v })}>
                          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="invoice">Invoice</SelectItem>
                            <SelectItem value="purchase_order">Purchase Order</SelectItem>
                            <SelectItem value="expense">Expense</SelectItem>
                            <SelectItem value="folio">Folio</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium">Reference Number</label>
                        <Input placeholder="e.g. INV-V007" className="h-8 text-xs" value={newBV.referenceNumber} onChange={(e) => setNewBV({ ...newBV, referenceNumber: e.target.value })} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium">Bill Amount (₹)</label>
                        <Input type="number" placeholder="0" className="h-8 text-xs" value={newBV.amount} onChange={(e) => setNewBV({ ...newBV, amount: e.target.value })} />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium">Verified Amount (₹)</label>
                        <Input type="number" placeholder="0" className="h-8 text-xs" value={newBV.verifiedAmount} onChange={(e) => setNewBV({ ...newBV, verifiedAmount: e.target.value })} />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium">Notes (Vendor — Department)</label>
                      <Input placeholder="e.g. Vendor Name — Department" className="h-8 text-xs" value={newBV.notes} onChange={(e) => setNewBV({ ...newBV, notes: e.target.value })} />
                    </div>
                  </div>
                  <DialogFooter className="gap-2">
                    <DialogClose asChild>
                      <Button variant="outline" size="sm" className="h-8 text-xs">Cancel</Button>
                    </DialogClose>
                    <Button size="sm" className="bg-navy hover:bg-navy-light text-white h-8 text-xs" onClick={handleCreateBV} disabled={submitting}>
                      {submitting && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                      Create Verification
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {bvLoading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-20 ml-auto" />
                </div>
              ))}
            </div>
          ) : (
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
                  const vType = VERIFICATION_TYPE_META[bv.verificationType] || VERIFICATION_TYPE_META.invoice;
                  const VIcon = vType.icon;
                  const isExpanded = expandedBill === bv.id;
                  const { vendor, department } = parseNotes(bv.notes);
                  const checklistItems = parseChecklist(bv.checklist);
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
                        <TableCell className="text-xs font-mono font-medium">{bv.referenceNumber || "—"}</TableCell>
                        <TableCell className="text-xs">{vendor}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{department}</TableCell>
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
                          <span className={cn("inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-medium", st?.cls || "")}>{st?.label || bv.status}</span>
                        </TableCell>
                      </TableRow>
                      {isExpanded && (
                        <TableRow key={`${bv.id}-detail`} className="bg-muted/10">
                          <TableCell colSpan={9} className="p-0">
                            <div className="px-12 py-3 space-y-3">
                              <div className="flex items-center justify-between">
                                <div className="text-[10px] font-semibold uppercase text-muted-foreground">Verification Checklist</div>
                                <div className="text-[10px] text-muted-foreground">{fmtDate(bv.createdAt)}</div>
                              </div>
                              {checklistItems.length > 0 ? (
                                <div className="space-y-1.5">
                                  {checklistItems.map((item: ChecklistItem) => (
                                    <label key={item.id} className="flex items-center gap-2 py-1 px-2 rounded hover:bg-muted/50 cursor-pointer">
                                      <Checkbox
                                        checked={getChecklistState(bv.id, item.id)}
                                        onCheckedChange={() => toggleChecklist(bv.id, item.id)}
                                        className="h-3.5 w-3.5"
                                      />
                                      <span className={cn("text-xs", getChecklistState(bv.id, item.id) ? "text-foreground" : "text-muted-foreground line-through")}>
                                        {item.label}
                                      </span>
                                    </label>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-xs text-muted-foreground italic">No checklist items</p>
                              )}
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
                                  <Button size="sm" className="bg-[#16A34A] hover:bg-[#15803D] text-white h-7 text-[10px]" disabled={!allChecked(bv.id)} onClick={async () => { try { await apiPut(`/api/accounting/billing-verification/${bv.id}`, { status: "verified" }); toast.success("Billing verified"); reloadBV(); } catch (e: any) { toast.error(e.message || "Failed to verify"); } }}>
                                    <CheckCircle2 className="h-3 w-3 mr-1" /> Verify
                                  </Button>
                                  <Button size="sm" className="bg-navy hover:bg-navy-light text-white h-7 text-[10px]" disabled={!allChecked(bv.id)} onClick={async () => { try { await apiPut(`/api/accounting/billing-verification/${bv.id}`, { status: "approved" }); toast.success("Billing approved"); reloadBV(); } catch (e: any) { toast.error(e.message || "Failed to approve"); } }}>
                                    Approve
                                  </Button>
                                  <Button variant="outline" size="sm" className="h-7 text-[10px] text-[#DC2626] border-[#DC2626] hover:bg-[#FFE4E6]" onClick={async () => { try { await apiPut(`/api/accounting/billing-verification/${bv.id}`, { status: "rejected" }); toast.success("Billing rejected"); reloadBV(); } catch (e: any) { toast.error(e.message || "Failed to reject"); } }}>
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
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── BUDGET TAB ───────────────────────────────────────────────────────────

function BudgetTab() {
  const { refreshTick } = useAppStore();
  const [selectedYear, setSelectedYear] = useState("2025");
  const [viewType, setViewType] = useState<"monthly" | "yearly">("monthly");
  const [selectedMonth, setSelectedMonth] = useState(0); // 0 = Jan
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [newBudget, setNewBudget] = useState({
    accountId: "",
    month: "1",
    budgetedAmount: "",
    actualAmount: "",
    notes: "",
  });

  const {
    data: rawAccounts,
    loading: accLoading,
  } = useApi<ApiAccount[]>("/api/accounting/accounts?limit=100", [refreshTick]);

  const {
    data: rawBudget,
    loading: budgetLoading,
    reload: reloadBudget,
  } = useApi<ApiBudgetEntry[]>(`/api/accounting/budget?year=${selectedYear}`, [refreshTick, selectedYear]);

  const accounts = rawAccounts ?? FALLBACK_ACCOUNTS;
  const budgetEntries = rawBudget ?? FALLBACK_BUDGET;

  const monthNames = MONTH_NAMES;

  // Aggregate budget entries into per-account rows with 12 months
  const aggregatedBudget = useMemo(() => {
    const accountMap = new Map<string, {
      accountCode: string;
      accountName: string;
      type: string;
      months: number[];
      actuals: number[];
    }>();

    for (const entry of budgetEntries) {
      const key = entry.accountId;
      if (!accountMap.has(key)) {
        accountMap.set(key, {
          accountCode: entry.account.code,
          accountName: entry.account.name,
          type: entry.account.accountType,
          months: Array(12).fill(0),
          actuals: Array(12).fill(0),
        });
      }
      const row = accountMap.get(key)!;
      const monthIdx = entry.month - 1;
      if (monthIdx >= 0 && monthIdx < 12) {
        row.months[monthIdx] = entry.budgetedAmount;
        row.actuals[monthIdx] = entry.actualAmount;
      }
    }

    return Array.from(accountMap.values());
  }, [budgetEntries]);

  // Calculate yearly totals
  const yearlyData = aggregatedBudget.map((b) => ({
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

  const handleCreateBudget = async () => {
    const amount = parseFloat(newBudget.budgetedAmount);
    if (!newBudget.accountId || isNaN(amount)) {
      toast.error("Account and budgeted amount are required");
      return;
    }
    setSubmitting(true);
    try {
      await apiPost("/api/accounting/budget", {
        accountId: newBudget.accountId,
        year: parseInt(selectedYear),
        month: parseInt(newBudget.month),
        budgetedAmount: amount,
        actualAmount: parseFloat(newBudget.actualAmount) || 0,
        notes: newBudget.notes || null,
      });
      toast.success("Budget entry created successfully");
      setShowCreateDialog(false);
      setNewBudget({ accountId: "", month: "1", budgetedAmount: "", actualAmount: "", notes: "" });
      reloadBudget();
    } catch (e: any) {
      toast.error(e.message || "Failed to create budget entry");
    } finally {
      setSubmitting(false);
    }
  };

  const isLoading = budgetLoading || accLoading;

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
            <p className={cn("text-base font-display font-bold", totalRevenueBudget - totalExpenseBudget >= 0 ? "text-[#16A34A]" : "text-[#DC2626]")}>
              {fmtINR(totalRevenueBudget - totalExpenseBudget)}
            </p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-card-lg transition-shadow">
          <CardContent className="p-3">
            <p className="text-[10px] text-muted-foreground uppercase font-medium">Budget Entries</p>
            <p className="text-base font-display font-bold">{budgetEntries.length}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <PieChart className="h-4 w-4 text-navy" /> Budget Analysis
            </CardTitle>
            <div className="flex items-center gap-2 flex-wrap">
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger className="h-8 w-24 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="2024">2024</SelectItem>
                  <SelectItem value="2025">2025</SelectItem>
                  <SelectItem value="2026">2026</SelectItem>
                </SelectContent>
              </Select>
              <Select value={viewType} onValueChange={(v) => setViewType(v as "monthly" | "yearly")}>
                <SelectTrigger className="h-8 w-24 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
              {viewType === "monthly" && (
                <div className="flex items-center gap-1">
                  <Button variant="outline" size="sm" className="h-7 w-7 p-0" onClick={() => setSelectedMonth(Math.max(0, selectedMonth - 1))} disabled={selectedMonth === 0}>
                    <ChevronLeft className="h-3 w-3" />
                  </Button>
                  <span className="text-xs font-medium w-10 text-center">{monthNames[selectedMonth]}</span>
                  <Button variant="outline" size="sm" className="h-7 w-7 p-0" onClick={() => setSelectedMonth(Math.min(11, selectedMonth + 1))} disabled={selectedMonth === 11}>
                    <ChevronRightIcon className="h-3 w-3" />
                  </Button>
                </div>
              )}
              <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                <DialogTrigger asChild>
                  <Button size="sm" className="bg-navy hover:bg-navy-light text-white h-8 text-xs">
                    <Plus className="h-3.5 w-3.5 mr-1" /> Add Budget
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle className="text-sm font-semibold">Add Budget Entry</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-3 py-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium">Account</label>
                      <Select value={newBudget.accountId} onValueChange={(v) => setNewBudget({ ...newBudget, accountId: v })}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select account..." /></SelectTrigger>
                        <SelectContent>
                          {accounts.filter((a) => a.accountType === "revenue" || a.accountType === "expense").map((a) => (
                            <SelectItem key={a.id} value={a.id}>{a.code} — {a.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium">Month</label>
                        <Select value={newBudget.month} onValueChange={(v) => setNewBudget({ ...newBudget, month: v })}>
                          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {monthNames.map((m, i) => (
                              <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium">Budgeted Amount (₹)</label>
                        <Input type="number" placeholder="0" className="h-8 text-xs" value={newBudget.budgetedAmount} onChange={(e) => setNewBudget({ ...newBudget, budgetedAmount: e.target.value })} />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium">Actual Amount (₹) (optional)</label>
                      <Input type="number" placeholder="0" className="h-8 text-xs" value={newBudget.actualAmount} onChange={(e) => setNewBudget({ ...newBudget, actualAmount: e.target.value })} />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium">Notes</label>
                      <Input placeholder="Optional notes" className="h-8 text-xs" value={newBudget.notes} onChange={(e) => setNewBudget({ ...newBudget, notes: e.target.value })} />
                    </div>
                  </div>
                  <DialogFooter className="gap-2">
                    <DialogClose asChild>
                      <Button variant="outline" size="sm" className="h-8 text-xs">Cancel</Button>
                    </DialogClose>
                    <Button size="sm" className="bg-navy hover:bg-navy-light text-white h-8 text-xs" onClick={handleCreateBudget} disabled={submitting}>
                      {submitting && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                      Create Entry
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
          ) : (
            <>
              {viewType === "monthly" && (
                <>
                  {/* Monthly bar-style visualization */}
                  <div className="px-4 py-3 border-b border-border bg-muted/10">
                    <div className="text-xs font-semibold mb-2">{monthNames[selectedMonth]} {selectedYear} — Budget vs Actual</div>
                    <div className="space-y-2">
                      {yearlyData.map((b) => {
                        const budget = b.months[selectedMonth];
                        const actual = b.actuals[selectedMonth];
                        const maxVal = Math.max(budget, actual, 1);
                        const { variance, isGood } = formatVariance(budget, actual, b.type);
                        return (
                          <div key={b.accountCode} className="space-y-0.5">
                            <div className="flex items-center justify-between text-[10px]">
                              <span className="font-medium">{b.accountCode} {b.accountName}</span>
                              <span className={cn("font-medium", actual > 0 ? (isGood ? "text-[#16A34A]" : "text-[#DC2626]") : "text-muted-foreground")}>
                                {actual > 0 ? `${fmtINR(actual)} / ${fmtINR(budget)}` : `Budget: ${fmtINR(budget)}`}
                              </span>
                            </div>
                            <div className="flex gap-0.5 h-2.5">
                              <div
                                className="rounded-l bg-[#0369A1]/60"
                                style={{ width: `${(budget / maxVal) * 100}%` }}
                              />
                              <div
                                className={cn("rounded-r", actual > 0 ? (isGood ? "bg-[#16A34A]/60" : "bg-[#DC2626]/60") : "bg-muted/30")}
                                style={{ width: `${(Math.max(actual, 0) / maxVal) * 100}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
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
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── TRIAL BALANCE TAB ────────────────────────────────────────────────────

function TrialBalanceTab() {
  const { refreshTick } = useAppStore();
  const [asOfDate, setAsOfDate] = useState(new Date().toISOString().split("T")[0]);
  const [search, setSearch] = useState("");

  const {
    data: rawTB,
    loading: tbLoading,
    reload: reloadTB,
  } = useApi<ApiTrialBalanceRow[]>(`/api/accounting/trial-balance?asOfDate=${asOfDate}`, [refreshTick, asOfDate]);

  const trialBalanceData = rawTB ?? [];

  const totalDebit = trialBalanceData.reduce((s, a) => s + a.debitBalance, 0);
  const totalCredit = trialBalanceData.reduce((s, a) => s + a.creditBalance, 0);
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;

  const filteredData = trialBalanceData.filter(
    (a) =>
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.code.includes(search)
  );

  // Grouped by type
  const grouped = (["asset", "liability", "equity", "revenue", "expense"] as const).map((type) => {
    const meta = ACCOUNT_TYPE_META[type];
    const accounts = filteredData.filter((a) => a.accountType === type);
    const typeDebit = accounts.reduce((s, a) => s + a.debitBalance, 0);
    const typeCredit = accounts.reduce((s, a) => s + a.creditBalance, 0);
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
                  {tbLoading ? "Loading..." : isBalanced ? "Trial Balance is Balanced" : "Trial Balance is NOT Balanced"}
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
          {tbLoading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
          ) : (
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
                      <TableRow key={a.accountId} className="hover:bg-muted/50">
                        <TableCell className="text-xs font-mono text-muted-foreground pl-8">{a.code}</TableCell>
                        <TableCell className="text-xs font-medium">{a.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[9px] h-5" style={{ color: meta.color, borderColor: meta.color }}>
                            {meta.label.slice(0, 3)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-right tabular-nums">{a.debitBalance > 0 ? fmtINR(a.debitBalance) : ""}</TableCell>
                        <TableCell className="text-xs text-right tabular-nums">{a.creditBalance > 0 ? fmtINR(a.creditBalance) : ""}</TableCell>
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
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────

export function AccountingModule() {
  const { refreshTick } = useAppStore();
  const [activeTab, setActiveTab] = useState("chart-of-accounts");

  // Fetch accounts for KPI computation
  const {
    data: rawAccounts,
    loading: accLoading,
  } = useApi<ApiAccount[]>("/api/accounting/accounts?limit=100", [refreshTick]);

  const {
    data: rawJE,
    loading: jeLoading,
  } = useApi<ApiJournalEntry[]>("/api/accounting/journal-entries?limit=50", [refreshTick]);

  const {
    data: rawBV,
    loading: bvLoading,
  } = useApi<ApiBillingVerification[]>("/api/accounting/billing-verification?limit=50", [refreshTick]);

  const accounts = rawAccounts ?? FALLBACK_ACCOUNTS;
  const journalEntries = rawJE ?? FALLBACK_JOURNAL_ENTRIES;
  const billVerifications = rawBV ?? FALLBACK_BILL_VERIFICATIONS;

  // KPI values
  const totalAssets = accounts.filter((a) => a.accountType === "asset" && !a.parentAccountId).reduce((s, a) => s + a.balance, 0);
  const totalLiabilities = accounts.filter((a) => a.accountType === "liability" && !a.parentAccountId).reduce((s, a) => s + a.balance, 0);
  const totalRevenue = accounts.filter((a) => a.accountType === "revenue" && !a.parentAccountId).reduce((s, a) => s + a.balance, 0);
  const pendingBills = billVerifications.filter((b) => b.status === "pending").length;
  const draftEntries = journalEntries.filter((e) => e.status === "draft").length;
  const isLoading = accLoading || jeLoading || bvLoading;

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
      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i} className="p-3 sm:p-4"><Skeleton className="h-16 w-full" /></Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          <KpiCard label="Total Assets" value={fmtINR(totalAssets)} icon={Building2} accent="navy" />
          <KpiCard label="Total Liabilities" value={fmtINR(totalLiabilities)} icon={Landmark} accent="error" />
          <KpiCard label="Revenue (MTD)" value={fmtINR(totalRevenue)} icon={TrendingUp} accent="success" delta={8} deltaLabel="vs last month" />
          <KpiCard label="Pending Bills" value={pendingBills} icon={ClipboardCheck} accent="warning" />
          <KpiCard label="Draft Entries" value={draftEntries} icon={Edit} accent="info" />
        </div>
      )}

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
