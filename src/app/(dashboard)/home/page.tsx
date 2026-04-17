"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Link2, SearchCheck, Trash2 } from "lucide-react";
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
      parsed_data: (parsed.parsed_data as Record<string, unknown>) ?? {
        parse_trace: (parsed.parse_trace as Record<string, unknown>) ?? null,
        parse_quality: (parsed.parse_quality as string) ?? null,
      },
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
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [bulkDeleteError, setBulkDeleteError] = useState<string | null>(null);

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
  const allSelected = rows.length > 0 && selectedIds.length === rows.length;
  const selectedCount = selectedIds.length;

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

  const toggleSelectAll = () => {
    setSelectedIds((prev) => (prev.length === rows.length ? [] : rows.map((workflow) => workflow.id)));
  };

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]));
  };

  const handleBulkSoftDelete = async () => {
    if (selectedIds.length === 0 || bulkDeleting) return;
    setBulkDeleting(true);
    setBulkDeleteError(null);
    try {
      const failedIds: string[] = [];
      await Promise.all(selectedIds.map(async (id) => {
        const response = await fetch(`/api/workflows/${id}`, { method: "DELETE" });
        if (!response.ok) failedIds.push(id);
      }));
      setWorkflows((prev) => prev.filter((workflow) => !selectedIds.includes(workflow.id)));
      if (failedIds.length > 0) {
        setBulkDeleteError(`${failedIds.length} of ${selectedIds.length} items could not be moved to Trash. Please retry those items.`);
        setSelectedIds(failedIds);
      } else {
        setSelectedIds([]);
      }
      setConfirmBulkDelete(false);
    } finally {
      setBulkDeleting(false);
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

      <form
        className="card-base p-4 space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          void handleAnalyze();
        }}
      >
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
            type="submit"
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
      </form>

      {submitting && (
        <div className="card-base p-6">
          <div className="mx-auto max-w-xl text-center">
            <div className="mx-auto h-12 w-12 rounded-full border-2 border-slate-300 border-t-slate-900 animate-spin" />
            <h2 className="mt-4 text-sm font-semibold text-slate-900">Parsing listing details…</h2>
            <p className="mt-1 text-xs text-slate-500">This usually takes a few seconds while we extract role and requirement structure.</p>
          </div>
        </div>
      )}

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
          {selectedCount > 0 && (
            <div className="px-4 py-3 border-b border-slate-100 bg-amber-50 text-xs text-amber-900 space-y-2">
              <p>
                <span className="font-semibold">{selectedCount}</span> selected. “Move to Trash” is a soft delete with 30-day recovery.
                Permanent removal only happens from Trash.
              </p>
              {confirmBulkDelete ? (
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleBulkSoftDelete}
                    disabled={bulkDeleting}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 text-white font-semibold hover:bg-red-700 disabled:opacity-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    {bulkDeleting ? "Moving…" : "Yes, move to Trash"}
                  </button>
                  <button
                    onClick={() => setConfirmBulkDelete(false)}
                    className="px-3 py-1.5 rounded-lg border border-amber-300 text-amber-900 hover:bg-amber-100"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmBulkDelete(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-200 text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Move selected to Trash
                </button>
              )}
            </div>
          )}
          {bulkDeleteError ? (
            <div className="px-4 py-2 text-xs text-red-700 bg-red-50 border-b border-red-100">
              {bulkDeleteError}
            </div>
          ) : null}
          <div className="grid grid-cols-12 gap-3 px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500 border-b border-slate-100">
            <div className="col-span-1">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={toggleSelectAll}
                aria-label="Select all workflows"
                className="h-4 w-4 rounded border-slate-300"
              />
            </div>
            <div className="col-span-2">Company</div>
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
              <div
                key={workflow.id}
                className={cn("grid grid-cols-12 gap-3 px-4 py-3 border-b border-slate-100 last:border-b-0 hover:bg-slate-50 transition-colors")}
              >
                <div className="col-span-1 flex items-center">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(workflow.id)}
                    onChange={() => toggleSelection(workflow.id)}
                    aria-label={`Select ${workflow.listing?.company_name ?? workflow.title}`}
                    className="h-4 w-4 rounded border-slate-300"
                  />
                </div>
                <button
                  onClick={() => router.push(routeForWorkflow(workflow))}
                  className="col-span-11 grid grid-cols-11 gap-3 text-left"
                >
                  <div className="col-span-2 text-sm text-slate-900 truncate">{workflow.listing?.company_name ?? "—"}</div>
                  <div className="col-span-3 text-sm text-slate-700 truncate">{workflow.listing?.title ?? workflow.title}</div>
                  <div className="col-span-2 text-xs text-slate-600">{labelForState(workflow.state)}</div>
                  <div className="col-span-2 text-xs text-slate-500">{new Date(workflow.updated_at).toLocaleDateString()}</div>
                  <div className="col-span-2 text-xs text-slate-500">{new Date(workflow.created_at).toLocaleDateString()}</div>
                </button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
