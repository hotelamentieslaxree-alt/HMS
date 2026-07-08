// ARIA HMS — Hospitality Operating System
// This page is fully client-rendered (ssr: false) to minimize server memory.
// All modules, sidebar, etc. are lazy-loaded on the client side.

"use client";

import dynamic from "next/dynamic";

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
  return <AppShell />;
}
