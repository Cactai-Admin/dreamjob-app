"use client";

// ── TopNav — Top nav on desktop, bottom tab bar on mobile ──
// Desktop: sticky top bar with brand + links + (doc tabs when on doc page) + right controls
// Mobile: top bar (brand / doc-dropdown / avatar) + fixed bottom tab bar

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  User,
  Settings,
  LogOut,
  Zap,
  Shield,
  Trash2,
  HatGlasses,
  Save,
  Check,
  Circle,
  CircleCheck,
  Lock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { usePrivacyScreen } from "@/components/privacy-screen/privacy-screen";
import { useDocControls } from "@/components/layout/doc-controls-slot";
import { ProfileIcon, ICON_MAP } from "@/lib/profile-icons";
import { deriveApplicationStatus, deriveDocumentStatus } from "@/lib/workflow-adapter";
import type { Workflow } from "@/lib/types";

const USER_MENU_ITEMS = [
  { href: "/profile",  label: "Profile",  icon: User },
  { href: "/career-advancement", label: "Career Advancement", icon: Zap },
  { href: "/documents", label: "Documents", icon: Save },
  { href: "/archive",  label: "Archive",  icon: Save },
  { href: "/trash",    label: "Trash",    icon: Trash2 },
  { href: "/settings", label: "Settings", icon: Settings },
  { href: "/admin",    label: "Admin",    icon: Shield },
];

export function TopNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [profile, setProfile] = useState<{ first_name?: string; last_name?: string; avatar_url?: string; email?: string }>({});
  const [profileIcon, setProfileIcon] = useState<string | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const [milestoneWorkflow, setMilestoneWorkflow] = useState<Workflow | null>(null);
  const { activate: lockScreen } = usePrivacyScreen();
  const { controls } = useDocControls();

  useEffect(() => {
    fetch("/api/profile").then(r => r.json()).then(d => {
      if (!d.error) {
        setProfile(d);
        // DB is authoritative for profile_icon — use it if present
        if (d.profile_icon !== undefined) {
          setProfileIcon(d.profile_icon ?? null);
        }
      }
    }).catch(() => {});

    // Also read from localStorage as immediate fallback (populated by settings page on save)
    const loadIcon = () => {
      try {
        const stored = JSON.parse(localStorage.getItem("dreamjob_settings") ?? "{}");
        setProfileIcon(stored.profileIcon ?? null);
      } catch { /* ignore */ }
    };
    loadIcon();
    window.addEventListener("dreamjob:settings-saved", loadIcon);
    return () => window.removeEventListener("dreamjob:settings-saved", loadIcon);
  }, []);

  // Scroll-to-minify — capture phase catches scroll from any element (incl. doc-scroll div)
  useEffect(() => {
    const onScroll = (e: Event) => {
      const el = e.target as Element
      const top = el === document.documentElement || el === document.body
        ? window.scrollY
        : el.scrollTop
      const isScrolled = top > 10
      setScrolled(isScrolled)
      // CSS variable so AI button and other elements can track header height without prop drilling
      document.documentElement.style.setProperty('--mobile-nav-height', isScrolled ? '44px' : '88px')
    }
    document.documentElement.style.setProperty('--mobile-nav-height', '88px')
    document.addEventListener('scroll', onScroll, { capture: true, passive: true })
    return () => document.removeEventListener('scroll', onScroll, { capture: true })
  }, []);

  const handleSignOut = async () => {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    window.location.href = "/login";
  };

  // Doc page detection from pathname — used for both mobile and desktop nav hiding.
  // Derived from pathname (not controls) so it's accurate during page transitions
  // before the new page has called setDocControls.
  const mobileDocMatch = pathname.match(/^\/jobs\/([^/]+)\/(resume|cover-letter|interview-guide|negotiation-guide)$/);
  const mobileWorkflowId = mobileDocMatch?.[1];
  const listingMatch = pathname.match(/^\/listings\/([^/]+)/);
  const workflowMatch = pathname.match(/^\/jobs\/([^/]+)/);
  const milestoneWorkflowId = workflowMatch?.[1] ?? listingMatch?.[1];
  const showMilestones = Boolean(milestoneWorkflowId);
  const resumeStatus = deriveDocumentStatus(milestoneWorkflow?.outputs, "resume");
  const coverLetterStatus = deriveDocumentStatus(milestoneWorkflow?.outputs, "cover_letter");
  const coreDocsReady = resumeStatus !== "not_started" && coverLetterStatus !== "not_started";
  const milestones = milestoneWorkflowId ? [
    { href: `/listings/${milestoneWorkflowId}`, label: "Listing Review" },
    { href: `/jobs/${milestoneWorkflowId}/resume`, label: "Resume" },
    { href: `/jobs/${milestoneWorkflowId}/cover-letter`, label: "Cover Letter" },
    ...(coreDocsReady ? [
      { href: `/jobs/${milestoneWorkflowId}/interview-guide`, label: "Interview" },
      { href: `/jobs/${milestoneWorkflowId}/negotiation-guide`, label: "Negotiation" },
    ] : []),
  ] : [];
  const milestoneActiveIndex = milestones.findIndex(({ href }) => pathname === href);
  useEffect(() => {
    if (!milestoneWorkflowId) {
      return;
    }
    let active = true;
    fetch(`/api/workflows/${milestoneWorkflowId}`)
      .then((res) => res.json())
      .then((wf) => {
        if (active && wf?.id) setMilestoneWorkflow(wf as Workflow);
      })
      .catch(() => {
        if (active) setMilestoneWorkflow(null);
      });
    return () => { active = false; };
  }, [milestoneWorkflowId]);

  const interviewStatus = deriveDocumentStatus(milestoneWorkflow?.outputs, "interview_guide");
  const negotiationStatus = deriveDocumentStatus(milestoneWorkflow?.outputs, "negotiation_guide");
  const appStatus = milestoneWorkflow
    ? deriveApplicationStatus(milestoneWorkflow.state, milestoneWorkflow.status_events ?? [])
    : "draft";
  const appHasAdvanced = ["applied", "received", "interviewing", "offer", "negotiating", "hired", "declined", "ghosted", "rejected"].includes(appStatus);
  const fallbackFurthest = milestoneActiveIndex > -1
    ? milestoneActiveIndex
    : pathname.startsWith(`/jobs/${milestoneWorkflowId}`)
      ? 1
      : 0;
  const furthestReachedIndex = !milestoneWorkflow
    ? fallbackFurthest
    : milestoneWorkflow.state === "listing_review"
    ? 0
    : negotiationStatus !== "not_started" || ["offer", "negotiating", "hired", "declined"].includes(appStatus)
      ? 4
      : interviewStatus !== "not_started" || appHasAdvanced
        ? 3
        : coverLetterStatus !== "not_started"
          ? 2
          : 1;
  const hasApplied = ["applied", "received", "interviewing", "offer", "negotiating", "hired", "declined", "ghosted", "rejected"].includes(appStatus);
  const hasOfferContext = ["offer", "negotiating", "hired", "declined"].includes(appStatus);

  // Profile button — shared across desktop and mobile
  const renderProfileButton = (sizePx?: number) => (
    <div className="relative" style={userMenuOpen ? { zIndex: 191 } : undefined}>
      <button
        onClick={() => setUserMenuOpen(!userMenuOpen)}
        className="relative z-[195] rounded-full bg-slate-200 overflow-hidden flex items-center justify-center flex-shrink-0 transition-all duration-150 shadow-[0_2px_6px_rgba(0,0,0,0.38)] active:shadow-[0_1px_3px_rgba(0,0,0,0.55)] active:translate-y-0.5"
        style={sizePx ? { width: sizePx, height: sizePx } : { width: 44, height: 44 }}
        title="Account"
      >
        {profile.avatar_url ? (
          <img src={profile.avatar_url} alt={profile.first_name ?? ""} className="w-full h-full object-cover" />
        ) : profileIcon && ICON_MAP[profileIcon] ? (
          <ProfileIcon name={profileIcon} style={{ width: sizePx ? sizePx * 0.5 : 22, height: sizePx ? sizePx * 0.5 : 22 }} className="text-slate-600" />
        ) : (
          <span className="font-bold text-slate-600" style={{ fontSize: sizePx ? sizePx * 0.525 : 14 }}>{profile.first_name?.[0] ?? "?"}</span>
        )}
      </button>

      {userMenuOpen && (
        <>
          <div className="fixed inset-0 z-[190]" onClick={() => setUserMenuOpen(false)} />
          <div className="absolute right-0 top-full mt-1.5 w-44 bg-white border border-slate-200 rounded-xl shadow-lg z-[200] py-1 overflow-hidden">
            <div className="px-3 py-2 border-b border-slate-100">
              <div className="text-xs font-semibold text-slate-900 truncate">{profile.first_name} {profile.last_name}</div>
              <div className="text-xs text-slate-400 truncate">{profile.email ?? ""}</div>
            </div>
            {USER_MENU_ITEMS.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setUserMenuOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <Icon className="w-3.5 h-3.5 text-slate-400" />
                {label}
              </Link>
            ))}
            <div className="border-t border-slate-100 mt-1">
              <button
                onClick={handleSignOut}
                className="flex items-center gap-2.5 px-3 py-2 text-sm text-red-600 hover:bg-red-50 w-full transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                Sign out
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );

  return (
    <>
      {/* ── Desktop top nav ─────────────────────────────── */}
      <nav className="top-nav hidden md:block">
        <div className="top-nav-inner relative">

          {/* Left: brand always */}
          <div className="flex items-center flex-shrink-0">
            <Link
              href="/home"
              onClick={() => window.dispatchEvent(new Event("dreamjob:save-progress"))}
              className="flex items-center gap-2.5 flex-shrink-0"
            >
              <div className="w-9 h-9 rounded-lg bg-slate-900 flex items-center justify-center shadow-[0_2px_6px_rgba(0,0,0,0.48)] transition-all duration-150 active:shadow-[0_1px_3px_rgba(0,0,0,0.65)] active:translate-y-0.5">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-slate-900 text-[20px] tracking-tight">DreamJob</span>
            </Link>
          </div>

          {showMilestones && (
            <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
              {milestones.map(({ href, label }, idx) => {
                const active = pathname === href;
                const completed = !active && idx <= furthestReachedIndex - 1;
                const prerequisiteUnlocked = idx <= furthestReachedIndex + 1;
                const stageUnlocked = idx === 3
                  ? hasApplied || interviewStatus !== "not_started"
                  : idx === 4
                    ? hasOfferContext || negotiationStatus !== "not_started"
                    : true;
                const available = !completed && !active && prerequisiteUnlocked && stageUnlocked;
                const blocked = !active && !completed && !available;
                const clickable = !blocked;
                const stageStateLabel = active
                  ? "Current stage"
                  : completed
                    ? "Completed stage"
                    : available
                      ? "Available stage"
                      : "Blocked stage";
                return (
                  <button
                    key={href}
                    onClick={() => clickable && router.push(href)}
                    disabled={!clickable}
                    title={stageStateLabel}
                    className={cn(
                      "px-3 py-1.5 rounded-md text-xs font-medium transition-colors border",
                      active && "bg-sky-50 text-sky-800 border-sky-300 shadow-sm",
                      completed && "text-emerald-700 bg-emerald-50 border-emerald-300",
                      available && "text-amber-700 bg-amber-50 border-amber-300 hover:bg-amber-100",
                      blocked && "text-slate-400 bg-slate-100 border-slate-200 cursor-not-allowed"
                    )}
                  >
                    <span className="inline-flex items-center gap-1.5">
                      {active ? (
                        <Circle className="w-3 h-3 fill-sky-500 text-sky-500" />
                      ) : completed ? (
                        <CircleCheck className="w-3 h-3 text-emerald-600" />
                      ) : available ? (
                        <Circle className="w-3 h-3 text-amber-500" />
                      ) : (
                        <Lock className="w-3 h-3 text-slate-400" />
                      )}
                      {label}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Right: doc controls (when on doc page) + lock screen + profile */}
          <div className="flex items-center gap-2 flex-shrink-0">

            {controls && (
              <>
                {/* Trash */}
                <button
                  onClick={controls.onDelete}
                  className="flex items-center justify-center w-10 h-10 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors mr-2"
                  title="Delete application"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
                
                {/* Save */}
                <button
                  onClick={controls.onSave}
                  className="flex items-center justify-center w-10 h-10 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors mr-2"
                  title="Save"
                >
                  {controls.isDirty ? (
                    <Save className="w-6 h-6" />
                  ) : (
                    <div className="relative">
                      <Save className="w-6 h-6 text-sky-500" />
                      <div className="absolute -bottom-1 -right-1 bg-white rounded-full flex items-center justify-center w-4 h-4">
                        <Check className="w-3 h-3 text-sky-500" strokeWidth={3} />
                      </div>
                    </div>
                  )}
                </button>
                
              {/* Privacy screen */}
              <button
              onClick={lockScreen}
              title="Privacy (⌘⇧L)"
              className="flex items-center justify-center w-10 h-10 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors mr-2"
              >
              <HatGlasses className="w-6 h-6" />
            </button>
              </>
            )}

            {/* Profile — icon only */}
            {renderProfileButton()}
          </div>
        </div>
      </nav>

      {/* ── Mobile top bar ─────────────────────────────── */}
      <div className="md:hidden sticky top-0 z-40 bg-white border-b border-slate-100 flex items-center px-4 gap-3 transition-all duration-300" style={{ height: scrolled ? 44 : 88 }}>

        {mobileWorkflowId ? (
          /* On doc page: right-side controls */
          <>
            <div className="flex-1" />

            <div className="flex items-center gap-5">
              {controls && (
                <>
                  {/* Trash */}
                  <button
                    onClick={controls.onDelete}
                    className="flex items-center justify-center text-slate-400 transition-all duration-300 mr-2"
                    style={{ width: scrolled ? 38 : 62, height: scrolled ? 38 : 62 }}
                  >
                    <Trash2 style={{ width: scrolled ? 17 : 25, height: scrolled ? 17 : 25 }} className="transition-all duration-300" />
                  </button>

                  {/* Save */}
                  <button
                    onClick={controls.onSave}
                    className="flex items-center justify-center text-slate-400 transition-all duration-300 mr-2"
                  >
                    {controls.isDirty ? (
                      <Save style={{ width: scrolled ? 17 : 25, height: scrolled ? 17 : 25 }} className="transition-all duration-300" />
                    ) : (
                      <div className="relative">
                        <Save style={{ width: scrolled ? 17 : 25, height: scrolled ? 17 : 25 }} className="text-sky-500 transition-all duration-300" />
                        <div className="absolute -bottom-1 -right-1 bg-white rounded-full flex items-center justify-center" style={{ width: scrolled ? 9 : 11, height: scrolled ? 9 : 11 }}>
                          <Check style={{ width: scrolled ? 7 : 9, height: scrolled ? 7 : 9 }} className="text-sky-500" strokeWidth={3} />
                        </div>
                      </div>
                    )}
                  </button>
              {/* Privacy screen */}
              <button
              onClick={lockScreen}
              title="Privacy (⌘⇧L)"
              className="flex items-center justify-center text-slate-400 transition-all duration-300 mr-2"
              style={{ width: scrolled ? 38 : 62, height: scrolled ? 38 : 62 }}
              >
              <HatGlasses style={{ width: scrolled ? 17 : 25, height: scrolled ? 17 : 25 }} className="transition-all duration-300" />
            </button>
                </>
              )}

              {renderProfileButton(scrolled ? 27 : 54)}
            </div>
          </>
        ) : (
          /* On all other pages: brand + profile */
          <>
            <Link href="/home" className="flex items-center gap-2 flex-shrink-0">
              <div
                className="rounded-md bg-slate-900 flex items-center justify-center transition-all duration-300 shadow-[0_2px_6px_rgba(0,0,0,0.48)] active:shadow-[0_1px_3px_rgba(0,0,0,0.65)] active:translate-y-0.5"
                style={{ width: scrolled ? 21 : 42, height: scrolled ? 21 : 42 }}
              >
                <Zap style={{ width: scrolled ? 12 : 24, height: scrolled ? 12 : 24 }} className="text-white transition-all duration-300" />
              </div>
              <span
                className="font-bold text-slate-900 tracking-tight transition-all duration-300"
                style={{ fontSize: scrolled ? 14 : 28 }}
              >
                DreamJob
              </span>
            </Link>
            <div className="flex-1" />
            {renderProfileButton(scrolled ? 27 : 54)}
          </>
        )}
      </div>
    </>
  );
}
