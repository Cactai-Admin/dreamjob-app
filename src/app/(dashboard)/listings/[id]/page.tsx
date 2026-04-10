"use client";

// ── Listing Review — Verify parsed data, check match score, find connections, then decide to apply ──

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Plus, X, Briefcase, MapPin, DollarSign, Building2,
  Users, Star, Sparkles, ExternalLink, RefreshCw, Check, Save,
  Link2, TrendingUp, AlertCircle, ChevronRight, ChevronDown, Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Workflow } from "@/lib/types";

interface Props {
  params: Promise<{ id: string }>;
}

// Parse requirements from DB TEXT field (stored as JSON string or plain)
function parseReqs(val: unknown): string[] {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  if (typeof val === "string") {
    const t = val.trim();
    if (t.startsWith("[")) { try { return JSON.parse(t); } catch { /* fall */ } }
    if (t.startsWith("{") && t.endsWith("}")) return t.slice(1, -1).split(",").map(s => s.trim()).filter(Boolean);
    if (t.includes("\n")) return t.split("\n").map(s => s.trim()).filter(Boolean);
    return t ? [t] : [];
  }
  return [];
}

function computeMatch(reqs: string[], skills: string[], tech: string[]) {
  const userTerms = new Set([...skills, ...tech].map(s => s.toLowerCase().trim()));
  if (userTerms.size === 0) return { score: 0, matched: [] as string[], missing: reqs.slice(0, 10) };

  // Break each requirement into candidate keywords
  const reqTerms = reqs.flatMap(r =>
    r.split(/[,;()\n/]+/)
      .map(s => s.trim())
      .filter(s => s.length > 1 && s.length < 40)
  );

  const matched: string[] = [];
  const missing: string[] = [];
  const seen = new Set<string>();

  for (const term of reqTerms) {
    const tLow = term.toLowerCase();
    if (seen.has(tLow)) continue;
    seen.add(tLow);
    const hit = [...userTerms].some(u => tLow === u || tLow.includes(u) || u.includes(tLow));
    if (hit) matched.push(term);
    else missing.push(term);
  }

  const total = matched.length + missing.length;
  const score = total === 0 ? 0 : Math.round((matched.length / total) * 100);
  return { score, matched: matched.slice(0, 12), missing: missing.slice(0, 10) };
}

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
  const [additionalDetails, setAdditionalDetails] = useState("");

  // Profile for match
  const [skills, setSkills] = useState<string[]>([]);
  const [tech, setTech] = useState<string[]>([]);

  // LinkedIn
  const [linkedInActive, setLinkedInActive] = useState(false);
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
        setTitle(l.title ?? wf.title ?? "");
        setCompanyName(l.company_name ?? wf.company?.name ?? "");
        setLocation(l.location ?? "");
        setSalary(l.salary_range ?? "");
        setEmpType(l.employment_type ?? "");
        setExpLevel(l.experience_level ?? "");
        // Prefer the listing row (always linked), fall back to company join
        setCompanyWebsite(wf.listing?.company_website_url ?? wf.company?.website_url ?? "");
        setDescription(l.description ?? "");
        setReqs(parseReqs(l.requirements));
        setAdditionalDetails(l.responsibilities ?? "");
        setLinkedInUrl(wf.company?.linkedin_url ?? "");
      }
      if (prof && !prof.error) setSkills(Array.isArray(prof.skills) ? prof.skills : []);
      if (Array.isArray(emp)) {
        setTech(emp.flatMap((e: { technologies?: string[] }) => Array.isArray(e.technologies) ? e.technologies : []));
      }
      if (li && !li.error) setLinkedInActive(li.isAuthenticated);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [id]);

  const mark = () => setDirty(true);

  const saveListing = async () => {
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
          responsibilities: additionalDetails || null,
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
  };

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

    // Kick off resume generation in the background — don't await
    let provider: string | undefined;
    try { const s = JSON.parse(localStorage.getItem("dreamjob_settings") ?? "{}"); if (s.aiProvider) provider = s.aiProvider; } catch { /* ignore */ }
    fetch("/api/ai/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workflow_id: id, output_type: "resume", provider }),
    }); // intentionally fire-and-forget

    router.push(`/jobs/${id}/resume`);
  };

  const deleteListing = async () => {
    setDeleting(true);
    await fetch(`/api/workflows/${id}`, { method: "DELETE" });
    router.push("/listings");
  };

  const match = computeMatch(reqs, skills, tech);

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
    <div className="page-wrapper">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div className="flex items-start gap-3 min-w-0">
          <Link href="/listings" className="flex-shrink-0 w-8 h-8 mt-0.5 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 shadow-sm">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-slate-900 truncate">{title || "Untitled Listing"}</h1>
            <p className="text-sm text-slate-500 mt-0.5">{companyName} · Review before applying</p>
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

      <div className="grid lg:grid-cols-5 gap-5">
        {/* ── Left: Listing data (3/5) ── */}
        <div className="lg:col-span-3 space-y-5">

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

          {/* Description */}
          {/* Requirements */}
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

          {/* Additional Details */}
          <div className="card-base p-5">
            <h2 className="font-semibold text-slate-900 mb-1">Additional Details</h2>
            <p className="text-xs text-slate-400 mb-3">Anything from the listing that wasn't captured above — responsibilities, benefits, interview process, deadlines, work authorization, etc.</p>
            <textarea
              value={additionalDetails}
              ref={el => { if (el) { el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px'; } }}
              onChange={e => { setAdditionalDetails(e.target.value); mark(); e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px'; }}
              rows={1}
              style={{ minHeight: '5rem' }}
              placeholder="Paste extra listing content here…"
              className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-200 resize-none overflow-hidden"
            />
          </div>
        </div>

        {/* ── Right: Analysis (2/5) ── */}
        <div className="lg:col-span-2 space-y-5">

          {/* Match Score */}
          <div className="card-base p-5">
            <h2 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-sky-500" />
              Profile Match
            </h2>
            {skills.length === 0 && tech.length === 0 ? (
              <div className="text-sm text-center py-4 border-2 border-dashed border-slate-200 rounded-xl">
                <Link href="/profile?tab=skills" className="text-sky-500 hover:underline">Add skills to your profile</Link>
                <span className="text-slate-400"> to see your match score.</span>
              </div>
            ) : reqs.length === 0 ? (
              <p className="text-slate-400 text-sm">Add requirements above to calculate your match.</p>
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
                      {match.score >= 70 ? "Strong match" : match.score >= 40 ? "Partial match" : "Low match"}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">{match.matched.length} skill{match.matched.length !== 1 ? "s" : ""} matched · {match.missing.length} gap{match.missing.length !== 1 ? "s" : ""}</p>
                  </div>
                </div>

                {match.matched.length > 0 && (
                  <div className="mb-4">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 mb-2">You have</p>
                    <div className="flex flex-wrap gap-1.5">
                      {match.matched.map(s => (
                        <span key={s} className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Check className="w-2.5 h-2.5" />{s}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {match.missing.length > 0 && (
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-amber-600 mb-2">Gaps to address</p>
                    <div className="flex flex-wrap gap-1.5">
                      {match.missing.map(s => (
                        <span key={s} className="text-xs bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <AlertCircle className="w-2.5 h-2.5" />{s}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* LinkedIn Connections */}
          <div className="card-base p-5">
            <h2 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
              <Users className="w-4 h-4 text-sky-500" />
              Connections at {companyName || "Company"}
            </h2>
            {!linkedInActive ? (
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

          {/* Source URL */}
          {workflow.listing?.source_url && (
            <div className="card-base p-4">
              <h2 className="font-semibold text-slate-900 mb-2 text-sm">Original Listing</h2>
              <a href={workflow.listing.source_url} target="_blank" rel="noreferrer"
                className="flex items-center gap-2 text-sm text-sky-600 hover:underline break-all">
                <ExternalLink className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="truncate">{workflow.listing.source_url}</span>
              </a>
            </div>
          )}

          {/* CTA card */}
          <div className="card-base p-5 bg-slate-900 border-slate-900">
            <h2 className="font-semibold text-white mb-1">Ready to apply?</h2>
            <p className="text-slate-400 text-sm mb-4">We'll build a tailored resume and cover letter with AI assistance.</p>
            <button
              onClick={startApplication}
              disabled={starting}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-sky-500 text-white font-semibold hover:bg-sky-400 transition-colors disabled:opacity-50 text-sm"
            >
              {starting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {starting ? "Starting…" : "Start Application"}
            </button>
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
    </>
  );
}
