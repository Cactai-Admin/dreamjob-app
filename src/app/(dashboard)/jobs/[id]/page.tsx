"use client";

// ── Job Detail — Full view of a job application with all actions ──

import { notFound } from "next/navigation";
import Link from "next/link";
import { useState, useEffect, use } from "react";
import { MapPin, DollarSign, ExternalLink, FileText, Mail, Download, ChevronRight, StickyNote, Building2, Users, Calendar, CircleCheck as CheckCircle2, CircleAlert as AlertCircle } from "lucide-react";
import { StatusBadge } from "@/components/jobs/status-badge";
import { DocStatusPill } from "@/components/jobs/doc-status-pill";
import { PageHeader } from "@/components/layout/page-header";
import { workflowToJob, deriveApplicationStatus } from "@/lib/workflow-adapter";
import type { ApplicationStatus, Job, Workflow } from "@/lib/types";
import { cn } from "@/lib/utils";

const STATUS_FLOW: ApplicationStatus[] = [
  "saved", "applied", "interviewing", "offer", "hired",
];

interface Props {
  params: Promise<{ id: string }>;
}

export default function JobDetailPage({ params }: Props) {
  const { id } = use(params);
  const [workflow, setWorkflow] = useState<Workflow | null>(null);
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);

  const loadWorkflow = () => {
    fetch(`/api/workflows/${id}`)
      .then(r => r.json())
      .then((wf: Workflow) => {
        if (!wf?.id) { setLoading(false); return; }
        setWorkflow(wf);
        setJob(workflowToJob(wf));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => { loadWorkflow(); }, [id]);

  const updateStatus = async (newStatus: ApplicationStatus) => {
    if (!job) return;
    // Map UI status to event_type
    const eventMap: Record<string, string> = {
      applied: "submitted",
      interviewing: "interview_scheduled",
      offer: "offer_received",
      hired: "hired",
      rejected: "rejected",
      withdrawn: "withdrawn",
    };
    const eventType = eventMap[newStatus];
    if (!eventType) return;

    await fetch(`/api/workflows/${id}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event_type: eventType }),
    });
    loadWorkflow();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-6 h-6 border-2 border-slate-300 border-t-slate-900 rounded-full animate-spin" />
      </div>
    );
  }

  if (!job || !workflow) return notFound();

  const currentStepIdx = STATUS_FLOW.indexOf(job.status);

  return (
    <div className="page-wrapper max-w-4xl">
      <PageHeader
        title={job.title}
        subtitle={job.company}
        backHref="/jobs"
        actions={<StatusBadge status={job.status} />}
      />

      {/* Progress timeline */}
      {currentStepIdx >= 0 && (
        <div className="card-base p-4 mb-5 hidden sm:block">
          <div className="flex items-center">
            {STATUS_FLOW.map((s, idx) => {
              const isCompleted = idx < currentStepIdx;
              const isCurrent   = idx === currentStepIdx;
              return (
                <div key={s} className="flex-1 flex items-center">
                  <div className="flex flex-col items-center">
                    <div className={cn(
                      "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all",
                      isCompleted ? "bg-emerald-500 border-emerald-500 text-white" :
                      isCurrent   ? "bg-sky-600 border-sky-600 text-white" :
                                    "bg-white border-slate-200 text-slate-400"
                    )}>
                      {isCompleted ? <CheckCircle2 className="w-3.5 h-3.5" /> : idx + 1}
                    </div>
                    <span className={cn(
                      "text-[10px] font-medium mt-1 capitalize",
                      isCurrent ? "text-sky-700" : isCompleted ? "text-emerald-600" : "text-slate-400"
                    )}>
                      {s}
                    </span>
                  </div>
                  {idx < STATUS_FLOW.length - 1 && (
                    <div className={cn("flex-1 h-0.5 mx-2", isCompleted ? "bg-emerald-400" : "bg-slate-200")} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-5">
        {/* Main column */}
        <div className="lg:col-span-2 space-y-5">
          {/* Company + Role info */}
          <div className="card-base p-5">
            <div className="flex items-start gap-4 mb-4">
              <div className="w-14 h-14 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden flex-shrink-0">
                {job.companyLogo ? (
                  <img src={job.companyLogo} alt={job.company} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-500 font-bold text-2xl">
                    {job.company[0]}
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="font-bold text-slate-900 text-lg leading-tight">{job.title}</h2>
                <p className="text-slate-600 font-medium">{job.company}</p>
                <div className="flex flex-wrap gap-3 mt-2 text-sm text-slate-500">
                  {job.location && (
                    <span className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5" />
                      {job.location}
                    </span>
                  )}
                  {job.salary && (
                    <span className="flex items-center gap-1.5">
                      <DollarSign className="w-3.5 h-3.5" />
                      {job.salary}
                    </span>
                  )}
                </div>
              </div>
              {job.url && (
                <a
                  href={job.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-shrink-0 flex items-center gap-1.5 text-xs text-sky-600 border border-sky-200 bg-sky-50 px-3 py-1.5 rounded-lg hover:bg-sky-100 transition-colors"
                >
                  <ExternalLink className="w-3 h-3" />
                  View
                </a>
              )}
            </div>
          </div>

          {/* Description */}
          {(job.description || job.requirements.length > 0) && (
            <div className="card-base p-5">
              <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-sky-500" />
                About the role
              </h3>
              {job.description && (
                <p className="text-slate-600 text-sm leading-relaxed">{job.description}</p>
              )}
              {job.requirements.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Requirements</h4>
                  <ul className="space-y-2">
                    {job.requirements.map((req, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                        <span className="w-1.5 h-1.5 rounded-full bg-sky-400 mt-2 flex-shrink-0" />
                        {req}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Notes */}
          <div className="card-base p-5">
            <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
              <StickyNote className="w-4 h-4 text-sky-500" />
              Notes
            </h3>
            <div className="text-slate-400 text-sm text-center py-4 border-2 border-dashed border-slate-200 rounded-xl">
              Notes coming soon…
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-4">
          {/* Application Packet */}
          <div className="card-base p-5">
            <h3 className="font-semibold text-slate-900 mb-3">Application Packet</h3>
            <div className="space-y-3">
              <Link
                href={`/jobs/${job.id}/resume`}
                className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 hover:border-sky-300 hover:bg-sky-50 transition-all group"
              >
                <div className="w-9 h-9 rounded-lg bg-sky-100 flex items-center justify-center flex-shrink-0">
                  <FileText className="w-4 h-4 text-sky-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-slate-900 text-sm">Resume</div>
                  <DocStatusPill status={job.resumeStatus} label="" />
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-sky-500 transition-colors" />
              </Link>

              <Link
                href={`/jobs/${job.id}/cover-letter`}
                className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 hover:border-sky-300 hover:bg-sky-50 transition-all group"
              >
                <div className="w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0">
                  <Mail className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-slate-900 text-sm">Cover Letter</div>
                  <DocStatusPill status={job.coverLetterStatus} label="" />
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-sky-500 transition-colors" />
              </Link>

              <Link
                href={`/jobs/${job.id}/export`}
                className="flex items-center justify-center gap-2 w-full py-2.5 bg-slate-900 text-white text-sm font-semibold rounded-xl hover:bg-slate-800 transition-colors"
              >
                <Download className="w-4 h-4" />
                Export Packet
              </Link>
            </div>
          </div>

          {/* Key dates */}
          <div className="card-base p-5">
            <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-sky-500" />
              Dates
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Created</span>
                <span className="font-medium text-slate-800">
                  {new Date(job.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Last updated</span>
                <span className="font-medium text-slate-800">
                  {new Date(job.updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </span>
              </div>
            </div>
          </div>

          {/* Update Status */}
          <div className="card-base p-5">
            <h3 className="font-semibold text-slate-900 mb-3">Update Status</h3>
            <div className="grid grid-cols-2 gap-2">
              {(["applied", "interviewing", "offer", "hired", "rejected", "withdrawn"] as ApplicationStatus[]).map((s) => (
                <button
                  key={s}
                  onClick={() => updateStatus(s)}
                  className={cn(
                    "text-xs font-medium py-2 px-3 rounded-lg border transition-all capitalize",
                    job.status === s
                      ? "border-sky-500 bg-sky-50 text-sky-700"
                      : "border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
