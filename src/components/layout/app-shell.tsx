"use client";

// ── AppShell — Root layout with top nav ───────────────────
// Replaces sidebar + mobile-nav pattern with a unified top navigation.
// Uses a mounted gate to prevent hydration mismatches from usePathname().

import { ReactNode, useState, useEffect } from "react";
import { TopNav } from "./top-nav";
import { PrivacyScreenProvider } from "@/components/privacy-screen/privacy-screen";
import { MobileNavSlotProvider } from "@/components/layout/mobile-nav-slot";
import { DocControlsProvider } from "@/components/layout/doc-controls-slot";

interface Props {
  children: ReactNode;
}

export function AppShell({ children }: Props) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <PrivacyScreenProvider>
    <DocControlsProvider>
    <MobileNavSlotProvider>
      <div className="h-dvh bg-slate-50 flex flex-col overflow-hidden">
        {/* Top navigation — placeholder during SSR to prevent hydration mismatch */}
        {mounted ? (
          <TopNav />
        ) : (
          <div aria-hidden="true" className="top-nav-placeholder" />
        )}

        {/* Page content — overflow-y-auto lets regular pages scroll; editor pages use overflow-hidden on their root to stay viewport-locked */}
        <main className="flex-1 min-w-0 flex flex-col overflow-y-auto">
          {children}
        </main>

        {/* Spacer pushes content above the fixed mobile bottom nav — desktop: hidden */}
        <div className="block md:hidden flex-shrink-0" style={{ height: 56 }} aria-hidden="true" />
      </div>
    </MobileNavSlotProvider>
    </DocControlsProvider>
    </PrivacyScreenProvider>
  );
}
