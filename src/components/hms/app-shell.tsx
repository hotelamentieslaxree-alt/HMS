// ARIA HMS — App Shell — Hospitality Operating System
"use client";

import { useAppStore, ROLE_MODULES, ModuleKey } from "@/lib/store";
import { useApi } from "@/lib/api";
import { Globe, ShieldCheck, Cpu, Brain, AlertTriangle, RefreshCw } from "lucide-react";
import { Component, useEffect, lazy, Suspense } from "react";
import { Button } from "@/components/ui/button";

// ─── Lazy-load heavy shell components ──────────────────────────────────
// These are lazy-loaded to reduce initial compilation memory.
// framer-motion (login), socket.io (realtime), cmdk (command-palette)
// are heavy deps that should only load when needed.
const Sidebar = lazy(() => import("./sidebar").then(m => ({ default: m.Sidebar })));
const Topbar = lazy(() => import("./topbar").then(m => ({ default: m.Topbar })));
const RealtimeToasts = lazy(() => import("./realtime-toasts").then(m => ({ default: m.RealtimeToasts })));
const CommandPalette = lazy(() => import("./command-palette").then(m => ({ default: m.CommandPalette })));
const LoginPage = lazy(() => import("./login-page").then(m => ({ default: m.LoginPage })));

// ─── Lazy-loaded module components ────────────────────────────────────
// Each module is loaded on-demand when the user navigates to it.
// This prevents Turbopack from compiling all 29 modules at once,
// reducing peak compilation memory from 2.6GB+ to ~300MB per module.
const DashboardModule = lazy(() => import("./modules/dashboard").then(m => ({ default: m.DashboardModule })));
const ReservationsModule = lazy(() => import("./modules/reservations").then(m => ({ default: m.ReservationsModule })));
const RoomsModule = lazy(() => import("./modules/rooms").then(m => ({ default: m.RoomsModule })));
const HousekeepingModule = lazy(() => import("./modules/housekeeping").then(m => ({ default: m.HousekeepingModule })));
const GuestsModule = lazy(() => import("./modules/guests").then(m => ({ default: m.GuestsModule })));
const PosModule = lazy(() => import("./modules/pos").then(m => ({ default: m.PosModule })));
const FoliosModule = lazy(() => import("./modules/folios").then(m => ({ default: m.FoliosModule })));
const ReportsModule = lazy(() => import("./modules/reports").then(m => ({ default: m.ReportsModule })));
const NightAuditModule = lazy(() => import("./modules/night-audit").then(m => ({ default: m.NightAuditModule })));
const StaffModule = lazy(() => import("./modules/staff").then(m => ({ default: m.StaffModule })));
const HRModule = lazy(() => import("./modules/hr").then(m => ({ default: m.HRModule })));
const MaintenanceModule = lazy(() => import("./modules/maintenance").then(m => ({ default: m.MaintenanceModule })));
const AuditModule = lazy(() => import("./modules/audit").then(m => ({ default: m.AuditModule })));
const AttendanceModule = lazy(() => import("./modules/attendance").then(m => ({ default: m.AttendanceModule })));
const ScorecardModule = lazy(() => import("./modules/scorecard").then(m => ({ default: m.ScorecardModule })));
const MarketingModule = lazy(() => import("./modules/marketing").then(m => ({ default: m.MarketingModule })));
const SalesModule = lazy(() => import("./modules/sales").then(m => ({ default: m.SalesModule })));
const HospitalModule = lazy(() => import("./modules/hospital").then(m => ({ default: m.HospitalModule })));
const InventoryModule = lazy(() => import("./modules/inventory").then(m => ({ default: m.InventoryModule })));
const FinanceModule = lazy(() => import("./modules/finance").then(m => ({ default: m.FinanceModule })));
const CrmModule = lazy(() => import("./modules/crm").then(m => ({ default: m.CrmModule })));
const TasksModule = lazy(() => import("./modules/tasks").then(m => ({ default: m.TasksModule })));
const DocumentsModule = lazy(() => import("./modules/documents").then(m => ({ default: m.DocumentsModule })));
const AiCenterModule = lazy(() => import("./modules/ai-center").then(m => ({ default: m.AiCenterModule })));
const AutomationModule = lazy(() => import("./modules/automation").then(m => ({ default: m.AutomationModule })));
const IntegrationsModule = lazy(() => import("./modules/integrations").then(m => ({ default: m.IntegrationsModule })));
const SettingsModule = lazy(() => import("./modules/settings").then(m => ({ default: m.SettingsModule })));
const PropertiesModule = lazy(() => import("./modules/properties").then(m => ({ default: m.PropertiesModule })));
const KitchenModule = lazy(() => import("./modules/kitchen").then(m => ({ default: m.KitchenModule })));

const MODULE_COMPONENTS: Record<ModuleKey, React.LazyExoticComponent<React.FC>> = {
  dashboard: DashboardModule,
  reservations: ReservationsModule,
  rooms: RoomsModule,
  housekeeping: HousekeepingModule,
  guests: GuestsModule,
  pos: PosModule,
  kitchen: KitchenModule,
  folios: FoliosModule,
  hospital: HospitalModule,
  inventory: InventoryModule,
  finance: FinanceModule,
  hr: HRModule,
  attendance: AttendanceModule,
  scorecard: ScorecardModule,
  sales: SalesModule,
  marketing: MarketingModule,
  crm: CrmModule,
  tasks: TasksModule,
  documents: DocumentsModule,
  reports: ReportsModule,
  "night-audit": NightAuditModule,
  audit: AuditModule,
  "ai-center": AiCenterModule,
  automation: AutomationModule,
  staff: StaffModule,
  maintenance: MaintenanceModule,
  properties: PropertiesModule,
  integrations: IntegrationsModule,
  settings: SettingsModule,
};

// ─── Module Loading Skeleton ──────────────────────────────────────────
function ModuleSkeleton() {
  return (
    <div className="flex items-center justify-center py-32">
      <div className="flex flex-col items-center gap-4">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted border-t-gold" />
        <p className="text-sm text-muted-foreground">Loading module…</p>
      </div>
    </div>
  );
}

// ─── Module Error Boundary ──────────────────────────────────────────
class ModuleErrorBoundary extends Component<
  { children: React.ReactNode; moduleName: string },
  { hasError: boolean; error: Error | null }
> {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10 mb-4">
            <AlertTriangle className="h-8 w-8 text-destructive" />
          </div>
          <h3 className="font-display text-lg font-bold text-foreground mb-2">Module Load Error</h3>
          <p className="text-sm text-muted-foreground max-w-md mb-4">
            The &quot;{this.props.moduleName}&quot; module failed to load. This might be due to a network issue or the module is still being compiled.
          </p>
          <Button
            variant="outline"
            onClick={() => this.setState({ hasError: false, error: null })}
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Retry
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}

export function AppShell() {
  const { user, isAuthenticated, activeModule, setActiveModule, role, enabledModules } = useAppStore();
  const { data: prop } = useApi(isAuthenticated ? "/api/dashboard" : null, []);
  const propertyId = user?.property?.id;

  // Ensure activeModule is accessible by current role AND enabled
  const allowedModules = ROLE_MODULES[role] ?? ROLE_MODULES.gm;
  useEffect(() => {
    if (isAuthenticated) {
      const isVisible = allowedModules.includes(activeModule) && enabledModules.includes(activeModule);
      if (!isVisible) {
        setActiveModule("dashboard");
      }
    }
  }, [role, isAuthenticated, allowedModules, activeModule, setActiveModule, enabledModules]);

  // Track active module changes for error boundary recovery
  const activeKey = activeModule;

  if (!isAuthenticated) {
    return (
      <Suspense fallback={<FullPageSkeleton />}>
        <LoginPage />
      </Suspense>
    );
  }

  const ActiveComponent = MODULE_COMPONENTS[activeModule] ?? DashboardModule;
  const moduleLabel = activeModule.replace(/-/g, " ").replace(/\b\w/g, l => l.toUpperCase());

  return (
    <div className="flex min-h-screen bg-surface">
      <Suspense fallback={<SidebarSkeleton />}>
        <Sidebar />
      </Suspense>
      <div className="flex flex-1 flex-col min-w-0">
        <Suspense fallback={<TopbarSkeleton />}>
          <Topbar propertyId={propertyId} />
        </Suspense>
        <main className="flex-1 overflow-x-hidden">
          <div className="mx-auto max-w-[1600px] px-4 py-6 lg:px-8 lg:py-8">
            <ModuleErrorBoundary moduleName={moduleLabel}>
              <Suspense fallback={<ModuleSkeleton />}>
                <ActiveComponent key={activeKey} />
              </Suspense>
            </ModuleErrorBoundary>
          </div>
        </main>
        <Footer />
      </div>
      <Suspense fallback={null}>
        <RealtimeToasts propertyId={propertyId} />
      </Suspense>
      <Suspense fallback={null}>
        <CommandPalette />
      </Suspense>
    </div>
  );
}

function FullPageSkeleton() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0A0F1C]">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-[#C9952A]" />
    </div>
  );
}

function SidebarSkeleton() {
  return (
    <aside className="w-64 bg-sidebar border-r border-sidebar-border animate-pulse">
      <div className="h-16 border-b border-sidebar-border px-4 flex items-center gap-3">
        <div className="h-9 w-9 rounded-lg bg-sidebar-accent" />
        <div className="space-y-2 flex-1">
          <div className="h-3 w-20 rounded bg-sidebar-accent" />
          <div className="h-2 w-16 rounded bg-sidebar-accent/60" />
        </div>
      </div>
      <div className="p-3 space-y-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-8 rounded-lg bg-sidebar-accent/40" />
        ))}
      </div>
    </aside>
  );
}

function TopbarSkeleton() {
  return (
    <header className="h-14 border-b border-border bg-card/95 backdrop-blur px-4 lg:px-6 flex items-center gap-3">
      <div className="h-4 w-32 rounded bg-muted animate-pulse" />
      <div className="flex-1" />
      <div className="h-8 w-8 rounded-lg bg-muted animate-pulse" />
      <div className="h-8 w-8 rounded-lg bg-muted animate-pulse" />
      <div className="h-8 w-8 rounded-lg bg-muted animate-pulse" />
    </header>
  );
}

function Footer() {
  return (
    <footer className="mt-auto border-t border-border bg-card px-4 lg:px-8 py-3">
      <div className="mx-auto max-w-[1600px] flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <div className="flex h-5 w-5 items-center justify-center rounded bg-gold text-navy text-[10px] font-bold">A</div>
          <span className="font-semibold text-foreground">ARIA HMS</span>
          <span className="hidden sm:inline">· Hospitality Operating System v2.0</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1"><ShieldCheck className="h-3 w-3 text-[#16A34A]" /> SOC2 · GDPR · PCI-DSS</span>
          <span className="hidden md:flex items-center gap-1"><Cpu className="h-3 w-3 text-gold" /> Real-time enabled</span>
          <span className="hidden lg:flex items-center gap-1"><Brain className="h-3 w-3 text-gold" /> AI-powered</span>
          <span className="hidden lg:flex items-center gap-1"><Globe className="h-3 w-3" /> Asia/Calcutta</span>
        </div>
      </div>
    </footer>
  );
}
