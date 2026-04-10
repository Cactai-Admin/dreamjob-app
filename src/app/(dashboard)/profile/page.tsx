"use client";

// ── Profile — Employment history, education, skills, credentials, and stats ──

import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { User, Briefcase, GraduationCap, Star, Award, Globe, Plus, Pencil, Save, CreditCard as Edit2, MapPin, Phone, Mail, ExternalLink, ChartBar as BarChart2, ArrowRight, Calendar, Target, Trophy, TrendingUp, Trash2, X, Check, Upload } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { StatusBadge } from "@/components/jobs/status-badge";
import { workflowToJob } from "@/lib/workflow-adapter";
import { cn } from "@/lib/utils";
import type { ApplicationStatus, Workflow, Job } from "@/lib/types";
import { UploadArtifactModal } from "@/components/profile/upload-artifact-modal";

type Tab = "overview" | "experience" | "education" | "skills" | "achievements" | "stats";

const TABS: { key: Tab; label: string; icon: React.ElementType }[] = [
  { key: "overview",     label: "Overview",   icon: User },
  { key: "experience",   label: "Experience", icon: Briefcase },
  { key: "education",    label: "Education",  icon: GraduationCap },
  { key: "skills",       label: "Skills",     icon: Star },
  { key: "achievements", label: "Awards",     icon: Award },
  { key: "stats",        label: "Stats",      icon: BarChart2 },
];

const STATUS_ORDER: ApplicationStatus[] = [
  "draft", "saved", "applied", "interviewing", "offer", "hired",
];
const STATUS_LABELS: Record<ApplicationStatus, string> = {
  draft: "Draft", saved: "Saved", applied: "Applied",
  interviewing: "Interviewing", offer: "Offer", hired: "Hired",
  rejected: "Rejected", withdrawn: "Withdrawn",
};

interface Profile {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  location?: string;
  headline?: string;
  summary?: string;
  avatar_url?: string;
  linkedin_url?: string;
  portfolio_url?: string;
  github_url?: string;
  skills?: string[];
}

interface Employment {
  id: string;
  company_name: string;
  title: string;
  location?: string;
  start_date?: string;
  end_date?: string;
  is_current?: boolean;
  description?: string;
  technologies?: string[];
}

const EMPTY_EXP: Omit<Employment, "id"> = {
  company_name: "", title: "", location: "", start_date: "", end_date: "",
  is_current: false, description: "", technologies: [],
};

function ExpForm({
  initial,
  onSave,
  onCancel,
  saving,
}: {
  initial: Omit<Employment, "id"> & { id?: string };
  onSave: (data: Omit<Employment, "id">) => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const [form, setForm] = useState({
    company_name: initial.company_name ?? "",
    title: initial.title ?? "",
    location: initial.location ?? "",
    start_date: initial.start_date ?? "",
    end_date: initial.end_date ?? "",
    is_current: initial.is_current ?? false,
    description: initial.description ?? "",
    techText: Array.isArray(initial.technologies)
      ? initial.technologies.join(", ")
      : "",
  });

  const set = (k: string, v: string | boolean) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = () => {
    onSave({
      company_name: form.company_name,
      title: form.title,
      location: form.location || undefined,
      start_date: form.start_date || "Present",
      end_date: form.is_current ? undefined : (form.end_date || undefined),
      is_current: form.is_current,
      description: form.description || undefined,
      technologies: form.techText
        ? form.techText.split(",").map(s => s.trim()).filter(Boolean)
        : [],
    });
  };

  return (
    <div className="card-base p-5 border-sky-200 ring-1 ring-sky-200">
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <label className="text-xs font-medium text-slate-500 mb-1 block">Job Title *</label>
          <input
            value={form.title}
            onChange={e => set("title", e.target.value)}
            placeholder="Senior Engineer"
            className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-200"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-500 mb-1 block">Company *</label>
          <input
            value={form.company_name}
            onChange={e => set("company_name", e.target.value)}
            placeholder="Acme Corp"
            className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-200"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-500 mb-1 block">Location</label>
          <input
            value={form.location}
            onChange={e => set("location", e.target.value)}
            placeholder="San Francisco, CA"
            className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-200"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-500 mb-1 block">Start Date</label>
          <input
            type="month"
            value={form.start_date?.slice(0, 7) ?? ""}
            onChange={e => set("start_date", e.target.value)}
            className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-200"
          />
        </div>
        {!form.is_current && (
          <div>
            <label className="text-xs font-medium text-slate-500 mb-1 block">End Date</label>
            <input
              type="month"
              value={form.end_date?.slice(0, 7) ?? ""}
              onChange={e => set("end_date", e.target.value)}
              className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-200"
            />
          </div>
        )}
        <div className="flex items-end pb-2">
          <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
            <input
              type="checkbox"
              checked={form.is_current}
              onChange={e => set("is_current", e.target.checked)}
              className="rounded"
            />
            Currently working here
          </label>
        </div>
      </div>
      <div className="mb-3">
        <label className="text-xs font-medium text-slate-500 mb-1 block">Description</label>
        <textarea
          value={form.description}
          onChange={e => set("description", e.target.value)}
          placeholder="Describe your role and key accomplishments…"
          rows={4}
          className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-200 resize-none"
        />
      </div>
      <div className="mb-4">
        <label className="text-xs font-medium text-slate-500 mb-1 block">
          Technologies <span className="font-normal">(comma-separated)</span>
        </label>
        <input
          value={form.techText}
          onChange={e => set("techText", e.target.value)}
          placeholder="React, TypeScript, Node.js"
          className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-200"
        />
      </div>
      <div className="flex items-center gap-2 justify-end">
        <button
          onClick={onCancel}
          className="text-sm px-3 py-1.5 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={saving || !form.title || !form.company_name}
          className="text-sm px-4 py-1.5 rounded-lg bg-sky-600 text-white hover:bg-sky-700 transition-colors disabled:opacity-50 flex items-center gap-1.5"
        >
          <Save className="w-3.5 h-3.5" />
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [profile, setProfile] = useState<Profile>({});
  const [employment, setEmployment] = useState<Employment[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);

  // Headline
  const [editingHeadline, setEditingHeadline] = useState(false);
  const [headline, setHeadline] = useState("");

  // Summary
  const [editingSummary, setEditingSummary] = useState(false);
  const [summary, setSummary] = useState("");
  const [savingSummary, setSavingSummary] = useState(false);

  // Skills
  const [newSkill, setNewSkill] = useState("");
  const [savingSkills, setSavingSkills] = useState(false);
  const skillInputRef = useRef<HTMLInputElement>(null);

  // Experience
  const [editingExpId, setEditingExpId] = useState<string | "new" | null>(null);
  const [savingExp, setSavingExp] = useState(false);
  const [deletingExpId, setDeletingExpId] = useState<string | null>(null);

  // Hero edit
  const [editingHero, setEditingHero] = useState(false);
  const [heroForm, setHeroForm] = useState<Pick<Profile, "location" | "phone" | "linkedin_url" | "portfolio_url" | "github_url">>({});
  const [savingHero, setSavingHero] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/profile").then(r => r.json()),
      fetch("/api/profile/employment").then(r => r.json()),
      fetch("/api/workflows").then(r => r.json()),
    ]).then(([prof, emp, workflows]) => {
      if (prof && !prof.error) {
        setProfile(prof);
        setHeadline(prof.headline ?? "");
        setSummary(prof.summary ?? "");
        setHeroForm({
          location: prof.location,
          phone: prof.phone,
          linkedin_url: prof.linkedin_url,
          portfolio_url: prof.portfolio_url,
          github_url: prof.github_url,
        });
      }
      if (Array.isArray(emp)) setEmployment(emp);
      if (Array.isArray(workflows)) setJobs(workflows.map(workflowToJob));
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const patchProfile = async (update: Partial<Profile>) => {
    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(update),
    });
    const data = await res.json();
    if (!data.error) setProfile(data);
    return data;
  };

  const saveHeadline = async () => {
    await patchProfile({ headline });
    setEditingHeadline(false);
  };

  const saveSummary = async () => {
    setSavingSummary(true);
    await patchProfile({ summary });
    setSavingSummary(false);
    setEditingSummary(false);
  };

  const saveHero = async () => {
    setSavingHero(true);
    await patchProfile(heroForm);
    setSavingHero(false);
    setEditingHero(false);
  };

  const addSkill = async () => {
    const skill = newSkill.trim();
    if (!skill) return;
    const updated = [...(profile.skills ?? []).filter(s => s !== skill), skill];
    setSavingSkills(true);
    await patchProfile({ skills: updated });
    setNewSkill("");
    setSavingSkills(false);
  };

  const removeSkill = async (skill: string) => {
    const updated = (profile.skills ?? []).filter(s => s !== skill);
    setSavingSkills(true);
    await patchProfile({ skills: updated });
    setSavingSkills(false);
  };

  const saveExp = async (data: Omit<Employment, "id">) => {
    setSavingExp(true);
    if (editingExpId === "new") {
      const res = await fetch("/api/profile/employment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const created = await res.json();
      if (!created.error) setEmployment(prev => [created, ...prev]);
    } else if (editingExpId) {
      const res = await fetch(`/api/profile/employment/${editingExpId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const updated = await res.json();
      if (!updated.error) setEmployment(prev => prev.map(e => e.id === editingExpId ? updated : e));
    }
    setSavingExp(false);
    setEditingExpId(null);
  };

  const deleteExp = async (id: string) => {
    setDeletingExpId(id);
    await fetch(`/api/profile/employment/${id}`, { method: "DELETE" });
    setEmployment(prev => prev.filter(e => e.id !== id));
    setDeletingExpId(null);
  };

  const firstName = profile.first_name ?? "";
  const lastName = profile.last_name ?? "";
  const skills = profile.skills ?? [];

  // Stats
  const total = jobs.length;
  const active = jobs.filter(j => !["hired", "rejected", "withdrawn"].includes(j.status)).length;
  const interviews = jobs.filter(j => j.status === "interviewing").length;
  const offers = jobs.filter(j => j.status === "offer" || j.status === "hired").length;
  const successRate = total > 0 ? Math.round((offers / total) * 100) : 0;
  const responseRate = total > 0 ? Math.round(((interviews + offers) / total) * 100) : 0;

  const pipelineCounts = STATUS_ORDER.map(status => ({
    status,
    count: jobs.filter(j => j.status === status).length,
  }));
  const maxCount = Math.max(...pipelineCounts.map(p => p.count), 1);

  const STAT_CARDS = [
    { label: "Total Applied", value: total,      icon: Briefcase, note: "All time" },
    { label: "Active",        value: active,      icon: Target,    note: "Ongoing" },
    { label: "Interviews",    value: interviews,  icon: Calendar,  note: `${responseRate}% response rate` },
    { label: "Offers",        value: offers,      icon: Trophy,    note: `${successRate}% success rate` },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-6 h-6 border-2 border-slate-300 border-t-slate-900 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="page-wrapper max-w-1000px">
      <PageHeader
        title="My Profile"
        subtitle="Keep this updated for best AI results"
        actions={
          <button
            onClick={() => setShowUploadModal(true)}
            className="flex items-center gap-2 bg-slate-900 text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-slate-800 transition-colors flex-shrink-0"
          >
            <Upload className="w-4 h-4" />
            <span>Upload Artifact</span>
          </button>
        }
      />

      {/* Profile hero */}
      <div className="card-base p-5 sm:p-6 mb-5">
        <div className="flex items-start gap-4">
          <div className="relative flex-shrink-0">
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt={firstName} className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover" />
            ) : (
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-slate-200 flex items-center justify-center text-slate-500 font-bold text-2xl">
                {firstName[0] ?? "?"}
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold text-slate-900">
              {firstName} {lastName}
            </h2>
            {editingHeadline ? (
              <div className="flex items-center gap-2 mt-1">
                <input
                  value={headline}
                  onChange={(e) => setHeadline(e.target.value)}
                  className="flex-1 text-sm border border-sky-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-sky-200"
                  autoFocus
                  onKeyDown={(e) => e.key === "Enter" && saveHeadline()}
                />
                <button onClick={saveHeadline} className="text-xs bg-sky-600 text-white px-2 py-1 rounded-lg">
                  Save
                </button>
                <button onClick={() => setEditingHeadline(false)} className="text-xs text-slate-500 hover:text-slate-700">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setEditingHeadline(true)}
                className="text-slate-600 text-sm mt-0.5 text-left hover:text-sky-600 group flex items-center gap-1"
              >
                {profile.headline ?? "Click to add headline"}
                <Edit2 className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            )}

            {/* Contact info — view or edit */}
            {editingHero ? (
              <div className="mt-3 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <input
                    value={heroForm.location ?? ""}
                    onChange={e => setHeroForm(f => ({ ...f, location: e.target.value }))}
                    placeholder="Location"
                    className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-sky-200"
                  />
                  <input
                    value={heroForm.phone ?? ""}
                    onChange={e => setHeroForm(f => ({ ...f, phone: e.target.value }))}
                    placeholder="Phone"
                    className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-sky-200"
                  />
                  <input
                    value={heroForm.linkedin_url ?? ""}
                    onChange={e => setHeroForm(f => ({ ...f, linkedin_url: e.target.value }))}
                    placeholder="LinkedIn URL"
                    className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-sky-200"
                  />
                  <input
                    value={heroForm.portfolio_url ?? ""}
                    onChange={e => setHeroForm(f => ({ ...f, portfolio_url: e.target.value }))}
                    placeholder="Portfolio URL"
                    className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-sky-200"
                  />
                  <input
                    value={heroForm.github_url ?? ""}
                    onChange={e => setHeroForm(f => ({ ...f, github_url: e.target.value }))}
                    placeholder="GitHub URL"
                    className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-sky-200"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={saveHero}
                    disabled={savingHero}
                    className="text-xs bg-sky-600 text-white px-3 py-1.5 rounded-lg flex items-center gap-1 disabled:opacity-50"
                  >
                    <Check className="w-3 h-3" />
                    {savingHero ? "Saving…" : "Save"}
                  </button>
                  <button
                    onClick={() => setEditingHero(false)}
                    className="text-xs text-slate-500 hover:text-slate-700 px-2 py-1.5"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap gap-3 mt-2 text-xs text-slate-500">
                {profile.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{profile.location}</span>}
                {profile.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{profile.email}</span>}
                {profile.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{profile.phone}</span>}
                <button
                  onClick={() => setEditingHero(true)}
                  className="flex items-center gap-1 text-slate-400 hover:text-sky-600 transition-colors"
                >
                  <Pencil className="w-3 h-3" />
                  Edit info
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Links */}
        <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-slate-100">
          {[
            { icon: ExternalLink, label: "LinkedIn",  href: profile.linkedin_url },
            { icon: Globe,        label: "Portfolio", href: profile.portfolio_url },
            { icon: ExternalLink, label: "GitHub",    href: profile.github_url },
          ].filter(l => l.href).map(({ icon: Icon, label, href }) => (
            <a key={label} href={href} target="_blank" rel="noreferrer"
              className="flex items-center gap-1.5 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-full transition-colors"
            >
              <Icon className="w-3 h-3" />
              {label}
              <ExternalLink className="w-2.5 h-2.5 opacity-50" />
            </a>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto no-scrollbar mb-5 bg-white rounded-xl p-1 border border-slate-200 shadow-sm">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={cn(
              "flex items-center gap-1.5 flex-shrink-0 px-3 py-2 rounded-lg text-sm font-medium transition-all",
              activeTab === key ? "bg-sky-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100"
            )}
          >
            <Icon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div>
        {/* Overview */}
        {activeTab === "overview" && (
          <div className="card-base p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-slate-900">Professional Summary</h3>
              {!editingSummary && (
                <button
                  onClick={() => { setSummary(profile.summary ?? ""); setEditingSummary(true); }}
                  className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-sky-600 transition-colors"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  Edit
                </button>
              )}
            </div>
            {editingSummary ? (
              <div>
                <textarea
                  value={summary}
                  onChange={e => setSummary(e.target.value)}
                  rows={6}
                  placeholder="Write a professional summary that highlights your experience, skills, and career goals…"
                  className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-200 resize-none"
                  autoFocus
                />
                <div className="flex gap-2 mt-2 justify-end">
                  <button
                    onClick={() => setEditingSummary(false)}
                    className="text-sm px-3 py-1.5 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={saveSummary}
                    disabled={savingSummary}
                    className="text-sm px-4 py-1.5 rounded-lg bg-sky-600 text-white hover:bg-sky-700 transition-colors disabled:opacity-50 flex items-center gap-1.5"
                  >
                    <Save className="w-3.5 h-3.5" />
                    {savingSummary ? "Saving…" : "Save"}
                  </button>
                </div>
              </div>
            ) : profile.summary ? (
              <p className="text-slate-600 text-sm leading-relaxed">{profile.summary}</p>
            ) : (
              <button
                onClick={() => setEditingSummary(true)}
                className="w-full text-slate-400 text-sm text-center py-4 border-2 border-dashed border-slate-200 rounded-xl hover:border-sky-300 hover:text-sky-500 transition-colors"
              >
                Click to add a professional summary
              </button>
            )}
          </div>
        )}

        {/* Experience */}
        {activeTab === "experience" && (
          <div className="space-y-4">
            {employment.length === 0 && editingExpId !== "new" && (
              <div className="text-slate-400 text-sm text-center py-8 card-base">No employment history yet.</div>
            )}
            {employment.map((exp) => {
              const expTech: string[] = Array.isArray(exp.technologies) ? exp.technologies : [];
              const isEditing = editingExpId === exp.id;

              if (isEditing) {
                return (
                  <ExpForm
                    key={exp.id}
                    initial={exp}
                    onSave={saveExp}
                    onCancel={() => setEditingExpId(null)}
                    saving={savingExp}
                  />
                );
              }

              return (
                <div key={exp.id} className="card-base p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="font-semibold text-slate-900">{exp.title}</h3>
                      <p className="text-sky-600 font-medium text-sm">{exp.company_name}</p>
                      <p className="text-slate-400 text-xs mt-0.5">
                        {exp.location && `${exp.location} · `}
                        {exp.start_date} — {exp.is_current ? "Present" : (exp.end_date ?? "")}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {exp.is_current && (
                        <span className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full font-medium">
                          Current
                        </span>
                      )}
                      <button
                        onClick={() => setEditingExpId(exp.id)}
                        className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-sky-600 hover:bg-sky-50 transition-colors"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => deleteExp(exp.id)}
                        disabled={deletingExpId === exp.id}
                        className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-40"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  {exp.description && (
                    <p className="mt-3 text-sm text-slate-600 leading-relaxed">{exp.description}</p>
                  )}
                  {expTech.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {expTech.map(s => (
                        <span key={s} className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{s}</span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            {editingExpId === "new" && (
              <ExpForm
                initial={EMPTY_EXP}
                onSave={saveExp}
                onCancel={() => setEditingExpId(null)}
                saving={savingExp}
              />
            )}

            {editingExpId !== "new" && (
              <button
                onClick={() => setEditingExpId("new")}
                className="w-full flex items-center justify-center gap-2 p-3 border-2 border-dashed border-slate-200 rounded-xl text-slate-400 hover:border-sky-300 hover:text-sky-600 transition-colors text-sm"
              >
                <Plus className="w-4 h-4" />
                Add Experience
              </button>
            )}
          </div>
        )}

        {/* Education */}
        {activeTab === "education" && (
          <div className="space-y-4">
            <div className="text-slate-400 text-sm text-center py-8 card-base">Education management coming soon.</div>
            <button className="w-full flex items-center justify-center gap-2 p-3 border-2 border-dashed border-slate-200 rounded-xl text-slate-400 hover:border-sky-300 hover:text-sky-600 transition-colors text-sm">
              <Plus className="w-4 h-4" />
              Add Education
            </button>
          </div>
        )}

        {/* Skills */}
        {activeTab === "skills" && (
          <div className="space-y-5">
            <div className="card-base p-5">
              <h3 className="font-semibold text-slate-900 mb-3">Skills</h3>
              <div className="flex flex-wrap gap-2">
                {skills.map((skill) => (
                  <span
                    key={skill}
                    className="group flex items-center gap-1 text-sm bg-sky-50 text-sky-700 border border-sky-200 px-3 py-1.5 rounded-full font-medium"
                  >
                    {skill}
                    <button
                      onClick={() => removeSkill(skill)}
                      disabled={savingSkills}
                      className="opacity-0 group-hover:opacity-100 transition-opacity ml-0.5 hover:text-red-500"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
                {/* Add skill input */}
                <div className="flex items-center gap-1 bg-slate-50 border border-dashed border-slate-300 rounded-full px-2 py-1">
                  <input
                    ref={skillInputRef}
                    value={newSkill}
                    onChange={e => setNewSkill(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && addSkill()}
                    placeholder="Add skill…"
                    className="text-sm bg-transparent outline-none w-28 text-slate-600 placeholder:text-slate-400"
                  />
                  <button
                    onClick={addSkill}
                    disabled={!newSkill.trim() || savingSkills}
                    className="text-sky-600 hover:text-sky-700 disabled:opacity-30 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
                {skills.length === 0 && !newSkill && (
                  <p className="text-slate-400 text-sm w-full mt-1">Type a skill above and press Enter to add it.</p>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-3">Hover a skill to remove it.</p>
            </div>
          </div>
        )}

        {/* Achievements */}
        {activeTab === "achievements" && (
          <div className="space-y-4">
            <div className="text-slate-400 text-sm text-center py-8 card-base">Achievements management coming soon.</div>
            <button className="w-full flex items-center justify-center gap-2 p-3 border-2 border-dashed border-slate-200 rounded-xl text-slate-400 hover:border-sky-300 hover:text-sky-600 transition-colors text-sm">
              <Plus className="w-4 h-4" />
              Add Achievement
            </button>
          </div>
        )}

        {/* Stats */}
        {activeTab === "stats" && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-3">
              {STAT_CARDS.map(({ label, value, icon: Icon, note }) => (
                <div key={label} className="card-base p-4">
                  <div className="flex items-start justify-between mb-3">
                    <span className="text-xs font-medium text-slate-500">{label}</span>
                    <Icon className="w-4 h-4 text-slate-300" />
                  </div>
                  <div className="text-3xl font-bold text-slate-900 tracking-tight mb-0.5">{value}</div>
                  <div className="text-xs text-slate-400">{note}</div>
                </div>
              ))}
            </div>

            <div className="card-base p-5">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-4 h-4 text-slate-400" />
                <h2 className="font-semibold text-slate-900 text-sm">Pipeline breakdown</h2>
              </div>
              <div className="space-y-3">
                {pipelineCounts.map(({ status, count }) => (
                  <div key={status} className="flex items-center gap-3">
                    <div className="w-20 text-xs text-slate-500 text-right flex-shrink-0">
                      {STATUS_LABELS[status]}
                    </div>
                    <div className="flex-1 h-6 bg-slate-100 rounded-lg overflow-hidden relative">
                      <div
                        className="h-full rounded-lg transition-all duration-700 bg-slate-700"
                        style={{ width: count === 0 ? 0 : `${Math.max(25, (count / maxCount) * 100)}%` }}
                      />
                      {count > 0 && (
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-white">
                          {count}
                        </span>
                      )}
                    </div>
                    <div className="w-5 text-xs font-semibold text-slate-400 text-center flex-shrink-0">
                      {count === 0 && "—"}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="card-base p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Trophy className="w-4 h-4 text-slate-400" />
                  <h3 className="font-semibold text-slate-900 text-sm">Success rate</h3>
                </div>
                <div className="text-3xl font-bold text-slate-900 tracking-tight mb-0.5">{successRate}%</div>
                <p className="text-xs text-slate-400 mb-3">Offer or hire rate</p>
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-slate-900 rounded-full transition-all duration-1000" style={{ width: `${successRate}%` }} />
                </div>
              </div>
              <div className="card-base p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  <h3 className="font-semibold text-slate-900 text-sm">Response rate</h3>
                </div>
                <div className="text-3xl font-bold text-slate-900 tracking-tight mb-0.5">{responseRate}%</div>
                <p className="text-xs text-slate-400 mb-3">Led to interview</p>
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-slate-700 rounded-full transition-all duration-1000" style={{ width: `${responseRate}%` }} />
                </div>
              </div>
            </div>

            <div className="card-base overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                <h3 className="font-semibold text-slate-900 text-sm">All applications</h3>
                <Link href="/jobs" className="text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1 transition-colors">
                  Manage <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
              <div className="divide-y divide-slate-50">
                {jobs.length === 0 && (
                  <p className="text-slate-400 text-sm text-center py-6">No applications yet.</p>
                )}
                {jobs.map((job) => (
                  <Link key={job.id} href={`/jobs/${job.id}`}
                    className="flex items-center gap-3 px-5 py-3.5 hover:bg-slate-50 transition-colors group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden flex-shrink-0">
                      {job.companyLogo ? (
                        <img src={job.companyLogo} alt={job.company} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-500 font-bold text-sm">
                          {job.company[0]}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-slate-900 truncate">{job.title}</div>
                      <div className="text-xs text-slate-400">{job.company}</div>
                    </div>
                    <div className="flex-shrink-0">
                      <StatusBadge status={job.status} size="sm" />
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {showUploadModal && (
        <UploadArtifactModal
          onClose={() => setShowUploadModal(false)}
          onApplied={() => {
            Promise.all([
              fetch("/api/profile").then(r => r.json()),
              fetch("/api/profile/employment").then(r => r.json()),
            ]).then(([prof, emp]) => {
              if (prof && !prof.error) {
                setProfile(prof);
                setHeadline(prof.headline ?? "");
                setSummary(prof.summary ?? "");
                setHeroForm({
                  location: prof.location,
                  phone: prof.phone,
                  linkedin_url: prof.linkedin_url,
                  portfolio_url: prof.portfolio_url,
                  github_url: prof.github_url,
                });
              }
              if (Array.isArray(emp)) setEmployment(emp);
            }).catch(() => {});
          }}
        />
      )}
    </div>
  );
}
