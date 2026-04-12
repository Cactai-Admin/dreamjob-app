"use client";

// ── TopNav — Top nav on desktop, bottom tab bar on mobile ──
// Desktop: sticky top bar with brand + links + (doc tabs when on doc page) + right controls
// Mobile: top bar (brand / doc-dropdown / avatar) + fixed bottom tab bar

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  User,
  Settings,
  LogOut,
  ChevronDown,
  Zap,
  Shield,
  Trash2,
  LayoutDashboard,
  Briefcase,
  HatGlasses,
  Save,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { usePrivacyScreen } from "@/components/privacy-screen/privacy-screen";
import { useDocControls } from "@/components/layout/doc-controls-slot";
import { DOC_TABS, STATUS_OPTIONS, statusColor } from "@/components/documents/doc-subheader";

/* Desktop nav links */
const NAV_ITEMS = [
  { href: "/",         label: "Dashboard",    icon: LayoutDashboard },
  { href: "/listings", label: "Analyze",      icon: Zap },
  { href: "/jobs",     label: "Applications", icon: Briefcase },
];

/* Mobile bottom tab bar */
const MOBILE_NAV_ITEMS = NAV_ITEMS;

const USER_MENU_ITEMS = [
  { href: "/profile",  label: "Profile",  icon: User },
  { href: "/settings", label: "Settings", icon: Settings },
  { href: "/admin",    label: "Admin",    icon: Shield },
  { href: "/trash",    label: "Trash",    icon: Trash2 },
];

export function TopNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [profile, setProfile] = useState<{ first_name?: string; last_name?: string; avatar_url?: string; email?: string }>({});
  const [scrolled, setScrolled] = useState(false);
  const { activate: lockScreen } = usePrivacyScreen();
  const { controls } = useDocControls();

  useEffect(() => {
    fetch("/api/profile").then(r => r.json()).then(d => { if (!d.error) setProfile(d); }).catch(() => {});
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

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    if (href === "/jobs") return pathname === "/jobs" || (pathname.startsWith("/jobs/") && !pathname.startsWith("/listings"));
    if (href === "/listings") return pathname.startsWith("/listings");
    return pathname.startsWith(href);
  };

  const handleSignOut = async () => {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    window.location.href = "/login";
  };

  // Doc page detection from pathname — used for both mobile and desktop nav hiding.
  // Derived from pathname (not controls) so it's accurate during page transitions
  // before the new page has called setDocControls.
  const mobileDocMatch = pathname.match(/^\/jobs\/([^/]+)\/(resume|cover-letter|interview-guide|negotiation-guide)$/);
  const mobileWorkflowId = mobileDocMatch?.[1];
  const mobileActiveDoc = mobileDocMatch?.[2] as typeof DOC_TABS[number]['type'] | undefined;
  const isDocPage = !!mobileDocMatch;

  // Profile button — shared across desktop and mobile
  const ProfileButton = ({ sizePx }: { sizePx?: number }) => (
    <div className="relative">
      <button
        onClick={() => setUserMenuOpen(!userMenuOpen)}
        className="rounded-full bg-slate-200 overflow-hidden flex items-center justify-center flex-shrink-0 transition-all duration-300"
        style={sizePx ? { width: sizePx, height: sizePx } : { width: 44, height: 44 }}
        title="Account"
      >
        {profile.avatar_url ? (
          <img src={profile.avatar_url} alt={profile.first_name ?? ""} className="w-full h-full object-cover" />
        ) : (
          <span className="font-bold text-slate-600" style={{ fontSize: sizePx ? sizePx * 0.35 : 14 }}>{profile.first_name?.[0] ?? "?"}</span>
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
            <Link href="/" className="flex items-center gap-2.5 flex-shrink-0">
              <div className="w-9 h-9 rounded-lg bg-slate-900 flex items-center justify-center">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-slate-900 text-[20px] tracking-tight">DreamJob</span>
            </Link>
          </div>

          {/* Center: nav links (non-doc) or doc tabs — absolutely centered */}
          {!isDocPage && (
            <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-1">
              {NAV_ITEMS.map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  className={cn("nav-link", isActive(href) && "nav-link-active")}
                >
                  {label}
                </Link>
              ))}
            </div>
          )}

          {controls && (
            <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-0.5 p-1 bg-slate-100 rounded-lg">
              {DOC_TABS.map(({ type, label, icon: Icon }) => (
                <button
                  key={type}
                  onClick={() => type !== controls.activeDoc && router.push(`/jobs/${controls.workflowId}/${type}`)}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors',
                    type === controls.activeDoc
                      ? 'bg-white text-slate-900 shadow-sm font-semibold'
                      : 'text-slate-500 hover:text-slate-700'
                  )}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  {label}
                </button>
              ))}
            </div>
          )}

          {/* Right: doc controls (when on doc page) + lock screen + profile */}
          <div className="flex items-center gap-2 flex-shrink-0">

            {/* Privacy screen */}
            <button
              onClick={lockScreen}
              title="Lock screen (⌘⇧L)"
              className="flex items-center justify-center w-10 h-10 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <HatGlasses className="w-5 h-5" />
            </button>

            {controls && (
              <>
                {/* Save */}
                <button
                  onClick={controls.onSave}
                  className="flex items-center gap-2 text-sm font-medium px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-600"
                  title="Save"
                >
                  {controls.isDirty
                    ? <Save className="w-4 h-4" />
                    : <span className="text-sky-500 font-semibold">Saved</span>
                  }
                </button>

                {/* Trash */}
                <button
                  onClick={controls.onDelete}
                  className="flex items-center justify-center w-10 h-10 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                  title="Delete application"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </>
            )}

            {/* Profile — icon only */}
            <ProfileButton />
          </div>
        </div>
      </nav>

      {/* ── Mobile top bar ─────────────────────────────── */}
      <div className="md:hidden sticky top-0 z-40 bg-white border-b border-slate-100 flex items-center px-4 gap-3 overflow-hidden transition-all duration-300" style={{ height: scrolled ? 44 : 88 }}>

        {mobileWorkflowId ? (
          /* On doc page: back arrow + centered doc controls + profile */
          <>
            <button
              onClick={() => router.push(`/jobs/${mobileWorkflowId}`)}
              className="text-slate-500 flex-shrink-0 leading-none text-center transition-all duration-300"
              style={{ fontSize: scrolled ? 14 : 22, width: scrolled ? 24 : 40 }}
              aria-label="Back"
            >
              ←
            </button>

            <div className="flex-1" />

            {controls && (
              <>
                {/* Save */}
                <button
                  onClick={controls.onSave}
                  className="flex items-center gap-1.5 font-medium rounded-xl border border-slate-200 bg-white text-slate-600 transition-all duration-300"
                  style={{ fontSize: scrolled ? 11 : 14, padding: scrolled ? '4px 8px' : '8px 12px' }}
                >
                  {controls.isDirty
                    ? <Save style={{ width: scrolled ? 12 : 16, height: scrolled ? 12 : 16 }} className="transition-all duration-300" />
                    : <span className="text-sky-500 font-semibold">Saved</span>
                  }
                </button>

                {/* Trash */}
                <button
                  onClick={controls.onDelete}
                  className="flex items-center justify-center rounded-xl text-slate-400 transition-all duration-300"
                  style={{ width: scrolled ? 27 : 44, height: scrolled ? 27 : 44 }}
                >
                  <Trash2 style={{ width: scrolled ? 12 : 18, height: scrolled ? 12 : 18 }} className="transition-all duration-300" />
                </button>
              </>
            )}

            <ProfileButton sizePx={scrolled ? 27 : 54} />
          </>
        ) : (
          /* On all other pages: brand + profile */
          <>
            <Link href="/" className="flex items-center gap-2 flex-shrink-0">
              <div
                className="rounded-md bg-slate-900 flex items-center justify-center transition-all duration-300"
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
            <ProfileButton sizePx={scrolled ? 27 : 54} />
          </>
        )}
      </div>

      {/* ── Mobile bottom tab bar — not rendered on doc pages ── */}
      {!mobileWorkflowId && <nav
        className="mobile-bottom-nav md:hidden flex"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="flex items-stretch w-full">
          {MOBILE_NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = isActive(href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex-1 flex flex-col items-center justify-center gap-1 py-2.5 transition-colors",
                  active ? "text-slate-900" : "text-slate-400 hover:text-slate-600"
                )}
              >
                <div className={cn(
                  "w-10 h-6 flex items-center justify-center rounded-full transition-all",
                  active && "bg-slate-100"
                )}>
                  <Icon className={cn("w-[18px] h-[18px]", active && "stroke-[2.2px]")} />
                </div>
                <span className={cn(
                  "text-[10px] font-medium leading-none",
                  active ? "text-slate-900" : "text-slate-400"
                )}>
                  {label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>}
    </>
  );
}
