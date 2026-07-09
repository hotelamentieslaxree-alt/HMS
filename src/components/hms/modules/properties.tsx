// ARIA HMS — Properties Module (Property cards grid, Add property, Comparison view)
"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { useApi } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import { KpiCard, fmtINR, fmtDate } from "../shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Building2, Plus, Star, MapPin, BedDouble, Users,
  ArrowRight, BarChart3, Eye, Settings, CheckCircle2,
  XCircle, Crown, Globe, TrendingUp, ChevronRight,
} from "lucide-react";

// ─── MOCK DATA ──────────────────────────────────────────────────────

const MOCK_PROPERTIES = [
  {
    id: "PROP-01", name: "ARIA Grand Hotel & Spa", code: "ARIAGRAND", city: "Mumbai",
    rooms: 120, starRating: 5, status: "active",
    occupancy: 78, revenue: 4850000, avgRate: 4200,
    address: "123 Marine Drive, Mumbai 400020",
  },
  {
    id: "PROP-02", name: "ARIA Business Hotel", code: "ARIABIZ", city: "Bangalore",
    rooms: 65, starRating: 4, status: "active",
    occupancy: 85, revenue: 2100000, avgRate: 3200,
    address: "456 MG Road, Bangalore 560001",
  },
  {
    id: "PROP-03", name: "ARIA Beach Resort", code: "ARIABEACH", city: "Goa",
    rooms: 45, starRating: 5, status: "active",
    occupancy: 92, revenue: 3200000, avgRate: 7500,
    address: "789 Calangute Beach, Goa 403515",
  },
  {
    id: "PROP-04", name: "ARIA Heritage Inn", code: "ARIAHERIT", city: "Jaipur",
    rooms: 30, starRating: 4, status: "active",
    occupancy: 65, revenue: 980000, avgRate: 3800,
    address: "12 Nahargarh Road, Jaipur 302001",
  },
  {
    id: "PROP-05", name: "ARIA Hill Station Lodge", code: "ARIAHILL", city: "Ooty",
    rooms: 22, starRating: 3, status: "inactive",
    occupancy: 0, revenue: 0, avgRate: 2500,
    address: "34 Doddabetta Road, Ooty 643001",
  },
];

// ─── MAIN COMPONENT ──────────────────────────────────────────────────

export function PropertiesModule() {
  const { refreshTick } = useAppStore();
  const [viewMode, setViewMode] = useState<"cards" | "comparison">("cards");

  const totalRooms = MOCK_PROPERTIES.reduce((s, p) => s + p.rooms, 0);
  const activeProperties = MOCK_PROPERTIES.filter((p) => p.status === "active").length;
  const avgOccupancy = Math.round(MOCK_PROPERTIES.filter((p) => p.status === "active").reduce((s, p) => s + p.occupancy, 0) / activeProperties);
  const totalRevenue = MOCK_PROPERTIES.reduce((s, p) => s + p.revenue, 0);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-display font-bold text-foreground flex items-center gap-2">
            <Building2 className="h-5 w-5 text-navy" /> Properties
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">Manage your hotel properties, compare performance & settings</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 border border-border rounded-md p-0.5">
            <Button variant={viewMode === "cards" ? "default" : "ghost"} size="sm" className="h-7 text-xs px-2" onClick={() => setViewMode("cards")}>Cards</Button>
            <Button variant={viewMode === "comparison" ? "default" : "ghost"} size="sm" className="h-7 text-xs px-2" onClick={() => setViewMode("comparison")}>Compare</Button>
          </div>
          <Button className="bg-navy hover:bg-navy-light text-white h-9"><Plus className="h-4 w-4 mr-1" /> Add Property</Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Total Properties" value={MOCK_PROPERTIES.length} icon={Building2} accent="navy" />
        <KpiCard label="Total Rooms" value={totalRooms} icon={BedDouble} accent="info" />
        <KpiCard label="Avg Occupancy" value={`${avgOccupancy}%`} icon={Users} accent="success" delta={5} deltaLabel="vs last month" />
        <KpiCard label="Total Revenue (MTD)" value={fmtINR(totalRevenue)} icon={TrendingUp} accent="gold" />
      </div>

      {/* Cards View */}
      {viewMode === "cards" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {MOCK_PROPERTIES.map((prop) => (
            <Card key={prop.id} className="hover:shadow-card-lg transition-shadow">
              <CardContent className="p-0">
                {/* Property Header */}
                <div className="p-4 pb-3 border-b border-border">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-sm font-semibold truncate">{prop.name}</h3>
                        {prop.status === "active" ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-[#16A34A] shrink-0" />
                        ) : (
                          <XCircle className="h-3.5 w-3.5 text-[#6B7280] shrink-0" />
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                        <span className="flex items-center gap-0.5"><MapPin className="h-3 w-3" />{prop.city}</span>
                        <span className="font-mono">({prop.code})</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-0.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} className={cn("h-3 w-3", i < prop.starRating ? "fill-[#C9952A] text-[#C9952A]" : "text-muted-foreground/30")} />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Stats */}
                <div className="p-4 pt-3">
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    <div className="rounded-lg border border-border p-2 text-center">
                      <p className="text-[9px] text-muted-foreground uppercase">Rooms</p>
                      <p className="text-sm font-bold font-display">{prop.rooms}</p>
                    </div>
                    <div className="rounded-lg border border-border p-2 text-center">
                      <p className="text-[9px] text-muted-foreground uppercase">Occupancy</p>
                      <p className="text-sm font-bold font-display" style={{ color: prop.occupancy >= 80 ? "#16A34A" : prop.occupancy >= 60 ? "#D97706" : "#DC2626" }}>
                        {prop.occupancy}%
                      </p>
                    </div>
                    <div className="rounded-lg border border-border p-2 text-center">
                      <p className="text-[9px] text-muted-foreground uppercase">Avg Rate</p>
                      <p className="text-xs font-bold font-display">{fmtINR(prop.avgRate)}</p>
                    </div>
                  </div>

                  {/* Occupancy Bar */}
                  {prop.status === "active" && (
                    <div className="mb-3">
                      <div className="flex items-center justify-between text-[10px] mb-1">
                        <span className="text-muted-foreground">Occupancy</span>
                        <span className="font-medium">{prop.occupancy}%</span>
                      </div>
                      <div className="bg-muted rounded-full h-1.5">
                        <div className={cn("rounded-full h-1.5", prop.occupancy >= 80 ? "bg-[#16A34A]" : prop.occupancy >= 60 ? "bg-[#D97706]" : "bg-[#DC2626]")} style={{ width: `${prop.occupancy}%` }} />
                      </div>
                    </div>
                  )}

                  {/* Revenue */}
                  <div className="flex items-center justify-between pt-2 border-t border-border">
                    <div>
                      <p className="text-[9px] text-muted-foreground uppercase">Revenue (MTD)</p>
                      <p className="text-sm font-bold font-display">{prop.revenue > 0 ? fmtINR(prop.revenue) : "-"}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2"><Eye className="h-3 w-3 mr-1" />View</Button>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0"><Settings className="h-3 w-3" /></Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        /* Comparison View */
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-navy" /> Property Comparison
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-[11px]">Metric</TableHead>
                  {MOCK_PROPERTIES.map((p) => (
                    <TableHead key={p.id} className="text-[11px] text-center">{p.name.split(" ").slice(-2).join(" ")}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {[
                  { label: "City", values: MOCK_PROPERTIES.map((p) => p.city) },
                  { label: "Star Rating", values: MOCK_PROPERTIES.map((p) => "★".repeat(p.starRating)) },
                  { label: "Rooms", values: MOCK_PROPERTIES.map((p) => p.rooms.toString()) },
                  { label: "Occupancy", values: MOCK_PROPERTIES.map((p) => `${p.occupancy}%`), highlight: "max" },
                  { label: "Avg Rate", values: MOCK_PROPERTIES.map((p) => fmtINR(p.avgRate)) },
                  { label: "Revenue (MTD)", values: MOCK_PROPERTIES.map((p) => fmtINR(p.revenue)), highlight: "max" },
                  { label: "Status", values: MOCK_PROPERTIES.map((p) => p.status) },
                ].map((row) => (
                  <TableRow key={row.label} className="hover:bg-muted/50">
                    <TableCell className="text-xs font-medium">{row.label}</TableCell>
                    {row.values.map((val, i) => (
                      <TableCell key={i} className="text-xs text-center">
                        {row.label === "Status" ? (
                          <Badge variant={val === "active" ? "default" : "secondary"} className="text-[9px] capitalize">{val}</Badge>
                        ) : (
                          <span className={cn(row.label === "Star Rating" && "text-[#C9952A]")}>{val}</span>
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
