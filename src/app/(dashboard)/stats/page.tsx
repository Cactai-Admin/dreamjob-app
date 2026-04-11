"use client";

// ── Stats — Usage statistics and application pipeline insights ──

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowRight, Briefcase, Calendar, Target, Trophy, TrendingUp } from "lucide-react";
import { StatusBadge } from "@/components/jobs/status-badge";
import { workflowToJob } from "@/lib/workflow-adapter";
import type { ApplicationStatus, Workflow, Job } from "@/lib/types";

const STATUS_ORDER: ApplicationStatus[] = [
  "ready", "applied", "received", "interviewing", "offer", "negotiating",
  "hired", "declined", "ghosted", "rejected",
];

const STATUS_LABELS: Record<ApplicationStatus, string> = {
  ready: "Ready", applied: "Applied", received: "Received",
  interviewing: "Interviewing", offer: "Offer", negotiating: "Negotiating",
  hired: "Hired", declined: "Declined", ghosted: "Ghosted", rejected: "Rejected",
};

const STATUS_COLORS: Record<ApplicationStatus, string> = {
  ready: "bg-blue-400", applied: "bg-sky-500", received: "bg-violet-500",
  interviewing: "bg-amber-400", offer: "bg-emerald-500", negotiating: "bg-teal-500",
  hired: "bg-green-600", declined: "bg-orange-400", ghosted: "bg-slate-300", rejected: "bg-red-400",
};

const STATUS_TEXT: Record<ApplicationStatus, string> = {
  ready: "text-blue-700", applied: "text-sky-700", received: "text-violet-700",
  interviewing: "text-amber-700", offer: "text-emerald-700", negotiating: "text-teal-700",
  hired: "text-green-700", declined: "text-orange-700", ghosted: "text-slate-500", rejected: "text-red-700",
};

export default function StatsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/workflows")
      .then(r => r.json())
      .then((workflows: Workflow[]) => {
        if (Array.isArray(workflows)) setJobs(workflows.map(workflowToJob));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const total = jobs.length;
  const active = jobs.filter(j => !["hired", "declined", "rejected", "ghosted"].includes(j.status)).length;
  const interviews = jobs.filter(j => j.status === "interviewing").length;
  const offers = jobs.filter(j => j.status === "offer" || j.status === "hired").length;
  const successRate = total > 0 ? Math.round((offers / total) * 100) : 0;
  const responseRate = total > 0 ? Math.round(((interviews + offers) / total) * 100) : 0;

  const pipelineCounts = STATUS_ORDER.map(status => ({
    status,
    count: jobs.filter(j => j.status === status).length,
  }));
  const maxCount = Math.max(...pipelineCounts.map(p => p.count), 1);

  const STAT_CARDS = [
    { label: "Total Applied", value: total,     icon: Briefcase, note: "All time" },
    { label: "Active",        value: active,     icon: Target,    note: "Ongoing" },
    { label: "Interviews",    value: interviews, icon: Calendar,  note: `${responseRate}% response rate` },
    { label: "Offers",        value: offers,     icon: Trophy,    note: `${successRate}% success rate` },
  ];

  return (
    <div className="page-wrapper max-w-3xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Stats</h1>
        <p className="text-slate-400 text-sm mt-0.5">Your application performance at a glance</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        {STAT_CARDS.map(({ label, value, icon: Icon, note }) => (
          <div key={label} className="card-base p-4">
            <div className="flex items-start justify-between mb-3">
              <span className="text-xs font-medium text-slate-500">{label}</span>
              <Icon className="w-4 h-4 text-slate-300" />
            </div>
            <div className="text-3xl font-bold text-slate-900 tracking-tight mb-0.5">
              {loading ? "—" : value}
            </div>
            <div className="text-xs text-slate-400">{note}</div>
          </div>
        ))}
      </div>

      {/* Pipeline funnel */}
      <div className="card-base p-6 mb-6">
        <div className="flex items-center gap-2 mb-5">
          <TrendingUp className="w-4 h-4 text-slate-400" />
          <h2 className="font-semibold text-slate-900 text-sm">Pipeline breakdown</h2>
        </div>
        <div className="space-y-3">
          {pipelineCounts.map(({ status, count }) => (
            <div key={status} className="flex items-center gap-4">
              <div className="w-24 text-xs text-slate-500 text-right flex-shrink-0">
                {STATUS_LABELS[status]}
              </div>
              <div className="flex-1 h-7 bg-slate-100 rounded-lg overflow-hidden relative">
                <div
                  className={`h-full rounded-lg transition-all duration-700 ${STATUS_COLORS[status]}`}
                  style={{ width: count === 0 ? 0 : `${Math.max(6, (count / maxCount) * 100)}%` }}
                />
                {count > 0 && (
                  <span className={`absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold ${STATUS_TEXT[status]}`}>
                    {count}
                  </span>
                )}
              </div>
              <div className="w-6 text-xs font-semibold text-slate-400 text-center flex-shrink-0">
                {count === 0 && "—"}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Conversion metrics */}
      <div className="grid sm:grid-cols-2 gap-4 mb-6">
        <div className="card-base p-5">
          <div className="flex items-center gap-2 mb-4">
            <Trophy className="w-4 h-4 text-slate-400" />
            <h3 className="font-semibold text-slate-900 text-sm">Success rate</h3>
          </div>
          <div className="text-4xl font-bold text-slate-900 tracking-tight mb-1">{successRate}%</div>
          <p className="text-xs text-slate-400 mb-4">Offer or hire from applications sent</p>
          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-slate-900 rounded-full transition-all duration-1000" style={{ width: `${successRate}%` }} />
          </div>
        </div>

        <div className="card-base p-5">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="w-4 h-4 text-slate-400" />
            <h3 className="font-semibold text-slate-900 text-sm">Response rate</h3>
          </div>
          <div className="text-4xl font-bold text-slate-900 tracking-tight mb-1">{responseRate}%</div>
          <p className="text-xs text-slate-400 mb-4">Applications that led to an interview</p>
          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-slate-700 rounded-full transition-all duration-1000" style={{ width: `${responseRate}%` }} />
          </div>
        </div>
      </div>

      {/* All applications table */}
      <div className="card-base overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h3 className="font-semibold text-slate-900 text-sm">All applications</h3>
          <Link href="/jobs" className="text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1 transition-colors">
            Manage <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        <div className="divide-y divide-slate-50">
          {loading && (
            <div className="px-5 py-4 text-slate-400 text-sm">Loading…</div>
          )}
          {!loading && jobs.length === 0 && (
            <div className="px-5 py-6 text-slate-400 text-sm text-center">No applications yet.</div>
          )}
          {jobs.map((job) => (
            <Link key={job.id} href={`/jobs/${job.id}`}
              className="flex items-center gap-3 px-5 py-3.5 hover:bg-slate-50 transition-colors group"
            >
              <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden flex-shrink-0">
                {job.companyLogo ? (
                  <img src={job.companyLogo} alt={job.company} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-500 font-bold text-sm">
                    {job.company[0]}
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-slate-900 truncate">{job.title}</div>
                <div className="text-xs text-slate-400">{job.company}</div>
              </div>
              <div className="flex-shrink-0">
                <StatusBadge status={job.status} size="sm" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
