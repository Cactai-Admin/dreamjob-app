"use client";

// ── Analyze — Listings under review: search, sort, click to edit or delete ──

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Search, X, SlidersHorizontal, ChevronRight,
  MapPin, DollarSign, Clock, Plus, Zap,
} from "lucide-react";
import type { Workflow } from "@/lib/types";

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  const d = Math.floor(diff / 86400000);
  if (d === 0) return "Today";
  if (d === 1) return "Yesterday";
  if (d < 7) return `${d}d ago`;
  return new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function AnalyzePage() {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"recent" | "company">("recent");

  useEffect(() => {
    fetch("/api/workflows?state=listing_review")
      .then(r => r.json())
      .then((data: Workflow[]) => {
        if (Array.isArray(data)) setWorkflows(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const filtered = workflows
    .filter(wf => {
      const title = (wf.listing?.title ?? wf.title ?? "").toLowerCase();
      const company = (wf.listing?.company_name ?? wf.company?.name ?? "").toLowerCase();
      const q = search.toLowerCase();
      return title.includes(q) || company.includes(q);
    })
    .sort((a, b) => {
      if (sortBy === "company") {
        const ca = a.listing?.company_name ?? a.company?.name ?? "";
        const cb = b.listing?.company_name ?? b.company?.name ?? "";
        return ca.localeCompare(cb);
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  return (
    <div className="page-wrapper max-w-1000px">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-7">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Analyze</h1>
          <p className="text-slate-400 text-sm mt-0.5">
            {loading ? "Loading…" : `${workflows.length} listing${workflows.length !== 1 ? "s" : ""} pending review`}
          </p>
        </div>
        <Link
          href="/"
          className="flex items-center gap-2 bg-slate-900 text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-slate-800 transition-colors flex-shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>New Listing</span>
        </Link>
      </div>

      {/* Search + Sort */}
      <div className="flex flex-col sm:flex-row gap-2.5 mb-5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
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
            onChange={e => setSortBy(e.target.value as typeof sortBy)}
            className="form-input w-auto bg-white"
          >
            <option value="recent">Most recent</option>
            <option value="company">By company</option>
          </select>
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-2.5">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-24 bg-white border border-slate-200 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
            {search ? <Search className="w-5 h-5 text-slate-400" /> : <Zap className="w-5 h-5 text-slate-400" />}
          </div>
          <h3 className="font-semibold text-slate-700 mb-1">
            {search ? `No results for "${search}"` : "No listings under review"}
          </h3>
          <p className="text-slate-400 text-sm mb-4">
            {search ? "Try a different search term." : "Paste a job URL or add a listing manually from the Dashboard."}
          </p>
          {!search && (
            <Link href="/" className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 transition-colors">
              Go to Dashboard <ChevronRight className="w-4 h-4" />
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-2.5">
          {filtered.map(wf => {
            const title = wf.listing?.title ?? wf.title ?? "Untitled";
            const company = wf.listing?.company_name ?? wf.company?.name ?? "Unknown";
            const location = wf.listing?.location;
            const salary = wf.listing?.salary_range;
            const empType = wf.listing?.employment_type;
            return (
              <Link
                key={wf.id}
                href={`/listings/${wf.id}`}
                className="block group"
              >
                <div className="card-base p-4 sm:p-5 hover:border-sky-200 hover:shadow-md transition-all duration-200">
                  <div className="flex items-start gap-3">
                    {/* Company initial */}
                    <div className="flex-shrink-0 w-11 h-11 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-600 font-bold text-lg">
                      {company[0]?.toUpperCase() ?? "?"}
                    </div>

                    <div className="flex-1 min-w-0">
                      {/* Title row */}
                      <div className="flex items-start justify-between gap-2 flex-wrap">
                        <div className="min-w-0">
                          <h3 className="font-semibold text-slate-900 text-sm sm:text-base leading-tight group-hover:text-sky-700 transition-colors truncate">
                            {title}
                          </h3>
                          <p className="text-slate-500 text-sm font-medium mt-0.5">{company}</p>
                        </div>
                        <span className="text-[10px] font-semibold text-sky-700 bg-sky-50 border border-sky-200 px-2 py-1 rounded-full flex-shrink-0">
                          Pending review
                        </span>
                      </div>

                      {/* Meta */}
                      <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-slate-400">
                        {location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />{location}
                          </span>
                        )}
                        {salary && (
                          <span className="flex items-center gap-1">
                            <DollarSign className="w-3 h-3" />{salary}
                          </span>
                        )}
                        {empType && <span className="capitalize">{empType}</span>}
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Added {timeAgo(wf.created_at)}
                        </span>
                      </div>
                    </div>

                    <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-sky-400 transition-colors flex-shrink-0 mt-1" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
