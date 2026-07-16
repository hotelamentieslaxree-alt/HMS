// Guests module — CRM
"use client";

import { useState } from "react";
import { useApi } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search, Users, Mail, Phone, Star, Crown, MapPin, CreditCard, AlertTriangle } from "lucide-react";
import { VipBadge, fmtINR, fmtDate } from "../shared";
import { cn } from "@/lib/utils";

const TIER_META: Record<string, { color: string; icon: any }> = {
  platinum: { color: "#7C3AED", icon: Crown },
  gold: { color: "#C9952A", icon: Crown },
  silver: { color: "#94A3B8", icon: Star },
  none: { color: "#64748B", icon: Star },
};

// ─── Fallback guests when API fails ──────────────────────────────
const FALLBACK_GUESTS = [
  {
    id: "g1",
    title: "Mr.",
    firstName: "Rajesh",
    lastName: "Kumar",
    fullName: "Rajesh Kumar",
    email: "rajesh.kumar@email.com",
    phone: "+91-98765-43210",
    vipStatus: true,
    loyaltyTier: "platinum",
    totalStays: 24,
    totalRevenue: 485000,
    loyaltyPoints: 48500,
    nationality: "Indian",
    idType: "Aadhaar",
    preferences: { roomType: "Deluxe King", floor: "High floor" },
    stayHistory: [
      { id: "sh1", confirmationNumber: "ARI-2024-0089", checkIn: "2024-12-15", checkOut: "2024-12-18", roomNumber: "301", total: 22500, status: "checked_out" },
    ],
  },
  {
    id: "g2",
    title: "Ms.",
    firstName: "Priya",
    lastName: "Sharma",
    fullName: "Priya Sharma",
    email: "priya.sharma@email.com",
    phone: "+91-87654-32109",
    vipStatus: false,
    loyaltyTier: "gold",
    totalStays: 12,
    totalRevenue: 285000,
    loyaltyPoints: 28500,
    nationality: "Indian",
    idType: "Passport",
    preferences: { bedType: "Twin" },
    stayHistory: [],
  },
  {
    id: "g3",
    title: "Dr.",
    firstName: "Anil",
    lastName: "Mehta",
    fullName: "Anil Mehta",
    email: "anil.mehta@email.com",
    phone: "+91-76543-21098",
    vipStatus: true,
    loyaltyTier: "platinum",
    totalStays: 36,
    totalRevenue: 1250000,
    loyaltyPoints: 125000,
    nationality: "Indian",
    idType: "Passport",
    preferences: { roomType: "Suite", dietary: "Vegetarian" },
    stayHistory: [],
  },
  {
    id: "g4",
    title: "Mr.",
    firstName: "John",
    lastName: "Smith",
    fullName: "John Smith",
    email: "john.smith@email.com",
    phone: "+1-555-0123",
    vipStatus: false,
    loyaltyTier: "silver",
    totalStays: 3,
    totalRevenue: 62000,
    loyaltyPoints: 6200,
    nationality: "American",
    idType: "Passport",
    preferences: {},
    stayHistory: [],
  },
  {
    id: "g5",
    title: "Ms.",
    firstName: "Sneha",
    lastName: "Patel",
    fullName: "Sneha Patel",
    email: "sneha.patel@email.com",
    phone: "+91-65432-10987",
    vipStatus: false,
    loyaltyTier: "none",
    totalStays: 1,
    totalRevenue: 22000,
    loyaltyPoints: 2200,
    nationality: "Indian",
    idType: "Aadhaar",
    preferences: {},
    stayHistory: [],
  },
];

export function GuestsModule() {
  const [search, setSearch] = useState("");
  const [vipOnly, setVipOnly] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const { data: rawData, loading, error, reload } = useApi<any[]>(`/api/guests?search=${encodeURIComponent(search)}&vip=${vipOnly}&limit=60`, [search, vipOnly]);
  const data = rawData?.length ? rawData : FALLBACK_GUESTS;

  return (
    <div className="space-y-4">
      {/* API error banner */}
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-300">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>Could not load live data. Showing sample data instead.</span>
          <button onClick={reload} className="ml-auto text-xs font-medium underline hover:no-underline">Retry</button>
        </div>
      )}
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 flex-1 min-w-56">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search guests by name, email, phone…" className="w-full bg-transparent text-sm outline-none" />
        </div>
        <Button variant={vipOnly ? "default" : "outline"} onClick={() => setVipOnly(!vipOnly)} className={cn(vipOnly && "bg-gold text-navy hover:bg-gold-light")}>
          <Crown className="h-4 w-4 mr-1" /> VIP only
        </Button>
      </div>

      {/* Grid of guest cards */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-36" />)}</div>
      ) : !data?.length ? (
        <p className="text-center text-sm text-muted-foreground py-12">No guests found</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {data.map((g: any) => {
            const tier = TIER_META[g.loyaltyTier] || TIER_META.none;
            const TierIcon = tier.icon;
            return (
              <Card key={g.id} className="hover:shadow-card-lg transition-shadow cursor-pointer role-bar-staff" onClick={() => setSelected(g.id)}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white" style={{ backgroundColor: tier.color }}>
                      {g.firstName[0]}{g.lastName[0]}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="font-semibold truncate">{g.title} {g.fullName}</p>
                        {g.vipStatus && <VipBadge vip />}
                      </div>
                      <p className="text-xs text-muted-foreground truncate flex items-center gap-1"><Mail className="h-3 w-3" />{g.email || "—"}</p>
                      <p className="text-xs text-muted-foreground truncate flex items-center gap-1"><Phone className="h-3 w-3" />{g.phone || "—"}</p>
                    </div>
                    <div className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-bold" style={{ backgroundColor: tier.color + "20", color: tier.color }}>
                      <TierIcon className="h-3 w-3" /> {g.loyaltyTier?.toUpperCase()}
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-border">
                    <Stat label="Stays" value={g.totalStays} />
                    <Stat label="Revenue" value={fmtINR(g.totalRevenue)} />
                    <Stat label="Points" value={g.loyaltyPoints.toLocaleString("en-IN")} />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {selected && <GuestDetailDialog id={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: any }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="text-sm font-mono-num font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function GuestDetailDialog({ id, onClose }: { id: string; onClose: () => void }) {
  const { data, loading } = useApi<any>(`/api/guests/${id}`, []);
  if (loading || !data) return <Dialog open onOpenChange={onClose}><DialogContent><Skeleton className="h-64" /></DialogContent></Dialog>;
  const tier = TIER_META[data.loyaltyTier] || TIER_META.none;
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            {data.title} {data.firstName} {data.lastName}
            {data.vipStatus && <VipBadge vip />}
            <span className="rounded px-1.5 py-0.5 text-[10px] font-bold" style={{ backgroundColor: tier.color + "20", color: tier.color }}>{data.loyaltyTier?.toUpperCase()}</span>
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Info icon={Mail} label="Email" value={data.email} />
            <Info icon={Phone} label="Phone" value={data.phone} />
            <Info icon={MapPin} label="Nationality" value={data.nationality} />
            <Info icon={CreditCard} label="ID Type" value={data.idType || "—"} />
          </div>
          {data.preferences && Object.keys(data.preferences).length > 0 && (
            <div className="rounded-lg border border-border p-3">
              <p className="text-xs font-semibold mb-2">Preferences</p>
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(data.preferences).map(([k, v]: any) => (
                  <Badge key={k} variant="secondary" className="text-[10px] capitalize">{k}: {v}</Badge>
                ))}
              </div>
            </div>
          )}
          <div className="grid grid-cols-3 gap-2">
            <Stat label="Total Stays" value={data.totalStays} />
            <Stat label="Total Revenue" value={fmtINR(data.totalRevenue)} />
            <Stat label="Loyalty Points" value={data.loyaltyPoints.toLocaleString("en-IN")} />
          </div>
          {data.stayHistory?.length > 0 && (
            <div>
              <p className="text-xs font-semibold mb-2">Stay History ({data.stayHistory.length})</p>
              <div className="max-h-48 overflow-y-auto rounded-lg border border-border">
                <table className="w-full text-xs">
                  <thead className="bg-muted/40 text-[10px] uppercase text-muted-foreground">
                    <tr>
                      <th className="px-3 py-1.5 text-left">Conf #</th>
                      <th className="px-3 py-1.5 text-left">Dates</th>
                      <th className="px-3 py-1.5 text-left">Room</th>
                      <th className="px-3 py-1.5 text-right">Total</th>
                      <th className="px-3 py-1.5">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {data.stayHistory.map((s: any) => (
                      <tr key={s.id}>
                        <td className="px-3 py-1.5 font-mono-num text-navy">{s.confirmationNumber}</td>
                        <td className="px-3 py-1.5">{fmtDate(s.checkIn)} → {fmtDate(s.checkOut)}</td>
                        <td className="px-3 py-1.5">{s.roomNumber || "—"}</td>
                        <td className="px-3 py-1.5 text-right font-mono-num">{s.total ? fmtINR(s.total) : "—"}</td>
                        <td className="px-3 py-1.5"><Badge variant="outline" className="text-[9px]">{s.status}</Badge></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Info({ icon: Icon, label, value }: any) {
  return (
    <div className="rounded-lg border border-border p-2">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1"><Icon className="h-3 w-3" /> {label}</p>
      <p className="text-sm font-medium truncate">{value || "—"}</p>
    </div>
  );
}
