// Folios & Billing module
"use client";

import { useState } from "react";
import { useApi, apiPost } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Receipt, CreditCard, Banknote, Plus, Printer } from "lucide-react";
import { fmtINR, fmtDateTime, ResStatusBadge } from "../shared";
import { cn } from "@/lib/utils";

const PAYMENT_METHODS = [
  { value: "cash", label: "Cash", icon: Banknote },
  { value: "credit_card", label: "Credit Card", icon: CreditCard },
  { value: "debit_card", label: "Debit Card", icon: CreditCard },
  { value: "upi", label: "UPI", icon: CreditCard },
  { value: "bank_transfer", label: "Bank Transfer", icon: Banknote },
];

export function FoliosModule() {
  const { refreshTick } = useAppStore();
  const [tab, setTab] = useState("open");
  const [payFolio, setPayFolio] = useState<any>(null);
  const [chargeFolio, setChargeFolio] = useState<any>(null);
  const { data, loading, reload } = useApi<any[]>(`/api/folios?status=${tab === "all" ? "" : tab}`, [tab, refreshTick]);

  return (
    <div className="space-y-4">
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="open">Open Folios</TabsTrigger>
          <TabsTrigger value="closed">Closed Folios</TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>
      </Tabs>

      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-48" />)}</div>
      ) : !data?.length ? (
        <p className="text-center text-sm text-muted-foreground py-12">No folios found</p>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {data.map((f: any) => (
            <Card key={f.id} className={cn(f.status === "open" && "role-bar-gold")}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-mono-num font-bold text-navy">{f.folioNumber}</p>
                    <p className="text-sm font-semibold">{f.reservation.guest.name}</p>
                    <p className="text-xs text-muted-foreground">{f.reservation.confirmationNumber} · {f.reservation.room ? `Room ${f.reservation.room.number}` : "No room"}</p>
                  </div>
                  <div className="text-right">
                    <Badge variant={f.status === "open" ? "default" : "secondary"} className="text-[10px] capitalize">{f.status}</Badge>
                    <p className="font-display text-xl font-bold mt-1">{fmtINR(f.totalAmount)}</p>
                    {f.balance > 0 && <p className="text-[10px] text-[#DC2626] font-semibold">Balance: {fmtINR(f.balance)}</p>}
                  </div>
                </div>

                {/* Lines */}
                <div className="rounded-lg border border-border max-h-32 overflow-y-auto">
                  <table className="w-full text-xs">
                    <tbody className="divide-y divide-border">
                      {f.lines.slice(0, 6).map((l: any) => (
                        <tr key={l.id} className={cn(l.isVoided && "opacity-40 line-through")}>
                          <td className="px-2 py-1">
                            <p className="font-medium">{l.description}</p>
                            <p className="text-[9px] text-muted-foreground">{l.departmentCode} · {fmtDateTime(l.postedAt)}</p>
                          </td>
                          <td className="px-2 py-1 text-right font-mono-num">
                            {l.transactionType === "payment" ? "" : l.amount > 0 ? "+" : ""}{fmtINR(l.amount)}
                          </td>
                        </tr>
                      ))}
                      {f.lines.length > 6 && <tr><td colSpan={2} className="px-2 py-1 text-center text-[10px] text-muted-foreground">+{f.lines.length - 6} more lines</td></tr>}
                    </tbody>
                  </table>
                </div>

                {/* Totals */}
                <div className="grid grid-cols-4 gap-2 mt-3 text-xs">
                  <Tot label="Subtotal" value={fmtINR(f.subtotal)} />
                  <Tot label="Tax" value={fmtINR(f.taxAmount)} />
                  <Tot label="Paid" value={fmtINR(f.paidAmount)} />
                  <Tot label="Balance" value={fmtINR(f.balance)} highlight={f.balance > 0} />
                </div>

                {f.status === "open" && (
                  <div className="flex gap-2 mt-3">
                    <Button size="sm" variant="outline" className="flex-1 h-8 text-xs" onClick={() => setChargeFolio(f)}>
                      <Plus className="h-3 w-3 mr-1" /> Add Charge
                    </Button>
                    {f.balance > 0 && (
                      <Button size="sm" className="flex-1 h-8 text-xs bg-[#16A34A] hover:bg-[#15803D]" onClick={() => setPayFolio(f)}>
                        <CreditCard className="h-3 w-3 mr-1" /> Take Payment
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" className="h-8 text-xs" title="Print invoice">
                      <Printer className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {payFolio && <PaymentDialog folio={payFolio} onClose={() => setPayFolio(null)} onDone={() => { setPayFolio(null); reload(); }} />}
      {chargeFolio && <ChargeDialog folio={chargeFolio} onClose={() => setChargeFolio(null)} onDone={() => { setChargeFolio(null); reload(); }} />}
    </div>
  );
}

function Tot({ label, value, highlight }: any) {
  return (
    <div className={cn("rounded p-1.5 text-center", highlight ? "bg-[#DC2626]/10" : "bg-muted/40")}>
      <p className="text-[9px] uppercase text-muted-foreground">{label}</p>
      <p className={cn("font-mono-num font-semibold", highlight && "text-[#DC2626]")}>{value}</p>
    </div>
  );
}

function PaymentDialog({ folio, onClose, onDone }: any) {
  const { triggerRefresh } = useAppStore();
  const [amount, setAmount] = useState(folio.balance);
  const [method, setMethod] = useState("cash");
  const [cardLast4, setCardLast4] = useState("");
  const [cardType, setCardType] = useState("Visa");

  const submit = async () => {
    try {
      await apiPost(`/api/folios/${folio.id}/payments`, {
        amount: Number(amount), paymentMethod: method,
        cardLast4: method !== "cash" ? cardLast4 : undefined,
        cardType: method !== "cash" ? cardType : undefined,
      });
      toast.success(`Payment of ${fmtINR(Number(amount))} recorded`);
      triggerRefresh();
      onDone();
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">Take Payment · {folio.folioNumber}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="rounded-lg bg-muted/40 p-3 text-center">
            <p className="text-[10px] uppercase text-muted-foreground">Outstanding Balance</p>
            <p className="font-display text-3xl font-bold text-[#DC2626]">{fmtINR(folio.balance)}</p>
          </div>
          <div>
            <Label>Amount</Label>
            <Input type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value))} />
          </div>
          <div>
            <Label>Payment method</Label>
            <div className="grid grid-cols-5 gap-1">
              {PAYMENT_METHODS.map((m) => {
                const Icon = m.icon;
                return (
                  <button key={m.value} onClick={() => setMethod(m.value)} className={cn("flex flex-col items-center gap-1 rounded-lg border p-2 text-[10px]", method === m.value ? "border-gold bg-gold/10 text-navy" : "border-border")}>
                    <Icon className="h-4 w-4" /> {m.label.split(" ")[0]}
                  </button>
                );
              })}
            </div>
          </div>
          {method !== "cash" && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Card type</Label>
                <Select value={cardType} onValueChange={setCardType}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Visa">Visa</SelectItem>
                    <SelectItem value="Mastercard">Mastercard</SelectItem>
                    <SelectItem value="Amex">Amex</SelectItem>
                    <SelectItem value="RuPay">RuPay</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Last 4 digits</Label>
                <Input value={cardLast4} onChange={(e) => setCardLast4(e.target.value.slice(0, 4))} placeholder="1234" maxLength={4} />
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} className="bg-[#16A34A] hover:bg-[#15803D]">Record Payment</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ChargeDialog({ folio, onClose, onDone }: any) {
  const { triggerRefresh } = useAppStore();
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [department, setDepartment] = useState("MISC");

  const submit = async () => {
    if (!description || !amount) { toast.error("Description and amount required"); return; }
    try {
      await apiPost("/api/folios", { folioId: folio.id, description, amount: Number(amount), departmentCode: department });
      toast.success("Charge posted to folio");
      triggerRefresh();
      onDone();
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">Post Charge · {folio.folioNumber}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Department</Label>
            <Select value={department} onValueChange={setDepartment}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="MISC">Miscellaneous</SelectItem>
                <SelectItem value="FB">Food & Beverage</SelectItem>
                <SelectItem value="MINIBAR">Minibar</SelectItem>
                <SelectItem value="LAUNDRY">Laundry</SelectItem>
                <SelectItem value="SPA">Spa</SelectItem>
                <SelectItem value="ROOM">Room</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Description</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g. Spa massage — 60 min" />
          </div>
          <div>
            <Label>Amount (₹)</Label>
            <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="1500" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} className="bg-navy hover:bg-navy-light">Post Charge</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
