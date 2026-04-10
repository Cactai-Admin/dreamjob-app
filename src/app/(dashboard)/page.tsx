"use client";

// ── Analyze — Paste a URL or enter manually, review parsed data, then save as a listing ──
// Nothing is written to the DB until the user explicitly saves.

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  Link2, PenLine, Sparkles, ArrowRight, X, Plus,
  ChevronRight, Briefcase, Clock, CircleCheck, RefreshCw,
  Globe, Check, AlertCircle,
} from "lucide-react";
import { StatusBadge } from "@/components/jobs/status-badge";
import { cn } from "@/lib/utils";
import { workflowToJob } from "@/lib/workflow-adapter";
import type { Workflow, Job } from "@/lib/types";

type Mode = "url" | "manual";
// url flow:    idle → parsing → review → saving → saved
// manual flow: idle (shows form) → saving → saved
type Step = "idle" | "parsing" | "review" | "saving" | "saved";

const greetingHour = () => {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
};

function parseReqs(val: unknown): string[] {
  if (!val) return [];
  if (Array.isArray(val)) return val as string[];
  if (typeof val === "string") {
    const t = val.trim();
    if (t.startsWith("[")) { try { return JSON.parse(t); } catch { /* fall */ } }
    if (t.startsWith("{") && t.endsWith("}")) return t.slice(1, -1).split(",").map(s => s.trim()).filter(Boolean);
    if (t.includes("\n")) return t.split("\n").map(s => s.trim()).filter(Boolean);
    return t ? [t] : [];
  }
  return [];
}

export default function AnalyzePage() {
  const [mode, setMode] = useState<Mode>("url");
  const [step, setStep] = useState<Step>("idle");
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [firstName, setFirstName] = useState("there");
  const [inProgressJobs, setInProgressJobs] = useState<Job[]>([]);
  const [totalJobs, setTotalJobs] = useState(0);
  const urlInputRef = useRef<HTMLInputElement>(null);

  // Listing fields — populated by parsing or filled in manually
  const [title, setTitle] = useState("");
  const [company, setCompany] = useState("");
  const [location, setLocation] = useState("");
  const [salary, setSalary] = useState("");
  const [empType, setEmpType] = useState("");
  const [expLevel, setExpLevel] = useState("");
  const [companyWebsite, setCompanyWebsite] = useState("");
  const [linkedInUrl, setLinkedInUrl] = useState("");
  const [description, setDescription] = useState("");
  const [reqs, setReqs] = useState<string[]>([]);
  const [newReq, setNewReq] = useState("");
  const [additionalDetails, setAdditionalDetails] = useState("");

  // Company website discovery state
  type DiscoverState = "idle" | "searching" | "confirming" | "confirmed" | "linkedin_scraping";
  const [discoverState, setDiscoverState] = useState<DiscoverState>("idle");
  const [proposedWebsite, setProposedWebsite] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/profile").then(r => r.json()).then(d => {
      if (d.first_name) setFirstName(d.first_name);
    }).catch(() => {});

    fetch("/api/workflows?state=!listing_review").then(r => r.json()).then((workflows: Workflow[]) => {
      if (!Array.isArray(workflows)) return;
      const jobs = workflows.map(workflowToJob);
      const inProgress = jobs.filter(j => !["hired", "rejected", "withdrawn"].includes(j.status));
      setInProgressJobs(inProgress.slice(0, 3));
      setTotalJobs(inProgress.length);
    }).catch(() => {});
  }, []);

  // ── Reset form fields ──────────────────────────────────────────────────────
  const resetFields = () => {
    setTitle(""); setCompany(""); setLocation(""); setSalary("");
    setEmpType(""); setExpLevel(""); setCompanyWebsite(""); setLinkedInUrl("");
    setDescription(""); setReqs([]); setNewReq(""); setAdditionalDetails("");
    setDiscoverState("idle"); setProposedWebsite(null);
  };

  // ── Discover company website (fire-and-forget after parse) ─────────────────
  const discoverWebsite = async (companyName: string, desc: string, loc: string) => {
    if (!companyName) return;
    setDiscoverState("searching");
    try {
      const res = await fetch("/api/listings/discover-company", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ company_name: companyName, description: desc, location: loc }),
      });
      const data = await res.json();
      if (data.website_url) {
        setProposedWebsite(data.website_url);
        setDiscoverState("confirming");
      } else {
        setDiscoverState("idle");
      }
    } catch {
      setDiscoverState("idle");
    }
  };

  // ── Confirm website and scrape LinkedIn from footer ────────────────────────
  const confirmWebsite = async () => {
    if (!proposedWebsite) return;
    setCompanyWebsite(proposedWebsite);
    setDiscoverState("linkedin_scraping");
    try {
      const res = await fetch("/api/listings/scrape-company-linkedin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ website_url: proposedWebsite }),
      });
      const data = await res.json();
      if (data.linkedin_url) setLinkedInUrl(data.linkedin_url);
    } catch { /* silently ignore — user can enter manually */ }
    setDiscoverState("confirmed");
  };

  const rejectWebsite = () => {
    setProposedWebsite(null);
    setDiscoverState("idle");
  };

  // ── Parse a URL ────────────────────────────────────────────────────────────
  const handleAnalyzeUrl = async () => {
    if (!url.trim()) return;
    setError(null);
    setStep("parsing");

    try {
      let provider: string | undefined;
      try {
        const s = JSON.parse(localStorage.getItem("dreamjob_settings") ?? "{}");
        if (s.aiProvider) provider = s.aiProvider;
      } catch { /* ignore */ }

      const res = await fetch("/api/listings/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, provider }),
      });
      const parsed = await res.json();
      if (!res.ok) throw new Error(parsed.error ?? "Failed to parse listing");

      // Populate fields with parsed data
      const parsedCompany = parsed.company_name ?? parsed.company ?? "";
      const parsedLocation = parsed.location ?? "";
      const parsedDescription = parsed.description ?? "";
      setTitle(parsed.title ?? "");
      setCompany(parsedCompany);
      setLocation(parsedLocation);
      setSalary(parsed.salary_range ?? "");
      setEmpType(parsed.employment_type ?? "");
      setExpLevel(parsed.experience_level ?? "");
      setDescription(parsedDescription);
      setReqs(parseReqs(parsed.requirements));
      setAdditionalDetails(
        [parsed.responsibilities, parsed.benefits].filter(Boolean).join("\n\n")
      );
      // Pre-fill website/LinkedIn if the parser found them
      if (parsed.company_website_url) setCompanyWebsite(parsed.company_website_url);
      if (parsed.company_linkedin_url) setLinkedInUrl(parsed.company_linkedin_url);
      setStep("review");
      // Fire website discovery in background (only if not already found by parser)
      if (!parsed.company_website_url && parsedCompany) {
        discoverWebsite(parsedCompany, parsedDescription, parsedLocation);
      }
    } catch (e) {
      setStep("idle");
      setError(e instanceof Error ? e.message : "Something went wrong");
    }
  };

  // ── Save listing to DB ─────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!title || !company) return;
    setError(null);
    setStep("saving");

    try {
      const res = await fetch("/api/workflows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listing_url: url || null,
          company_name: company,
          title,
          description: description || null,
          requirements: reqs,
          location: location || null,
          salary_range: salary || null,
          employment_type: empType || null,
          experience_level: expLevel || null,
          responsibilities: additionalDetails || null,
          company_website_url: companyWebsite || null,
          company_linkedin_url: linkedInUrl || null,
        }),
      });
      const wf = await res.json();
      if (!res.ok) throw new Error(wf.error ?? "Failed to save listing");

      setSavedId(wf.id);
      setStep("saved");
    } catch (e) {
      setStep(mode === "url" ? "review" : "idle");
      setError(e instanceof Error ? e.message : "Something went wrong");
    }
  };

  // ── Re-analyze a URL ───────────────────────────────────────────────────────
  const handleReanalyze = () => {
    resetFields();
    setStep("idle");
    setTimeout(() => urlInputRef.current?.focus(), 50);
  };

  // ── Switch mode ────────────────────────────────────────────────────────────
  const switchMode = (m: Mode) => {
    setMode(m);
    setStep("idle");
    setError(null);
    resetFields();
    setUrl("");
  };

  const addReq = () => {
    const r = newReq.trim();
    if (!r) return;
    setReqs(p => [...p, r]);
    setNewReq("");
  };

  const canSave = title.trim() && company.trim();

  // ── Saved success state ────────────────────────────────────────────────────
  if (step === "saved" && savedId) {
    return (
      <div className="page-wrapper max-w-1000px">
        <div className="card-base p-8 text-center">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500 flex items-center justify-center mx-auto mb-4">
            <CircleCheck className="w-7 h-7 text-white" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-1">Listing saved!</h2>
          <p className="text-slate-500 text-sm mb-6">
            <strong>{title}</strong> at <strong>{company}</strong> has been added to your Jobs queue.
          </p>
          <div className="flex items-center justify-center gap-3">
            <Link
              href={`/listings/${savedId}`}
              className="flex items-center gap-2 bg-slate-900 text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-slate-800 transition-colors"
            >
              View Listing <ChevronRight className="w-4 h-4" />
            </Link>
            <button
              onClick={() => { setStep("idle"); setSavedId(null); resetFields(); setUrl(""); }}
              className="flex items-center gap-2 text-sm text-slate-500 border border-slate-200 px-5 py-2.5 rounded-xl hover:bg-slate-50 transition-colors"
            >
              Add another
            </button>
          </div>
        </div>

        {/* Keep in-progress apps visible */}
        <InProgressSection jobs={inProgressJobs} total={totalJobs} />
      </div>
    );
  }

  const showForm = mode === "manual" || step === "review";

  return (
    <div className="page-wrapper max-w-1000px">
      {/* Greeting */}
      <div className="mb-7">
        <p className="text-slate-400 text-sm mb-0.5">{greetingHour()}, {firstName}</p>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          Analyze a job listing
        </h1>
      </div>

      {/* Mode toggle + Save button row */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex gap-1 p-1 bg-slate-100 rounded-xl w-fit">
          {([
            { key: "url",    label: "Paste URL",     icon: Link2 },
            { key: "manual", label: "Enter manually", icon: PenLine },
          ] as { key: Mode; label: string; icon: React.ElementType }[]).map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => switchMode(key)}
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
        {showForm && (
          <button
            onClick={handleSave}
            disabled={!canSave || step === "saving"}
            className="flex items-center gap-2 text-sm font-semibold px-5 py-2.5 rounded-xl bg-sky-400 text-white hover:bg-sky-300 active:bg-sky-500 transition-colors flex-shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {step === "saving" ? (
              <><RefreshCw className="w-4 h-4 animate-spin" /> Saving…</>
            ) : (
              <><Sparkles className="w-4 h-4" /> {mode === "url" ? "Save Listing" : "Analyze"}</>
            )}
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          {error}
        </div>
      )}

      {/* ── URL input ─────────────────────────────────────────────────────── */}
      {mode === "url" && (
        <div className={cn("card-base p-5", showForm && "mb-5")}>
          <label className="block text-sm font-semibold text-slate-700 mb-2.5">
            Job listing URL
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                ref={urlInputRef}
                value={url}
                onChange={e => setUrl(e.target.value)}
                onKeyDown={e => e.key === "Enter" && step === "idle" && handleAnalyzeUrl()}
                placeholder="https://company.com/careers/role"
                className="form-input pl-9 input-ocean"
                disabled={step === "parsing" || step === "saving"}
                autoFocus
              />
            </div>
            {step === "review" ? (
              <button
                onClick={handleReanalyze}
                className="flex items-center gap-2 text-sm px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors flex-shrink-0"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Re-analyze</span>
              </button>
            ) : (
              <button
                onClick={handleAnalyzeUrl}
                disabled={step === "parsing" || !url.trim()}
                className="btn-ocean flex items-center gap-2 text-sm px-5 py-2.5 flex-shrink-0 disabled:opacity-50"
              >
                {step === "parsing" ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
                <span className="hidden sm:inline">
                  {step === "parsing" ? "Analyzing…" : "Analyze"}
                </span>
              </button>
            )}
          </div>
          {step === "parsing" && (
            <p className="text-xs text-sky-600 mt-2.5 flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 animate-pulse" />
              Reading the listing and extracting details…
            </p>
          )}
          {step === "idle" && (
            <p className="text-xs text-slate-400 mt-2.5">
              Supports LinkedIn, Indeed, Greenhouse, Lever, Workday, and most job boards.
            </p>
          )}
          {step === "review" && (
            <p className="text-xs text-emerald-600 mt-2.5 flex items-center gap-1">
              <CircleCheck className="w-3 h-3" /> Listing parsed — review and edit below, then save.
            </p>
          )}
        </div>
      )}

      {/* ── Website discovery confirmation banner ─────────────────────────── */}
      {discoverState === "searching" && (
        <div className="flex items-center gap-2.5 px-4 py-3 bg-sky-50 border border-sky-200 rounded-xl text-sm text-sky-700 mb-1">
          <RefreshCw className="w-3.5 h-3.5 animate-spin flex-shrink-0" />
          Looking up company website…
        </div>
      )}
      {discoverState === "confirming" && proposedWebsite && (
        <div className="card-base p-4 border-sky-200 bg-sky-50 mb-1">
          <div className="flex items-start gap-3">
            <Globe className="w-4 h-4 text-sky-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-900 mb-0.5">Is this the company website?</p>
              <p className="text-sm text-sky-700 truncate">{proposedWebsite}</p>
              <p className="text-xs text-slate-400 mt-1">Confirming will also scrape their LinkedIn URL from the footer.</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={confirmWebsite}
                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
              >
                <Check className="w-3 h-3" /> Yes
              </button>
              <button
                onClick={rejectWebsite}
                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors"
              >
                <X className="w-3 h-3" /> No
              </button>
            </div>
          </div>
        </div>
      )}
      {discoverState === "linkedin_scraping" && (
        <div className="flex items-center gap-2.5 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-700 mb-1">
          <RefreshCw className="w-3.5 h-3.5 animate-spin flex-shrink-0" />
          Scraping LinkedIn URL from company website footer…
        </div>
      )}
      {discoverState === "confirmed" && (
        <div className="flex items-center gap-2.5 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-700 mb-1">
          <CircleCheck className="w-3.5 h-3.5 flex-shrink-0" />
          Company website confirmed{linkedInUrl ? " and LinkedIn URL found" : " — LinkedIn URL not found in footer (enter manually below)"}.
        </div>
      )}

      {/* ── Editable listing form ─────────────────────────────────────────── */}
      {showForm && (
        <div className="space-y-5">
          {/* Core fields */}
          <div className="card-base p-5">
            <h2 className="font-semibold text-slate-900 mb-4 text-sm flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-sky-500" />
              Listing Details
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className="form-label">Job Title <span className="text-red-400">*</span></label>
                <input value={title} onChange={e => setTitle(e.target.value)}
                  placeholder="e.g. Senior Product Designer"
                  className="form-input" />
              </div>
              <div className="sm:col-span-2">
                <label className="form-label">Company <span className="text-red-400">*</span></label>
                <input value={company} onChange={e => setCompany(e.target.value)}
                  placeholder="e.g. Linear"
                  className="form-input" />
              </div>
              <div>
                <label className="form-label">Location</label>
                <input value={location} onChange={e => setLocation(e.target.value)}
                  placeholder="City, State or Remote"
                  className="form-input" />
              </div>
              <div>
                <label className="form-label">Salary Range</label>
                <input value={salary} onChange={e => setSalary(e.target.value)}
                  placeholder="e.g. $120k–$160k"
                  className="form-input" />
              </div>
              <div>
                <label className="form-label">Employment Type</label>
                <select value={empType} onChange={e => setEmpType(e.target.value)}
                  className="form-input bg-white">
                  <option value="">Unknown</option>
                  <option value="full-time">Full-time</option>
                  <option value="part-time">Part-time</option>
                  <option value="contract">Contract</option>
                  <option value="freelance">Freelance</option>
                  <option value="internship">Internship</option>
                </select>
              </div>
              <div>
                <label className="form-label">Experience Level</label>
                <select value={expLevel} onChange={e => setExpLevel(e.target.value)}
                  className="form-input bg-white">
                  <option value="">Unknown</option>
                  <option value="entry">Entry level</option>
                  <option value="mid">Mid level</option>
                  <option value="senior">Senior</option>
                  <option value="lead">Lead / Principal</option>
                  <option value="manager">Manager</option>
                  <option value="director">Director+</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="form-label">
                  Company Website
                  {discoverState === "searching" && (
                    <span className="ml-2 text-xs font-normal text-sky-500 inline-flex items-center gap-1">
                      <RefreshCw className="w-3 h-3 animate-spin" /> searching…
                    </span>
                  )}
                </label>
                <input value={companyWebsite} onChange={e => setCompanyWebsite(e.target.value)}
                  placeholder="https://company.com"
                  className="form-input" />
              </div>
              <div className="sm:col-span-2">
                <label className="form-label">
                  Company LinkedIn URL
                  {discoverState === "linkedin_scraping" && (
                    <span className="ml-2 text-xs font-normal text-sky-500 inline-flex items-center gap-1">
                      <RefreshCw className="w-3 h-3 animate-spin" /> finding…
                    </span>
                  )}
                </label>
                <input value={linkedInUrl} onChange={e => setLinkedInUrl(e.target.value)}
                  placeholder="https://linkedin.com/company/…"
                  className="form-input" />
              </div>
            </div>
          </div>

          {/* Requirements */}
          <div className="card-base p-5">
            <label className="form-label mb-3">Requirements</label>
            <div className="space-y-1.5 mb-3">
              {reqs.length === 0 && (
                <p className="text-slate-400 text-sm py-1">No requirements yet — add them below or they'll be extracted from the description when you analyze a URL.</p>
              )}
              {reqs.map((req, i) => (
                <div key={i} className="flex items-start gap-2 group py-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-400 mt-2 flex-shrink-0" />
                  <span className="flex-1 text-sm text-slate-700 leading-snug">{req}</span>
                  <button
                    onClick={() => setReqs(p => p.filter((_, idx) => idx !== i))}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-red-500 flex-shrink-0 mt-0.5"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                value={newReq}
                onChange={e => setNewReq(e.target.value)}
                onKeyDown={e => e.key === "Enter" && addReq()}
                placeholder="Add a requirement and press Enter…"
                className="flex-1 text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-200"
              />
              <button
                onClick={addReq}
                disabled={!newReq.trim()}
                className="flex items-center gap-1 text-sm px-3 py-2 rounded-lg bg-slate-900 text-white hover:bg-slate-700 transition-colors disabled:opacity-30"
              >
                <Plus className="w-3.5 h-3.5" /> Add
              </button>
            </div>
          </div>

          {/* Description */}
          <div className="card-base p-5">
            <label className="form-label mb-2 flex items-center gap-1.5">
              Job Description
              <span className="text-xs text-slate-400 font-normal">— paste from the listing for best AI results</span>
            </label>
            <textarea
              value={description}
              ref={el => { if (el) { el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px'; } }}
              onChange={e => { setDescription(e.target.value); e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px'; }}
              placeholder="Paste the full job description here…"
              rows={1}
              style={{ minHeight: '7rem' }}
              className="form-input resize-none overflow-hidden"
            />
          </div>

          {/* Additional details */}
          <div className="card-base p-5">
            <label className="form-label mb-1">Additional Details</label>
            <p className="text-xs text-slate-400 mb-3">Responsibilities, benefits, deadlines, work authorization — anything else from the listing.</p>
            <textarea
              value={additionalDetails}
              ref={el => { if (el) { el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px'; } }}
              onChange={e => { setAdditionalDetails(e.target.value); e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px'; }}
              placeholder="Paste extra listing content here…"
              rows={1}
              style={{ minHeight: '5rem' }}
              className="form-input resize-none overflow-hidden"
            />
          </div>

        </div>
      )}

      {/* ── In-progress applications ──────────────────────────────────────── */}
      <InProgressSection jobs={inProgressJobs} total={totalJobs} />
    </div>
  );
}

function InProgressSection({ jobs, total }: { jobs: Job[]; total: number }) {
  if (jobs.length === 0) return null;
  return (
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
        {jobs.map(job => (
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
      {total > 3 && (
        <Link
          href="/jobs"
          className="flex items-center justify-center gap-2 mt-3 py-2.5 border border-dashed border-slate-200 rounded-xl text-sm text-slate-400 hover:border-slate-300 hover:text-slate-600 transition-all"
        >
          <Briefcase className="w-4 h-4" />
          {total - 3} more applications
        </Link>
      )}
    </div>
  );
}
