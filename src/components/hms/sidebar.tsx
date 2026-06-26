// HMS Sidebar
"use client";

import { cn } from "@/lib/utils";
import { useAppStore, ModuleKey, RoleKey, ROLE_META } from "@/lib/store";
import {
  LayoutDashboard, CalendarCheck, DoorOpen, Sparkles, Users, UtensilsCrossed,
  Receipt, BarChart3, MoonStar, UserCog, Wrench, ShieldCheck, Hotel, ChevronLeft,
} from "lucide-react";

interface NavItem {
  key: ModuleKey;
  label: string;
  icon: any;
  roles?: RoleKey[]; // if omitted, visible to all
}

const NAV_GROUPS: { title: string; items: NavItem[] }[] = [
  {
    title: "Operations",
    items: [
      { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
      { key: "reservations", label: "Reservations", icon: CalendarCheck },
      { key: "rooms", label: "Rooms & Inventory", icon: DoorOpen },
      { key: "housekeeping", label: "Housekeeping", icon: Sparkles },
      { key: "guests", label: "Guest CRM", icon: Users },
    ],
  },
  {
    title: "Commerce",
    items: [
      { key: "pos", label: "F&B / POS", icon: UtensilsCrossed },
      { key: "folios", label: "Folios & Billing", icon: Receipt },
    ],
  },
  {
    title: "Intelligence",
    items: [
      { key: "reports", label: "Reports", icon: BarChart3 },
      { key: "night-audit", label: "Night Audit", icon: MoonStar },
      { key: "audit", label: "Audit Log", icon: ShieldCheck },
    ],
  },
  {
    title: "Administration",
    items: [
      { key: "staff", label: "Staff & Roles", icon: UserCog },
      { key: "maintenance", label: "Maintenance", icon: Wrench },
    ],
  },
];

export function Sidebar() {
  const { activeModule, setActiveModule, sidebarCollapsed, toggleSidebar, role } = useAppStore();
  const meta = ROLE_META[role];

  return (
    <aside
      className={cn(
        "flex flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border transition-all duration-300",
        sidebarCollapsed ? "w-[68px]" : "w-64"
      )}
    >
      {/* Brand */}
      <div className="flex items-center gap-3 px-4 h-16 border-b border-sidebar-border shrink-0">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gold text-navy font-display font-bold text-lg shadow-glow-gold">
          A
        </div>
        {!sidebarCollapsed && (
          <div className="min-w-0">
            <p className="font-display text-sm font-bold leading-tight text-sidebar-foreground truncate">ARIA HMS</p>
            <p className="text-[10px] uppercase tracking-widest text-gold/80">Hospitality Suite</p>
          </div>
        )}
        <button
          onClick={toggleSidebar}
          className="ml-auto rounded-md p-1 text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors"
          aria-label="Toggle sidebar"
        >
          <ChevronLeft className={cn("h-4 w-4 transition-transform", sidebarCollapsed && "rotate-180")} />
        </button>
      </div>

      {/* Property selector */}
      {!sidebarCollapsed && (
        <div className="px-3 py-3 border-b border-sidebar-border">
          <div className="flex items-center gap-2 rounded-lg bg-sidebar-accent/60 px-3 py-2">
            <Hotel className="h-4 w-4 text-gold shrink-0" />
            <div className="min-w-0">
              <p className="text-xs font-semibold text-sidebar-foreground truncate">The Aurelian Grand</p>
              <p className="text-[10px] text-sidebar-foreground/60 truncate">Mumbai · 5★ · 80 rooms</p>
            </div>
          </div>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-4">
        {NAV_GROUPS.map((group) => (
          <div key={group.title}>
            {!sidebarCollapsed && (
              <p className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/40">{group.title}</p>
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const active = activeModule === item.key;
                const Icon = item.icon;
                return (
                  <button
                    key={item.key}
                    onClick={() => setActiveModule(item.key)}
                    title={sidebarCollapsed ? item.label : undefined}
                    className={cn(
                      "group flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all",
                      active
                        ? "bg-gold text-navy shadow-sm"
                        : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground",
                      sidebarCollapsed && "justify-center px-0"
                    )}
                  >
                    <Icon className={cn("h-4 w-4 shrink-0", active ? "text-navy" : "text-sidebar-foreground/60 group-hover:text-gold")} />
                    {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Role footer */}
      <div className={cn("border-t border-sidebar-border p-3", sidebarCollapsed && "px-2")}>
        <div className={cn("flex items-center gap-2 rounded-lg bg-sidebar-accent/40 p-2", sidebarCollapsed && "justify-center")}>
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white" style={{ backgroundColor: meta.accent }}>
            {meta.label.split(" ").map((w) => w[0]).join("").slice(0, 2)}
          </div>
          {!sidebarCollapsed && (
            <div className="min-w-0">
              <p className="text-xs font-semibold text-sidebar-foreground truncate">{meta.label}</p>
              <p className="text-[10px] text-sidebar-foreground/50">Level {meta.level} access</p>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
