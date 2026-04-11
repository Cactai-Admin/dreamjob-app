"use client";

import { useState, useRef } from "react";
import {
  X, Upload, FileText, ClipboardPaste, Sparkles, RefreshCw,
  Check, ChevronDown, ChevronUp, AlertCircle, User, Briefcase, GraduationCap,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ParsedProfile {
  first_name?: string | null;
  last_name?: string | null;
  phone?: string | null;
  location?: string | null;
  headline?: string | null;
  summary?: string | null;
  linkedin_url?: string | null;
  github_url?: string | null;
  portfolio_url?: string | null;
  skills?: string[];
  keywords?: string[];
  tools?: string[];
  certifications?: string[];
  clearances?: string[];
}

interface ParsedEmployment {
  company_name: string;
  title: string;
  location?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  is_current?: boolean;
  description?: string | null;
  technologies?: string[];
}

interface ParsedEducation {
  institution: string;
  degree?: string | null;
  field_of_study?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  gpa?: string | null;
  description?: string | null;
}

interface ParseResult {
  profile: ParsedProfile;
  employment: ParsedEmployment[];
  education: ParsedEducation[];
}

interface Props {
  onClose: () => void;
  onApplied: () => void;
}

type Step = "input" | "preview";
type InputMode = "file" | "paste";

const PROFILE_FIELD_LABELS: Record<string, string> = {
  first_name: "First name", last_name: "Last name",
  phone: "Phone", location: "Location", headline: "Headline",
  summary: "Summary", linkedin_url: "LinkedIn URL", github_url: "GitHub URL",
  portfolio_url: "Portfolio URL", skills: "Skills", keywords: "Keywords",
  tools: "Tools", certifications: "Certifications", clearances: "Clearances",
};

export function UploadArtifactModal({ onClose, onApplied }: Props) {
  const [step, setStep] = useState<Step>("input");
  const [inputMode, setInputMode] = useState<InputMode>("file");
  const [pastedText, setPastedText] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [result, setResult] = useState<ParseResult | null>(null);
  const [applying, setApplying] = useState(false);

  // Selection state
  const [includeProfile, setIncludeProfile] = useState(true);
  const [includeEmployment, setIncludeEmployment] = useState<boolean[]>([]);
  const [includeEducation, setIncludeEducation] = useState<boolean[]>([]);
  const [profileOpen, setProfileOpen] = useState(true);
  const [empOpen, setEmpOpen] = useState(true);
  const [eduOpen, setEduOpen] = useState(true);

  const fileRef = useRef<HTMLInputElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);

  const readFile = (file: File) => {
    setFileError(null);
    setFileName(file.name);
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!["md", "txt", "pdf"].includes(ext ?? "")) {
      setFileError("Unsupported file type. Use .md, .txt, or .pdf");
      return;
    }
    const reader = new FileReader();
    reader.onload = e => {
      const text = e.target?.result as string;
      // Crude check: if content has too many non-printable chars it's a binary PDF
      const nonPrintable = (text.match(/[\x00-\x08\x0E-\x1F]/g) ?? []).length;
      if (nonPrintable > 50) {
        setFileError("This PDF appears to be image-based and can't be read as text. Please paste the content instead.");
        setFileContent(null);
      } else {
        setFileContent(text);
      }
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) readFile(file);
  };

  const content = inputMode === "paste" ? pastedText : fileContent;

  const parse = async () => {
    if (!content?.trim()) return;
    setParsing(true);
    setParseError(null);
    try {
      const res = await fetch("/api/profile/parse-artifact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Parse failed");
      setResult(data);
      setIncludeEmployment((data.employment ?? []).map(() => true));
      setIncludeEducation((data.education ?? []).map(() => true));
      setStep("preview");
    } catch (e) {
      setParseError(e instanceof Error ? e.message : "Something went wrong");
    }
    setParsing(false);
  };

  const apply = async () => {
    if (!result) return;
    setApplying(true);

    // Normalise for fuzzy matching (lower-case, alphanumeric only)
    const norm = (s: string | null | undefined) =>
      (s ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");

    // Fetch existing data to deduplicate against
    const [existingEmp, existingEdu, existingProf] = await Promise.all([
      fetch("/api/profile/employment").then(r => r.json()).catch(() => []),
      fetch("/api/profile/education").then(r => r.json()).catch(() => []),
      fetch("/api/profile").then(r => r.json()).catch(() => ({})),
    ]);

    const tasks: Promise<unknown>[] = [];

    // ── Profile fields ────────────────────────────────────────────────────────
    if (includeProfile) {
      const profilePayload: Record<string, unknown> = {};
      const p = result.profile ?? {};
      const fields: (keyof ParsedProfile)[] = [
        "first_name", "last_name", "phone", "location",
        "headline", "summary", "linkedin_url", "github_url", "portfolio_url",
      ];
      // Only fill fields that are currently empty in the existing profile
      for (const f of fields) {
        if (p[f] != null && !existingProf[f]) profilePayload[f] = p[f];
      }
      // Merge skills — union, no duplicates
      if (p.skills?.length) {
        const have = new Set((existingProf.skills ?? []).map(norm));
        const merged = [
          ...(existingProf.skills ?? []),
          ...p.skills.filter((s: string) => !have.has(norm(s))),
        ];
        if (merged.length > (existingProf.skills ?? []).length) profilePayload.skills = merged;
      }
      // Merge keywords — union, no duplicates
      if (p.keywords?.length) {
        const have = new Set((existingProf.keywords ?? []).map(norm));
        const merged = [
          ...(existingProf.keywords ?? []),
          ...p.keywords.filter((k: string) => !have.has(norm(k))),
        ];
        if (merged.length > (existingProf.keywords ?? []).length) profilePayload.keywords = merged;
      }
      // Merge tools
      if (p.tools?.length) {
        const have = new Set((existingProf.tools ?? []).map(norm));
        const merged = [
          ...(existingProf.tools ?? []),
          ...p.tools.filter((t: string) => !have.has(norm(t))),
        ];
        if (merged.length > (existingProf.tools ?? []).length) profilePayload.tools = merged;
      }
      // Merge certifications
      if (p.certifications?.length) {
        const have = new Set((existingProf.certifications ?? []).map(norm));
        const merged = [
          ...(existingProf.certifications ?? []),
          ...p.certifications.filter((c: string) => !have.has(norm(c))),
        ];
        if (merged.length > (existingProf.certifications ?? []).length) profilePayload.certifications = merged;
      }
      // Merge clearances
      if (p.clearances?.length) {
        const have = new Set((existingProf.clearances ?? []).map(norm));
        const merged = [
          ...(existingProf.clearances ?? []),
          ...p.clearances.filter((c: string) => !have.has(norm(c))),
        ];
        if (merged.length > (existingProf.clearances ?? []).length) profilePayload.clearances = merged;
      }
      if (Object.keys(profilePayload).length > 0) {
        tasks.push(
          fetch("/api/profile", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(profilePayload),
          })
        );
      }
    }

    // ── Employment ────────────────────────────────────────────────────────────
    for (let i = 0; i < (result.employment ?? []).length; i++) {
      if (!includeEmployment[i]) continue;
      const emp = result.employment[i];

      // Match on normalised company + title
      const match = (existingEmp as Record<string, unknown>[]).find(e =>
        norm(e.company_name as string) === norm(emp.company_name) &&
        norm(e.title as string) === norm(emp.title)
      );

      if (match) {
        // Patch only fields the existing entry is missing
        const patch: Record<string, unknown> = {};
        if (!match.location && emp.location) patch.location = emp.location;
        if (!match.description && emp.description) patch.description = emp.description;
        if (!(match.technologies as string[])?.length && emp.technologies?.length)
          patch.technologies = emp.technologies;
        if (!match.start_date && emp.start_date) patch.start_date = emp.start_date;
        if (!match.end_date && !emp.is_current && emp.end_date) patch.end_date = emp.end_date;
        if (Object.keys(patch).length > 0) {
          tasks.push(
            fetch(`/api/profile/employment/${match.id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(patch),
            })
          );
        }
        // else exact duplicate — skip
      } else {
        tasks.push(
          fetch("/api/profile/employment", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              company_name: emp.company_name,
              title: emp.title,
              location: emp.location ?? null,
              start_date: emp.start_date ?? "Present",
              end_date: emp.is_current ? null : (emp.end_date ?? null),
              is_current: emp.is_current ?? false,
              description: emp.description ?? null,
              technologies: emp.technologies ?? [],
            }),
          })
        );
      }
    }

    // ── Education ─────────────────────────────────────────────────────────────
    for (let i = 0; i < (result.education ?? []).length; i++) {
      if (!includeEducation[i]) continue;
      const edu = result.education[i];

      // Match on normalised institution name
      const match = (existingEdu as Record<string, unknown>[]).find(e =>
        norm(e.institution as string) === norm(edu.institution)
      );

      if (match) {
        const patch: Record<string, unknown> = {};
        if (!match.degree && edu.degree) patch.degree = edu.degree;
        if (!match.field_of_study && edu.field_of_study) patch.field_of_study = edu.field_of_study;
        if (!match.start_date && edu.start_date) patch.start_date = edu.start_date;
        if (!match.end_date && edu.end_date) patch.end_date = edu.end_date;
        if (!match.gpa && edu.gpa) patch.gpa = edu.gpa;
        if (!match.description && edu.description) patch.description = edu.description;
        if (Object.keys(patch).length > 0) {
          tasks.push(
            fetch(`/api/profile/education/${match.id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(patch),
            })
          );
        }
        // else exact duplicate — skip
      } else {
        tasks.push(
          fetch("/api/profile/education", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              institution: edu.institution,
              degree: edu.degree ?? null,
              field_of_study: edu.field_of_study ?? null,
              start_date: edu.start_date ?? null,
              end_date: edu.end_date ?? null,
              gpa: edu.gpa ?? null,
              description: edu.description ?? null,
            }),
          })
        );
      }
    }

    await Promise.all(tasks);
    setApplying(false);
    onApplied();
    onClose();
  };

  const ARRAY_FIELDS = ["skills", "keywords", "tools", "certifications", "clearances"];
  // Count non-null profile fields
  const profileFieldCount = result
    ? Object.entries(result.profile ?? {}).filter(([k, v]) =>
        ARRAY_FIELDS.includes(k) ? (v as string[])?.length > 0 : v != null
      ).length
    : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 flex-shrink-0">
          <div>
            <h2 className="font-semibold text-slate-900">Upload Artifact</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {step === "input"
                ? "Import your resume or cover letter to populate your profile"
                : "Review what was found — uncheck anything you don't want to import"}
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-5">
          {step === "input" ? (
            <div className="space-y-4">
              {/* Mode tabs */}
              <div className="flex gap-2 p-1 bg-slate-100 rounded-xl">
                <button
                  onClick={() => setInputMode("file")}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 text-sm font-medium py-2 rounded-lg transition-all",
                    inputMode === "file" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                  )}>
                  <Upload className="w-3.5 h-3.5" /> Upload file
                </button>
                <button
                  onClick={() => setInputMode("paste")}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 text-sm font-medium py-2 rounded-lg transition-all",
                    inputMode === "paste" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                  )}>
                  <ClipboardPaste className="w-3.5 h-3.5" /> Paste text
                </button>
              </div>

              {inputMode === "file" ? (
                <div>
                  <div
                    ref={dropRef}
                    onDragOver={e => { e.preventDefault(); setDragging(true); }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={handleDrop}
                    onClick={() => fileRef.current?.click()}
                    className={cn(
                      "border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors",
                      dragging ? "border-sky-400 bg-sky-50" : fileContent ? "border-emerald-300 bg-emerald-50" : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                    )}>
                    <input
                      ref={fileRef}
                      type="file"
                      accept=".md,.txt,.pdf"
                      className="hidden"
                      onChange={e => { if (e.target.files?.[0]) readFile(e.target.files[0]); }}
                    />
                    {fileContent ? (
                      <>
                        <FileText className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                        <p className="font-medium text-emerald-700 text-sm">{fileName}</p>
                        <p className="text-xs text-emerald-600 mt-1">File loaded — click to change</p>
                      </>
                    ) : (
                      <>
                        <Upload className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                        <p className="font-medium text-slate-700 text-sm">Drop your file here</p>
                        <p className="text-xs text-slate-400 mt-1">or click to browse · .md, .txt, .pdf</p>
                      </>
                    )}
                  </div>
                  {fileError && (
                    <div className="flex items-start gap-2 mt-3 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
                      <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                      {fileError}
                    </div>
                  )}
                </div>
              ) : (
                <textarea
                  value={pastedText}
                  onChange={e => setPastedText(e.target.value)}
                  placeholder="Paste your resume or cover letter text here…"
                  rows={10}
                  className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-sky-200 resize-none leading-relaxed placeholder:text-slate-400"
                />
              )}

              {parseError && (
                <div className="flex items-start gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                  {parseError}
                </div>
              )}
            </div>
          ) : (
            /* Preview step */
            <div className="space-y-3">

              {/* Profile fields */}
              {profileFieldCount > 0 && (
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <button
                    onClick={() => setProfileOpen(o => !o)}
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-2.5">
                      <input type="checkbox" checked={includeProfile}
                        onChange={e => { e.stopPropagation(); setIncludeProfile(e.target.checked); }}
                        onClick={e => e.stopPropagation()}
                        className="rounded border-slate-300 text-sky-600 focus:ring-sky-200" />
                      <User className="w-3.5 h-3.5 text-sky-500" />
                      <span className="text-sm font-semibold text-slate-900">Profile Info</span>
                      <span className="text-xs text-slate-400">{profileFieldCount} field{profileFieldCount !== 1 ? "s" : ""}</span>
                    </div>
                    {profileOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                  </button>
                  {profileOpen && (
                    <div className="px-4 pb-3 border-t border-slate-100 space-y-1.5 pt-2">
                      {Object.entries(result!.profile ?? {}).map(([k, v]) => {
                        if (ARRAY_FIELDS.includes(k)) {
                          if (!Array.isArray(v) || v.length === 0) return null;
                          const badgeClass =
                            k === "keywords" ? "bg-violet-50 text-violet-700 border-violet-200" :
                            k === "tools" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                            k === "certifications" ? "bg-amber-50 text-amber-700 border-amber-200" :
                            k === "clearances" ? "bg-rose-50 text-rose-700 border-rose-200" :
                            "bg-sky-50 text-sky-700 border-sky-200";
                          return (
                            <div key={k} className="flex gap-2 text-xs">
                              <span className="text-slate-400 w-28 flex-shrink-0 pt-0.5">{PROFILE_FIELD_LABELS[k] ?? k}</span>
                              <div className="flex flex-wrap gap-1">
                                {(v as string[]).map(s => (
                                  <span key={s} className={cn("px-1.5 py-0.5 rounded-full border", badgeClass)}>{s}</span>
                                ))}
                              </div>
                            </div>
                          );
                        }
                        if (!v) return null;
                        return (
                          <div key={k} className="flex gap-2 text-xs">
                            <span className="text-slate-400 w-28 flex-shrink-0">{PROFILE_FIELD_LABELS[k] ?? k}</span>
                            <span className="text-slate-700 flex-1 break-all">{String(v)}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Employment */}
              {(result?.employment ?? []).length > 0 && (
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <button
                    onClick={() => setEmpOpen(o => !o)}
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-2.5">
                      <Briefcase className="w-3.5 h-3.5 text-sky-500" />
                      <span className="text-sm font-semibold text-slate-900">Work Experience</span>
                      <span className="text-xs text-slate-400">{result!.employment.length} position{result!.employment.length !== 1 ? "s" : ""}</span>
                    </div>
                    {empOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                  </button>
                  {empOpen && (
                    <div className="border-t border-slate-100 divide-y divide-slate-100">
                      {result!.employment.map((emp, i) => (
                        <label key={i} className="flex items-start gap-3 px-4 py-3 hover:bg-slate-50 cursor-pointer">
                          <input type="checkbox" checked={includeEmployment[i] ?? true}
                            onChange={e => setIncludeEmployment(arr => arr.map((v, idx) => idx === i ? e.target.checked : v))}
                            className="mt-0.5 rounded border-slate-300 text-sky-600 focus:ring-sky-200 flex-shrink-0" />
                          <div className="min-w-0">
                            <div className="text-sm font-medium text-slate-900">{emp.title}</div>
                            <div className="text-xs text-slate-500">{emp.company_name}{emp.location ? ` · ${emp.location}` : ""}</div>
                            <div className="text-xs text-slate-400">
                              {emp.start_date}{emp.is_current ? " – Present" : emp.end_date ? ` – ${emp.end_date}` : ""}
                            </div>
                          </div>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Education */}
              {(result?.education ?? []).length > 0 && (
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <button
                    onClick={() => setEduOpen(o => !o)}
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-2.5">
                      <GraduationCap className="w-3.5 h-3.5 text-sky-500" />
                      <span className="text-sm font-semibold text-slate-900">Education</span>
                      <span className="text-xs text-slate-400">{result!.education.length} entr{result!.education.length !== 1 ? "ies" : "y"}</span>
                    </div>
                    {eduOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                  </button>
                  {eduOpen && (
                    <div className="border-t border-slate-100 divide-y divide-slate-100">
                      {result!.education.map((edu, i) => (
                        <label key={i} className="flex items-start gap-3 px-4 py-3 hover:bg-slate-50 cursor-pointer">
                          <input type="checkbox" checked={includeEducation[i] ?? true}
                            onChange={e => setIncludeEducation(arr => arr.map((v, idx) => idx === i ? e.target.checked : v))}
                            className="mt-0.5 rounded border-slate-300 text-sky-600 focus:ring-sky-200 flex-shrink-0" />
                          <div className="min-w-0">
                            <div className="text-sm font-medium text-slate-900">{edu.institution}</div>
                            <div className="text-xs text-slate-500">
                              {[edu.degree, edu.field_of_study].filter(Boolean).join(", ")}
                            </div>
                            {(edu.start_date || edu.end_date) && (
                              <div className="text-xs text-slate-400">
                                {edu.start_date}{edu.end_date ? ` – ${edu.end_date}` : ""}
                              </div>
                            )}
                          </div>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {profileFieldCount === 0 && (result?.employment ?? []).length === 0 && (result?.education ?? []).length === 0 && (
                <div className="text-center py-8 text-slate-400 text-sm">
                  No profile data could be extracted. Try pasting the content directly.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-t border-slate-100 flex-shrink-0">
          {step === "preview" ? (
            <>
              <button onClick={() => setStep("input")}
                className="text-sm text-slate-500 hover:text-slate-700 transition-colors">
                ← Back
              </button>
              <button
                onClick={apply}
                disabled={applying || (profileFieldCount === 0 && includeEmployment.every(v => !v) && includeEducation.every(v => !v))}
                className="flex items-center gap-2 text-sm font-semibold px-5 py-2.5 rounded-xl bg-slate-900 text-white hover:bg-slate-800 transition-colors disabled:opacity-40">
                {applying ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                {applying ? "Applying…" : "Apply to Profile"}
              </button>
            </>
          ) : (
            <>
              <button onClick={onClose} className="text-sm text-slate-500 hover:text-slate-700 transition-colors">
                Cancel
              </button>
              <button
                onClick={parse}
                disabled={parsing || !content?.trim()}
                className="flex items-center gap-2 text-sm font-semibold px-5 py-2.5 rounded-xl bg-slate-900 text-white hover:bg-slate-800 transition-colors disabled:opacity-40">
                {parsing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                {parsing ? "Parsing…" : "Parse Document"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
