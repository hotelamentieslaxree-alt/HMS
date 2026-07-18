// ARIA HMS — Reservations Module with Calendar View & Sub-module Navigation
"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { cn } from "@/lib/utils";
import { useApi, apiPost } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import { KpiCard, ResStatusBadge, SOURCE_META, VipBadge, fmtINR, fmtDate, fmtDateTime } from "../shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  Search, Plus, LogIn, LogOut, Ban, Calendar, Users, BedDouble, Phone,
  AlertTriangle, ChevronLeft, ChevronRight, CalendarDays, CalendarCheck,
  ArrowRight, Clock, UserCheck, UserMinus, Eye, LayoutGrid, List,
} from "lucide-react";

// ─── Fallback reservations when API fails ────────────────────────
const FALLBACK_RESERVATIONS = [
  {
    id: "r1",
    confirmationNumber: "ARI-2025-0142",
    totalNights: 3,
    adults: 2,
    children: 0,
    guest: { firstName: "Rajesh", lastName: "Kumar", phone: "+91-98765-43210", vip: true },
    checkInDate: "2025-03-04",
    checkOutDate: "2025-03-07",
    room: { number: "301" },
    category: { name: "Deluxe King" },
    bookingSource: "direct",
    ratePerNight: 6500,
    status: "confirmed",
  },
  {
    id: "r2",
    confirmationNumber: "ARI-2025-0143",
    totalNights: 2,
    adults: 1,
    children: 1,
    guest: { firstName: "Priya", lastName: "Sharma", phone: "+91-87654-32109", vip: false },
    checkInDate: "2025-03-04",
    checkOutDate: "2025-03-06",
    room: null,
    category: { name: "Superior Twin" },
    bookingSource: "booking_com",
    ratePerNight: 4800,
    status: "tentative",
  },
  {
    id: "r3",
    confirmationNumber: "ARI-2025-0139",
    totalNights: 5,
    adults: 2,
    children: 0,
    guest: { firstName: "Anil", lastName: "Mehta", phone: "+91-76543-21098", vip: true },
    checkInDate: "2025-03-01",
    checkOutDate: "2025-03-06",
    room: { number: "801" },
    category: { name: "Royal Suite" },
    bookingSource: "corporate",
    ratePerNight: 12000,
    status: "checked_in",
  },
  {
    id: "r4",
    confirmationNumber: "ARI-2025-0135",
    totalNights: 4,
    adults: 2,
    children: 2,
    guest: { firstName: "Sneha", lastName: "Patel", phone: "+91-65432-10987", vip: false },
    checkInDate: "2025-02-28",
    checkOutDate: "2025-03-04",
    room: { number: "204" },
    category: { name: "Deluxe King" },
    bookingSource: "expedia",
    ratePerNight: 5500,
    status: "checked_in",
  },
];

// ─── Tab / sub-module mapping ────────────────────────────────────
// Sidebar sub-items: "overview" → All, "arrivals" → Arrivals, "departures" → Departures, "calendar" → Calendar
const RES_TABS = [
  { key: "overview", label: "All Reservations", icon: List },
  { key: "arrivals", label: "Arrivals", icon: UserCheck },
  { key: "departures", label: "Departures", icon: UserMinus },
  { key: "inhouse", label: "In-House", icon: BedDouble },
  { key: "calendar", label: "Calendar View", icon: CalendarDays },
] as const;

const RES_TAB_KEYS = RES_TABS.map((t) => t.key);

// Map sidebar sub-module key to internal view filter
function subModuleToView(sub: string): string {
  if (sub === "overview" || sub === "") return "overview";
  if (sub === "arrivals") return "arrivals";
  if (sub === "departures") return "departures";
  if (sub === "calendar") return "calendar";
  return "overview";
}

// ─── Calendar helpers ────────────────────────────────────────────
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAY_MIN = ["S", "M", "T", "W", "T", "F", "S"];

function getCalendarGrid(year: number, month: number): (Date | null)[][] {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDow = firstDay.getDay();
  const daysInMonth = lastDay.getDate();

  const cells: (Date | null)[] = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);

  const weeks: (Date | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

function dateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

// ─── Main Module ─────────────────────────────────────────────────
export function ReservationsModule() {
  const { activeSubModule, setActiveSubModule, refreshTick, triggerRefresh } = useAppStore();

  // Single source of truth: derive active tab from the store.
  // Sidebar navigation sets activeSubModule → this reacts instantly.
  // No local tab state needed — avoids stale-sync bugs.
  const tab = RES_TAB_KEYS.includes(activeSubModule as any) ? activeSubModule : "overview";

  const handleTabChange = (newTab: string) => {
    // Always sync tab selection back to the store so sidebar highlight stays in sync
    setActiveSubModule(newTab);
  };

  const activeTabMeta = RES_TABS.find((t) => t.key === tab);

  // Search state
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Create dialog
  const [showCreate, setShowCreate] = useState(false);

  // API data — use tab as view filter for API calls (except calendar)
  const viewFilter = tab === "calendar" ? "all" : tab;
  const { data: rawData, loading, error, reload } = useApi<any[]>(
    `/api/reservations?view=${viewFilter}&search=${encodeURIComponent(debouncedSearch)}`,
    [viewFilter, debouncedSearch, refreshTick]
  );
  const data = rawData?.length ? rawData : FALLBACK_RESERVATIONS;

  // All reservations for calendar (unfiltered)
  const { data: allRawData } = useApi<any[]>("/api/reservations?view=all", [refreshTick]);
  const allReservations = allRawData?.length ? allRawData : FALLBACK_RESERVATIONS;

  // Debounce search input
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  // ─── Actions ─────────────────────────────────────────────────────
  const checkIn = async (id: string, confNum: string, guestName: string) => {
    if (!confirm(`Check in ${guestName} (${confNum})?`)) return;
    try {
      const r = await apiPost(`/api/reservations/${id}/check-in`);
      toast.success(`Checked in · Room ${r.roomNumber}`);
      triggerRefresh();
      reload();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const checkOut = async (id: string, confNum: string, guestName: string) => {
    if (!confirm(`Check out ${guestName} (${confNum})? Any unpaid balance will be auto-settled as cash.`)) return;
    try {
      const r = await apiPost(`/api/reservations/${id}/check-out`);
      const settledNote = r.autoSettled > 0 ? ` · ₹${r.autoSettled.toLocaleString("en-IN")} auto-settled as cash` : "";
      toast.success(`Checked out · Total ${fmtINR(r.folioTotal)}${settledNote}`);
      triggerRefresh();
      reload();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const cancel = async (id: string) => {
    const reason = prompt("Reason for cancellation?") || "Cancelled by user";
    if (!confirm("Confirm cancellation? This cannot be undone.")) return;
    try {
      await apiPost(`/api/reservations/${id}/cancel`, { reason });
      toast.success("Reservation cancelled");
      triggerRefresh();
      reload();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  // ─── KPIs ────────────────────────────────────────────────────────
  const kpis = useMemo(() => {
    const all = allReservations;
    const arrivals = all.filter((r: any) => r.status === "confirmed" || r.status === "tentative");
    const departures = all.filter((r: any) => r.status === "checked_in");
    const inHouse = all.filter((r: any) => r.status === "checked_in");
    return { total: all.length, arrivals: arrivals.length, departures: departures.length, inHouse: inHouse.length };
  }, [allReservations]);

  return (
    <div className="space-y-4">
      {/* Module header */}
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#1B3A6B]/10">
          <CalendarCheck className="h-4.5 w-4.5 text-[#1B3A6B]" />
        </div>
        <div className="min-w-0">
          <h2 className="font-display text-lg font-bold tracking-tight text-foreground">Reservations</h2>
          <p className="text-xs text-muted-foreground">{activeTabMeta?.label ?? "All Reservations"} · The Aurelian Grand</p>
        </div>
      </div>

      {/* API error banner */}
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-300">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>Could not load live data. Showing sample data instead.</span>
          <button onClick={reload} className="ml-auto text-xs font-medium underline hover:no-underline">Retry</button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiCard label="Total Reservations" value={kpis.total} icon={Calendar} accent="navy" />
        <KpiCard label="Arrivals Today" value={kpis.arrivals} icon={UserCheck} accent="success" />
        <KpiCard label="Departures Today" value={kpis.departures} icon={UserMinus} accent="warning" />
        <KpiCard label="In-House" value={kpis.inHouse} icon={BedDouble} accent="info" />
      </div>

      {/* Tab Navigation — synced with sidebar activeSubModule */}
      <Tabs value={tab} onValueChange={handleTabChange} className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <TabsList className="flex-wrap">
            {RES_TABS.map((t) => {
              const Icon = t.icon;
              return (
                <TabsTrigger key={t.key} value={t.key} className="gap-1.5 text-xs sm:text-sm">
                  <Icon className="h-3.5 w-3.5 hidden sm:inline-block" />
                  <span className="hidden md:inline">{t.label}</span>
                  <span className="md:hidden">{t.key === "overview" ? "All" : t.key === "calendar" ? "Calendar" : t.label}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>
          {tab !== "calendar" && (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 w-56">
                <Search className="h-4 w-4 text-muted-foreground" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search name, phone, conf#"
                  className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                />
              </div>
              <Button onClick={() => setShowCreate(true)} className="bg-[#1B3A6B] hover:bg-[#1B3A6B]/90 text-white">
                <Plus className="h-4 w-4 mr-1" /> New Reservation
              </Button>
            </div>
          )}
          {tab === "calendar" && (
            <Button onClick={() => setShowCreate(true)} className="bg-[#1B3A6B] hover:bg-[#1B3A6B]/90 text-white">
              <Plus className="h-4 w-4 mr-1" /> New Reservation
            </Button>
          )}
        </div>

        {/* ─── All Reservations Tab ──────────────────────────────── */}
        <TabsContent value="overview" className="space-y-0">
          <ReservationsTable
            data={data}
            loading={loading}
            onCheckIn={checkIn}
            onCheckOut={checkOut}
            onCancel={cancel}
          />
        </TabsContent>

        {/* ─── Arrivals Tab ──────────────────────────────────────── */}
        <TabsContent value="arrivals" className="space-y-0">
          <ReservationsTable
            data={data}
            loading={loading}
            onCheckIn={checkIn}
            onCheckOut={checkOut}
            onCancel={cancel}
            filter="arrivals"
          />
        </TabsContent>

        {/* ─── Departures Tab ────────────────────────────────────── */}
        <TabsContent value="departures" className="space-y-0">
          <ReservationsTable
            data={data}
            loading={loading}
            onCheckIn={checkIn}
            onCheckOut={checkOut}
            onCancel={cancel}
            filter="departures"
          />
        </TabsContent>

        {/* ─── In-House Tab ──────────────────────────────────────── */}
        <TabsContent value="inhouse" className="space-y-0">
          <ReservationsTable
            data={data}
            loading={loading}
            onCheckIn={checkIn}
            onCheckOut={checkOut}
            onCancel={cancel}
            filter="inhouse"
          />
        </TabsContent>

        {/* ─── Calendar View Tab ─────────────────────────────────── */}
        <TabsContent value="calendar" className="space-y-0">
          <CalendarView reservations={allReservations} onCheckIn={checkIn} onCheckOut={checkOut} onCancel={cancel} />
        </TabsContent>
      </Tabs>

      {showCreate && (
        <CreateReservationDialog
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false);
            triggerRefresh();
            reload();
          }}
        />
      )}
    </div>
  );
}

// ─── Reservations Table ──────────────────────────────────────────
function ReservationsTable({
  data,
  loading,
  onCheckIn,
  onCheckOut,
  onCancel,
  filter,
}: {
  data: any[];
  loading: boolean;
  onCheckIn: (id: string, confNum: string, guestName: string) => void;
  onCheckOut: (id: string, confNum: string, guestName: string) => void;
  onCancel: (id: string) => void;
  filter?: string;
}) {
  const filteredData = useMemo(() => {
    if (!filter || filter === "overview") return data;
    if (filter === "arrivals") return data.filter((r: any) => r.status === "confirmed" || r.status === "tentative");
    if (filter === "departures") return data.filter((r: any) => r.status === "checked_in");
    if (filter === "inhouse") return data.filter((r: any) => r.status === "checked_in");
    return data;
  }, [data, filter]);

  const emptyMessage = filter === "arrivals"
    ? "No arrivals today"
    : filter === "departures"
    ? "No departures today"
    : filter === "inhouse"
    ? "No in-house guests"
    : "No reservations found";

  return (
    <Card>
      <CardContent className="p-0">
        {loading ? (
          <div className="p-4 space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-12" />
            ))}
          </div>
        ) : !filteredData?.length ? (
          <p className="text-center text-sm text-muted-foreground py-12">{emptyMessage}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-muted/40">
                <tr className="text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-2.5 font-semibold">Confirmation</th>
                  <th className="px-4 py-2.5 font-semibold">Guest</th>
                  <th className="px-4 py-2.5 font-semibold">Dates</th>
                  <th className="px-4 py-2.5 font-semibold">Room / Category</th>
                  <th className="px-4 py-2.5 font-semibold">Source</th>
                  <th className="px-4 py-2.5 font-semibold text-right">Rate</th>
                  <th className="px-4 py-2.5 font-semibold">Status</th>
                  <th className="px-4 py-2.5 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredData.map((r: any) => (
                  <tr key={r.id} className="hover:bg-muted/30">
                    <td className="px-4 py-2.5">
                      <p className="font-mono text-[#1B3A6B] font-semibold">{r.confirmationNumber}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {r.totalNights}N · {r.adults}A{r.children ? ` · ${r.children}C` : ""}
                      </p>
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium">
                          {r.guest.firstName} {r.guest.lastName}
                        </span>
                        <VipBadge vip={r.guest.vip} />
                      </div>
                      <p className="text-[10px] text-muted-foreground">{r.guest.phone}</p>
                    </td>
                    <td className="px-4 py-2.5">
                      <p className="text-xs">{fmtDate(r.checkInDate)}</p>
                      <p className="text-[10px] text-muted-foreground">→ {fmtDate(r.checkOutDate)}</p>
                    </td>
                    <td className="px-4 py-2.5">
                      {r.room ? (
                        <>
                          <p className="font-mono font-semibold">{r.room.number}</p>
                          <p className="text-[10px] text-muted-foreground">{r.category.name}</p>
                        </>
                      ) : (
                        <>
                          <p className="text-xs text-muted-foreground">Not assigned</p>
                          <p className="text-[10px] text-muted-foreground">{r.category.name}</p>
                        </>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      <Badge variant="outline" className="text-[10px]">
                        {SOURCE_META[r.bookingSource]}
                      </Badge>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <p className="font-mono font-semibold">{fmtINR(r.ratePerNight)}</p>
                      <p className="text-[10px] text-muted-foreground">/night</p>
                    </td>
                    <td className="px-4 py-2.5">
                      <ResStatusBadge status={r.status} />
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center justify-end gap-1">
                        {(r.status === "confirmed" || r.status === "tentative") && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-2 text-xs border-[#16A34A] text-[#16A34A] hover:bg-[#16A34A] hover:text-white"
                            onClick={() => onCheckIn(r.id, r.confirmationNumber, `${r.guest.firstName} ${r.guest.lastName}`)}
                            aria-label={`Check in ${r.guest.firstName} ${r.guest.lastName}`}
                          >
                            <LogIn className="h-3 w-3 mr-1" /> Check-in
                          </Button>
                        )}
                        {r.status === "checked_in" && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-2 text-xs border-[#D97706] text-[#D97706] hover:bg-[#D97706] hover:text-white"
                            onClick={() => onCheckOut(r.id, r.confirmationNumber, `${r.guest.firstName} ${r.guest.lastName}`)}
                            aria-label={`Check out ${r.guest.firstName} ${r.guest.lastName}`}
                          >
                            <LogOut className="h-3 w-3 mr-1" /> Check-out
                          </Button>
                        )}
                        {(r.status === "confirmed" || r.status === "tentative") && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-xs text-[#DC2626]"
                            onClick={() => onCancel(r.id)}
                            aria-label={`Cancel reservation ${r.confirmationNumber}`}
                          >
                            <Ban className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Calendar View ───────────────────────────────────────────────
function CalendarView({
  reservations,
  onCheckIn,
  onCheckOut,
  onCancel,
}: {
  reservations: any[];
  onCheckIn: (id: string, confNum: string, guestName: string) => void;
  onCheckOut: (id: string, confNum: string, guestName: string) => void;
  onCancel: (id: string) => void;
}) {
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  // Navigation
  const goToPrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
    setSelectedDate(null);
  };
  const goToNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
    setSelectedDate(null);
  };
  const goToToday = () => {
    setCurrentMonth(today.getMonth());
    setCurrentYear(today.getFullYear());
    setSelectedDate(null);
  };

  // Build calendar grid
  const weeks = useMemo(() => getCalendarGrid(currentYear, currentMonth), [currentYear, currentMonth]);

  // Build lookup: dateKey → { checkIns, checkOuts, inHouse }
  const dayMap = useMemo(() => {
    const map: Record<string, { checkIns: any[]; checkOuts: any[]; inHouse: any[] }> = {};

    // Initialize all days in the visible month
    for (let d = 1; d <= new Date(currentYear, currentMonth + 1, 0).getDate(); d++) {
      const key = dateKey(new Date(currentYear, currentMonth, d));
      map[key] = { checkIns: [], checkOuts: [], inHouse: [] };
    }

    for (const r of reservations) {
      const ciKey = r.checkInDate?.slice(0, 10);
      const coKey = r.checkOutDate?.slice(0, 10);

      // Check-ins
      if (ciKey && map[ciKey]) {
        if (r.status === "confirmed" || r.status === "tentative" || r.status === "checked_in") {
          map[ciKey].checkIns.push(r);
        }
      }

      // Check-outs
      if (coKey && map[coKey]) {
        if (r.status === "checked_in") {
          map[coKey].checkOuts.push(r);
        }
      }

      // In-house: for every day between checkIn and checkOut
      if (r.status === "checked_in" && ciKey && coKey) {
        const ciDate = new Date(ciKey);
        const coDate = new Date(coKey);
        const current = new Date(ciDate);
        current.setDate(current.getDate() + 1); // Day after check-in
        while (current < coDate) {
          const dk = dateKey(current);
          if (map[dk]) {
            map[dk].inHouse.push(r);
          }
          current.setDate(current.getDate() + 1);
        }
      }
    }

    return map;
  }, [reservations, currentYear, currentMonth]);

  // Selected day's reservations
  const selectedDayReservations = useMemo(() => {
    if (!selectedDate) return null;
    const key = dateKey(selectedDate);
    return dayMap[key] ?? null;
  }, [selectedDate, dayMap]);

  return (
    <div className="space-y-4">
      {/* Calendar Card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={goToPrevMonth} aria-label="Previous month">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <h3 className="font-display text-base sm:text-lg font-bold min-w-[160px] text-center">
                {MONTH_NAMES[currentMonth]} {currentYear}
              </h3>
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={goToNextMonth} aria-label="Next month">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={goToToday}>
              Today
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pb-4">
          {/* Day headers */}
          <div className="grid grid-cols-7 mb-1">
            {DAY_NAMES.map((d, i) => (
              <div key={i} className="text-center text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-muted-foreground py-1">
                <span className="hidden sm:inline">{d}</span>
                <span className="sm:hidden">{DAY_MIN[i]}</span>
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden">
            {weeks.map((week, wi) =>
              week.map((day, di) => {
                if (!day) {
                  return (
                    <div
                      key={`${wi}-${di}`}
                      className="bg-muted/30 min-h-[60px] sm:min-h-[80px] p-1"
                    />
                  );
                }

                const dk = dateKey(day);
                const info = dayMap[dk];
                const isToday = isSameDay(day, today);
                const isSelected = selectedDate ? isSameDay(day, selectedDate) : false;
                const checkInCount = info?.checkIns.length ?? 0;
                const checkOutCount = info?.checkOuts.length ?? 0;
                const inHouseCount = info?.inHouse.length ?? 0;
                const hasEvents = checkInCount > 0 || checkOutCount > 0 || inHouseCount > 0;

                return (
                  <button
                    key={`${wi}-${di}`}
                    onClick={() => setSelectedDate(day)}
                    className={cn(
                      "relative min-h-[60px] sm:min-h-[80px] p-1 sm:p-1.5 text-left transition-colors bg-card hover:bg-muted/40",
                      isSelected && "ring-2 ring-[#1B3A6B] ring-inset z-10",
                      isToday && !isSelected && "bg-[#1B3A6B]/5"
                    )}
                    aria-label={`${day.getDate()} ${MONTH_NAMES[day.getMonth()]} ${day.getFullYear()}${hasEvents ? ` — ${checkInCount} check-ins, ${checkOutCount} check-outs, ${inHouseCount} in-house` : ""}`}
                  >
                    {/* Day number */}
                    <span
                      className={cn(
                        "inline-flex items-center justify-center text-xs sm:text-sm font-medium",
                        isToday
                          ? "h-5 w-5 sm:h-6 sm:w-6 rounded-full bg-[#1B3A6B] text-white font-bold"
                          : "text-foreground/80"
                      )}
                    >
                      {day.getDate()}
                    </span>

                    {/* Event indicators */}
                    {hasEvents && (
                      <div className="mt-0.5 sm:mt-1 space-y-0.5">
                        {checkInCount > 0 && (
                          <div className="flex items-center gap-0.5">
                            <span className="h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-[#16A34A] shrink-0" />
                            <span className="text-[9px] sm:text-[10px] text-[#16A34A] font-semibold leading-none">
                              {checkInCount}in
                            </span>
                          </div>
                        )}
                        {checkOutCount > 0 && (
                          <div className="flex items-center gap-0.5">
                            <span className="h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-[#D97706] shrink-0" />
                            <span className="text-[9px] sm:text-[10px] text-[#D97706] font-semibold leading-none">
                              {checkOutCount}out
                            </span>
                          </div>
                        )}
                        {inHouseCount > 0 && (
                          <div className="flex items-center gap-0.5">
                            <span className="h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-[#0369A1] shrink-0" />
                            <span className="text-[9px] sm:text-[10px] text-[#0369A1] font-semibold leading-none">
                              {inHouseCount}stay
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </button>
                );
              })
            )}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center gap-4 mt-3 px-1">
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-[#16A34A]" />
              <span className="text-[10px] sm:text-xs text-muted-foreground">Check-ins</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-[#D97706]" />
              <span className="text-[10px] sm:text-xs text-muted-foreground">Check-outs</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-[#0369A1]" />
              <span className="text-[10px] sm:text-xs text-muted-foreground">In-House (staying)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-[#1B3A6B]" />
              <span className="text-[10px] sm:text-xs text-muted-foreground">Today</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Selected Day Detail */}
      {selectedDate && selectedDayReservations && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="font-display text-sm sm:text-base">
                {fmtDate(selectedDate)}
              </CardTitle>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Badge variant="outline" className="text-[10px] border-[#16A34A] text-[#16A34A]">
                  {selectedDayReservations.checkIns.length} Check-ins
                </Badge>
                <Badge variant="outline" className="text-[10px] border-[#D97706] text-[#D97706]">
                  {selectedDayReservations.checkOuts.length} Check-outs
                </Badge>
                <Badge variant="outline" className="text-[10px] border-[#0369A1] text-[#0369A1]">
                  {selectedDayReservations.inHouse.length} In-House
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {selectedDayReservations.checkIns.length === 0 &&
            selectedDayReservations.checkOuts.length === 0 &&
            selectedDayReservations.inHouse.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No reservations for this day</p>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {/* Check-ins */}
                {selectedDayReservations.checkIns.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-[#16A34A] uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                      <LogIn className="h-3.5 w-3.5" /> Arrivals / Check-ins
                    </p>
                    {selectedDayReservations.checkIns.map((r: any) => (
                      <ReservationDayRow key={`ci-${r.id}`} r={r} onCheckIn={onCheckIn} onCheckOut={onCheckOut} onCancel={onCancel} />
                    ))}
                  </div>
                )}
                {/* Check-outs */}
                {selectedDayReservations.checkOuts.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-[#D97706] uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                      <LogOut className="h-3.5 w-3.5" /> Departures / Check-outs
                    </p>
                    {selectedDayReservations.checkOuts.map((r: any) => (
                      <ReservationDayRow key={`co-${r.id}`} r={r} onCheckIn={onCheckIn} onCheckOut={onCheckOut} onCancel={onCancel} />
                    ))}
                  </div>
                )}
                {/* In-house */}
                {selectedDayReservations.inHouse.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-[#0369A1] uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                      <BedDouble className="h-3.5 w-3.5" /> In-House (Staying)
                    </p>
                    {selectedDayReservations.inHouse.map((r: any) => (
                      <ReservationDayRow key={`ih-${r.id}`} r={r} onCheckIn={onCheckIn} onCheckOut={onCheckOut} onCancel={onCancel} />
                    ))}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── Reservation Day Row (for calendar day detail) ───────────────
function ReservationDayRow({
  r,
  onCheckIn,
  onCheckOut,
  onCancel,
}: {
  r: any;
  onCheckIn: (id: string, confNum: string, guestName: string) => void;
  onCheckOut: (id: string, confNum: string, guestName: string) => void;
  onCancel: (id: string) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2 hover:bg-muted/30 transition-colors">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="font-mono text-xs text-[#1B3A6B] font-semibold">{r.confirmationNumber}</span>
          <ResStatusBadge status={r.status} />
          <VipBadge vip={r.guest.vip} />
        </div>
        <p className="text-xs text-foreground mt-0.5">
          {r.guest.firstName} {r.guest.lastName}
          {r.room ? ` · Room ${r.room.number}` : " · No room"}
          <span className="text-muted-foreground"> · {r.category.name}</span>
        </p>
        <p className="text-[10px] text-muted-foreground">
          {fmtDate(r.checkInDate)} → {fmtDate(r.checkOutDate)} · {fmtINR(r.ratePerNight)}/night
        </p>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        {(r.status === "confirmed" || r.status === "tentative") && (
          <Button
            size="sm"
            variant="outline"
            className="h-7 px-2 text-xs border-[#16A34A] text-[#16A34A] hover:bg-[#16A34A] hover:text-white"
            onClick={() => onCheckIn(r.id, r.confirmationNumber, `${r.guest.firstName} ${r.guest.lastName}`)}
          >
            <LogIn className="h-3 w-3 mr-1" /> Check-in
          </Button>
        )}
        {r.status === "checked_in" && (
          <Button
            size="sm"
            variant="outline"
            className="h-7 px-2 text-xs border-[#D97706] text-[#D97706] hover:bg-[#D97706] hover:text-white"
            onClick={() => onCheckOut(r.id, r.confirmationNumber, `${r.guest.firstName} ${r.guest.lastName}`)}
          >
            <LogOut className="h-3 w-3 mr-1" /> Check-out
          </Button>
        )}
        {(r.status === "confirmed" || r.status === "tentative") && (
          <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-[#DC2626]" onClick={() => onCancel(r.id)}>
            <Ban className="h-3 w-3" />
          </Button>
        )}
      </div>
    </div>
  );
}

// ─── Create Reservation Dialog ───────────────────────────────────
function CreateReservationDialog({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const { triggerRefresh } = useAppStore();
  const [step, setStep] = useState(1);
  const [guests, setGuests] = useState<any[]>([]);
  const [guestSearch, setGuestSearch] = useState("");
  const [selectedGuest, setSelectedGuest] = useState<any>(null);
  const { data: guestsData } = useApi<any[]>(`/api/guests?search=${encodeURIComponent(guestSearch)}`, [guestSearch]);
  const { data: roomsData } = useApi<any>("/api/rooms", []);
  const [form, setForm] = useState({
    categoryId: "",
    ratePlanId: "",
    checkInDate: "",
    checkOutDate: "",
    adults: 2,
    children: 0,
    bookingSource: "direct",
    specialRequests: "",
  });

  const categories = roomsData?.rooms
    ? Array.from(new Map(roomsData.rooms.map((r: any) => [r.category.id, r.category])).values())
    : [];

  const submit = async () => {
    if (!selectedGuest || !form.categoryId || !form.checkInDate || !form.checkOutDate) {
      toast.error("Fill all required fields");
      return;
    }
    try {
      await apiPost("/api/reservations", {
        guestId: selectedGuest.id,
        categoryId: form.categoryId,
        checkInDate: form.checkInDate,
        checkOutDate: form.checkOutDate,
        adults: Number(form.adults),
        children: Number(form.children),
        bookingSource: form.bookingSource,
        specialRequests: form.specialRequests,
      });
      toast.success("Reservation created");
      onCreated();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-display">New Reservation</DialogTitle>
        </DialogHeader>
        <div className="flex items-center gap-2 mb-4">
          {[1, 2, 3].map((s) => (
            <div key={s} className={`h-1.5 flex-1 rounded-full ${step >= s ? "bg-[#C9952A]" : "bg-border"}`} />
          ))}
        </div>
        {step === 1 && (
          <div className="space-y-3">
            <Label>Search guest (existing or create new)</Label>
            <Input
              value={guestSearch}
              onChange={(e) => setGuestSearch(e.target.value)}
              placeholder="Type name, email or phone…"
            />
            <div className="max-h-48 overflow-y-auto rounded-lg border border-border">
              {guestsData?.slice(0, 8).map((g: any) => (
                <button
                  key={g.id}
                  onClick={() => {
                    setSelectedGuest(g);
                    setStep(2);
                  }}
                  className="flex w-full items-center gap-3 px-3 py-2 hover:bg-muted text-left border-b border-border/60 last:border-0"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#1B3A6B]/10 text-xs font-bold text-[#1B3A6B]">
                    {g.firstName[0]}
                    {g.lastName[0]}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium">
                      {g.fullName} {g.vipStatus && <VipBadge vip />}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {g.email} · {g.phone} · {g.loyaltyTier}
                    </p>
                  </div>
                </button>
              ))}
              {!guestsData?.length && guestSearch && (
                <p className="px-3 py-4 text-sm text-muted-foreground text-center">No match — guest will be created</p>
              )}
            </div>
            {selectedGuest && (
              <div className="rounded-lg border border-[#C9952A]/40 bg-[#C9952A]/5 p-3">
                <p className="text-sm font-semibold">{selectedGuest.fullName}</p>
                <p className="text-xs text-muted-foreground">
                  {selectedGuest.email} · {selectedGuest.phone}
                </p>
              </div>
            )}
          </div>
        )}
        {step === 2 && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Check-in date *</Label>
              <Input
                type="date"
                value={form.checkInDate}
                onChange={(e) => setForm({ ...form, checkInDate: e.target.value })}
              />
            </div>
            <div>
              <Label>Check-out date *</Label>
              <Input
                type="date"
                value={form.checkOutDate}
                onChange={(e) => setForm({ ...form, checkOutDate: e.target.value })}
              />
            </div>
            <div>
              <Label>Room category *</Label>
              <Select value={form.categoryId} onValueChange={(v) => setForm({ ...form, categoryId: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name} · {fmtINR(c.baseRate)}/night
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Booking source</Label>
              <Select value={form.bookingSource} onValueChange={(v) => setForm({ ...form, bookingSource: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(SOURCE_META).map(([k, v]) => (
                    <SelectItem key={k} value={k}>
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Adults</Label>
              <Input
                type="number"
                min={1}
                value={form.adults}
                onChange={(e) => setForm({ ...form, adults: Number(e.target.value) })}
              />
            </div>
            <div>
              <Label>Children</Label>
              <Input
                type="number"
                min={0}
                value={form.children}
                onChange={(e) => setForm({ ...form, children: Number(e.target.value) })}
              />
            </div>
            <div className="col-span-2">
              <Label>Special requests</Label>
              <Input
                value={form.specialRequests}
                onChange={(e) => setForm({ ...form, specialRequests: e.target.value })}
                placeholder="High floor, late check-in, anniversary…"
              />
            </div>
          </div>
        )}
        {step === 3 && (
          <div className="space-y-2 text-sm">
            <ReviewRow icon={Users} label="Guest" value={selectedGuest?.fullName} />
            <ReviewRow icon={Calendar} label="Dates" value={`${form.checkInDate} → ${form.checkOutDate}`} />
            <ReviewRow
              icon={BedDouble}
              label="Category"
              value={categories.find((c: any) => c.id === form.categoryId)?.name ?? "—"}
            />
            <ReviewRow icon={Phone} label="Source" value={SOURCE_META[form.bookingSource]} />
            <ReviewRow icon={Users} label="Guests" value={`${form.adults} adults · ${form.children} children`} />
          </div>
        )}
        <DialogFooter>
          {step > 1 && (
            <Button variant="outline" onClick={() => setStep(step - 1)}>
              Back
            </Button>
          )}
          {step === 2 && (
            <Button
              disabled={!form.categoryId || !form.checkInDate || !form.checkOutDate}
              onClick={() => setStep(3)}
            >
              Review
            </Button>
          )}
          {step < 2 && (
            <Button disabled={!selectedGuest} onClick={() => setStep(2)}>
              Continue
            </Button>
          )}
          {step === 3 && (
            <Button onClick={submit} className="bg-[#1B3A6B] hover:bg-[#1B3A6B]/90 text-white">
              Confirm Reservation
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Review Row helper ───────────────────────────────────────────
function ReviewRow({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border px-3 py-2">
      <Icon className="h-4 w-4 text-muted-foreground" />
      <span className="text-xs text-muted-foreground w-20">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
