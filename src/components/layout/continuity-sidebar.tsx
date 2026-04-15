"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ChevronDown, ChevronRight, Briefcase, Layers } from "lucide-react";
import type { Workflow } from "@/lib/types";
import { routeForWorkflow, splitContinuity } from "@/lib/continuity";
import { cn } from "@/lib/utils";

export function ContinuitySidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [openListings, setOpenListings] = useState(true);
  const [openApplications, setOpenApplications] = useState(true);

  useEffect(() => {
    fetch("/api/workflows")
      .then((res) => res.json())
      .then((data) => setWorkflows(Array.isArray(data) ? data : []))
      .catch(() => setWorkflows([]));
  }, [pathname]);

  const { listings, applications } = useMemo(
    () => splitContinuity(workflows),
    [workflows]
  );

  const renderRow = (workflow: Workflow) => {
    const route = routeForWorkflow(workflow);
    const active = pathname === route || pathname.startsWith(`${route}/`);
    return (
      <button
        key={workflow.id}
        onClick={() => router.push(route)}
        className={cn(
          "w-full text-left rounded-lg px-2.5 py-2 transition-colors border",
          active
            ? "bg-sky-50 border-sky-200 text-sky-900"
            : "bg-white border-transparent hover:bg-slate-100 text-slate-700"
        )}
      >
        <div className="text-xs font-semibold truncate">{workflow.listing?.company_name ?? "Unknown"}</div>
        <div className="text-[11px] text-slate-500 truncate">{workflow.listing?.title ?? workflow.title}</div>
      </button>
    );
  };

  return (
    <aside className="hidden lg:flex lg:w-72 lg:flex-col lg:border-r lg:border-slate-200 bg-white/90">
      <div className="px-3 py-3 border-b border-slate-100">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Continuity</h2>
      </div>
      <div className="p-3 space-y-3 overflow-y-auto">
        <section className="space-y-2">
          <button
            onClick={() => setOpenListings((v) => !v)}
            className="w-full flex items-center justify-between text-xs font-semibold text-slate-700"
          >
            <span className="inline-flex items-center gap-1.5"><Layers className="w-3.5 h-3.5" />Listings ({listings.length})</span>
            {openListings ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </button>
          {openListings && (
            <div className="space-y-1">
              {listings.length === 0 ? <p className="text-[11px] text-slate-400 px-1">No listings in review.</p> : listings.map(renderRow)}
            </div>
          )}
        </section>

        <section className="space-y-2">
          <button
            onClick={() => setOpenApplications((v) => !v)}
            className="w-full flex items-center justify-between text-xs font-semibold text-slate-700"
          >
            <span className="inline-flex items-center gap-1.5"><Briefcase className="w-3.5 h-3.5" />Applications ({applications.length})</span>
            {openApplications ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </button>
          {openApplications && (
            <div className="space-y-1">
              {applications.length === 0 ? <p className="text-[11px] text-slate-400 px-1">No active applications.</p> : applications.map(renderRow)}
            </div>
          )}
        </section>
      </div>
    </aside>
  );
}
