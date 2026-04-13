"use client";

import { useState } from "react";
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

type StepKey =
  | "firstName"
  | "lastName"
  | "email"
  | "phone"
  | "location"
  | "linkedin"
  | "website"
  | "preferences"
  | "review";

export function OnboardingModal({ open, draft, saving, onDraftChange, onSubmit }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<StepKey>("linkedin");
  const [input, setInput] = useState("");

  const addTurn = (text: string, next: StepKey, updater: (value: string) => void) => {
    const value = text.trim();
    if (!value) return;
    updater(value);
    setInput("");
    setStep(next);
  };

  const updatePreference = (key: keyof OnboardingContactPreferences, checked: boolean) => {
    onDraftChange({
      ...draft,
      preferences: {
        ...draft.preferences,
        [key]: checked,
      },
    });
  };

  const isComplete = Boolean(
    draft.firstName.trim() &&
      draft.lastName.trim() &&
      draft.location.trim() &&
      draft.email.trim() &&
      draft.phone.trim()
  );
  const requiredStep: StepKey | null =
    !draft.firstName.trim() ? "firstName"
      : !draft.lastName.trim() ? "lastName"
        : !draft.email.trim() ? "email"
          : !draft.phone.trim() ? "phone"
            : !draft.location.trim() ? "location"
              : null;
  const activeStep: StepKey = requiredStep ?? step;

  return (
    <Dialog open={open}>
      <DialogContent className="sm:max-w-[640px]" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Welcome to DreamJob</DialogTitle>
          <DialogDescription>
            Let&apos;s do quick required onboarding through a short guided chat.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3 text-sm text-slate-700 max-h-[360px] overflow-y-auto">
            <div className="bg-white border border-slate-200 rounded-lg p-2.5">
              Hi — I&apos;m DreamJob. I&apos;ll collect a few foundations, then we&apos;ll start Stage 1.
            </div>
            {draft.firstName && (
              <div className="bg-sky-50 border border-sky-100 rounded-lg p-2.5 text-slate-800">
                First name: {draft.firstName}
              </div>
            )}
            {draft.lastName && (
              <div className="bg-sky-50 border border-sky-100 rounded-lg p-2.5 text-slate-800">
                Last name: {draft.lastName}
              </div>
            )}
            {(draft.email || draft.phone) && (
              <div className="bg-sky-50 border border-sky-100 rounded-lg p-2.5 text-slate-800">
                Email: {draft.email || "(missing)"} · Phone: {draft.phone || "(missing)"}
              </div>
            )}
            {draft.location && (
              <div className="bg-sky-50 border border-sky-100 rounded-lg p-2.5 text-slate-800">
                Location: {draft.location}
              </div>
            )}
            {draft.linkedinUrl && (
              <div className="bg-sky-50 border border-sky-100 rounded-lg p-2.5 text-slate-800">
                LinkedIn: {draft.linkedinUrl}
              </div>
            )}
            {draft.websiteUrl && (
              <div className="bg-sky-50 border border-sky-100 rounded-lg p-2.5 text-slate-800">
                Website: {draft.websiteUrl}
              </div>
            )}
          </div>

          {activeStep !== "preferences" && activeStep !== "review" && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-slate-600">
                {{
                  firstName: "What first name should I use?",
                  lastName: "Great. And your last name?",
                  email: "What email should appear on application materials?",
                  phone: "What phone number should appear on application materials?",
                  location: "What location should appear on your materials?",
                  linkedin: "Optional: LinkedIn profile URL?",
                  website: "Optional: personal website URL?",
                }[activeStep]}
              </p>
              <div className="flex gap-2">
                <input
                  className="form-input flex-1"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={
                    activeStep === "email"
                      ? "you@example.com"
                      : activeStep === "phone"
                        ? "(555) 123-4567"
                        : "Type your response"
                  }
                  onKeyDown={(e) => {
                    if (e.key !== "Enter") return;
                    if (activeStep === "firstName") addTurn(input, "linkedin", (v) => onDraftChange({ ...draft, firstName: v }));
                    else if (activeStep === "lastName") addTurn(input, "linkedin", (v) => onDraftChange({ ...draft, lastName: v }));
                    else if (activeStep === "email") addTurn(input, "linkedin", (v) => onDraftChange({ ...draft, email: v }));
                    else if (activeStep === "phone") addTurn(input, "linkedin", (v) => onDraftChange({ ...draft, phone: v }));
                    else if (activeStep === "location") addTurn(input, "linkedin", (v) => onDraftChange({ ...draft, location: v }));
                    else if (activeStep === "linkedin") addTurn(input, "website", (v) => onDraftChange({ ...draft, linkedinUrl: v }));
                    else if (activeStep === "website") addTurn(input, "preferences", (v) => onDraftChange({ ...draft, websiteUrl: v }));
                  }}
                />
                <button
                  className="btn-ocean px-3 py-2"
                  onClick={() => {
                    if (activeStep === "firstName") addTurn(input, "linkedin", (v) => onDraftChange({ ...draft, firstName: v }));
                    else if (activeStep === "lastName") addTurn(input, "linkedin", (v) => onDraftChange({ ...draft, lastName: v }));
                    else if (activeStep === "email") addTurn(input, "linkedin", (v) => onDraftChange({ ...draft, email: v }));
                    else if (activeStep === "phone") addTurn(input, "linkedin", (v) => onDraftChange({ ...draft, phone: v }));
                    else if (activeStep === "location") addTurn(input, "linkedin", (v) => onDraftChange({ ...draft, location: v }));
                    else if (activeStep === "linkedin") {
                      if (input.trim()) onDraftChange({ ...draft, linkedinUrl: input.trim() });
                      setInput("");
                      setStep("website");
                    } else if (activeStep === "website") {
                      if (input.trim()) onDraftChange({ ...draft, websiteUrl: input.trim() });
                      setInput("");
                      setStep("preferences");
                    }
                  }}
                >
                  Continue
                </button>
              </div>
              {(activeStep === "linkedin" || activeStep === "website") && requiredStep === null && (
                <button
                  className="text-xs text-slate-500 hover:text-slate-700"
                  onClick={() => {
                    setInput("");
                    setStep(activeStep === "linkedin" ? "website" : "preferences");
                  }}
                >
                  Skip for now
                </button>
              )}
            </div>
          )}

          {activeStep === "preferences" && (
            <div className="rounded-xl border border-slate-200 p-3">
              <p className="text-xs font-semibold text-slate-600 mb-2">What should DreamJob include in application materials?</p>
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
              <div className="flex justify-end mt-3">
                <button className="btn-ocean px-4 py-2" onClick={() => setStep("review")}>
                  Review
                </button>
              </div>
            </div>
          )}

          {error && <p className="text-xs text-red-600">{error}</p>}

          {activeStep === "review" && (
            <div className="flex justify-end">
              <button
                disabled={!isComplete || saving}
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
                {saving ? "Saving…" : "Save and continue"}
              </button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
