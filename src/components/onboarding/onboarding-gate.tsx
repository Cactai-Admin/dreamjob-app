"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { OnboardingModal, type OnboardingDraft } from "@/components/onboarding/onboarding-modal";
import {
  DEFAULT_ONBOARDING_CONTACT_PREFERENCES,
  hasConfirmedOnboardingPreferences,
  isOnboardingComplete,
  type OnboardingProfileDraft,
} from "@/lib/onboarding-memory";

const ONBOARDING_STORAGE_KEY = "dreamjob_onboarding_preferences";
const ONBOARDING_COMPLETED_AT_KEY = "dreamjob_onboarding_completed_at";

export function OnboardingGate() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<OnboardingDraft>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    location: "",
    linkedinUrl: "",
    websiteUrl: "",
    preferences: DEFAULT_ONBOARDING_CONTACT_PREFERENCES,
  });

  useEffect(() => {
    Promise.all([
      fetch("/api/profile").then((r) => r.json()).catch(() => ({})),
      fetch("/api/auth/session").then((r) => r.json()).catch(() => ({})),
    ]).then(([profile, session]) => {
      let storedPreferences: Partial<OnboardingDraft["preferences"]> | null = null;
      try {
        const storedRaw = localStorage.getItem(ONBOARDING_STORAGE_KEY);
        storedPreferences = storedRaw ? JSON.parse(storedRaw) : null;
      } catch {
        // ignore malformed local storage
      }

      const preferencesConfirmed = hasConfirmedOnboardingPreferences(storedPreferences);
      const preferencesForForm: OnboardingDraft["preferences"] = {
        ...DEFAULT_ONBOARDING_CONTACT_PREFERENCES,
        ...(preferencesConfirmed ? storedPreferences : {}),
      };

      const nextDraft: OnboardingDraft = {
        firstName: profile?.first_name ?? "",
        lastName: profile?.last_name ?? "",
        email: session?.user?.account?.email ?? "",
        phone: profile?.phone ?? "",
        location: profile?.location ?? "",
        linkedinUrl: profile?.linkedin_url ?? "",
        websiteUrl: profile?.website_url ?? "",
        preferences: preferencesForForm,
      };
      setDraft(nextDraft);

      const completedOnce = Boolean(localStorage.getItem(ONBOARDING_COMPLETED_AT_KEY));
      const onboardingProfile: OnboardingProfileDraft = {
        firstName: nextDraft.firstName || null,
        lastName: nextDraft.lastName || null,
        email: nextDraft.email || null,
        phone: nextDraft.phone || null,
        location: nextDraft.location || null,
        contactPreferences: completedOnce ? nextDraft.preferences : null,
      };

      setOpen(!isOnboardingComplete(onboardingProfile));
    }).catch(() => {});
  }, [pathname]);

  const handleSave = async () => {
    setSaving(true);
    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        first_name: draft.firstName.trim() || null,
        last_name: draft.lastName.trim() || null,
        phone: draft.phone.trim() || null,
        location: draft.location.trim() || null,
        linkedin_url: draft.linkedinUrl.trim() || null,
        website_url: draft.websiteUrl.trim() || null,
      }),
    });
    const data = await res.json();
    if (!res.ok || data?.error) {
      setSaving(false);
      throw new Error(data?.error ?? "Unable to save onboarding data.");
    }

    localStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify(draft.preferences));
    localStorage.setItem(ONBOARDING_COMPLETED_AT_KEY, new Date().toISOString());
    setOpen(false);
    setSaving(false);
  };

  return (
    <OnboardingModal
      open={open}
      draft={draft}
      saving={saving}
      onDraftChange={setDraft}
      onSubmit={handleSave}
    />
  );
}
