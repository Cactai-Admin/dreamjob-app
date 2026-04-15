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
type ListingReviewDraft = {
  title: string;
  company_name: string;
  location: string;
  work_mode: string;
  salary_range: string;
  benefits: string[];
  responsibilities: string[];
  requirements: string[];
  qualifications: string[];
  tools_technologies: string[];
  certifications: string[];
  company_website_url: string;
  company_linkedin_url: string;
};
type ProfileReviewDraft = {
  headline: string;
  summary: string;
  skills: string[];
  keywords: string[];
  tools: string[];
  certifications: string[];
  clearances: string[];
  yearsExperience: string;
  location: string;
};
type Phase3CollectionItem = {
  key: "accomplishment" | "summary" | "skills";
  prompt: string;
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
  const [listingReview, setListingReview] = useState<ListingReviewDraft | null>(null);
  const [pendingSourceUrl, setPendingSourceUrl] = useState<string | undefined>(undefined);
  const [awaitingCollection, setAwaitingCollection] = useState<string | null>(null);
  const [awaitingCollectionKey, setAwaitingCollectionKey] = useState<Phase3CollectionItem["key"] | null>(null);
  const [phase3SatisfiedAsks, setPhase3SatisfiedAsks] = useState<Phase3CollectionItem["key"][]>([]);
  const [activeReviewPhase, setActiveReviewPhase] = useState<2 | 3 | null>(null);
  const [profileReview, setProfileReview] = useState<ProfileReviewDraft | null>(null);
  const [awaitingPhase2Approval, setAwaitingPhase2Approval] = useState(false);
  const [awaitingPhase3Approval, setAwaitingPhase3Approval] = useState(false);
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

  const parseList = (value: unknown) => {
    if (Array.isArray(value)) {
      return value.map((item) => String(item).trim()).filter(Boolean);
    }
    if (typeof value === "string") {
      return value
        .split(/\n|•|-/)
        .map((item) => item.trim())
        .filter(Boolean);
    }
    return [];
  };

  const uniqueStrings = (values: string[]) => Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));

  const toListingReviewDraft = (parsed: Record<string, unknown>): ListingReviewDraft => ({
    title: String(parsed.title ?? ""),
    company_name: String(parsed.company_name ?? parsed.company ?? ""),
    location: String(parsed.location ?? ""),
    work_mode: String(parsed.work_mode ?? parsed.employment_type ?? ""),
    salary_range: String(parsed.salary_range ?? ""),
    benefits: parseList(parsed.benefits),
    responsibilities: parseList(parsed.responsibilities),
    requirements: parseList(parsed.requirements),
    qualifications: parseList(parsed.qualifications),
    tools_technologies: parseList(parsed.tools_technologies ?? parsed.tools),
    certifications: parseList(parsed.certifications),
    company_website_url: String(parsed.company_website_url ?? ""),
    company_linkedin_url: String(parsed.company_linkedin_url ?? ""),
  });

  const toProfileReviewDraft = (parsed?: Record<string, unknown>): ProfileReviewDraft => {
    const requirements = parseRequirements(parsed?.requirements as string[] | string | null | undefined);
    const requirementHints = requirements.slice(0, 3);
    return {
      headline: trustedProfile.headline || "Gap: Add a role-relevant headline.",
      summary: trustedProfile.summary || "Gap: Add a concise summary tied to this listing.",
      skills: uniqueStrings([
        ...trustedProfile.skills,
        ...requirementHints.map((item) => `Needs evidence: ${item}`),
      ]),
      keywords: uniqueStrings([
        ...trustedProfile.keywords,
        ...requirementHints,
      ]),
      tools: uniqueStrings([
        ...trustedProfile.tools,
        ...requirements.filter((item) => /(salesforce|hubspot|excel|crm|python|sql|tableau|power bi|jira)/i.test(item)).slice(0, 3),
      ]),
      certifications: trustedProfile.certifications,
      clearances: trustedProfile.clearances,
      yearsExperience: trustedProfile.yearsExperience ? String(trustedProfile.yearsExperience) : "Gap: confirm years of experience",
      location: onboardingDraft.location || "Gap: confirm location",
    };
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

  const runStage1OperationalFlow = async (parsed: Record<string, unknown>) => {
    setPendingParsed(parsed);
    setListingReview(toListingReviewDraft(parsed));
    setProfileReview(toProfileReviewDraft(parsed));
    setActiveReviewPhase(2);
    appendChat({ id: `assistant-listing-bundle-${Date.now()}`, role: "assistant", content: summarizeListingBundle(parsed) });
    appendChat({
      id: `assistant-review-panel-${Date.now()}`,
      role: "assistant",
      content: "I’ve populated the **Listing Review panel on the right**. Please correct anything missing or inaccurate there before choosing the next step.",
    });

    const userBundle = summarizeUserContextBundle(parsed);
    appendChat({ id: `assistant-user-bundle-${Date.now()}`, role: "assistant", content: userBundle.message });
    appendChat({
      id: `assistant-phase2-actions-${Date.now()}`,
      role: "assistant",
      content: "When the listing details look right, choose **Proceed to profile review**. I’ll keep guiding interpretation in chat if anything is unclear.",
      actions: [
        { id: "phase2-proceed-profile-review", kind: "action_card", label: "Proceed to profile review" },
      ],
    });
    setAwaitingPhase2Approval(true);
  };

  const runPhase3OperationalFlow = (parsed: Record<string, unknown>) => {
    const review = profileReview ?? toProfileReviewDraft(parsed);
    const userBundle = summarizeUserContextBundle(parsed);
    const collectionQueue: Phase3CollectionItem[] = [
      {
        key: "accomplishment",
        prompt: "Targeted collection: share one recent accomplishment most relevant to this role.",
      },
      {
        key: "summary",
        prompt: "Targeted collection: give me one sentence describing your executive-facing or solution-selling experience.",
      },
      {
        key: "skills",
        prompt: `Targeted collection: confirm one requirement you can strongly support: ${userBundle.match.missing[0] ?? "core role requirements"}`,
      },
    ];
    const missingItem = collectionQueue.find((item) => {
      if (phase3SatisfiedAsks.includes(item.key)) return false;
      if (item.key === "accomplishment") return userBundle.match.missing.length > 0;
      if (item.key === "summary") return !review.summary || review.summary.startsWith("Gap:");
      return review.skills.length < 3 || userBundle.match.missing.length > 4;
    });

    if (missingItem) {
      const prompt = missingItem.prompt;
      setAwaitingCollection(prompt);
      setAwaitingCollectionKey(missingItem.key);
      appendChat({ id: `assistant-collect-${Date.now()}`, role: "assistant", content: prompt });
      return;
    }
    setAwaitingCollection(null);
    setAwaitingCollectionKey(null);
    appendChat({
      id: `assistant-phase3-validation-${Date.now()}`,
      role: "assistant",
      content: `**Phase 3 profile readiness**\nStrong: ${userBundle.match.matched.slice(0, 4).join(", ") || "limited approved matches yet"}\nWeak or missing: ${userBundle.match.missing.slice(0, 4).join(", ") || "no major missing items"}\nYou have enough applicable profile context to move into resume generation, and you can still refine the right panel before proceeding.`,
    });
    appendChat({
      id: `assistant-phase3-actions-${Date.now()}`,
      role: "assistant",
      content: "When you’re ready, use **Proceed to Resume Generation**. You can also return to listing review.",
      actions: [
        { id: "phase3-confirm-ready", kind: "action_card", label: "Proceed to Resume Generation" },
        { id: "phase3-back-to-listing", kind: "action_card", label: "Back to listing review" },
      ],
    });
    setAwaitingPhase3Approval(true);
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
      const interpretedKeywords = uniqueStrings([
        /(executive|c-suite|vp|director)/i.test(value) ? "Executive-facing sales" : "",
        /(enterprise|strategic|high[- ]value|expensive)/i.test(value) ? "Enterprise / high-value solution selling" : "",
        /(value[- ]led|consultative|discovery)/i.test(value) ? "Value-led sales motion" : "",
      ]);
      setProfileReview((current) => {
        if (!current) return current;
        const nextSummary = current.summary.startsWith("Gap:")
          ? value
          : uniqueStrings([current.summary, value]).join(" ");
        return {
          ...current,
          summary: awaitingCollectionKey === "summary" ? value : nextSummary,
          skills: uniqueStrings([
            ...current.skills.filter((item) => !item.startsWith("Needs evidence:")),
            ...(awaitingCollectionKey === "skills" ? [value] : []),
            ...interpretedKeywords,
          ]),
          keywords: uniqueStrings([
            ...current.keywords,
            ...interpretedKeywords,
          ]),
        };
      });
      if (awaitingCollectionKey) {
        setPhase3SatisfiedAsks((current) => uniqueStrings([...current, awaitingCollectionKey]) as Phase3CollectionItem["key"][]);
      }
      setAwaitingCollection(null);
      setAwaitingCollectionKey(null);
      appendChat({ id: `assistant-collect-thanks-${Date.now()}`, role: "assistant", content: "Great — captured. I’ve updated your applicable profile panel for this run." });
      if (pendingParsed) {
        runPhase3OperationalFlow(pendingParsed);
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
    if (action.id === "start-over") {
      setAwaitingPhase2Approval(false);
      setAwaitingPhase3Approval(false);
      setPendingParsed(null);
      setListingReview(null);
      setProfileReview(null);
      setActiveReviewPhase(null);
      setPendingSourceUrl(undefined);
      setAwaitingCollectionKey(null);
      setPhase3SatisfiedAsks([]);
      appendChat({ id: `assistant-restart-${Date.now()}`, role: "assistant", content: "No problem — let’s start fresh. Paste a URL, listing text, or ask me to find jobs." });
      return;
    }

    if (action.id === "phase2-proceed-profile-review") {
      if (!awaitingPhase2Approval || !pendingParsed || !listingReview) return;
      setAwaitingPhase2Approval(false);
      setActiveReviewPhase(3);
      setPhase3SatisfiedAsks([]);
      setAwaitingCollectionKey(null);
      appendChat({
        id: `assistant-phase3-open-${Date.now()}`,
        role: "assistant",
        content: "Great — Phase 2 is locked enough to continue. The right panel now shows **Applicable Profile Data Review** for this listing.",
      });
      runPhase3OperationalFlow({
        ...pendingParsed,
        ...listingReview,
        employment_type: listingReview.work_mode,
      });
      return;
    }

    if (action.id === "phase3-back-to-listing") {
      setActiveReviewPhase(2);
      setAwaitingPhase2Approval(true);
      setAwaitingPhase3Approval(false);
      appendChat({
        id: `assistant-back-phase2-${Date.now()}`,
        role: "assistant",
        content: "Back to Phase 2 listing review. Update the extracted listing fields and proceed again when ready.",
      });
      return;
    }

    if (!awaitingPhase3Approval) return;
    if (!pendingParsed || !listingReview) return;

    const reviewedParsed: Record<string, unknown> = {
      ...pendingParsed,
      ...listingReview,
      employment_type: listingReview.work_mode,
    };

    if (action.id === "phase3-confirm-ready") {
      const wf = await createWorkflowFromParsed(reviewedParsed, pendingSourceUrl, false);
      setAwaitingPhase3Approval(false);
      appendChat({ id: `assistant-proceed-${Date.now()}`, role: "assistant", content: "Confirmed — Phase 3 is complete enough. I’m now moving into resume generation." });
      router.push(`/listings/${wf.id}`);
      return;
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
        <div className={activeReviewPhase ? "grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]" : ""}>
          <SharedChatShell
            messages={stage1Thread}
            isTyping={busy}
            onSend={handleThreadInput}
            onAction={handleThreadAction}
            headerTitle="Stage 1 Thread"
            headerSubtitle={conversationMode === "onboarding" ? "Onboarding in-thread" : "Guided intake"}
            placeholder={stage1Config.placeholder}
            emptyStateText={stage1Config.emptyStateText}
            className="max-h-[440px]"
          />
          {activeReviewPhase === 2 && listingReview && (
            <aside className="rounded-xl border border-sky-200 bg-sky-50/40 p-4 space-y-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-sky-700">Phase 2 · Listing Review</p>
              <h2 className="text-sm font-semibold text-slate-900">Extracted Listing Context</h2>
              <p className="text-xs text-slate-600">Edit any field that looks incomplete or inaccurate.</p>
              <div className="space-y-2">
                {[
                  { key: "title", label: "Title" },
                  { key: "company_name", label: "Company" },
                  { key: "location", label: "Location" },
                  { key: "work_mode", label: "Work mode / type" },
                  { key: "salary_range", label: "Compensation" },
                  { key: "company_website_url", label: "Company website" },
                  { key: "company_linkedin_url", label: "Company LinkedIn" },
                ].map(({ key, label }) => (
                  <label key={key} className="block">
                    <span className="text-[11px] font-medium text-slate-600">{label}</span>
                    <input
                      value={listingReview[key as keyof ListingReviewDraft] as string}
                      onChange={(event) => {
                        setListingReview((current) => current ? { ...current, [key]: event.target.value } : current);
                      }}
                      className="mt-1 w-full rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-200"
                    />
                  </label>
                ))}
                {[
                  { key: "benefits", label: "Benefits" },
                  { key: "responsibilities", label: "Responsibilities" },
                  { key: "requirements", label: "Requirements" },
                  { key: "qualifications", label: "Qualifications" },
                  { key: "tools_technologies", label: "Tools / technologies" },
                  { key: "certifications", label: "Certifications" },
                ].map(({ key, label }) => (
                  <label key={key} className="block">
                    <span className="text-[11px] font-medium text-slate-600">{label} (one per line)</span>
                    <textarea
                      value={(listingReview[key as keyof ListingReviewDraft] as string[]).join("\n")}
                      onChange={(event) => {
                        setListingReview((current) => current ? {
                          ...current,
                          [key]: event.target.value.split("\n").map((item) => item.trim()).filter(Boolean),
                        } : current);
                      }}
                      rows={3}
                      className="mt-1 w-full rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-200"
                    />
                  </label>
                ))}
              </div>
              <div className="rounded-md border border-amber-200 bg-amber-50 px-2 py-1.5">
                <p className="text-[11px] font-medium text-amber-700">Missing / uncertain</p>
                <p className="text-[11px] text-amber-800">
                  {[
                    !listingReview.title ? "title" : null,
                    !listingReview.company_name ? "company" : null,
                    !listingReview.location ? "location/work mode" : null,
                    !listingReview.salary_range ? "compensation" : null,
                    listingReview.requirements.length === 0 ? "requirements" : null,
                  ].filter(Boolean).join(", ") || "No critical missing fields detected."}
                </p>
              </div>
            </aside>
          )}
          {activeReviewPhase === 3 && profileReview && (
            <aside className="rounded-xl border border-violet-200 bg-violet-50/40 p-4 space-y-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-violet-700">Phase 3 · Applicable Profile Data Review</p>
              <h2 className="text-sm font-semibold text-slate-900">Context Used for Resume Tailoring</h2>
              <p className="text-xs text-slate-600">Refine strengths, weak spots, and missing details before resume generation.</p>
              <div className="space-y-2">
                {[
                  { key: "headline", label: "Headline" },
                  { key: "summary", label: "Summary" },
                  { key: "location", label: "Location" },
                  { key: "yearsExperience", label: "Years of experience" },
                ].map(({ key, label }) => (
                  <label key={key} className="block">
                    <span className="text-[11px] font-medium text-slate-600">{label}</span>
                    <input
                      value={profileReview[key as keyof ProfileReviewDraft] as string}
                      onChange={(event) => {
                        setProfileReview((current) => current ? { ...current, [key]: event.target.value } : current);
                      }}
                      className="mt-1 w-full rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-200"
                    />
                  </label>
                ))}
                {[
                  { key: "skills", label: "Skills" },
                  { key: "keywords", label: "Keywords" },
                  { key: "tools", label: "Tools" },
                  { key: "certifications", label: "Certifications" },
                  { key: "clearances", label: "Clearances" },
                ].map(({ key, label }) => (
                  <label key={key} className="block">
                    <span className="text-[11px] font-medium text-slate-600">{label} (one per line)</span>
                    <textarea
                      value={(profileReview[key as keyof ProfileReviewDraft] as string[]).join("\n")}
                      onChange={(event) => {
                        setProfileReview((current) => current ? {
                          ...current,
                          [key]: event.target.value.split("\n").map((item) => item.trim()).filter(Boolean),
                        } : current);
                      }}
                      rows={3}
                      className="mt-1 w-full rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-200"
                    />
                  </label>
                ))}
              </div>
              <div className="rounded-md border border-amber-200 bg-amber-50 px-2 py-1.5">
                <p className="text-[11px] font-medium text-amber-700">Missing / uncertain</p>
                <p className="text-[11px] text-amber-800">
                  {[
                    !profileReview.summary ? "summary" : null,
                    profileReview.skills.length === 0 ? "skills" : null,
                    profileReview.tools.length === 0 ? "tools" : null,
                    !profileReview.yearsExperience ? "years of experience" : null,
                  ].filter(Boolean).join(", ") || "No critical missing profile fields detected."}
                </p>
              </div>
            </aside>
          )}
        </div>

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
