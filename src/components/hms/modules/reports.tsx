// Reports module
"use client";

import { useState, useCallback } from "react";
import { useApi } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart3, FileText, TrendingUp, Percent, Receipt, Users, Download, AlertTriangle, Database } from "lucide-react";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Area, AreaChart } from "recharts";
import { fmtINR } from "../shared";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const REPORTS = [
  { key: "daily_revenue", label: "Daily Revenue Summary", icon: BarChart3, desc: "Room, F&B, minibar, laundry breakdown by day" },
  { key: "occupancy", label: "Occupancy Trend", icon: TrendingUp, desc: "Daily occupancy % over selected period" },
  { key: "channel_production", label: "Channel Production", icon: Users, desc: "Reservations & revenue by booking source" },
  { key: "gst", label: "GST Tax Report", icon: Percent, desc: "CGST / SGST / IGST by tax code" },
  { key: "folio_audit", label: "Folio Audit", icon: Receipt, desc: "Today's folio charges, payments, voids" },
  { key: "payment_methods", label: "Payment Methods", icon: FileText, desc: "Cash / card / UPI split" },
];

// ─── Fallback data when API fails ────────────────────────────────
const today = new Date().toISOString().slice(0, 10);
const FALLBACK_REPORTS: Record<string, any> = {
  daily_revenue: [
    { day: "2025-03-01", room: 78000, fb: 22000, minibar: 4500, laundry: 3200, other: 1800, tax: 10950, total: 120450 },
    { day: "2025-03-02", room: 82000, fb: 24500, minibar: 5100, laundry: 2800, other: 2100, tax: 11650, total: 128150 },
    { day: "2025-03-03", room: 71000, fb: 19800, minibar: 3800, laundry: 3100, other: 1500, tax: 9920, total: 109120 },
    { day: "2025-03-04", room: 93000, fb: 28000, minibar: 6200, laundry: 4100, other: 2400, tax: 13370, total: 147070 },
    { day: "2025-03-05", room: 88000, fb: 25600, minibar: 5500, laundry: 3600, other: 2000, tax: 12470, total: 137170 },
  ],
  occupancy: [
    { day: "2025-03-01", occupancyRate: 68 },
    { day: "2025-03-02", occupancyRate: 72 },
    { day: "2025-03-03", occupancyRate: 65 },
    { day: "2025-03-04", occupancyRate: 82 },
    { day: "2025-03-05", occupancyRate: 78 },
  ],
  channel_production: [
    { source: "direct", reservations: 45, roomNights: 92, grossRevenue: 520000, commission: 0, netRevenue: 520000, cancellations: 3 },
    { source: "booking_com", reservations: 32, roomNights: 58, grossRevenue: 380000, commission: 57000, netRevenue: 323000, cancellations: 5 },
    { source: "make_my_trip", reservations: 28, roomNights: 48, grossRevenue: 310000, commission: 46500, netRevenue: 263500, cancellations: 4 },
    { source: "corporate", reservations: 18, roomNights: 42, grossRevenue: 290000, commission: 0, netRevenue: 290000, cancellations: 1 },
  ],
  gst: {
    period: { from: "2025-03-01", to: "2025-03-05" },
    grandTaxable: 890000, grandTax: 133500, grandTotal: 1023500,
    byTaxCode: {
      "GST-5": { taxable: 120000, cgst: 3000, sgst: 3000, igst: 0, total: 6000 },
      "GST-12": { taxable: 280000, cgst: 16800, sgst: 16800, igst: 0, total: 33600 },
      "GST-18": { taxable: 490000, cgst: 44100, sgst: 44100, igst: 0, total: 88200 },
      "IGST-18": { taxable: 10000, cgst: 0, sgst: 0, igst: 1800, total: 1800 },
    },
  },
  folio_audit: { day: today, count: 42, open: 18, closed: 24, totalCharges: 485000, totalTax: 72800, totalPayments: 392000, voids: 2 },
  payment_methods: [
    { method: "cash", total: 185000, count: 34 },
    { method: "credit_card", total: 245000, count: 28 },
    { method: "debit_card", total: 92000, count: 15 },
    { method: "upi", total: 138000, count: 42 },
    { method: "bank_transfer", total: 67000, count: 3 },
  ],
};

// ─── CSV Export Utility ──────────────────────────────────────────

function escapeCsvField(value: any): string {
  const str = String(value ?? "");
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function objectsToCsv(headers: string[], rows: Record<string, any>[]): string {
  const headerLine = headers.map(escapeCsvField).join(",");
  const dataLines = rows.map((row) =>
    headers.map((h) => escapeCsvField(row[h])).join(",")
  );
  return [headerLine, ...dataLines].join("\n");
}

function downloadCsv(filename: string, csvContent: string) {
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ─── Report-specific CSV exporters ──────────────────────────────

function exportDailyRevenueCsv(data: any[]) {
  const headers = ["day", "room", "fb", "minibar", "laundry", "other", "tax", "total"];
  const csv = objectsToCsv(headers, data);
  downloadCsv("daily_revenue_report.csv", csv);
}

function exportOccupancyCsv(data: any[]) {
  const headers = ["day", "occupancyRate"];
  const csv = objectsToCsv(headers, data);
  downloadCsv("occupancy_report.csv", csv);
}

function exportChannelCsv(data: any[]) {
  const headers = ["source", "reservations", "roomNights", "grossRevenue", "commission", "netRevenue", "cancellations"];
  const csv = objectsToCsv(headers, data);
  downloadCsv("channel_production_report.csv", csv);
}

function exportGstCsv(data: any) {
  const rows = Object.entries(data.byTaxCode || {}).map(([code, v]: [string, any]) => ({
    taxCode: code,
    taxable: v.taxable,
    cgst: v.cgst,
    sgst: v.sgst,
    igst: v.igst,
    totalTax: v.total,
  }));
  const headers = ["taxCode", "taxable", "cgst", "sgst", "igst", "totalTax"];
  const csv = objectsToCsv(headers, rows);
  downloadCsv("gst_report.csv", csv);
}

function exportFolioAuditCsv(data: any) {
  const rows = [
    { metric: "Day", value: data.day },
    { metric: "Folio Count", value: data.count },
    { metric: "Open Folios", value: data.open },
    { metric: "Closed Folios", value: data.closed },
    { metric: "Total Charges", value: data.totalCharges },
    { metric: "Total Tax", value: data.totalTax },
    { metric: "Total Payments", value: data.totalPayments },
    { metric: "Voids", value: data.voids },
  ];
  const headers = ["metric", "value"];
  const csv = objectsToCsv(headers, rows);
  downloadCsv("folio_audit_report.csv", csv);
}

function exportPaymentMethodsCsv(data: any[]) {
  const headers = ["method", "total", "count"];
  const csv = objectsToCsv(headers, data);
  downloadCsv("payment_methods_report.csv", csv);
}

function exportReportCsv(reportKey: string, data: any) {
  switch (reportKey) {
    case "daily_revenue":
      exportDailyRevenueCsv(data);
      break;
    case "occupancy":
      exportOccupancyCsv(data);
      break;
    case "channel_production":
      exportChannelCsv(data);
      break;
    case "gst":
      exportGstCsv(data);
      break;
    case "folio_audit":
      exportFolioAuditCsv(data);
      break;
    case "payment_methods":
      exportPaymentMethodsCsv(data);
      break;
    default:
      toast.error("Export not supported for this report type");
      return;
  }
  toast.success("Report exported as CSV");
}

// ─── MAIN COMPONENT ──────────────────────────────────────────────

export function ReportsModule() {
  const [active, setActive] = useState("daily_revenue");
  const { data, loading, error, reload } = useApi<any>(`/api/reports?type=${active}`, [active]);

  // ─── Smart fallback logic ──────────────────────────────────────
  const isUsingFallback = (() => {
    if (!data) return true;
    // Array-type reports: use fallback if empty or not an array
    if (["daily_revenue", "occupancy", "channel_production", "payment_methods"].includes(active)) {
      return !Array.isArray(data) || data.length === 0;
    }
    // Object-type reports: use fallback if missing expected keys
    if (active === "gst") return !data || !data.period;
    if (active === "folio_audit") return !data || !data.day;
    return false;
  })();

  const reportData = isUsingFallback ? FALLBACK_REPORTS[active] : data;

  const handleExport = useCallback(() => {
    if (!reportData) {
      toast.error("No data to export");
      return;
    }
    exportReportCsv(active, reportData);
  }, [active, reportData]);

  return (
    <div className="space-y-4">
      {/* Live / Sample indicator */}
      <div className="flex items-center gap-2">
        {error ? (
          <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>Could not load live data. Showing sample data instead.</span>
            <button onClick={reload} className="ml-auto text-xs font-medium underline">Retry</button>
          </div>
        ) : (
          <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
            isUsingFallback
              ? "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
              : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
          )}>
            <span className={cn("h-1.5 w-1.5 rounded-full", isUsingFallback ? "bg-amber-500" : "bg-emerald-500 animate-pulse")} />
            {isUsingFallback ? "Sample" : "Live"}
          </span>
        )}
      </div>
      {/* Report selector */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
        {REPORTS.map((r) => {
          const Icon = r.icon;
          return (
            <button
              key={r.key}
              onClick={() => setActive(r.key)}
              className={cn("flex flex-col items-center gap-1 rounded-xl border p-3 text-center transition-all", active === r.key ? "border-gold bg-gold/10 text-navy shadow-card" : "border-border bg-card hover:bg-muted/40")}
            >
              <Icon className={cn("h-5 w-5", active === r.key ? "text-gold" : "text-muted-foreground")} />
              <span className="text-[10px] font-semibold leading-tight">{r.label}</span>
            </button>
          );
        })}
      </div>

      {/* Report content */}
      {loading ? (
        <Skeleton className="h-96" />
      ) : active === "daily_revenue" ? (
        <DailyRevenueReport data={reportData} onExport={handleExport} />
      ) : active === "occupancy" ? (
        <OccupancyReport data={reportData} onExport={handleExport} />
      ) : active === "channel_production" ? (
        <ChannelReport data={reportData} onExport={handleExport} />
      ) : active === "gst" ? (
        <GstReport data={reportData} onExport={handleExport} />
      ) : active === "folio_audit" ? (
        <FolioAuditReport data={reportData} onExport={handleExport} />
      ) : (
        <PaymentMethodsReport data={reportData} onExport={handleExport} />
      )}
    </div>
  );
}

function ReportCard({ title, subtitle, action, onExport }: any) {
  return (
    <Card>
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-base font-display">{title}</CardTitle>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        {action && <Button size="sm" variant="outline" className="h-7 text-xs" onClick={onExport}><Download className="h-3 w-3 mr-1" /> Export</Button>}
      </CardHeader>
    </Card>
  );
}

function NoDataState({ label }: { label: string }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <Database className="h-10 w-10 mb-3 opacity-40" />
        <p className="text-sm font-medium">No data available</p>
        <p className="text-xs">{label} data is empty for the selected period.</p>
      </CardContent>
    </Card>
  );
}

function DailyRevenueReport({ data, onExport }: any) {
  if (!Array.isArray(data) || data.length === 0) return <NoDataState label="Daily revenue" />;
  const total = data.reduce((s: number, d: any) => s + d.total, 0);
  const last = data[data.length - 1];
  return (
    <Card>
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-base font-display">Daily Revenue Summary</CardTitle>
          <p className="text-xs text-muted-foreground">Last {data.length} days · Total {fmtINR(total)}</p>
        </div>
        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={onExport}><Download className="h-3 w-3 mr-1" /> Export</Button>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={data} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
            <XAxis dataKey="day" tick={{ fontSize: 10 }} tickFormatter={(d) => d.slice(5)} stroke="#94A3B8" />
            <YAxis tick={{ fontSize: 10 }} stroke="#94A3B8" tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
            <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #E2E8F0", fontSize: 12 }} formatter={(v: any) => fmtINR(v)} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="room" name="Room" stackId="a" fill="#1B3A6B" />
            <Bar dataKey="fb" name="F&B" stackId="a" fill="#C9952A" />
            <Bar dataKey="minibar" name="Minibar" stackId="a" fill="#16A34A" />
            <Bar dataKey="laundry" name="Laundry" stackId="a" fill="#0369A1" />
            <Bar dataKey="other" name="Other" stackId="a" fill="#D97706" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
        <div className="mt-4 overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-xs">
            <thead className="bg-muted/40 text-[10px] uppercase text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left">Date</th>
                <th className="px-3 py-2 text-right">Room</th>
                <th className="px-3 py-2 text-right">F&B</th>
                <th className="px-3 py-2 text-right">Minibar</th>
                <th className="px-3 py-2 text-right">Laundry</th>
                <th className="px-3 py-2 text-right">Other</th>
                <th className="px-3 py-2 text-right">Tax</th>
                <th className="px-3 py-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.slice(-10).map((d: any) => (
                <tr key={d.day} className="hover:bg-muted/30">
                  <td className="px-3 py-2 font-medium">{d.day}</td>
                  <td className="px-3 py-2 text-right font-mono-num">{fmtINR(d.room)}</td>
                  <td className="px-3 py-2 text-right font-mono-num">{fmtINR(d.fb)}</td>
                  <td className="px-3 py-2 text-right font-mono-num">{fmtINR(d.minibar)}</td>
                  <td className="px-3 py-2 text-right font-mono-num">{fmtINR(d.laundry)}</td>
                  <td className="px-3 py-2 text-right font-mono-num">{fmtINR(d.other)}</td>
                  <td className="px-3 py-2 text-right font-mono-num text-muted-foreground">{fmtINR(d.tax)}</td>
                  <td className="px-3 py-2 text-right font-mono-num font-bold text-navy">{fmtINR(d.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

function OccupancyReport({ data, onExport }: any) {
  if (!Array.isArray(data) || data.length === 0) return <NoDataState label="Occupancy" />;
  const avg = data.length ? (data.reduce((s: number, d: any) => s + d.occupancyRate, 0) / data.length).toFixed(1) : 0;
  return (
    <Card>
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-base font-display">Occupancy Trend</CardTitle>
          <p className="text-xs text-muted-foreground">{data.length} days · Average {avg}%</p>
        </div>
        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={onExport}><Download className="h-3 w-3 mr-1" /> Export</Button>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={320}>
          <AreaChart data={data} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
            <defs>
              <linearGradient id="gOcc" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#1B3A6B" stopOpacity={0.5} />
                <stop offset="100%" stopColor="#1B3A6B" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
            <XAxis dataKey="day" tick={{ fontSize: 10 }} tickFormatter={(d) => d.slice(5)} stroke="#94A3B8" />
            <YAxis tick={{ fontSize: 10 }} stroke="#94A3B8" domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
            <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #E2E8F0", fontSize: 12 }} />
            <Area type="monotone" dataKey="occupancyRate" name="Occupancy %" stroke="#1B3A6B" strokeWidth={2} fill="url(#gOcc)" />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

function ChannelReport({ data, onExport }: any) {
  if (!Array.isArray(data) || data.length === 0) return <NoDataState label="Channel production" />;
  return (
    <Card>
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-base font-display">Channel Production</CardTitle>
        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={onExport}><Download className="h-3 w-3 mr-1" /> Export</Button>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data} layout="vertical" margin={{ top: 8, right: 8, left: 60, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 10 }} stroke="#94A3B8" tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
            <YAxis type="category" dataKey="source" tick={{ fontSize: 10 }} stroke="#94A3B8" width={80} />
            <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #E2E8F0", fontSize: 12 }} formatter={(v: any) => fmtINR(v)} />
            <Bar dataKey="netRevenue" name="Net Revenue" fill="#1B3A6B" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
        <div className="mt-4 overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-xs">
            <thead className="bg-muted/40 text-[10px] uppercase text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left">Source</th>
                <th className="px-3 py-2 text-right">Reservations</th>
                <th className="px-3 py-2 text-right">Room Nights</th>
                <th className="px-3 py-2 text-right">Gross</th>
                <th className="px-3 py-2 text-right">Commission</th>
                <th className="px-3 py-2 text-right">Net</th>
                <th className="px-3 py-2 text-right">Cancellations</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.map((c: any) => (
                <tr key={c.source} className="hover:bg-muted/30">
                  <td className="px-3 py-2 font-medium capitalize">{c.source.replace(/_/g, " ")}</td>
                  <td className="px-3 py-2 text-right font-mono-num">{c.reservations}</td>
                  <td className="px-3 py-2 text-right font-mono-num">{c.roomNights}</td>
                  <td className="px-3 py-2 text-right font-mono-num">{fmtINR(c.grossRevenue)}</td>
                  <td className="px-3 py-2 text-right font-mono-num text-[#DC2626]">{fmtINR(c.commission)}</td>
                  <td className="px-3 py-2 text-right font-mono-num font-bold text-navy">{fmtINR(c.netRevenue)}</td>
                  <td className="px-3 py-2 text-right font-mono-num">{c.cancellations}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

function GstReport({ data, onExport }: any) {
  if (!data || !data.period) return <NoDataState label="GST tax" />;
  return (
    <Card>
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-base font-display">GST Tax Report · {data.period.from} → {data.period.to}</CardTitle>
        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={onExport}><Download className="h-3 w-3 mr-1" /> Export</Button>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="rounded-xl border border-border p-4">
            <p className="text-[10px] uppercase text-muted-foreground">Taxable Value</p>
            <p className="font-display text-2xl font-bold">{fmtINR(data.grandTaxable)}</p>
          </div>
          <div className="rounded-xl border border-border p-4">
            <p className="text-[10px] uppercase text-muted-foreground">Total Tax</p>
            <p className="font-display text-2xl font-bold text-[#D97706]">{fmtINR(data.grandTax)}</p>
          </div>
          <div className="rounded-xl border border-gold/40 bg-gold/5 p-4">
            <p className="text-[10px] uppercase text-muted-foreground">Grand Total (incl. tax)</p>
            <p className="font-display text-2xl font-bold text-navy">{fmtINR(data.grandTotal)}</p>
          </div>
        </div>
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-xs">
            <thead className="bg-muted/40 text-[10px] uppercase text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left">Tax Code</th>
                <th className="px-3 py-2 text-right">Taxable Value</th>
                <th className="px-3 py-2 text-right">CGST</th>
                <th className="px-3 py-2 text-right">SGST</th>
                <th className="px-3 py-2 text-right">IGST</th>
                <th className="px-3 py-2 text-right">Total Tax</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {Object.entries(data.byTaxCode).map(([code, v]: any) => (
                <tr key={code} className="hover:bg-muted/30">
                  <td className="px-3 py-2 font-mono-num font-semibold">{code}</td>
                  <td className="px-3 py-2 text-right font-mono-num">{fmtINR(v.taxable)}</td>
                  <td className="px-3 py-2 text-right font-mono-num">{fmtINR(v.cgst)}</td>
                  <td className="px-3 py-2 text-right font-mono-num">{fmtINR(v.sgst)}</td>
                  <td className="px-3 py-2 text-right font-mono-num">{fmtINR(v.igst)}</td>
                  <td className="px-3 py-2 text-right font-mono-num font-bold">{fmtINR(v.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

function FolioAuditReport({ data, onExport }: any) {
  if (!data || !data.day) return <NoDataState label="Folio audit" />;
  return (
    <Card>
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-base font-display">Folio Audit · {data.day}</CardTitle>
        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={onExport}><Download className="h-3 w-3 mr-1" /> Export</Button>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          <Box label="Folios" value={data.count} />
          <Box label="Open" value={data.open} color="#D97706" />
          <Box label="Closed" value={data.closed} color="#16A34A" />
          <Box label="Charges" value={fmtINR(data.totalCharges)} />
          <Box label="Tax" value={fmtINR(data.totalTax)} />
          <Box label="Payments" value={fmtINR(data.totalPayments)} color="#16A34A" />
        </div>
        <div className="mt-3 rounded-lg border border-[#DC2626]/30 bg-[#DC2626]/5 p-3">
          <p className="text-sm font-semibold flex items-center gap-2 text-[#DC2626]">Voids today: <span className="font-mono-num text-lg">{data.voids}</span></p>
        </div>
      </CardContent>
    </Card>
  );
}

function PaymentMethodsReport({ data, onExport }: any) {
  if (!Array.isArray(data) || data.length === 0) return <NoDataState label="Payment methods" />;
  const total = data.reduce((s: number, d: any) => s + d.total, 0);
  return (
    <Card>
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-base font-display">Payment Methods · Total {fmtINR(total)}</CardTitle>
        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={onExport}><Download className="h-3 w-3 mr-1" /> Export</Button>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          {data.map((p: any) => (
            <div key={p.method} className="rounded-xl border border-border p-4 text-center">
              <p className="text-[10px] uppercase text-muted-foreground">{p.method.replace(/_/g, " ")}</p>
              <p className="font-display text-xl font-bold">{fmtINR(p.total)}</p>
              <p className="text-[10px] text-muted-foreground">{p.count} transactions</p>
              <div className="mt-2 h-1.5 w-full rounded-full bg-border overflow-hidden">
                <div className="h-full bg-gold" style={{ width: `${(p.total / total) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function Box({ label, value, color }: any) {
  return (
    <div className="rounded-xl border border-border p-3" style={color ? { borderColor: color + "40" } : {}}>
      <p className="text-[10px] uppercase text-muted-foreground">{label}</p>
      <p className="font-display text-xl font-bold" style={color ? { color } : {}}>{value}</p>
    </div>
  );
}
