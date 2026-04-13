"use client";

// ── Dashboard — Entry point: analyze a URL or add manually, see what's in flight ──

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Link2, Sparkles, RefreshCw, ArrowRight, MessageSquare,
  ChevronRight, Clock, Briefcase, Layers, AlertCircle,
} from "lucide-react";
import { StatusBadge } from "@/components/jobs/status-badge";
import { cn } from "@/lib/utils";
import { workflowToJob } from "@/lib/workflow-adapter";
import type { Workflow, Job } from "@/lib/types";
import type { WorkflowState } from "@/types/database";
import { resolveAppEntry } from "@/lib/entry-routing";
import {
  hasConfirmedOnboardingPreferences,
  isOnboardingComplete,
  type OnboardingContactPreferences,
  type OnboardingProfileDraft,
} from "@/lib/onboarding-memory";

type Mode = "url" | "manual";
type Step = "idle" | "parsing" | "saving";
type ChatMessage = {
  id: string;
  role: "assistant" | "user";
  content: string;
};
const ONBOARDING_STORAGE_KEY = "dreamjob_onboarding_preferences";
const ONBOARDING_COMPLETED_AT_KEY = "dreamjob_onboarding_completed_at";

const greetingHour = () => {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
};
const ONBOARDING_STORAGE_KEY = "dreamjob_onboarding_preferences";
const ONBOARDING_COMPLETED_AT_KEY = "dreamjob_onboarding_completed_at";
  const [listingText, setListingText] = useState("");
  const [profileContextKnown, setProfileContextKnown] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: "stage1-intro",
      role: "assistant",
      content:
        "Welcome to Stage 1. Share a job listing URL or paste listing text, and I’ll guide the analysis conversation step by step.",
    },
  ]);
      fetch("/api/workflows?state=listing_review").then((r) => r.json()).catch(() => []),
      fetch("/api/workflows?state=!listing_review").then((r) => r.json()).catch(() => []),
    ]).then(([profile, session, listings, active]) => {
      if (profile?.first_name) setFirstName(profile.first_name);
      setProfileContextKnown(Boolean(
        profile?.headline || profile?.location || profile?.summary || profile?.skills?.length
      ));

export default function DashboardPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("url");
  const [step, setStep] = useState<Step>("idle");
  const [url, setUrl] = useState("");
  const [listingText, setListingText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [firstName, setFirstName] = useState("there");
  const [profileContextKnown, setProfileContextKnown] = useState(false);
  const [pendingListings, setPendingListings] = useState<Workflow[]>([]);
  const [inProgressJobs, setInProgressJobs] = useState<Job[]>([]);
  const [totalJobs, setTotalJobs] = useState(0);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: "stage1-intro",
      role: "assistant",
      content:
        "Welcome to Stage 1. Share a job listing URL or paste listing text, and I’ll guide the analysis conversation step by step.",
    },
  ]);
  const urlInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/profile").then((r) => r.json()).catch(() => ({})),
      fetch("/api/auth/session").then((r) => r.json()).catch(() => ({})),
      fetch("/api/workflows?state=listing_review").then((r) => r.json()).catch(() => []),
      fetch("/api/workflows?state=!listing_review").then((r) => r.json()).catch(() => []),
    ]).then(([profile, session, listings, active]) => {
      if (profile?.first_name) setFirstName(profile.first_name);
      setProfileContextKnown(Boolean(
        profile?.headline || profile?.location || profile?.summary || profile?.skills?.length
      ));

      const activeWorkflows: Workflow[] = Array.isArray(active) ? active : [];
      const pending = Array.isArray(listings) ? listings : [];
      setPendingListings(pending.slice(0, 3));

      const jobs = activeWorkflows.map(workflowToJob);
      const inProgress = jobs.filter((j) => !["hired", "declined", "rejected", "ghosted"].includes(j.status));
      setInProgressJobs(inProgress.slice(0, 3));
      setTotalJobs(inProgress.length);

      let storedPreferences: Partial<OnboardingContactPreferences> | null = null;
      try {
        const storedRaw = localStorage.getItem(ONBOARDING_STORAGE_KEY);
        storedPreferences = storedRaw ? JSON.parse(storedRaw) : null;
      } catch {
        // ignore malformed local storage
      }

      const preferencesConfirmed = hasConfirmedOnboardingPreferences(storedPreferences);

      const completedOnce = Boolean(localStorage.getItem(ONBOARDING_COMPLETED_AT_KEY));

      const onboardingProfile: OnboardingProfileDraft = {
        firstName: profile?.first_name ?? null,
        lastName: profile?.last_name ?? null,
        email: session?.user?.account?.email ?? null,
        phone: profile?.phone ?? null,
        location: profile?.location ?? null,
        contactPreferences: completedOnce && preferencesConfirmed ? storedPreferences : null,
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
  const appendChat = (message: ChatMessage) => {
    setChatMessages((prev) => [...prev, message]);
  };

  const runIntakeSequence = (intakeSource: "url" | "text", inputPreview: string) => {
    appendChat({
      id: `user-intake-${Date.now()}`,
      role: "user",
      content: intakeSource === "url" ? `Analyze this URL: ${inputPreview}` : `I pasted the listing text.`,
    });
    appendChat({
      id: `assistant-ack-${Date.now()}`,
      role: "assistant",
      content: "Got it — I’m parsing the opportunity now.",
    });
    appendChat({
      id: `assistant-listing-${Date.now()}`,
      role: "assistant",
      content:
        "Next, I’ll prepare the listing understanding bundle: role, company, level, key requirements, and notable constraints.",
    });
    appendChat({
      id: `assistant-context-${Date.now()}`,
      role: "assistant",
      content: profileContextKnown
        ? "Then I’ll map your known approved context to the role and call out only what is still uncertain."
        : "Then I’ll map what we already know about you and highlight only the missing context that could block trusted positioning.",
    });
    appendChat({
      id: `assistant-validation-${Date.now()}`,
      role: "assistant",
      content:
        "Before positioning, I’ll give you a validation bundle so you can approve or correct the trusted working set.",
    });
    appendChat({
      id: `assistant-positioning-${Date.now()}`,
      role: "assistant",
      content:
        "After validation, I’ll provide a positioning outcome and guide the next choice: proceed to Stage 2, save as Future Role Target, or start over.",
    });
  };

  const selectGuidedPath = (nextMode: Mode) => {
    setMode(nextMode);
    setError(null);
    appendChat({
      id: `mode-${nextMode}-${Date.now()}`,
      role: "assistant",
      content:
        nextMode === "url"
          ? "Great — paste the listing URL and I’ll start with opportunity intake."
          : "Great — paste the listing text and I’ll start with opportunity intake.",
    });
    if (nextMode === "url") {
      setTimeout(() => urlInputRef.current?.focus(), 80);
    }
  };

  const createWorkflowFromParsed = async (parsed: Record<string, unknown>, sourceUrl?: string) => {
    const wfRes = await fetch("/api/workflows", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        listing_url: sourceUrl ?? null,
        company_name: (parsed.company_name as string) ?? (parsed.company as string) ?? "",
        title: (parsed.title as string) ?? "",
        description: (parsed.description as string) ?? null,
        requirements: (parsed.requirements as string[] | string | null | undefined) ?? null,
        location: (parsed.location as string) ?? null,
        salary_range: (parsed.salary_range as string) ?? null,
        employment_type: (parsed.employment_type as string) ?? null,
        experience_level: (parsed.experience_level as string) ?? null,
        responsibilities: (parsed.responsibilities as string) ?? null,
        benefits: (parsed.benefits as string) ?? null,
        company_website_url: (parsed.company_website_url as string) ?? null,
        company_linkedin_url: (parsed.company_linkedin_url as string) ?? null,
      }),
    });
    const wf = await wfRes.json();
    if (!wfRes.ok) throw new Error(wf.error ?? "Failed to save listing");
    router.push(`/listings/${wf.id}`);
  };

  // Parse URL → create workflow → navigate to listing review
  const handleAnalyzeUrl = async () => {
    if (!url.trim() || busy) return;
    setError(null);
    setStep("parsing");
    try {
      runIntakeSequence("url", url.trim());
      let provider: string | undefined;
      try { const s = JSON.parse(localStorage.getItem("dreamjob_settings") ?? "{}"); if (s.aiProvider) provider = s.aiProvider; } catch { /* ignore */ }

        <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
          {chatMessages.map((message) => (
            <div
              key={message.id}
              className={cn(
                "max-w-[90%] rounded-lg px-3 py-2 text-sm",
                message.role === "assistant"
                  ? "bg-white border border-slate-200 text-slate-800"
                  : "ml-auto bg-sky-600 text-white"
              )}
            >
              {message.content}
            </div>
          ))}
  const createWorkflowFromParsed = async (parsed: Record<string, unknown>, sourceUrl?: string) => {
    const wfRes = await fetch("/api/workflows", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        listing_url: sourceUrl ?? null,
        company_name: (parsed.company_name as string) ?? (parsed.company as string) ?? "",
        title: (parsed.title as string) ?? "",
        description: (parsed.description as string) ?? null,
        requirements: (parsed.requirements as string[] | string | null | undefined) ?? null,
        location: (parsed.location as string) ?? null,
        salary_range: (parsed.salary_range as string) ?? null,
        employment_type: (parsed.employment_type as string) ?? null,
        experience_level: (parsed.experience_level as string) ?? null,
        responsibilities: (parsed.responsibilities as string) ?? null,
        benefits: (parsed.benefits as string) ?? null,
        company_website_url: (parsed.company_website_url as string) ?? null,
        company_linkedin_url: (parsed.company_linkedin_url as string) ?? null,
      }),
    });
    const wf = await wfRes.json();
    if (!wfRes.ok) throw new Error(wf.error ?? "Failed to save listing");
    router.push(`/listings/${wf.id}`);
  };

      await createWorkflowFromParsed(parsed, url);

  // Parse pasted listing text and continue through listing review
  const handleAnalyzeText = async () => {
    if (!listingText.trim() || busy) return;
    setStep("parsing");
      const lines = listingText.trim().split("\n").map((line) => line.trim()).filter(Boolean);
      const fallbackTitle = lines[0] ?? "Untitled Position";
      const parseRes = await fetch("/api/listings/parse", {
          manual: {
            title: fallbackTitle,
            description: listingText.trim(),
            requirements: lines.slice(1, 9),
          },
      const parsed = await parseRes.json();
      if (!parseRes.ok) throw new Error(parsed.error ?? "Failed to intake listing text");

      setStep("saving");
      await createWorkflowFromParsed(parsed, url);
    } catch (e) {
      setStep("idle");
      setError(e instanceof Error ? e.message : "Something went wrong");
    }
  };

  // Parse pasted listing text and continue through listing review
  const handleAnalyzeText = async () => {
    if (!listingText.trim() || busy) return;
    setError(null);
    setStep("parsing");
    try {
      runIntakeSequence("text", listingText.trim());
      const lines = listingText.trim().split("\n").map((line) => line.trim()).filter(Boolean);
      const fallbackTitle = lines[0] ?? "Untitled Position";
      const parseRes = await fetch("/api/listings/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          manual: {
            title: fallbackTitle,
            description: listingText.trim(),
            requirements: lines.slice(1, 9),
          },
        }),
      });
      const parsed = await parseRes.json();
      if (!parseRes.ok) throw new Error(parsed.error ?? "Failed to intake listing text");

      setStep("saving");
      await createWorkflowFromParsed(parsed);
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
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Let&apos;s analyze your next opportunity</h1>
      </div>

      {/* Stage 1 guided workspace */}
      <div className="card-base p-5 mb-10 space-y-4">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
          <MessageSquare className="w-3.5 h-3.5" />
          Stage 1 guided chat
        </div>

        <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
          {chatMessages.map((message) => (
            <div
              key={message.id}
              className={cn(
                "max-w-[90%] rounded-lg px-3 py-2 text-sm",
                message.role === "assistant"
                  ? "bg-white border border-slate-200 text-slate-800"
                  : "ml-auto bg-sky-600 text-white"
              )}
            >
              {message.content}
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => selectGuidedPath("url")}
            className={cn(
              "text-xs px-3 py-1.5 rounded-full border transition-colors",
              mode === "url"
                ? "border-sky-300 bg-sky-50 text-sky-700"
                : "border-slate-200 text-slate-600 hover:border-slate-300"
            )}
          >
            Listing URL
          </button>
          <button
            onClick={() => selectGuidedPath("manual")}
            className={cn(
              "text-xs px-3 py-1.5 rounded-full border transition-colors",
              mode === "manual"
                ? "border-slate-400 bg-slate-100 text-slate-800"
                : "border-slate-200 text-slate-600 hover:border-slate-300"
            )}
          >
            Pasted listing text
          </button>
        </div>

        {error && (
          <div className="flex items-start gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
            {error}
          </div>
        )}

        {mode === "url" ? (
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-600">Opportunity intake — URL</label>
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
                />
              </div>
              <button
                onClick={handleAnalyzeUrl}
                disabled={busy || !url.trim()}
                className="btn-ocean flex items-center gap-1.5 text-sm px-4 py-2.5 flex-shrink-0 disabled:opacity-50"
              >
                {busy ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                <span className="hidden sm:inline">{step === "idle" ? "Begin Stage 1" : step === "parsing" ? "Parsing…" : "Saving…"}</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-600">Opportunity intake — pasted listing text</label>
            <textarea
              value={listingText}
              onChange={(e) => { setListingText(e.target.value); setError(null); }}
              placeholder="Paste the role description here..."
              className="form-input text-sm w-full min-h-[140px]"
              disabled={busy}
            />
            <button
              onClick={handleAnalyzeText}
              disabled={busy || !listingText.trim()}
              className="btn-ocean flex items-center gap-1.5 text-sm px-4 py-2.5 disabled:opacity-50"
            >
              {busy ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
              {step === "idle" ? "Begin Stage 1" : step === "parsing" ? "Parsing…" : "Saving…"}
            </button>
          </div>
        )}

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
