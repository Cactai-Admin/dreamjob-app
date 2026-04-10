"use client";

// ── AppShell — Root layout with top nav ───────────────────
// Replaces sidebar + mobile-nav pattern with a unified top navigation.
// Uses a mounted gate to prevent hydration mismatches from usePathname().

import { ReactNode, useState, useEffect } from "react";
import { TopNav } from "./top-nav";

interface Props {
  children: ReactNode;
}

export function AppShell({ children }: Props) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top navigation — placeholder during SSR to prevent hydration mismatch */}
      {mounted ? (
        <TopNav />
      ) : (
        <div aria-hidden="true" className="top-nav-placeholder" />
      )}

      {/* Page content — flex-col so children can fill remaining height with flex-1 */}
      <main className="flex-1 min-w-0 flex flex-col">
        {children}
      </main>

      {/* Spacer pushes content above the fixed mobile bottom nav — desktop: hidden */}
      <div className="block md:hidden flex-shrink-0" style={{ height: 56 }} aria-hidden="true" />
    </div>
  );
}
