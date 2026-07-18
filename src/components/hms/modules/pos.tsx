// ARIA HMS — F&B POS Module (Outlets & Tables, Orders, Menu Builder)
"use client";

import { useState, useEffect, useCallback } from "react";
import { useApi, apiPost, apiPut, apiDelete } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  UtensilsCrossed, Wine, Coffee, ShoppingBag, Plus, ChefHat,
  CheckCircle2, DollarSign, Clock, AlertTriangle, ClipboardList,
  Search, ArrowLeft, Star, Eye, Edit3, Trash2,
  ChevronUp, ChevronDown, X, Timer, Utensils, Soup, Cake,
  GlassWater, Tag, LayoutGrid, FileText,
  MoveRight,
} from "lucide-react";
import { fmtINR, fmtDateTime, timeAgo } from "../shared";
import { cn } from "@/lib/utils";

// ─── Fallback data when API fails ────────────────────────────────
const FALLBACK_OUTLETS = [
  { id: "outlet-1", name: "Spice Garden", code: "SG", type: "restaurant", tableCount: 12, tablesAvailable: 5, tablesOccupied: 7, activeOrders: 4, revenueToday: 42500 },
  { id: "outlet-2", name: "The Royal Bar", code: "RB", type: "bar", tableCount: 8, tablesAvailable: 3, tablesOccupied: 5, activeOrders: 3, revenueToday: 28700 },
  { id: "outlet-3", name: "Café Aroma", code: "CA", type: "cafe", tableCount: 6, tablesAvailable: 4, tablesOccupied: 2, activeOrders: 1, revenueToday: 8900 },
  { id: "outlet-4", name: "Room Service", code: "RS", type: "room_service", tableCount: 0, tablesAvailable: 0, tablesOccupied: 0, activeOrders: 6, revenueToday: 31200 },
];

const FALLBACK_ORDERS = [
  { id: "ord-1", kotNumber: 1042, status: "in_preparation", totalAmount: 1850, createdAt: new Date(Date.now() - 25 * 60000).toISOString(), outlet: { id: "outlet-1", name: "Spice Garden" }, table: { number: "5" }, lines: [{ id: "l1", name: "Butter Chicken", quantity: 1, lineTotal: 650 }, { id: "l2", name: "Garlic Naan", quantity: 4, lineTotal: 400 }, { id: "l3", name: "Dal Makhani", quantity: 1, lineTotal: 450 }, { id: "l4", name: "Jeera Rice", quantity: 1, lineTotal: 350 }] },
  { id: "ord-2", kotNumber: 1043, status: "sent_to_kitchen", totalAmount: 2400, createdAt: new Date(Date.now() - 8 * 60000).toISOString(), outlet: { id: "outlet-2", name: "The Royal Bar" }, table: { number: "3" }, lines: [{ id: "l5", name: "Old Monk & Coke", quantity: 2, lineTotal: 800 }, { id: "l6", name: "Paneer Tikka", quantity: 1, lineTotal: 650 }, { id: "l7", name: "Chicken Seekh Kebab", quantity: 1, lineTotal: 950 }] },
  { id: "ord-3", kotNumber: 1044, status: "ready", totalAmount: 950, createdAt: new Date(Date.now() - 18 * 60000).toISOString(), outlet: { id: "outlet-3", name: "Café Aroma" }, table: { number: "2" }, lines: [{ id: "l8", name: "Cappuccino", quantity: 2, lineTotal: 500 }, { id: "l9", name: "Blueberry Cheesecake", quantity: 1, lineTotal: 450 }] },
  { id: "ord-4", kotNumber: 1045, status: "served", totalAmount: 3200, createdAt: new Date(Date.now() - 45 * 60000).toISOString(), outlet: { id: "outlet-1", name: "Spice Garden" }, table: { number: "8" }, lines: [{ id: "l10", name: "Mutton Biryani", quantity: 2, lineTotal: 1600 }, { id: "l11", name: "Raita", quantity: 2, lineTotal: 200 }, { id: "l12", name: "Gulab Jamun", quantity: 4, lineTotal: 600 }, { id: "l13", name: "Mineral Water", quantity: 4, lineTotal: 400 }, { id: "l14", name: "Tandoori Roti", quantity: 6, lineTotal: 400 }] },
  { id: "ord-5", kotNumber: 1046, status: "billed", totalAmount: 1650, createdAt: new Date(Date.now() - 65 * 60000).toISOString(), outlet: { id: "outlet-2", name: "The Royal Bar" }, table: { number: "1" }, lines: [{ id: "l15", name: "Kingfisher Premium", quantity: 4, lineTotal: 1000 }, { id: "l16", name: "Masala Papad", quantity: 2, lineTotal: 200 }, { id: "l17", name: "French Fries", quantity: 1, lineTotal: 450 }] },
  { id: "ord-6", kotNumber: 1047, status: "paid", totalAmount: 890, createdAt: new Date(Date.now() - 120 * 60000).toISOString(), outlet: { id: "outlet-3", name: "Café Aroma" }, table: { number: "4" }, lines: [{ id: "l18", name: "Espresso", quantity: 2, lineTotal: 340 }, { id: "l19", name: "Tiramisu", quantity: 1, lineTotal: 550 }] },
  { id: "ord-7", kotNumber: 1048, status: "draft", totalAmount: 1200, createdAt: new Date(Date.now() - 2 * 60000).toISOString(), outlet: { id: "outlet-4", name: "Room Service" }, table: { number: "—" }, lines: [{ id: "l20", name: "Club Sandwich", quantity: 2, lineTotal: 800 }, { id: "l21", name: "Fresh Juice", quantity: 2, lineTotal: 400 }] },
  { id: "ord-8", kotNumber: 1038, status: "void", totalAmount: 750, createdAt: new Date(Date.now() - 180 * 60000).toISOString(), outlet: { id: "outlet-1", name: "Spice Garden" }, table: { number: "11" }, lines: [{ id: "l22", name: "Pasta Arrabiata", quantity: 1, lineTotal: 550 }, { id: "l23", name: "Garlic Bread", quantity: 1, lineTotal: 200 }] },
];

const OUTLET_ICONS: Record<string, any> = {
  restaurant: UtensilsCrossed, bar: Wine, cafe: Coffee, room_service: ShoppingBag, pool_bar: UtensilsCrossed, banquet: UtensilsCrossed,
};

const ORDER_STATUS_FLOW: Record<string, { label: string; color: string; next?: string }> = {
  draft: { label: "Draft", color: "#64748B", next: "sent_to_kitchen" },
  sent_to_kitchen: { label: "Sent to Kitchen", color: "#0284C7", next: "in_preparation" },
  in_preparation: { label: "Preparing", color: "#D97706", next: "ready" },
  ready: { label: "Ready", color: "#16A34A", next: "served" },
  served: { label: "Served", color: "#0369A1", next: "billed" },
  billed: { label: "Billed", color: "#7C3AED", next: "paid" },
  paid: { label: "Paid", color: "#16A34A" },
  void: { label: "Void", color: "#DC2626" },
};

// ─── Menu Builder Mock Data ──────────────────────────────────────────

interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  dietType: string;
  categoryId: string;
  isFeatured: boolean;
  isAvailable: boolean;
  sortOrder: number;
}

interface MenuCategory {
  id: string;
  name: string;
  icon: any;
  isExpanded: boolean;
  items: MenuItem[];
}

const INITIAL_MENU_CATEGORIES: MenuCategory[] = [
  {
    id: "cat-starters", name: "Starters", icon: Soup, isExpanded: true,
    items: [
      { id: "mi-1", name: "Paneer Tikka", description: "Marinated cottage cheese grilled in tandoor with bell peppers", price: 450, dietType: "veg", categoryId: "cat-starters", isFeatured: true, isAvailable: true, sortOrder: 0 },
      { id: "mi-2", name: "Chicken Seekh Kebab", description: "Minced chicken kebabs with aromatic spices", price: 550, dietType: "non_veg", categoryId: "cat-starters", isFeatured: false, isAvailable: true, sortOrder: 1 },
      { id: "mi-3", name: "Masala Papad", description: "Crispy papad topped with spiced onion-tomato mixture", price: 120, dietType: "veg", categoryId: "cat-starters", isFeatured: false, isAvailable: true, sortOrder: 2 },
      { id: "mi-4", name: "Fish Amritsari", description: "Crispy battered fish with tangy chutney", price: 620, dietType: "non_veg", categoryId: "cat-starters", isFeatured: true, isAvailable: true, sortOrder: 3 },
    ],
  },
  {
    id: "cat-main", name: "Main Course", icon: Utensils, isExpanded: false,
    items: [
      { id: "mi-5", name: "Butter Chicken", description: "Tender chicken in rich tomato-cream gravy", price: 550, dietType: "non_veg", categoryId: "cat-main", isFeatured: true, isAvailable: true, sortOrder: 0 },
      { id: "mi-6", name: "Dal Makhani", description: "Slow-cooked black lentils with cream and butter", price: 380, dietType: "veg", categoryId: "cat-main", isFeatured: false, isAvailable: true, sortOrder: 1 },
      { id: "mi-7", name: "Mutton Rogan Josh", description: "Aromatic Kashmiri-style mutton curry", price: 720, dietType: "non_veg", categoryId: "cat-main", isFeatured: true, isAvailable: true, sortOrder: 2 },
      { id: "mi-8", name: "Palak Paneer", description: "Cottage cheese cubes in creamy spinach gravy", price: 420, dietType: "veg", categoryId: "cat-main", isFeatured: false, isAvailable: false, sortOrder: 3 },
    ],
  },
  {
    id: "cat-breads", name: "Breads & Rice", icon: Cake, isExpanded: false,
    items: [
      { id: "mi-9", name: "Garlic Naan", description: "Leavened bread with garlic and butter", price: 80, dietType: "veg", categoryId: "cat-breads", isFeatured: false, isAvailable: true, sortOrder: 0 },
      { id: "mi-10", name: "Jeera Rice", description: "Basmati rice tempered with cumin seeds", price: 280, dietType: "veg", categoryId: "cat-breads", isFeatured: false, isAvailable: true, sortOrder: 1 },
      { id: "mi-11", name: "Tandoori Roti", description: "Whole wheat bread baked in tandoor", price: 60, dietType: "veg", categoryId: "cat-breads", isFeatured: false, isAvailable: true, sortOrder: 2 },
      { id: "mi-12", name: "Mutton Biryani", description: "Aromatic layered rice with tender mutton pieces", price: 650, dietType: "non_veg", categoryId: "cat-breads", isFeatured: true, isAvailable: true, sortOrder: 3 },
    ],
  },
  {
    id: "cat-desserts", name: "Desserts", icon: Cake, isExpanded: false,
    items: [
      { id: "mi-13", name: "Gulab Jamun", description: "Deep-fried milk dumplings in rose-scented syrup", price: 150, dietType: "veg", categoryId: "cat-desserts", isFeatured: false, isAvailable: true, sortOrder: 0 },
      { id: "mi-14", name: "Blueberry Cheesecake", description: "New York style cheesecake with blueberry compote", price: 320, dietType: "veg", categoryId: "cat-desserts", isFeatured: true, isAvailable: true, sortOrder: 1 },
      { id: "mi-15", name: "Tiramisu", description: "Classic Italian dessert with espresso-soaked ladyfingers", price: 350, dietType: "contains_egg", categoryId: "cat-desserts", isFeatured: false, isAvailable: true, sortOrder: 2 },
      { id: "mi-16", name: "Kulfi Falooda", description: "Traditional Indian ice cream with vermicelli and rose syrup", price: 220, dietType: "veg", categoryId: "cat-desserts", isFeatured: false, isAvailable: true, sortOrder: 3 },
    ],
  },
  {
    id: "cat-beverages", name: "Beverages", icon: GlassWater, isExpanded: false,
    items: [
      { id: "mi-17", name: "Cappuccino", description: "Rich espresso with steamed milk foam", price: 220, dietType: "veg", categoryId: "cat-beverages", isFeatured: false, isAvailable: true, sortOrder: 0 },
      { id: "mi-18", name: "Fresh Orange Juice", description: "Freshly squeezed orange juice", price: 180, dietType: "vegan", categoryId: "cat-beverages", isFeatured: false, isAvailable: true, sortOrder: 1 },
      { id: "mi-19", name: "Old Monk & Coke", description: "Dark rum with cola and lime", price: 400, dietType: "contains_alcohol", categoryId: "cat-beverages", isFeatured: true, isAvailable: true, sortOrder: 2 },
      { id: "mi-20", name: "Mineral Water", description: "Bottled still water 1L", price: 80, dietType: "vegan", categoryId: "cat-beverages", isFeatured: false, isAvailable: true, sortOrder: 3 },
    ],
  },
];

// ─── Diet type helpers ───────────────────────────────────────────────

const DIET_META: Record<string, { label: string; color: string }> = {
  veg: { label: "Vegetarian", color: "#16A34A" },
  non_veg: { label: "Non-Veg", color: "#DC2626" },
  vegan: { label: "Vegan", color: "#7C3AED" },
  contains_egg: { label: "Contains Egg", color: "#D97706" },
  contains_alcohol: { label: "Contains Alcohol", color: "#D97706" },
};

function DietIndicator({ type }: { type: string }) {
  const meta = DIET_META[type] ?? DIET_META.veg;
  return (
    <span className="inline-flex h-4 w-4 items-center justify-center rounded-sm border" style={{ borderColor: meta.color }}>
      <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: meta.color }} />
    </span>
  );
}

// ─── Time elapsed helper ─────────────────────────────────────────────

function ElapsedTime({ startTime }: { startTime: string }) {
  const [elapsed, setElapsed] = useState("");
  useEffect(() => {
    const start = new Date(startTime).getTime();
    const update = () => {
      const diff = Date.now() - start;
      const mins = Math.floor(diff / 60000);
      const hrs = Math.floor(mins / 60);
      if (hrs > 0) {
        setElapsed(`${hrs}h ${mins % 60}m`);
      } else {
        setElapsed(`${mins}m`);
      }
    };
    update();
    const timer = setInterval(update, 30000);
    return () => clearInterval(timer);
  }, [startTime]);

  const isUrgent = elapsed.includes("h") || parseInt(elapsed) > 30;
  return (
    <span className={cn("flex items-center gap-1 text-xs", isUrgent ? "text-[#DC2626] font-semibold" : "text-muted-foreground")}>
      <Timer className="h-3 w-3" />
      {elapsed}
    </span>
  );
}

// ─── MAIN COMPONENT ──────────────────────────────────────────────────

export function PosModule() {
  const { activeSubModule, setActiveSubModule } = useAppStore();
  const [activeOutlet, setActiveOutlet] = useState<string | null>(null);

  // activeSubModule is the single source of truth
  const currentView = ["orders", "menu"].includes(activeSubModule) ? activeSubModule : "outlets";

  // Bidirectional: when internal navigation changes, update the store
  const switchView = useCallback((view: string) => {
    setActiveSubModule(view);
    if (view !== "outlets") {
      setActiveOutlet(null);
    }
  }, [setActiveSubModule]);

  // When user drills into an outlet from outlets view, stay in "outlets" sub-module
  const handleOutletClick = useCallback((outletId: string) => {
    setActiveOutlet(outletId);
  }, []);

  const handleOutletBack = useCallback(() => {
    setActiveOutlet(null);
  }, []);

  // Render based on view
  if (currentView === "menu") {
    return <MenuBuilderView />;
  }

  if (currentView === "orders") {
    return <OrdersView />;
  }

  // Default: outlets
  return (
    <OutletsView
      activeOutlet={activeOutlet}
      onOutletClick={handleOutletClick}
      onOutletBack={handleOutletBack}
      onSwitchView={switchView}
    />
  );
}

// ═══════════════════════════════════════════════════════════════════════
// OUTLETS & TABLES VIEW
// ═══════════════════════════════════════════════════════════════════════

function OutletsView({
  activeOutlet, onOutletClick, onOutletBack, onSwitchView,
}: {
  activeOutlet: string | null;
  onOutletClick: (id: string) => void;
  onOutletBack: () => void;
  onSwitchView: (view: string) => void;
}) {
  const { refreshTick } = useAppStore();
  const { data: outlets, loading, error, reload } = useApi<any[]>("/api/pos/outlets", [refreshTick]);
  const outletsData = outlets ?? FALLBACK_OUTLETS;

  if (loading) return <div className="grid grid-cols-2 md:grid-cols-4 gap-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32" />)}</div>;

  if (activeOutlet) {
    return <OutletView outletId={activeOutlet} onBack={onOutletBack} />;
  }

  return (
    <div className="space-y-4">
      {/* Header with sub-nav tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-display font-bold text-foreground flex items-center gap-2">
            <UtensilsCrossed className="h-5 w-5 text-[#1B3A6B]" /> Restaurant & POS
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">Manage outlets, take orders, build your menu</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className={cn("h-9", internalViewActive("outlets", "outlets"))}
            onClick={() => onSwitchView("outlets")}
          >
            <LayoutGrid className="h-3.5 w-3.5 mr-1" /> Outlets
          </Button>
          <Button
            variant="outline"
            size="sm"
            className={cn("h-9", internalViewActive("orders", "outlets"))}
            onClick={() => onSwitchView("orders")}
          >
            <ClipboardList className="h-3.5 w-3.5 mr-1" /> Orders
          </Button>
          <Button
            variant="outline"
            size="sm"
            className={cn("h-9", internalViewActive("menu", "outlets"))}
            onClick={() => onSwitchView("menu")}
          >
            <FileText className="h-3.5 w-3.5 mr-1" /> Menu Builder
          </Button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>Could not load live data. Showing sample data instead.</span>
          <button onClick={reload} className="ml-auto text-xs font-medium underline">Retry</button>
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {outletsData.map((o: any) => {
          const Icon = OUTLET_ICONS[o.type] || UtensilsCrossed;
          return (
            <Card key={o.id} className="hover:shadow-card-lg transition-shadow cursor-pointer" onClick={() => onOutletClick(o.id)}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#1B3A6B]/10">
                    <Icon className="h-6 w-6 text-[#1B3A6B]" />
                  </div>
                  <Badge variant="outline" className="text-[10px] capitalize">{o.type.replace("_", " ")}</Badge>
                </div>
                <p className="font-display text-lg font-bold">{o.name}</p>
                <p className="text-xs text-muted-foreground">{o.code} · {o.tableCount} tables</p>
                <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-border">
                  <div>
                    <p className="text-[10px] uppercase text-muted-foreground">Available</p>
                    <p className="font-mono-num font-semibold text-[#16A34A]">{o.tablesAvailable}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase text-muted-foreground">Occupied</p>
                    <p className="font-mono-num font-semibold text-[#0369A1]">{o.tablesOccupied}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase text-muted-foreground">Active</p>
                    <p className="font-mono-num font-semibold">{o.activeOrders}</p>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Revenue today</span>
                  <span className="font-mono-num font-bold text-[#C9952A]">{fmtINR(o.revenueToday)}</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Active orders across all outlets */}
      <ActiveOrdersPanel onSwitchView={onSwitchView} />
    </div>
  );
}

/** Helper for internal tab button styling */
function internalViewActive(view: string, _current: string): string {
  return view === _current ? "bg-[#1B3A6B] text-white hover:bg-[#1B3A6B]/90 border-[#1B3A6B]" : "";
}

// ─── Active Orders Panel (shown on outlets view) ─────────────────

function ActiveOrdersPanel({ onSwitchView }: { onSwitchView: (view: string) => void }) {
  const { refreshTick } = useAppStore();
  const { data: orders, loading } = useApi<any[]>("/api/pos/orders", [refreshTick]);
  if (loading) return null;
  const ordersData = orders ?? FALLBACK_ORDERS;
  const active = ordersData.filter((o: any) => ["draft", "sent_to_kitchen", "in_preparation", "ready", "served", "billed"].includes(o.status)).slice(0, 8);
  if (!active.length) return null;
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-display flex items-center gap-2">
            <ChefHat className="h-4 w-4 text-[#C9952A]" /> Active Orders (Kitchen Display)
          </CardTitle>
          <Button variant="ghost" size="sm" className="h-7 text-xs text-[#1B3A6B]" onClick={() => onSwitchView("orders")}>
            View All Orders <MoveRight className="h-3 w-3 ml-1" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
          {active.map((o: any) => {
            const meta = ORDER_STATUS_FLOW[o.status];
            return (
              <div key={o.id} className="rounded-lg border-2 p-3" style={{ borderColor: meta.color + "40" }}>
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="font-display text-sm font-bold">KOT #{o.kotNumber ?? "—"}</p>
                    <p className="text-[10px] text-muted-foreground">{o.outlet.name} · Table {o.table?.number ?? "—"}</p>
                  </div>
                  <span className="rounded px-1.5 py-0.5 text-[10px] font-bold text-white" style={{ backgroundColor: meta.color }}>{meta.label}</span>
                </div>
                <div className="space-y-1 mb-2">
                  {o.lines.slice(0, 3).map((l: any) => (
                    <div key={l.id} className="flex justify-between text-xs">
                      <span className="font-medium">{l.quantity}× {l.name}</span>
                      <span className="text-muted-foreground">{fmtINR(l.lineTotal)}</span>
                    </div>
                  ))}
                  {o.lines.length > 3 && (
                    <p className="text-[10px] text-muted-foreground">+{o.lines.length - 3} more items</p>
                  )}
                </div>
                <div className="flex justify-between text-xs font-semibold pt-2 border-t border-border">
                  <span>Total</span><span className="font-mono-num">{fmtINR(o.totalAmount)}</span>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Outlet Detail View (ordering interface) ─────────────────────

function OutletView({ outletId, onBack }: { outletId: string; onBack: () => void }) {
  const { refreshTick, triggerRefresh } = useAppStore();
  const { data: menu, loading: menuLoading } = useApi<any>(`/api/pos/outlets/${outletId}/menu`, [refreshTick]);
  const [cart, setCart] = useState<{ itemId: string; name: string; price: number; quantity: number }[]>([]);
  const [tableId, setTableId] = useState<string>("");
  const { data: outlets } = useApi<any[]>("/api/pos/outlets", [refreshTick]);
  const outlet = outlets?.find((o: any) => o.id === outletId);

  const tables: { id: string; number: string; capacity: number; status: string }[] = menu?.tables ?? [];

  const addToCart = (item: any) => {
    setCart((c) => {
      const ex = c.find((x) => x.itemId === item.id);
      if (ex) return c.map((x) => x.itemId === item.id ? { ...x, quantity: x.quantity + 1 } : x);
      return [...c, { itemId: item.id, name: item.name, price: item.price, quantity: 1 }];
    });
  };
  const removeFromCart = (itemId: string) => setCart((c) => c.filter((x) => x.itemId !== itemId));
  const updateQty = (itemId: string, delta: number) => setCart((c) => c.map((x) => x.itemId === itemId ? { ...x, quantity: Math.max(1, x.quantity + delta) } : x));

  const subtotal = cart.reduce((s, x) => s + x.price * x.quantity, 0);
  const tax = Math.round(subtotal * 0.05);
  const total = subtotal + tax;

  const sendToKitchen = async () => {
    if (!cart.length) { toast.error("Cart is empty"); return; }
    try {
      const r = await apiPost("/api/pos/orders", {
        outletId,
        tableId: tableId || undefined,
        lines: cart.map((c) => ({ itemId: c.itemId, quantity: c.quantity })),
        guestsCount: 1,
      });
      toast.success(`Order sent to kitchen · KOT #${r.kotNumber} · ${fmtINR(r.total)}`);
      setCart([]);
      setTableId("");
      triggerRefresh();
    } catch (e: any) { toast.error(e.message); }
  };

  if (menuLoading || !menu) return <Skeleton className="h-96" />;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to outlets
        </Button>
        <div className="text-right">
          <p className="font-display text-lg font-bold">{menu.outlet.name}</p>
          <p className="text-xs text-muted-foreground">{outlet?.tablesAvailable || 0} tables available</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Menu */}
        <div className="lg:col-span-2 space-y-4">
          {menu.categories.map((cat: any) => (
            <Card key={cat.id}>
              <CardHeader className="py-3"><CardTitle className="text-sm font-display">{cat.name}</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {cat.items.map((item: any) => (
                    <button key={item.id} onClick={() => addToCart(item)} className="flex items-center justify-between gap-2 rounded-lg border border-border p-2.5 text-left hover:border-[#C9952A] hover:bg-[#C9952A]/5 transition-colors">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className={cn("h-3 w-3 rounded-sm shrink-0", {
                            "bg-[#16A34A]": item.dietType === "veg",
                            "bg-[#DC2626]": item.dietType === "non_veg",
                            "bg-[#7C3AED]": item.dietType === "vegan",
                            "bg-[#D97706]": item.dietType === "contains_egg" || item.dietType === "contains_alcohol",
                          })} />
                          <p className="text-sm font-medium truncate">{item.name}</p>
                          {item.isFeatured && <Badge className="text-[9px] h-4 px-1 bg-[#C9952A] text-[#1B3A6B]">★</Badge>}
                        </div>
                        <p className="text-[10px] text-muted-foreground line-clamp-1">{item.description}</p>
                      </div>
                      <span className="font-mono-num font-semibold text-sm whitespace-nowrap">{fmtINR(item.price)}</span>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Cart */}
        <Card className="sticky top-20 self-start">
          <CardHeader className="py-3 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-display flex items-center gap-2"><ShoppingBag className="h-4 w-4 text-[#C9952A]" /> Current Order</CardTitle>
            {cart.length > 0 && <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => setCart([])}>Clear</Button>}
          </CardHeader>
          <CardContent className="space-y-2">
            {tables.length > 0 && (
              <div>
                <p className="text-[10px] uppercase text-muted-foreground mb-1">Table (optional)</p>
                <div className="flex flex-wrap gap-1">
                  {tables.map((t) => (
                    <button key={t.id} onClick={() => setTableId(tableId === t.id ? "" : t.id)} disabled={t.status === "occupied"} aria-label={`Select table ${t.number}`} className={cn("rounded border px-2 py-1 text-xs transition-colors", tableId === t.id ? "border-[#C9952A] bg-[#C9952A] text-[#1B3A6B]" : t.status === "occupied" ? "border-border bg-muted/50 text-muted-foreground cursor-not-allowed line-through" : "border-border hover:bg-muted")}>{t.number}</button>
                  ))}
                </div>
              </div>
            )}
            <ScrollArea className="max-h-64">
              {cart.length === 0 ? (
                <p className="text-center text-xs text-muted-foreground py-8">Tap menu items to add</p>
              ) : cart.map((c) => (
                <div key={c.itemId} className="flex items-center gap-2 py-1.5 border-b border-border/60 last:border-0">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium truncate">{c.name}</p>
                    <p className="text-[10px] text-muted-foreground">{fmtINR(c.price)} each</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => updateQty(c.itemId, -1)} className="h-5 w-5 rounded border border-border text-xs">−</button>
                    <span className="w-5 text-center text-xs font-mono-num">{c.quantity}</span>
                    <button onClick={() => updateQty(c.itemId, 1)} className="h-5 w-5 rounded border border-border text-xs">+</button>
                  </div>
                  <span className="w-16 text-right text-xs font-mono-num font-semibold">{fmtINR(c.price * c.quantity)}</span>
                  <button onClick={() => removeFromCart(c.itemId)} className="text-[#DC2626] text-xs">×</button>
                </div>
              ))}
            </ScrollArea>
            {cart.length > 0 && (
              <div className="space-y-1 pt-2 border-t border-border">
                <Row label="Subtotal" value={fmtINR(subtotal)} />
                <Row label="GST 5%" value={fmtINR(tax)} />
                <div className="flex justify-between font-bold pt-1">
                  <span>Total</span><span className="font-mono-num text-[#C9952A]">{fmtINR(total)}</span>
                </div>
                <Button className="w-full mt-2 bg-[#1B3A6B] hover:bg-[#1B3A6B]/90" onClick={sendToKitchen}>
                  <ChefHat className="h-4 w-4 mr-1" /> Send to Kitchen
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between text-xs"><span className="text-muted-foreground">{label}</span><span className="font-mono-num">{value}</span></div>;
}

// ═══════════════════════════════════════════════════════════════════════
// ORDERS VIEW
// ═══════════════════════════════════════════════════════════════════════

function OrdersView() {
  const { refreshTick, triggerRefresh, setActiveSubModule } = useAppStore();
  const { data: orders, loading } = useApi<any[]>("/api/pos/orders", [refreshTick]);
  const ordersData = orders ?? FALLBACK_ORDERS;

  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterOutlet, setFilterOutlet] = useState("all");
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // Filter orders based on tab and search
  const filteredOrders = ordersData.filter((o: any) => {
    // Tab filter
    if (activeTab === "active" && !["draft", "sent_to_kitchen", "in_preparation", "ready", "served", "billed"].includes(o.status)) return false;
    if (activeTab === "completed" && !["paid"].includes(o.status)) return false;
    if (activeTab === "voided" && !["void"].includes(o.status)) return false;

    // Outlet filter
    if (filterOutlet !== "all" && o.outlet?.id !== filterOutlet) return false;

    // Search filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchKot = String(o.kotNumber).includes(q);
      const matchTable = o.table?.number?.toLowerCase().includes(q);
      const matchOutlet = o.outlet?.name?.toLowerCase().includes(q);
      const matchItem = o.lines?.some((l: any) => l.name?.toLowerCase().includes(q));
      if (!matchKot && !matchTable && !matchOutlet && !matchItem) return false;
    }

    return true;
  });

  const handleAdvanceStatus = async (order: any) => {
    const meta = ORDER_STATUS_FLOW[order.status];
    if (!meta?.next) return;
    try {
      await apiPut(`/api/pos/orders/${order.id}`, { status: meta.next });
      toast.success(`KOT #${order.kotNumber} → ${ORDER_STATUS_FLOW[meta.next].label}`);
      triggerRefresh();
    } catch (e: any) {
      toast.error(e.message || "Failed to update order status");
    }
  };

  const handleVoidOrder = async (order: any) => {
    try {
      await apiPut(`/api/pos/orders/${order.id}`, { status: "void" });
      toast.success(`KOT #${order.kotNumber} voided`);
      triggerRefresh();
      setDetailOpen(false);
    } catch (e: any) {
      toast.error(e.message || "Failed to void order");
    }
  };

  const openDetail = (order: any) => {
    setSelectedOrder(order);
    setDetailOpen(true);
  };

  // Stats
  const activeCount = ordersData.filter((o: any) => ["draft", "sent_to_kitchen", "in_preparation", "ready", "served", "billed"].includes(o.status)).length;
  const completedCount = ordersData.filter((o: any) => o.status === "paid").length;
  const voidedCount = ordersData.filter((o: any) => o.status === "void").length;
  const totalRevenue = ordersData.filter((o: any) => ["paid", "billed"].includes(o.status)).reduce((s: number, o: any) => s + o.totalAmount, 0);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-4 gap-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20" />)}</div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with sub-nav */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-display font-bold text-foreground flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-[#1B3A6B]" /> Orders Management
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">Track and manage all orders across outlets</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-9" onClick={() => setActiveSubModule("outlets")}>
            <LayoutGrid className="h-3.5 w-3.5 mr-1" /> Outlets
          </Button>
          <Button variant="default" size="sm" className="h-9 bg-[#1B3A6B] hover:bg-[#1B3A6B]/90">
            <ClipboardList className="h-3.5 w-3.5 mr-1" /> Orders
          </Button>
          <Button variant="outline" size="sm" className="h-9" onClick={() => setActiveSubModule("menu")}>
            <FileText className="h-3.5 w-3.5 mr-1" /> Menu Builder
          </Button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#0284C7]/10">
              <ClipboardList className="h-4 w-4 text-[#0284C7]" />
            </div>
            <div>
              <p className="text-[10px] uppercase text-muted-foreground">Active</p>
              <p className="font-display text-xl font-bold">{activeCount}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#16A34A]/10">
              <CheckCircle2 className="h-4 w-4 text-[#16A34A]" />
            </div>
            <div>
              <p className="text-[10px] uppercase text-muted-foreground">Completed</p>
              <p className="font-display text-xl font-bold">{completedCount}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#DC2626]/10">
              <X className="h-4 w-4 text-[#DC2626]" />
            </div>
            <div>
              <p className="text-[10px] uppercase text-muted-foreground">Voided</p>
              <p className="font-display text-xl font-bold">{voidedCount}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#C9952A]/10">
              <DollarSign className="h-4 w-4 text-[#C9952A]" />
            </div>
            <div>
              <p className="text-[10px] uppercase text-muted-foreground">Revenue</p>
              <p className="font-display text-xl font-bold font-mono-num">{fmtINR(totalRevenue)}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Tabs + Filters */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <TabsList>
            <TabsTrigger value="all">All ({ordersData.length})</TabsTrigger>
            <TabsTrigger value="active">Active ({activeCount})</TabsTrigger>
            <TabsTrigger value="completed">Completed ({completedCount})</TabsTrigger>
            <TabsTrigger value="voided">Voided ({voidedCount})</TabsTrigger>
          </TabsList>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search KOT, table, item..."
                className="pl-8 h-9 w-56"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={filterOutlet} onValueChange={setFilterOutlet}>
              <SelectTrigger className="h-9 w-40">
                <SelectValue placeholder="All Outlets" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Outlets</SelectItem>
                {FALLBACK_OUTLETS.map((o) => (
                  <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Tab content — all share the same grid, just different filters */}
        {["all", "active", "completed", "voided"].map((tab) => (
          <TabsContent key={tab} value={tab}>
            {filteredOrders.length === 0 ? (
              <Card className="p-8">
                <div className="text-center text-muted-foreground">
                  <ClipboardList className="h-10 w-10 mx-auto mb-2 opacity-30" />
                  <p className="font-medium">No orders found</p>
                  <p className="text-xs mt-1">Try adjusting your filters or search</p>
                </div>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3">
                {filteredOrders.map((o: any) => (
                  <OrderCard
                    key={o.id}
                    order={o}
                    onAdvance={handleAdvanceStatus}
                    onVoid={handleVoidOrder}
                    onClick={() => openDetail(o)}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>

      {/* Order Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-lg">
          {selectedOrder && (
            <>
              <DialogHeader>
                <DialogTitle className="font-display flex items-center gap-2">
                  Order KOT #{selectedOrder.kotNumber}
                  <span
                    className="rounded px-2 py-0.5 text-xs font-bold text-white"
                    style={{ backgroundColor: ORDER_STATUS_FLOW[selectedOrder.status]?.color ?? "#64748B" }}
                  >
                    {ORDER_STATUS_FLOW[selectedOrder.status]?.label ?? selectedOrder.status}
                  </span>
                </DialogTitle>
                <DialogDescription>
                  {selectedOrder.outlet?.name} · Table {selectedOrder.table?.number ?? "—"} · {fmtDateTime(selectedOrder.createdAt)}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                {/* Items */}
                <div>
                  <p className="text-xs font-semibold uppercase text-muted-foreground mb-2">Items</p>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Item</TableHead>
                        <TableHead className="text-xs text-center">Qty</TableHead>
                        <TableHead className="text-xs text-right">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedOrder.lines?.map((l: any) => (
                        <TableRow key={l.id}>
                          <TableCell className="text-sm font-medium">{l.name}</TableCell>
                          <TableCell className="text-sm text-center">{l.quantity}</TableCell>
                          <TableCell className="text-sm text-right font-mono-num">{fmtINR(l.lineTotal)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Totals */}
                <div className="space-y-1 pt-2 border-t">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="font-mono-num">{fmtINR(selectedOrder.totalAmount / 1.05)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">GST 5%</span>
                    <span className="font-mono-num">{fmtINR(Math.round(selectedOrder.totalAmount - selectedOrder.totalAmount / 1.05))}</span>
                  </div>
                  <div className="flex justify-between font-bold text-base pt-1">
                    <span>Total</span>
                    <span className="font-mono-num text-[#C9952A]">{fmtINR(selectedOrder.totalAmount)}</span>
                  </div>
                </div>

                {/* Time elapsed */}
                {["draft", "sent_to_kitchen", "in_preparation", "ready", "served"].includes(selectedOrder.status) && (
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Time elapsed:</span>
                    <ElapsedTime startTime={selectedOrder.createdAt} />
                  </div>
                )}
              </div>
              <DialogFooter className="flex gap-2">
                {ORDER_STATUS_FLOW[selectedOrder.status]?.next && (
                  <Button
                    className="bg-[#1B3A6B] hover:bg-[#1B3A6B]/90"
                    onClick={() => { handleAdvanceStatus(selectedOrder); setDetailOpen(false); }}
                  >
                    <MoveRight className="h-4 w-4 mr-1" />
                    Mark as {ORDER_STATUS_FLOW[ORDER_STATUS_FLOW[selectedOrder.status].next!]?.label}
                  </Button>
                )}
                {["draft", "sent_to_kitchen", "in_preparation"].includes(selectedOrder.status) && (
                  <Button variant="destructive" onClick={() => handleVoidOrder(selectedOrder)}>
                    <X className="h-4 w-4 mr-1" /> Void Order
                  </Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Order Card Component ────────────────────────────────────────

function OrderCard({
  order, onAdvance, onVoid, onClick,
}: {
  order: any;
  onAdvance: (o: any) => void;
  onVoid: (o: any) => void;
  onClick: () => void;
}) {
  const meta = ORDER_STATUS_FLOW[order.status] ?? ORDER_STATUS_FLOW.draft;
  const isActive = ["draft", "sent_to_kitchen", "in_preparation", "ready", "served", "billed"].includes(order.status);
  const nextMeta = meta.next ? ORDER_STATUS_FLOW[meta.next] : null;

  return (
    <Card
      className="hover:shadow-card-lg transition-shadow cursor-pointer"
      onClick={onClick}
    >
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="font-display text-sm font-bold">KOT #{order.kotNumber ?? "—"}</p>
            <p className="text-[10px] text-muted-foreground">
              {order.outlet?.name} · Table {order.table?.number ?? "—"}
            </p>
          </div>
          <span className="rounded px-1.5 py-0.5 text-[10px] font-bold text-white whitespace-nowrap" style={{ backgroundColor: meta.color }}>
            {meta.label}
          </span>
        </div>

        {/* Items preview */}
        <div className="space-y-1 mb-3">
          {order.lines.slice(0, 3).map((l: any) => (
            <div key={l.id} className="flex justify-between text-xs">
              <span className="font-medium truncate mr-2">{l.quantity}× {l.name}</span>
              <span className="text-muted-foreground whitespace-nowrap">{fmtINR(l.lineTotal)}</span>
            </div>
          ))}
          {order.lines.length > 3 && (
            <p className="text-[10px] text-muted-foreground">+{order.lines.length - 3} more</p>
          )}
        </div>

        {/* Total + time */}
        <div className="flex items-center justify-between pt-2 border-t border-border">
          <div className="flex items-center gap-3">
            <span className="font-mono-num font-bold text-sm">{fmtINR(order.totalAmount)}</span>
            {isActive && order.createdAt && <ElapsedTime startTime={order.createdAt} />}
          </div>
          <span className="text-[10px] text-muted-foreground">{timeAgo(order.createdAt)}</span>
        </div>

        {/* Action buttons */}
        {isActive && meta.next && (
          <div className="flex gap-2 mt-3 pt-2 border-t border-border/60" onClick={(e) => e.stopPropagation()}>
            <Button
              size="sm"
              className="h-7 text-[11px] bg-[#1B3A6B] hover:bg-[#1B3A6B]/90 flex-1"
              onClick={() => onAdvance(order)}
            >
              → {nextMeta?.label}
            </Button>
            {["draft", "sent_to_kitchen", "in_preparation"].includes(order.status) && (
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-[11px] text-[#DC2626] border-[#DC2626]/30 hover:bg-[#DC2626]/10"
                onClick={() => onVoid(order)}
              >
                Void
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// MENU BUILDER VIEW
// ═══════════════════════════════════════════════════════════════════════

function MenuBuilderView() {
  const { setActiveSubModule, triggerRefresh } = useAppStore();
  const [categories, setCategories] = useState<MenuCategory[]>(INITIAL_MENU_CATEGORIES);
  const [showPreview, setShowPreview] = useState(false);
  const [editItem, setEditItem] = useState<MenuItem | null>(null);
  const [editItemOpen, setEditItemOpen] = useState(false);
  const [addCategoryOpen, setAddCategoryOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ type: "category" | "item"; id: string } | null>(null);

  // Fetch outlets to determine the default outlet for menu operations
  const { data: outlets } = useApi<any[]>("/api/pos/outlets", []);
  const defaultOutletId = outlets?.[0]?.id ?? "";

  // New item form state
  const [itemForm, setItemForm] = useState({
    name: "",
    description: "",
    price: 0,
    dietType: "veg",
    categoryId: "",
    isFeatured: false,
    isAvailable: true,
  });

  // Toggle category expand
  const toggleCategory = (catId: string) => {
    setCategories((prev) =>
      prev.map((c) => c.id === catId ? { ...c, isExpanded: !c.isExpanded } : c)
    );
  };

  // Add new category
  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) { toast.error("Category name is required"); return; }

    // Optimistic local update
    const newCat: MenuCategory = {
      id: `cat-${Date.now()}`,
      name: newCategoryName.trim(),
      icon: Tag,
      isExpanded: true,
      items: [],
    };
    setCategories((prev) => [...prev, newCat]);
    setNewCategoryName("");
    setAddCategoryOpen(false);

    // Persist to API
    try {
      const result = await apiPost("/api/pos/menu/categories", {
        outletId: defaultOutletId,
        name: newCat.name,
      });
      // Replace the temp ID with the real DB ID
      setCategories((prev) =>
        prev.map((c) => c.id === newCat.id ? { ...c, id: result.id } : c)
      );
      toast.success(`Category "${newCat.name}" added`);
      triggerRefresh();
    } catch (e: any) {
      toast.error(e.message || "Failed to create category");
      // Revert on failure
      setCategories((prev) => prev.filter((c) => c.id !== newCat.id));
    }
  };

  // Delete category
  const handleDeleteCategory = async (catId: string) => {
    const catToDelete = categories.find((c) => c.id === catId);

    // Optimistic local update
    setCategories((prev) => prev.filter((c) => c.id !== catId));
    setDeleteConfirmOpen(false);
    setDeleteTarget(null);

    // Persist to API
    try {
      await apiDelete(`/api/pos/menu/categories/${catId}`);
      toast.success("Category deleted");
      triggerRefresh();
    } catch (e: any) {
      toast.error(e.message || "Failed to delete category");
      // Revert on failure
      if (catToDelete) {
        setCategories((prev) => [...prev, catToDelete]);
      }
    }
  };

  // Open add item form
  const openAddItem = (categoryId: string) => {
    setEditItem(null);
    setItemForm({
      name: "",
      description: "",
      price: 0,
      dietType: "veg",
      categoryId,
      isFeatured: false,
      isAvailable: true,
    });
    setEditItemOpen(true);
  };

  // Open edit item form
  const openEditItem = (item: MenuItem) => {
    setEditItem(item);
    setItemForm({
      name: item.name,
      description: item.description,
      price: item.price,
      dietType: item.dietType,
      categoryId: item.categoryId,
      isFeatured: item.isFeatured,
      isAvailable: item.isAvailable,
    });
    setEditItemOpen(true);
  };

  // Save item (add or edit)
  const handleSaveItem = async () => {
    if (!itemForm.name.trim()) { toast.error("Item name is required"); return; }
    if (itemForm.price <= 0) { toast.error("Price must be greater than 0"); return; }

    if (editItem) {
      // Edit existing — optimistic local update
      setCategories((prev) =>
        prev.map((cat) => ({
          ...cat,
          items: cat.items.map((it) =>
            it.id === editItem.id
              ? {
                  ...it,
                  name: itemForm.name.trim(),
                  description: itemForm.description.trim(),
                  price: itemForm.price,
                  dietType: itemForm.dietType,
                  categoryId: itemForm.categoryId,
                  isFeatured: itemForm.isFeatured,
                  isAvailable: itemForm.isAvailable,
                }
              : it
          ),
        }))
      );
      // Handle category move
      if (itemForm.categoryId !== editItem.categoryId) {
        setCategories((prev) => {
          const movedItem = prev.flatMap((c) => c.items).find((i) => i.id === editItem.id);
          if (!movedItem) return prev;
          const updatedItem = { ...movedItem, categoryId: itemForm.categoryId };
          return prev.map((cat) => {
            if (cat.id === editItem.categoryId) {
              return { ...cat, items: cat.items.filter((i) => i.id !== editItem.id) };
            }
            if (cat.id === itemForm.categoryId) {
              return { ...cat, items: [...cat.items, updatedItem] };
            }
            return cat;
          });
        });
      }

      // Persist edit to API
      try {
        await apiPut(`/api/pos/menu/items/${editItem.id}`, {
          name: itemForm.name.trim(),
          description: itemForm.description.trim(),
          price: itemForm.price,
          dietType: itemForm.dietType,
          categoryId: itemForm.categoryId,
          isFeatured: itemForm.isFeatured,
          isAvailable: itemForm.isAvailable,
        });
        toast.success(`"${itemForm.name}" updated`);
        triggerRefresh();
      } catch (e: any) {
        toast.error(e.message || "Failed to update item");
      }
    } else {
      // Add new — optimistic local update
      const newItem: MenuItem = {
        id: `mi-${Date.now()}`,
        name: itemForm.name.trim(),
        description: itemForm.description.trim(),
        price: itemForm.price,
        dietType: itemForm.dietType,
        categoryId: itemForm.categoryId,
        isFeatured: itemForm.isFeatured,
        isAvailable: itemForm.isAvailable,
        sortOrder: 999,
      };
      setCategories((prev) =>
        prev.map((cat) =>
          cat.id === itemForm.categoryId
            ? { ...cat, items: [...cat.items, newItem] }
            : cat
        )
      );

      // Persist new item to API
      try {
        const result = await apiPost("/api/pos/menu/items", {
          categoryId: itemForm.categoryId,
          name: itemForm.name.trim(),
          description: itemForm.description.trim(),
          price: itemForm.price,
          dietType: itemForm.dietType,
          isFeatured: itemForm.isFeatured,
          isAvailable: itemForm.isAvailable,
        });
        // Replace the temp ID with the real DB ID
        setCategories((prev) =>
          prev.map((cat) =>
            cat.id === itemForm.categoryId
              ? { ...cat, items: cat.items.map((it) => it.id === newItem.id ? { ...it, id: result.id } : it) }
              : cat
          )
        );
        toast.success(`"${itemForm.name}" added`);
        triggerRefresh();
      } catch (e: any) {
        toast.error(e.message || "Failed to create item");
        // Revert on failure
        setCategories((prev) =>
          prev.map((cat) =>
            cat.id === itemForm.categoryId
              ? { ...cat, items: cat.items.filter((it) => it.id !== newItem.id) }
              : cat
          )
        );
      }
    }

    setEditItemOpen(false);
    setEditItem(null);
  };

  // Delete item
  const handleDeleteItem = async (itemId: string) => {
    // Find the item being deleted for potential revert
    const itemToDelete = categories.flatMap((c) => c.items).find((i) => i.id === itemId);
    const parentCatId = categories.find((c) => c.items.some((i) => i.id === itemId))?.id;

    // Optimistic local update
    setCategories((prev) =>
      prev.map((cat) => ({
        ...cat,
        items: cat.items.filter((i) => i.id !== itemId),
      }))
    );
    setDeleteConfirmOpen(false);
    setDeleteTarget(null);

    // Persist to API
    try {
      await apiDelete(`/api/pos/menu/items/${itemId}`);
      toast.success("Item deleted");
      triggerRefresh();
    } catch (e: any) {
      toast.error(e.message || "Failed to delete item");
      // Revert on failure
      if (itemToDelete && parentCatId) {
        setCategories((prev) =>
          prev.map((cat) =>
            cat.id === parentCatId
              ? { ...cat, items: [...cat.items, itemToDelete] }
              : cat
          )
        );
      }
    }
  };

  // Move item up/down within category
  const moveItem = (catId: string, itemId: string, direction: "up" | "down") => {
    setCategories((prev) =>
      prev.map((cat) => {
        if (cat.id !== catId) return cat;
        const items = [...cat.items];
        const idx = items.findIndex((i) => i.id === itemId);
        if (idx < 0) return cat;
        if (direction === "up" && idx === 0) return cat;
        if (direction === "down" && idx === items.length - 1) return cat;
        const swapIdx = direction === "up" ? idx - 1 : idx + 1;
        [items[idx], items[swapIdx]] = [items[swapIdx], items[idx]];
        return { ...cat, items: items.map((it, i) => ({ ...it, sortOrder: i })) };
      })
    );
  };

  // Toggle featured
  const toggleFeatured = (itemId: string) => {
    setCategories((prev) =>
      prev.map((cat) => ({
        ...cat,
        items: cat.items.map((it) =>
          it.id === itemId ? { ...it, isFeatured: !it.isFeatured } : it
        ),
      }))
    );
  };

  // Toggle availability
  const toggleAvailability = (itemId: string) => {
    setCategories((prev) =>
      prev.map((cat) => ({
        ...cat,
        items: cat.items.map((it) =>
          it.id === itemId ? { ...it, isAvailable: !it.isAvailable } : it
        ),
      }))
    );
  };

  // Total items
  const totalItems = categories.reduce((s, c) => s + c.items.length, 0);
  const availableItems = categories.reduce((s, c) => s + c.items.filter((i) => i.isAvailable).length, 0);
  const featuredItems = categories.reduce((s, c) => s + c.items.filter((i) => i.isFeatured).length, 0);

  return (
    <div className="space-y-4">
      {/* Header with sub-nav */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-display font-bold text-foreground flex items-center gap-2">
            <FileText className="h-5 w-5 text-[#1B3A6B]" /> Menu Builder
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">Manage categories, items, pricing & availability</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-9" onClick={() => setActiveSubModule("outlets")}>
            <LayoutGrid className="h-3.5 w-3.5 mr-1" /> Outlets
          </Button>
          <Button variant="outline" size="sm" className="h-9" onClick={() => setActiveSubModule("orders")}>
            <ClipboardList className="h-3.5 w-3.5 mr-1" /> Orders
          </Button>
          <Button variant="default" size="sm" className="h-9 bg-[#1B3A6B] hover:bg-[#1B3A6B]/90">
            <FileText className="h-3.5 w-3.5 mr-1" /> Menu Builder
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#1B3A6B]/10">
              <Tag className="h-4 w-4 text-[#1B3A6B]" />
            </div>
            <div>
              <p className="text-[10px] uppercase text-muted-foreground">Categories</p>
              <p className="font-display text-xl font-bold">{categories.length}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#0284C7]/10">
              <UtensilsCrossed className="h-4 w-4 text-[#0284C7]" />
            </div>
            <div>
              <p className="text-[10px] uppercase text-muted-foreground">Total Items</p>
              <p className="font-display text-xl font-bold">{totalItems}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#16A34A]/10">
              <CheckCircle2 className="h-4 w-4 text-[#16A34A]" />
            </div>
            <div>
              <p className="text-[10px] uppercase text-muted-foreground">Available</p>
              <p className="font-display text-xl font-bold">{availableItems}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#C9952A]/10">
              <Star className="h-4 w-4 text-[#C9952A]" />
            </div>
            <div>
              <p className="text-[10px] uppercase text-muted-foreground">Featured</p>
              <p className="font-display text-xl font-bold">{featuredItems}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Actions bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Dialog open={addCategoryOpen} onOpenChange={setAddCategoryOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="h-9 bg-[#1B3A6B] hover:bg-[#1B3A6B]/90">
                <Plus className="h-4 w-4 mr-1" /> Add Category
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="font-display">Add Menu Category</DialogTitle>
                <DialogDescription>Create a new category to organize your menu items</DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <Label htmlFor="catName">Category Name</Label>
                <Input
                  id="catName"
                  placeholder="e.g. Soups, Grills, Cocktails..."
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  className="mt-1.5"
                  onKeyDown={(e) => { if (e.key === "Enter") handleAddCategory(); }}
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setAddCategoryOpen(false)}>Cancel</Button>
                <Button className="bg-[#1B3A6B] hover:bg-[#1B3A6B]/90" onClick={handleAddCategory}>Add Category</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="h-9"
          onClick={() => setShowPreview(!showPreview)}
        >
          <Eye className="h-3.5 w-3.5 mr-1" /> {showPreview ? "Editor" : "Preview Menu"}
        </Button>
      </div>

      {/* Main content */}
      {showPreview ? (
        <MenuPreview categories={categories} />
      ) : (
        <div className="space-y-3">
          {categories.map((cat) => (
            <Card key={cat.id}>
              <CardHeader className="py-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 cursor-pointer flex-1" onClick={() => toggleCategory(cat.id)}>
                    <cat.icon className="h-4 w-4 text-[#C9952A]" />
                    <CardTitle className="text-sm font-display">{cat.name}</CardTitle>
                    <Badge variant="outline" className="text-[10px]">{cat.items.length} items</Badge>
                    <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", cat.isExpanded && "rotate-180")} />
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs"
                      onClick={() => openAddItem(cat.id)}
                    >
                      <Plus className="h-3 w-3 mr-1" /> Add Item
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs text-[#DC2626] hover:text-[#DC2626] hover:bg-[#DC2626]/10"
                      onClick={() => {
                        setDeleteTarget({ type: "category", id: cat.id });
                        setDeleteConfirmOpen(true);
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              {cat.isExpanded && (
                <CardContent className="pt-0">
                  {cat.items.length === 0 ? (
                    <div className="text-center py-6 text-muted-foreground">
                      <UtensilsCrossed className="h-8 w-8 mx-auto mb-2 opacity-30" />
                      <p className="text-xs">No items in this category yet</p>
                      <Button size="sm" variant="outline" className="mt-2 h-7 text-xs" onClick={() => openAddItem(cat.id)}>
                        <Plus className="h-3 w-3 mr-1" /> Add First Item
                      </Button>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-10"></TableHead>
                          <TableHead className="text-xs">Item</TableHead>
                          <TableHead className="text-xs">Diet</TableHead>
                          <TableHead className="text-xs text-right">Price</TableHead>
                          <TableHead className="text-xs text-center">Featured</TableHead>
                          <TableHead className="text-xs text-center">Available</TableHead>
                          <TableHead className="text-xs text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {cat.items.map((item, idx) => (
                          <TableRow key={item.id} className={cn(!item.isAvailable && "opacity-50")}>
                            <TableCell>
                              <div className="flex flex-col gap-0.5">
                                <button
                                  className="p-0.5 hover:bg-muted rounded disabled:opacity-30"
                                  disabled={idx === 0}
                                  onClick={() => moveItem(cat.id, item.id, "up")}
                                  aria-label="Move up"
                                >
                                  <ChevronUp className="h-3 w-3" />
                                </button>
                                <button
                                  className="p-0.5 hover:bg-muted rounded disabled:opacity-30"
                                  disabled={idx === cat.items.length - 1}
                                  onClick={() => moveItem(cat.id, item.id, "down")}
                                  aria-label="Move down"
                                >
                                  <ChevronDown className="h-3 w-3" />
                                </button>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div>
                                <p className="text-sm font-medium">{item.name}</p>
                                <p className="text-[10px] text-muted-foreground line-clamp-1">{item.description}</p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <DietIndicator type={item.dietType} />
                            </TableCell>
                            <TableCell className="text-right font-mono-num font-semibold text-sm">
                              {fmtINR(item.price)}
                            </TableCell>
                            <TableCell className="text-center">
                              <button
                                onClick={() => toggleFeatured(item.id)}
                                className={cn(
                                  "inline-flex items-center justify-center rounded p-1 transition-colors",
                                  item.isFeatured ? "text-[#C9952A] hover:bg-[#C9952A]/10" : "text-muted-foreground/40 hover:bg-muted"
                                )}
                                aria-label={item.isFeatured ? "Unfeature" : "Feature"}
                              >
                                <Star className={cn("h-4 w-4", item.isFeatured && "fill-[#C9952A]")} />
                              </button>
                            </TableCell>
                            <TableCell className="text-center">
                              <Switch
                                checked={item.isAvailable}
                                onCheckedChange={() => toggleAvailability(item.id)}
                                aria-label="Toggle availability"
                              />
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                                  onClick={() => openEditItem(item)}
                                  aria-label="Edit item"
                                >
                                  <Edit3 className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  className="p-1 rounded hover:bg-[#DC2626]/10 text-muted-foreground hover:text-[#DC2626] transition-colors"
                                  onClick={() => {
                                    setDeleteTarget({ type: "item", id: item.id });
                                    setDeleteConfirmOpen(true);
                                  }}
                                  aria-label="Delete item"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Add/Edit Item Dialog */}
      <Dialog open={editItemOpen} onOpenChange={setEditItemOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">
              {editItem ? "Edit Menu Item" : "Add Menu Item"}
            </DialogTitle>
            <DialogDescription>
              {editItem ? "Update item details" : "Add a new item to the menu"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label htmlFor="itemName">Item Name</Label>
              <Input
                id="itemName"
                placeholder="e.g. Butter Chicken"
                value={itemForm.name}
                onChange={(e) => setItemForm((f) => ({ ...f, name: e.target.value }))}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="itemDesc">Description</Label>
              <Textarea
                id="itemDesc"
                placeholder="Brief description of the dish..."
                value={itemForm.description}
                onChange={(e) => setItemForm((f) => ({ ...f, description: e.target.value }))}
                className="mt-1.5"
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="itemPrice">Price (₹)</Label>
                <Input
                  id="itemPrice"
                  type="number"
                  min={0}
                  value={itemForm.price || ""}
                  onChange={(e) => setItemForm((f) => ({ ...f, price: parseFloat(e.target.value) || 0 }))}
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="itemDiet">Diet Type</Label>
                <Select value={itemForm.dietType} onValueChange={(v) => setItemForm((f) => ({ ...f, dietType: v }))}>
                  <SelectTrigger className="mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="veg">Vegetarian</SelectItem>
                    <SelectItem value="non_veg">Non-Veg</SelectItem>
                    <SelectItem value="vegan">Vegan</SelectItem>
                    <SelectItem value="contains_egg">Contains Egg</SelectItem>
                    <SelectItem value="contains_alcohol">Contains Alcohol</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="itemCat">Category</Label>
              <Select value={itemForm.categoryId} onValueChange={(v) => setItemForm((f) => ({ ...f, categoryId: v }))}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Switch
                  id="itemFeatured"
                  checked={itemForm.isFeatured}
                  onCheckedChange={(v) => setItemForm((f) => ({ ...f, isFeatured: v }))}
                />
                <Label htmlFor="itemFeatured" className="text-sm">Featured</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="itemAvailable"
                  checked={itemForm.isAvailable}
                  onCheckedChange={(v) => setItemForm((f) => ({ ...f, isAvailable: v }))}
                />
                <Label htmlFor="itemAvailable" className="text-sm">Available</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditItemOpen(false)}>Cancel</Button>
            <Button className="bg-[#1B3A6B] hover:bg-[#1B3A6B]/90" onClick={handleSaveItem}>
              {editItem ? "Save Changes" : "Add Item"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display">Confirm Delete</DialogTitle>
            <DialogDescription>
              {deleteTarget?.type === "category"
                ? "This will delete the category and all its items. This action cannot be undone."
                : "This will remove this item from the menu. This action cannot be undone."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => { setDeleteConfirmOpen(false); setDeleteTarget(null); }}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (deleteTarget?.type === "category") {
                  handleDeleteCategory(deleteTarget.id);
                } else if (deleteTarget?.type === "item") {
                  handleDeleteItem(deleteTarget.id);
                }
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Menu Preview Component ──────────────────────────────────────

function MenuPreview({ categories }: { categories: MenuCategory[] }) {
  const availableCats = categories.filter((c) => c.items.some((i) => i.isAvailable));

  return (
    <Card className="overflow-hidden">
      {/* Menu Header */}
      <div className="bg-[#1B3A6B] text-white px-6 py-8 text-center">
        <p className="text-[10px] uppercase tracking-[0.3em] text-[#C9952A] mb-1">The Aurelian Grand</p>
        <h2 className="font-display text-2xl font-bold">Our Menu</h2>
        <Separator className="mx-auto mt-3 w-24 bg-[#C9952A]/50" />
      </div>
      <CardContent className="p-6 space-y-8">
        {availableCats.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <UtensilsCrossed className="h-10 w-10 mx-auto mb-2 opacity-30" />
            <p className="font-medium">No available items to preview</p>
          </div>
        ) : (
          availableCats.map((cat) => (
            <div key={cat.id}>
              <div className="flex items-center gap-2 mb-4">
                <cat.icon className="h-4 w-4 text-[#C9952A]" />
                <h3 className="font-display text-lg font-bold text-[#1B3A6B]">{cat.name}</h3>
                <div className="flex-1 border-b border-dashed border-border ml-2" />
              </div>
              <div className="space-y-3">
                {cat.items.filter((i) => i.isAvailable).map((item) => (
                  <div key={item.id} className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <DietIndicator type={item.dietType} />
                        <span className="font-medium text-sm">{item.name}</span>
                        {item.isFeatured && <Star className="h-3 w-3 text-[#C9952A] fill-[#C9952A]" />}
                      </div>
                      {item.description && (
                        <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{item.description}</p>
                      )}
                    </div>
                    <span className="font-mono-num font-semibold text-sm whitespace-nowrap text-[#1B3A6B]">{fmtINR(item.price)}</span>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
        <div className="text-center pt-4 border-t">
          <p className="text-[10px] text-muted-foreground">
            <span className="inline-flex items-center gap-1 mr-3">
              <span className="h-2 w-2 rounded-sm bg-[#16A34A]" /> Vegetarian
            </span>
            <span className="inline-flex items-center gap-1 mr-3">
              <span className="h-2 w-2 rounded-sm bg-[#DC2626]" /> Non-Veg
            </span>
            <span className="inline-flex items-center gap-1 mr-3">
              <span className="h-2 w-2 rounded-sm bg-[#7C3AED]" /> Vegan
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="h-2 w-2 rounded-sm bg-[#D97706]" /> Egg / Alcohol
            </span>
            </p>
          <p className="text-[10px] text-muted-foreground mt-1">5% GST applicable on all items</p>
        </div>
      </CardContent>
    </Card>
  );
}
