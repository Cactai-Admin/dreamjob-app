"use client";

// ── Listing Review — Verify parsed data, check match score, find connections, then decide to apply ──

import { useState, useEffect, use, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Plus, X, Briefcase, Building2,
  Users, Star, Sparkles, ExternalLink, RefreshCw, Check, Save,
  Link2, TrendingUp, AlertCircle, ChevronRight, Trash2,
  BookmarkPlus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Workflow } from "@/lib/types";
import { parseRequirements, computeRequirementMatch } from "@/lib/listing-match";
import { AiChatPanel } from "@/components/documents/ai-chat-panel";
import { normalizeCanonicalListing } from "@/lib/ai/context/canonical-listing";

interface Props {
  params: Promise<{ id: string }>;
}

type ProfileCategory = "skills" | "keywords" | "tools" | "certifications" | "clearances";
type LinkedInRuntime = {
  mode: "local-browser" | "hosted-unsupported";
  canLaunchInteractiveSession: boolean;
  reason?: string;
};

export default function ListingReviewPage({ params }: Props) {
  const { id } = use(params);
  const router = useRouter();

  const [workflow, setWorkflow] = useState<Workflow | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [starting, setStarting] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Listing fields
  const [title, setTitle] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [location, setLocation] = useState("");
  const [salary, setSalary] = useState("");
  const [empType, setEmpType] = useState("");
  const [expLevel, setExpLevel] = useState("");
  const [companyWebsite, setCompanyWebsite] = useState("");
  const [description, setDescription] = useState("");
  const [reqs, setReqs] = useState<string[]>([]);
  const [newReq, setNewReq] = useState("");
  const [manualBuckets, setManualBuckets] = useState({
    responsibilities: "",
    roleMotion: "",
    proofNeeded: "",
    interviewSignals: "",
    contextNotes: "",
  });
  const [editorOpen, setEditorOpen] = useState(false);

  // Profile for match
  const [skills, setSkills] = useState<string[]>([]);
  const [keywords, setKeywords] = useState<string[]>([]);
  const [profileTools, setProfileTools] = useState<string[]>([]);
  const [profileCerts, setProfileCerts] = useState<string[]>([]);
  const [profileClearances, setProfileClearances] = useState<string[]>([]);
  const [tech, setTech] = useState<string[]>([]);

  // Add-to-profile modal
  const [addModal, setAddModal] = useState<{ term: string; editedTerm: string } | null>(null);
  const [addingSaving, setAddingSaving] = useState(false);
  const [manuallyMarked, setManuallyMarked] = useState<string[]>([]);

  // LinkedIn
  const [linkedInActive, setLinkedInActive] = useState(false);
  const [linkedInRuntime, setLinkedInRuntime] = useState<LinkedInRuntime | null>(null);
  const [linkedInUrl, setLinkedInUrl] = useState("");
  const [fetchingConns, setFetchingConns] = useState(false);
  type ConnPerson = { name: string; profileUrl: string };
  type Connections = {
    first: ConnPerson[];
    second: ConnPerson[];
    third: ConnPerson[];
    counts: { first: number; second: number; third: number; total: number };
  };
  const [connections, setConnections] = useState<Connections | null>(null);
  const [connError, setConnError] = useState<string | null>(null);
  const [modalDegree, setModalDegree] = useState<'first' | 'second' | 'third' | null>(null);

  useEffect(() => {
    Promise.all([
      fetch(`/api/workflows/${id}`).then(r => r.json()),
      fetch("/api/profile").then(r => r.json()),
      fetch("/api/profile/employment").then(r => r.json()),
      fetch("/api/linkedin/session").then(r => r.json()),
    ]).then(([wf, prof, emp, li]) => {
      if (wf?.id) {
        setWorkflow(wf);
        const l = wf.listing ?? {};
        const canonical = normalizeCanonicalListing(l);
        setTitle(l.title ?? wf.title ?? "");
        setCompanyName(l.company_name ?? wf.company?.name ?? "");
        setLocation(l.location ?? "");
        setSalary(l.salary_range ?? "");
        setEmpType(l.employment_type ?? "");
        setExpLevel(l.experience_level ?? "");
        // Prefer the listing row (always linked), fall back to company join
        setCompanyWebsite(wf.listing?.company_website_url ?? wf.company?.website_url ?? "");
        setDescription(l.description ?? "");
        const canonicalReqs = canonical.exact_requirements
          .filter((item) => item.user_facing_relevance !== "suppress")
          .sort((a, b) => b.priority_weight - a.priority_weight)
          .map((item) => item.text);
        setReqs(canonicalReqs.length > 0 ? canonicalReqs : parseRequirements(l.requirements));
        setManualBuckets({
          responsibilities: l.responsibilities ?? "",
          roleMotion: canonical.opportunity_review?.role_motion_operating_context?.join('\n') ?? "",
          proofNeeded: canonical.opportunity_review?.top_resume_proof_needed?.join('\n') ?? "",
          interviewSignals: canonical.content_buckets?.hiring_logistics?.join('\n') ?? "",
          contextNotes: canonical.content_buckets?.company_context?.join('\n') ?? "",
        });
        setLinkedInUrl(wf.company?.linkedin_url ?? "");
      }
      if (prof && !prof.error) {
        setSkills(Array.isArray(prof.skills) ? prof.skills : []);
        setKeywords(Array.isArray(prof.keywords) ? prof.keywords : []);
        setProfileTools(Array.isArray(prof.tools) ? prof.tools : []);
        setProfileCerts(Array.isArray(prof.certifications) ? prof.certifications : []);
        setProfileClearances(Array.isArray(prof.clearances) ? prof.clearances : []);
      }
      if (Array.isArray(emp)) {
        setTech(emp.flatMap((e: { technologies?: string[] }) => Array.isArray(e.technologies) ? e.technologies : []));
      }
      if (li && !li.error) {
        setLinkedInActive(li.isAuthenticated);
        setLinkedInRuntime(li.runtime ?? null);
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [id]);

  const mark = () => setDirty(true);
  const canonicalListing = useMemo(() => normalizeCanonicalListing(workflow?.listing), [workflow?.listing]);

  const addToProfile = async (category: ProfileCategory, term: string) => {
    if (!term.trim()) return;
    setAddingSaving(true);
    const currentMap: Record<ProfileCategory, string[]> = {
      skills, keywords, tools: profileTools, certifications: profileCerts, clearances: profileClearances,
    };
    const existing = currentMap[category];
    const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
    const isDup = existing.some(e => norm(e) === norm(term.trim()));
    if (!isDup) {
      const updated = [...existing, term.trim()];
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [category]: updated }),
      });
      const data = await res.json();
      if (!data.error) {
        if (category === "skills") setSkills(updated);
        else if (category === "keywords") setKeywords(updated);
        else if (category === "tools") setProfileTools(updated);
        else if (category === "certifications") setProfileCerts(updated);
        else if (category === "clearances") setProfileClearances(updated);
      }
    }
    setAddingSaving(false);
    setAddModal(null);
  };

  const saveListing = useCallback(async () => {
    setSaving(true);
    await fetch(`/api/workflows/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: `${companyName} - ${title}`,
        listing: {
          title: title || undefined,
          company_name: companyName || undefined,
          location: location || null,
          salary_range: salary || null,
          employment_type: empType || null,
          experience_level: expLevel || null,
          description: description || null,
          requirements: reqs.length > 0 ? JSON.stringify(reqs) : null,
          responsibilities: manualBuckets.responsibilities || null,
          parsed_data: {
            ...(typeof workflow?.listing?.parsed_data === "object" && workflow?.listing?.parsed_data ? workflow.listing.parsed_data : {}),
            manual_review_buckets: {
              responsibilities: manualBuckets.responsibilities || null,
              role_motion: manualBuckets.roleMotion || null,
              proof_needed: manualBuckets.proofNeeded || null,
              interview_signals: manualBuckets.interviewSignals || null,
              context_notes: manualBuckets.contextNotes || null,
            },
          },
          company_website_url: companyWebsite || null,
        },
        company: (linkedInUrl || companyWebsite) ? {
          ...(linkedInUrl ? { linkedin_url: linkedInUrl } : {}),
          ...(companyWebsite ? { website_url: companyWebsite } : {}),
        } : undefined,
      }),
    });
    setSaving(false);
    setDirty(false);
    window.dispatchEvent(new CustomEvent("dreamjob:listing-saved"));
  }, [id, companyName, title, location, salary, empType, expLevel, description, reqs, manualBuckets, companyWebsite, linkedInUrl, workflow]);

  useEffect(() => {
    const onSaveProgress = () => {
      if (dirty && !saving) {
        void saveListing();
      }
    };
    window.addEventListener("dreamjob:save-progress", onSaveProgress);
    return () => window.removeEventListener("dreamjob:save-progress", onSaveProgress);
  }, [dirty, saving, saveListing]);

  const addReq = () => {
    const r = newReq.trim();
    if (!r) return;
    setReqs(p => [...p, r]);
    setNewReq("");
    mark();
  };

  const fetchConnections = async () => {
    if (!linkedInUrl) return;
    setFetchingConns(true);
    setConnError(null);
    try {
      const res = await fetch("/api/linkedin/company", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company_linkedin_url: linkedInUrl,
          company_name: companyName,
          listing_id: workflow?.listing_id,
          company_id: workflow?.company_id,
        }),
      });
      const data = await res.json();
      if (data.error) setConnError(data.error);
      else if (data.connections) setConnections(data.connections);
    } catch (e) { setConnError(e instanceof Error ? e.message : "Failed to fetch connections"); }
    setFetchingConns(false);
  };

  const startApplication = async () => {
    if (dirty) await saveListing();
    setStarting(true);

    // Advance workflow state to draft (active application)
    await fetch(`/api/workflows/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ state: "draft", is_active: true }),
    });

    router.push(`/jobs/${id}`);
  };

  const deleteListing = async () => {
    setDeleting(true);
    await fetch(`/api/workflows/${id}`, { method: "DELETE" });
    router.push("/listings");
  };

  const match = computeRequirementMatch(
    {
      requirements: reqs,
      skills,
      keywords,
      tools: profileTools,
      certifications: profileCerts,
      clearances: profileClearances,
      technologies: tech,
      manuallyMarked,
    },
    { includeAllMissingWhenNoProfileTerms: true }
  );
  const rankedRequirements = [...canonicalListing.exact_requirements, ...canonicalListing.nice_to_haves]
    .filter((item) => item.user_facing_relevance !== "suppress")
    .sort((a, b) => b.priority_weight - a.priority_weight)
    .slice(0, 8);
  const jobContextParts = [
    canonicalListing.job_context?.industry,
    canonicalListing.job_context?.offering_detail ?? canonicalListing.job_context?.offering_type,
    canonicalListing.job_context?.department,
    canonicalListing.job_context?.team,
    canonicalListing.job_context?.title_role ?? title,
  ].filter(Boolean);
  const provisionalAlignment = {
    strengths: canonicalListing.opportunity_review?.provisional_alignment?.likely_strengths?.length
      ? canonicalListing.opportunity_review.provisional_alignment.likely_strengths
      : match.matched.slice(0, 4),
    gaps: canonicalListing.opportunity_review?.provisional_alignment?.likely_missing_proof?.length
      ? canonicalListing.opportunity_review.provisional_alignment.likely_missing_proof
      : match.missing.slice(0, 4),
    caveats: [
      ...(canonicalListing.opportunity_review?.provisional_alignment?.confidence_caveats ?? []),
      ...(skills.length === 0 && keywords.length === 0 && profileTools.length === 0 ? ["Profile skills/tools are sparse, so this is a partial read."] : []),
      ...(tech.length === 0 ? ["Work history technologies/outcomes are limited, reducing confidence."] : []),
    ].filter(Boolean),
  };
  const assistantGuidance = canonicalListing.opportunity_review?.assistant_guidance ?? {
    gap_priorities: [],
    resume_targets: canonicalListing.opportunity_review?.top_resume_proof_needed ?? [],
    cover_letter_angles: canonicalListing.opportunity_review?.top_cover_letter_angles ?? [],
    compensation_flags: [],
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-6 h-6 border-2 border-slate-300 border-t-slate-900 rounded-full animate-spin" />
      </div>
    );
  }

  if (!workflow) return <div className="page-wrapper text-slate-500 text-sm">Listing not found.</div>;

  return (
    <>
    <div className="flex-1 flex overflow-hidden">
    <div className="page-wrapper max-w-1000px flex-1 overflow-y-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div className="flex items-start gap-3 min-w-0">
          <Link href="/listings" className="flex-shrink-0 w-8 h-8 mt-0.5 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 shadow-sm">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-slate-900 truncate">{title || "Untitled Listing"}</h1>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <p className="text-sm text-slate-500">{companyName} · Review before applying</p>
              {workflow?.listing?.source_url && (
                <a href={workflow.listing.source_url} target="_blank" rel="noreferrer"
                  className="flex items-center gap-1 text-xs text-sky-500 hover:underline">
                  <ExternalLink className="w-3 h-3" />Original listing
                </a>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {dirty && (
            <button
              onClick={saveListing}
              disabled={saving}
              className="flex items-center gap-1.5 text-sm px-3 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              {saving ? "Saving…" : "Save"}
            </button>
          )}
        </div>
      </div>

      <div className="grid gap-5">
        <div className="space-y-5">
          <div className="card-base p-5">
            <h2 className="font-semibold text-slate-900 mb-2">Opportunity Intelligence</h2>
            <p className="text-xs text-slate-500 mb-3">Strategic review first. Manual field edits are available in the secondary editor below.</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="text-[11px] uppercase tracking-wide font-semibold text-slate-500">Job context</p>
                <p className="text-xs text-slate-700 mt-1">
                  {jobContextParts.join(" → ") || "Context still uncertain; hierarchy intentionally partial."}
                </p>
                <p className="text-[10px] text-slate-500 mt-1">Confidence: {canonicalListing.job_context?.context_confidence ?? "low"}</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="text-[11px] uppercase tracking-wide font-semibold text-slate-500">Compensation summary</p>
                <p className="text-xs text-slate-700 mt-1">{canonicalListing.opportunity_review?.compensation_summary ?? canonicalListing.compensation ?? "Candidate pay not clearly listed yet."}</p>
                <p className="text-[10px] text-slate-500 mt-1">
                  {canonicalListing.opportunity_review?.sales_motion_summary?.length ? `Sales economics: ${canonicalListing.opportunity_review.sales_motion_summary.slice(0, 2).join(" · ")}` : "Sales economics shown separately when present."}
                </p>
              </div>
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div>
                <p className="text-[11px] uppercase tracking-wide font-semibold text-slate-500 mb-1">What matters most</p>
                <ul className="space-y-1 text-xs text-slate-700">
                  {(canonicalListing.opportunity_review?.what_matters_most ?? []).slice(0, 4).map((item, idx) => <li key={`${item}-${idx}`}>• {item}</li>)}
                </ul>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wide font-semibold text-slate-500 mb-1">Top proof needed</p>
                <ul className="space-y-1 text-xs text-slate-700">
                  {(canonicalListing.opportunity_review?.top_resume_proof_needed ?? []).slice(0, 4).map((item, idx) => <li key={`${item}-${idx}`}>• {item}</li>)}
                </ul>
                <p className="mt-2 text-[10px] text-slate-500">
                  {(canonicalListing.opportunity_review?.suppressed_requirements.length ?? 0)} suppressed low-value requirement(s) hidden from actioning.
                </p>
              </div>
            </div>
          </div>

          <div className="card-base p-5">
            <h2 className="font-semibold text-slate-900 mb-3 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-sky-500" />Provisional alignment</h2>
            <p className="text-xs text-slate-500 mb-3">Early signal from profile + work history + listing intelligence. Not a final score.</p>
            <div className="grid gap-3 sm:grid-cols-3 text-xs">
              <div><p className="font-semibold text-emerald-700 mb-1">Likely strengths</p><ul className="space-y-1 text-slate-700">{provisionalAlignment.strengths.slice(0, 4).map((item, idx) => <li key={`strength-${idx}`}>• {item}</li>)}</ul></div>
              <div><p className="font-semibold text-amber-700 mb-1">Top proof gaps</p><ul className="space-y-1 text-slate-700">{provisionalAlignment.gaps.slice(0, 4).map((item, idx) => <li key={`gap-${idx}`}>• {item}</li>)}</ul></div>
              <div><p className="font-semibold text-slate-700 mb-1">Confidence caveats</p><ul className="space-y-1 text-slate-600">{provisionalAlignment.caveats.slice(0, 4).map((item, idx) => <li key={`caveat-${idx}`}>• {item}</li>)}</ul></div>
            </div>
          </div>

          <div className="card-base p-5">
            <h2 className="font-semibold text-slate-900 mb-3">Role motion / operating context</h2>
            <ul className="space-y-1 text-xs text-slate-700">
              {(canonicalListing.opportunity_review?.role_motion_operating_context ?? []).slice(0, 6).map((item, idx) => <li key={`motion-${idx}`}>• {item}</li>)}
            </ul>
          </div>

          <div className="card-base p-4 border-dashed">
            <button
              onClick={() => setEditorOpen((prev) => !prev)}
              className="w-full flex items-center justify-between text-left"
            >
              <div>
                <p className="text-sm font-semibold text-slate-800">Manual listing editor (secondary)</p>
                <p className="text-xs text-slate-500">Use only for corrections and structured rebucketing.</p>
              </div>
              <ChevronRight className={cn("w-4 h-4 text-slate-500 transition-transform", editorOpen && "rotate-90")} />
            </button>
          </div>

          {editorOpen && (
          <>

          {/* Core fields */}
          <div className="card-base p-5">
            <h2 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-sky-500" />
              Listing Details
            </h2>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="text-xs font-medium text-slate-500 mb-1 block">Job Title</label>
                <input value={title} onChange={e => { setTitle(e.target.value); mark(); }}
                  className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-200" />
              </div>
              <div className="col-span-2">
                <label className="text-xs font-medium text-slate-500 mb-1 block">Company</label>
                <input value={companyName} onChange={e => { setCompanyName(e.target.value); mark(); }}
                  className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-200" />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 mb-1 block">Location</label>
                <input value={location} onChange={e => { setLocation(e.target.value); mark(); }}
                  placeholder="City, State or Remote"
                  className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-200" />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 mb-1 block">Salary Range</label>
                <input value={salary} onChange={e => { setSalary(e.target.value); mark(); }}
                  placeholder="e.g. $120k–$160k"
                  className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-200" />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 mb-1 block">Employment Type</label>
                <select value={empType} onChange={e => { setEmpType(e.target.value); mark(); }}
                  className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-200 bg-white">
                  <option value="">Unknown</option>
                  <option value="full-time">Full-time</option>
                  <option value="part-time">Part-time</option>
                  <option value="contract">Contract</option>
                  <option value="freelance">Freelance</option>
                  <option value="internship">Internship</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 mb-1 block">Experience Level</label>
                <select value={expLevel} onChange={e => { setExpLevel(e.target.value); mark(); }}
                  className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-200 bg-white">
                  <option value="">Unknown</option>
                  <option value="entry">Entry level</option>
                  <option value="mid">Mid level</option>
                  <option value="senior">Senior</option>
                  <option value="lead">Lead / Principal</option>
                  <option value="manager">Manager</option>
                  <option value="director">Director+</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="text-xs font-medium text-slate-500 mb-1 block">Company Website</label>
                <input value={companyWebsite} onChange={e => { setCompanyWebsite(e.target.value); mark(); }}
                  placeholder="https://company.com"
                  className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-200" />
              </div>
              <div className="col-span-2">
                <label className="text-xs font-medium text-slate-500 mb-1 block">Company LinkedIn URL</label>
                <input value={linkedInUrl} onChange={e => { setLinkedInUrl(e.target.value); mark(); }}
                  placeholder="https://linkedin.com/company/…"
                  className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-200" />
              </div>
            </div>
          </div>

          <section className="space-y-1 pt-1">
            <h2 className="text-sm font-semibold text-slate-800">Requirements and role scope</h2>
            <p className="text-xs text-slate-500">Refine requirement language and preserve supporting role details in editable form.</p>
          </section>

          <div className="card-base p-5">
            <h2 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
              <Star className="w-4 h-4 text-sky-500" />
              Requirements
            </h2>
            <div className="space-y-1.5 mb-3">
              {reqs.length === 0 && (
                <p className="text-slate-400 text-sm py-2">No requirements parsed. Add them below.</p>
              )}
              {reqs.map((req, i) => (
                <div key={i} className="flex items-start gap-2 group py-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-400 mt-2 flex-shrink-0" />
                  <span className="flex-1 text-sm text-slate-700 leading-snug">{req}</span>
                  <button
                    onClick={() => { setReqs(p => p.filter((_, idx) => idx !== i)); mark(); }}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-red-500 flex-shrink-0 mt-0.5"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                value={newReq}
                onChange={e => setNewReq(e.target.value)}
                onKeyDown={e => e.key === "Enter" && addReq()}
                placeholder="Add a requirement and press Enter…"
                className="flex-1 text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-200"
              />
              <button
                onClick={addReq}
                disabled={!newReq.trim()}
                className="flex items-center gap-1 text-sm px-3 py-2 rounded-lg bg-slate-900 text-white hover:bg-slate-700 transition-colors disabled:opacity-30"
              >
                <Plus className="w-3.5 h-3.5" />
                Add
              </button>
            </div>
          </div>

          <div className="card-base p-5">
            <h2 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-sky-500" />
              Job Description
            </h2>
            <textarea
              value={description}
              ref={el => { if (el) { el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px'; } }}
              onChange={e => { setDescription(e.target.value); mark(); e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px'; }}
              rows={1}
              style={{ minHeight: '7rem' }}
              placeholder="Paste or edit the job description…"
              className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-200 resize-none overflow-hidden leading-relaxed"
            />
          </div>

          <section className="space-y-1 pt-1">
            <h2 className="text-sm font-semibold text-slate-800">Supporting extracted context</h2>
            <p className="text-xs text-slate-500">Re-bucket context into semantic sections (not a catch-all dump).</p>
          </section>

          <div className="card-base p-5">
            <h2 className="font-semibold text-slate-900 mb-3">Context buckets</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {([
                { key: "responsibilities", label: "Responsibilities", placeholder: "Execution and ownership expectations…" },
                { key: "roleMotion", label: "Role Motion", placeholder: "ACV, expansion, demos, stakeholder complexity…" },
                { key: "proofNeeded", label: "Proof Needed", placeholder: "Evidence targets for resume/interview…" },
                { key: "interviewSignals", label: "Interview Signals", placeholder: "Process, loops, timeline, authorization…" },
                { key: "contextNotes", label: "Context Notes", placeholder: "Operating context and non-core notes…" },
              ] as const).map((bucket) => (
                <div key={bucket.key} className={cn(bucket.key === "contextNotes" && "sm:col-span-2")}>
                  <label className="text-xs font-medium text-slate-500 mb-1 block">{bucket.label}</label>
                  <textarea
                    value={manualBuckets[bucket.key]}
                    onChange={e => { setManualBuckets((prev) => ({ ...prev, [bucket.key]: e.target.value })); mark(); }}
                    rows={3}
                    placeholder={bucket.placeholder}
                    className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-200 resize-y"
                  />
                </div>
              ))}
            </div>
          </div>
          </>
          )}
        </div>

          {/* Core actions */}
          <div className="card-base p-5 bg-slate-900 border-slate-900">
            <h2 className="font-semibold text-white mb-1">Ready for the next step?</h2>
            <p className="text-slate-400 text-sm mb-4">Save listing updates or move into the application workflow.</p>
            <div className="grid sm:grid-cols-2 gap-2">
              <button
                onClick={saveListing}
                disabled={saving}
                className="flex items-center justify-center gap-2 py-3 rounded-xl bg-white/10 text-white font-semibold hover:bg-white/20 transition-colors disabled:opacity-50 text-sm border border-white/20"
              >
                {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {saving ? "Saving…" : "Save for later"}
              </button>
              <button
                onClick={startApplication}
                disabled={starting}
                className="flex items-center justify-center gap-2 py-3 rounded-xl bg-sky-500 text-white font-semibold hover:bg-sky-400 transition-colors disabled:opacity-50 text-sm"
              >
                {starting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                {starting ? "Starting…" : "Create application"}
              </button>
            </div>
          </div>

          {/* Match Score */}
          <div className="card-base p-5">
              <h2 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-sky-500" />
              Alignment signals
            </h2>
            {skills.length === 0 && keywords.length === 0 && profileTools.length === 0 && tech.length === 0 ? (
              <div className="text-sm py-4 border-2 border-dashed border-slate-200 rounded-xl px-3">
                <p className="text-slate-700">Partial provisional read is available from listing intelligence and requirement structure.</p>
                <p className="text-slate-400 mt-1">Add more profile/work history detail to increase confidence and uncover stronger matches.</p>
                <Link href="/profile?tab=skills" className="text-sky-500 hover:underline text-xs mt-2 inline-block">Add profile evidence</Link>
              </div>
            ) : reqs.length === 0 ? (
              <p className="text-slate-400 text-sm">Add requirements to the listing to see how your experience matches.</p>
            ) : (
              <>
                <div className="flex items-center gap-4 mb-5">
                  <div className={cn(
                    "w-18 h-18 w-[72px] h-[72px] rounded-full flex items-center justify-center text-2xl font-bold border-4 flex-shrink-0",
                    match.score >= 70 ? "border-emerald-400 text-emerald-700 bg-emerald-50" :
                    match.score >= 40 ? "border-amber-400 text-amber-700 bg-amber-50" :
                                        "border-red-300 text-red-600 bg-red-50"
                  )}>
                    {match.score}%
                  </div>
                  <div>
                    <p className={cn(
                      "font-semibold",
                      match.score >= 70 ? "text-emerald-700" : match.score >= 40 ? "text-amber-700" : "text-red-600"
                    )}>
                      {match.score >= 70 ? "Higher alignment trend" : match.score >= 40 ? "Moderate alignment trend" : "Lower alignment trend"}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">{match.matched.length} term{match.matched.length !== 1 ? "s" : ""} aligned · {match.missing.length} requirement{match.missing.length !== 1 ? "s" : ""} still uncovered</p>
                  </div>
                </div>

                {(match.matched.length > 0 || manuallyMarked.length > 0) && (
                  <div className="mb-4">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 mb-2">You have</p>
                    <div className="flex flex-wrap gap-1.5">
                      {match.matched.map(s => (
                        <button
                          key={s}
                          onClick={() => setAddModal({ term: s, editedTerm: s })}
                          className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1 hover:bg-emerald-100 hover:border-emerald-300 transition-colors cursor-pointer"
                          title="Click to add to a profile category"
                        >
                          <Check className="w-2.5 h-2.5" />{s}
                        </button>
                      ))}
                      {manuallyMarked.map(s => (
                        <button
                          key={`manual-${s}`}
                          onClick={() => setManuallyMarked(prev => prev.filter(m => m !== s))}
                          className="text-xs bg-slate-100 text-slate-600 border border-slate-200 px-2 py-0.5 rounded-full flex items-center gap-1 hover:bg-red-50 hover:text-red-500 hover:border-red-200 transition-colors cursor-pointer"
                          title="Click to move back to uncovered"
                        >
                          <Check className="w-2.5 h-2.5" />{s}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {match.missing.length > 0 && (
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-amber-600 mb-2">Requirements not yet covered</p>
                    <p className="text-[10px] text-slate-400 mb-2">Click any requirement to add it to your profile.</p>
                    <div className="flex flex-wrap gap-1.5">
                      {match.missing.map(s => (
                        <button
                          key={s}
                          onClick={() => setAddModal({ term: s, editedTerm: s })}
                          className="text-xs bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full flex items-center gap-1 hover:bg-amber-100 hover:border-amber-300 transition-colors cursor-pointer"
                          title="Click to add to profile"
                        >
                          <AlertCircle className="w-2.5 h-2.5" />{s}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          <div className="card-base p-5">
            <h2 className="font-semibold text-slate-900 mb-2">Readiness snapshot</h2>
            <p className="text-xs text-slate-500 mb-3">Use this as guidance, not a pass/fail gate.</p>
            <ul className="space-y-2 text-sm text-slate-600">
              <li className="flex items-start gap-2">
                <ChevronRight className="w-3.5 h-3.5 mt-0.5 text-slate-400" />
                <span>{reqs.length > 0 ? `${reqs.length} requirements are captured for review.` : "Add requirements to improve downstream tailoring quality."}</span>
              </li>
              <li className="flex items-start gap-2">
                <ChevronRight className="w-3.5 h-3.5 mt-0.5 text-slate-400" />
                <span>{description.trim() ? "Job description is present and editable." : "Add the core job description to strengthen generation quality."}</span>
              </li>
              <li className="flex items-start gap-2">
                <ChevronRight className="w-3.5 h-3.5 mt-0.5 text-slate-400" />
                <span>
                  {linkedInUrl.trim()
                    ? (linkedInRuntime?.canLaunchInteractiveSession === false
                      ? "Company LinkedIn URL is present, but hosted runtime cannot run LinkedIn connection checks."
                      : "Company LinkedIn URL is available for connection checks.")
                    : "Add a company LinkedIn URL if networking context matters for this role."}
                </span>
              </li>
            </ul>
          </div>

          <div className="card-base p-5">
            <h2 className="font-semibold text-slate-900 mb-3">Ranked requirements</h2>
            <ul className="space-y-2">
              {rankedRequirements.slice(0, 6).map((item) => (
                <li key={item.id} className="rounded-lg border border-slate-200 p-2">
                  <p className="text-sm text-slate-800">{item.text}</p>
                  <p className="text-[10px] text-slate-500 mt-1">{item.priority} · {Math.round(item.priority_weight * 100)}% weight</p>
                </li>
              ))}
            </ul>
          </div>

          <div className="card-base p-5">
            <h2 className="font-semibold text-slate-900 mb-3">Assistant guidance for this opportunity</h2>
            <div className="grid gap-3 sm:grid-cols-2 text-xs text-slate-700">
              <div>
                <p className="font-semibold text-slate-900 mb-1">Ranked proof gaps</p>
                <ul className="space-y-1">{assistantGuidance.gap_priorities.slice(0, 4).map((item, idx) => <li key={`ag-gap-${idx}`}>• {item}</li>)}</ul>
              </div>
              <div>
                <p className="font-semibold text-slate-900 mb-1">Resume evidence targets</p>
                <ul className="space-y-1">{assistantGuidance.resume_targets.slice(0, 4).map((item, idx) => <li key={`ag-resume-${idx}`}>• {item}</li>)}</ul>
              </div>
              <div>
                <p className="font-semibold text-slate-900 mb-1">Cover letter angles</p>
                <ul className="space-y-1">{assistantGuidance.cover_letter_angles.slice(0, 4).map((item, idx) => <li key={`ag-cover-${idx}`}>• {item}</li>)}</ul>
              </div>
              <div>
                <p className="font-semibold text-slate-900 mb-1">Compensation ambiguity flags</p>
                <ul className="space-y-1">{assistantGuidance.compensation_flags.slice(0, 3).map((item, idx) => <li key={`ag-comp-${idx}`}>• {item}</li>)}</ul>
              </div>
            </div>
          </div>

          {/* LinkedIn Connections */}
          <div className="card-base p-5">
            <h2 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
              <Users className="w-4 h-4 text-sky-500" />
              Connections at {companyName || "Company"}
            </h2>
            {linkedInRuntime?.canLaunchInteractiveSession === false ? (
              <div className="space-y-2">
                <p className="text-sm text-slate-500">LinkedIn connection discovery is currently local-only.</p>
                <p className="text-xs text-slate-400">
                  {linkedInRuntime.reason ?? "This hosted runtime cannot launch the authenticated LinkedIn browser session."}
                </p>
                <Link href="/settings" className="flex items-center gap-1.5 text-sky-600 text-sm font-medium hover:underline">
                  <Link2 className="w-3.5 h-3.5" />View LinkedIn runtime status
                </Link>
              </div>
            ) : !linkedInActive ? (
              <div className="space-y-2">
                <p className="text-sm text-slate-500">Connect LinkedIn to see who you know here.</p>
                <Link href="/settings" className="flex items-center gap-1.5 text-sky-600 text-sm font-medium hover:underline">
                  <Link2 className="w-3.5 h-3.5" />Connect LinkedIn in Settings
                </Link>
              </div>
            ) : connections !== null ? (
              <div className="space-y-3">
                {/* Degree counts — click to open modal */}
                {[
                  { key: "first" as const,  label: "1st degree", cls: "text-emerald-700 bg-emerald-50 border-emerald-200 hover:bg-emerald-100" },
                  { key: "second" as const, label: "2nd degree", cls: "text-sky-700 bg-sky-50 border-sky-200 hover:bg-sky-100" },
                  { key: "third" as const,  label: "3rd degree", cls: "text-slate-600 bg-slate-50 border-slate-200 hover:bg-slate-100" },
                ].map(({ key, label, cls }) => {
                  const count = connections.counts[key];
                  return (
                    <button
                      key={key}
                      onClick={() => count > 0 ? setModalDegree(key) : undefined}
                      disabled={count === 0}
                      className={cn(
                        "w-full flex items-center justify-between px-3 py-2.5 rounded-xl border transition-colors text-sm",
                        count > 0 ? cls : "text-slate-400 bg-slate-50 border-slate-200 opacity-50 cursor-default"
                      )}
                    >
                      <span className="font-medium">{label}</span>
                      <span className="flex items-center gap-1 font-bold">
                        {count} {count > 0 && <ChevronRight className="w-3.5 h-3.5 opacity-60" />}
                      </span>
                    </button>
                  );
                })}
                <button onClick={fetchConnections} disabled={fetchingConns || !linkedInUrl.trim()}
                  className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1 transition-colors disabled:opacity-40">
                  <RefreshCw className={cn("w-3 h-3", fetchingConns && "animate-spin")} />
                  {fetchingConns ? "Searching…" : "Refresh"}
                </button>
                {connError && <p className="text-xs text-red-500">{connError}</p>}
              </div>
            ) : (
              <div className="space-y-3">
                {!linkedInUrl.trim() && (
                  <p className="text-xs text-slate-400">Add the Company LinkedIn URL in Listing Details above, then search for connections.</p>
                )}
                <button
                  onClick={fetchConnections}
                  disabled={fetchingConns || !linkedInUrl.trim()}
                  className="w-full flex items-center justify-center gap-2 text-sm py-2.5 rounded-xl bg-sky-600 text-white hover:bg-sky-700 transition-colors disabled:opacity-50"
                >
                  {fetchingConns ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Users className="w-4 h-4" />}
                  {fetchingConns ? "Searching LinkedIn…" : "Find Connections"}
                </button>
                {connError && <p className="text-xs text-red-500">{connError}</p>}
              </div>
            )}
          </div>

          {/* Delete card */}
          <div className="card-base p-5 border-red-100">
            {confirmDelete ? (
              <div className="space-y-3">
                <p className="text-sm text-red-700 font-medium">Move to trash?</p>
                <p className="text-xs text-slate-500">You can restore it within 30 days from Trash.</p>
                <div className="flex gap-2">
                  <button
                    onClick={deleteListing}
                    disabled={deleting}
                    className="flex-1 flex items-center justify-center gap-1.5 text-sm py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    {deleting ? "Deleting…" : "Yes, delete"}
                  </button>
                  <button
                    onClick={() => setConfirmDelete(false)}
                    className="flex-1 text-sm py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setConfirmDelete(true)}
                className="flex items-center gap-2 text-sm text-red-500 hover:text-red-600 transition-colors w-full"
              >
                <Trash2 className="w-4 h-4" />
                Delete listing
              </button>
            )}
          </div>
      </div>
    </div>
    <div className="hidden xl:flex xl:flex-col xl:w-[360px] xl:border-l xl:border-slate-200">
      <AiChatPanel workflowId={id} surface="listing_review" className="flex-1 h-full" />
    </div>
    </div>

    {/* ── Connections Modal ── */}
    {modalDegree && connections && (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
        onClick={() => setModalDegree(null)}
      >
        <div
          className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[70vh] flex flex-col overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          {/* Modal header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <h3 className="font-semibold text-slate-900">
              {modalDegree === "first" ? "1st" : modalDegree === "second" ? "2nd" : "3rd"} Degree Connections at {companyName}
            </h3>
            <button onClick={() => setModalDegree(null)} className="text-slate-400 hover:text-slate-600 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Connection list */}
          <div className="overflow-y-auto flex-1 px-5 py-3 space-y-2">
            {connections[modalDegree].length === 0 ? (
              <p className="text-slate-400 text-sm py-4 text-center">No connections found for this degree.</p>
            ) : (
              connections[modalDegree].map((person, i) => (
                <a
                  key={i}
                  href={person.profileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-all group"
                >
                  <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 font-semibold text-sm flex-shrink-0">
                    {person.name[0]?.toUpperCase() ?? "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-slate-900 text-sm truncate">{person.name}</div>
                    <div className="text-xs text-sky-500 truncate group-hover:underline">View profile →</div>
                  </div>
                  <ExternalLink className="w-3.5 h-3.5 text-slate-300 group-hover:text-sky-400 flex-shrink-0 transition-colors" />
                </a>
              ))
            )}
          </div>
        </div>
      </div>
    )}

    {/* ── Add to Profile Modal ── */}
    {addModal && (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
        onClick={() => setAddModal(null)}
      >
        <div
          className="bg-white rounded-2xl shadow-2xl w-full max-w-sm flex flex-col overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <BookmarkPlus className="w-4 h-4 text-sky-500" />
              <h3 className="font-semibold text-slate-900">Add to Profile</h3>
            </div>
            <button onClick={() => setAddModal(null)} className="text-slate-400 hover:text-slate-600 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-5 space-y-4">
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1 block">Term to add (edit if needed)</label>
              <input
                value={addModal.editedTerm}
                onChange={e => setAddModal(m => m ? { ...m, editedTerm: e.target.value } : null)}
                className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-sky-400"
                autoFocus
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 mb-2 block">Add to category</label>
              <div className="grid grid-cols-2 gap-2">
                {([
                  { key: "skills" as ProfileCategory,         label: "Skills",          color: "bg-sky-50 text-sky-700 border-sky-200 hover:bg-sky-100" },
                  { key: "keywords" as ProfileCategory,       label: "Keywords",        color: "bg-violet-50 text-violet-700 border-violet-200 hover:bg-violet-100" },
                  { key: "tools" as ProfileCategory,          label: "Tools",           color: "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100" },
                  { key: "certifications" as ProfileCategory, label: "Certifications",  color: "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100" },
                  { key: "clearances" as ProfileCategory,     label: "Clearances",      color: "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100" },
                ] as const).map(({ key, label, color }) => (
                  <button
                    key={key}
                    onClick={() => addToProfile(key, addModal.editedTerm)}
                    disabled={addingSaving || !addModal.editedTerm.trim()}
                    className={cn(
                      "text-sm font-medium border rounded-lg px-3 py-2 transition-colors disabled:opacity-40 text-left",
                      color
                    )}
                  >
                    {label}
                  </button>
                ))}
                <button
                  onClick={() => {
                    setManuallyMarked(prev => prev.includes(addModal!.term) ? prev : [...prev, addModal!.term]);
                    setAddModal(null);
                  }}
                  className="col-span-2 text-sm font-medium border border-slate-200 rounded-lg px-3 py-2 text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-colors text-center"
                >
                  Don&apos;t add to profile — mark as covered
                </button>
              </div>
            </div>
            {addingSaving && <p className="text-xs text-slate-400 text-center">Saving…</p>}
          </div>
        </div>
      </div>
    )}
    </>
  );
}
