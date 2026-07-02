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
  | "sales"
  | "marketing"
  | "hr"
  | "attendance"
  | "scorecard"
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
  | "hr_mgr"
  | "sales_mgr"
  | "sales_exec"
  | "mkt_mgr"
  | "mkt_exec";

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
// Attendance is HR-only, Scorecard accessible to managers+
export const ROLE_MODULES: Record<string, ModuleKey[]> = {
  owner: ["dashboard", "reservations", "rooms", "housekeeping", "guests", "pos", "folios", "sales", "marketing", "hr", "attendance", "scorecard", "reports", "night-audit", "staff", "maintenance", "audit"],
  gm: ["dashboard", "reservations", "rooms", "housekeeping", "guests", "pos", "folios", "sales", "marketing", "hr", "attendance", "scorecard", "reports", "night-audit", "staff", "maintenance", "audit"],
  fom: ["dashboard", "reservations", "rooms", "housekeeping", "guests", "folios", "reports", "night-audit", "staff", "scorecard"],
  receptionist: ["dashboard", "reservations", "rooms", "guests", "folios", "staff"],
  hk_mgr: ["dashboard", "housekeeping", "rooms", "staff", "maintenance", "scorecard"],
  hk_attendant: ["dashboard", "housekeeping"],
  fb_mgr: ["dashboard", "pos", "reports", "staff", "scorecard"],
  waiter: ["dashboard", "pos"],
  rev_mgr: ["dashboard", "reservations", "reports", "night-audit", "sales", "marketing", "scorecard"],
  fin_mgr: ["dashboard", "folios", "reports", "night-audit", "audit", "scorecard"],
  eng_mgr: ["dashboard", "maintenance", "rooms", "staff", "scorecard"],
  technician: ["dashboard", "maintenance"],
  hr_mgr: ["dashboard", "hr", "attendance", "scorecard", "staff", "audit"],
  sales_mgr: ["dashboard", "sales", "scorecard", "staff", "reports"],
  sales_exec: ["dashboard", "sales", "staff"],
  mkt_mgr: ["dashboard", "marketing", "scorecard", "staff", "reports"],
  mkt_exec: ["dashboard", "marketing", "staff"],
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
  hr_mgr: { label: "HR Manager", level: 3, accent: "#BE185D", barClass: "role-bar-manager", deptCode: "HR" },
  sales_mgr: { label: "Sales Manager", level: 3, accent: "#EA580C", barClass: "role-bar-manager", deptCode: "SALES" },
  sales_exec: { label: "Sales Executive", level: 4, accent: "#F97316", barClass: "role-bar-staff", deptCode: "SALES" },
  mkt_mgr: { label: "Marketing Manager", level: 3, accent: "#7C3AED", barClass: "role-bar-manager", deptCode: "MKT" },
  mkt_exec: { label: "Marketing Executive", level: 4, accent: "#8B5CF6", barClass: "role-bar-staff", deptCode: "MKT" },
};

interface AppState {
  // Auth
  user: AuthUser | null;
  setUser: (u: AuthUser | null) => void;
  isAuthenticated: boolean;
  // Navigation
  activeModule: ModuleKey;
  setActiveModule: (m: ModuleKey) => void;
  activeSubModule: string;
  setActiveSubModule: (s: string) => void;
  navigateTo: (module: ModuleKey, sub?: string) => void;
  // Role (derived from user)
  role: string;
  setRole: (r: string) => void;
  // Sidebar
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  expandedMenus: string[];
  toggleMenu: (key: string) => void;
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
  activeSubModule: "",
  setActiveSubModule: (s) => set({ activeSubModule: s }),
  navigateTo: (module, sub) => set({ activeModule: module, activeSubModule: sub ?? "" }),
  // Role
  role: "gm",
  setRole: (r) => set({ role: r }),
  // Sidebar
  sidebarCollapsed: false,
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  expandedMenus: [],
  toggleMenu: (key) => set((s) => ({
    expandedMenus: s.expandedMenus.includes(key)
      ? s.expandedMenus.filter((k) => k !== key)
      : [...s.expandedMenus, key]
  })),
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
