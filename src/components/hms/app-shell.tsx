// ARIA HMS — App Shell — Hospitality Operating System
// Ultra-lightweight shell: modules loaded through dynamically-imported registry.
// The shell itself imports ZERO modules — only the registry knows about them,
// and the registry is loaded on-demand via Next.js dynamic().
"use client";

import dynamic from "next/dynamic";
import { useAppStore, ROLE_MODULES, ModuleKey } from "@/lib/store";
import { useApi } from "@/lib/api";
import { Globe, ShieldCheck, Cpu, Brain, AlertTriangle, RefreshCw } from "lucide-react";
import { Component, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

// ─── Shell components — lightweight dynamic wrappers ──────────────────
const Sidebar = dynamic(() => import("./sidebar").then(m => ({ default: m.Sidebar })), { ssr: false, loading: SidebarSkeleton });
const Topbar = dynamic(() => import("./topbar").then(m => ({ default: m.Topbar })), { ssr: false, loading: TopbarSkeleton });
const RealtimeToasts = dynamic(() => import("./realtime-toasts").then(m => ({ default: m.RealtimeToasts })), { ssr: false });
const CommandPalette = dynamic(() => import("./command-palette").then(m => ({ default: m.CommandPalette })), { ssr: false });
const LoginPage = dynamic(() => import("./login-page").then(m => ({ default: m.LoginPage })), { ssr: false, loading: FullPageSkeleton });

// ─── Module Loader — loads modules through dynamic registry ──────────
function ModuleLoader({ moduleKey }: { moduleKey: ModuleKey }) {
  const [Comp, setComp] = useState<React.ComponentType | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setComp(null);

    // Dynamically import the registry, then load the specific module
    import("./module-registry").then(reg => {
      return reg.loadModule(moduleKey);
    }).then(comp => {
      if (!cancelled) { setComp(() => comp); setLoading(false); }
    }).catch(err => {
      if (!cancelled) { setError(err); setLoading(false); }
    });

    return () => { cancelled = true; };
  }, [moduleKey]);

  if (error) {
    const label = moduleKey.replace(/-/g, " ").replace(/\b\w/g, l => l.toUpperCase());
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10 mb-4">
          <AlertTriangle className="h-8 w-8 text-destructive" />
        </div>
        <h3 className="font-display text-lg font-bold text-foreground mb-2">Module Load Error</h3>
        <p className="text-sm text-muted-foreground max-w-md mb-4">
          The &quot;{label}&quot; module failed to load. It may still be compiling — please try again.
        </p>
        <Button
          variant="outline"
          onClick={() => {
            setError(null); setLoading(true);
            import("./module-registry").then(reg => reg.loadModule(moduleKey))
              .then(c => { setComp(() => c); setLoading(false); })
              .catch(e => { setError(e); setLoading(false); });
          }}
          className="gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Retry
        </Button>
      </div>
    );
  }

  if (loading || !Comp) return <ModuleSkeleton />;
  return <Comp />;
}

// ─── Skeletons ────────────────────────────────────────────────────────
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

function FullPageSkeleton() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0A0F1C]">
      <div className="flex flex-col items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#C9952A] to-[#F0C96A] text-[#0A0F1C] font-bold text-xl shadow-[0_0_24px_rgba(201,149,42,0.25)]">A</div>
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/20 border-t-[#C9952A]" />
      </div>
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

// ─── Main Shell ───────────────────────────────────────────────────────
export function AppShell() {
  const { user, isAuthenticated, activeModule, setActiveModule, role, enabledModules } = useAppStore();
  const { data: prop } = useApi(isAuthenticated ? "/api/dashboard" : null, []);
  const propertyId = user?.property?.id;

  const allowedModules = ROLE_MODULES[role] ?? ROLE_MODULES.gm;
  useEffect(() => {
    if (isAuthenticated) {
      const isVisible = allowedModules.includes(activeModule) && enabledModules.includes(activeModule);
      if (!isVisible) setActiveModule("dashboard");
    }
  }, [role, isAuthenticated, allowedModules, activeModule, setActiveModule, enabledModules]);

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return (
    <div className="flex min-h-screen bg-surface">
      <Sidebar />
      <div className="flex flex-1 flex-col min-w-0">
        <Topbar propertyId={propertyId} />
        <main className="flex-1 overflow-x-hidden">
          <div className="mx-auto max-w-[1600px] px-4 py-6 lg:px-8 lg:py-8">
            <ModuleLoader moduleKey={activeModule} />
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
