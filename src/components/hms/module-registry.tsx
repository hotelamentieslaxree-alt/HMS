// ARIA HMS — Module Registry
// This file maps module keys to their dynamic import functions.
// It is loaded ONLY on the client side via dynamic import from app-shell.
// Webpack creates separate chunks for each module, but they are only
// compiled on-demand when a module is first accessed.

import type { ModuleKey } from "@/lib/store";

export type ModuleComponent = React.ComponentType;

const registry: Record<string, () => Promise<ModuleComponent>> = {
  dashboard: () => import("./modules/dashboard").then(m => m.DashboardModule),
  reservations: () => import("./modules/reservations").then(m => m.ReservationsModule),
  rooms: () => import("./modules/rooms").then(m => m.RoomsModule),
  housekeeping: () => import("./modules/housekeeping").then(m => m.HousekeepingModule),
  guests: () => import("./modules/guests").then(m => m.GuestsModule),
  pos: () => import("./modules/pos").then(m => m.PosModule),
  kitchen: () => import("./modules/kitchen").then(m => m.KitchenModule),
  folios: () => import("./modules/folios").then(m => m.FoliosModule),
  hospital: () => import("./modules/hospital").then(m => m.HospitalModule),
  inventory: () => import("./modules/inventory").then(m => m.InventoryModule),
  finance: () => import("./modules/finance").then(m => m.FinanceModule),
  hr: () => import("./modules/hr").then(m => m.HRModule),
  attendance: () => import("./modules/attendance").then(m => m.AttendanceModule),
  scorecard: () => import("./modules/scorecard").then(m => m.ScorecardModule),
  sales: () => import("./modules/sales").then(m => m.SalesModule),
  marketing: () => import("./modules/marketing").then(m => m.MarketingModule),
  crm: () => import("./modules/crm").then(m => m.CrmModule),
  tasks: () => import("./modules/tasks").then(m => m.TasksModule),
  documents: () => import("./modules/documents").then(m => m.DocumentsModule),
  reports: () => import("./modules/reports").then(m => m.ReportsModule),
  "night-audit": () => import("./modules/night-audit").then(m => m.NightAuditModule),
  audit: () => import("./modules/audit").then(m => m.AuditModule),
  "ai-center": () => import("./modules/ai-center").then(m => m.AiCenterModule),
  automation: () => import("./modules/automation").then(m => m.AutomationModule),
  staff: () => import("./modules/staff").then(m => m.StaffModule),
  maintenance: () => import("./modules/maintenance").then(m => m.MaintenanceModule),
  properties: () => import("./modules/properties").then(m => m.PropertiesModule),
  integrations: () => import("./modules/integrations").then(m => m.IntegrationsModule),
  settings: () => import("./modules/settings").then(m => m.SettingsModule),
  accounting: () => import("./modules/accounting").then(m => m.AccountingModule),
  purchasing: () => import("./modules/purchasing").then(m => m.PurchasingModule),
};

export function loadModule(key: ModuleKey): Promise<ModuleComponent> {
  const loader = registry[key] || registry.dashboard;
  return loader();
}
