"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import type { Workflow } from "@/lib/types";

type FilterKey = "all" | "listing" | "prep" | "docs" | "sent" | "archive";
type SortKey = "last_active" | "newest" | "company" | "role";

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "listing", label: "Listing Analysis" },
  { key: "prep", label: "Application Preparation" },
  { key: "docs", label: "Resume/Cover Letter Analysis" },
  { key: "sent", label: "Sent" },
  { key: "archive", label: "Archive" },
];

const PREP_STATES = new Set(["qa_intake", "draft", "active", "review", "ready"]);
const DOC_STATES = new Set(["generating", "review", "ready_to_send"]);
const SENT_STATES = new Set(["sent", "completed"]);

function labelForState(state: string) {
  if (state === "listing_review") return "Listing Analysis";
  if (PREP_STATES.has(state)) return "Application Preparation";
  if (DOC_STATES.has(state)) return "Resume/Cover Letter Analysis";
  if (SENT_STATES.has(state)) return "Sent";
  if (state === "archived") return "Archive";
  return state;
}

function routeForWorkflow(workflow: Workflow) {
  if (workflow.state === "listing_review") return `/listings/${workflow.id}`;
  if (workflow.state === "archived") return `/archive?workflow=${workflow.id}`;
  return `/jobs/${workflow.id}`;
}

export default function HomePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterKey>("all");
  const [sort, setSort] = useState<SortKey>("last_active");
  const [workflows, setWorkflows] = useState<Workflow[]>([]);

  useEffect(() => {
    fetch("/api/workflows")
      .then((r) => r.json())
      .then((data) => setWorkflows(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  }, []);

  const rows = useMemo(() => {
    const filtered = workflows.filter((workflow) => {
      if (filter === "all") return true;
      if (filter === "listing") return workflow.state === "listing_review";
      if (filter === "prep") return PREP_STATES.has(workflow.state);
      if (filter === "docs") return DOC_STATES.has(workflow.state);
      if (filter === "sent") return SENT_STATES.has(workflow.state);
      if (filter === "archive") return workflow.state === "archived";
      return true;
    });

    return filtered.sort((a, b) => {
      if (sort === "last_active") return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      if (sort === "newest") return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      if (sort === "company") return (a.listing?.company_name ?? "").localeCompare(b.listing?.company_name ?? "");
      if (sort === "role") return (a.listing?.title ?? a.title).localeCompare(b.listing?.title ?? b.title);
      return 0;
    });
  }, [workflows, filter, sort]);

  return (
    <div className="page-wrapper max-w-1200px">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Home</h1>
        <p className="text-sm text-slate-500 mt-1">Continuity view of your active and historical workflows.</p>
      </div>

      <div className="card-base p-4 mb-4 flex flex-wrap items-center gap-2">
        {FILTERS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={cn(
              "text-xs px-3 py-1.5 rounded-full border transition-colors",
              filter === key ? "bg-slate-900 text-white border-slate-900" : "border-slate-200 text-slate-600 hover:border-slate-300"
            )}
          >
            {label}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2 text-xs">
          <span className="text-slate-500">Sort</span>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className="border border-slate-200 rounded-lg px-2 py-1 bg-white text-slate-700"
          >
            <option value="last_active">Last Active</option>
            <option value="newest">Newest</option>
            <option value="company">Company</option>
            <option value="role">Role Title</option>
          </select>
        </div>
      </div>

      <div className="card-base overflow-hidden">
        <div className="grid grid-cols-12 gap-3 px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500 border-b border-slate-100">
          <div className="col-span-3">Company</div>
          <div className="col-span-3">Role</div>
          <div className="col-span-2">State</div>
          <div className="col-span-2">Last Active</div>
          <div className="col-span-2">Created</div>
        </div>
        {loading ? (
          <div className="p-6 text-sm text-slate-500">Loading continuity table…</div>
        ) : rows.length === 0 ? (
          <div className="p-6 text-sm text-slate-500">No workflows match this view yet.</div>
        ) : (
          rows.map((workflow) => (
            <button
              key={workflow.id}
              onClick={() => router.push(routeForWorkflow(workflow))}
              className="grid grid-cols-12 gap-3 px-4 py-3 text-left border-b border-slate-100 last:border-b-0 hover:bg-slate-50 transition-colors w-full"
            >
              <div className="col-span-3 text-sm text-slate-900 truncate">{workflow.listing?.company_name ?? "—"}</div>
              <div className="col-span-3 text-sm text-slate-700 truncate">{workflow.listing?.title ?? workflow.title}</div>
              <div className="col-span-2 text-xs text-slate-600">{labelForState(workflow.state)}</div>
              <div className="col-span-2 text-xs text-slate-500">{new Date(workflow.updated_at).toLocaleDateString()}</div>
              <div className="col-span-2 text-xs text-slate-500">{new Date(workflow.created_at).toLocaleDateString()}</div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
