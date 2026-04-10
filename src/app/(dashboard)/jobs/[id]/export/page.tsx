"use client";

// ── Export — Download or copy the application packet ─────

import { useState, useEffect, use } from "react";
import { notFound } from "next/navigation";
import { Download, Copy, Check, FileText, Mail, Share2, ArrowRight, CircleCheck as CheckCircle2, ExternalLink } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { cn } from "@/lib/utils";
import { workflowToJob } from "@/lib/workflow-adapter";
import type { Workflow, Job, Output } from "@/lib/types";

interface Props {
  params: Promise<{ id: string }>;
}

export default function ExportPage({ params }: Props) {
  const { id } = use(params);
  const [workflow, setWorkflow] = useState<Workflow | null>(null);
  const [job, setJob] = useState<Job | null>(null);
  const [resumeOutput, setResumeOutput] = useState<Output | undefined>(undefined);
  const [coverOutput, setCoverOutput] = useState<Output | undefined>(undefined);
  const [loading, setLoading] = useState(true);

  const [copiedResume, setCopiedResume] = useState(false);
  const [copiedCoverLetter, setCopiedCoverLetter] = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    fetch(`/api/workflows/${id}`)
      .then(r => r.json())
      .then((wf: Workflow) => {
        if (!wf?.id) { setLoading(false); return; }
        setWorkflow(wf);
        setJob(workflowToJob(wf));
        setResumeOutput(wf.outputs?.find(o => o.type === "resume" && o.is_current));
        setCoverOutput(wf.outputs?.find(o => o.type === "cover_letter" && o.is_current));
        // Check if already submitted
        const alreadySubmitted = wf.status_events?.some(e => e.event_type === "submitted") ?? false;
        setSubmitted(alreadySubmitted);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  const handleCopy = async (which: "resume" | "cover-letter") => {
    const out = which === "resume" ? resumeOutput : coverOutput;
    if (out?.content) {
      try {
        // For resume, content may be JSON sections — extract plain text
        let text = out.content;
        try {
          const sections = JSON.parse(out.content);
          if (Array.isArray(sections)) {
            text = sections.map((s: { title: string; content: string }) => `${s.title}\n${s.content}`).join("\n\n");
          }
        } catch {}
        await navigator.clipboard.writeText(text);
      } catch {}
    }
    if (which === "resume") {
      setCopiedResume(true);
      setTimeout(() => setCopiedResume(false), 2500);
    } else {
      setCopiedCoverLetter(true);
      setTimeout(() => setCopiedCoverLetter(false), 2500);
    }
  };

  const handleDownload = () => {
    // Simple text download combining both documents
    const resumeText = resumeOutput?.content ?? "";
    const coverText = coverOutput?.content ?? "";
    let combined = "";
    try {
      const sections = JSON.parse(resumeText);
      if (Array.isArray(sections)) {
        combined = sections.map((s: { title: string; content: string }) => `${s.title}\n${s.content}`).join("\n\n");
      }
    } catch { combined = resumeText; }
    if (coverText) combined += `\n\n---\n\nCOVER LETTER\n\n${coverText}`;

    const blob = new Blob([combined], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${job?.company ?? "application"}-${job?.title ?? "packet"}.txt`.toLowerCase().replace(/\s+/g, "-");
    a.click();
    URL.revokeObjectURL(url);
    setDownloaded(true);
    setTimeout(() => setDownloaded(false), 3000);
  };

  const handleMarkSubmitted = async () => {
    const res = await fetch(`/api/workflows/${id}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event_type: "submitted" }),
    });
    if (res.ok) setSubmitted(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-6 h-6 border-2 border-slate-300 border-t-slate-900 rounded-full animate-spin" />
      </div>
    );
  }

  if (!workflow || !job) return notFound();

  const resumeStatus = resumeOutput?.status === "approved" ? "approved" : resumeOutput ? "draft" : "not_started";
  const coverStatus = coverOutput?.status === "approved" ? "approved" : coverOutput ? "draft" : "not_started";

  return (
    <div className="page-wrapper max-w-2xl">
      <PageHeader
        title="Export Packet"
        subtitle={`${job.title} — ${job.company}`}
        backHref={`/jobs/${id}`}
      />

      {/* Status check */}
      <div className="card-base p-5 mb-5">
        <h2 className="font-semibold text-slate-900 mb-3">Documents Ready</h2>
        <div className="space-y-3">
          {[
            { label: "Resume",       href: `/jobs/${id}/resume`,       status: resumeStatus, icon: FileText },
            { label: "Cover Letter", href: `/jobs/${id}/cover-letter`, status: coverStatus,  icon: Mail },
          ].map(({ label, href, status, icon: Icon }) => (
            <div key={label} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
              <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0",
                status === "approved" ? "bg-emerald-100" : "bg-amber-100"
              )}>
                <Icon className={cn("w-4 h-4", status === "approved" ? "text-emerald-600" : "text-amber-600")} />
              </div>
              <div className="flex-1">
                <div className="font-medium text-slate-900 text-sm">{label}</div>
                <div className={cn("text-xs", status === "approved" ? "text-emerald-600" : "text-amber-600")}>
                  {status === "approved" ? "Approved and ready" : status === "not_started" ? "Not started" : "Needs review"}
                </div>
              </div>
              {status !== "approved" && (
                <a href={href} className="text-xs text-sky-600 hover:underline flex items-center gap-1">
                  {status === "not_started" ? "Create" : "Review"} <ArrowRight className="w-3 h-3" />
                </a>
              )}
              {status === "approved" && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
            </div>
          ))}
        </div>
      </div>

      {/* Export actions */}
      <div className="card-base p-5 mb-5">
        <h2 className="font-semibold text-slate-900 mb-4">Export Options</h2>
        <div className="space-y-3">
          <button
            onClick={handleDownload}
            className={cn("w-full flex items-center gap-3 p-4 rounded-xl border-2 transition-all",
              downloaded ? "border-emerald-500 bg-emerald-50" : "border-slate-200 hover:border-sky-300 hover:bg-sky-50"
            )}
          >
            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors",
              downloaded ? "bg-emerald-100" : "bg-slate-100"
            )}>
              {downloaded ? <Check className="w-5 h-5 text-emerald-600" /> : <Download className="w-5 h-5 text-slate-600" />}
            </div>
            <div className="flex-1 text-left">
              <div className={cn("font-semibold text-sm", downloaded ? "text-emerald-700" : "text-slate-900")}>
                {downloaded ? "Downloaded!" : "Download as Text"}
              </div>
              <div className="text-slate-400 text-xs">Resume + cover letter combined</div>
            </div>
          </button>

          <button
            onClick={() => handleCopy("resume")}
            className={cn("w-full flex items-center gap-3 p-4 rounded-xl border-2 transition-all",
              copiedResume ? "border-emerald-500 bg-emerald-50" : "border-slate-200 hover:border-sky-300 hover:bg-sky-50"
            )}
          >
            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors",
              copiedResume ? "bg-emerald-100" : "bg-slate-100"
            )}>
              {copiedResume ? <Check className="w-5 h-5 text-emerald-600" /> : <Copy className="w-5 h-5 text-slate-600" />}
            </div>
            <div className="flex-1 text-left">
              <div className={cn("font-semibold text-sm", copiedResume ? "text-emerald-700" : "text-slate-900")}>
                {copiedResume ? "Copied!" : "Copy Resume Text"}
              </div>
              <div className="text-slate-400 text-xs">Plain text, ready to paste</div>
            </div>
          </button>

          <button
            onClick={() => handleCopy("cover-letter")}
            className={cn("w-full flex items-center gap-3 p-4 rounded-xl border-2 transition-all",
              copiedCoverLetter ? "border-emerald-500 bg-emerald-50" : "border-slate-200 hover:border-sky-300 hover:bg-sky-50"
            )}
          >
            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0",
              copiedCoverLetter ? "bg-emerald-100" : "bg-slate-100"
            )}>
              {copiedCoverLetter ? <Check className="w-5 h-5 text-emerald-600" /> : <Copy className="w-5 h-5 text-slate-600" />}
            </div>
            <div className="flex-1 text-left">
              <div className={cn("font-semibold text-sm", copiedCoverLetter ? "text-emerald-700" : "text-slate-900")}>
                {copiedCoverLetter ? "Copied!" : "Copy Cover Letter Text"}
              </div>
              <div className="text-slate-400 text-xs">Paste directly into application forms</div>
            </div>
          </button>
        </div>
      </div>

      {/* Apply externally */}
      {job.url && (
        <div className="card-base p-5 mb-5 bg-gradient-to-br from-slate-900 to-slate-800 border-slate-800 text-white">
          <div className="flex items-start gap-3 mb-4">
            <ExternalLink className="w-5 h-5 text-sky-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-white">Submit on the company website</h3>
              <p className="text-slate-400 text-xs mt-1 leading-relaxed">
                Copy your documents and apply directly on {job.company}&apos;s careers page. Once submitted, come back to mark it as sent.
              </p>
            </div>
          </div>
          <a
            href={job.url}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-center gap-2 w-full py-2.5 bg-sky-500 text-white font-semibold text-sm rounded-xl hover:bg-sky-400 transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            Open {job.company} Careers
          </a>
        </div>
      )}

      {/* Mark as submitted */}
      <div className="card-base p-5">
        <h2 className="font-semibold text-slate-900 mb-3">After You Submit</h2>
        <p className="text-slate-500 text-sm mb-4">
          Once you&apos;ve submitted your application on the company&apos;s website, mark it here so you can track its progress.
        </p>
        <button
          onClick={handleMarkSubmitted}
          disabled={submitted}
          className={cn(
            "w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all",
            submitted
              ? "bg-emerald-50 text-emerald-700 border-2 border-emerald-300 cursor-default"
              : "bg-emerald-600 text-white hover:bg-emerald-700"
          )}
        >
          {submitted ? (
            <><CheckCircle2 className="w-4 h-4" /> Marked as Submitted!</>
          ) : (
            <><Share2 className="w-4 h-4" /> Mark Application as Submitted</>
          )}
        </button>
      </div>
    </div>
  );
}
