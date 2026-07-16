// F&B POS module
"use client";

import { useState } from "react";
import { useApi, apiPost, apiPut } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { UtensilsCrossed, Wine, Coffee, ShoppingBag, Plus, ChefHat, CheckCircle2, DollarSign, Clock, AlertTriangle } from "lucide-react";
import { fmtINR } from "../shared";
import { cn } from "@/lib/utils";

// ─── Fallback data when API fails ────────────────────────────────
const FALLBACK_OUTLETS = [
  { id: "outlet-1", name: "Spice Garden", code: "SG", type: "restaurant", tableCount: 12, tablesAvailable: 5, tablesOccupied: 7, activeOrders: 4, revenueToday: 42500 },
  { id: "outlet-2", name: "The Royal Bar", code: "RB", type: "bar", tableCount: 8, tablesAvailable: 3, tablesOccupied: 5, activeOrders: 3, revenueToday: 28700 },
  { id: "outlet-3", name: "Café Aroma", code: "CA", type: "cafe", tableCount: 6, tablesAvailable: 4, tablesOccupied: 2, activeOrders: 1, revenueToday: 8900 },
  { id: "outlet-4", name: "Room Service", code: "RS", type: "room_service", tableCount: 0, tablesAvailable: 0, tablesOccupied: 0, activeOrders: 6, revenueToday: 31200 },
];

const FALLBACK_ORDERS = [
  { id: "ord-1", kotNumber: 1042, status: "in_preparation", totalAmount: 1850, outlet: { name: "Spice Garden" }, table: { number: "5" }, lines: [{ id: "l1", name: "Butter Chicken", quantity: 1, lineTotal: 650 }, { id: "l2", name: "Garlic Naan", quantity: 4, lineTotal: 400 }, { id: "l3", name: "Dal Makhani", quantity: 1, lineTotal: 450 }, { id: "l4", name: "Jeera Rice", quantity: 1, lineTotal: 350 }] },
  { id: "ord-2", kotNumber: 1043, status: "sent_to_kitchen", totalAmount: 2400, outlet: { name: "The Royal Bar" }, table: { number: "3" }, lines: [{ id: "l5", name: "Old Monk & Coke", quantity: 2, lineTotal: 800 }, { id: "l6", name: "Paneer Tikka", quantity: 1, lineTotal: 650 }, { id: "l7", name: "Chicken Seekh Kebab", quantity: 1, lineTotal: 950 }] },
  { id: "ord-3", kotNumber: 1044, status: "ready", totalAmount: 950, outlet: { name: "Café Aroma" }, table: { number: "2" }, lines: [{ id: "l8", name: "Cappuccino", quantity: 2, lineTotal: 500 }, { id: "l9", name: "Blueberry Cheesecake", quantity: 1, lineTotal: 450 }] },
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

export function PosModule() {
  const { refreshTick, triggerRefresh } = useAppStore();
  const [activeOutlet, setActiveOutlet] = useState<string | null>(null);
  const { data: outlets, loading, error, reload } = useApi<any[]>("/api/pos/outlets", [refreshTick]);
  const outletsData = outlets ?? FALLBACK_OUTLETS;

  if (loading) return <div className="grid grid-cols-2 md:grid-cols-4 gap-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32" />)}</div>;

  if (activeOutlet) {
    return <OutletView outletId={activeOutlet} onBack={() => setActiveOutlet(null)} />;
  }

  return (
    <div className="space-y-4">
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
            <Card key={o.id} className="hover:shadow-card-lg transition-shadow cursor-pointer" onClick={() => setActiveOutlet(o.id)}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-navy/10">
                    <Icon className="h-6 w-6 text-navy" />
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
                  <span className="font-mono-num font-bold text-gold">{fmtINR(o.revenueToday)}</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Active orders across all outlets */}
      <ActiveOrdersPanel />
    </div>
  );
}

function ActiveOrdersPanel() {
  const { refreshTick } = useAppStore();
  const { data: orders, loading } = useApi<any[]>("/api/pos/orders", [refreshTick]);
  if (loading) return null;
  const ordersData = orders ?? FALLBACK_ORDERS;
  const active = ordersData.filter((o: any) => ["draft","sent_to_kitchen","in_preparation","ready","served","billed"].includes(o.status)).slice(0, 12);
  if (!active.length) return null;
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-base font-display flex items-center gap-2"><ChefHat className="h-4 w-4 text-gold" /> Active Orders (Kitchen Display)</CardTitle></CardHeader>
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
                  {o.lines.map((l: any) => (
                    <div key={l.id} className="flex justify-between text-xs">
                      <span className="font-medium">{l.quantity}× {l.name}</span>
                      <span className="text-muted-foreground">{fmtINR(l.lineTotal)}</span>
                    </div>
                  ))}
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

function OutletView({ outletId, onBack }: { outletId: string; onBack: () => void }) {
  const { refreshTick, triggerRefresh } = useAppStore();
  const { data: menu, loading: menuLoading } = useApi<any>(`/api/pos/outlets/${outletId}/menu`, [refreshTick]);
  const [cart, setCart] = useState<{ itemId: string; name: string; price: number; quantity: number }[]>([]);
  const [tableId, setTableId] = useState<string>("");
  const { data: outlets } = useApi<any[]>("/api/pos/outlets", [refreshTick]);
  const outlet = outlets?.find((o: any) => o.id === outletId);

  // H2 fix: tables come from the menu endpoint with real IDs; the UI sends
  // actual table.id values instead of synthetic "T1" strings that violate
  // the RestaurantTable FK constraint.
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
      // C2 fix: r.kotNumber, not r.data.kotNumber.
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
        <Button variant="ghost" size="sm" onClick={onBack}>← Back to outlets</Button>
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
                    <button key={item.id} onClick={() => addToCart(item)} className="flex items-center justify-between gap-2 rounded-lg border border-border p-2.5 text-left hover:border-gold hover:bg-gold/5 transition-colors">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className={cn("h-3 w-3 rounded-sm shrink-0", {
                            "bg-[#16A34A]": item.dietType === "veg",
                            "bg-[#DC2626]": item.dietType === "non_veg",
                            "bg-[#7C3AED]": item.dietType === "vegan",
                            "bg-[#D97706]": item.dietType === "contains_egg" || item.dietType === "contains_alcohol",
                          })} />
                          <p className="text-sm font-medium truncate">{item.name}</p>
                          {item.isFeatured && <Badge className="text-[9px] h-4 px-1 bg-gold text-navy">★</Badge>}
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
            <CardTitle className="text-sm font-display flex items-center gap-2"><ShoppingBag className="h-4 w-4 text-gold" /> Current Order</CardTitle>
            {cart.length > 0 && <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => setCart([])}>Clear</Button>}
          </CardHeader>
          <CardContent className="space-y-2">
            {tables.length > 0 && (
              <div>
                <p className="text-[10px] uppercase text-muted-foreground mb-1">Table (optional)</p>
                <div className="flex flex-wrap gap-1">
                  {tables.map((t) => (
                    <button key={t.id} onClick={() => setTableId(tableId === t.id ? "" : t.id)} disabled={t.status === "occupied"} aria-label={`Select table ${t.number}`} className={cn("rounded border px-2 py-1 text-xs transition-colors", tableId === t.id ? "border-gold bg-gold text-navy" : t.status === "occupied" ? "border-border bg-muted/50 text-muted-foreground cursor-not-allowed line-through" : "border-border hover:bg-muted")}>{t.number}</button>
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
                  <span>Total</span><span className="font-mono-num text-gold">{fmtINR(total)}</span>
                </div>
                <Button className="w-full mt-2 bg-navy hover:bg-navy-light" onClick={sendToKitchen}>
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
