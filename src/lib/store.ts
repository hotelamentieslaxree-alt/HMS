// ARIA HMS — Hospitality Operating System — Zustand global store
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
  | "audit"
  | "hospital"
  | "inventory"
  | "finance"
  | "crm"
  | "tasks"
  | "documents"
  | "ai-center"
  | "automation"
  | "integrations"
  | "settings"
  | "properties"
  | "kitchen"
  | "accounting"
  | "purchasing"
  | "vendors";

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
  | "mkt_exec"
  | "purchase_mgr";

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

// ─── Module System ──────────────────────────────────────────────────
// Each module has a label, icon reference, and default enabled state
// Module ON/OFF is controlled at the tenant/property level

export interface ModuleConfig {
  key: ModuleKey;
  label: string;
  group: string;
  enabled: boolean;
  required?: boolean; // Some modules are always on (dashboard, settings)
}

export const MODULE_GROUPS: Record<string, { label: string; modules: ModuleKey[] }> = {
  operations: {
    label: "Operations",
    modules: ["dashboard", "reservations", "rooms", "housekeeping", "guests"],
  },
  commerce: {
    label: "Restaurant & Kitchen",
    modules: ["pos", "kitchen", "folios"],
  },
  hospitality: {
    label: "Hospital & Clinic",
    modules: ["hospital"],
  },
  inventory: {
    label: "Inventory & Procurement",
    modules: ["inventory", "purchasing", "vendors"],
  },
  finance: {
    label: "Finance & Accounting",
    modules: ["finance", "accounting"],
  },
  hrms: {
    label: "HRMS",
    modules: ["hr", "attendance", "scorecard"],
  },
  crm: {
    label: "CRM & Sales",
    modules: ["sales", "marketing", "crm"],
  },
  productivity: {
    label: "Productivity",
    modules: ["tasks", "documents"],
  },
  intelligence: {
    label: "Intelligence & Analytics",
    modules: ["reports", "night-audit", "audit"],
  },
  ai: {
    label: "AI & Automation",
    modules: ["ai-center", "automation"],
  },
  admin: {
    label: "Administration",
    modules: ["staff", "maintenance", "properties", "settings", "integrations"],
  },
};

export const DEFAULT_MODULES: ModuleConfig[] = [
  // Operations — always on for hotel
  { key: "dashboard", label: "Dashboard", group: "operations", enabled: true, required: true },
  { key: "reservations", label: "Reservations", group: "operations", enabled: true },
  { key: "rooms", label: "Front Office", group: "operations", enabled: true },
  { key: "housekeeping", label: "Housekeeping", group: "operations", enabled: true },
  { key: "guests", label: "Guests", group: "operations", enabled: true },
  // Commerce
  { key: "pos", label: "Restaurant / POS", group: "commerce", enabled: true },
  { key: "kitchen", label: "Kitchen Display", group: "commerce", enabled: true },
  { key: "folios", label: "Folios & Billing", group: "commerce", enabled: true },
  // Hospital
  { key: "hospital", label: "Hospital", group: "hospitality", enabled: true },
  { key: "inventory", label: "Inventory", group: "inventory", enabled: true },
  { key: "purchasing", label: "Purchasing", group: "inventory", enabled: true },
  { key: "vendors", label: "Vendors", group: "inventory", enabled: true },
  // Finance
  { key: "finance", label: "Finance", group: "finance", enabled: true },
  { key: "accounting", label: "Accounting", group: "finance", enabled: true },
  // HRMS
  { key: "hr", label: "HR Hub", group: "hrms", enabled: true },
  { key: "attendance", label: "Attendance", group: "hrms", enabled: true },
  { key: "scorecard", label: "Scorecard", group: "hrms", enabled: true },
  // CRM & Sales
  { key: "sales", label: "Sales Pipeline", group: "crm", enabled: true },
  { key: "marketing", label: "Marketing Hub", group: "crm", enabled: true },
  { key: "crm", label: "CRM", group: "crm", enabled: true },
  // Productivity
  { key: "tasks", label: "Tasks", group: "productivity", enabled: true },
  { key: "documents", label: "Documents", group: "productivity", enabled: true },
  // Intelligence
  { key: "reports", label: "Reports", group: "intelligence", enabled: true },
  { key: "night-audit", label: "Night Audit", group: "intelligence", enabled: true },
  { key: "audit", label: "Audit Log", group: "intelligence", enabled: true },
  // AI & Automation
  { key: "ai-center", label: "AI Center", group: "ai", enabled: true },
  { key: "automation", label: "Automation", group: "ai", enabled: true },
  // Admin
  { key: "staff", label: "Staff Directory", group: "admin", enabled: true },
  { key: "maintenance", label: "Maintenance", group: "admin", enabled: true },
  { key: "properties", label: "Properties", group: "admin", enabled: true },
  { key: "settings", label: "Settings", group: "admin", enabled: true, required: true },
  { key: "integrations", label: "Integrations", group: "admin", enabled: true },
];

// Which modules each role can access (among enabled modules)
export const ROLE_MODULES: Record<string, ModuleKey[]> = {
  owner: ["dashboard", "reservations", "rooms", "housekeeping", "guests", "pos", "kitchen", "folios", "hospital", "inventory", "finance", "accounting", "purchasing", "vendors", "hr", "attendance", "scorecard", "sales", "marketing", "crm", "tasks", "documents", "reports", "night-audit", "audit", "ai-center", "automation", "staff", "maintenance", "properties", "settings", "integrations"],
  gm: ["dashboard", "reservations", "rooms", "housekeeping", "guests", "pos", "kitchen", "folios", "hospital", "inventory", "finance", "accounting", "purchasing", "vendors", "hr", "attendance", "scorecard", "sales", "marketing", "crm", "tasks", "documents", "reports", "night-audit", "audit", "ai-center", "automation", "staff", "maintenance", "properties", "settings", "integrations"],
  fom: ["dashboard", "reservations", "rooms", "housekeeping", "guests", "folios", "reports", "night-audit", "staff", "scorecard", "tasks"],
  receptionist: ["dashboard", "reservations", "rooms", "guests", "folios", "staff", "tasks"],
  hk_mgr: ["dashboard", "housekeeping", "rooms", "staff", "maintenance", "scorecard", "tasks", "laundry", "inventory", "purchasing", "vendors"],
  hk_attendant: ["dashboard", "housekeeping", "tasks"],
  fb_mgr: ["dashboard", "pos", "kitchen", "reports", "staff", "scorecard", "inventory", "tasks", "vendors"],
  waiter: ["dashboard", "pos", "kitchen", "tasks"],
  rev_mgr: ["dashboard", "reservations", "reports", "night-audit", "sales", "marketing", "crm", "scorecard", "ai-center"],
  fin_mgr: ["dashboard", "folios", "finance", "reports", "night-audit", "audit", "scorecard", "inventory", "vendors"],
  eng_mgr: ["dashboard", "maintenance", "rooms", "staff", "scorecard", "inventory", "tasks", "vendors"],
  technician: ["dashboard", "maintenance", "tasks"],
  hr_mgr: ["dashboard", "hr", "attendance", "scorecard", "staff", "audit", "tasks", "documents"],
  sales_mgr: ["dashboard", "sales", "crm", "scorecard", "staff", "reports", "tasks"],
  sales_exec: ["dashboard", "sales", "crm", "staff", "tasks"],
  mkt_mgr: ["dashboard", "marketing", "crm", "scorecard", "staff", "reports", "tasks"],
  mkt_exec: ["dashboard", "marketing", "crm", "staff", "tasks"],
  purchase_mgr: ["dashboard", "inventory", "finance", "reports", "audit", "tasks", "vendors", "purchasing"],
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
  purchase_mgr: { label: "Purchase Manager", level: 3, accent: "#10B981", barClass: "role-bar-manager", deptCode: "PROC" },
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
  // Module ON/OFF system
  enabledModules: ModuleKey[];
  setEnabledModules: (modules: ModuleKey[]) => void;
  toggleModule: (key: ModuleKey) => void;
  isModuleEnabled: (key: ModuleKey) => boolean;
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

// Get enabled modules from localStorage or defaults
function getInitialModules(): ModuleKey[] {
  if (typeof window === "undefined") return DEFAULT_MODULES.filter(m => m.enabled).map(m => m.key);
  try {
    const stored = localStorage.getItem("aria_enabled_modules");
    if (stored) return JSON.parse(stored) as ModuleKey[];
  } catch { /* ignore */ }
  return DEFAULT_MODULES.filter(m => m.enabled).map(m => m.key);
}

export const useAppStore = create<AppState>((set, get) => ({
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
  // Module ON/OFF system
  enabledModules: getInitialModules(),
  setEnabledModules: (modules) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("aria_enabled_modules", JSON.stringify(modules));
    }
    set({ enabledModules: modules });
  },
  toggleModule: (key) => {
    const current = get().enabledModules;
    const config = DEFAULT_MODULES.find(m => m.key === key);
    if (config?.required) return; // Can't disable required modules
    const updated = current.includes(key)
      ? current.filter(k => k !== key)
      : [...current, key];
    if (typeof window !== "undefined") {
      localStorage.setItem("aria_enabled_modules", JSON.stringify(updated));
    }
    set({ enabledModules: updated });
  },
  isModuleEnabled: (key) => get().enabledModules.includes(key),
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
