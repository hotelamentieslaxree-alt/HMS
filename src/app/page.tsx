// ARIA HMS — Hospitality Operating System
// This page is fully client-rendered (ssr: false) to minimize server memory.
// All modules, sidebar, etc. are lazy-loaded on the client side.

"use client";

import dynamic from "next/dynamic";
import { Component, ReactNode } from "react";

// ─── Global Error Boundary ──────────────────────────────────────────
// Prevents white blank page if any component crashes during render
class GlobalErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean; error: Error | null }
> {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error("[ARIA HMS] Unhandled error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      const isJsonError = this.state.error?.message?.includes("Unexpected token");
      return (
        <div className="min-h-screen flex items-center justify-center bg-[#0A0F1C] p-4">
          <div className="max-w-md text-center">
            <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-2xl bg-destructive/10 mb-4">
              <svg className="h-8 w-8 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Something went wrong</h2>
            <p className="text-sm text-white/60 mb-4">
              {isJsonError
                ? "A network error occurred. The server might be starting up — please wait a moment and try again."
                : this.state.error?.message || "An unexpected error occurred."}
            </p>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
              className="rounded-lg bg-gradient-to-r from-[#C9952A] to-[#F0C96A] px-6 py-2.5 text-sm font-bold text-[#0A0F1C] hover:shadow-[0_0_24px_rgba(201,149,42,0.25)] transition-all"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const AppShell = dynamic(
  () => import("@/components/hms/app-shell").then((m) => ({ default: m.AppShell })),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-screen flex items-center justify-center bg-[#0A0F1C]">
        <div className="flex flex-col items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#C9952A] to-[#F0C96A] text-[#0A0F1C] font-bold text-xl shadow-[0_0_24px_rgba(201,149,42,0.25)]">
            A
          </div>
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/20 border-t-[#C9952A]" />
          <p className="text-xs text-white/40">Loading ARIA HMS…</p>
        </div>
      </div>
    ),
  }
);

export default function Home() {
  return (
    <GlobalErrorBoundary>
      <AppShell />
    </GlobalErrorBoundary>
  );
}
