// Real-time toast overlay
"use client";

import { useAppStore } from "@/lib/store";
import { useRealtime } from "@/lib/realtime";
import { useEffect } from "react";
import { Bell, X, CheckCircle2, AlertTriangle, Info, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const EVENT_LABELS: Record<string, { icon: any; color: string }> = {
  "room.status.updated": { icon: Info, color: "text-[#0284C7]" },
  "reservation.checked_in": { icon: CheckCircle2, color: "text-[#16A34A]" },
  "reservation.checked_out": { icon: Info, color: "text-[#0284C7]" },
  "hk.task.completed": { icon: CheckCircle2, color: "text-[#16A34A]" },
  "pos.order.status_changed": { icon: Bell, color: "text-gold" },
  "maintenance.ticket.created": { icon: AlertTriangle, color: "text-[#D97706]" },
  "alert.guest.complaint": { icon: XCircle, color: "text-[#DC2626]" },
  "notification.system": { icon: Bell, color: "text-gold" },
};

export function RealtimeToasts({ propertyId }: { propertyId?: string }) {
  useRealtime(propertyId);
  const { toasts, dismissToast } = useAppStore();

  // auto-dismiss after 5s
  useEffect(() => {
    if (!toasts.length) return;
    const t = setTimeout(() => dismissToast(toasts[0].id), 5000);
    return () => clearTimeout(t);
  }, [toasts, dismissToast]);

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 w-80 max-w-[calc(100vw-2rem)]">
      {toasts.map((t) => {
        const meta = EVENT_LABELS[t.event] ?? EVENT_LABELS["notification.system"];
        const Icon = meta.icon;
        const p = t.payload || {};
        const title = p.title ?? (t.event.split(".").pop() || "").replace(/_/g, " ");
        const message = p.message ?? (p.guestName ? `${p.guestName} · Room ${p.roomNumber ?? ""}` : t.event);
        return (
          <div key={t.id} className="flex items-start gap-3 rounded-xl border border-border bg-card p-3 shadow-card-lg animate-in slide-in-from-right">
            <Icon className={cn("h-5 w-5 shrink-0 mt-0.5", meta.color)} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground capitalize">{title}</p>
              <p className="text-xs text-muted-foreground line-clamp-2">{message}</p>
            </div>
            <button onClick={() => dismissToast(t.id)} className="text-muted-foreground hover:text-foreground">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
