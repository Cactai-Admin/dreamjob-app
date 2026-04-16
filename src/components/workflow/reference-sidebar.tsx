"use client";

import type { ReactNode } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export interface ReferenceTab {
  value: string;
  label: string;
  content: ReactNode;
}

interface ReferenceSidebarProps {
  title?: string;
  tabs: ReferenceTab[];
  defaultTab?: string;
  footerNote?: string;
  widthClassName?: string;
}

export function ReferenceSidebar({
  title = "Reference context",
  tabs,
  defaultTab,
  footerNote,
  widthClassName = "w-[280px]",
}: ReferenceSidebarProps) {
  if (tabs.length === 0) return null;

  const fallbackTab = defaultTab && tabs.some((tab) => tab.value === defaultTab)
    ? defaultTab
    : tabs[0]?.value;

  if (!fallbackTab) return null;

  return (
    <aside className={`hidden lg:block ${widthClassName} border-r border-slate-200 bg-white p-4 overflow-y-auto`}>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{title}</p>
      <Tabs defaultValue={fallbackTab} className="mt-3">
        <TabsList className="grid h-auto w-full grid-cols-2 gap-1 bg-slate-100 p-1">
          {tabs.map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className="h-auto rounded-md px-2 py-1 text-[11px] leading-tight data-[state=active]:bg-white"
            >
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {tabs.map((tab) => (
          <TabsContent key={tab.value} value={tab.value} className="mt-3">
            {tab.content}
          </TabsContent>
        ))}
      </Tabs>

      {footerNote ? <p className="text-[11px] text-slate-500 mt-4">{footerNote}</p> : null}
    </aside>
  );
}
