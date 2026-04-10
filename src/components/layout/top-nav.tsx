"use client";

// ── TopNav — Top nav on desktop, bottom tab bar on mobile ──
// Desktop: sticky top bar with brand + links + user dropdown
// Mobile: fixed bottom tab bar (no hamburger)

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Briefcase,
  Layers,
  User,
  Settings,
  LogOut,
  ChevronDown,
  Zap,
  Shield,
  Trash2,
  LayoutDashboard,
} from "lucide-react";
import { cn } from "@/lib/utils";

/* Desktop nav — all items */
const NAV_ITEMS = [
  { href: "/",          label: "Dashboard",    icon: LayoutDashboard },
  { href: "/listings",  label: "Analyze",      icon: Zap },
  { href: "/jobs",      label: "Applications", icon: Briefcase },
];

/* Mobile bottom tab bar — only the most-used items */
const MOBILE_NAV_ITEMS = [
  { href: "/",          label: "Dashboard",    icon: LayoutDashboard },
  { href: "/listings",  label: "Analyze",      icon: Zap },
  { href: "/jobs",      label: "Applications", icon: Briefcase },
];

const USER_MENU_ITEMS = [
  { href: "/profile",  label: "Profile",  icon: User },
  { href: "/settings", label: "Settings", icon: Settings },
  { href: "/admin",    label: "Admin",    icon: Shield },
  { href: "/trash",    label: "Trash",    icon: Trash2 },
];

export function TopNav() {
  const pathname = usePathname();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [profile, setProfile] = useState<{ first_name?: string; last_name?: string; avatar_url?: string; email?: string }>({});

  useEffect(() => {
    fetch("/api/profile").then(r => r.json()).then(d => { if (!d.error) setProfile(d); }).catch(() => {});
  }, []);

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    if (href === "/jobs") return pathname === "/jobs" || (pathname.startsWith("/jobs/") && !pathname.startsWith("/listings"));
    if (href === "/listings") return pathname.startsWith("/listings");
    return pathname.startsWith(href);
  };

  return (
    <>
      {/* ── Desktop top nav ─────────────────────────────── */}
      <nav className="top-nav hidden md:block">
        <div className="top-nav-inner">
          {/* Brand */}
          <Link href="/" className="flex items-center gap-2 flex-shrink-0">
            <div className="w-7 h-7 rounded-lg bg-slate-900 flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-slate-900 text-[15px] tracking-tight">
              JobAssist
            </span>
          </Link>

          {/* Nav links */}
          <div className="flex items-center gap-1">
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

          {/* User dropdown */}
          <div className="relative">
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center gap-2 h-9 pl-2 pr-3 rounded-lg hover:bg-slate-100 transition-colors text-slate-700"
            >
              <div className="w-6 h-6 rounded-full bg-slate-200 overflow-hidden flex-shrink-0">
                {profile.avatar_url ? (
                  <img src={profile.avatar_url} alt={profile.first_name ?? ""} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs font-bold text-slate-600">
                    {profile.first_name?.[0] ?? "?"}
                  </div>
                )}
              </div>
              <span className="text-sm font-medium">{profile.first_name ?? ""}</span>
              <ChevronDown className={cn("w-3.5 h-3.5 text-slate-400 transition-transform", userMenuOpen && "rotate-180")} />
            </button>

            {userMenuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />
                <div className="absolute right-0 top-full mt-1.5 w-44 bg-white border border-slate-200 rounded-xl shadow-lg z-50 py-1 overflow-hidden">
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
                    <button className="flex items-center gap-2.5 px-3 py-2 text-sm text-red-600 hover:bg-red-50 w-full transition-colors">
                      <LogOut className="w-3.5 h-3.5" />
                      Sign out
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* ── Mobile top bar (brand + avatar → dropdown menu) ── */}
      <div className="md:hidden sticky top-0 z-40 bg-white border-b border-slate-100 flex items-center justify-between px-4" style={{ height: 64 }}>
        <Link href="/" className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-slate-900 flex items-center justify-center">
            <Zap className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="font-bold text-slate-900 text-sm tracking-tight">JobAssist</span>
        </Link>
        <div className="relative">
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="w-7 h-7 rounded-full bg-slate-200 overflow-hidden ring-2 ring-transparent hover:ring-sky-400 transition-all"
          >
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt={profile.first_name ?? ""} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-xs font-bold text-slate-600">
                {profile.first_name?.[0] ?? "?"}
              </div>
            )}
          </button>

          {userMenuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />
              <div className="absolute right-0 top-full mt-1.5 w-44 bg-white border border-slate-200 rounded-xl shadow-lg z-50 py-1 overflow-hidden">
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
                  <button className="flex items-center gap-2.5 px-3 py-2 text-sm text-red-600 hover:bg-red-50 w-full transition-colors">
                    <LogOut className="w-3.5 h-3.5" />
                    Sign out
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Mobile bottom tab bar (Analyze + Applications only) ── */}
      <nav
        className="mobile-bottom-nav flex md:hidden"
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
      </nav>

    </>
  );
}
