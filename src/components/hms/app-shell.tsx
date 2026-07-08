// ARIA HMS — App Shell — Hospitality Operating System
"use client";

import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import { RealtimeToasts } from "./realtime-toasts";
import { CommandPalette } from "./command-palette";
import { LoginPage } from "./login-page";
import { useAppStore, ROLE_MODULES, ModuleKey } from "@/lib/store";
import { DashboardModule } from "./modules/dashboard";
import { ReservationsModule } from "./modules/reservations";
import { RoomsModule } from "./modules/rooms";
import { HousekeepingModule } from "./modules/housekeeping";
import { GuestsModule } from "./modules/guests";
import { PosModule } from "./modules/pos";
import { FoliosModule } from "./modules/folios";
import { ReportsModule } from "./modules/reports";
import { NightAuditModule } from "./modules/night-audit";
import { StaffModule } from "./modules/staff";
import { HRModule } from "./modules/hr";
import { MaintenanceModule } from "./modules/maintenance";
import { AuditModule } from "./modules/audit";
import { AttendanceModule } from "./modules/attendance";
import { ScorecardModule } from "./modules/scorecard";
import { MarketingModule } from "./modules/marketing";
import { SalesModule } from "./modules/sales";
import { HospitalModule } from "./modules/hospital";
import { InventoryModule } from "./modules/inventory";
import { FinanceModule } from "./modules/finance";
import { CrmModule } from "./modules/crm";
import { TasksModule } from "./modules/tasks";
import { DocumentsModule } from "./modules/documents";
import { AiCenterModule } from "./modules/ai-center";
import { AutomationModule } from "./modules/automation";
import { IntegrationsModule } from "./modules/integrations";
import { SettingsModule } from "./modules/settings";
import { PropertiesModule } from "./modules/properties";
import { KitchenModule } from "./modules/kitchen";
import { useApi } from "@/lib/api";
import { Hotel, Globe, ShieldCheck, Cpu, Brain, AlertTriangle, RefreshCw } from "lucide-react";
import { Component, useEffect } from "react";
import { Button } from "@/components/ui/button";

const MODULE_COMPONENTS: Record<ModuleKey, React.FC> = {
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
  const [, setTick] = useState(0);

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
    return <LoginPage />;
  }

  const ActiveComponent = MODULE_COMPONENTS[activeModule] ?? DashboardModule;
  const moduleLabel = activeModule.replace(/-/g, " ").replace(/\b\w/g, l => l.toUpperCase());

  return (
    <div className="flex min-h-screen bg-surface">
      <Sidebar />
      <div className="flex flex-1 flex-col min-w-0">
        <Topbar propertyId={propertyId} />
        <main className="flex-1 overflow-x-hidden">
          <div className="mx-auto max-w-[1600px] px-4 py-6 lg:px-8 lg:py-8">
            <ModuleErrorBoundary moduleName={moduleLabel}>
              <ActiveComponent key={activeKey} />
            </ModuleErrorBoundary>
          </div>
        </main>
        <Footer />
      </div>
      <RealtimeToasts propertyId={propertyId} />
      <CommandPalette />
    </div>
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
