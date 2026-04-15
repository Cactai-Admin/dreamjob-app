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
      <DialogContent className="sm:max-w-[640px] p-5 sm:p-6" showCloseButton={false}>
        <DialogHeader className="space-y-1">
          <DialogTitle className="text-xl font-bold tracking-tight text-slate-900">Welcome to DreamJob</DialogTitle>
          <DialogDescription className="text-sm text-slate-500">
            Let&apos;s do quick required onboarding through a short guided chat.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 space-y-4">
          <div className="card-base bg-slate-50 p-4 text-sm text-slate-700">
            <p className="font-medium text-slate-900">Onboarding progress</p>
            <p className="text-xs text-slate-500 mt-1">Required profile foundations for Stage 1 readiness.</p>
            <ul className="mt-3 space-y-1.5 text-xs">
              <li>• First name: {draft.firstName || "(missing)"}</li>
              <li>• Last name: {draft.lastName || "(missing)"}</li>
              <li>• Email: {draft.email || "(missing)"}</li>
              <li>• Phone: {draft.phone || "(missing)"}</li>
              <li>• Location: {draft.location || "(missing)"}</li>
              <li>• LinkedIn: {draft.linkedinUrl || "(optional)"}</li>
              <li>• Website: {draft.websiteUrl || "(optional)"}</li>
            </ul>
          </div>

          {activeStep !== "preferences" && activeStep !== "review" && (
            <div className="space-y-2.5">
              <p className="section-label">
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
                  className="btn-ocean px-4 py-2.5 text-sm"
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
                  className="text-xs text-slate-500 hover:text-slate-700 font-medium"
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
            <div className="card-base p-4">
              <p className="section-label mb-2">What should DreamJob include in application materials?</p>
              <div className="grid sm:grid-cols-2 gap-2 text-sm text-slate-700">
                <label className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-slate-50">
                  <input className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500" type="checkbox" checked={draft.preferences.includeEmail} onChange={(e) => updatePreference("includeEmail", e.target.checked)} />
                  Email
                </label>
                <label className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-slate-50">
                  <input className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500" type="checkbox" checked={draft.preferences.includePhone} onChange={(e) => updatePreference("includePhone", e.target.checked)} />
                  Phone
                </label>
                <label className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-slate-50">
                  <input className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500" type="checkbox" checked={draft.preferences.includeLinkedin} onChange={(e) => updatePreference("includeLinkedin", e.target.checked)} />
                  LinkedIn
                </label>
                <label className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-slate-50">
                  <input className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500" type="checkbox" checked={draft.preferences.includeWebsite} onChange={(e) => updatePreference("includeWebsite", e.target.checked)} />
                  Website
                </label>
                <label className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-slate-50 sm:col-span-2">
                  <input className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500" type="checkbox" checked={draft.preferences.includeLocation} onChange={(e) => updatePreference("includeLocation", e.target.checked)} />
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
