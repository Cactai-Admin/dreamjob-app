"use client";

// ── Listings — Saved listings under review, not yet applied ──

import { useState, useEffect } from "react";
import Link from "next/link";
import { Search, X, ChevronRight, MapPin, DollarSign, Clock, Plus } from "lucide-react";
import type { Workflow } from "@/lib/types";
import { cn } from "@/lib/utils";

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  const d = Math.floor(diff / 86400000);
  if (d === 0) return "Today";
  if (d === 1) return "Yesterday";
  if (d < 7) return `${d} days ago`;
  return new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function ListingsPage() {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/workflows?state=listing_review")
      .then(r => r.json())
      .then((data: Workflow[]) => {
        if (Array.isArray(data)) setWorkflows(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const filtered = workflows.filter(wf => {
    const title = (wf.listing?.title ?? wf.title ?? "").toLowerCase();
    const company = (wf.listing?.company_name ?? wf.company?.name ?? "").toLowerCase();
    const q = search.toLowerCase();
    return title.includes(q) || company.includes(q);
  });

  return (
    <div className="page-wrapper max-w-1000px">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-7">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Jobs</h1>
          <p className="text-slate-400 text-sm mt-0.5">
            {loading ? "Loading…" : `${workflows.length} listing${workflows.length !== 1 ? "s" : ""} under review`}
          </p>
        </div>
        <Link
          href="/"
          className="flex items-center gap-2 bg-slate-900 text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-slate-800 transition-colors flex-shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Add Listing</span>
        </Link>
      </div>

      {/* Search */}
      <div className="relative mb-5">
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
            <Search className="w-5 h-5 text-slate-400" />
          </div>
          <h3 className="font-semibold text-slate-700 mb-1">
            {search ? `No results for "${search}"` : "No listings yet"}
          </h3>
          <p className="text-slate-400 text-sm mb-4">
            {search ? "Try a different search." : "Paste a job URL on the home page to add your first listing."}
          </p>
          {!search && (
            <Link href="/" className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 transition-colors">
              Add a listing <ChevronRight className="w-4 h-4" />
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-2.5">
          {filtered.map(wf => {
            const title = wf.listing?.title ?? wf.title ?? "Untitled";
            const company = wf.listing?.company_name ?? wf.company?.name ?? "Unknown Company";
            const location = wf.listing?.location;
            const salary = wf.listing?.salary_range;
            const empType = wf.listing?.employment_type;
            return (
              <Link
                key={wf.id}
                href={`/listings/${wf.id}`}
                className="flex items-center gap-4 p-4 bg-white border border-slate-200 rounded-xl hover:border-slate-300 hover:shadow-sm transition-all group"
              >
                {/* Company logo / initial */}
                <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center flex-shrink-0 text-slate-500 font-bold text-sm">
                  {company[0]?.toUpperCase() ?? "?"}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-slate-900 text-sm truncate">{title}</div>
                  <div className="text-slate-500 text-xs mt-0.5">{company}</div>
                  {(location || salary || empType) && (
                    <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-400">
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
                    </div>
                  )}
                </div>

                {/* Date + arrow */}
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className="text-xs text-slate-400 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {timeAgo(wf.created_at)}
                  </span>
                  <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 transition-colors" />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
