// Night Audit module
"use client";

import { useState } from "react";
import { useApi, apiPost } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { MoonStar, Play, CheckCircle2, AlertTriangle, FileText, ArrowRight, Clock } from "lucide-react";
import { fmtINR, fmtDate, fmtDateTime } from "../shared";
import { cn } from "@/lib/utils";

const AUDIT_STEPS = [
  { label: "Post room charges to in-house folios", icon: FileText },
  { label: "Mark no-shows & apply cancellation charges", icon: AlertTriangle },
  { label: "Confirm tentative reservations for tomorrow", icon: CheckCircle2 },
  { label: "Roll business date forward", icon: ArrowRight },
  { label: "Generate Night Audit report", icon: FileText },
  { label: "Email report to GM & Owner", icon: FileText },
  { label: "Backup financial snapshot", icon: CheckCircle2 },
];

export function NightAuditModule() {
  const { refreshTick, triggerRefresh } = useAppStore();
  const { data, loading, reload } = useApi<any>("/api/night-audit", [refreshTick]);
  const [running, setRunning] = useState(false);

  if (loading || !data) return <Skeleton className="h-96" />;

  const run = async () => {
    if (!confirm("Run night audit? This will post charges, mark no-shows, and roll the business date forward. This action is recorded in the audit log.")) return;
    setRunning(true);
    try {
      const r = await apiPost("/api/night-audit");
      toast.success(`Night audit completed · ${r.data.summary.postingsCount} postings · ${fmtINR(r.data.summary.revenuePosted)}`);
      triggerRefresh();
      reload();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setRunning(false);
    }
  };

  const p = data.preview;

  return (
    <div className="space-y-4">
      {/* Current business date banner */}
      <Card className="border-navy/20 bg-gradient-to-r from-navy to-[#2E5FA3] text-white">
        <CardContent className="p-5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gold text-navy shadow-glow-gold">
              <MoonStar className="h-7 w-7" />
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-widest text-gold/90">Current Business Date</p>
              <p className="font-display text-2xl font-bold">{fmtDate(data.businessDate)}</p>
              <p className="text-xs text-white/70">{data.audits.length} audits completed</p>
            </div>
          </div>
          <Button onClick={run} disabled={running} size="lg" className="bg-gold text-navy hover:bg-gold-light font-semibold text-base h-12 px-6">
            {running ? <><Clock className="h-5 w-5 mr-2 animate-spin" /> Running audit…</> : <><Play className="h-5 w-5 mr-2" /> Run Night Audit</>}
          </Button>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Pre-audit preview */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2"><CardTitle className="text-base font-display">Pre-Audit Preview</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              <Preview label="In-house folios" value={p.foliosToPostCount} hint="Room charges to post" />
              <Preview label="Expected revenue" value={fmtINR(p.estimatedRevenue)} hint="From room postings" />
              <Preview label="Tentative → Confirmed" value={p.tentativeConfirming} hint="Tomorrow arrivals" />
              <Preview label="Potential no-shows" value={p.expectedNoShows} hint="Marked automatically" color="#DC2626" />
            </div>
            <p className="text-xs font-semibold mb-2">Audit sequence (atomic transaction):</p>
            <div className="space-y-2">
              {AUDIT_STEPS.map((s, i) => {
                const Icon = s.icon;
                return (
                  <div key={i} className="flex items-center gap-3 rounded-lg border border-border px-3 py-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-navy/10 text-navy text-xs font-bold">{i + 1}</div>
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{s.label}</span>
                  </div>
                );
              })}
            </div>
            <div className="mt-3 rounded-lg bg-[#DC2626]/5 border border-[#DC2626]/30 p-3 text-xs">
              <p className="font-semibold text-[#DC2626] flex items-center gap-1"><AlertTriangle className="h-3.5 w-3.5" /> If any step fails, the entire transaction rolls back. GM is alerted via push notification.</p>
            </div>
          </CardContent>
        </Card>

        {/* Audit history */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base font-display">Audit History</CardTitle></CardHeader>
          <CardContent>
            <div className="max-h-96 overflow-y-auto space-y-2 -mx-1 px-1">
              {data.audits.map((a: any) => (
                <div key={a.id} className="rounded-lg border border-border p-3">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-semibold">{fmtDate(a.businessDate)}</p>
                    <Badge variant={a.status === "completed" ? "default" : a.status === "failed" ? "destructive" : "secondary"} className="text-[10px] capitalize">{a.status}</Badge>
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{a.postingsCount} postings</span>
                    <span className="font-mono-num">{fmtINR(a.revenuePosted)}</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">{a.completedAt ? fmtDateTime(a.completedAt) : "In progress"}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Preview({ label, value, hint, color }: any) {
  return (
    <div className={cn("rounded-xl border p-3", color ? "border-[#DC2626]/30 bg-[#DC2626]/5" : "border-border")}>
      <p className="text-[10px] uppercase text-muted-foreground">{label}</p>
      <p className="font-display text-xl font-bold" style={color ? { color } : {}}>{value}</p>
      <p className="text-[10px] text-muted-foreground">{hint}</p>
    </div>
  );
}
