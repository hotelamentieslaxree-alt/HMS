// ARIA HMS — Finance Module (6 tabs: Overview, Invoices, Expenses, GST, Cashbook, P&L)
"use client";

import { useState, useEffect, useMemo } from "react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/lib/store";
import { useApi, apiPost } from "@/lib/api";
import { KpiCard, fmtINR, fmtDate } from "../shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  IndianRupee, TrendingUp, TrendingDown, Wallet, Landmark, FileText,
  Plus, Search, Receipt, CreditCard, ArrowUpRight, ArrowDownRight,
  Download, Filter, PieChart, Calculator, BookOpen, Loader2,
} from "lucide-react";
import { toast } from "sonner";

// ─── TYPES (matching Prisma Invoice / Expense models) ───────────────

interface InvoiceType {
  id: string;
  propertyId: string;
  invoiceNumber: string;
  invoiceType: string;
  partyName: string;
  partyGst: string | null;
  amount: number;
  cgst: number;
  sgst: number;
  igst: number;
  totalAmount: number;
  status: string;
  dueDate: string | null;
  paidAmount: number;
  notes: string | null;
  reservationId: string | null;
  folioId: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ExpenseType {
  id: string;
  propertyId: string;
  category: string;
  description: string;
  amount: number;
  paidTo: string | null;
  paymentMethod: string;
  receiptUrl: string | null;
  expenseDate: string;
  approvedById: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

// ─── FALLBACK DATA (graceful degradation when API fails) ────────────

const FALLBACK_INVOICES: InvoiceType[] = [
  { id: "fb1", propertyId: "", invoiceNumber: "INV-2401", invoiceType: "tax_invoice", partyName: "Rajesh Sharma", partyGst: null, amount: 18200, cgst: 1638, sgst: 1638, igst: 0, totalAmount: 21476, status: "paid", dueDate: null, paidAmount: 21476, notes: null, reservationId: null, folioId: null, createdAt: "2025-01-14T00:00:00.000Z", updatedAt: "2025-01-14T00:00:00.000Z" },
  { id: "fb2", propertyId: "", invoiceNumber: "INV-2402", invoiceType: "tax_invoice", partyName: "Priya Nair", partyGst: null, amount: 9500, cgst: 855, sgst: 855, igst: 0, totalAmount: 11210, status: "pending", dueDate: null, paidAmount: 0, notes: null, reservationId: null, folioId: null, createdAt: "2025-01-14T00:00:00.000Z", updatedAt: "2025-01-14T00:00:00.000Z" },
  { id: "fb3", propertyId: "", invoiceNumber: "INV-2403", invoiceType: "tax_invoice", partyName: "Corporate - TCS Ltd", partyGst: null, amount: 125000, cgst: 11250, sgst: 11250, igst: 0, totalAmount: 147500, status: "paid", dueDate: null, paidAmount: 147500, notes: null, reservationId: null, folioId: null, createdAt: "2025-01-13T00:00:00.000Z", updatedAt: "2025-01-13T00:00:00.000Z" },
  { id: "fb4", propertyId: "", invoiceNumber: "INV-2404", invoiceType: "tax_invoice", partyName: "Arun Kumar", partyGst: null, amount: 7800, cgst: 702, sgst: 702, igst: 0, totalAmount: 9204, status: "overdue", dueDate: null, paidAmount: 0, notes: null, reservationId: null, folioId: null, createdAt: "2025-01-10T00:00:00.000Z", updatedAt: "2025-01-10T00:00:00.000Z" },
];

const FALLBACK_EXPENSES: ExpenseType[] = [
  { id: "fb1", propertyId: "", category: "Salaries", description: "Staff salaries - Jan", amount: 850000, paidTo: null, paymentMethod: "bank_transfer", receiptUrl: null, expenseDate: "2025-01-01T00:00:00.000Z", approvedById: null, status: "approved", createdAt: "2025-01-01T00:00:00.000Z", updatedAt: "2025-01-01T00:00:00.000Z" },
  { id: "fb2", propertyId: "", category: "Utilities", description: "Electricity bill", amount: 125000, paidTo: null, paymentMethod: "bank_transfer", receiptUrl: null, expenseDate: "2025-01-05T00:00:00.000Z", approvedById: null, status: "approved", createdAt: "2025-01-05T00:00:00.000Z", updatedAt: "2025-01-05T00:00:00.000Z" },
];

const FALLBACK_CASHBOOK = [
  { id: "CB-001", date: "2025-01-15", description: "Room revenue - Cash", type: "credit", amount: 45000, balance: 285000, account: "Cash" },
  { id: "CB-002", date: "2025-01-15", description: "Vendor payment - Linen", type: "debit", amount: 35000, balance: 250000, account: "Cash" },
  { id: "CB-003", date: "2025-01-15", description: "F&B revenue - Card", type: "credit", amount: 28000, balance: 278000, account: "Bank" },
  { id: "CB-004", date: "2025-01-14", description: "Salary advance - Staff", type: "debit", amount: 15000, balance: 320000, account: "Cash" },
  { id: "CB-005", date: "2025-01-14", description: "OTA settlement - Booking.com", type: "credit", amount: 67000, balance: 335000, account: "Bank" },
  { id: "CB-006", date: "2025-01-14", description: "Electricity payment", type: "debit", amount: 45000, balance: 268000, account: "Bank" },
];

// ─── STATUS META ─────────────────────────────────────────────────────

const INV_STATUS_META: Record<string, { label: string; cls: string }> = {
  paid: { label: "Paid", cls: "bg-[#DCFCE7] text-[#14532D] border-[#16A34A]" },
  draft: { label: "Draft", cls: "bg-[#E5E7EB] text-[#374151] border-[#6B7280]" },
  sent: { label: "Sent", cls: "bg-[#DBEAFE] text-[#1B3A6B] border-[#0369A1]" },
  pending: { label: "Pending", cls: "bg-[#FEF3C7] text-[#78350F] border-[#D97706]" },
  partial: { label: "Partial", cls: "bg-[#E0E7FF] text-[#3730A3] border-[#6366F1]" },
  overdue: { label: "Overdue", cls: "bg-[#FFE4E6] text-[#881337] border-[#DC2626]" },
  cancelled: { label: "Cancelled", cls: "bg-[#E5E7EB] text-[#374151] border-[#6B7280]" },
};

const EXP_STATUS_META: Record<string, { label: string; cls: string }> = {
  approved: { label: "Approved", cls: "bg-[#DCFCE7] text-[#14532D] border-[#16A34A]" },
  pending: { label: "Pending", cls: "bg-[#FEF3C7] text-[#78350F] border-[#D97706]" },
  rejected: { label: "Rejected", cls: "bg-[#FFE4E6] text-[#881337] border-[#DC2626]" },
  paid: { label: "Paid", cls: "bg-[#DBEAFE] text-[#1B3A6B] border-[#0369A1]" },
};

const EXPENSE_CATEGORIES = ["utilities", "salary", "supplies", "maintenance", "marketing", "travel", "food", "miscellaneous"];

// ─── MAIN COMPONENT ──────────────────────────────────────────────────

export function FinanceModule() {
  const { refreshTick, activeSubModule } = useAppStore();
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("overview");

  // ── API data ──
  const {
    data: rawInvoices,
    loading: invLoading,
    error: invError,
    reload: reloadInvoices,
  } = useApi<InvoiceType[]>("/api/finance/invoices?limit=100", [refreshTick]);

  const {
    data: rawExpenses,
    loading: expLoading,
    error: expError,
    reload: reloadExpenses,
  } = useApi<ExpenseType[]>("/api/finance/expenses?limit=100", [refreshTick]);

  // Graceful degradation: fall back to static data if API fails
  const invoices = rawInvoices ?? FALLBACK_INVOICES;
  const expenses = rawExpenses ?? FALLBACK_EXPENSES;
  const cashbook = FALLBACK_CASHBOOK; // No API route yet — keep fallback

  // ── Dialog state ──
  const [invoiceDialogOpen, setInvoiceDialogOpen] = useState(false);
  const [expenseDialogOpen, setExpenseDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // ── Invoice form state ──
  const [invForm, setInvForm] = useState({
    partyName: "",
    amount: "",
    cgst: "",
    sgst: "",
    igst: "",
    status: "draft",
    dueDate: "",
    notes: "",
    invoiceType: "tax_invoice",
  });

  // ── Expense form state ──
  const [expForm, setExpForm] = useState({
    category: "utilities",
    description: "",
    amount: "",
    paidTo: "",
    paymentMethod: "cash",
    expenseDate: new Date().toISOString().slice(0, 10),
    status: "pending",
  });

  // Sync sidebar sub-module navigation to active tab
  useEffect(() => {
    const subMap: Record<string, string> = {
      invoices: "invoices",
      expenses: "expenses",
      gst: "gst",
      cashbook: "cashbook",
      pnl: "pnl",
    };
    if (activeSubModule && subMap[activeSubModule]) {
      setActiveTab(subMap[activeSubModule]);
    }
  }, [activeSubModule]);

  // ── Computed KPIs from real data ──
  const totalRevenue = useMemo(
    () => invoices.reduce((s, i) => s + (i.totalAmount || 0), 0),
    [invoices],
  );
  const totalExpenses = useMemo(
    () => expenses.reduce((s, e) => s + (e.amount || 0), 0),
    [expenses],
  );
  const profit = totalRevenue - totalExpenses;
  const outstanding = useMemo(
    () => invoices.filter((i) => i.status === "pending" || i.status === "overdue").reduce((s, i) => s + (i.totalAmount || 0), 0),
    [invoices],
  );

  // ── Computed GST summary from invoices ──
  const gstSummary = useMemo(() => {
    const byType: Record<string, { taxable: number; cgst: number; sgst: number; igst: number }> = {};
    for (const inv of invoices) {
      const cat = inv.invoiceType === "tax_invoice" ? "Room & Services" : inv.invoiceType === "credit_note" ? "Credit Notes" : "Other";
      if (!byType[cat]) byType[cat] = { taxable: 0, cgst: 0, sgst: 0, igst: 0 };
      byType[cat].taxable += inv.amount || 0;
      byType[cat].cgst += inv.cgst || 0;
      byType[cat].sgst += inv.sgst || 0;
      byType[cat].igst += inv.igst || 0;
    }
    return Object.entries(byType).map(([category, v]) => ({
      category,
      ...v,
      total: v.taxable + v.cgst + v.sgst + v.igst,
    }));
  }, [invoices]);

  // ── Computed P&L from invoices & expenses ──
  const plData = useMemo(() => {
    const incomeItems = invoices.length > 0
      ? [{ category: "Invoice Revenue", type: "income" as const, amount: totalRevenue }]
      : [{ category: "Room Revenue", type: "income" as const, amount: 2183000 }, { category: "F&B Revenue", type: "income" as const, amount: 682000 }, { category: "Banquet Revenue", type: "income" as const, amount: 385000 }, { category: "Spa & Other", type: "income" as const, amount: 226400 }];

    const expenseItems = expenses.length > 0
      ? Object.entries(
          expenses.reduce<Record<string, number>>((acc, e) => {
            const cat = e.category.charAt(0).toUpperCase() + e.category.slice(1);
            acc[cat] = (acc[cat] || 0) + (e.amount || 0);
            return acc;
          }, {}),
        ).map(([category, amount]) => ({ category, type: "expense" as const, amount }))
      : [
          { category: "Salaries & Wages", type: "expense" as const, amount: 850000 },
          { category: "Utilities", type: "expense" as const, amount: 125000 },
          { category: "Supplies & Consumables", type: "expense" as const, amount: 140000 },
          { category: "OTA Commissions", type: "expense" as const, amount: 87000 },
          { category: "Maintenance", type: "expense" as const, amount: 32000 },
          { category: "Marketing", type: "expense" as const, amount: 45000 },
          { category: "Depreciation", type: "expense" as const, amount: 95000 },
        ];

    return [...incomeItems, ...expenseItems];
  }, [invoices, expenses, totalRevenue]);

  // ── Handlers ──
  const handleCreateInvoice = async () => {
    if (!invForm.partyName.trim()) {
      toast.error("Party name is required");
      return;
    }
    const amount = parseFloat(invForm.amount) || 0;
    const cgst = parseFloat(invForm.cgst) || 0;
    const sgst = parseFloat(invForm.sgst) || 0;
    const igst = parseFloat(invForm.igst) || 0;
    setSubmitting(true);
    try {
      await apiPost("/api/finance/invoices", {
        partyName: invForm.partyName,
        amount,
        cgst,
        sgst,
        igst,
        totalAmount: amount + cgst + sgst + igst,
        status: invForm.status,
        dueDate: invForm.dueDate || undefined,
        notes: invForm.notes || undefined,
        invoiceType: invForm.invoiceType,
      });
      toast.success("Invoice created successfully");
      setInvoiceDialogOpen(false);
      setInvForm({ partyName: "", amount: "", cgst: "", sgst: "", igst: "", status: "draft", dueDate: "", notes: "", invoiceType: "tax_invoice" });
      reloadInvoices();
    } catch (e: any) {
      toast.error(e.message || "Failed to create invoice");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateExpense = async () => {
    if (!expForm.description.trim()) {
      toast.error("Description is required");
      return;
    }
    const amount = parseFloat(expForm.amount);
    if (!amount || amount <= 0) {
      toast.error("Valid amount is required");
      return;
    }
    setSubmitting(true);
    try {
      await apiPost("/api/finance/expenses", {
        category: expForm.category,
        description: expForm.description,
        amount,
        paidTo: expForm.paidTo || undefined,
        paymentMethod: expForm.paymentMethod,
        expenseDate: expForm.expenseDate || undefined,
        status: expForm.status,
      });
      toast.success("Expense recorded successfully");
      setExpenseDialogOpen(false);
      setExpForm({ category: "utilities", description: "", amount: "", paidTo: "", paymentMethod: "cash", expenseDate: new Date().toISOString().slice(0, 10), status: "pending" });
      reloadExpenses();
    } catch (e: any) {
      toast.error(e.message || "Failed to record expense");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Filtering ──
  const filteredInvoices = useMemo(() => {
    if (!search) return invoices;
    const q = search.toLowerCase();
    return invoices.filter(
      (i) =>
        i.invoiceNumber.toLowerCase().includes(q) ||
        i.partyName.toLowerCase().includes(q) ||
        i.status.toLowerCase().includes(q),
    );
  }, [invoices, search]);

  const filteredExpenses = useMemo(() => {
    if (!search) return expenses;
    const q = search.toLowerCase();
    return expenses.filter(
      (e) =>
        e.category.toLowerCase().includes(q) ||
        e.description.toLowerCase().includes(q) ||
        (e.paidTo || "").toLowerCase().includes(q),
    );
  }, [expenses, search]);

  // ── Loading helper ──
  const isLoading = invLoading || expLoading;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-display font-bold text-foreground flex items-center gap-2">
            <IndianRupee className="h-5 w-5 text-navy" /> Finance & Accounts
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">Invoicing, GST compliance, cashbook & financial reports</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input placeholder="Search invoices..." className="pl-8 h-9 w-48" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Button variant="outline" size="sm" className="h-9"><Download className="h-3.5 w-3.5 mr-1" /> Export</Button>
          <Button className="bg-navy hover:bg-navy-light text-white h-9" onClick={() => setInvoiceDialogOpen(true)}><Plus className="h-4 w-4 mr-1" /> New Invoice</Button>
        </div>
      </div>

      {/* KPI Cards */}
      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="p-3 sm:p-4"><Skeleton className="h-16 w-full" /></Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <KpiCard label="Revenue (MTD)" value={fmtINR(totalRevenue)} icon={TrendingUp} accent="success" delta={8} deltaLabel="vs last month" />
          <KpiCard label="Expenses (MTD)" value={fmtINR(totalExpenses)} icon={TrendingDown} accent="error" />
          <KpiCard label="Net Profit" value={fmtINR(profit)} icon={IndianRupee} accent="navy" delta={12} deltaLabel="vs last month" />
          <KpiCard label="Outstanding" value={fmtINR(outstanding)} icon={Receipt} accent="warning" />
          <KpiCard label="Cash Balance" value={fmtINR(250000)} icon={Wallet} accent="success" />
          <KpiCard label="Bank Balance" value={fmtINR(1245000)} icon={Landmark} accent="info" />
        </div>
      )}

      {/* API error banners */}
      {invError && (
        <div className="rounded-lg border border-[#DC2626]/30 bg-[#FFE4E6]/50 p-3 text-xs text-[#881337] flex items-center justify-between">
          <span>Invoice API error: {invError}</span>
          <button onClick={() => reloadInvoices()} className="font-medium underline hover:no-underline">Retry</button>
        </div>
      )}
      {expError && (
        <div className="rounded-lg border border-[#DC2626]/30 bg-[#FFE4E6]/50 p-3 text-xs text-[#881337] flex items-center justify-between">
          <span>Expense API error: {expError}</span>
          <button onClick={() => reloadExpenses()} className="font-medium underline hover:no-underline">Retry</button>
        </div>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="overview" className="text-xs">Overview</TabsTrigger>
          <TabsTrigger value="invoices" className="text-xs">Invoices</TabsTrigger>
          <TabsTrigger value="expenses" className="text-xs">Expenses</TabsTrigger>
          <TabsTrigger value="gst" className="text-xs">GST</TabsTrigger>
          <TabsTrigger value="cashbook" className="text-xs">Cashbook</TabsTrigger>
          <TabsTrigger value="pnl" className="text-xs">P&L</TabsTrigger>
        </TabsList>

        {/* ── Overview Tab ── */}
        <TabsContent value="overview" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-[#16A34A]" /> Revenue Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {invoices.length > 0 ? (
                  (() => {
                    const total = totalRevenue || 1;
                    const top = filteredInvoices.slice(0, 5);
                    return (
                      <>
                        {top.map((inv) => {
                          const pct = Math.round((inv.totalAmount / total) * 100);
                          return (
                            <div key={inv.id} className="flex items-center gap-3">
                              <span className="text-xs w-32 truncate">{inv.partyName}</span>
                              <div className="flex-1 bg-muted rounded-full h-2"><div className="bg-navy rounded-full h-2" style={{ width: `${Math.min(pct, 100)}%` }} /></div>
                              <span className="text-xs font-medium tabular-nums w-24 text-right">{fmtINR(inv.totalAmount)}</span>
                            </div>
                          );
                        })}
                      </>
                    );
                  })()
                ) : (
                  [
                    { source: "Room Revenue", amount: 2183000, pct: 63 },
                    { source: "F&B Revenue", amount: 682000, pct: 20 },
                    { source: "Banquet Revenue", amount: 385000, pct: 11 },
                    { source: "Spa & Other", amount: 226400, pct: 6 },
                  ].map((r) => (
                    <div key={r.source} className="flex items-center gap-3">
                      <span className="text-xs w-32 truncate">{r.source}</span>
                      <div className="flex-1 bg-muted rounded-full h-2"><div className="bg-navy rounded-full h-2" style={{ width: `${r.pct}%` }} /></div>
                      <span className="text-xs font-medium tabular-nums w-24 text-right">{fmtINR(r.amount)}</span>
                    </div>
                  ))
                )}
                <div className="pt-3 mt-3 border-t border-border flex justify-between">
                  <span className="text-xs font-semibold">Total Revenue</span>
                  <span className="text-xs font-bold font-display">{fmtINR(totalRevenue)}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <FileText className="h-4 w-4 text-[#D97706]" /> Recent Invoices
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {invLoading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="flex items-center justify-between p-2 rounded-lg border border-border">
                      <Skeleton className="h-8 w-32" />
                      <Skeleton className="h-5 w-20" />
                    </div>
                  ))
                ) : (
                  filteredInvoices.slice(0, 5).map((inv) => {
                    const st = INV_STATUS_META[inv.status] ?? INV_STATUS_META.draft;
                    return (
                      <div key={inv.id} className="flex items-center justify-between p-2 rounded-lg border border-border hover:bg-muted/50">
                        <div>
                          <p className="text-xs font-medium">{inv.invoiceNumber} — {inv.partyName}</p>
                          <p className="text-[10px] text-muted-foreground">{fmtDate(inv.createdAt)}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium">{fmtINR(inv.totalAmount)}</span>
                          <span className={cn("inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-medium", st.cls)}>{st.label}</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── Invoices Tab ── */}
        <TabsContent value="invoices" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Receipt className="h-4 w-4 text-navy" /> Invoice Register
                  {!invLoading && <span className="text-muted-foreground font-normal">({filteredInvoices.length})</span>}
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" className="h-7 text-xs"><Filter className="h-3 w-3 mr-1" /> Filter</Button>
                  <Button size="sm" className="bg-navy hover:bg-navy-light text-white h-7 text-xs" onClick={() => setInvoiceDialogOpen(true)}><Plus className="h-3 w-3 mr-1" /> New</Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {invLoading ? (
                <div className="p-4 space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-4">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-4 w-16" />
                      <Skeleton className="h-4 w-20 ml-auto" />
                    </div>
                  ))}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-[11px]">Invoice #</TableHead>
                      <TableHead className="text-[11px]">Party Name</TableHead>
                      <TableHead className="text-[11px]">Type</TableHead>
                      <TableHead className="text-[11px] text-right">Amount</TableHead>
                      <TableHead className="text-[11px] text-right">CGST</TableHead>
                      <TableHead className="text-[11px] text-right">SGST</TableHead>
                      <TableHead className="text-[11px] text-right">Total</TableHead>
                      <TableHead className="text-[11px]">Status</TableHead>
                      <TableHead className="text-[11px]">Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredInvoices.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center text-xs text-muted-foreground py-8">
                          No invoices found. Create your first invoice to get started.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredInvoices.map((inv) => {
                        const st = INV_STATUS_META[inv.status] ?? INV_STATUS_META.draft;
                        return (
                          <TableRow key={inv.id} className="hover:bg-muted/50 cursor-pointer">
                            <TableCell className="text-xs font-mono text-muted-foreground">{inv.invoiceNumber}</TableCell>
                            <TableCell className="text-xs font-medium">{inv.partyName}</TableCell>
                            <TableCell className="text-xs">{inv.invoiceType.replace(/_/g, " ")}</TableCell>
                            <TableCell className="text-xs text-right tabular-nums">{fmtINR(inv.amount)}</TableCell>
                            <TableCell className="text-xs text-right tabular-nums text-muted-foreground">{fmtINR(inv.cgst)}</TableCell>
                            <TableCell className="text-xs text-right tabular-nums text-muted-foreground">{fmtINR(inv.sgst)}</TableCell>
                            <TableCell className="text-xs text-right tabular-nums font-medium">{fmtINR(inv.totalAmount)}</TableCell>
                            <TableCell><span className={cn("inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-medium", st.cls)}>{st.label}</span></TableCell>
                            <TableCell className="text-xs">{fmtDate(inv.createdAt)}</TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Expenses Tab ── */}
        <TabsContent value="expenses" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <TrendingDown className="h-4 w-4 text-[#DC2626]" /> Expense Register
                  {!expLoading && <span className="text-muted-foreground font-normal">({filteredExpenses.length})</span>}
                </CardTitle>
                <Button size="sm" className="bg-navy hover:bg-navy-light text-white h-7 text-xs" onClick={() => setExpenseDialogOpen(true)}><Plus className="h-3 w-3 mr-1" /> Add Expense</Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {expLoading ? (
                <div className="p-4 space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
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
                      <TableHead className="text-[11px]">Category</TableHead>
                      <TableHead className="text-[11px]">Description</TableHead>
                      <TableHead className="text-[11px]">Paid To</TableHead>
                      <TableHead className="text-[11px]">Payment</TableHead>
                      <TableHead className="text-[11px] text-right">Amount</TableHead>
                      <TableHead className="text-[11px]">Status</TableHead>
                      <TableHead className="text-[11px]">Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredExpenses.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-xs text-muted-foreground py-8">
                          No expenses found. Record your first expense to get started.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredExpenses.map((exp) => {
                        const st = EXP_STATUS_META[exp.status] ?? EXP_STATUS_META.pending;
                        return (
                          <TableRow key={exp.id} className="hover:bg-muted/50 cursor-pointer">
                            <TableCell className="text-xs">
                              <Badge variant="outline" className="text-[10px] capitalize">{exp.category}</Badge>
                            </TableCell>
                            <TableCell className="text-xs font-medium">{exp.description}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">{exp.paidTo || "—"}</TableCell>
                            <TableCell className="text-xs capitalize">{exp.paymentMethod.replace(/_/g, " ")}</TableCell>
                            <TableCell className="text-xs text-right tabular-nums font-medium">{fmtINR(exp.amount)}</TableCell>
                            <TableCell><span className={cn("inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-medium", st.cls)}>{st.label}</span></TableCell>
                            <TableCell className="text-xs">{fmtDate(exp.expenseDate)}</TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── GST Tab ── */}
        <TabsContent value="gst" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Calculator className="h-4 w-4 text-navy" /> GST Report Summary
                  {gstSummary.length > 0 && <span className="text-muted-foreground font-normal">(computed from invoices)</span>}
                </CardTitle>
                <Button variant="outline" size="sm" className="h-7 text-xs"><Download className="h-3 w-3 mr-1" /> Download GSTR</Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {invLoading ? (
                <div className="p-4 space-y-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-6 w-full" />
                  ))}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-[11px]">Category</TableHead>
                      <TableHead className="text-[11px] text-right">Taxable Amount</TableHead>
                      <TableHead className="text-[11px] text-right">CGST</TableHead>
                      <TableHead className="text-[11px] text-right">SGST</TableHead>
                      <TableHead className="text-[11px] text-right">IGST</TableHead>
                      <TableHead className="text-[11px] text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {gstSummary.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-xs text-muted-foreground py-8">
                          No GST data available. Create invoices with tax amounts to see the GST summary.
                        </TableCell>
                      </TableRow>
                    ) : (
                      <>
                        {gstSummary.map((g) => (
                          <TableRow key={g.category} className="hover:bg-muted/50">
                            <TableCell className="text-xs font-medium">{g.category}</TableCell>
                            <TableCell className="text-xs text-right tabular-nums">{fmtINR(g.taxable)}</TableCell>
                            <TableCell className="text-xs text-right tabular-nums">{fmtINR(g.cgst)}</TableCell>
                            <TableCell className="text-xs text-right tabular-nums">{fmtINR(g.sgst)}</TableCell>
                            <TableCell className="text-xs text-right tabular-nums">{fmtINR(g.igst)}</TableCell>
                            <TableCell className="text-xs text-right tabular-nums font-medium">{fmtINR(g.total)}</TableCell>
                          </TableRow>
                        ))}
                        <TableRow className="bg-muted/30 font-semibold">
                          <TableCell className="text-xs">Total</TableCell>
                          <TableCell className="text-xs text-right tabular-nums">{fmtINR(gstSummary.reduce((s, g) => s + g.taxable, 0))}</TableCell>
                          <TableCell className="text-xs text-right tabular-nums">{fmtINR(gstSummary.reduce((s, g) => s + g.cgst, 0))}</TableCell>
                          <TableCell className="text-xs text-right tabular-nums">{fmtINR(gstSummary.reduce((s, g) => s + g.sgst, 0))}</TableCell>
                          <TableCell className="text-xs text-right tabular-nums">{fmtINR(gstSummary.reduce((s, g) => s + g.igst, 0))}</TableCell>
                          <TableCell className="text-xs text-right tabular-nums">{fmtINR(gstSummary.reduce((s, g) => s + g.total, 0))}</TableCell>
                        </TableRow>
                      </>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Cashbook Tab ── */}
        <TabsContent value="cashbook" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-navy" /> Cash & Bank Transactions
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-[11px]">ID</TableHead>
                    <TableHead className="text-[11px]">Date</TableHead>
                    <TableHead className="text-[11px]">Account</TableHead>
                    <TableHead className="text-[11px]">Description</TableHead>
                    <TableHead className="text-[11px]">Type</TableHead>
                    <TableHead className="text-[11px] text-right">Amount</TableHead>
                    <TableHead className="text-[11px] text-right">Balance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cashbook.map((cb) => (
                    <TableRow key={cb.id} className="hover:bg-muted/50">
                      <TableCell className="text-xs font-mono text-muted-foreground">{cb.id}</TableCell>
                      <TableCell className="text-xs">{fmtDate(cb.date)}</TableCell>
                      <TableCell className="text-xs">
                        <Badge variant="outline" className="text-[10px]">{cb.account}</Badge>
                      </TableCell>
                      <TableCell className="text-xs">{cb.description}</TableCell>
                      <TableCell>
                        <span className={cn("inline-flex items-center gap-0.5 text-[10px] font-medium", cb.type === "credit" ? "text-[#16A34A]" : "text-[#DC2626]")}>
                          {cb.type === "credit" ? <ArrowDownRight className="h-3 w-3" /> : <ArrowUpRight className="h-3 w-3" />}
                          {cb.type === "credit" ? "Credit" : "Debit"}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-right tabular-nums">{fmtINR(cb.amount)}</TableCell>
                      <TableCell className="text-xs text-right tabular-nums font-medium">{fmtINR(cb.balance)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── P&L Tab ── */}
        <TabsContent value="pnl" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <PieChart className="h-4 w-4 text-navy" /> Profit & Loss Statement
                </CardTitle>
                <Button variant="outline" size="sm" className="h-7 text-xs"><Download className="h-3 w-3 mr-1" /> Export PDF</Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="p-4 space-y-3">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <Skeleton key={i} className="h-6 w-full" />
                  ))}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-[11px]">Particulars</TableHead>
                      <TableHead className="text-[11px] text-right">Amount (₹)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow className="bg-[#DCFCE7]/50">
                      <TableCell className="text-xs font-bold" colSpan={2}>INCOME</TableCell>
                    </TableRow>
                    {plData.filter((p) => p.type === "income").map((p) => (
                      <TableRow key={p.category} className="hover:bg-muted/50">
                        <TableCell className="text-xs pl-6">{p.category}</TableCell>
                        <TableCell className="text-xs text-right tabular-nums">{fmtINR(p.amount)}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-[#DCFCE7]/30 font-semibold">
                      <TableCell className="text-xs font-bold">Total Income</TableCell>
                      <TableCell className="text-xs text-right tabular-nums font-bold">{fmtINR(plData.filter((p) => p.type === "income").reduce((s, p) => s + p.amount, 0))}</TableCell>
                    </TableRow>
                    <TableRow className="bg-[#FFE4E6]/50">
                      <TableCell className="text-xs font-bold" colSpan={2}>EXPENSES</TableCell>
                    </TableRow>
                    {plData.filter((p) => p.type === "expense").map((p) => (
                      <TableRow key={p.category} className="hover:bg-muted/50">
                        <TableCell className="text-xs pl-6">{p.category}</TableCell>
                        <TableCell className="text-xs text-right tabular-nums">{fmtINR(p.amount)}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-[#FFE4E6]/30 font-semibold">
                      <TableCell className="text-xs font-bold">Total Expenses</TableCell>
                      <TableCell className="text-xs text-right tabular-nums font-bold">{fmtINR(plData.filter((p) => p.type === "expense").reduce((s, p) => s + p.amount, 0))}</TableCell>
                    </TableRow>
                    <TableRow className="bg-navy text-white font-bold">
                      <TableCell className="text-xs">NET PROFIT</TableCell>
                      <TableCell className="text-xs text-right tabular-nums">{fmtINR(plData.filter((p) => p.type === "income").reduce((s, p) => s + p.amount, 0) - plData.filter((p) => p.type === "expense").reduce((s, p) => s + p.amount, 0))}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ── Create Invoice Dialog ── */}
      <Dialog open={invoiceDialogOpen} onOpenChange={setInvoiceDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2">
              <Receipt className="h-5 w-5 text-navy" /> Create Invoice
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label className="text-xs font-medium">Party Name *</Label>
              <Input
                placeholder="Guest or company name"
                value={invForm.partyName}
                onChange={(e) => setInvForm((f) => ({ ...f, partyName: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label className="text-xs font-medium">Amount (₹)</Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={invForm.amount}
                  onChange={(e) => setInvForm((f) => ({ ...f, amount: e.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label className="text-xs font-medium">Invoice Type</Label>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  value={invForm.invoiceType}
                  onChange={(e) => setInvForm((f) => ({ ...f, invoiceType: e.target.value }))}
                >
                  <option value="tax_invoice">Tax Invoice</option>
                  <option value="proforma">Proforma</option>
                  <option value="credit_note">Credit Note</option>
                  <option value="debit_note">Debit Note</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="grid gap-2">
                <Label className="text-xs font-medium">CGST (₹)</Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={invForm.cgst}
                  onChange={(e) => setInvForm((f) => ({ ...f, cgst: e.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label className="text-xs font-medium">SGST (₹)</Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={invForm.sgst}
                  onChange={(e) => setInvForm((f) => ({ ...f, sgst: e.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label className="text-xs font-medium">IGST (₹)</Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={invForm.igst}
                  onChange={(e) => setInvForm((f) => ({ ...f, igst: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label className="text-xs font-medium">Status</Label>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  value={invForm.status}
                  onChange={(e) => setInvForm((f) => ({ ...f, status: e.target.value }))}
                >
                  <option value="draft">Draft</option>
                  <option value="sent">Sent</option>
                  <option value="paid">Paid</option>
                  <option value="pending">Pending</option>
                </select>
              </div>
              <div className="grid gap-2">
                <Label className="text-xs font-medium">Due Date</Label>
                <Input
                  type="date"
                  value={invForm.dueDate}
                  onChange={(e) => setInvForm((f) => ({ ...f, dueDate: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label className="text-xs font-medium">Notes</Label>
              <Input
                placeholder="Optional notes"
                value={invForm.notes}
                onChange={(e) => setInvForm((f) => ({ ...f, notes: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInvoiceDialogOpen(false)} disabled={submitting}>Cancel</Button>
            <Button className="bg-navy hover:bg-navy-light text-white" onClick={handleCreateInvoice} disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Create Invoice
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Add Expense Dialog ── */}
      <Dialog open={expenseDialogOpen} onOpenChange={setExpenseDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2">
              <TrendingDown className="h-5 w-5 text-[#DC2626]" /> Add Expense
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label className="text-xs font-medium">Category *</Label>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  value={expForm.category}
                  onChange={(e) => setExpForm((f) => ({ ...f, category: e.target.value }))}
                >
                  {EXPENSE_CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                  ))}
                </select>
              </div>
              <div className="grid gap-2">
                <Label className="text-xs font-medium">Amount (₹) *</Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={expForm.amount}
                  onChange={(e) => setExpForm((f) => ({ ...f, amount: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label className="text-xs font-medium">Description *</Label>
              <Input
                placeholder="What was this expense for?"
                value={expForm.description}
                onChange={(e) => setExpForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label className="text-xs font-medium">Paid To</Label>
                <Input
                  placeholder="Vendor or person"
                  value={expForm.paidTo}
                  onChange={(e) => setExpForm((f) => ({ ...f, paidTo: e.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label className="text-xs font-medium">Payment Method</Label>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  value={expForm.paymentMethod}
                  onChange={(e) => setExpForm((f) => ({ ...f, paymentMethod: e.target.value }))}
                >
                  <option value="cash">Cash</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="upi">UPI</option>
                  <option value="credit_card">Credit Card</option>
                  <option value="cheque">Cheque</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label className="text-xs font-medium">Expense Date</Label>
                <Input
                  type="date"
                  value={expForm.expenseDate}
                  onChange={(e) => setExpForm((f) => ({ ...f, expenseDate: e.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label className="text-xs font-medium">Status</Label>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  value={expForm.status}
                  onChange={(e) => setExpForm((f) => ({ ...f, status: e.target.value }))}
                >
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                </select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExpenseDialogOpen(false)} disabled={submitting}>Cancel</Button>
            <Button className="bg-navy hover:bg-navy-light text-white" onClick={handleCreateExpense} disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Add Expense
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
