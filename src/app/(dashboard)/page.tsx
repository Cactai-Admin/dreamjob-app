"use client";

// ── Dashboard — Entry point: analyze a URL or add manually, see what's in flight ──

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight, MessageSquare,
  ChevronRight, Clock, Briefcase, Layers, AlertCircle,
} from "lucide-react";
import { SharedChatShell } from "@/components/chat/shared-chat-shell";
import { StatusBadge } from "@/components/jobs/status-badge";
import { DEFAULT_SHARED_CHAT_STAGE_CONFIG, type ChatThreadTurn, type ThreadAction } from "@/lib/chat-thread-model";
import { computeRequirementMatch, parseRequirements } from "@/lib/listing-match";
import { workflowToJob } from "@/lib/workflow-adapter";
import type { Workflow, Job } from "@/lib/types";
import { resolveAppEntry } from "@/lib/entry-routing";
import {
  hasConfirmedOnboardingPreferences,
  isOnboardingComplete,
  type OnboardingContactPreferences,
  type OnboardingProfileDraft,
} from "@/lib/onboarding-memory";

type Step = "idle" | "parsing" | "saving";
type ChatMessage = {
  id: string;
  role: "assistant" | "user";
  content: string;
  actions?: ThreadAction[];
};
const ONBOARDING_STORAGE_KEY = "dreamjob_onboarding_preferences";
const ONBOARDING_COMPLETED_AT_KEY = "dreamjob_onboarding_completed_at";
const FIRST_LOGIN_SEEN_KEY = "dreamjob_first_login_seen";

const greetingHour = () => {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
};

export default function DashboardPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("idle");
  const [error, setError] = useState<string | null>(null);
  const [firstName, setFirstName] = useState("there");
  const [profileContextKnown, setProfileContextKnown] = useState(false);
  const [pendingListings, setPendingListings] = useState<Workflow[]>([]);
  const [inProgressJobs, setInProgressJobs] = useState<Job[]>([]);
  const [totalJobs, setTotalJobs] = useState(0);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
  ]);
  const [onboardingDraft, setOnboardingDraft] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    location: "",
  });
  const [conversationMode, setConversationMode] = useState<"onboarding" | "intake" | "find_jobs">("onboarding");
  const [pendingField, setPendingField] = useState<keyof typeof onboardingDraft | null>(null);
  const [trustedProfile, setTrustedProfile] = useState({
    headline: "",
    summary: "",
    skills: [] as string[],
    keywords: [] as string[],
    tools: [] as string[],
    clearances: [] as string[],
    certifications: [] as string[],
    yearsExperience: 0 as number | null,
  });
  const [pendingParsed, setPendingParsed] = useState<Record<string, unknown> | null>(null);
  const [pendingSourceUrl, setPendingSourceUrl] = useState<string | undefined>(undefined);
  const [awaitingCollection, setAwaitingCollection] = useState<string | null>(null);
  const [awaitingBranchAction, setAwaitingBranchAction] = useState(false);
  const onboardingInitializedRef = useRef(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/profile").then((r) => r.json()).catch(() => ({})),
      fetch("/api/auth/session").then((r) => r.json()).catch(() => ({})),
      fetch("/api/workflows?state=listing_review").then((r) => r.json()).catch(() => []),
      fetch("/api/workflows?state=!listing_review").then((r) => r.json()).catch(() => []),
    ]).then(([profile, session, listings, active]) => {
      if (profile?.first_name) setFirstName(profile.first_name);
      setTrustedProfile({
        headline: profile?.headline ?? "",
        summary: profile?.summary ?? "",
        skills: Array.isArray(profile?.skills) ? profile.skills : [],
        keywords: Array.isArray(profile?.keywords) ? profile.keywords : [],
        tools: Array.isArray(profile?.tools) ? profile.tools : [],
        clearances: Array.isArray(profile?.clearances) ? profile.clearances : [],
        certifications: Array.isArray(profile?.certifications) ? profile.certifications : [],
        yearsExperience: typeof profile?.years_experience === "number" ? profile.years_experience : null,
      });
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
      const nextOnboardingDraft = {
        firstName: profile?.first_name ?? "",
        lastName: profile?.last_name ?? "",
        email: session?.user?.account?.email ?? "",
        phone: profile?.phone ?? "",
        location: profile?.location ?? "",
      };
      setOnboardingDraft(nextOnboardingDraft);

      const onboardingProfile: OnboardingProfileDraft = {
        firstName: nextOnboardingDraft.firstName || null,
        lastName: nextOnboardingDraft.lastName || null,
        email: nextOnboardingDraft.email || null,
        phone: nextOnboardingDraft.phone || null,
        location: nextOnboardingDraft.location || null,
        contactPreferences: completedOnce && preferencesConfirmed ? storedPreferences : null,
      };
      const missingField = (Object.entries(nextOnboardingDraft).find(([, value]) => !String(value).trim())?.[0] ?? null) as keyof typeof onboardingDraft | null;
      const isOnboarded = isOnboardingComplete(onboardingProfile);
      setConversationMode(isOnboarded ? "intake" : "onboarding");
      setPendingField(isOnboarded ? null : missingField);
      if (!onboardingInitializedRef.current) {
        onboardingInitializedRef.current = true;
        if (isOnboarded) {
          setChatMessages([
            {
              id: "intro-ready",
              role: "assistant",
              content: "Welcome back — I’m ready. Paste a job listing URL or listing text to start Stage 1.",
            },
          ]);
        } else {
          const intro = profile?.first_name
            ? `Hi ${profile.first_name} — before we start, I want to confirm a few details so I can tailor your applications.`
            : "Hi — before we start, I want to learn a little about you so I can tailor your applications.";
          const prompts: Record<keyof typeof onboardingDraft, string> = {
            firstName: "What first name should I use?",
            lastName: "Thanks. What last name should I use?",
            email: "What email should appear on your application materials?",
            phone: "What phone number should appear on your application materials?",
            location: "What location should appear on your application materials?",
          };
          setChatMessages([
            { id: "intro-onboarding", role: "assistant", content: intro },
            { id: "intro-process", role: "assistant", content: "I’ll keep this quick, then we’ll move straight into your target role." },
            { id: "intro-question", role: "assistant", content: missingField ? prompts[missingField] : "When you’re ready, share a job listing URL." },
          ]);
        }
      }

      const seenFirstLogin = Boolean(localStorage.getItem(FIRST_LOGIN_SEEN_KEY));
      const isFirstLogin = !seenFirstLogin && activeWorkflows.length === 0;
      const resolution = resolveAppEntry({
        isFirstLogin,
        onboardingComplete: isOnboardingComplete(onboardingProfile),
      });
      localStorage.setItem(FIRST_LOGIN_SEEN_KEY, "1");

      if (resolution.destination === "chat") {
        return;
      }
      if (resolution.destination === "home") {
        router.replace("/home");
      }
    }).catch(() => {});
  }, [router]);

  const busy = step !== "idle";
  const stage1Config = DEFAULT_SHARED_CHAT_STAGE_CONFIG.stage1;
  const stage1Thread: ChatThreadTurn[] = chatMessages.map((message, index) => ({
    id: message.id,
    role: message.role,
    content: message.content,
    createdAt: new Date(Date.now() + index).toISOString(),
    actions: message.actions,
  }));

  const appendChat = (message: ChatMessage) => {
    setChatMessages((prev) => [...prev, message]);
  };

  const runIntakeSequence = () => {
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

  const summarizeListingBundle = (parsed: Record<string, unknown>) => {
    const requirements = parseRequirements(parsed.requirements as string[] | string | null | undefined);
    const themes = requirements.slice(0, 4).map((r) => `• ${r}`).join("\n") || "• Requirements were limited in the source listing.";
    const hardConstraints = requirements
      .filter((r) => /(clearance|work authorization|citizen|onsite|on-site|years? of experience)/i.test(r))
      .slice(0, 3)
      .map((r) => `• ${r}`)
      .join("\n") || "• No explicit hard constraints detected.";
    const level =
      (parsed.experience_level as string | null | undefined)
      ?? (/senior|lead|principal/i.test(String(parsed.title ?? "")) ? "senior" : "unspecified");

    return [
      `**Listing understanding bundle**`,
      `Role: ${String(parsed.title ?? "Unknown role")}`,
      `Company: ${String(parsed.company_name ?? parsed.company ?? "Unknown company")}`,
      `Location/work mode: ${String(parsed.location ?? "Not specified")}`,
      `Estimated level: ${level}`,
      `Major requirement themes:\n${themes}`,
      `Hard requirements/constraints:\n${hardConstraints}`,
    ].join("\n");
  };

  const summarizeUserContextBundle = (parsed: Record<string, unknown>) => {
    const requirements = parseRequirements(parsed.requirements as string[] | string | null | undefined);
    const match = computeRequirementMatch({
      requirements,
      skills: trustedProfile.skills,
      keywords: trustedProfile.keywords,
      tools: trustedProfile.tools,
      certifications: trustedProfile.certifications,
      clearances: trustedProfile.clearances,
      technologies: [],
      manuallyMarked: [],
    });

    const known = [
      trustedProfile.headline ? `• Headline captured` : null,
      trustedProfile.summary ? `• Summary captured` : null,
      trustedProfile.skills.length ? `• ${trustedProfile.skills.length} skills` : null,
      trustedProfile.tools.length ? `• ${trustedProfile.tools.length} tools` : null,
    ].filter(Boolean).join("\n") || "• Limited approved profile context currently available.";

    const inferred = [
      `• Requirement match score currently estimates **${match.score}%**`,
      match.matched.length ? `• Likely aligned terms: ${match.matched.slice(0, 5).join(", ")}` : "• No strong aligned terms detected yet.",
    ].join("\n");

    const unknown = [
      !trustedProfile.summary ? "• No approved summary yet" : null,
      !trustedProfile.skills.length ? "• Skills list is sparse for this role" : null,
      match.missing.length ? `• Missing/unclear requirement terms: ${match.missing.slice(0, 4).join(", ")}` : null,
    ].filter(Boolean).join("\n") || "• No blocking unknowns identified.";

    return {
      message: [
        `**User-in-context bundle**`,
        `Known / trusted:\n${known}`,
        `Inferred / likely:\n${inferred}`,
        `Unknown / missing:\n${unknown}`,
      ].join("\n"),
      match,
    };
  };

  const derivePositioningOutcome = (score: number) => {
    if (score >= 90 && (trustedProfile.yearsExperience ?? 0) >= 8) return "Overqualified";
    if (score >= 75) return "Strong Fit";
    if (score >= 60) return "Healthy Stretch";
    if (score >= 40) return "Big Stretch";
    return "Future Role Target";
  };

  const runStage1OperationalFlow = async (parsed: Record<string, unknown>) => {
    setPendingParsed(parsed);
    appendChat({ id: `assistant-listing-bundle-${Date.now()}`, role: "assistant", content: summarizeListingBundle(parsed) });

    const userBundle = summarizeUserContextBundle(parsed);
    appendChat({ id: `assistant-user-bundle-${Date.now()}`, role: "assistant", content: userBundle.message });

    if (!trustedProfile.summary || userBundle.match.missing.length > 4) {
      const prompt = !trustedProfile.summary
        ? "Targeted collection: share one recent accomplishment most relevant to this role."
        : `Targeted collection: confirm one requirement you can strongly support: ${userBundle.match.missing[0]}`;
      setAwaitingCollection(prompt);
      appendChat({ id: `assistant-collect-${Date.now()}`, role: "assistant", content: prompt });
      return;
    }

    appendChat({
      id: `assistant-validation-${Date.now()}`,
      role: "assistant",
      content: `**Validation bundle**\nTrusted opportunity understanding and your trusted profile context are sufficient.\nKey matches: ${userBundle.match.matched.slice(0, 4).join(", ") || "limited"}\nKey gaps: ${userBundle.match.missing.slice(0, 3).join(", ") || "none major"}\nNon-blocking unknowns: ${userBundle.match.missing.length > 3 ? "some requirement depth remains unknown" : "none"}.`,
    });

    const outcome = derivePositioningOutcome(userBundle.match.score);
    appendChat({
      id: `assistant-position-${Date.now()}`,
      role: "assistant",
      content: `**Positioning outcome: ${outcome}**\nWhy: estimated match score ${userBundle.match.score}% with current trusted context.\nBest next move: ${outcome === "Future Role Target" ? "save this role as a future target and gather evidence for gaps." : "proceed to Stage 2 and tailor artifacts."}`,
    });
    setAwaitingBranchAction(true);
    appendChat({
      id: `assistant-next-actions-${Date.now()}`,
      role: "assistant",
      content: "Choose your next step:",
      actions: [
        { id: "proceed-stage2", kind: "action_card", label: "Proceed to Stage 2" },
        { id: "save-future-target", kind: "action_card", label: "Save as Future Role Target" },
        { id: "start-over", kind: "action_card", label: "Start over" },
      ],
    });
  };

  const createWorkflowFromParsed = async (parsed: Record<string, unknown>, sourceUrl?: string, navigate = true) => {
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
    if (navigate) router.push(`/listings/${wf.id}`);
    return wf;
  };

  // Parse URL → create workflow → navigate to listing review
  const handleAnalyzeUrl = async (urlText: string) => {
    if (!urlText.trim() || busy) return;
    setError(null);
    setStep("parsing");
    try {
      runIntakeSequence();
      let provider: string | undefined;
      try { const s = JSON.parse(localStorage.getItem("dreamjob_settings") ?? "{}"); if (s.aiProvider) provider = s.aiProvider; } catch { /* ignore */ }
      const parseRes = await fetch("/api/listings/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: urlText.trim(), provider }),
      });
      const parsed = await parseRes.json();
      if (!parseRes.ok) throw new Error(parsed.error ?? "Failed to parse listing URL");

      setStep("saving");
      setPendingSourceUrl(urlText.trim());
      await runStage1OperationalFlow(parsed);
      setStep("idle");
    } catch (e) {
      setStep("idle");
      setError(e instanceof Error ? e.message : "Something went wrong");
    }
  };

  // Parse pasted listing text and continue through listing review
  const handleAnalyzeText = async (text: string) => {
    if (!text.trim() || busy) return;
    setError(null);
    setStep("parsing");
    try {
      runIntakeSequence();
      const lines = text.trim().split("\n").map((line) => line.trim()).filter(Boolean);
      const fallbackTitle = lines[0] ?? "Untitled Position";
      const parseRes = await fetch("/api/listings/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          manual: {
            title: fallbackTitle,
            description: text.trim(),
            requirements: lines.slice(1, 9),
          },
        }),
      });
      const parsed = await parseRes.json();
      if (!parseRes.ok) throw new Error(parsed.error ?? "Failed to intake listing text");

      setStep("saving");
      setPendingSourceUrl(undefined);
      await runStage1OperationalFlow(parsed);
      setStep("idle");
    } catch (e) {
      setStep("idle");
      setError(e instanceof Error ? e.message : "Something went wrong");
    }
  };

  const persistOnboarding = async (draft: typeof onboardingDraft) => {
    await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        first_name: draft.firstName.trim() || null,
        last_name: draft.lastName.trim() || null,
        phone: draft.phone.trim() || null,
        location: draft.location.trim() || null,
      }),
    });
    localStorage.setItem(ONBOARDING_COMPLETED_AT_KEY, new Date().toISOString());
  };

  const handleThreadInput = async (text: string) => {
    const value = text.trim();
    if (!value || busy) return;
    appendChat({ id: `user-${Date.now()}`, role: "user", content: value });

    if (awaitingCollection) {
      setAwaitingCollection(null);
      appendChat({ id: `assistant-collect-thanks-${Date.now()}`, role: "assistant", content: "Great — that helps tighten your positioning confidence." });
      if (pendingParsed) {
        const userBundle = summarizeUserContextBundle(pendingParsed);
        appendChat({
          id: `assistant-validation-after-collect-${Date.now()}`,
          role: "assistant",
          content: `**Validation bundle**\nTrusted opportunity understanding and user context are now sufficient for next-step guidance.\nKey matches: ${userBundle.match.matched.slice(0, 4).join(", ") || "limited"}\nKey gaps: ${userBundle.match.missing.slice(0, 3).join(", ") || "none major"}\nNon-blocking unknowns: reduced after your clarification.`,
        });
        const outcome = derivePositioningOutcome(userBundle.match.score);
        appendChat({
          id: `assistant-position-after-collect-${Date.now()}`,
          role: "assistant",
          content: `**Positioning outcome: ${outcome}**\nWhy: estimated match score ${userBundle.match.score}% plus your latest context.\nBest next move: ${outcome === "Future Role Target" ? "save as a future target and close gaps." : "proceed to Stage 2."}`,
        });
        setAwaitingBranchAction(true);
        appendChat({
          id: `assistant-next-actions-after-collect-${Date.now()}`,
          role: "assistant",
          content: "Choose your next step:",
          actions: [
            { id: "proceed-stage2", kind: "action_card", label: "Proceed to Stage 2" },
            { id: "save-future-target", kind: "action_card", label: "Save as Future Role Target" },
            { id: "start-over", kind: "action_card", label: "Start over" },
          ],
        });
      }
      return;
    }

    if (conversationMode === "onboarding" && pendingField) {
      const nextDraft = { ...onboardingDraft, [pendingField]: value };
      setOnboardingDraft(nextDraft);
      const nextMissing = (Object.entries(nextDraft).find(([, v]) => !String(v).trim())?.[0] ?? null) as keyof typeof onboardingDraft | null;
      if (nextMissing) {
        setPendingField(nextMissing);
        const prompts: Record<keyof typeof onboardingDraft, string> = {
          firstName: "What first name should I use?",
          lastName: "Thanks. What last name should I use?",
          email: "What email should appear on your application materials?",
          phone: "What phone number should appear on your application materials?",
          location: "What location should appear on your application materials?",
        };
        appendChat({ id: `assistant-next-${Date.now()}`, role: "assistant", content: prompts[nextMissing] });
      } else {
        await persistOnboarding(nextDraft);
        setConversationMode("intake");
        setPendingField(null);
        appendChat({ id: `assistant-ready-${Date.now()}`, role: "assistant", content: "Perfect — thanks. Now paste a job listing URL, paste listing text, or ask me to find roles for you." });
      }
      return;
    }

    if (/find\s+me\s+jobs|find\s+jobs|help\s+me\s+find/i.test(value)) {
      setConversationMode("find_jobs");
      appendChat({ id: `assistant-find-${Date.now()}`, role: "assistant", content: "Absolutely — I can help with that. Tell me the role title, preferred location, and any must-have skills." });
      return;
    }

    if (conversationMode === "find_jobs") {
      appendChat({
        id: `assistant-results-${Date.now()}`,
        role: "assistant",
        content: "Great, here are 3 starter listings based on what you shared. Pick one and I’ll start Stage 1 analysis.",
        actions: [
          { id: "job-1", kind: "action_card", label: "Senior Product Designer · Remote" },
          { id: "job-2", kind: "action_card", label: "UX Designer · New York, NY" },
          { id: "job-3", kind: "action_card", label: "Product Designer · San Francisco, CA" },
        ],
      });
      setConversationMode("intake");
      return;
    }

    const urlMatch = value.match(/https?:\/\/\S+/i);
    if (urlMatch) {
      await handleAnalyzeUrl(urlMatch[0]);
      return;
    }

    if (value.includes("\n") || value.length > 100) {
      await handleAnalyzeText(value);
      return;
    }

    appendChat({
      id: `assistant-clarify-${Date.now()}`,
      role: "assistant",
      content: "Please paste either a job listing URL or the full listing text. If you want, say “find me jobs” and I’ll gather your criteria first.",
    });
  };

  const handleThreadAction = async (action: ThreadAction) => {
    if (!awaitingBranchAction) return;
    if (action.id === "start-over") {
      setAwaitingBranchAction(false);
      setPendingParsed(null);
      setPendingSourceUrl(undefined);
      appendChat({ id: `assistant-restart-${Date.now()}`, role: "assistant", content: "No problem — let’s start fresh. Paste a URL, listing text, or ask me to find jobs." });
      return;
    }
    if (!pendingParsed) return;

    if (action.id === "proceed-stage2") {
      const wf = await createWorkflowFromParsed(pendingParsed, pendingSourceUrl, false);
      setAwaitingBranchAction(false);
      appendChat({ id: `assistant-proceed-${Date.now()}`, role: "assistant", content: "Great — moving this opportunity into Stage 2 now." });
      router.push(`/listings/${wf.id}`);
      return;
    }

    if (action.id === "save-future-target") {
      const wf = await createWorkflowFromParsed(pendingParsed, pendingSourceUrl, false);
      await fetch(`/api/workflows/${wf.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ state: "archived", is_active: false, notes: "Saved as future role target from Stage 1 chat." }),
      });
      setAwaitingBranchAction(false);
      appendChat({ id: `assistant-future-${Date.now()}`, role: "assistant", content: "Saved as a Future Role Target. You can revisit it any time from your listings/workflows." });
    }
  };

  return (
    <div className="page-wrapper max-w-1000px">
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

        <SharedChatShell
          messages={stage1Thread}
          isTyping={busy}
          onSend={handleThreadInput}
          onAction={handleThreadAction}
          headerTitle="Stage 1 Thread"
          headerSubtitle={conversationMode === "onboarding" ? "Onboarding in-thread" : "Guided intake"}
          placeholder={stage1Config.placeholder}
          emptyStateText={stage1Config.emptyStateText}
          className="max-h-[320px]"
        />

        {error && (
          <div className="flex items-start gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
            {error}
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
