"use client";

// ── AppShell — Root layout with top nav ───────────────────
// Replaces sidebar + mobile-nav pattern with a unified top navigation.
// Keeps shared providers + top nav stable while pages own their stage flows.

import type { ReactNode } from "react";
import { TopNav } from "./top-nav";
import { PrivacyScreenProvider } from "@/components/privacy-screen/privacy-screen";
import { MobileNavSlotProvider } from "@/components/layout/mobile-nav-slot";
import { DocControlsProvider } from "@/components/layout/doc-controls-slot";

interface Props {
  children: ReactNode;
}

export function AppShell({ children }: Props) {
  return (
    <PrivacyScreenProvider>
    <DocControlsProvider>
    <MobileNavSlotProvider>
      <div className="h-dvh bg-slate-50 flex flex-col overflow-hidden">
        <TopNav />

        {/* Page content — overflow-y-auto lets regular pages scroll; editor pages use overflow-hidden on their root to stay viewport-locked */}
        <main className="flex-1 min-w-0 flex flex-col overflow-y-auto">
          {children}
        </main>
      </div>
    </MobileNavSlotProvider>
    </DocControlsProvider>
    </PrivacyScreenProvider>
  );
}
