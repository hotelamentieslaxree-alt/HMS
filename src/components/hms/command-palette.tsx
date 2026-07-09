// ARIA HMS — Command Palette (Linear/Stripe/Vercel inspired)
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from "@/components/ui/command";
import { useAppStore, type ModuleKey } from "@/lib/store";
import {
  LayoutDashboard,
  CalendarCheck,
  DoorOpen,
  Sparkles,
  Users,
  UtensilsCrossed,
  Receipt,
  TrendingUp,
  Megaphone,
  UserCog,
  Clock,
  Award,
  BarChart3,
  MoonStar,
  ShieldCheck,
  UserCheck,
  Wrench,
  Hotel,
  Building2,
  IndianRupee,
  PieChart,
  Heart,
  Package,
  Landmark,
  Handshake,
  CheckSquare,
  FileText,
  Brain,
  Zap,
  Plug,
  Settings,
  ChefHat,
  Plus,
  UserPlus,
  ShoppingCart,
  LogIn,
  Play,
  RotateCcw,
  Eye,
  Download,
  Printer,
  Calculator,
  Calendar,
  ClipboardList,
  Activity,
  Target,
  Briefcase,
  Share2,
  Cake,
} from "lucide-react";

// ─── Extended module list (current + planned) ─────────────────────────
type ExtendedModuleKey =
  | ModuleKey
  | "hospital"
  | "inventory"
  | "finance"
  | "crm"
  | "tasks"
  | "documents"
  | "ai-center"
  | "automation"
  | "integrations"
  | "settings"
  | "properties"
  | "kitchen";

interface NavEntry {
  key: ExtendedModuleKey;
  label: string;
  icon: React.ElementType;
  group: string;
  keywords?: string[];
  sub?: { key: string; label: string; icon: React.ElementType }[];
}

const NAV_ENTRIES: NavEntry[] = [
  // ── Operations ──
  {
    key: "dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    group: "Operations",
    keywords: ["home", "command center", "overview"],
  },
  {
    key: "reservations",
    label: "Reservations",
    icon: CalendarCheck,
    group: "Operations",
    keywords: ["bookings", "res", "arrival", "departure", "calendar"],
    sub: [
      { key: "new", label: "New Reservation", icon: Plus },
      { key: "arrivals", label: "Today's Arrivals", icon: LogIn },
      { key: "departures", label: "Today's Departures", icon: RotateCcw },
    ],
  },
  {
    key: "rooms",
    label: "Rooms & Inventory",
    icon: DoorOpen,
    group: "Operations",
    keywords: ["room", "inventory", "status", "floor"],
  },
  {
    key: "housekeeping",
    label: "Housekeeping",
    icon: Sparkles,
    group: "Operations",
    keywords: ["hk", "cleaning", "inspection", "laundry"],
  },
  {
    key: "guests",
    label: "Guest CRM",
    icon: Users,
    group: "Operations",
    keywords: ["guest", "profile", "preference", "loyalty", "crm"],
  },
  // ── Commerce ──
  {
    key: "pos",
    label: "F&B / POS",
    icon: UtensilsCrossed,
    group: "Commerce",
    keywords: ["pos", "restaurant", "outlet", "order", "food", "beverage"],
  },
  {
    key: "kitchen",
    label: "Kitchen Display",
    icon: ChefHat,
    group: "Commerce",
    keywords: ["kds", "kitchen", "cooking", "orders"],
  },
  {
    key: "folios",
    label: "Folios & Billing",
    icon: Receipt,
    group: "Commerce",
    keywords: ["folio", "bill", "invoice", "payment", "charge"],
  },
  // ── Sales ──
  {
    key: "sales",
    label: "Sales Pipeline",
    icon: TrendingUp,
    group: "Sales & Revenue",
    keywords: ["sales", "lead", "deal", "pipeline"],
    sub: [
      { key: "pipeline", label: "Pipeline", icon: Target },
      { key: "leads", label: "Leads", icon: Users },
      { key: "deals", label: "Deals", icon: Briefcase },
      { key: "analytics", label: "Analytics", icon: Activity },
    ],
  },
  // ── Marketing ──
  {
    key: "marketing",
    label: "Marketing Hub",
    icon: Megaphone,
    group: "Sales & Revenue",
    keywords: ["marketing", "campaign", "social", "promo"],
    sub: [
      { key: "overview", label: "Overview", icon: BarChart3 },
      { key: "campaigns", label: "Campaigns", icon: Megaphone },
      { key: "social", label: "Social Accounts", icon: Share2 },
      { key: "analytics", label: "Analytics", icon: Activity },
      { key: "reports", label: "Reports", icon: FileText },
    ],
  },
  // ── Human Resources ──
  {
    key: "hr",
    label: "HR Hub",
    icon: UserCog,
    group: "Human Resources",
    keywords: ["hr", "human resources", "employee", "payroll"],
    sub: [
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
    group: "Human Resources",
    keywords: ["attendance", "clock", "time", "punch"],
    sub: [
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
    group: "Human Resources",
    keywords: ["scorecard", "performance", "kpi", "leaderboard"],
    sub: [
      { key: "overview", label: "Overview", icon: BarChart3 },
      { key: "scorecards", label: "Scorecards", icon: Award },
      { key: "leaderboard", label: "Leaderboard", icon: PieChart },
    ],
  },
  // ── Intelligence ──
  {
    key: "reports",
    label: "Reports & Analytics",
    icon: BarChart3,
    group: "Intelligence",
    keywords: ["report", "analytics", "data", "chart"],
  },
  {
    key: "night-audit",
    label: "Night Audit",
    icon: MoonStar,
    group: "Intelligence",
    keywords: ["night", "audit", "rollover", "close", "business date"],
  },
  {
    key: "audit",
    label: "Audit Log",
    icon: ShieldCheck,
    group: "Intelligence",
    keywords: ["audit", "log", "compliance", "trail"],
  },
  // ── Administration ──
  {
    key: "staff",
    label: "Staff Directory",
    icon: UserCheck,
    group: "Administration",
    keywords: ["staff", "directory", "department", "org"],
    sub: [
      { key: "directory", label: "Directory", icon: Users },
      { key: "departments", label: "Departments", icon: Building2 },
      { key: "orgchart", label: "Org Chart", icon: PieChart },
    ],
  },
  {
    key: "maintenance",
    label: "Maintenance",
    icon: Wrench,
    group: "Administration",
    keywords: ["maintenance", "ticket", "engineering", "repair"],
  },
  // ── Planned / Future modules ──
  {
    key: "hospital",
    label: "Hospital",
    icon: Heart,
    group: "Extensions",
    keywords: ["hospital", "patient", "doctor", "opd", "ipd", "emergency", "pharmacy"],
  },
  {
    key: "inventory",
    label: "Inventory",
    icon: Package,
    group: "Extensions",
    keywords: ["inventory", "stock", "procurement", "vendor"],
  },
  {
    key: "finance",
    label: "Finance",
    icon: Landmark,
    group: "Extensions",
    keywords: ["finance", "gst", "expense", "p&l", "cashbook", "bank"],
  },
  {
    key: "crm",
    label: "CRM",
    icon: Handshake,
    group: "Extensions",
    keywords: ["crm", "loyalty", "membership", "corporate", "lead"],
  },
  {
    key: "tasks",
    label: "Tasks",
    icon: CheckSquare,
    group: "Productivity",
    keywords: ["task", "todo", "assignment", "checklist"],
  },
  {
    key: "documents",
    label: "Documents",
    icon: FileText,
    group: "Productivity",
    keywords: ["document", "file", "upload", "template"],
  },
  {
    key: "ai-center",
    label: "AI Center",
    icon: Brain,
    group: "Productivity",
    keywords: ["ai", "artificial intelligence", "ml", "insight", "prediction"],
  },
  {
    key: "automation",
    label: "Automation",
    icon: Zap,
    group: "Productivity",
    keywords: ["automation", "workflow", "trigger", "rule"],
  },
  {
    key: "integrations",
    label: "Integrations",
    icon: Plug,
    group: "System",
    keywords: ["integration", "api", "connect", "webhook", "third party"],
  },
  {
    key: "settings",
    label: "Settings",
    icon: Settings,
    group: "System",
    keywords: ["settings", "config", "preference", "general"],
  },
  {
    key: "properties",
    label: "Properties",
    icon: Hotel,
    group: "System",
    keywords: ["property", "hotel", "property config", "chain"],
  },
];

// ─── Quick Actions ────────────────────────────────────────────────────
interface QuickAction {
  id: string;
  label: string;
  icon: React.ElementType;
  keywords: string[];
  shortcut?: string;
  action: () => void;
}

// ─── Recent Items (localStorage) ──────────────────────────────────────
const RECENT_KEY = "aria_command_palette_recent";
const MAX_RECENT = 8;

interface RecentItem {
  key: string;
  label: string;
  icon: string; // icon name stored as string
  module: ExtendedModuleKey;
  sub?: string;
  timestamp: number;
}

function loadRecent(): RecentItem[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as RecentItem[];
  } catch {
    return [];
  }
}

function saveRecent(items: RecentItem[]) {
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(items.slice(0, MAX_RECENT)));
  } catch {
    // localStorage full or unavailable
  }
}

function addRecent(item: RecentItem) {
  const existing = loadRecent().filter((r) => r.key !== item.key);
  const updated = [item, ...existing].slice(0, MAX_RECENT);
  saveRecent(updated);
}

// ─── Icon lookup by name (for recent items) ───────────────────────────
const ICON_MAP: Record<string, React.ElementType> = {
  LayoutDashboard, CalendarCheck, DoorOpen, Sparkles, Users, UtensilsCrossed,
  Receipt, TrendingUp, Megaphone, UserCog, Clock, Award, BarChart3, MoonStar,
  ShieldCheck, UserCheck, Wrench, Hotel, Building2, IndianRupee, PieChart,
  Heart, Package, Landmark, Handshake, CheckSquare, FileText, Brain, Zap,
  Plug, Settings, ChefHat,
};

// ─── Custom event for opening the palette from other components ────────
const OPEN_EVENT = "aria:open-command-palette";

/** Dispatch from any component to open the command palette */
export function openCommandPalette() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(OPEN_EVENT));
  }
}

// ─── Command Palette Component ────────────────────────────────────────
export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const navigateTo = useAppStore((s) => s.navigateTo);
  const recentRef = useRef<RecentItem[]>(loadRecent());
  const [, forceUpdate] = useState(0);

  // Reload recent on open
  const handleOpenChange = useCallback((v: boolean) => {
    setOpen(v);
    if (v) {
      recentRef.current = loadRecent();
      forceUpdate((n) => n + 1);
    }
  }, []);

  // ── Keyboard shortcut: Cmd+K / Ctrl+K ──
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  // ── Custom event listener (e.g. from topbar search bar) ──
  useEffect(() => {
    const handler = () => handleOpenChange(true);
    window.addEventListener(OPEN_EVENT, handler);
    return () => window.removeEventListener(OPEN_EVENT, handler);
  }, [handleOpenChange]);

  // ── Navigate handler ──
  const handleNavigate = useCallback(
    (entry: NavEntry, subKey?: string) => {
      navigateTo(entry.key as ModuleKey, subKey ?? "");
      addRecent({
        key: subKey ? `${entry.key}:${subKey}` : entry.key,
        label: subKey
          ? entry.sub?.find((s) => s.key === subKey)?.label ?? entry.label
          : entry.label,
        icon: entry.icon.displayName ?? entry.icon.name ?? "LayoutDashboard",
        module: entry.key,
        sub: subKey,
        timestamp: Date.now(),
      });
      setOpen(false);
    },
    [navigateTo],
  );

  // ── Quick actions (depend on navigateTo) ──
  const quickActions: QuickAction[] = [
    {
      id: "new-reservation",
      label: "New Reservation",
      icon: Plus,
      keywords: ["new", "reservation", "booking", "create"],
      shortcut: "⌘⇧R",
      action: () => {
        navigateTo("reservations", "new");
        addRecent({
          key: "reservations:new",
          label: "New Reservation",
          icon: "Plus",
          module: "reservations",
          sub: "new",
          timestamp: Date.now(),
        });
        setOpen(false);
      },
    },
    {
      id: "new-guest",
      label: "New Guest",
      icon: UserPlus,
      keywords: ["new", "guest", "create", "add"],
      shortcut: "⌘⇧G",
      action: () => {
        navigateTo("guests", "new");
        addRecent({
          key: "guests:new",
          label: "New Guest",
          icon: "UserPlus",
          module: "guests",
          sub: "new",
          timestamp: Date.now(),
        });
        setOpen(false);
      },
    },
    {
      id: "new-order",
      label: "New Order",
      icon: ShoppingCart,
      keywords: ["new", "order", "pos", "restaurant", "food"],
      shortcut: "⌘⇧O",
      action: () => {
        navigateTo("pos", "new-order");
        addRecent({
          key: "pos:new-order",
          label: "New Order",
          icon: "ShoppingCart",
          module: "pos",
          sub: "new-order",
          timestamp: Date.now(),
        });
        setOpen(false);
      },
    },
    {
      id: "check-in",
      label: "Check-in Guest",
      icon: LogIn,
      keywords: ["check", "in", "arrival", "guest", "register"],
      action: () => {
        navigateTo("reservations", "arrivals");
        addRecent({
          key: "reservations:arrivals",
          label: "Check-in Guest",
          icon: "LogIn",
          module: "reservations",
          sub: "arrivals",
          timestamp: Date.now(),
        });
        setOpen(false);
      },
    },
    {
      id: "night-audit-run",
      label: "Run Night Audit",
      icon: Play,
      keywords: ["night", "audit", "run", "close", "business date"],
      action: () => {
        navigateTo("night-audit", "run");
        addRecent({
          key: "night-audit:run",
          label: "Run Night Audit",
          icon: "Play",
          module: "night-audit",
          sub: "run",
          timestamp: Date.now(),
        });
        setOpen(false);
      },
    },
    {
      id: "view-arrivals",
      label: "View Today's Arrivals",
      icon: Eye,
      keywords: ["view", "arrivals", "today", "check in"],
      action: () => {
        navigateTo("reservations", "arrivals");
        setOpen(false);
      },
    },
    {
      id: "room-status",
      label: "Room Status Board",
      icon: DoorOpen,
      keywords: ["room", "status", "board", "availability"],
      action: () => {
        navigateTo("rooms", "");
        setOpen(false);
      },
    },
    {
      id: "print-report",
      label: "Export Reports",
      icon: Download,
      keywords: ["export", "download", "report", "csv", "pdf"],
      action: () => {
        navigateTo("reports", "");
        setOpen(false);
      },
    },
    {
      id: "new-invoice",
      label: "Create Invoice",
      icon: Printer,
      keywords: ["invoice", "create", "bill", "folio", "print"],
      action: () => {
        navigateTo("folios", "new");
        addRecent({
          key: "folios:new",
          label: "Create Invoice",
          icon: "Printer",
          module: "folios",
          sub: "new",
          timestamp: Date.now(),
        });
        setOpen(false);
      },
    },
    {
      id: "post-charge",
      label: "Post Charge",
      icon: Calculator,
      keywords: ["post", "charge", "folio", "billing"],
      action: () => {
        navigateTo("folios", "post-charge");
        setOpen(false);
      },
    },
  ];

  const recentItems = recentRef.current;

  return (
    <CommandDialog
      open={open}
      onOpenChange={handleOpenChange}
      title="Command Palette"
      description="Search modules, actions, and recent items…"
      showCloseButton={false}
      className="sm:max-w-lg md:max-w-xl lg:max-w-2xl [&_[data-slot=dialog-overlay]]:bg-black/60 [&_[data-slot=dialog-overlay]]:backdrop-blur-sm [&_[data-slot=dialog-content]]:rounded-xl [&_[data-slot=dialog-content]]:border-border/50 [&_[data-slot=dialog-content]]:shadow-2xl [&_[data-slot=dialog-content]]:data-[state=open]:animate-in [&_[data-slot=dialog-content]]:data-[state=closed]:animate-out [&_[data-slot=dialog-content]]:data-[state=closed]:fade-out-0 [&_[data-slot=dialog-content]]:data-[state=open]:fade-in-0 [&_[data-slot=dialog-content]]:data-[state=closed]:zoom-out-98 [&_[data-slot=dialog-content]]:data-[state=open]:zoom-in-98 [&_[data-slot=dialog-content]]:duration-200"
    >
      {/* Search input */}
      <CommandInput placeholder="Search modules, actions, and recent items…" />

      <CommandList className="max-h-[420px]">
        <CommandEmpty className="py-8 text-center text-sm text-muted-foreground">
          <span className="block text-lg mb-1">🔍</span>
          No results found. Try a different search term.
        </CommandEmpty>

        {/* ── Recent Items ── */}
        {recentItems.length > 0 && (
          <CommandGroup heading="Recent">
            {recentItems.map((item) => {
              const IconComp = ICON_MAP[item.icon] ?? LayoutDashboard;
              const entry = NAV_ENTRIES.find((e) => e.key === item.module);
              return (
                <CommandItem
                  key={`recent-${item.key}`}
                  value={`recent-${item.label.toLowerCase()}`}
                  onSelect={() => {
                    if (entry) {
                      handleNavigate(entry, item.sub);
                    } else {
                      navigateTo(item.module as ModuleKey, item.sub ?? "");
                      setOpen(false);
                    }
                  }}
                  className="flex items-center gap-3 px-3 py-2.5 cursor-pointer"
                >
                  <IconComp className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="flex-1 truncate">{item.label}</span>
                  <span className="text-[10px] text-muted-foreground/60 tabular-nums">
                    {formatTimestamp(item.timestamp)}
                  </span>
                </CommandItem>
              );
            })}
          </CommandGroup>
        )}

        {/* ── Quick Actions ── */}
        <CommandGroup heading="Quick Actions">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <CommandItem
                key={action.id}
                value={`action-${action.label.toLowerCase()} ${action.keywords.join(" ")}`}
                onSelect={action.action}
                className="flex items-center gap-3 px-3 py-2.5 cursor-pointer"
              >
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-border bg-muted/50">
                  <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
                <span className="flex-1 truncate">{action.label}</span>
                {action.shortcut && (
                  <CommandShortcut className="text-[10px] tracking-normal">
                    {action.shortcut}
                  </CommandShortcut>
                )}
              </CommandItem>
            );
          })}
        </CommandGroup>

        {/* ── Navigation Modules (grouped) ── */}
        {(() => {
          const groups = new Map<string, NavEntry[]>();
          for (const entry of NAV_ENTRIES) {
            const existing = groups.get(entry.group) ?? [];
            existing.push(entry);
            groups.set(entry.group, existing);
          }

          return Array.from(groups.entries()).map(([group, entries]) => (
            <CommandGroup key={group} heading={group}>
              {entries.map((entry) => {
                const Icon = entry.icon;
                const kw = entry.keywords?.join(" ") ?? "";
                return (
                  <CommandItem
                    key={entry.key}
                    value={`nav-${entry.label.toLowerCase()} ${kw} ${entry.key.replace(/-/g, " ")}`}
                    onSelect={() => handleNavigate(entry)}
                    className="flex items-center gap-3 px-3 py-2.5 cursor-pointer"
                  >
                    <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="flex-1 truncate">{entry.label}</span>
                    <span className="text-[10px] text-muted-foreground/50 font-mono">
                      {entry.key}
                    </span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          ));
        })()}
      </CommandList>

      {/* ── Footer hint ── */}
      <div className="flex items-center justify-between border-t border-border/50 px-3 py-2">
        <div className="flex items-center gap-3 text-[11px] text-muted-foreground/70">
          <span className="flex items-center gap-1">
            <kbd className="rounded border border-border bg-muted px-1 py-0.5 font-mono text-[10px]">↑↓</kbd>
            navigate
          </span>
          <span className="flex items-center gap-1">
            <kbd className="rounded border border-border bg-muted px-1 py-0.5 font-mono text-[10px]">↵</kbd>
            select
          </span>
          <span className="flex items-center gap-1">
            <kbd className="rounded border border-border bg-muted px-1 py-0.5 font-mono text-[10px]">esc</kbd>
            close
          </span>
        </div>
        <span className="text-[10px] text-muted-foreground/40">
          ARIA HMS
        </span>
      </div>
    </CommandDialog>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────
function formatTimestamp(ts: number): string {
  const now = Date.now();
  const diff = now - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(ts).toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
}
