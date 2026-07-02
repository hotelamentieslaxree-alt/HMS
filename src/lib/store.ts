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

export type RoleKey =
  | "owner"
  | "gm"
  | "fom"
  | "receptionist"
  | "hk_mgr"
  | "hk_attendant"
  | "fb_mgr"
  | "waiter"
  | "rev_mgr"
  | "fin_mgr"
  | "eng_mgr"
  | "technician"
  | "hr_mgr";

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  roleLevel: number;
  employeeCode: string | null;
  phone: string | null;
  avatarUrl: string | null;
  department: { id: string; name: string; code: string } | null;
  property: { id: string; name: string; code: string; businessDate: string } | null;
  token: string;
}

// Which modules each role can access
export const ROLE_MODULES: Record<string, ModuleKey[]> = {
  owner: ["dashboard", "reservations", "rooms", "housekeeping", "guests", "pos", "folios", "reports", "night-audit", "staff", "maintenance", "audit"],
  gm: ["dashboard", "reservations", "rooms", "housekeeping", "guests", "pos", "folios", "reports", "night-audit", "staff", "maintenance", "audit"],
  fom: ["dashboard", "reservations", "rooms", "housekeeping", "guests", "folios", "reports", "night-audit", "staff"],
  receptionist: ["dashboard", "reservations", "rooms", "guests", "folios"],
  hk_mgr: ["dashboard", "housekeeping", "rooms", "staff", "maintenance"],
  hk_attendant: ["dashboard", "housekeeping"],
  fb_mgr: ["dashboard", "pos", "reports", "staff"],
  waiter: ["dashboard", "pos"],
  rev_mgr: ["dashboard", "reservations", "reports", "night-audit"],
  fin_mgr: ["dashboard", "folios", "reports", "night-audit", "audit"],
  eng_mgr: ["dashboard", "maintenance", "rooms", "staff"],
  technician: ["dashboard", "maintenance"],
  hr_mgr: ["dashboard", "staff", "audit"],
};

export const ROLE_META: Record<string, { label: string; level: number; accent: string; barClass: string; deptCode?: string }> = {
  owner: { label: "Owner / CEO", level: 1, accent: "#7C3AED", barClass: "role-bar-owner" },
  gm: { label: "General Manager", level: 2, accent: "#1B3A6B", barClass: "role-bar-gm" },
  fom: { label: "Front Office Mgr", level: 3, accent: "#0369A1", barClass: "role-bar-manager", deptCode: "FO" },
  receptionist: { label: "Receptionist", level: 4, accent: "#0F766E", barClass: "role-bar-staff", deptCode: "FO" },
  hk_mgr: { label: "Housekeeping Mgr", level: 3, accent: "#0369A1", barClass: "role-bar-manager", deptCode: "HK" },
  hk_attendant: { label: "HK Attendant", level: 4, accent: "#0F766E", barClass: "role-bar-staff", deptCode: "HK" },
  fb_mgr: { label: "F&B Manager", level: 3, accent: "#0369A1", barClass: "role-bar-manager", deptCode: "FB" },
  waiter: { label: "Waiter", level: 4, accent: "#0F766E", barClass: "role-bar-staff", deptCode: "FB" },
  rev_mgr: { label: "Revenue Mgr", level: 3, accent: "#0369A1", barClass: "role-bar-manager", deptCode: "FO" },
  fin_mgr: { label: "Finance Mgr", level: 3, accent: "#0369A1", barClass: "role-bar-manager", deptCode: "FIN" },
  eng_mgr: { label: "Engineering Mgr", level: 3, accent: "#0369A1", barClass: "role-bar-manager", deptCode: "ENG" },
  technician: { label: "Technician", level: 4, accent: "#0F766E", barClass: "role-bar-staff", deptCode: "ENG" },
  hr_mgr: { label: "HR Manager", level: 3, accent: "#0369A1", barClass: "role-bar-manager", deptCode: "HR" },
};

interface AppState {
  // Auth
  user: AuthUser | null;
  setUser: (u: AuthUser | null) => void;
  isAuthenticated: boolean;
  // Navigation
  activeModule: ModuleKey;
  setActiveModule: (m: ModuleKey) => void;
  // Role (derived from user)
  role: string;
  setRole: (r: string) => void;
  // Sidebar
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  // Live data refresh tick
  refreshTick: number;
  triggerRefresh: () => void;
  // Notifications
  notifOpen: boolean;
  setNotifOpen: (v: boolean) => void;
  // Realtime toasts
  toasts: { id: string; event: string; payload: any }[];
  pushToast: (event: string, payload: any) => void;
  dismissToast: (id: string) => void;
}

export const useAppStore = create<AppState>((set) => ({
  // Auth
  user: null,
  setUser: (u) => set({ user: u, isAuthenticated: !!u, role: u?.role ?? "gm" }),
  isAuthenticated: false,
  // Navigation
  activeModule: "dashboard",
  setActiveModule: (m) => set({ activeModule: m }),
  // Role
  role: "gm",
  setRole: (r) => set({ role: r }),
  // Sidebar
  sidebarCollapsed: false,
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  // Refresh
  refreshTick: 0,
  triggerRefresh: () => set((s) => ({ refreshTick: s.refreshTick + 1 })),
  // Notifications
  notifOpen: false,
  setNotifOpen: (v) => set({ notifOpen: v }),
  // Toasts
  toasts: [],
  pushToast: (event, payload) =>
    set((s) => ({
      toasts: [...s.toasts, { id: Math.random().toString(36).slice(2), event, payload }].slice(-5),
    })),
  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));
