"use client";

import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { OnboardingContactPreferences } from "@/lib/onboarding-memory";

export interface OnboardingDraft {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  location: string;
  linkedinUrl: string;
  websiteUrl: string;
  preferences: OnboardingContactPreferences;
}

interface Props {
  open: boolean;
  draft: OnboardingDraft;
  saving: boolean;
  onDraftChange: (next: OnboardingDraft) => void;
  onSubmit: () => Promise<void> | void;
}

const prompts = [
  "Hi — I’m DreamJob. I’ll help you move faster with less effort.",
  "Before we start, I need a few basics so your materials can stay accurate.",
  "This is lightweight: name, contact details, and location preferences only.",
];

export function OnboardingModal({ open, draft, saving, onDraftChange, onSubmit }: Props) {
  const [error, setError] = useState<string | null>(null);

  const canContinue = useMemo(() => {
    return Boolean(
      draft.firstName.trim() &&
      draft.lastName.trim() &&
      draft.location.trim() &&
      (draft.email.trim() || draft.phone.trim())
    );
  }, [draft]);

  const updatePreference = (key: keyof OnboardingContactPreferences, checked: boolean) => {
    onDraftChange({
      ...draft,
      preferences: {
        ...draft.preferences,
        [key]: checked,
      },
    });
  };

  return (
    <Dialog open={open}>
      <DialogContent className="sm:max-w-[640px]">
        <DialogHeader>
          <DialogTitle>Welcome to DreamJob</DialogTitle>
          <DialogDescription>
            Quick onboarding before we guide your first opportunity analysis.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2 text-sm text-slate-700">
            {prompts.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <input
              className="form-input"
              placeholder="First name"
              value={draft.firstName}
              onChange={(e) => onDraftChange({ ...draft, firstName: e.target.value })}
            />
            <input
              className="form-input"
              placeholder="Last name"
              value={draft.lastName}
              onChange={(e) => onDraftChange({ ...draft, lastName: e.target.value })}
            />
            <input
              className="form-input"
              placeholder="Email (optional if phone provided)"
              value={draft.email}
              onChange={(e) => onDraftChange({ ...draft, email: e.target.value })}
            />
            <input
              className="form-input"
              placeholder="Phone (optional if email provided)"
              value={draft.phone}
              onChange={(e) => onDraftChange({ ...draft, phone: e.target.value })}
            />
            <input
              className="form-input sm:col-span-2"
              placeholder="Location (city/region)"
              value={draft.location}
              onChange={(e) => onDraftChange({ ...draft, location: e.target.value })}
            />
            <input
              className="form-input"
              placeholder="LinkedIn profile URL"
              value={draft.linkedinUrl}
              onChange={(e) => onDraftChange({ ...draft, linkedinUrl: e.target.value })}
            />
            <input
              className="form-input"
              placeholder="Personal website URL"
              value={draft.websiteUrl}
              onChange={(e) => onDraftChange({ ...draft, websiteUrl: e.target.value })}
            />
          </div>

          <div className="rounded-xl border border-slate-200 p-3">
            <p className="text-xs font-semibold text-slate-600 mb-2">Include in generated application materials:</p>
            <div className="grid sm:grid-cols-2 gap-2 text-sm text-slate-700">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={draft.preferences.includeEmail} onChange={(e) => updatePreference("includeEmail", e.target.checked)} />
                Email
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={draft.preferences.includePhone} onChange={(e) => updatePreference("includePhone", e.target.checked)} />
                Phone
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={draft.preferences.includeLinkedin} onChange={(e) => updatePreference("includeLinkedin", e.target.checked)} />
                LinkedIn
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={draft.preferences.includeWebsite} onChange={(e) => updatePreference("includeWebsite", e.target.checked)} />
                Website
              </label>
              <label className="flex items-center gap-2 sm:col-span-2">
                <input type="checkbox" checked={draft.preferences.includeLocation} onChange={(e) => updatePreference("includeLocation", e.target.checked)} />
                Location
              </label>
            </div>
          </div>

          {error && <p className="text-xs text-red-600">{error}</p>}

          <div className="flex justify-end">
            <button
              disabled={!canContinue || saving}
              className="btn-ocean px-4 py-2 disabled:opacity-50"
              onClick={async () => {
                try {
                  setError(null);
                  await onSubmit();
                } catch (e) {
                  setError(e instanceof Error ? e.message : "Unable to save onboarding details.");
                }
              }}
            >
              {saving ? "Saving…" : "Continue"}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
