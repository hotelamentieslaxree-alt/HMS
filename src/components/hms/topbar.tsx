// HMS Topbar
"use client";

import { cn } from "@/lib/utils";
import { useAppStore, RoleKey, ROLE_META, ModuleKey } from "@/lib/store";
import { Bell, RefreshCw, Search, Menu, MoonStar, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { useApi, apiPost } from "@/lib/api";
import { timeAgo } from "./shared";

const MODULE_TITLES: Record<ModuleKey, { title: string; subtitle: string }> = {
  dashboard: { title: "Owner Command Center", subtitle: "Real-time property intelligence" },
  reservations: { title: "Reservations", subtitle: "Bookings · Arrivals · Departures" },
  rooms: { title: "Rooms & Inventory", subtitle: "Live status board across floors" },
  housekeeping: { title: "Housekeeping", subtitle: "Task board · Inspections · Laundry" },
  guests: { title: "Guest CRM", subtitle: "Profiles · Preferences · Loyalty" },
  pos: { title: "F&B Point of Sale", subtitle: "Outlets · Tables · Kitchen orders" },
  folios: { title: "Folios & Billing", subtitle: "Charges · Payments · Invoices" },
  reports: { title: "Reports & Analytics", subtitle: "Revenue · Occupancy · Tax" },
  "night-audit": { title: "Night Audit", subtitle: "Business date · Postings · Rollover" },
  staff: { title: "Staff & Roles", subtitle: "Departments · Shifts · Access" },
  maintenance: { title: "Maintenance", subtitle: "Tickets · Engineering · Assets" },
  audit: { title: "Audit Log", subtitle: "Immutable compliance trail" },
};

export function Topbar({ propertyId }: { propertyId?: string }) {
  const { activeModule, role, setRole, triggerRefresh, notifOpen, setNotifOpen } = useAppStore();
  const title = MODULE_TITLES[activeModule];
  const { theme, setTheme } = useTheme();
  const [now, setNow] = useState(() => new Date());
  const { data: notifData, reload } = useApi(propertyId ? "/api/notifications" : null, [propertyId]);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000 * 30);
    return () => clearInterval(t);
  }, []);

  const notifications = notifData?.notifications ?? [];
  const unread = notifData?.unreadCount ?? 0;

  const markAllRead = async () => {
    await apiPost("/api/notifications", { markAllRead: true });
    reload();
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-card/95 backdrop-blur px-4 lg:px-6">
      <div className="min-w-0 flex-1">
        <h1 className="font-display text-lg font-bold text-foreground leading-tight truncate">{title.title}</h1>
        <p className="text-xs text-muted-foreground truncate hidden sm:block">{title.subtitle}</p>
      </div>

      {/* Search (decorative) */}
      <div className="hidden md:flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-3 py-1.5 w-56 lg:w-72">
        <Search className="h-4 w-4 text-muted-foreground" />
        <input
          placeholder="Search guests, rooms, reservations…"
          className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
        <kbd className="hidden lg:inline text-[10px] text-muted-foreground border border-border rounded px-1">⌘K</kbd>
      </div>

      {/* Live clock */}
      <div className="hidden xl:flex flex-col items-end text-right">
        <p className="text-sm font-mono-num font-semibold text-foreground tabular-nums">
          {now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })}
        </p>
        <p className="text-[10px] text-muted-foreground">{now.toLocaleDateString("en-IN", { weekday: "short", day: "2-digit", month: "short" })} · IST</p>
      </div>

      {/* Refresh */}
      <button
        onClick={() => triggerRefresh()}
        title="Refresh data"
        className="rounded-lg border border-border bg-card p-2 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
      >
        <RefreshCw className="h-4 w-4" />
      </button>

      {/* Theme toggle */}
      <button
        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        title="Toggle theme"
        className="rounded-lg border border-border bg-card p-2 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
      >
        {theme === "dark" ? <Sun className="h-4 w-4" /> : <MoonStar className="h-4 w-4" />}
      </button>

      {/* Notifications */}
      <div className="relative">
        <button
          onClick={() => setNotifOpen(!notifOpen)}
          title="Notifications"
          className="relative rounded-lg border border-border bg-card p-2 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <Bell className="h-4 w-4" />
          {unread > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#DC2626] px-1 text-[10px] font-bold text-white">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </button>
        {notifOpen && (
          <div className="absolute right-0 top-12 z-50 w-80 rounded-xl border border-border bg-popover shadow-card-lg overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <p className="text-sm font-semibold">Notifications</p>
              {unread > 0 && (
                <button onClick={markAllRead} className="text-xs text-primary hover:underline">Mark all read</button>
              )}
            </div>
            <div className="max-h-96 overflow-y-auto">
              {notifications.length === 0 ? (
                <p className="px-4 py-8 text-center text-sm text-muted-foreground">No notifications</p>
              ) : (
                notifications.map((n: any) => (
                  <div key={n.id} className={cn("flex gap-3 px-4 py-3 border-b border-border/60 last:border-0 hover:bg-muted/40", !n.isRead && "bg-gold/5")}>
                    <div className={cn("mt-0.5 h-2 w-2 rounded-full shrink-0", {
                      "bg-[#DC2626]": n.type === "error",
                      "bg-[#D97706]": n.type === "warning",
                      "bg-[#16A34A]": n.type === "success",
                      "bg-[#0284C7]": n.type === "info" || n.type === "approval",
                      "bg-gold": n.type === "alert",
                    })} />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground">{n.title}</p>
                      <p className="text-xs text-muted-foreground line-clamp-2">{n.message}</p>
                      <p className="text-[10px] text-muted-foreground/70 mt-0.5">{timeAgo(n.createdAt)}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Role switcher */}
      <div className="flex items-center gap-2 border-l border-border pl-3">
        <RoleSwitcher role={role} setRole={setRole} />
      </div>
    </header>
  );
}

function RoleSwitcher({ role, setRole }: { role: RoleKey; setRole: (r: RoleKey) => void }) {
  const meta = ROLE_META[role];
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-lg border border-border bg-card px-2 py-1.5 hover:bg-muted transition-colors"
      >
        <div className="flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-bold text-white" style={{ backgroundColor: meta.accent }}>
          {meta.label.split(" ").map((w) => w[0]).join("").slice(0, 2)}
        </div>
        <div className="hidden sm:block text-left">
          <p className="text-xs font-semibold leading-tight">{meta.label}</p>
          <p className="text-[10px] text-muted-foreground">L{meta.level}</p>
        </div>
      </button>
      {open && (
        <div className="absolute right-0 top-12 z-50 w-56 rounded-xl border border-border bg-popover shadow-card-lg overflow-hidden">
          <p className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border">Switch role</p>
          {(Object.keys(ROLE_META) as RoleKey[]).map((r) => (
            <button
              key={r}
              onClick={() => { setRole(r); setOpen(false); }}
              className={cn("flex w-full items-center gap-3 px-3 py-2 text-sm hover:bg-muted transition-colors", role === r && "bg-muted")}
            >
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: ROLE_META[r].accent }} />
              <span className="font-medium">{ROLE_META[r].label}</span>
              <span className="ml-auto text-[10px] text-muted-foreground">L{ROLE_META[r].level}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
