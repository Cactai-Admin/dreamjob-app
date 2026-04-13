// Core enum types matching database enums

export type UserRole = 'super_admin' | 'admin' | 'support' | 'user' | 'agent' | 'demo'

export type AccountState =
  | 'invited' | 'active' | 'deactivated' | 'support_restricted'
  | 'suspended' | 'pending_deletion' | 'deleted'

export type AuthProvider = 'internal' | 'google'

export type WorkflowState =
  | 'listing_review' | 'qa_intake' | 'generating' | 'review'
  | 'ready' | 'active' | 'ready_to_send' | 'sent' | 'completed' | 'archived'

export type OutputType = 'resume' | 'cover_letter' | 'interview_guide' | 'negotiation_guide'

export type OutputState = 'draft' | 'active' | 'ready' | 'sent'

export type StatusEventType =
  | 'sent' | 'received' | 'interview' | 'offer'
  | 'negotiation' | 'hired' | 'rejected' | 'ghosted' | 'declined'

export type EvidenceType =
  | 'artifact' | 'keyword' | 'numeric_data_point' | 'descriptive_string'
  | 'accomplishment' | 'technology' | 'tool' | 'certification' | 'education'

export type MemoryType =
  | 'answer_fragment' | 'phrasing' | 'preference'
  | 'tone_style' | 'positioning_statement'

export type PreferenceTag = 'shown' | 'hidden' | 'primary'

export type NotificationSeverity = 'info' | 'warning' | 'error' | 'success'

export type InsightType = 'news' | 'social_post' | 'similar_listings' | 'company_update' | 'connection'

export type DeletedItemType =
  | 'workflow' | 'output' | 'evidence' | 'employment' | 'artifact' | 'profile_memory'

// Database record types

export interface Account {
  id: string
  supabase_auth_id: string | null
  email: string
  username: string | null
  display_name: string
  avatar_url: string | null
  provider: AuthProvider
  state: AccountState
  invited_by: string | null
  invited_at: string | null
  activated_at: string | null
  deactivated_at: string | null
  suspended_at: string | null
  deletion_requested_at: string | null
  deletion_scheduled_at: string | null
  personal_info_broader_use: boolean
  product_accuracy_improvement: boolean
  created_at: string
  updated_at: string
}

export interface AccountRole {
  id: string
  account_id: string
  role: UserRole
  is_active: boolean
  granted_by: string | null
  granted_at: string
  revoked_at: string | null
}

export interface Invite {
  id: string
  email: string
  token: string
  role: UserRole
  created_by: string
  redeemed_by: string | null
  redeemed_at: string | null
  expires_at: string
  revoked_at: string | null
  created_at: string
}

export interface Session {
  id: string
  account_id: string
  supabase_session_id: string | null
  ip_address: string | null
  user_agent: string | null
  active_role: UserRole
  is_active: boolean
  created_at: string
  last_active_at: string
  revoked_at: string | null
}

export interface Profile {
  id: string
  account_id: string
  first_name: string | null
  last_name: string | null
  phone: string | null
  location: string | null
  linkedin_url: string | null
  website_url: string | null
  summary: string | null
  headline: string | null
  years_experience: number | null
  desired_title: string | null
  desired_salary_min: number | null
  desired_salary_max: number | null
  desired_location: string | null
  willing_to_relocate: boolean
  remote_preference: string | null
  created_at: string
  updated_at: string
}

export interface EmploymentHistory {
  id: string
  account_id: string
  company_name: string
  title: string
  location: string | null
  start_date: string
  end_date: string | null
  is_current: boolean
  description: string | null
  responsibilities: string[]
  achievements: string[]
  technologies: string[]
  is_primary: boolean
  preference_tag: PreferenceTag
  created_at: string
  updated_at: string
}

export interface Education {
  id: string
  account_id: string
  institution: string
  degree: string | null
  field_of_study: string | null
  start_date: string | null
  end_date: string | null
  gpa: string | null
  description: string | null
  created_at: string
  updated_at: string
}

export interface Certification {
  id: string
  account_id: string
  name: string
  issuing_organization: string | null
  issue_date: string | null
  expiry_date: string | null
  credential_id: string | null
  credential_url: string | null
  created_at: string
  updated_at: string
}

export interface EvidenceLibraryItem {
  id: string
  account_id: string
  type: EvidenceType
  content: string
  context: string | null
  employer: string | null
  role_title: string | null
  timeframe: string | null
  quantified_value: string | null
  preference_tag: PreferenceTag
  keywords: string[]
  source_workflow_id: string | null
  is_auto_generated: boolean
  created_at: string
  updated_at: string
}

export interface ProfileMemory {
  id: string
  account_id: string
  type: MemoryType
  content: string
  context: string | null
  source_workflow_id: string | null
  is_auto_generated: boolean
  superseded_by: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Artifact {
  id: string
  account_id: string
  filename: string
  file_type: string
  file_size: number
  storage_path: string
  parse_status: string
  parsed_content: string | null
  preference_tag: PreferenceTag
  created_at: string
  updated_at: string
}

export interface Company {
  id: string
  name: string
  website_url: string | null
  linkedin_url: string | null
  description: string | null
  industry: string | null
  size: string | null
  headquarters: string | null
  logo_url: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface JobListing {
  id: string
  company_id: string | null
  source_url: string | null
  title: string
  company_name: string
  location: string | null
  salary_range: string | null
  employment_type: string | null
  experience_level: string | null
  description: string | null
  requirements: string | null
  responsibilities: string | null
  benefits: string | null
  raw_html: string | null
  parsed_data: Record<string, unknown> | null
  is_available: boolean
  last_availability_check: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface Workflow {
  id: string
  account_id: string
  listing_id: string
  company_id: string | null
  state: WorkflowState
  title: string
  is_active: boolean
  resume_state: OutputState
  cover_letter_state: OutputState
  qa_started_at: string | null
  qa_completed_at: string | null
  generation_started_at: string | null
  generation_completed_at: string | null
  marked_ready_at: string | null
  sent_at: string | null
  archived_at: string | null
  autosave_data: Record<string, unknown> | null
  last_autosave_at: string | null
  created_at: string
  updated_at: string
}

export interface QAAnswer {
  id: string
  workflow_id: string
  account_id: string
  question_key: string
  question_text: string
  answer_text: string
  guidance_text: string | null
  is_accepted: boolean
  accepted_at: string | null
  sequence_order: number
  follow_up_of: string | null
  created_at: string
  updated_at: string
}

export interface Output {
  id: string
  workflow_id: string
  account_id: string
  type: OutputType
  content: string
  html_content: string | null
  state: OutputState
  version: number
  is_current: boolean
  approved_at: string | null
  approved_by: string | null
  generation_model: string | null
  generation_params: Record<string, unknown> | null
  superseded_by: string | null
  created_at: string
  updated_at: string
}

export interface SentSnapshot {
  id: string
  workflow_id: string
  account_id: string
  output_id: string
  type: OutputType
  content: string
  html_content: string | null
  sent_at: string
  method: string | null
}

export interface StatusEvent {
  id: string
  workflow_id: string
  account_id: string
  event_type: StatusEventType
  is_current: boolean
  notes: string | null
  occurred_at: string
  created_at: string
}

export interface ChatThread {
  id: string
  workflow_id: string
  surface: string
  provider_thread_id: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface ChatMessage {
  id: string
  thread_id: string
  role: string
  content: string
  metadata: Record<string, unknown> | null
  created_at: string
}

export interface Insight {
  id: string
  workflow_id: string
  listing_id: string
  type: InsightType
  title: string
  content: string | null
  source_url: string | null
  data: Record<string, unknown> | null
  is_read: boolean
  created_at: string
  updated_at: string
}

export interface LinkedInSession {
  id: string
  account_id: string
  is_authenticated: boolean
  session_data: Record<string, unknown> | null
  last_verified_at: string | null
  created_at: string
  updated_at: string
}

export interface LinkedInConnection {
  id: string
  account_id: string
  company_id: string | null
  listing_id: string | null
  profile_url: string
  name: string | null
  title: string | null
  degree: number
  data: Record<string, unknown> | null
  created_at: string
}

export interface Notification {
  id: string
  account_id: string
  type: string
  title: string
  message: string | null
  severity: NotificationSeverity
  scope: string | null
  source_event: string | null
  related_id: string | null
  related_type: string | null
  action_label: string | null
  action_target: string | null
  is_read: boolean
  is_dismissed: boolean
  expires_at: string | null
  created_at: string
}

export interface UserPreferences {
  id: string
  account_id: string
  theme: string
  layout_preference: string
  home_section_order: string[]
  sidebar_collapsed: boolean
  created_at: string
  updated_at: string
}

export interface DeletedItem {
  id: string
  account_id: string
  item_type: DeletedItemType
  item_id: string
  item_data: Record<string, unknown>
  deleted_at: string
  expires_at: string
  restored_at: string | null
  final_deleted_at: string | null
}

export interface AnalyticsEvent {
  id: string
  account_id: string | null
  event_type: string
  event_data: Record<string, unknown> | null
  ip_address: string | null
  user_agent: string | null
  created_at: string
}

export interface SystemConfig {
  id: string
  key: string
  value: Record<string, unknown>
  description: string | null
  updated_by: string | null
  created_at: string
  updated_at: string
}

// Joined/expanded types for API responses

export interface WorkflowWithRelations extends Workflow {
  listing?: JobListing
  company?: Company
  outputs?: Output[]
  status_events?: StatusEvent[]
  qa_answers?: QAAnswer[]
}

export interface AccountWithRoles extends Account {
  roles: AccountRole[]
}
