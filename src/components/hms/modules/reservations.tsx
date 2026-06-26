// Reservations module
"use client";

import { useState } from "react";
import { useApi, apiPost } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import { ResStatusBadge, SOURCE_META, VipBadge, fmtINR, fmtDate } from "../shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Search, Plus, LogIn, LogOut, Ban, Calendar, Users, BedDouble, Phone } from "lucide-react";

export function ReservationsModule() {
  const { refreshTick, triggerRefresh } = useAppStore();
  const [view, setView] = useState("all");
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const { data, loading, reload } = useApi<any[]>(`/api/reservations?view=${view}&search=${encodeURIComponent(search)}`, [view, search, refreshTick]);

  const checkIn = async (id: string) => {
    try {
      const r = await apiPost(`/api/reservations/${id}/check-in`);
      toast.success(`Checked in · Room ${r.data.roomNumber}`);
      triggerRefresh();
      reload();
    } catch (e: any) { toast.error(e.message); }
  };
  const checkOut = async (id: string) => {
    try {
      const r = await apiPost(`/api/reservations/${id}/check-out`);
      toast.success(`Checked out · Total ${fmtINR(r.data.folioTotal)}`);
      triggerRefresh();
      reload();
    } catch (e: any) { toast.error(e.message); }
  };
  const cancel = async (id: string) => {
    if (!confirm("Cancel this reservation?")) return;
    try {
      await apiPost(`/api/reservations/${id}/cancel`, { reason: "Cancelled by user" });
      toast.success("Reservation cancelled");
      triggerRefresh();
      reload();
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs value={view} onValueChange={setView}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="arrivals">Arrivals</TabsTrigger>
            <TabsTrigger value="departures">Departures</TabsTrigger>
            <TabsTrigger value="inhouse">In-House</TabsTrigger>
          </TabsList>
        </Tabs>
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
          <Button onClick={() => setShowCreate(true)} className="bg-navy hover:bg-navy-light">
            <Plus className="h-4 w-4 mr-1" /> New Reservation
          </Button>
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-4 space-y-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
          ) : !data?.length ? (
            <p className="text-center text-sm text-muted-foreground py-12">No reservations found</p>
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
                  {data.map((r: any) => (
                    <tr key={r.id} className="hover:bg-muted/30">
                      <td className="px-4 py-2.5">
                        <p className="font-mono-num font-semibold text-navy">{r.confirmationNumber}</p>
                        <p className="text-[10px] text-muted-foreground">{r.totalNights}N · {r.adults}A {r.children ? `· ${r.children}C` : ""}</p>
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-1.5">
                          <span className="font-medium">{r.guest.firstName} {r.guest.lastName}</span>
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
                          <><p className="font-mono-num font-semibold">{r.room.number}</p><p className="text-[10px] text-muted-foreground">{r.category.name}</p></>
                        ) : (
                          <><p className="text-xs text-muted-foreground">Not assigned</p><p className="text-[10px] text-muted-foreground">{r.category.name}</p></>
                        )}
                      </td>
                      <td className="px-4 py-2.5"><Badge variant="outline" className="text-[10px]">{SOURCE_META[r.bookingSource]}</Badge></td>
                      <td className="px-4 py-2.5 text-right">
                        <p className="font-mono-num font-semibold">{fmtINR(r.ratePerNight)}</p>
                        <p className="text-[10px] text-muted-foreground">/night</p>
                      </td>
                      <td className="px-4 py-2.5"><ResStatusBadge status={r.status} /></td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center justify-end gap-1">
                          {(r.status === "confirmed" || r.status === "tentative") && (
                            <Button size="sm" variant="outline" className="h-7 px-2 text-xs border-[#16A34A] text-[#16A34A] hover:bg-[#16A34A] hover:text-white" onClick={() => checkIn(r.id)}>
                              <LogIn className="h-3 w-3 mr-1" /> Check-in
                            </Button>
                          )}
                          {r.status === "checked_in" && (
                            <Button size="sm" variant="outline" className="h-7 px-2 text-xs border-[#D97706] text-[#D97706] hover:bg-[#D97706] hover:text-white" onClick={() => checkOut(r.id)}>
                              <LogOut className="h-3 w-3 mr-1" /> Check-out
                            </Button>
                          )}
                          {(r.status === "confirmed" || r.status === "tentative") && (
                            <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-[#DC2626]" onClick={() => cancel(r.id)}>
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

      {showCreate && <CreateReservationDialog onClose={() => setShowCreate(false)} onCreated={() => { setShowCreate(false); triggerRefresh(); reload(); }} />}
    </div>
  );
}

function CreateReservationDialog({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [step, setStep] = useState(1);
  const [guests, setGuests] = useState<any[]>([]);
  const [guestSearch, setGuestSearch] = useState("");
  const [selectedGuest, setSelectedGuest] = useState<any>(null);
  const { data: guestsData } = useApi<any[]>(`/api/guests?search=${encodeURIComponent(guestSearch)}`, [guestSearch]);
  const { data: roomsData } = useApi<any>(`/api/rooms`, []);
  const [form, setForm] = useState({
    categoryId: "", ratePlanId: "", checkInDate: "", checkOutDate: "",
    adults: 2, children: 0, bookingSource: "direct", specialRequests: "",
  });

  const categories = roomsData?.rooms ? Array.from(new Map(roomsData.rooms.map((r: any) => [r.category.id, r.category])).values()) : [];

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
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-display">New Reservation</DialogTitle>
        </DialogHeader>
        <div className="flex items-center gap-2 mb-4">
          {[1, 2, 3].map((s) => (
            <div key={s} className={`h-1.5 flex-1 rounded-full ${step >= s ? "bg-gold" : "bg-border"}`} />
          ))}
        </div>
        {step === 1 && (
          <div className="space-y-3">
            <Label>Search guest (existing or create new)</Label>
            <Input value={guestSearch} onChange={(e) => setGuestSearch(e.target.value)} placeholder="Type name, email or phone…" />
            <div className="max-h-48 overflow-y-auto rounded-lg border border-border">
              {guestsData?.slice(0, 8).map((g: any) => (
                <button key={g.id} onClick={() => { setSelectedGuest(g); setStep(2); }} className="flex w-full items-center gap-3 px-3 py-2 hover:bg-muted text-left border-b border-border/60 last:border-0">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-navy/10 text-xs font-bold text-navy">
                    {g.firstName[0]}{g.lastName[0]}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{g.fullName} {g.vipStatus && <VipBadge vip />}</p>
                    <p className="text-[10px] text-muted-foreground">{g.email} · {g.phone} · {g.loyaltyTier}</p>
                  </div>
                </button>
              ))}
              {!guestsData?.length && guestSearch && <p className="px-3 py-4 text-sm text-muted-foreground text-center">No match — guest will be created</p>}
            </div>
            {selectedGuest && (
              <div className="rounded-lg border border-gold/40 bg-gold/5 p-3">
                <p className="text-sm font-semibold">{selectedGuest.fullName}</p>
                <p className="text-xs text-muted-foreground">{selectedGuest.email} · {selectedGuest.phone}</p>
              </div>
            )}
          </div>
        )}
        {step === 2 && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Check-in date *</Label>
              <Input type="date" value={form.checkInDate} onChange={(e) => setForm({ ...form, checkInDate: e.target.value })} />
            </div>
            <div>
              <Label>Check-out date *</Label>
              <Input type="date" value={form.checkOutDate} onChange={(e) => setForm({ ...form, checkOutDate: e.target.value })} />
            </div>
            <div>
              <Label>Room category *</Label>
              <Select value={form.categoryId} onValueChange={(v) => setForm({ ...form, categoryId: v })}>
                <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  {categories.map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>{c.name} · {fmtINR(c.baseRate)}/night</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Booking source</Label>
              <Select value={form.bookingSource} onValueChange={(v) => setForm({ ...form, bookingSource: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(SOURCE_META).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Adults</Label>
              <Input type="number" min={1} value={form.adults} onChange={(e) => setForm({ ...form, adults: Number(e.target.value) })} />
            </div>
            <div>
              <Label>Children</Label>
              <Input type="number" min={0} value={form.children} onChange={(e) => setForm({ ...form, children: Number(e.target.value) })} />
            </div>
            <div className="col-span-2">
              <Label>Special requests</Label>
              <Input value={form.specialRequests} onChange={(e) => setForm({ ...form, specialRequests: e.target.value })} placeholder="High floor, late check-in, anniversary…" />
            </div>
          </div>
        )}
        {step === 3 && (
          <div className="space-y-2 text-sm">
            <Row icon={Users} label="Guest" value={selectedGuest?.fullName} />
            <Row icon={Calendar} label="Dates" value={`${form.checkInDate} → ${form.checkOutDate}`} />
            <Row icon={BedDouble} label="Category" value={categories.find((c: any) => c.id === form.categoryId)?.name ?? "—"} />
            <Row icon={Phone} label="Source" value={SOURCE_META[form.bookingSource]} />
            <Row icon={Users} label="Guests" value={`${form.adults} adults · ${form.children} children`} />
          </div>
        )}
        <DialogFooter>
          {step > 1 && <Button variant="outline" onClick={() => setStep(step - 1)}>Back</Button>}
          {step === 2 && <Button disabled={!form.categoryId || !form.checkInDate || !form.checkOutDate} onClick={() => setStep(3)}>Review</Button>}
          {step < 2 && <Button disabled={!selectedGuest} onClick={() => setStep(2)}>Continue</Button>}
          {step === 3 && <Button onClick={submit} className="bg-navy hover:bg-navy-light">Confirm Reservation</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Row({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border px-3 py-2">
      <Icon className="h-4 w-4 text-muted-foreground" />
      <span className="text-xs text-muted-foreground w-20">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
