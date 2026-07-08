// ARIA HMS — Finance Module (6 tabs: Overview, Invoices, Expenses, GST, Cashbook, P&L)
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
  IndianRupee, TrendingUp, TrendingDown, Wallet, Landmark, FileText,
  Plus, Search, Receipt, CreditCard, ArrowUpRight, ArrowDownRight,
  Download, Filter, PieChart, Calculator, BookOpen,
} from "lucide-react";

// ─── MOCK DATA ──────────────────────────────────────────────────────

const MOCK_INVOICES = [
  { id: "INV-2401", guest: "Rajesh Sharma", room: "101", amount: 18200, gst: 3276, total: 21476, status: "paid", date: "2025-01-14" },
  { id: "INV-2402", guest: "Priya Nair", room: "205", amount: 9500, gst: 1710, total: 11210, status: "pending", date: "2025-01-14" },
  { id: "INV-2403", guest: "Corporate - TCS Ltd", room: "301-305", amount: 125000, gst: 22500, total: 147500, status: "paid", date: "2025-01-13" },
  { id: "INV-2404", guest: "Arun Kumar", room: "402", amount: 7800, gst: 1404, total: 9204, status: "overdue", date: "2025-01-10" },
  { id: "INV-2405", guest: "Meera Patel", room: "108", amount: 14600, gst: 2628, total: 17228, status: "paid", date: "2025-01-12" },
  { id: "INV-2406", guest: "Walk-in Guest", room: "310", amount: 4500, gst: 810, total: 5310, status: "pending", date: "2025-01-15" },
];

const MOCK_EXPENSES = [
  { id: "EXP-001", category: "Salaries", description: "Staff salaries - Jan", amount: 850000, date: "2025-01-01", status: "approved" },
  { id: "EXP-002", category: "Utilities", description: "Electricity bill", amount: 125000, date: "2025-01-05", status: "approved" },
  { id: "EXP-003", category: "Supplies", description: "Housekeeping supplies", amount: 45000, date: "2025-01-08", status: "approved" },
  { id: "EXP-004", category: "Maintenance", description: "AC servicing", amount: 32000, date: "2025-01-10", status: "pending" },
  { id: "EXP-005", category: "Marketing", description: "OTA commission", amount: 87000, date: "2025-01-12", status: "approved" },
  { id: "EXP-006", category: "F&B", description: "Restaurant raw materials", amount: 95000, date: "2025-01-14", status: "approved" },
];

const MOCK_CASHBOOK = [
  { id: "CB-001", date: "2025-01-15", description: "Room revenue - Cash", type: "credit", amount: 45000, balance: 285000, account: "Cash" },
  { id: "CB-002", date: "2025-01-15", description: "Vendor payment - Linen", type: "debit", amount: 35000, balance: 250000, account: "Cash" },
  { id: "CB-003", date: "2025-01-15", description: "F&B revenue - Card", type: "credit", amount: 28000, balance: 278000, account: "Bank" },
  { id: "CB-004", date: "2025-01-14", description: "Salary advance - Staff", type: "debit", amount: 15000, balance: 320000, account: "Cash" },
  { id: "CB-005", date: "2025-01-14", description: "OTA settlement - Booking.com", type: "credit", amount: 67000, balance: 335000, account: "Bank" },
  { id: "CB-006", date: "2025-01-14", description: "Electricity payment", type: "debit", amount: 45000, balance: 268000, account: "Bank" },
];

const MOCK_GST_SUMMARY = [
  { category: "Room Revenue", taxable: 1850000, cgst: 166500, sgst: 166500, igst: 0, total: 2183000 },
  { category: "F&B Revenue", taxable: 620000, cgst: 31000, sgst: 31000, igst: 0, total: 682000 },
  { category: "Banquet Revenue", taxable: 350000, cgst: 17500, sgst: 17500, igst: 0, total: 385000 },
  { category: "Spa Revenue", taxable: 120000, cgst: 6000, sgst: 6000, igst: 0, total: 132000 },
  { category: "Other Services", taxable: 80000, cgst: 7200, sgst: 0, igst: 7200, total: 94400 },
];

const MOCK_PL = [
  { category: "Room Revenue", type: "income", amount: 2183000 },
  { category: "F&B Revenue", type: "income", amount: 682000 },
  { category: "Banquet Revenue", type: "income", amount: 385000 },
  { category: "Spa & Other", type: "income", amount: 226400 },
  { category: "Salaries & Wages", type: "expense", amount: 850000 },
  { category: "Utilities", type: "expense", amount: 125000 },
  { category: "Supplies & Consumables", type: "expense", amount: 140000 },
  { category: "OTA Commissions", type: "expense", amount: 87000 },
  { category: "Maintenance", type: "expense", amount: 32000 },
  { category: "Marketing", type: "expense", amount: 45000 },
  { category: "Depreciation", type: "expense", amount: 95000 },
];

// ─── STATUS META ─────────────────────────────────────────────────────

const INV_STATUS_META: Record<string, { label: string; cls: string }> = {
  paid: { label: "Paid", cls: "bg-[#DCFCE7] text-[#14532D] border-[#16A34A]" },
  pending: { label: "Pending", cls: "bg-[#FEF3C7] text-[#78350F] border-[#D97706]" },
  overdue: { label: "Overdue", cls: "bg-[#FFE4E6] text-[#881337] border-[#DC2626]" },
  cancelled: { label: "Cancelled", cls: "bg-[#E5E7EB] text-[#374151] border-[#6B7280]" },
};

const EXP_STATUS_META: Record<string, { label: string; cls: string }> = {
  approved: { label: "Approved", cls: "bg-[#DCFCE7] text-[#14532D] border-[#16A34A]" },
  pending: { label: "Pending", cls: "bg-[#FEF3C7] text-[#78350F] border-[#D97706]" },
  rejected: { label: "Rejected", cls: "bg-[#FFE4E6] text-[#881337] border-[#DC2626]" },
};

// ─── MAIN COMPONENT ──────────────────────────────────────────────────

export function FinanceModule() {
  const { refreshTick } = useAppStore();
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("overview");

  const totalRevenue = 3476400;
  const totalExpenses = 1374000;
  const profit = totalRevenue - totalExpenses;
  const outstanding = MOCK_INVOICES.filter((i) => i.status === "pending" || i.status === "overdue").reduce((s, i) => s + i.total, 0);

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
          <Button className="bg-navy hover:bg-navy-light text-white h-9"><Plus className="h-4 w-4 mr-1" /> New Invoice</Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <KpiCard label="Revenue (MTD)" value={fmtINR(totalRevenue)} icon={TrendingUp} accent="success" delta={8} deltaLabel="vs last month" />
        <KpiCard label="Expenses (MTD)" value={fmtINR(totalExpenses)} icon={TrendingDown} accent="error" />
        <KpiCard label="Net Profit" value={fmtINR(profit)} icon={IndianRupee} accent="navy" delta={12} deltaLabel="vs last month" />
        <KpiCard label="Outstanding" value={fmtINR(outstanding)} icon={Receipt} accent="warning" />
        <KpiCard label="Cash Balance" value={fmtINR(250000)} icon={Wallet} accent="success" />
        <KpiCard label="Bank Balance" value={fmtINR(1245000)} icon={Landmark} accent="info" />
      </div>

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
                {[
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
                ))}
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
                {MOCK_INVOICES.slice(0, 5).map((inv) => {
                  const st = INV_STATUS_META[inv.status];
                  return (
                    <div key={inv.id} className="flex items-center justify-between p-2 rounded-lg border border-border hover:bg-muted/50">
                      <div>
                        <p className="text-xs font-medium">{inv.id} — {inv.guest}</p>
                        <p className="text-[10px] text-muted-foreground">Room {inv.room} · {fmtDate(inv.date)}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium">{fmtINR(inv.total)}</span>
                        <span className={cn("inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-medium", st.cls)}>{st.label}</span>
                      </div>
                    </div>
                  );
                })}
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
                </CardTitle>
                <Button variant="outline" size="sm" className="h-7 text-xs"><Filter className="h-3 w-3 mr-1" /> Filter</Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-[11px]">Invoice #</TableHead>
                    <TableHead className="text-[11px]">Guest / Entity</TableHead>
                    <TableHead className="text-[11px]">Room</TableHead>
                    <TableHead className="text-[11px] text-right">Amount</TableHead>
                    <TableHead className="text-[11px] text-right">GST</TableHead>
                    <TableHead className="text-[11px] text-right">Total</TableHead>
                    <TableHead className="text-[11px]">Status</TableHead>
                    <TableHead className="text-[11px]">Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {MOCK_INVOICES.map((inv) => {
                    const st = INV_STATUS_META[inv.status] ?? INV_STATUS_META.pending;
                    return (
                      <TableRow key={inv.id} className="hover:bg-muted/50 cursor-pointer">
                        <TableCell className="text-xs font-mono text-muted-foreground">{inv.id}</TableCell>
                        <TableCell className="text-xs font-medium">{inv.guest}</TableCell>
                        <TableCell className="text-xs">{inv.room}</TableCell>
                        <TableCell className="text-xs text-right tabular-nums">{fmtINR(inv.amount)}</TableCell>
                        <TableCell className="text-xs text-right tabular-nums text-muted-foreground">{fmtINR(inv.gst)}</TableCell>
                        <TableCell className="text-xs text-right tabular-nums font-medium">{fmtINR(inv.total)}</TableCell>
                        <TableCell><span className={cn("inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-medium", st.cls)}>{st.label}</span></TableCell>
                        <TableCell className="text-xs">{fmtDate(inv.date)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
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
                </CardTitle>
                <Button size="sm" className="bg-navy hover:bg-navy-light text-white h-7 text-xs"><Plus className="h-3 w-3 mr-1" /> Add Expense</Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-[11px]">ID</TableHead>
                    <TableHead className="text-[11px]">Category</TableHead>
                    <TableHead className="text-[11px]">Description</TableHead>
                    <TableHead className="text-[11px] text-right">Amount</TableHead>
                    <TableHead className="text-[11px]">Status</TableHead>
                    <TableHead className="text-[11px]">Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {MOCK_EXPENSES.map((exp) => {
                    const st = EXP_STATUS_META[exp.status] ?? EXP_STATUS_META.pending;
                    return (
                      <TableRow key={exp.id} className="hover:bg-muted/50 cursor-pointer">
                        <TableCell className="text-xs font-mono text-muted-foreground">{exp.id}</TableCell>
                        <TableCell className="text-xs font-medium">{exp.category}</TableCell>
                        <TableCell className="text-xs">{exp.description}</TableCell>
                        <TableCell className="text-xs text-right tabular-nums font-medium">{fmtINR(exp.amount)}</TableCell>
                        <TableCell><span className={cn("inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-medium", st.cls)}>{st.label}</span></TableCell>
                        <TableCell className="text-xs">{fmtDate(exp.date)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
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
                </CardTitle>
                <Button variant="outline" size="sm" className="h-7 text-xs"><Download className="h-3 w-3 mr-1" /> Download GSTR</Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
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
                  {MOCK_GST_SUMMARY.map((g) => (
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
                    <TableCell className="text-xs text-right tabular-nums">{fmtINR(MOCK_GST_SUMMARY.reduce((s, g) => s + g.taxable, 0))}</TableCell>
                    <TableCell className="text-xs text-right tabular-nums">{fmtINR(MOCK_GST_SUMMARY.reduce((s, g) => s + g.cgst, 0))}</TableCell>
                    <TableCell className="text-xs text-right tabular-nums">{fmtINR(MOCK_GST_SUMMARY.reduce((s, g) => s + g.sgst, 0))}</TableCell>
                    <TableCell className="text-xs text-right tabular-nums">{fmtINR(MOCK_GST_SUMMARY.reduce((s, g) => s + g.igst, 0))}</TableCell>
                    <TableCell className="text-xs text-right tabular-nums">{fmtINR(MOCK_GST_SUMMARY.reduce((s, g) => s + g.total, 0))}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
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
                  {MOCK_CASHBOOK.map((cb) => (
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
                  {MOCK_PL.filter((p) => p.type === "income").map((p) => (
                    <TableRow key={p.category} className="hover:bg-muted/50">
                      <TableCell className="text-xs pl-6">{p.category}</TableCell>
                      <TableCell className="text-xs text-right tabular-nums">{fmtINR(p.amount)}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-[#DCFCE7]/30 font-semibold">
                    <TableCell className="text-xs font-bold">Total Income</TableCell>
                    <TableCell className="text-xs text-right tabular-nums font-bold">{fmtINR(MOCK_PL.filter((p) => p.type === "income").reduce((s, p) => s + p.amount, 0))}</TableCell>
                  </TableRow>
                  <TableRow className="bg-[#FFE4E6]/50">
                    <TableCell className="text-xs font-bold" colSpan={2}>EXPENSES</TableCell>
                  </TableRow>
                  {MOCK_PL.filter((p) => p.type === "expense").map((p) => (
                    <TableRow key={p.category} className="hover:bg-muted/50">
                      <TableCell className="text-xs pl-6">{p.category}</TableCell>
                      <TableCell className="text-xs text-right tabular-nums">{fmtINR(p.amount)}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-[#FFE4E6]/30 font-semibold">
                    <TableCell className="text-xs font-bold">Total Expenses</TableCell>
                    <TableCell className="text-xs text-right tabular-nums font-bold">{fmtINR(MOCK_PL.filter((p) => p.type === "expense").reduce((s, p) => s + p.amount, 0))}</TableCell>
                  </TableRow>
                  <TableRow className="bg-navy text-white font-bold">
                    <TableCell className="text-xs">NET PROFIT</TableCell>
                    <TableCell className="text-xs text-right tabular-nums">{fmtINR(MOCK_PL.filter((p) => p.type === "income").reduce((s, p) => s + p.amount, 0) - MOCK_PL.filter((p) => p.type === "expense").reduce((s, p) => s + p.amount, 0))}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
