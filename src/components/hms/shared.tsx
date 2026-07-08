// HMS shared UI helpers
"use client";

import { cn } from "@/lib/utils";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";

export function KpiCard({
  label, value, unit, delta, deltaLabel, icon: Icon, accent = "navy", hint,
}: {
  label: string;
  value: string | number;
  unit?: string;
  delta?: number;
  deltaLabel?: string;
  icon?: any;
  accent?: "navy" | "gold" | "success" | "warning" | "info" | "error";
  hint?: string;
}) {
  const accentMap: Record<string, string> = {
    navy: "bg-navy text-white",
    gold: "bg-gold text-navy",
    success: "bg-[#16A34A] text-white",
    warning: "bg-[#D97706] text-white",
    info: "bg-[#0284C7] text-white",
    error: "bg-[#DC2626] text-white",
  };
  return (
    <div className="relative overflow-hidden rounded-xl border border-border bg-card p-3 sm:p-4 shadow-card hover:shadow-card-lg transition-shadow">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
          <p className="mt-1 font-display text-lg sm:text-xl font-bold text-foreground tabular-nums">{value}<span className="ml-0.5 text-sm font-medium text-muted-foreground">{unit}</span></p>
          {hint && <p className="mt-0.5 text-[11px] text-muted-foreground">{hint}</p>}
        </div>
        {Icon && (
          <div className={cn("hidden sm:flex h-7 w-7 shrink-0 items-center justify-center rounded-lg", accentMap[accent])}>
            <Icon className="h-3.5 w-3.5" />
          </div>
        )}
      </div>
      {delta !== undefined && (
        <div className="mt-2 flex items-center gap-1 text-xs flex-wrap">
          <span className={cn("inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 font-medium whitespace-nowrap", delta >= 0 ? "bg-[#DCFCE7] text-[#16A34A]" : "bg-[#FFE4E6] text-[#DC2626]")}>
            {delta >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
            {Math.abs(delta)}%
          </span>
          {deltaLabel && <span className="text-muted-foreground truncate">{deltaLabel}</span>}
        </div>
      )}
    </div>
  );
}

export const ROOM_STATUS_META: Record<string, { label: string; short: string; cls: string; dot: string }> = {
  vacant_clean: { label: "Vacant Clean", short: "VC", cls: "room-vc", dot: "#16A34A" },
  vacant_dirty: { label: "Vacant Dirty", short: "VD", cls: "room-vd", dot: "#D97706" },
  occupied_clean: { label: "Occupied Clean", short: "OC", cls: "room-oc", dot: "#0369A1" },
  occupied_dirty: { label: "Occupied Dirty", short: "OD", cls: "room-od", dot: "#DC2626" },
  out_of_order: { label: "Out of Order", short: "OOO", cls: "room-ooo", dot: "#6B7280" },
  out_of_service: { label: "Out of Service", short: "OOS", cls: "room-oos", dot: "#7C3AED" },
};

export function RoomStatusBadge({ status, size = "sm" }: { status: string; size?: "sm" | "xs" }) {
  const m = ROOM_STATUS_META[status] ?? ROOM_STATUS_META.vacant_clean;
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-md border font-medium", m.cls, size === "xs" ? "px-1.5 py-0 text-[10px]" : "px-2 py-0.5 text-xs")}>
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: m.dot }} />
      {m.label}
    </span>
  );
}

export const RES_STATUS_META: Record<string, { label: string; cls: string }> = {
  confirmed: { label: "Confirmed", cls: "bg-[#DBEAFE] text-[#1B3A6B] border-[#0369A1]" },
  tentative: { label: "Tentative", cls: "bg-[#FEF3C7] text-[#78350F] border-[#D97706]" },
  checked_in: { label: "Checked In", cls: "bg-[#DCFCE7] text-[#14532D] border-[#16A34A]" },
  checked_out: { label: "Checked Out", cls: "bg-[#E5E7EB] text-[#374151] border-[#6B7280]" },
  cancelled: { label: "Cancelled", cls: "bg-[#FFE4E6] text-[#881337] border-[#DC2626]" },
  no_show: { label: "No-Show", cls: "bg-[#FFE4E6] text-[#881337] border-[#DC2626]" },
  waitlisted: { label: "Waitlisted", cls: "bg-[#F3E8FF] text-[#4C1D95] border-[#7C3AED]" },
};

export function ResStatusBadge({ status }: { status: string }) {
  const m = RES_STATUS_META[status] ?? RES_STATUS_META.confirmed;
  return <span className={cn("inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium", m.cls)}>{m.label}</span>;
}

export const SOURCE_META: Record<string, string> = {
  direct: "Direct",
  booking_com: "Booking.com",
  expedia: "Expedia",
  airbnb: "Airbnb",
  makemytrip: "MakeMyTrip",
  goibibo: "Goibibo",
  agoda: "Agoda",
  corporate: "Corporate",
  walk_in: "Walk-in",
  phone: "Phone",
};

export function VipBadge({ vip }: { vip: boolean }) {
  if (!vip) return null;
  return <span className="inline-flex items-center rounded-md border border-gold bg-gold/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-gold">VIP</span>;
}

export function fmtINR(n: number) {
  return "₹" + Math.round(n).toLocaleString("en-IN");
}

export function fmtDate(d: string | Date) {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export function fmtDateTime(d: string | Date) {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hour12: true });
}

export function timeAgo(d: string | Date) {
  const date = typeof d === "string" ? new Date(d) : d;
  const diff = Date.now() - date.getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  return `${days}d ago`;
}
