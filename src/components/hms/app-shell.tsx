// HMS App Shell — orchestrates sidebar + topbar + active module + footer
"use client";

import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import { RealtimeToasts } from "./realtime-toasts";
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
import { useApi } from "@/lib/api";
import { Hotel, Globe, ShieldCheck, Cpu } from "lucide-react";
import { useEffect } from "react";

const MODULE_COMPONENTS: Record<ModuleKey, React.FC> = {
  dashboard: DashboardModule,
  reservations: ReservationsModule,
  rooms: RoomsModule,
  housekeeping: HousekeepingModule,
  guests: GuestsModule,
  pos: PosModule,
  folios: FoliosModule,
  reports: ReportsModule,
  "night-audit": NightAuditModule,
  staff: StaffModule,
  hr: HRModule,
  maintenance: MaintenanceModule,
  audit: AuditModule,
  attendance: AttendanceModule,
  scorecard: ScorecardModule,
  marketing: MarketingModule,
  sales: SalesModule,
};

export function AppShell() {
  const { user, isAuthenticated, activeModule, setActiveModule, role } = useAppStore();
  const { data: prop } = useApi(isAuthenticated ? "/api/dashboard" : null, []);
  const propertyId = user?.property?.id;

  // Ensure activeModule is accessible by current role
  const allowedModules = ROLE_MODULES[role] ?? ROLE_MODULES.gm;
  useEffect(() => {
    if (isAuthenticated && !allowedModules.includes(activeModule)) {
      setActiveModule("dashboard");
    }
  }, [role, isAuthenticated, allowedModules, activeModule, setActiveModule]);

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  const ActiveComponent = MODULE_COMPONENTS[activeModule] ?? DashboardModule;

  return (
    <div className="flex min-h-screen bg-surface">
      <Sidebar />
      <div className="flex flex-1 flex-col min-w-0">
        <Topbar propertyId={propertyId} />
        <main className="flex-1 overflow-x-hidden">
          <div className="mx-auto max-w-[1600px] px-4 py-6 lg:px-8 lg:py-8">
            <ActiveComponent />
          </div>
        </main>
        <Footer />
      </div>
      <RealtimeToasts propertyId={propertyId} />
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
          <span className="hidden sm:inline">· Hospitality Intelligence Architecture v1.0</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1"><ShieldCheck className="h-3 w-3 text-[#16A34A]" /> SOC2 · GDPR · PCI-DSS</span>
          <span className="hidden md:flex items-center gap-1"><Cpu className="h-3 w-3 text-gold" /> Real-time enabled</span>
          <span className="hidden lg:flex items-center gap-1"><Globe className="h-3 w-3" /> Asia/Calcutta</span>
        </div>
      </div>
    </footer>
  );
}
