"use client";

// ── Profile — Employment history, education, skills, credentials, and stats ──

import Link from "next/link";
import { useState, useEffect } from "react";
import { User, Briefcase, GraduationCap, Star, Award, Globe, Plus, Pencil, Save, CreditCard as Edit2, MapPin, Phone, Mail, ExternalLink, ChartBar as BarChart2, ArrowRight, Calendar, Target, Trophy, TrendingUp } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { StatusBadge } from "@/components/jobs/status-badge";
import { workflowToJob } from "@/lib/workflow-adapter";
import { cn } from "@/lib/utils";
import type { ApplicationStatus, Workflow, Job } from "@/lib/types";

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
  company: string;
  title: string;
  location?: string;
  start_date?: string;
  end_date?: string;
  is_current?: boolean;
  description?: string | string[];
  skills?: string[];
}

export default function ProfilePage() {
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [profile, setProfile] = useState<Profile>({});
  const [employment, setEmployment] = useState<Employment[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingHeadline, setEditingHeadline] = useState(false);
  const [headline, setHeadline] = useState("");

  useEffect(() => {
    Promise.all([
      fetch("/api/profile").then(r => r.json()),
      fetch("/api/profile/employment").then(r => r.json()),
      fetch("/api/workflows").then(r => r.json()),
    ]).then(([prof, emp, workflows]) => {
      if (prof && !prof.error) {
        setProfile(prof);
        setHeadline(prof.headline ?? "");
      }
      if (Array.isArray(emp)) setEmployment(emp);
      if (Array.isArray(workflows)) setJobs(workflows.map(workflowToJob));
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const saveHeadline = async () => {
    await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ headline }),
    });
    setProfile(prev => ({ ...prev, headline }));
    setEditingHeadline(false);
  };

  const firstName = profile.first_name ?? "";
  const lastName = profile.last_name ?? "";
  const skills = profile.skills ?? [];

  // Computed stats
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
            onClick={() => {}}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-sky-600 text-white hover:bg-sky-700 transition-colors shadow-sm"
            aria-label="Edit profile"
          >
            <Pencil className="w-4 h-4" />
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
            <div className="flex flex-wrap gap-3 mt-2 text-xs text-slate-500">
              {profile.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{profile.location}</span>}
              {profile.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{profile.email}</span>}
              {profile.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{profile.phone}</span>}
            </div>
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
            <h3 className="font-semibold text-slate-900 mb-3">Professional Summary</h3>
            {profile.summary ? (
              <p className="text-slate-600 text-sm leading-relaxed">{profile.summary}</p>
            ) : (
              <div className="text-slate-400 text-sm text-center py-4 border-2 border-dashed border-slate-200 rounded-xl">
                No summary yet — add one via the Edit button above.
              </div>
            )}
          </div>
        )}

        {/* Experience */}
        {activeTab === "experience" && (
          <div className="space-y-4">
            {employment.length === 0 && (
              <div className="text-slate-400 text-sm text-center py-8 card-base">No employment history yet.</div>
            )}
            {employment.map((exp) => {
              const desc: string[] = Array.isArray(exp.description)
                ? exp.description
                : exp.description
                ? [exp.description]
                : [];
              const expSkills: string[] = Array.isArray(exp.skills) ? exp.skills : [];
              return (
                <div key={exp.id} className="card-base p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-semibold text-slate-900">{exp.title}</h3>
                      <p className="text-sky-600 font-medium text-sm">{exp.company}</p>
                      <p className="text-slate-400 text-xs mt-0.5">
                        {exp.location && `${exp.location} · `}
                        {exp.start_date} — {exp.is_current ? "Present" : (exp.end_date ?? "")}
                      </p>
                    </div>
                    {exp.is_current && (
                      <span className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full font-medium flex-shrink-0">
                        Current
                      </span>
                    )}
                  </div>
                  {desc.length > 0 && (
                    <ul className="mt-3 space-y-1.5">
                      {desc.map((d, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                          <span className="w-1.5 h-1.5 rounded-full bg-sky-400 mt-1.5 flex-shrink-0" />
                          {d}
                        </li>
                      ))}
                    </ul>
                  )}
                  {expSkills.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {expSkills.map(s => (
                        <span key={s} className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{s}</span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
            <button className="w-full flex items-center justify-center gap-2 p-3 border-2 border-dashed border-slate-200 rounded-xl text-slate-400 hover:border-sky-300 hover:text-sky-600 transition-colors text-sm">
              <Plus className="w-4 h-4" />
              Add Experience
            </button>
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
                  <span key={skill} className="text-sm bg-sky-50 text-sky-700 border border-sky-200 px-3 py-1.5 rounded-full font-medium">
                    {skill}
                  </span>
                ))}
                {skills.length === 0 && (
                  <p className="text-slate-400 text-sm">No skills added yet.</p>
                )}
                <button className="text-sm bg-slate-100 text-slate-500 border border-dashed border-slate-300 px-3 py-1.5 rounded-full hover:border-sky-300 hover:text-sky-600 transition-colors flex items-center gap-1">
                  <Plus className="w-3 h-3" /> Add skill
                </button>
              </div>
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
    </div>
  );
}
