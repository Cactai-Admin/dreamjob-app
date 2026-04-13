"use client";

// ── Dashboard — Entry point: analyze a URL or add manually, see what's in flight ──

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Link2, PenLine, Sparkles, RefreshCw, ArrowRight,
  ChevronRight, Clock, Briefcase, Layers, AlertCircle,
} from "lucide-react";
import { StatusBadge } from "@/components/jobs/status-badge";
import { cn } from "@/lib/utils";
import { workflowToJob } from "@/lib/workflow-adapter";
import type { Workflow, Job } from "@/lib/types";
import type { WorkflowState } from "@/types/database";
import { resolveAppEntry } from "@/lib/entry-routing";
import {
  DEFAULT_ONBOARDING_CONTACT_PREFERENCES,
  hasConfirmedOnboardingPreferences,
  isOnboardingComplete,
  type OnboardingProfileDraft,
} from "@/lib/onboarding-memory";
import { OnboardingModal, type OnboardingDraft } from "@/components/onboarding/onboarding-modal";

type Mode = "url" | "manual";
type Step = "idle" | "parsing" | "saving";
const ONBOARDING_STORAGE_KEY = "dreamjob_onboarding_preferences";
const ONBOARDING_COMPLETED_AT_KEY = "dreamjob_onboarding_completed_at";

const greetingHour = () => {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
};

export default function DashboardPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("url");
  const [step, setStep] = useState<Step>("idle");
  const [url, setUrl] = useState("");
  const [manualTitle, setManualTitle] = useState("");
  const [manualCompany, setManualCompany] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [firstName, setFirstName] = useState("there");
  const [pendingListings, setPendingListings] = useState<Workflow[]>([]);
  const [inProgressJobs, setInProgressJobs] = useState<Job[]>([]);
  const [totalJobs, setTotalJobs] = useState(0);
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [onboardingSaving, setOnboardingSaving] = useState(false);
  const [onboardingDraft, setOnboardingDraft] = useState<OnboardingDraft>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    location: "",
    linkedinUrl: "",
    websiteUrl: "",
    preferences: DEFAULT_ONBOARDING_CONTACT_PREFERENCES,
  });
  const urlInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/profile").then((r) => r.json()).catch(() => ({})),
      fetch("/api/auth/session").then((r) => r.json()).catch(() => ({})),
      fetch("/api/workflows?state=listing_review").then((r) => r.json()).catch(() => []),
      fetch("/api/workflows?state=!listing_review").then((r) => r.json()).catch(() => []),
    ]).then(([profile, session, listings, active]) => {
      if (profile?.first_name) setFirstName(profile.first_name);

      const activeWorkflows: Workflow[] = Array.isArray(active) ? active : [];
      const pending = Array.isArray(listings) ? listings : [];
      setPendingListings(pending.slice(0, 3));

      const jobs = activeWorkflows.map(workflowToJob);
      const inProgress = jobs.filter((j) => !["hired", "declined", "rejected", "ghosted"].includes(j.status));
      setInProgressJobs(inProgress.slice(0, 3));
      setTotalJobs(inProgress.length);

      let storedPreferences: Partial<OnboardingDraft["preferences"]> | null = null;
      try {
        const storedRaw = localStorage.getItem(ONBOARDING_STORAGE_KEY);
        storedPreferences = storedRaw ? JSON.parse(storedRaw) : null;
      } catch {
        // ignore malformed local storage
      }

      const preferencesConfirmed = hasConfirmedOnboardingPreferences(storedPreferences);
      const normalizePreferences = (
        value: Partial<OnboardingDraft["preferences"]> | null
      ): OnboardingDraft["preferences"] => ({
        ...DEFAULT_ONBOARDING_CONTACT_PREFERENCES,
        ...(value ?? {}),
      });
      const preferencesForForm = normalizePreferences(
        preferencesConfirmed ? storedPreferences : null
      );

      const draft: OnboardingDraft = {
        firstName: profile?.first_name ?? "",
        lastName: profile?.last_name ?? "",
        email: session?.user?.account?.email ?? "",
        phone: profile?.phone ?? "",
        location: profile?.location ?? "",
        linkedinUrl: profile?.linkedin_url ?? "",
        websiteUrl: profile?.website_url ?? "",
        preferences: preferencesForForm,
      };
      setOnboardingDraft(draft);

      const completedOnce = Boolean(localStorage.getItem(ONBOARDING_COMPLETED_AT_KEY));

      const onboardingProfile: OnboardingProfileDraft = {
        firstName: draft.firstName || null,
        lastName: draft.lastName || null,
        email: draft.email || null,
        phone: draft.phone || null,
        location: draft.location || null,
        contactPreferences: completedOnce ? draft.preferences : null,
      };

      const activeWorkflow = activeWorkflows.find((wf) =>
        !["listing_review", "completed", "archived"].includes(wf.state)
      );
      const hasAlerts = activeWorkflows.some((wf) => ["ready", "ready_to_send"].includes(wf.state));
      const resolution = resolveAppEntry({
        onboardingComplete: isOnboardingComplete(onboardingProfile),
        activeWorkflowId: activeWorkflow?.id,
        activeWorkflowState: (activeWorkflow?.state as WorkflowState | undefined) ?? null,
        hasAlerts,
      });

      if (resolution.destination === "onboarding_modal") {
        setOnboardingOpen(true);
        return;
      }
      if (resolution.destination === "resume_active_action" && resolution.workflowId) {
        router.replace(`/jobs/${resolution.workflowId}`);
        return;
      }
      if (resolution.destination === "dashboard_alerts") {
        router.replace("/jobs");
      }
    }).catch(() => {});
  }, [router]);

  const busy = step !== "idle";

  const handleOnboardingSave = async () => {
    setOnboardingSaving(true);
    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        first_name: onboardingDraft.firstName.trim() || null,
        last_name: onboardingDraft.lastName.trim() || null,
        phone: onboardingDraft.phone.trim() || null,
        location: onboardingDraft.location.trim() || null,
        linkedin_url: onboardingDraft.linkedinUrl.trim() || null,
        website_url: onboardingDraft.websiteUrl.trim() || null,
      }),
    });
    const data = await res.json();
    if (!res.ok || data?.error) {
      setOnboardingSaving(false);
      throw new Error(data?.error ?? "Unable to save onboarding data.");
    }

    localStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify(onboardingDraft.preferences));
    localStorage.setItem(ONBOARDING_COMPLETED_AT_KEY, new Date().toISOString());
    setOnboardingOpen(false);
    setOnboardingSaving(false);
  };

  // Parse URL → create workflow → navigate to listing review
  const handleAnalyzeUrl = async () => {
    if (!url.trim() || busy) return;
    setError(null);
    setStep("parsing");
    try {
      let provider: string | undefined;
      try { const s = JSON.parse(localStorage.getItem("dreamjob_settings") ?? "{}"); if (s.aiProvider) provider = s.aiProvider; } catch { /* ignore */ }

      const parseRes = await fetch("/api/listings/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, provider }),
      });
      const parsed = await parseRes.json();
      if (!parseRes.ok) throw new Error(parsed.error ?? "Failed to parse listing");

      setStep("saving");
      const wfRes = await fetch("/api/workflows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listing_url: url,
          company_name: parsed.company_name ?? parsed.company ?? "",
          title: parsed.title ?? "",
          description: parsed.description ?? null,
          requirements: parsed.requirements ?? null,
          location: parsed.location ?? null,
          salary_range: parsed.salary_range ?? null,
          employment_type: parsed.employment_type ?? null,
          experience_level: parsed.experience_level ?? null,
          responsibilities: parsed.responsibilities ?? null,
          benefits: parsed.benefits ?? null,
          company_website_url: parsed.company_website_url ?? null,
          company_linkedin_url: parsed.company_linkedin_url ?? null,
        }),
      });
      const wf = await wfRes.json();
      if (!wfRes.ok) throw new Error(wf.error ?? "Failed to save listing");
      router.push(`/listings/${wf.id}`);
    } catch (e) {
      setStep("idle");
      setError(e instanceof Error ? e.message : "Something went wrong");
    }
  };

  // Create stub workflow manually → navigate to listing review
  const handleAddManual = async () => {
    if (!manualTitle.trim() || !manualCompany.trim() || busy) return;
    setError(null);
    setStep("saving");
    try {
      const res = await fetch("/api/workflows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company_name: manualCompany.trim(),
          title: manualTitle.trim(),
        }),
      });
      const wf = await res.json();
      if (!res.ok) throw new Error(wf.error ?? "Failed to create listing");
      router.push(`/listings/${wf.id}`);
    } catch (e) {
      setStep("idle");
      setError(e instanceof Error ? e.message : "Something went wrong");
    }
  };

  return (
    <div className="page-wrapper max-w-1000px">
      <OnboardingModal
        open={onboardingOpen}
        draft={onboardingDraft}
        saving={onboardingSaving}
        onDraftChange={setOnboardingDraft}
        onSubmit={handleOnboardingSave}
      />
      {/* Greeting */}
      <div className="mb-7">
        <p className="text-slate-400 text-sm mb-0.5">{greetingHour()}, {firstName}</p>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">What are you applying for?</h1>
      </div>

      {/* ── Entry cards ──────────────────────────────────────────────────────── */}
      <div className="grid sm:grid-cols-2 gap-4 mb-10">

        {/* URL card */}
        <div
          className={cn(
            "card-base p-5 flex flex-col gap-4 cursor-pointer transition-all",
            mode === "url" ? "border-sky-300 ring-1 ring-sky-200" : "hover:border-slate-300"
          )}
          onClick={() => { setMode("url"); setError(null); setTimeout(() => urlInputRef.current?.focus(), 50); }}
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-sky-50 border border-sky-200 flex items-center justify-center flex-shrink-0">
              <Link2 className="w-4 h-4 text-sky-600" />
            </div>
            <div>
              <div className="font-semibold text-slate-900 text-sm">Paste a URL</div>
              <div className="text-xs text-slate-400">LinkedIn, Indeed, Greenhouse, Lever…</div>
            </div>
          </div>

          {mode === "url" && (
            <div className="space-y-2" onClick={e => e.stopPropagation()}>
              {error && (
                <div className="flex items-start gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                  {error}
                </div>
              )}
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    ref={urlInputRef}
                    value={url}
                    onChange={e => { setUrl(e.target.value); setError(null); }}
                    onKeyDown={e => e.key === "Enter" && handleAnalyzeUrl()}
                    placeholder="https://company.com/careers/role"
                    className="form-input pl-9 text-sm"
                    disabled={busy}
                    autoFocus
                  />
                </div>
                <button
                  onClick={handleAnalyzeUrl}
                  disabled={busy || !url.trim()}
                  className="btn-ocean flex items-center gap-1.5 text-sm px-4 py-2.5 flex-shrink-0 disabled:opacity-50"
                >
                  {step === "parsing" ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : step === "saving" ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4" />
                  )}
                  <span className="hidden sm:inline">
                    {step === "parsing" ? "Analyzing…" : step === "saving" ? "Saving…" : "Analyze"}
                  </span>
                </button>
              </div>
              {step === "parsing" && (
                <p className="text-xs text-sky-600 flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3 animate-pulse" /> Reading the listing and extracting details…
                </p>
              )}
            </div>
          )}
        </div>

        {/* Manual card */}
        <div
          className={cn(
            "card-base p-5 flex flex-col gap-4 cursor-pointer transition-all",
            mode === "manual" ? "border-slate-400 ring-1 ring-slate-200" : "hover:border-slate-300"
          )}
          onClick={() => { setMode("manual"); setError(null); }}
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center flex-shrink-0">
              <PenLine className="w-4 h-4 text-slate-600" />
            </div>
            <div>
              <div className="font-semibold text-slate-900 text-sm">Enter manually</div>
              <div className="text-xs text-slate-400">Add title and company to get started</div>
            </div>
          </div>

          {mode === "manual" && (
            <div className="space-y-2" onClick={e => e.stopPropagation()}>
              {error && (
                <div className="flex items-start gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                  {error}
                </div>
              )}
              <input
                value={manualTitle}
                onChange={e => { setManualTitle(e.target.value); setError(null); }}
                onKeyDown={e => e.key === "Enter" && handleAddManual()}
                placeholder="Job title (e.g. Senior Designer)"
                className="form-input text-sm w-full"
                disabled={busy}
                autoFocus
              />
              <input
                value={manualCompany}
                onChange={e => { setManualCompany(e.target.value); setError(null); }}
                onKeyDown={e => e.key === "Enter" && handleAddManual()}
                placeholder="Company (e.g. Linear)"
                className="form-input text-sm w-full"
                disabled={busy}
              />
              <button
                onClick={handleAddManual}
                disabled={busy || !manualTitle.trim() || !manualCompany.trim()}
                className="flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-xl bg-slate-900 text-white hover:bg-slate-800 transition-colors w-full justify-center disabled:opacity-40"
              >
                {busy ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                {busy ? "Creating…" : "Add Listing"}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Pending analysis ─────────────────────────────────────────────────── */}
      {pendingListings.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <p className="section-label flex items-center gap-2">
              <Layers className="w-3.5 h-3.5" />
              Pending review
            </p>
            <Link href="/listings" className="text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1 transition-colors">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="space-y-2">
            {pendingListings.map(wf => (
              <Link
                key={wf.id}
                href={`/listings/${wf.id}`}
                className="flex items-center gap-3 p-3.5 bg-white border border-slate-200 rounded-xl hover:border-sky-200 hover:shadow-sm transition-all group"
              >
                <div className="w-9 h-9 rounded-lg bg-sky-50 border border-sky-100 flex items-center justify-center flex-shrink-0 text-sky-600 font-bold text-sm">
                  {(wf.listing?.company_name ?? wf.title ?? "?")[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-slate-900 text-sm truncate">{wf.listing?.title ?? wf.title}</div>
                  <div className="text-slate-400 text-xs">{wf.listing?.company_name ?? "—"}</div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-[10px] font-semibold text-sky-700 bg-sky-50 border border-sky-200 px-2 py-0.5 rounded-full hidden sm:inline">
                    Pending review
                  </span>
                  <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-sky-400 transition-colors" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* ── In-progress applications ─────────────────────────────────────────── */}
      {inProgressJobs.length > 0 && (
        <div>
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
            {inProgressJobs.map(job => (
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
