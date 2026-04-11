// ============================================================
// lib/types.ts — Application-wide TypeScript interfaces
// ============================================================

export type ApplicationStatus =
  | "draft"
  | "ready"
  | "applied"
  | "received"
  | "interviewing"
  | "offer"
  | "negotiating"
  | "hired"
  | "declined"
  | "ghosted"
  | "rejected";

export type DocumentStatus =
  | "not_started"
  | "generating"
  | "draft"
  | "approved";

export type UserRole = "user" | "admin" | "super_admin";

// ── Job / Application ─────────────────────────────────────

export interface Job {
  id: string;
  title: string;
  company: string;
  companyLogo?: string;
  location: string;
  locationType: "remote" | "hybrid" | "onsite";
  type: "full-time" | "part-time" | "contract" | "freelance";
  salary?: string;
  description: string;
  requirements: string[];
  benefits: string[];
  url?: string;
  status: ApplicationStatus;
  appliedDate?: string;
  deadline?: string;
  notes?: string;
  resumeStatus: DocumentStatus;
  coverLetterStatus: DocumentStatus;
  interviewGuideStatus: DocumentStatus;
  negotiationGuideStatus: DocumentStatus;
  connections: LinkedInConnection[];
  tags: string[];
  hiringManager?: string;
  department?: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

export interface LinkedInConnection {
  id: string;
  name: string;
  title: string;
  avatar: string;
  degree: 1 | 2 | 3;
  mutualConnections?: number;
}

// ── User Profile ──────────────────────────────────────────

export interface WorkExperience {
  id: string;
  company: string;
  title: string;
  location: string;
  startDate: string;
  endDate?: string;
  current: boolean;
  description: string[];
  skills: string[];
}

export interface Education {
  id: string;
  institution: string;
  degree: string;
  field: string;
  startDate: string;
  endDate?: string;
  gpa?: string;
  honors?: string;
}

export interface Certification {
  id: string;
  name: string;
  issuer: string;
  date: string;
  url?: string;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  date?: string;
}

export interface UserProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  location: string;
  headline: string;
  summary: string;
  avatar: string;
  role: UserRole;
  experience: WorkExperience[];
  education: Education[];
  skills: string[];
  certifications: Certification[];
  achievements: Achievement[];
  linkedinUrl?: string;
  portfolioUrl?: string;
  githubUrl?: string;
}

// ── Documents ─────────────────────────────────────────────

export interface DocumentSection {
  id: string;
  title: string;
  content: string;
}

export interface ResumeDocument {
  jobId: string;
  sections: DocumentSection[];
  lastEdited: string;
  status: DocumentStatus;
}

export interface CoverLetterDocument {
  jobId: string;
  content: string;
  lastEdited: string;
  status: DocumentStatus;
}

// ── Chat ──────────────────────────────────────────────────

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  suggestions?: string[];
}

// ── Admin ─────────────────────────────────────────────────

export interface AdminUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: UserRole;
  status: "active" | "suspended" | "pending";
  joinedAt: string;
  lastActive: string;
  applicationCount: number;
  avatar: string;
}

// ── Stats ─────────────────────────────────────────────────

export interface DashboardStats {
  total: number;
  active: number;
  interviews: number;
  offers: number;
  successRate: number;
}

// ── Real API shapes ────────────────────────────────────────

export interface JobListing {
  id: string;
  source_url: string | null;
  title: string;
  company_name: string;
  description: string | null;
  requirements: string[] | null;
  location?: string;
  salary_range?: string;
  employment_type?: string;
  experience_level?: string;
  responsibilities?: string;
  benefits?: string;
  company_website_url?: string | null;
}

export interface Company {
  id: string;
  name: string;
  logo_url?: string;
  linkedin_url?: string;
  website_url?: string;
}

export interface Output {
  id: string;
  workflow_id: string;
  type: string;
  content: string;
  version: number;
  is_current: boolean;
  status?: string;
  created_at: string;
}

export interface StatusEvent {
  id: string;
  workflow_id: string;
  event_type: string;
  notes?: string;
  occurred_at: string;
}

export interface Workflow {
  id: string;
  account_id: string;
  listing_id: string;
  company_id: string | null;
  title: string;
  state: string;
  is_active: boolean;
  notes?: string | null;
  created_at: string;
  updated_at: string;
  listing: JobListing;
  company: Company | null;
  outputs?: Output[];
  status_events?: StatusEvent[];
}
