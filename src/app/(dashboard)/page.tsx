"use client";

// ── Home — Primary workflow surface ───────────────────────
// Users start here: paste a job URL or enter manually.
// AI analyzes the listing and creates a workflow.

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Link2, PenLine, Sparkles, ArrowRight, Loader as Loader2, CircleCheck, ChevronRight, Briefcase, Clock } from "lucide-react";
import { StatusBadge } from "@/components/jobs/status-badge";
import { cn } from "@/lib/utils";
import { workflowToJob } from "@/lib/workflow-adapter";
import type { Workflow, Job } from "@/lib/types";

type Mode = "url" | "manual";
type Step = "idle" | "analyzing" | "done";

const ANALYZE_STEPS = [
  "Fetching job listing",
  "Extracting requirements",
  "Matching to your profile",
  "Creating workspace",
];

const greetingHour = () => {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
};

export default function HomePage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("url");
  const [step, setStep] = useState<Step>("idle");
  const [url, setUrl] = useState("");
  const [analyzeStep, setAnalyzeStep] = useState(0);
  const [firstName, setFirstName] = useState("there");
  const [inProgressJobs, setInProgressJobs] = useState<Job[]>([]);
  const [totalJobs, setTotalJobs] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    title: "", company: "", location: "",
    type: "full-time", salary: "", url: "", description: "",
  });

  useEffect(() => {
    fetch("/api/profile").then(r => r.json()).then(d => {
      if (d.first_name) setFirstName(d.first_name);
    }).catch(() => {});

    fetch("/api/workflows").then(r => r.json()).then((workflows: Workflow[]) => {
      if (!Array.isArray(workflows)) return;
      const jobs = workflows.map(workflowToJob);
      const inProgress = jobs.filter(j => !["hired", "rejected", "withdrawn"].includes(j.status));
      setInProgressJobs(inProgress.slice(0, 3));
      setTotalJobs(inProgress.length);
    }).catch(() => {});
  }, []);

  const runAnalyzeSteps = (onDone: () => void) => {
    setStep("analyzing");
    setAnalyzeStep(0);
    let i = 0;
    const interval = setInterval(() => {
      i++;
      setAnalyzeStep(i);
      if (i >= ANALYZE_STEPS.length) {
        clearInterval(interval);
        setTimeout(onDone, 300);
      }
    }, 700);
  };

  const handleUrlSubmit = async () => {
    if (!url.trim()) return;
    setError(null);
    runAnalyzeSteps(async () => {
      try {
        // Parse listing
        const parseRes = await fetch("/api/listings/parse", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url }),
        });
        const parsed = await parseRes.json();
        if (!parseRes.ok) throw new Error(parsed.error ?? "Failed to parse listing");

        // Create workflow
        const wfRes = await fetch("/api/workflows", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            listing_url: url,
            company_name: parsed.company_name ?? parsed.company ?? "",
            title: parsed.title ?? "",
            description: parsed.description ?? "",
            requirements: parsed.requirements ?? [],
          }),
        });
        const wf = await wfRes.json();
        if (!wfRes.ok) throw new Error(wf.error ?? "Failed to create workflow");

        setStep("done");
        setTimeout(() => router.push(`/jobs/${wf.id}`), 800);
      } catch (e) {
        setStep("idle");
        setError(e instanceof Error ? e.message : "Something went wrong");
      }
    });
  };

  const handleManualSubmit = async () => {
    if (!form.title || !form.company) return;
    setError(null);
    runAnalyzeSteps(async () => {
      try {
        const res = await fetch("/api/workflows", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            listing_url: form.url || null,
            company_name: form.company,
            title: form.title,
            description: form.description || null,
          }),
        });
        const wf = await res.json();
        if (!res.ok) throw new Error(wf.error ?? "Failed to create workflow");

        setStep("done");
        setTimeout(() => router.push(`/jobs/${wf.id}`), 800);
      } catch (e) {
        setStep("idle");
        setError(e instanceof Error ? e.message : "Something went wrong");
      }
    });
  };

  if (step === "analyzing") {
    return (
      <div className="workflow-stage">
        <div className="workflow-center">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-5">
            <Sparkles className="w-7 h-7 text-slate-700 animate-pulse" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-1 tracking-tight">
            {mode === "url" ? "Analyzing listing…" : "Creating application…"}
          </h2>
          <p className="text-slate-500 text-sm leading-relaxed mb-8 max-w-xs mx-auto">
            {mode === "url"
              ? "Reading the listing, extracting requirements, and matching your profile."
              : "Setting up your workspace and queuing document generation."}
          </p>
          <div className="w-full max-w-xs mx-auto space-y-3">
            {ANALYZE_STEPS.map((label, i) => (
              <div key={label} className={cn(
                "flex items-center gap-3 text-sm transition-all duration-300",
                i < analyzeStep ? "text-slate-700" : "text-slate-300"
              )}>
                <div className={cn(
                  "w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-300",
                  i < analyzeStep ? "bg-slate-900" : i === analyzeStep ? "border-2 border-slate-300" : "border-2 border-slate-200"
                )}>
                  {i < analyzeStep && <CircleCheck className="w-3 h-3 text-white" />}
                  {i === analyzeStep && <Loader2 className="w-3 h-3 text-slate-400 animate-spin" />}
                </div>
                <span>{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (step === "done") {
    return (
      <div className="workflow-stage">
        <div className="workflow-center">
          <div className="w-14 h-14 rounded-2xl bg-slate-900 flex items-center justify-center mx-auto mb-5">
            <CircleCheck className="w-7 h-7 text-white" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-1">Ready!</h2>
          <p className="text-slate-500 text-sm">Opening your application workspace…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-wrapper max-w-1000px">
      {/* Greeting */}
      <div className="mb-8">
        <p className="text-slate-400 text-sm mb-0.5">{greetingHour()}, {firstName}</p>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          Where are you applying today?
        </h1>
      </div>

      {/* Mode toggle */}
      <div className="flex gap-1 p-1 bg-slate-100 rounded-xl mb-5 w-fit">
        {([
          { key: "url",    label: "Paste URL",      icon: Link2 },
          { key: "manual", label: "Enter manually",  icon: PenLine },
        ] as { key: Mode; label: string; icon: React.ElementType }[]).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setMode(key)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
              mode === key ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
            )}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          {error}
        </div>
      )}

      {/* URL mode */}
      {mode === "url" && (
        <div className="space-y-4">
          <div className="card-base p-5">
            <label className="block text-sm font-semibold text-slate-700 mb-2.5">
              Job listing URL
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleUrlSubmit()}
                  placeholder="https://company.com/careers/role"
                  className="form-input pl-9 input-ocean"
                  autoFocus
                />
              </div>
              <button
                onClick={handleUrlSubmit}
                className="btn-ocean flex items-center gap-2 text-sm px-5 py-3"
              >
                <Sparkles className="w-4 h-4" />
                <span className="hidden sm:inline">Analyze</span>
                <ArrowRight className="w-4 h-4 sm:hidden" />
              </button>
            </div>
            <p className="text-xs text-slate-400 mt-2.5">
              Supports LinkedIn, Indeed, Greenhouse, Lever, Workday, and most job boards.
            </p>
          </div>
        </div>
      )}

      {/* Manual mode */}
      {mode === "manual" && (
        <div className="card-base p-5 space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="form-label">Job title <span className="text-red-400">*</span></label>
              <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g. Senior Product Designer" className="form-input" />
            </div>
            <div>
              <label className="form-label">Company <span className="text-red-400">*</span></label>
              <input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })}
                placeholder="e.g. Linear" className="form-input" />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="form-label">Location</label>
              <input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })}
                placeholder="e.g. San Francisco, CA" className="form-input" />
            </div>
            <div>
              <label className="form-label">Type</label>
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}
                className="form-input bg-white">
                <option value="full-time">Full-time</option>
                <option value="part-time">Part-time</option>
                <option value="contract">Contract</option>
                <option value="freelance">Freelance</option>
              </select>
            </div>
          </div>

          <div>
            <label className="form-label">Salary range</label>
            <input value={form.salary} onChange={(e) => setForm({ ...form, salary: e.target.value })}
              placeholder="e.g. $180,000 – $220,000" className="form-input" />
          </div>

          <div>
            <label className="form-label">Job URL <span className="text-slate-400 font-normal text-xs">(optional)</span></label>
            <input value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })}
              placeholder="https://…" className="form-input" />
          </div>

          <div>
            <label className="form-label">
              Job description
              <span className="ml-1 text-xs text-slate-400 font-normal">— paste from the listing for best results</span>
            </label>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Paste the full job description here…" rows={5}
              className="form-input resize-none" />
          </div>

          <button
            onClick={handleManualSubmit}
            disabled={!form.title || !form.company}
            className="w-full flex items-center justify-center gap-2 bg-slate-900 text-white font-semibold py-3 rounded-xl hover:bg-slate-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Sparkles className="w-4 h-4" />
            Create Application
          </button>
        </div>
      )}

      {/* In-progress applications */}
      {inProgressJobs.length > 0 && (
        <div className="mt-10">
          <div className="flex items-center justify-between mb-3">
            <p className="section-label flex items-center gap-2">
              <Clock className="w-3.5 h-3.5" />
              In progress
            </p>
            <Link href="/jobs" className="text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1 transition-colors">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="space-y-2">
            {inProgressJobs.map((job) => (
              <Link
                key={job.id}
                href={`/jobs/${job.id}`}
                className="flex items-center gap-3 p-3.5 bg-white border border-slate-200 rounded-xl hover:border-slate-300 hover:shadow-sm transition-all group"
              >
                <div className="w-9 h-9 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden flex-shrink-0">
                  {job.companyLogo ? (
                    <img src={job.companyLogo} alt={job.company} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-500 font-bold text-sm">
                      {job.company[0]}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-slate-900 text-sm truncate">{job.title}</div>
                  <div className="text-slate-400 text-xs">{job.company}</div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <StatusBadge status={job.status} size="sm" />
                  <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 transition-colors" />
                </div>
              </Link>
            ))}
          </div>

          {totalJobs > 3 && (
            <Link
              href="/jobs"
              className="flex items-center justify-center gap-2 mt-3 py-2.5 border border-dashed border-slate-200 rounded-xl text-sm text-slate-400 hover:border-slate-300 hover:text-slate-600 transition-all"
            >
              <Briefcase className="w-4 h-4" />
              {totalJobs - 3} more applications
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
