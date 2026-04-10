"use client";

// ── Job Detail — Full view of a job application with all actions ──

import { notFound } from "next/navigation";
import Link from "next/link";
import { useState, useEffect, use, useRef } from "react";
import {
  MapPin, DollarSign, ExternalLink, FileText, Mail, Download,
  ChevronRight, StickyNote, Building2, Users, Calendar,
  CircleCheck as CheckCircle2, Trash2, MessageSquare, TrendingUp,
  PenLine, Save, X, Plus, Star, Link2, RefreshCw,
  Globe,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { StatusBadge } from "@/components/jobs/status-badge";
import { DocStatusPill } from "@/components/jobs/doc-status-pill";
import { PageHeader } from "@/components/layout/page-header";
import { workflowToJob, deriveApplicationStatus } from "@/lib/workflow-adapter";
import type { ApplicationStatus, Job, Workflow } from "@/lib/types";
import { cn } from "@/lib/utils";

const STATUS_FLOW: ApplicationStatus[] = [
  "saved", "applied", "interviewing", "offer", "hired",
];

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

interface Props {
  params: Promise<{ id: string }>;
}

export default function JobDetailPage({ params }: Props) {
  const { id } = use(params);
  const router = useRouter();
  const [workflow, setWorkflow] = useState<Workflow | null>(null);
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Listing edit state
  const [editingListing, setEditingListing] = useState(false);
  const [savingListing, setSavingListing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editCompany, setEditCompany] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [editSalary, setEditSalary] = useState("");
  const [editEmpType, setEditEmpType] = useState("");
  const [editExpLevel, setEditExpLevel] = useState("");
  const [editWebsite, setEditWebsite] = useState("");
  const [editLinkedIn, setEditLinkedIn] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editReqs, setEditReqs] = useState<string[]>([]);
  const [newReq, setNewReq] = useState("");
  const [editAdditional, setEditAdditional] = useState("");

  // Notes
  const [notes, setNotes] = useState("");
  const [notesSaved, setNotesSaved] = useState(false);
  const notesSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // LinkedIn connections
  const [linkedInActive, setLinkedInActive] = useState(false);
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
  const [modalDegree, setModalDegree] = useState<"first" | "second" | "third" | null>(null);

  const loadWorkflow = () => {
    fetch(`/api/workflows/${id}`)
      .then(r => r.json())
      .then(async (wf) => {
        if (!wf?.id) { setLoading(false); return; }
        if (wf.state === "listing_review") {
          router.replace(`/listings/${id}`);
          return;
        }
        setWorkflow(wf);
        setJob(workflowToJob(wf));
        // Populate edit fields
        const l = wf.listing ?? {};
        setEditTitle(l.title ?? wf.title ?? "");
        setEditCompany(l.company_name ?? wf.company?.name ?? "");
        setEditLocation(l.location ?? "");
        setEditSalary(l.salary_range ?? "");
        setEditEmpType(l.employment_type ?? "");
        setEditExpLevel(l.experience_level ?? "");
        setEditWebsite(l.company_website_url ?? wf.company?.website_url ?? "");
        setEditLinkedIn(wf.company?.linkedin_url ?? "");
        setEditDescription(l.description ?? "");
        setEditReqs(parseReqs(l.requirements));
        setEditAdditional(l.responsibilities ?? "");
        setNotes(wf.notes ?? "");

        // Load stored connections + LinkedIn session in parallel
        const [liRes, connRes] = await Promise.all([
          fetch("/api/linkedin/session").then(r => r.json()).catch(() => ({})),
          wf.listing_id
            ? fetch(`/api/linkedin/company?listing_id=${wf.listing_id}`).then(r => r.json()).catch(() => ({}))
            : Promise.resolve({}),
        ]);
        if (liRes && !liRes.error) setLinkedInActive(liRes.isAuthenticated);
        if (connRes?.connections) setConnections(connRes.connections);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => { loadWorkflow(); }, [id]);

  const EVENT_MAP: Record<string, string> = {
    applied: "submitted",
    interviewing: "interview_scheduled",
    offer: "offer_received",
    hired: "hired",
    rejected: "rejected",
    withdrawn: "withdrawn",
  };

  const updateStatus = async (newStatus: ApplicationStatus) => {
    if (!job) return;
    const eventType = EVENT_MAP[newStatus];
    if (!eventType) return;
    if (job.status === newStatus) {
      await fetch(`/api/workflows/${id}/status?event_type=${eventType}`, { method: "DELETE" });
    } else {
      await fetch(`/api/workflows/${id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event_type: eventType }),
      });
    }
    loadWorkflow();
  };

  const saveListingEdits = async () => {
    setSavingListing(true);
    await fetch(`/api/workflows/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: `${editCompany} - ${editTitle}`,
        listing: {
          title: editTitle || undefined,
          company_name: editCompany || undefined,
          location: editLocation || null,
          salary_range: editSalary || null,
          employment_type: editEmpType || null,
          experience_level: editExpLevel || null,
          description: editDescription || null,
          requirements: editReqs.length > 0 ? JSON.stringify(editReqs) : null,
          responsibilities: editAdditional || null,
          company_website_url: editWebsite || null,
        },
        company: (editLinkedIn || editWebsite) ? {
          ...(editLinkedIn ? { linkedin_url: editLinkedIn } : {}),
          ...(editWebsite ? { website_url: editWebsite } : {}),
        } : undefined,
      }),
    });
    setSavingListing(false);
    setEditingListing(false);
    loadWorkflow();
  };

  const saveNotes = async (value: string) => {
    await fetch(`/api/workflows/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes: value }),
    });
    setNotesSaved(true);
    setTimeout(() => setNotesSaved(false), 2000);
  };

  const fetchConnections = async () => {
    const linkedInUrl = editLinkedIn || workflow?.company?.linkedin_url;
    if (!linkedInUrl) return;
    setFetchingConns(true);
    setConnError(null);
    try {
      const res = await fetch("/api/linkedin/company", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company_linkedin_url: linkedInUrl,
          company_name: editCompany || workflow?.company?.name,
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

  const deleteWorkflow = async () => {
    setDeleting(true);
    await fetch(`/api/workflows/${id}`, { method: "DELETE" });
    router.push("/jobs");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-6 h-6 border-2 border-slate-300 border-t-slate-900 rounded-full animate-spin" />
      </div>
    );
  }

  if (!job || !workflow) return notFound();

  const currentStepIdx = STATUS_FLOW.indexOf(job.status);
  const linkedInUrl = editLinkedIn || workflow.company?.linkedin_url || "";

  return (
    <div className="page-wrapper max-w-4xl">
      <PageHeader
        title={job.title}
        subtitle={job.company}
        backHref="/jobs"
        actions={<StatusBadge status={job.status} />}
      />

      {/* Progress timeline */}
      {currentStepIdx >= 0 && (
        <div className="card-base p-4 mb-5 hidden sm:block">
          <div className="flex items-center">
            {STATUS_FLOW.map((s, idx) => {
              const isCompleted = idx < currentStepIdx;
              const isCurrent   = idx === currentStepIdx;
              return (
                <div key={s} className="flex-1 flex items-center">
                  <div className="flex flex-col items-center">
                    <div className={cn(
                      "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all",
                      isCompleted ? "bg-emerald-500 border-emerald-500 text-white" :
                      isCurrent   ? "bg-sky-600 border-sky-600 text-white" :
                                    "bg-white border-slate-200 text-slate-400"
                    )}>
                      {isCompleted ? <CheckCircle2 className="w-3.5 h-3.5" /> : idx + 1}
                    </div>
                    <span className={cn(
                      "text-[10px] font-medium mt-1 capitalize",
                      isCurrent ? "text-sky-700" : isCompleted ? "text-emerald-600" : "text-slate-400"
                    )}>
                      {s}
                    </span>
                  </div>
                  {idx < STATUS_FLOW.length - 1 && (
                    <div className={cn("flex-1 h-0.5 mx-2", isCompleted ? "bg-emerald-400" : "bg-slate-200")} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-5">
        {/* Main column */}
        <div className="lg:col-span-2 space-y-5">

          {editingListing ? (
            /* ── Edit mode ── */
            <>
              <div className="card-base p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-semibold text-slate-900 flex items-center gap-2">
                    <PenLine className="w-4 h-4 text-sky-500" />
                    Edit Listing Details
                  </h2>
                  <button
                    onClick={() => setEditingListing(false)}
                    className="text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className="text-xs font-medium text-slate-500 mb-1 block">Job Title</label>
                    <input value={editTitle} onChange={e => setEditTitle(e.target.value)}
                      className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-200" />
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs font-medium text-slate-500 mb-1 block">Company</label>
                    <input value={editCompany} onChange={e => setEditCompany(e.target.value)}
                      className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-200" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-500 mb-1 block">Location</label>
                    <input value={editLocation} onChange={e => setEditLocation(e.target.value)}
                      placeholder="City, State or Remote"
                      className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-200" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-500 mb-1 block">Salary Range</label>
                    <input value={editSalary} onChange={e => setEditSalary(e.target.value)}
                      placeholder="e.g. $120k–$160k"
                      className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-200" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-500 mb-1 block">Employment Type</label>
                    <select value={editEmpType} onChange={e => setEditEmpType(e.target.value)}
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
                    <select value={editExpLevel} onChange={e => setEditExpLevel(e.target.value)}
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
                    <input value={editWebsite} onChange={e => setEditWebsite(e.target.value)}
                      placeholder="https://company.com"
                      className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-200" />
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs font-medium text-slate-500 mb-1 block">Company LinkedIn URL</label>
                    <input value={editLinkedIn} onChange={e => setEditLinkedIn(e.target.value)}
                      placeholder="https://linkedin.com/company/…"
                      className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-200" />
                  </div>
                </div>
                <div className="flex gap-2 mt-4 pt-4 border-t border-slate-100">
                  <button
                    onClick={saveListingEdits}
                    disabled={savingListing}
                    className="flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-xl bg-slate-900 text-white hover:bg-slate-800 transition-colors disabled:opacity-50"
                  >
                    {savingListing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    {savingListing ? "Saving…" : "Save Changes"}
                  </button>
                  <button
                    onClick={() => setEditingListing(false)}
                    className="text-sm px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>

              {/* Requirements edit */}
              <div className="card-base p-5">
                <h2 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                  <Star className="w-4 h-4 text-sky-500" />
                  Requirements
                </h2>
                <div className="space-y-1.5 mb-3">
                  {editReqs.length === 0 && (
                    <p className="text-slate-400 text-sm py-2">No requirements. Add them below.</p>
                  )}
                  {editReqs.map((req, i) => (
                    <div key={i} className="flex items-start gap-2 group py-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-sky-400 mt-2 flex-shrink-0" />
                      <span className="flex-1 text-sm text-slate-700 leading-snug">{req}</span>
                      <button
                        onClick={() => setEditReqs(p => p.filter((_, idx) => idx !== i))}
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
                    onKeyDown={e => { if (e.key === "Enter" && newReq.trim()) { setEditReqs(p => [...p, newReq.trim()]); setNewReq(""); } }}
                    placeholder="Add a requirement and press Enter…"
                    className="flex-1 text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-200"
                  />
                  <button
                    onClick={() => { if (newReq.trim()) { setEditReqs(p => [...p, newReq.trim()]); setNewReq(""); } }}
                    disabled={!newReq.trim()}
                    className="flex items-center gap-1 text-sm px-3 py-2 rounded-lg bg-slate-900 text-white hover:bg-slate-700 transition-colors disabled:opacity-30"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add
                  </button>
                </div>
              </div>

              {/* Description edit */}
              <div className="card-base p-5">
                <h2 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-sky-500" />
                  Job Description
                </h2>
                <textarea
                  value={editDescription}
                  ref={el => { if (el) { el.style.height = "auto"; el.style.height = el.scrollHeight + "px"; } }}
                  onChange={e => { setEditDescription(e.target.value); e.target.style.height = "auto"; e.target.style.height = e.target.scrollHeight + "px"; }}
                  rows={1}
                  style={{ minHeight: "7rem" }}
                  placeholder="Paste or edit the job description…"
                  className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-200 resize-none overflow-hidden leading-relaxed"
                />
              </div>

              {/* Additional details edit */}
              <div className="card-base p-5">
                <h2 className="font-semibold text-slate-900 mb-1">Additional Details</h2>
                <p className="text-xs text-slate-400 mb-3">Responsibilities, benefits, interview process, deadlines, etc.</p>
                <textarea
                  value={editAdditional}
                  ref={el => { if (el) { el.style.height = "auto"; el.style.height = el.scrollHeight + "px"; } }}
                  onChange={e => { setEditAdditional(e.target.value); e.target.style.height = "auto"; e.target.style.height = e.target.scrollHeight + "px"; }}
                  rows={1}
                  style={{ minHeight: "5rem" }}
                  placeholder="Paste extra listing content here…"
                  className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-200 resize-none overflow-hidden"
                />
              </div>
            </>
          ) : (
            /* ── View mode ── */
            <>
              {/* Company + Role info */}
              <div className="card-base p-5">
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-14 h-14 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden flex-shrink-0">
                    {job.companyLogo ? (
                      <img src={job.companyLogo} alt={job.company} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-500 font-bold text-2xl">
                        {job.company[0]}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="font-bold text-slate-900 text-lg leading-tight">{job.title}</h2>
                    <p className="text-slate-600 font-medium">{job.company}</p>
                    <div className="flex flex-wrap gap-3 mt-2 text-sm text-slate-500">
                      {job.location && (
                        <span className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5" />
                          {job.location}
                        </span>
                      )}
                      {job.salary && (
                        <span className="flex items-center gap-1.5">
                          <DollarSign className="w-3.5 h-3.5" />
                          {job.salary}
                        </span>
                      )}
                    </div>
                    {/* Website + LinkedIn links */}
                    <div className="flex flex-wrap gap-3 mt-2">
                      {editWebsite && (
                        <a href={editWebsite} target="_blank" rel="noreferrer"
                          className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-sky-600 transition-colors">
                          <Globe className="w-3 h-3" />
                          {editWebsite.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                        </a>
                      )}
                      {linkedInUrl && (
                        <a href={linkedInUrl} target="_blank" rel="noreferrer"
                          className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-sky-600 transition-colors">
                          <Link2 className="w-3 h-3" />
                          LinkedIn page
                        </a>
                      )}
                      {job.url && (
                        <a href={job.url} target="_blank" rel="noreferrer"
                          className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-sky-600 transition-colors">
                          <ExternalLink className="w-3 h-3" />
                          Job listing
                        </a>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => setEditingListing(true)}
                    className="flex-shrink-0 flex items-center gap-1.5 text-xs text-slate-600 border border-slate-200 bg-slate-50 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                  >
                    <PenLine className="w-3 h-3" />
                    Edit
                  </button>
                </div>
              </div>

              {/* Description + Requirements */}
              {(job.description || (job.requirements ?? []).length > 0) && (
                <div className="card-base p-5">
                  <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-sky-500" />
                    About the role
                  </h3>
                  {job.description && (
                    <p className="text-slate-600 text-sm leading-relaxed">{job.description}</p>
                  )}
                  {(job.requirements ?? []).length > 0 && (
                    <div className="mt-4">
                      <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Requirements</h4>
                      <ul className="space-y-2">
                        {(job.requirements ?? []).map((req, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                            <span className="w-1.5 h-1.5 rounded-full bg-sky-400 mt-2 flex-shrink-0" />
                            {req}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* Notes */}
              <div className="card-base p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                    <StickyNote className="w-4 h-4 text-sky-500" />
                    Notes
                  </h3>
                  {notesSaved && (
                    <span className="text-xs text-emerald-600 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Saved
                    </span>
                  )}
                </div>
                <textarea
                  value={notes}
                  onChange={e => {
                    setNotes(e.target.value);
                    setNotesSaved(false);
                    if (notesSaveTimer.current) clearTimeout(notesSaveTimer.current);
                    notesSaveTimer.current = setTimeout(() => saveNotes(e.target.value), 1000);
                  }}
                  onBlur={e => saveNotes(e.target.value)}
                  placeholder="Add notes, reminders, or anything relevant to this application…"
                  rows={4}
                  className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-sky-200 resize-none leading-relaxed text-slate-700 placeholder:text-slate-400"
                />
              </div>
            </>
          )}
        </div>

        {/* Right column */}
        <div className="space-y-4">
          {/* Application Packet */}
          <div className="card-base p-5">
            <h3 className="font-semibold text-slate-900 mb-3">Application Packet</h3>
            <div className="space-y-3">
              <Link href={`/jobs/${job.id}/resume`}
                className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 hover:border-sky-300 hover:bg-sky-50 transition-all group">
                <div className="w-9 h-9 rounded-lg bg-sky-100 flex items-center justify-center flex-shrink-0">
                  <FileText className="w-4 h-4 text-sky-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-slate-900 text-sm">Resume</div>
                  <DocStatusPill status={job.resumeStatus} label="" />
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-sky-500 transition-colors" />
              </Link>

              <Link href={`/jobs/${job.id}/cover-letter`}
                className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 hover:border-sky-300 hover:bg-sky-50 transition-all group">
                <div className="w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0">
                  <Mail className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-slate-900 text-sm">Cover Letter</div>
                  <DocStatusPill status={job.coverLetterStatus} label="" />
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-sky-500 transition-colors" />
              </Link>

              <Link href={`/jobs/${job.id}/interview-guide`}
                className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 hover:border-sky-300 hover:bg-sky-50 transition-all group">
                <div className="w-9 h-9 rounded-lg bg-violet-100 flex items-center justify-center flex-shrink-0">
                  <MessageSquare className="w-4 h-4 text-violet-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-slate-900 text-sm">Interview Guide</div>
                  <DocStatusPill status={job.interviewGuideStatus} label="" />
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-sky-500 transition-colors" />
              </Link>

              <Link href={`/jobs/${job.id}/negotiation-guide`}
                className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 hover:border-sky-300 hover:bg-sky-50 transition-all group">
                <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
                  <TrendingUp className="w-4 h-4 text-amber-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-slate-900 text-sm">Negotiation Guide</div>
                  <DocStatusPill status={job.negotiationGuideStatus} label="" />
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-sky-500 transition-colors" />
              </Link>

              <Link href={`/jobs/${job.id}/export`}
                className="flex items-center justify-center gap-2 w-full py-2.5 bg-slate-900 text-white text-sm font-semibold rounded-xl hover:bg-slate-800 transition-colors">
                <Download className="w-4 h-4" />
                Export Packet
              </Link>
            </div>
          </div>

          {/* LinkedIn Connections */}
          <div className="card-base p-5">
            <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
              <Users className="w-4 h-4 text-sky-500" />
              Connections at {editCompany || job.company}
            </h3>
            {!linkedInActive ? (
              <div className="space-y-2">
                <p className="text-sm text-slate-500">Connect LinkedIn to see who you know here.</p>
                <Link href="/settings" className="flex items-center gap-1.5 text-sky-600 text-sm font-medium hover:underline">
                  <Link2 className="w-3.5 h-3.5" />Connect LinkedIn in Settings
                </Link>
              </div>
            ) : connections !== null ? (
              <div className="space-y-3">
                {[
                  { key: "first" as const,  label: "1st degree", cls: "text-emerald-700 bg-emerald-50 border-emerald-200 hover:bg-emerald-100" },
                  { key: "second" as const, label: "2nd degree", cls: "text-sky-700 bg-sky-50 border-sky-200 hover:bg-sky-100" },
                  { key: "third" as const,  label: "3rd degree", cls: "text-slate-600 bg-slate-50 border-slate-200 hover:bg-slate-100" },
                ].map(({ key, label, cls }) => {
                  const count = connections.counts[key];
                  return (
                    <button key={key} onClick={() => count > 0 ? setModalDegree(key) : undefined}
                      disabled={count === 0}
                      className={cn(
                        "w-full flex items-center justify-between px-3 py-2.5 rounded-xl border transition-colors text-sm",
                        count > 0 ? cls : "text-slate-400 bg-slate-50 border-slate-200 opacity-50 cursor-default"
                      )}>
                      <span className="font-medium">{label}</span>
                      <span className="flex items-center gap-1 font-bold">
                        {count} {count > 0 && <ChevronRight className="w-3.5 h-3.5 opacity-60" />}
                      </span>
                    </button>
                  );
                })}
                <button onClick={fetchConnections} disabled={fetchingConns || !linkedInUrl}
                  className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1 transition-colors disabled:opacity-40">
                  <RefreshCw className={cn("w-3 h-3", fetchingConns && "animate-spin")} />
                  {fetchingConns ? "Searching…" : "Refresh"}
                </button>
                {connError && <p className="text-xs text-red-500">{connError}</p>}
              </div>
            ) : (
              <div className="space-y-3">
                {!linkedInUrl && (
                  <p className="text-xs text-slate-400">Add the Company LinkedIn URL by clicking Edit on the listing above.</p>
                )}
                <button onClick={fetchConnections} disabled={fetchingConns || !linkedInUrl}
                  className="w-full flex items-center justify-center gap-2 text-sm py-2.5 rounded-xl bg-sky-600 text-white hover:bg-sky-700 transition-colors disabled:opacity-50">
                  {fetchingConns ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Users className="w-4 h-4" />}
                  {fetchingConns ? "Searching LinkedIn…" : "Find Connections"}
                </button>
                {connError && <p className="text-xs text-red-500">{connError}</p>}
              </div>
            )}
          </div>

          {/* Key dates */}
          <div className="card-base p-5">
            <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-sky-500" />
              Dates
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Created</span>
                <span className="font-medium text-slate-800">
                  {new Date(job.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Last updated</span>
                <span className="font-medium text-slate-800">
                  {new Date(job.updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </span>
              </div>
            </div>
          </div>

          {/* Update Status */}
          <div className="card-base p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-slate-900">Update Status</h3>
              <span className="text-xs text-slate-400">Click active to remove</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {(["applied", "interviewing", "offer", "hired", "rejected", "withdrawn"] as ApplicationStatus[]).map((s) => (
                <button key={s} onClick={() => updateStatus(s)}
                  className={cn(
                    "text-xs font-medium py-2 px-3 rounded-lg border transition-all capitalize",
                    job.status === s
                      ? "border-sky-500 bg-sky-50 text-sky-700 ring-1 ring-sky-400"
                      : "border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                  )}>
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Delete */}
          <div className="card-base p-5 border-red-100">
            {confirmDelete ? (
              <div className="space-y-3">
                <p className="text-sm text-red-700 font-medium">Move to trash?</p>
                <p className="text-xs text-slate-500">You can restore it within 30 days from Trash.</p>
                <div className="flex gap-2">
                  <button onClick={deleteWorkflow} disabled={deleting}
                    className="flex-1 flex items-center justify-center gap-1.5 text-sm py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-50">
                    <Trash2 className="w-3.5 h-3.5" />
                    {deleting ? "Deleting…" : "Yes, delete"}
                  </button>
                  <button onClick={() => setConfirmDelete(false)}
                    className="flex-1 text-sm py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors">
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button onClick={() => setConfirmDelete(true)}
                className="flex items-center gap-2 text-sm text-red-500 hover:text-red-600 transition-colors w-full">
                <Trash2 className="w-4 h-4" />
                Delete application
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Connections Modal ── */}
      {modalDegree && connections && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          onClick={() => setModalDegree(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[70vh] flex flex-col overflow-hidden"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h3 className="font-semibold text-slate-900">
                {modalDegree === "first" ? "1st" : modalDegree === "second" ? "2nd" : "3rd"} Degree Connections at {editCompany || job.company}
              </h3>
              <button onClick={() => setModalDegree(null)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="overflow-y-auto flex-1 px-5 py-3 space-y-2">
              {connections[modalDegree].length === 0 ? (
                <p className="text-slate-400 text-sm py-4 text-center">No connections found for this degree.</p>
              ) : (
                connections[modalDegree].map((person, i) => (
                  <a key={i} href={person.profileUrl} target="_blank" rel="noreferrer"
                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-all group">
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
    </div>
  );
}
