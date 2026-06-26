// Reports module
"use client";

import { useState } from "react";
import { useApi } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart3, FileText, TrendingUp, Percent, Receipt, Users, Download } from "lucide-react";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Area, AreaChart } from "recharts";
import { fmtINR } from "../shared";
import { cn } from "@/lib/utils";

const REPORTS = [
  { key: "daily_revenue", label: "Daily Revenue Summary", icon: BarChart3, desc: "Room, F&B, minibar, laundry breakdown by day" },
  { key: "occupancy", label: "Occupancy Trend", icon: TrendingUp, desc: "Daily occupancy % over selected period" },
  { key: "channel_production", label: "Channel Production", icon: Users, desc: "Reservations & revenue by booking source" },
  { key: "gst", label: "GST Tax Report", icon: Percent, desc: "CGST / SGST / IGST by tax code" },
  { key: "folio_audit", label: "Folio Audit", icon: Receipt, desc: "Today's folio charges, payments, voids" },
  { key: "payment_methods", label: "Payment Methods", icon: FileText, desc: "Cash / card / UPI split" },
];

export function ReportsModule() {
  const [active, setActive] = useState("daily_revenue");
  const { data, loading } = useApi<any>(`/api/reports?type=${active}`, [active]);

  return (
    <div className="space-y-4">
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
      {loading || !data ? (
        <Skeleton className="h-96" />
      ) : active === "daily_revenue" ? (
        <DailyRevenueReport data={data} />
      ) : active === "occupancy" ? (
        <OccupancyReport data={data} />
      ) : active === "channel_production" ? (
        <ChannelReport data={data} />
      ) : active === "gst" ? (
        <GstReport data={data} />
      ) : active === "folio_audit" ? (
        <FolioAuditReport data={data} />
      ) : (
        <PaymentMethodsReport data={data} />
      )}
    </div>
  );
}

function ReportCard({ title, subtitle, action }: any) {
  return (
    <Card>
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-base font-display">{title}</CardTitle>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        {action && <Button size="sm" variant="outline" className="h-7 text-xs"><Download className="h-3 w-3 mr-1" /> Export</Button>}
      </CardHeader>
    </Card>
  );
}

function DailyRevenueReport({ data }: any) {
  const total = data.reduce((s: number, d: any) => s + d.total, 0);
  const last = data[data.length - 1];
  return (
    <Card>
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-base font-display">Daily Revenue Summary</CardTitle>
          <p className="text-xs text-muted-foreground">Last {data.length} days · Total {fmtINR(total)}</p>
        </div>
        <Button size="sm" variant="outline" className="h-7 text-xs"><Download className="h-3 w-3 mr-1" /> Export</Button>
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

function OccupancyReport({ data }: any) {
  const avg = data.length ? (data.reduce((s: number, d: any) => s + d.occupancyRate, 0) / data.length).toFixed(1) : 0;
  return (
    <Card>
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-base font-display">Occupancy Trend</CardTitle>
          <p className="text-xs text-muted-foreground">{data.length} days · Average {avg}%</p>
        </div>
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

function ChannelReport({ data }: any) {
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-base font-display">Channel Production</CardTitle></CardHeader>
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

function GstReport({ data }: any) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-display">GST Tax Report · {data.period.from} → {data.period.to}</CardTitle>
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

function FolioAuditReport({ data }: any) {
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-base font-display">Folio Audit · {data.day}</CardTitle></CardHeader>
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

function PaymentMethodsReport({ data }: any) {
  const total = data.reduce((s: number, d: any) => s + d.total, 0);
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-base font-display">Payment Methods · Total {fmtINR(total)}</CardTitle></CardHeader>
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
