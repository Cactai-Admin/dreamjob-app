"use client";

// ── Settings — AI provider, LinkedIn, appearance, account preferences ──

import { useState, useEffect } from "react";
import {
  Sun, Moon, Monitor, Bell, Shield, Trash2, Zap, Link2,
  LogOut, ChevronRight, Eye, EyeOff, Check, AlertCircle as AlertTriangle,
  RefreshCw, WifiOff, Lock,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { cn } from "@/lib/utils";

type Theme = "light" | "dark" | "system";
type ProviderName = "openai" | "anthropic";

const PROVIDER_INFO: Record<ProviderName, { name: string; model: string; description: string }> = {
  openai: {
    name: "OpenAI (ChatGPT)",
    model: "gpt-4o",
    description: "Fast, widely-used, excellent for document writing.",
  },
  anthropic: {
    name: "Anthropic (Claude)",
    model: "claude-3-5-sonnet",
    description: "Strong reasoning and long-context understanding.",
  },
};

const LS_KEY = "dreamjob_settings";

function loadSettings() {
  if (typeof window === "undefined") return null;
  try { return JSON.parse(localStorage.getItem(LS_KEY) ?? "{}"); } catch { return {}; }
}
function saveSettings(patch: Record<string, unknown>) {
  const current = loadSettings() ?? {};
  localStorage.setItem(LS_KEY, JSON.stringify({ ...current, ...patch }));
}

export default function SettingsPage() {
  const [profile, setProfile] = useState<{ first_name?: string; last_name?: string; email?: string; avatar_url?: string }>({});
  const [providers, setProviders] = useState<{ anthropic: boolean; openai: boolean; default: string } | null>(null);
  const [linkedIn, setLinkedIn] = useState<{ isAuthenticated: boolean; session?: { last_verified_at?: string } } | null>(null);
  const [linkedInLoading, setLinkedInLoading] = useState(false);
  const [linkedInStep, setLinkedInStep] = useState<"idle" | "launching" | "verifying">("idle");
  const [linkedInError, setLinkedInError] = useState<string | null>(null);

  const [theme, setTheme] = useState<Theme>("system");
  const [aiProvider, setAiProvider] = useState<ProviderName>("openai");
  const [notifications, setNotifications] = useState({
    statusUpdates: true,
    deadlineReminders: true,
    weeklyDigest: false,
    aiSuggestions: true,
  });
  const [privacy, setPrivacy] = useState({
    analyticsOptIn: true,
  });
  const [privacyScreenTimeout, setPrivacyScreenTimeout] = useState(5 * 60 * 1000);
  const [privacyScreenEnabled, setPrivacyScreenEnabled] = useState(true);
  const [showEmail, setShowEmail] = useState(false);
  const [saved, setSaved] = useState(false);

  // Load on mount
  useEffect(() => {
    fetch("/api/profile").then(r => r.json()).then(d => { if (!d.error) setProfile(d); }).catch(() => {});
    fetch("/api/settings/providers").then(r => r.json()).then(d => { if (!d.error) setProviders(d); }).catch(() => {});
    fetch("/api/linkedin/session").then(r => r.json()).then(d => { if (!d.error) setLinkedIn(d); }).catch(() => {});

    const stored = loadSettings();
    if (stored.theme) setTheme(stored.theme);
    if (stored.aiProvider) setAiProvider(stored.aiProvider);
    if (stored.notifications) setNotifications(stored.notifications);
    if (stored.privacy) setPrivacy(stored.privacy);
    if (stored.privacyScreenTimeout) setPrivacyScreenTimeout(stored.privacyScreenTimeout);
    if (typeof stored.privacyScreenEnabled === 'boolean') setPrivacyScreenEnabled(stored.privacyScreenEnabled);
  }, []);

  const handleSave = () => {
    saveSettings({ theme, aiProvider, notifications, privacy, privacyScreenTimeout, privacyScreenEnabled });
    // Notify the PrivacyScreenProvider (same tab won't fire StorageEvent)
    window.dispatchEvent(new Event('dreamjob:settings-saved'));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleSignOut = async () => {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    window.location.href = "/login";
  };

  const launchLinkedIn = async () => {
    setLinkedInLoading(true);
    setLinkedInError(null);
    setLinkedInStep("launching");
    try {
      const res = await fetch("/api/linkedin/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "launch" }),
      });
      const data = await res.json();
      if (data.success) {
        setLinkedInStep("verifying");
      } else {
        setLinkedInStep("idle");
        setLinkedInError(data.message ?? "Failed to launch browser");
      }
    } catch (e) {
      setLinkedInStep("idle");
      setLinkedInError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLinkedInLoading(false);
    }
  };

  const verifyLinkedIn = async () => {
    setLinkedInLoading(true);
    setLinkedInError(null);
    try {
      const res = await fetch("/api/linkedin/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "verify" }),
      });
      const data = await res.json();
      if (data.verified) {
        setLinkedIn({ isAuthenticated: true, session: { last_verified_at: new Date().toISOString() } });
        setLinkedInStep("idle");
        setLinkedInError(null);
      } else {
        setLinkedInError(data.reason ?? "Not verified yet — complete sign-in in the LinkedIn browser window, then try again.");
      }
    } catch (e) {
      setLinkedInError(e instanceof Error ? e.message : "Verification failed");
    } finally {
      setLinkedInLoading(false);
    }
  };

  const disconnectLinkedIn = async () => {
    setLinkedInLoading(true);
    try {
      await fetch("/api/linkedin/session", { method: "DELETE" });
      setLinkedIn({ isAuthenticated: false });
      setLinkedInStep("idle");
    } catch {
      /* ignore */
    } finally {
      setLinkedInLoading(false);
    }
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
            { label: "Change password" },
            { label: "Update email" },
            { label: "Export my data" },
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

      {/* AI Provider */}
      <section className="card-base p-5 mb-5">
        <h2 className="font-semibold text-slate-900 mb-1 flex items-center gap-2">
          <Zap className="w-4 h-4 text-sky-500" />
          AI Provider
        </h2>
        <p className="text-xs text-slate-400 mb-4">Choose which AI model generates your documents and chat responses.</p>

        {providers === null ? (
          <div className="text-slate-400 text-sm">Checking configuration…</div>
        ) : (
          <div className="space-y-3">
            {(["openai", "anthropic"] as ProviderName[]).map((key) => {
              const info = PROVIDER_INFO[key];
              const configured = providers[key];
              const selected = aiProvider === key;
              return (
                <button
                  key={key}
                  onClick={() => configured && setAiProvider(key)}
                  disabled={!configured}
                  className={cn(
                    "w-full text-left p-4 rounded-xl border-2 transition-all",
                    selected && configured
                      ? "border-sky-500 bg-sky-50"
                      : configured
                      ? "border-slate-200 hover:border-slate-300"
                      : "border-slate-100 opacity-50 cursor-not-allowed"
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className={cn(
                          "text-sm font-semibold",
                          selected && configured ? "text-sky-700" : "text-slate-800"
                        )}>
                          {info.name}
                        </span>
                        <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-mono">
                          {info.model}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500">{info.description}</p>
                    </div>
                    <div className="flex-shrink-0 flex flex-col items-end gap-1">
                      {configured ? (
                        <span className="text-xs text-emerald-600 font-medium flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                          Configured
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400 flex items-center gap-1">
                          <WifiOff className="w-3 h-3" />
                          No API key
                        </span>
                      )}
                      {selected && configured && (
                        <Check className="w-4 h-4 text-sky-600" />
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
            {!providers.anthropic && !providers.openai && (
              <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>No API keys set. Add <code className="font-mono text-xs">ANTHROPIC_API_KEY</code> or <code className="font-mono text-xs">OPENAI_API_KEY</code> to your environment.</span>
              </div>
            )}
            <p className="text-xs text-slate-400 mt-1">
              {providers[aiProvider]
                ? `${PROVIDER_INFO[aiProvider].name} will be used for all AI generation. Click Save Preferences to apply.`
                : "Select a configured provider above, then Save."}
            </p>
          </div>
        )}
      </section>

      {/* LinkedIn Session */}
      <section className="card-base p-5 mb-5">
        <h2 className="font-semibold text-slate-900 mb-1 flex items-center gap-2">
          <Link2 className="w-4 h-4 text-sky-500" />
          LinkedIn Session
        </h2>
        <p className="text-xs text-slate-400 mb-4">
          Connect your LinkedIn account to enable company research and connection insights.
          Requires a local browser window to complete sign-in.
        </p>

        {linkedIn === null ? (
          <div className="text-slate-400 text-sm">Checking status…</div>
        ) : linkedIn.isAuthenticated ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
              <span className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" />
              <span className="text-sm text-emerald-700 font-medium">Connected</span>
              {linkedIn.session?.last_verified_at && (
                <span className="text-xs text-emerald-600 ml-auto">
                  Last verified {new Date(linkedIn.session.last_verified_at).toLocaleDateString()}
                </span>
              )}
            </div>
            <button
              onClick={disconnectLinkedIn}
              disabled={linkedInLoading}
              className="text-sm text-red-500 hover:text-red-600 flex items-center gap-1.5 disabled:opacity-50"
            >
              <WifiOff className="w-3.5 h-3.5" />
              Disconnect
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2 p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="w-2 h-2 rounded-full bg-slate-300 flex-shrink-0" />
              <span className="text-sm text-slate-500">Not connected</span>
            </div>

            {linkedInStep === "idle" && (
              <button
                onClick={launchLinkedIn}
                disabled={linkedInLoading}
                className="flex items-center gap-2 text-sm bg-sky-600 text-white px-4 py-2 rounded-xl hover:bg-sky-700 transition-colors disabled:opacity-50"
              >
                <Link2 className="w-4 h-4" />
                Connect LinkedIn
              </button>
            )}

            {linkedInStep === "launching" && (
              <div className="text-sm text-slate-600 flex items-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-sky-500" />
                Opening browser… sign in to LinkedIn, then click Verify below.
              </div>
            )}

            {linkedInStep === "verifying" && (
              <div className="space-y-2">
                <p className="text-sm text-slate-600">Sign in to LinkedIn in the browser that opened, then click verify.</p>
                <div className="flex gap-2">
                  <button
                    onClick={verifyLinkedIn}
                    disabled={linkedInLoading}
                    className="flex items-center gap-2 text-sm bg-emerald-600 text-white px-4 py-2 rounded-xl hover:bg-emerald-700 transition-colors disabled:opacity-50"
                  >
                    <Check className="w-4 h-4" />
                    {linkedInLoading ? "Verifying…" : "I've signed in — verify"}
                  </button>
                  <button
                    onClick={() => { setLinkedInStep("idle"); setLinkedInError(null); }}
                    className="text-sm px-3 py-2 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {linkedInError && (
              <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{linkedInError}</span>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Appearance */}
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
          label="Analytics opt-in"
          description="Anonymous usage data to improve the product"
          checked={privacy.analyticsOptIn}
          onChange={(v) => setPrivacy({ ...privacy, analyticsOptIn: v })}
        />
      </section>

      {/* Privacy Screen */}
      <section className="card-base p-5 mb-5">
        <h2 className="font-semibold text-slate-900 mb-1 flex items-center gap-2">
          <Lock className="w-4 h-4 text-sky-500" />
          Privacy Screen
        </h2>
        <p className="text-xs text-slate-400 mb-4">
          Activates the starfield lock screen after a period of inactivity.
          You can also trigger it manually with the lock icon in the nav or <kbd className="font-mono bg-slate-100 px-1 py-0.5 rounded text-slate-600">⌘⇧L</kbd>.
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setPrivacyScreenEnabled(false)}
            className={cn(
              "px-4 py-2 rounded-xl text-sm font-medium border-2 transition-all",
              !privacyScreenEnabled
                ? "border-slate-800 bg-slate-900 text-white"
                : "border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-700"
            )}
          >
            {!privacyScreenEnabled && <Check className="w-3 h-3 inline mr-1.5 mb-0.5" />}
            Off
          </button>
          {[
            { label: "5 min",  ms: 5  * 60 * 1000 },
            { label: "15 min", ms: 15 * 60 * 1000 },
            { label: "30 min", ms: 30 * 60 * 1000 },
            { label: "60 min", ms: 60 * 60 * 1000 },
          ].map(({ label, ms }) => (
            <button
              key={ms}
              onClick={() => { setPrivacyScreenEnabled(true); setPrivacyScreenTimeout(ms); }}
              className={cn(
                "px-4 py-2 rounded-xl text-sm font-medium border-2 transition-all",
                privacyScreenEnabled && privacyScreenTimeout === ms
                  ? "border-sky-500 bg-sky-50 text-sky-700"
                  : "border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-700"
              )}
            >
              {privacyScreenEnabled && privacyScreenTimeout === ms && <Check className="w-3 h-3 inline mr-1.5 mb-0.5" />}
              {label}
            </button>
          ))}
        </div>
        <p className="text-xs text-slate-400 mt-3">
          Click <strong className="text-slate-600">Save Preferences</strong> below to apply.
        </p>
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
        <button
          onClick={handleSignOut}
          className="flex items-center justify-center gap-2 py-3 px-5 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </div>
  );
}
