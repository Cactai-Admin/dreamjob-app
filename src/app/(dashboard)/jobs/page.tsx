"use client";

// ── Applications — All job applications with search and filter ──

import { useState, useEffect } from "react";
import Link from "next/link";
import { Search, X, SlidersHorizontal, ChevronRight } from "lucide-react";
import { JobCard } from "@/components/jobs/job-card";
import { StatusBadge } from "@/components/jobs/status-badge";
import { workflowToJob } from "@/lib/workflow-adapter";
import type { ApplicationStatus, Workflow, Job } from "@/lib/types";

const ALL_STATUSES: ApplicationStatus[] = [
  "ready", "applied", "received", "interviewing", "offer", "negotiating",
  "hired", "declined", "ghosted", "rejected",
];

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<ApplicationStatus | "all">("all");
  const [sortBy, setSortBy] = useState<"recent" | "status">("recent");
  const [hasListings, setHasListings] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/workflows?state=!listing_review").then(r => r.json()),
      fetch("/api/workflows?state=listing_review").then(r => r.json()),
    ]).then(([active, listings]) => {
      if (Array.isArray(active)) setJobs(active.map(workflowToJob));
      if (Array.isArray(listings)) setHasListings(listings.length > 0);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const filtered = jobs
    .filter((job) => {
      const matchesSearch =
        job.title.toLowerCase().includes(search.toLowerCase()) ||
        job.company.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = activeFilter === "all" || job.status === activeFilter;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      if (sortBy === "status") return ALL_STATUSES.indexOf(a.status) - ALL_STATUSES.indexOf(b.status);
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });

  return (
    <div className="page-wrapper max-w-1000px">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-7">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Applications</h1>
          <p className="text-slate-400 text-sm mt-0.5">{loading ? "Loading…" : `${jobs.length} total`}</p>
        </div>
        <Link
          href="/"
          className="flex items-center gap-2 bg-slate-900 text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-slate-800 transition-colors flex-shrink-0"
        >
          <span>+ New</span>
        </Link>
      </div>

      {/* Search + Sort */}
      <div className="flex flex-col sm:flex-row gap-2.5 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title or company…"
            className="form-input pl-9"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-slate-400 flex-shrink-0" />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="form-input w-auto bg-white"
          >
            <option value="recent">Most recent</option>
            <option value="status">By status</option>
          </select>
        </div>
      </div>

      {/* Status filter chips */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2 mb-5">
        <button
          onClick={() => setActiveFilter("all")}
          className={`flex-shrink-0 text-xs font-semibold px-3.5 py-1.5 rounded-full border transition-all ${
            activeFilter === "all"
              ? "bg-slate-900 text-white border-slate-900"
              : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
          }`}
        >
          All ({jobs.length})
        </button>
        {ALL_STATUSES.map((status) => {
          const count = jobs.filter((j) => j.status === status).length;
          if (count === 0) return null;
          return (
            <button key={status} onClick={() => setActiveFilter(status === activeFilter ? "all" : status)} className="flex-shrink-0">
              <StatusBadge status={status} size="sm" />
            </button>
          );
        })}
      </div>

      {/* Results */}
      {loading ? (
        <div className="space-y-2.5">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-24 bg-white border border-slate-200 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
            <Search className="w-5 h-5 text-slate-400" />
          </div>
          <h3 className="font-semibold text-slate-700 mb-1">No applications found</h3>
          <p className="text-slate-400 text-sm">
            {search ? `No results for "${search}"` : jobs.length === 0 ? "Add a listing from the Dashboard to get started." : "Try a different filter"}
          </p>
          <Link href={hasListings ? "/listings" : "/"} className="inline-flex items-center gap-2 mt-4 text-sm text-slate-600 hover:text-slate-900 transition-colors">
            {hasListings ? "Review a listing" : "Go to Dashboard"} <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filtered.map((job) => (
            <div key={job.id}>
              <JobCard job={job} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
