"use client";

// ── Settings — Theme, privacy, account preferences ────────

import { useState, useEffect } from "react";
import {
  Sun, Moon, Monitor, Bell, Shield, Trash2,
  LogOut, ChevronRight, Eye, EyeOff, Check,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { cn } from "@/lib/utils";

type Theme = "light" | "dark" | "system";

export default function SettingsPage() {
  const [profile, setProfile] = useState<{ first_name?: string; last_name?: string; email?: string; avatar_url?: string }>({});
  const [theme, setTheme] = useState<Theme>("system");

  useEffect(() => {
    fetch("/api/profile").then(r => r.json()).then(d => { if (!d.error) setProfile(d); }).catch(() => {});
  }, []);
  const [notifications, setNotifications] = useState({
    statusUpdates:    true,
    deadlineReminders: true,
    weeklyDigest:     false,
    aiSuggestions:    true,
  });
  const [privacy, setPrivacy] = useState({
    profileVisible:    false,
    shareApplications: false,
    analyticsOptIn:    true,
  });
  const [showEmail, setShowEmail] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const ToggleRow = ({
    label, description, checked, onChange,
  }: { label: string; description?: string; checked: boolean; onChange: (v: boolean) => void }) => (
    <div className="flex items-center justify-between gap-3 py-3.5 border-b border-slate-100 last:border-0">
      <div>
        <div className="text-sm font-medium text-slate-800">{label}</div>
        {description && <div className="text-xs text-slate-400 mt-0.5">{description}</div>}
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={cn(
          "flex-shrink-0 w-10 h-6 rounded-full transition-colors relative",
          checked ? "bg-sky-500" : "bg-slate-200"
        )}
      >
        <div className={cn(
          "absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform",
          checked && "translate-x-4"
        )} />
      </button>
    </div>
  );

  return (
    <div className="page-wrapper max-w-1000px">
      <PageHeader title="Settings" subtitle="Preferences and account" />

      {/* Account */}
      <section className="card-base p-5 mb-5">
        <h2 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <Shield className="w-4 h-4 text-sky-500" />
          Account
        </h2>
        <div className="space-y-3">
          <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="w-10 h-10 rounded-xl object-cover" />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-slate-200 flex items-center justify-center text-slate-500 font-bold">
                {profile.first_name?.[0] ?? "?"}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="font-medium text-slate-900 text-sm">
                {profile.first_name} {profile.last_name}
              </div>
              <button
                onClick={() => setShowEmail(!showEmail)}
                className="flex items-center gap-1 text-slate-400 text-xs hover:text-slate-600 transition-colors"
              >
                {showEmail ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                {showEmail ? (profile.email ?? "") : "••••••@email.com"}
              </button>
            </div>
          </div>

          {[
            { label: "Change password", icon: Shield },
            { label: "Update email", icon: Shield },
            { label: "Export my data", icon: Shield },
          ].map(({ label }) => (
            <button
              key={label}
              className="flex items-center justify-between w-full px-3 py-2.5 rounded-xl hover:bg-slate-50 transition-colors group"
            >
              <span className="text-sm text-slate-700">{label}</span>
              <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 transition-colors" />
            </button>
          ))}
        </div>
      </section>

      {/* Theme */}
      <section className="card-base p-5 mb-5">
        <h2 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <Sun className="w-4 h-4 text-sky-500" />
          Appearance
        </h2>
        <div className="grid grid-cols-3 gap-2">
          {([
            { key: "light",  label: "Light",  icon: Sun },
            { key: "dark",   label: "Dark",   icon: Moon },
            { key: "system", label: "System", icon: Monitor },
          ] as { key: Theme; label: string; icon: React.ElementType }[]).map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTheme(key)}
              className={cn(
                "flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all",
                theme === key
                  ? "border-sky-500 bg-sky-50 text-sky-700"
                  : "border-slate-200 text-slate-500 hover:border-slate-300"
              )}
            >
              <Icon className="w-5 h-5" />
              <span className="text-xs font-medium">{label}</span>
              {theme === key && <Check className="w-3 h-3" />}
            </button>
          ))}
        </div>
      </section>

      {/* Notifications */}
      <section className="card-base p-5 mb-5">
        <h2 className="font-semibold text-slate-900 mb-1 flex items-center gap-2">
          <Bell className="w-4 h-4 text-sky-500" />
          Notifications
        </h2>
        <ToggleRow
          label="Status updates"
          description="When application status changes"
          checked={notifications.statusUpdates}
          onChange={(v) => setNotifications({ ...notifications, statusUpdates: v })}
        />
        <ToggleRow
          label="Deadline reminders"
          description="Before application deadlines"
          checked={notifications.deadlineReminders}
          onChange={(v) => setNotifications({ ...notifications, deadlineReminders: v })}
        />
        <ToggleRow
          label="Weekly digest"
          description="Summary of your job search activity"
          checked={notifications.weeklyDigest}
          onChange={(v) => setNotifications({ ...notifications, weeklyDigest: v })}
        />
        <ToggleRow
          label="AI suggestions"
          description="Tips to improve your documents"
          checked={notifications.aiSuggestions}
          onChange={(v) => setNotifications({ ...notifications, aiSuggestions: v })}
        />
      </section>

      {/* Privacy */}
      <section className="card-base p-5 mb-5">
        <h2 className="font-semibold text-slate-900 mb-1 flex items-center gap-2">
          <Eye className="w-4 h-4 text-sky-500" />
          Privacy
        </h2>
        <ToggleRow
          label="Public profile"
          description="Let others find your profile"
          checked={privacy.profileVisible}
          onChange={(v) => setPrivacy({ ...privacy, profileVisible: v })}
        />
        <ToggleRow
          label="Share application stats"
          description="Help improve our AI models"
          checked={privacy.shareApplications}
          onChange={(v) => setPrivacy({ ...privacy, shareApplications: v })}
        />
        <ToggleRow
          label="Analytics opt-in"
          description="Anonymous usage data"
          checked={privacy.analyticsOptIn}
          onChange={(v) => setPrivacy({ ...privacy, analyticsOptIn: v })}
        />
      </section>

      {/* Danger zone */}
      <section className="card-base p-5 mb-5 border-red-100">
        <h2 className="font-semibold text-red-600 mb-3 flex items-center gap-2">
          <Trash2 className="w-4 h-4" />
          Danger Zone
        </h2>
        <button className="flex items-center gap-2 text-sm text-red-600 hover:text-red-700 hover:underline transition-colors">
          <Trash2 className="w-3.5 h-3.5" />
          Delete my account and all data
        </button>
      </section>

      {/* Save + Sign out */}
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={handleSave}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all",
            saved
              ? "bg-emerald-50 text-emerald-700 border border-emerald-300"
              : "bg-sky-600 text-white hover:bg-sky-700"
          )}
        >
          {saved ? <><Check className="w-4 h-4" /> Saved!</> : "Save Preferences"}
        </button>
        <button className="flex items-center justify-center gap-2 py-3 px-5 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50 transition-colors">
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </div>
  );
}
