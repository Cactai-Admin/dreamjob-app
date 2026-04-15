"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Link2, SearchCheck } from "lucide-react";
import type { Workflow } from "@/lib/types";
import { cn } from "@/lib/utils";
import { labelForState, routeForWorkflow } from "@/lib/continuity";

type SortKey = "last_active" | "newest" | "company" | "role";

async function createWorkflowFromParsed(parsed: Record<string, unknown>, sourceUrl: string) {
  const wfRes = await fetch("/api/workflows", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      listing_url: sourceUrl,
      company_name: (parsed.company_name as string) ?? (parsed.company as string) ?? "",
      title: (parsed.title as string) ?? "",
      description: (parsed.description as string) ?? null,
      requirements: (parsed.requirements as string[] | string | null | undefined) ?? null,
      location: (parsed.location as string) ?? null,
      salary_range: (parsed.salary_range as string) ?? null,
      employment_type: (parsed.employment_type as string) ?? null,
      experience_level: (parsed.experience_level as string) ?? null,
      responsibilities: (parsed.responsibilities as string) ?? null,
      benefits: (parsed.benefits as string) ?? null,
      company_website_url: (parsed.company_website_url as string) ?? null,
      company_linkedin_url: (parsed.company_linkedin_url as string) ?? null,
    }),
  });
  const wf = await wfRes.json();
  if (!wfRes.ok) throw new Error(wf.error ?? "Failed to save listing");
  return wf as Workflow;
}

export default function HomePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [url, setUrl] = useState("");
  const [sort, setSort] = useState<SortKey>("last_active");
  const [workflows, setWorkflows] = useState<Workflow[]>([]);

  const loadWorkflows = () => {
    fetch("/api/workflows")
      .then((r) => r.json())
      .then((data) => setWorkflows(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadWorkflows();
  }, []);

  const rows = useMemo(() => {
    return [...workflows].sort((a, b) => {
      if (sort === "last_active") return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      if (sort === "newest") return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      if (sort === "company") return (a.listing?.company_name ?? "").localeCompare(b.listing?.company_name ?? "");
      if (sort === "role") return (a.listing?.title ?? a.title).localeCompare(b.listing?.title ?? b.title);
      return 0;
    });
  }, [workflows, sort]);

  const hasContent = rows.length > 0;

  const handleAnalyze = async () => {
    if (!url.trim() || submitting) return;
    const input = url.trim();
    setSubmitting(true);
    setError(null);
    try {
      let provider: string | undefined;
      try {
        const stored = JSON.parse(localStorage.getItem("dreamjob_settings") ?? "{}");
        if (stored.aiProvider) provider = stored.aiProvider;
      } catch {
        // ignore
      }
      const parseRes = await fetch("/api/listings/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: input, provider }),
      });
      const parsed = await parseRes.json();
      if (!parseRes.ok) throw new Error(parsed.error ?? "Failed to parse listing URL");
      const wf = await createWorkflowFromParsed(parsed, input);
      await loadWorkflows();
      router.push(`/listings/${wf.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page-wrapper max-w-1200px space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Home</h1>
        <p className="text-sm text-slate-500 mt-1">Intake new listings and track workflow progress across listings and applications.</p>
      </div>

      {!hasContent && !loading && (
        <div className="card-base p-4">
          <div className="flex items-start gap-3">
            <SearchCheck className="w-5 h-5 text-sky-600 mt-0.5" />
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Start by adding a job listing URL</h2>
              <p className="text-xs text-slate-500 mt-1">Paste one listing URL and click Analyze. DreamJob will parse the listing and open Listing Review so you can verify details before starting documents.</p>
            </div>
          </div>
        </div>
      )}

      <div className="card-base p-4 space-y-3">
        <label className="text-xs font-medium text-slate-500">Listing URL</label>
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Link2 className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://..."
              className="w-full rounded-xl border border-slate-200 pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-200"
            />
          </div>
          <button
            onClick={handleAnalyze}
            disabled={submitting || !url.trim()}
            className="btn-ocean px-4 py-2.5 text-sm font-semibold rounded-xl disabled:opacity-50"
          >
            {submitting ? "Analyzing…" : "Analyze"}
          </button>
        </div>
        {error && (
          <div className="text-xs text-red-600 inline-flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5" /> {error}
          </div>
        )}
      </div>

      {hasContent && (
        <div className="card-base overflow-hidden">
          <div className="flex items-center justify-between p-3 border-b border-slate-100">
            <h2 className="text-sm font-semibold text-slate-900">Workflow Tracker</h2>
            <div className="text-xs text-slate-500 inline-flex items-center gap-2">
              <span>Sort</span>
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
          <div className="grid grid-cols-12 gap-3 px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500 border-b border-slate-100">
            <div className="col-span-3">Company</div>
            <div className="col-span-3">Role</div>
            <div className="col-span-2">State</div>
            <div className="col-span-2">Last Active</div>
            <div className="col-span-2">Created</div>
          </div>
          {loading ? (
            <div className="p-6 text-sm text-slate-500">Loading workflow table…</div>
          ) : rows.length === 0 ? (
            <div className="p-6 text-sm text-slate-500">No workflows yet.</div>
          ) : (
            rows.map((workflow) => (
              <button
                key={workflow.id}
                onClick={() => router.push(routeForWorkflow(workflow))}
                className={cn("grid grid-cols-12 gap-3 px-4 py-3 text-left border-b border-slate-100 last:border-b-0 hover:bg-slate-50 transition-colors w-full")}
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
      )}
    </div>
  );
}
