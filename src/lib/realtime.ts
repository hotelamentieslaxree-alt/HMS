// ARIA HMS — Socket.io client hook
"use client";

import { useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { useAppStore } from "@/lib/store";

let socket: Socket | null = null;

export function getSocket(): Socket | null {
  return socket;
}

export function useRealtime(propertyId?: string) {
  const pushToast = useAppStore((s) => s.pushToast);
  const triggerRefresh = useAppStore((s) => s.triggerRefresh);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    // Connect via the Caddy gateway using XTransformPort query param.
    socket = io("/?XTransformPort=3003", {
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionDelay: 1500,
    });

    socket.on("connect", () => {
      console.log("[realtime] connected", socket?.id);
    });

    const events: Record<string, { title: string; refresh: boolean; type: "info" | "success" | "warning" | "error" }> = {
      "room.status.updated": { title: "Room status updated", refresh: true, type: "info" },
      "reservation.checked_in": { title: "Guest checked in", refresh: true, type: "success" },
      "reservation.checked_out": { title: "Guest checked out", refresh: true, type: "info" },
      "hk.task.completed": { title: "Housekeeping task done", refresh: true, type: "success" },
      "pos.order.status_changed": { title: "POS order updated", refresh: false, type: "info" },
      "maintenance.ticket.created": { title: "Maintenance ticket raised", refresh: false, type: "warning" },
      "alert.guest.complaint": { title: "Guest complaint", refresh: false, type: "error" },
      "notification.system": { title: "Notification", refresh: true, type: "info" },
    };

    for (const [event, meta] of Object.entries(events)) {
      socket.on(event, (payload: any) => {
        pushToast(event, payload);
        if (meta.refresh) triggerRefresh();
      });
    }

    return () => {
      // keep socket across remounts
    };
  }, [pushToast, triggerRefresh]);

  useEffect(() => {
    if (socket && socket.connected && propertyId) {
      socket.emit("subscribe", { propertyId });
    } else if (socket) {
      socket.once("connect", () => {
        if (propertyId) socket!.emit("subscribe", { propertyId });
      });
    }
  }, [propertyId]);
}
