"use client";

// ── JobCard — Card component for an application in the list ──

import Link from "next/link";
import { MapPin, DollarSign, Clock, ExternalLink } from "lucide-react";
import { StatusBadge } from "./status-badge";
import { DocStatusPill } from "./doc-status-pill";
import type { Job } from "@/lib/types";
import { cn } from "@/lib/utils";

interface Props {
  job: Job;
  compact?: boolean;
}

const locationTypeLabel = {
  remote: "Remote",
  hybrid: "Hybrid",
  onsite: "On-site",
};

export function JobCard({ job, compact = false }: Props) {
  return (
    <Link
      href={`/jobs/${job.id}`}
      className="block group"
    >
      <div className={cn(
        "card-base p-4 sm:p-5 hover:border-sky-200 hover:shadow-md transition-all duration-200",
        compact && "p-4"
      )}>
        <div className="flex items-start gap-3">
          {/* Company avatar */}
          <div className="flex-shrink-0 w-11 h-11 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden">
            {job.companyLogo ? (
              <img
                src={job.companyLogo}
                alt={job.company}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-500 font-bold text-lg">
                {job.company[0]}
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            {/* Title row */}
            <div className="flex items-start justify-between gap-2 flex-wrap">
              <div className="min-w-0">
                <h3 className="font-semibold text-slate-900 text-sm sm:text-base leading-tight group-hover:text-sky-700 transition-colors truncate">
                  {job.title}
                </h3>
                <p className="text-slate-500 text-sm font-medium mt-0.5">{job.company}</p>
              </div>
              <StatusBadge status={job.status} />
            </div>

            {/* Meta info */}
            <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-slate-400">
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {job.location} · {locationTypeLabel[job.locationType]}
              </span>
              {job.salary && (
                <span className="flex items-center gap-1">
                  <DollarSign className="w-3 h-3" />
                  {job.salary}
                </span>
              )}
              {job.appliedDate && (
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Applied {new Date(job.appliedDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </span>
              )}
            </div>

            {/* Document status */}
            {!compact && (
              <div className="flex flex-wrap gap-2 mt-3">
                <DocStatusPill status={job.resumeStatus} label="Resume" />
                <DocStatusPill status={job.coverLetterStatus} label="Cover Letter" />
              </div>
            )}

            {/* Notes preview */}
            {job.notes && !compact && (
              <p className="mt-2 text-xs text-slate-400 line-clamp-1 italic">
                {job.notes}
              </p>
            )}
          </div>
        </div>

        {/* External link */}
        {job.url && !compact && (
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
            <div className="flex flex-wrap gap-1.5">
              {job.tags.slice(0, 3).map((tag) => (
                <span key={tag} className="text-[10px] font-medium bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
                  {tag}
                </span>
              ))}
            </div>
            <span className="flex items-center gap-1 text-xs text-slate-400 hover:text-sky-600 transition-colors">
              <ExternalLink className="w-3 h-3" />
              View listing
            </span>
          </div>
        )}
      </div>
    </Link>
  );
}
