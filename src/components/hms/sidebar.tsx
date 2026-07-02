// HMS Sidebar — role-based navigation with expandable sub-items
"use client";

import { cn } from "@/lib/utils";
import { useAppStore, ModuleKey, ROLE_META, ROLE_MODULES } from "@/lib/store";
import {
  LayoutDashboard, CalendarCheck, DoorOpen, Sparkles, Users, UtensilsCrossed,
  Receipt, BarChart3, MoonStar, UserCog, Wrench, ShieldCheck, Hotel, ChevronLeft, LogOut,
  TrendingUp, Megaphone, UserCheck, Award, Clock, ChevronDown,
  IndianRupee, Cake, Share2, Activity, Target, Briefcase,
  Building2, PieChart, Calendar, Upload, FileText, ClipboardList,
} from "lucide-react";

interface SubItem {
  key: string;
  label: string;
  icon: any;
}

interface NavItem {
  key: ModuleKey;
  label: string;
  icon: any;
  badge?: string;
  children?: SubItem[];
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
    title: "Sales",
    items: [
      {
        key: "sales",
        label: "Sales Pipeline",
        icon: TrendingUp,
        children: [
          { key: "pipeline", label: "Pipeline", icon: Target },
          { key: "leads", label: "Leads", icon: Users },
          { key: "deals", label: "Deals", icon: Briefcase },
          { key: "analytics", label: "Analytics", icon: Activity },
        ],
      },
    ],
  },
  {
    title: "Marketing",
    items: [
      {
        key: "marketing",
        label: "Marketing Hub",
        icon: Megaphone,
        children: [
          { key: "overview", label: "Overview", icon: BarChart3 },
          { key: "campaigns", label: "Campaigns", icon: Megaphone },
          { key: "social", label: "Social Accounts", icon: Share2 },
          { key: "analytics", label: "Analytics", icon: Activity },
          { key: "reports", label: "Reports", icon: FileText },
        ],
      },
    ],
  },
  {
    title: "Human Resources",
    items: [
      {
        key: "hr",
        label: "HR Hub",
        icon: UserCog,
        children: [
          { key: "overview", label: "Overview", icon: BarChart3 },
          { key: "employees", label: "Employees", icon: Users },
          { key: "payroll", label: "Payroll", icon: IndianRupee },
          { key: "events", label: "Events & Birthdays", icon: Cake },
        ],
      },
      {
        key: "attendance",
        label: "Attendance",
        icon: Clock,
        children: [
          { key: "overview", label: "Overview", icon: BarChart3 },
          { key: "calendar", label: "Calendar", icon: Calendar },
          { key: "table", label: "Attendance Table", icon: ClipboardList },
          { key: "manual", label: "Manual Entry", icon: Clock },
          { key: "reports", label: "Reports", icon: FileText },
        ],
      },
      {
        key: "scorecard",
        label: "Scorecard",
        icon: Award,
        children: [
          { key: "overview", label: "Overview", icon: BarChart3 },
          { key: "scorecards", label: "Scorecards", icon: Award },
          { key: "leaderboard", label: "Leaderboard", icon: PieChart },
        ],
      },
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
      {
        key: "staff",
        label: "Staff Directory",
        icon: UserCheck,
        children: [
          { key: "directory", label: "Directory", icon: Users },
          { key: "departments", label: "Departments", icon: Building2 },
          { key: "orgchart", label: "Org Chart", icon: PieChart },
        ],
      },
      { key: "maintenance", label: "Maintenance", icon: Wrench },
    ],
  },
];

export function Sidebar() {
  const {
    activeModule, setActiveModule, activeSubModule, navigateTo,
    sidebarCollapsed, toggleSidebar, expandedMenus, toggleMenu,
    role, user, setUser,
  } = useAppStore();
  const meta = ROLE_META[role];
  const allowedModules = ROLE_MODULES[role] ?? ROLE_MODULES.gm;

  const handleLogout = () => {
    localStorage.removeItem("aria_auth");
    setUser(null);
  };

  const isExpanded = (key: string) => expandedMenus.includes(key);

  const handleParentClick = (item: NavItem) => {
    if (item.children) {
      // Toggle expand + navigate to module with first sub-item
      if (!isExpanded(item.key)) {
        toggleMenu(item.key);
      }
      navigateTo(item.key, item.children[0].key);
    } else {
      navigateTo(item.key, "");
    }
  };

  const handleSubClick = (parentKey: ModuleKey, subKey: string) => {
    navigateTo(parentKey, subKey);
  };

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
              <p className="text-xs font-semibold text-sidebar-foreground truncate">{user?.property?.name ?? "The Aurelian Grand"}</p>
              <p className="text-[10px] text-sidebar-foreground/60 truncate">Mumbai · 5★ · 80 rooms</p>
            </div>
          </div>
        </div>
      )}

      {/* Nav — filtered by role */}
      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-1.5 scrollbar-thin">
        {NAV_GROUPS.map((group) => {
          const filteredItems = group.items.filter((item) => allowedModules.includes(item.key));
          if (filteredItems.length === 0) return null;
          return (
            <div key={group.title}>
              {!sidebarCollapsed && (
                <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/40">{group.title}</p>
              )}
              <div className="space-y-0.5">
                {filteredItems.map((item) => {
                  const active = activeModule === item.key;
                  const hasChildren = !!item.children;
                  const expanded = isExpanded(item.key);
                  const Icon = item.icon;

                  return (
                    <div key={item.key}>
                      {/* Parent item */}
                      <button
                        onClick={() => handleParentClick(item)}
                        title={sidebarCollapsed ? item.label : undefined}
                        className={cn(
                          "group flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all",
                          active
                            ? "bg-gold/10 text-gold"
                            : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground",
                          sidebarCollapsed && "justify-center px-0"
                        )}
                      >
                        <Icon className={cn("h-4 w-4 shrink-0", active ? "text-gold" : "text-sidebar-foreground/60 group-hover:text-gold")} />
                        {!sidebarCollapsed && (
                          <>
                            <span className="truncate flex-1 text-left">{item.label}</span>
                            {hasChildren && (
                              <ChevronDown className={cn(
                                "h-3.5 w-3.5 shrink-0 text-sidebar-foreground/40 transition-transform duration-200",
                                expanded && "rotate-180"
                              )} />
                            )}
                          </>
                        )}
                        {!sidebarCollapsed && item.badge && (
                          <span className="ml-auto rounded-full bg-gold/20 px-1.5 py-0.5 text-[10px] font-bold text-gold">{item.badge}</span>
                        )}
                      </button>

                      {/* Sub-items */}
                      {hasChildren && expanded && !sidebarCollapsed && (
                        <div className="ml-4 mt-0.5 space-y-0.5 border-l border-sidebar-border/50 pl-2">
                          {item.children!.map((sub) => {
                            const SubIcon = sub.icon;
                            const subActive = active && activeSubModule === sub.key;
                            return (
                              <button
                                key={sub.key}
                                onClick={() => handleSubClick(item.key, sub.key)}
                                className={cn(
                                  "flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-all",
                                  subActive
                                    ? "bg-gold/15 text-gold"
                                    : "text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                                )}
                              >
                                <SubIcon className={cn("h-3.5 w-3.5 shrink-0", subActive ? "text-gold" : "text-sidebar-foreground/40")} />
                                <span className="truncate">{sub.label}</span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      {/* User / Role footer + Logout */}
      <div className={cn("border-t border-sidebar-border p-3 space-y-2", sidebarCollapsed && "px-2")}>
        <div className={cn("flex items-center gap-2 rounded-lg bg-sidebar-accent/40 p-2", sidebarCollapsed && "justify-center")}>
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white" style={{ backgroundColor: meta?.accent ?? "#1B3A6B" }}>
            {user ? `${user.firstName[0]}${user.lastName[0]}` : "U"}
          </div>
          {!sidebarCollapsed && (
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-sidebar-foreground truncate">{user ? `${user.firstName} ${user.lastName}` : meta?.label}</p>
              <p className="text-[10px] text-sidebar-foreground/50">{meta?.label ?? role} · Level {meta?.level ?? 4}</p>
            </div>
          )}
        </div>
        <button
          onClick={handleLogout}
          className={cn(
            "flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-sidebar-foreground/60 hover:bg-[#DC2626]/20 hover:text-[#FCA5A5] transition-colors w-full",
            sidebarCollapsed && "justify-center px-0"
          )}
          title="Logout"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {!sidebarCollapsed && <span>Sign Out</span>}
        </button>
      </div>
    </aside>
  );
}
