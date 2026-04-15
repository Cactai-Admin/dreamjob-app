"use client";

// ── AppShell — Root layout with top nav ───────────────────
// Replaces sidebar + mobile-nav pattern with a unified top navigation.
// Keeps shared providers + top nav stable while pages own their stage flows.

import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { TopNav } from "./top-nav";
import { PrivacyScreenProvider } from "@/components/privacy-screen/privacy-screen";
import { MobileNavSlotProvider } from "@/components/layout/mobile-nav-slot";
import { DocControlsProvider } from "@/components/layout/doc-controls-slot";
import { ContinuitySidebar } from "@/components/layout/continuity-sidebar";
import { WorkspaceAssistantRail } from "@/components/layout/workspace-assistant-rail";

interface Props {
  children: ReactNode;
}

export function AppShell({ children }: Props) {
  const pathname = usePathname();
  const isHome = pathname === "/home";
  const [continuityOpen, setContinuityOpen] = useState(false);
  const showProfileAssistant = pathname.startsWith("/profile");
  const showCareerAssistant = pathname.startsWith("/career-advancement");
  const assistantMode = useMemo(() => {
    if (showProfileAssistant) return "profile" as const;
    if (showCareerAssistant) return "career" as const;
    return null;
  }, [showProfileAssistant, showCareerAssistant]);

  return (
    <PrivacyScreenProvider>
    <DocControlsProvider>
    <MobileNavSlotProvider>
      <div className="h-dvh bg-slate-50 flex flex-col overflow-hidden">
        <TopNav />

        {/* Page content — overflow-y-auto lets regular pages scroll; editor pages use overflow-hidden on their root to stay viewport-locked */}
        <main className="flex-1 min-w-0 flex overflow-hidden">
          {!isHome && <ContinuitySidebar open={continuityOpen} onToggle={() => setContinuityOpen((value) => !value)} />}
          <div className="flex-1 min-w-0 flex flex-col overflow-y-auto">
            {children}
          </div>
          {assistantMode && (
            <div className="hidden xl:flex xl:w-[360px] xl:border-l xl:border-slate-200">
              <WorkspaceAssistantRail mode={assistantMode} />
            </div>
          )}
        </main>
      </div>
    </MobileNavSlotProvider>
    </DocControlsProvider>
    </PrivacyScreenProvider>
  );
}
