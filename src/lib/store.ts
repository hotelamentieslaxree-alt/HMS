// ARIA HMS — Zustand global store
"use client";

import { create } from "zustand";

export type ModuleKey =
  | "dashboard"
  | "reservations"
  | "rooms"
  | "housekeeping"
  | "guests"
  | "pos"
  | "folios"
  | "reports"
  | "night-audit"
  | "staff"
  | "maintenance"
  | "audit";

export type RoleKey = "owner" | "gm" | "fom" | "receptionist" | "hk_mgr" | "fb_mgr";

interface AppState {
  activeModule: ModuleKey;
  setActiveModule: (m: ModuleKey) => void;
  role: RoleKey;
  setRole: (r: RoleKey) => void;
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  // live data refresh tick — increment to trigger refetch
  refreshTick: number;
  triggerRefresh: () => void;
  // notifications
  notifOpen: boolean;
  setNotifOpen: (v: boolean) => void;
  // realtime toasts
  toasts: { id: string; event: string; payload: any }[];
  pushToast: (event: string, payload: any) => void;
  dismissToast: (id: string) => void;
}

export const useAppStore = create<AppState>((set) => ({
  activeModule: "dashboard",
  setActiveModule: (m) => set({ activeModule: m }),
  role: "gm",
  setRole: (r) => set({ role: r }),
  sidebarCollapsed: false,
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  refreshTick: 0,
  triggerRefresh: () => set((s) => ({ refreshTick: s.refreshTick + 1 })),
  notifOpen: false,
  setNotifOpen: (v) => set({ notifOpen: v }),
  toasts: [],
  pushToast: (event, payload) =>
    set((s) => ({
      toasts: [...s.toasts, { id: Math.random().toString(36).slice(2), event, payload }].slice(-5),
    })),
  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

export const ROLE_META: Record<RoleKey, { label: string; level: number; accent: string; barClass: string }> = {
  owner: { label: "Owner / CEO", level: 1, accent: "#7C3AED", barClass: "role-bar-owner" },
  gm: { label: "General Manager", level: 2, accent: "#1B3A6B", barClass: "role-bar-gm" },
  fom: { label: "Front Office Mgr", level: 3, accent: "#0369A1", barClass: "role-bar-manager" },
  receptionist: { label: "Receptionist", level: 4, accent: "#0F766E", barClass: "role-bar-staff" },
  hk_mgr: { label: "Housekeeping Mgr", level: 3, accent: "#0369A1", barClass: "role-bar-manager" },
  fb_mgr: { label: "F&B Manager", level: 3, accent: "#0369A1", barClass: "role-bar-manager" },
};
