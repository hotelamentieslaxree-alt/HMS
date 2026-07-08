// ARIA HMS — Enterprise Topbar — Hospitality Operating System
"use client";

import { cn } from "@/lib/utils";
import { useAppStore, ROLE_META, ModuleKey } from "@/lib/store";
import { Bell, RefreshCw, Search, MoonStar, Sun, LogOut, Command } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { useApi, apiPost } from "@/lib/api";
import { timeAgo } from "./shared";
import { openCommandPalette } from "./command-palette";

const MODULE_TITLES: Record<ModuleKey, { title: string; subtitle: string }> = {
  dashboard: { title: "Command Center", subtitle: "Real-time property intelligence" },
  reservations: { title: "Reservations", subtitle: "Bookings · Arrivals · Departures" },
  rooms: { title: "Front Office", subtitle: "Live status board across floors" },
  housekeeping: { title: "Housekeeping", subtitle: "Task board · Inspections · Laundry" },
  guests: { title: "Guests", subtitle: "Profiles · Preferences · History" },
  pos: { title: "Restaurant / POS", subtitle: "Outlets · Tables · Kitchen orders" },
  kitchen: { title: "Kitchen Display", subtitle: "Real-time order tracking" },
  folios: { title: "Folios & Billing", subtitle: "Charges · Payments · Invoices" },
  hospital: { title: "Hospital & Clinic", subtitle: "Patients · Doctors · Appointments" },
  inventory: { title: "Inventory & Procurement", subtitle: "Stock · Vendors · Purchase Orders" },
  finance: { title: "Finance & Accounting", subtitle: "Invoices · GST · P&L · Cashbook" },
  hr: { title: "HR Hub", subtitle: "Employees · Payroll · Events" },
  attendance: { title: "Attendance", subtitle: "Clock in/out · Calendar · Reports" },
  scorecard: { title: "Scorecard", subtitle: "Performance · KPIs · Leaderboard" },
  sales: { title: "Sales Pipeline", subtitle: "Leads · Deals · Analytics" },
  marketing: { title: "Marketing Hub", subtitle: "Campaigns · Social · Analytics" },
  crm: { title: "CRM", subtitle: "Guest · Lead · Corporate · Loyalty" },
  tasks: { title: "Tasks", subtitle: "To Do · In Progress · Done" },
  documents: { title: "Documents", subtitle: "Files · Templates · Contracts" },
  reports: { title: "Reports & Analytics", subtitle: "Revenue · Occupancy · Tax" },
  "night-audit": { title: "Night Audit", subtitle: "Business date · Postings · Rollover" },
  audit: { title: "Audit Log", subtitle: "Immutable compliance trail" },
  "ai-center": { title: "AI Center", subtitle: "Intelligent insights & automation" },
  automation: { title: "Automation", subtitle: "Workflows · Rules · Triggers" },
  staff: { title: "Staff & Roles", subtitle: "Departments · Shifts · Access" },
  maintenance: { title: "Maintenance", subtitle: "Tickets · Engineering · Assets" },
  properties: { title: "Properties", subtitle: "Hotels · Branches · Configuration" },
  integrations: { title: "Integrations", subtitle: "OTAs · Payments · Accounting" },
  settings: { title: "Settings", subtitle: "Configuration · Security · Modules" },
};

export function Topbar({ propertyId }: { propertyId?: string }) {
  const { activeModule, role, user, setUser, triggerRefresh, notifOpen, setNotifOpen } = useAppStore();
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
  const meta = ROLE_META[role];

  const markAllRead = async () => {
    await apiPost("/api/notifications", { markAllRead: true });
    reload();
  };

  const handleLogout = () => {
    localStorage.removeItem("aria_auth");
    setUser(null);
  };

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-card/95 backdrop-blur px-4 lg:px-6">
      {/* Module Title */}
      <div className="min-w-0 flex-1">
        <h1 className="font-display text-base font-bold text-foreground leading-tight truncate">{title?.title ?? "Dashboard"}</h1>
        <p className="text-[11px] text-muted-foreground truncate hidden sm:block">{title?.subtitle ?? ""}</p>
      </div>

      {/* Command Palette Trigger */}
      <button
        onClick={() => openCommandPalette()}
        className="hidden md:flex items-center gap-2 rounded-lg border border-border bg-muted/50 hover:bg-muted px-3 py-1.5 w-56 lg:w-72 transition-colors"
      >
        <Search className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-sm text-muted-foreground flex-1 text-left">Search anything…</span>
        <kbd className="hidden lg:inline-flex items-center gap-0.5 rounded border border-border bg-card px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
          <Command className="h-2.5 w-2.5" />K
        </kbd>
      </button>

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

      {/* User info + Logout */}
      <div className="flex items-center gap-2 border-l border-border pl-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-bold text-white" style={{ backgroundColor: meta?.accent ?? "#1B3A6B" }}>
            {user ? `${user.firstName[0]}${user.lastName[0]}` : "U"}
          </div>
          <div className="hidden sm:block text-left">
            <p className="text-xs font-semibold leading-tight">{user ? `${user.firstName} ${user.lastName}` : "User"}</p>
            <p className="text-[10px] text-muted-foreground">{meta?.label ?? role}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          title="Sign out"
          className="rounded-lg border border-border bg-card p-2 text-muted-foreground hover:text-[#DC2626] hover:border-[#DC2626]/30 transition-colors"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}
