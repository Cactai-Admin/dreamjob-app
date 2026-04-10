-- DreamJob MVP Database Schema
-- This migration creates all tables needed for the DreamJob application.
-- Run with: npx tsx scripts/reset-db.ts

-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE user_role AS ENUM (
  'super_admin', 'admin', 'support', 'user', 'agent', 'demo'
);

CREATE TYPE account_state AS ENUM (
  'invited', 'active', 'deactivated', 'support_restricted',
  'suspended', 'pending_deletion', 'deleted'
);

CREATE TYPE auth_provider AS ENUM ('internal', 'google');

CREATE TYPE workflow_state AS ENUM (
  'listing_review', 'qa_intake', 'generating', 'review',
  'ready', 'active', 'ready_to_send', 'sent', 'completed', 'archived'
);

CREATE TYPE output_type AS ENUM (
  'resume', 'cover_letter', 'interview_guide', 'negotiation_guide'
);

CREATE TYPE output_state AS ENUM ('draft', 'active', 'ready', 'sent');

CREATE TYPE status_event_type AS ENUM (
  'sent', 'received', 'interview', 'offer',
  'negotiation', 'hired', 'rejected', 'ghosted', 'declined'
);

CREATE TYPE evidence_type AS ENUM (
  'artifact', 'keyword', 'numeric_data_point', 'descriptive_string',
  'accomplishment', 'technology', 'tool', 'certification', 'education'
);

CREATE TYPE memory_type AS ENUM (
  'answer_fragment', 'phrasing', 'preference',
  'tone_style', 'positioning_statement'
);

CREATE TYPE preference_tag AS ENUM ('shown', 'hidden', 'primary');

CREATE TYPE notification_severity AS ENUM ('info', 'warning', 'error', 'success');

CREATE TYPE insight_type AS ENUM (
  'news', 'social_post', 'similar_listings', 'company_update', 'connection'
);

CREATE TYPE deleted_item_type AS ENUM (
  'workflow', 'output', 'evidence', 'employment', 'artifact', 'profile_memory'
);

-- ============================================================
-- EXTENSION
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- ACCOUNTS & AUTH
-- ============================================================

CREATE TABLE accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  supabase_auth_id UUID UNIQUE,
  email TEXT UNIQUE NOT NULL,
  username TEXT UNIQUE,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  provider auth_provider NOT NULL DEFAULT 'google',
  state account_state NOT NULL DEFAULT 'invited',
  invited_by UUID REFERENCES accounts(id),
  invited_at TIMESTAMPTZ,
  activated_at TIMESTAMPTZ,
  deactivated_at TIMESTAMPTZ,
  suspended_at TIMESTAMPTZ,
  deletion_requested_at TIMESTAMPTZ,
  deletion_scheduled_at TIMESTAMPTZ,
  personal_info_broader_use BOOLEAN NOT NULL DEFAULT true,
  product_accuracy_improvement BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE account_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  role user_role NOT NULL DEFAULT 'user',
  is_active BOOLEAN NOT NULL DEFAULT true,
  granted_by UUID REFERENCES accounts(id),
  granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at TIMESTAMPTZ,
  UNIQUE(account_id, role)
);

CREATE TABLE invites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT NOT NULL,
  token TEXT UNIQUE NOT NULL,
  role user_role NOT NULL DEFAULT 'user',
  created_by UUID NOT NULL REFERENCES accounts(id),
  redeemed_by UUID REFERENCES accounts(id),
  redeemed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  supabase_session_id TEXT,
  ip_address TEXT,
  user_agent TEXT,
  active_role user_role NOT NULL DEFAULT 'user',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_active_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at TIMESTAMPTZ
);

CREATE TABLE access_grants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  granted_to UUID NOT NULL REFERENCES accounts(id),
  granted_role user_role NOT NULL,
  scope TEXT NOT NULL,
  reason TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  revoked_by UUID REFERENCES accounts(id)
);

-- ============================================================
-- PROFILES & EMPLOYMENT
-- ============================================================

CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID UNIQUE NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  first_name TEXT,
  last_name TEXT,
  phone TEXT,
  location TEXT,
  linkedin_url TEXT,
  website_url TEXT,
  summary TEXT,
  headline TEXT,
  years_experience INTEGER,
  desired_title TEXT,
  desired_salary_min INTEGER,
  desired_salary_max INTEGER,
  desired_location TEXT,
  willing_to_relocate BOOLEAN DEFAULT false,
  remote_preference TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE employment_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  title TEXT NOT NULL,
  location TEXT,
  start_date TEXT NOT NULL,
  end_date TEXT,
  is_current BOOLEAN NOT NULL DEFAULT false,
  description TEXT,
  responsibilities TEXT[],
  achievements TEXT[],
  technologies TEXT[],
  is_primary BOOLEAN NOT NULL DEFAULT false,
  preference_tag preference_tag NOT NULL DEFAULT 'shown',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE education (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  institution TEXT NOT NULL,
  degree TEXT,
  field_of_study TEXT,
  start_date TEXT,
  end_date TEXT,
  gpa TEXT,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE certifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  issuing_organization TEXT,
  issue_date TEXT,
  expiry_date TEXT,
  credential_id TEXT,
  credential_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- EVIDENCE LIBRARY & PROFILE MEMORY
-- ============================================================

CREATE TABLE evidence_library (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  type evidence_type NOT NULL,
  content TEXT NOT NULL,
  context TEXT,
  employer TEXT,
  role_title TEXT,
  timeframe TEXT,
  quantified_value TEXT,
  preference_tag preference_tag NOT NULL DEFAULT 'shown',
  keywords TEXT[],
  source_workflow_id UUID,
  is_auto_generated BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE profile_memory (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  type memory_type NOT NULL,
  content TEXT NOT NULL,
  context TEXT,
  source_workflow_id UUID,
  is_auto_generated BOOLEAN NOT NULL DEFAULT false,
  superseded_by UUID REFERENCES profile_memory(id),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE artifacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  storage_path TEXT NOT NULL,
  parse_status TEXT DEFAULT 'pending',
  parsed_content TEXT,
  preference_tag preference_tag NOT NULL DEFAULT 'shown',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- COMPANIES & LISTINGS
-- ============================================================

CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  website_url TEXT,
  linkedin_url TEXT,
  description TEXT,
  industry TEXT,
  size TEXT,
  headquarters TEXT,
  logo_url TEXT,
  created_by UUID REFERENCES accounts(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE job_listings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id),
  source_url TEXT,
  title TEXT NOT NULL,
  company_name TEXT NOT NULL,
  location TEXT,
  salary_range TEXT,
  employment_type TEXT,
  experience_level TEXT,
  description TEXT,
  requirements TEXT,
  responsibilities TEXT,
  benefits TEXT,
  raw_html TEXT,
  parsed_data JSONB,
  is_available BOOLEAN NOT NULL DEFAULT true,
  last_availability_check TIMESTAMPTZ,
  created_by UUID REFERENCES accounts(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE listing_availability_checks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  listing_id UUID NOT NULL REFERENCES job_listings(id) ON DELETE CASCADE,
  is_available BOOLEAN NOT NULL,
  status_code INTEGER,
  checked_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- JOB APPLICATION WORKFLOWS
-- ============================================================

CREATE TABLE workflows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  listing_id UUID NOT NULL REFERENCES job_listings(id),
  company_id UUID REFERENCES companies(id),
  state workflow_state NOT NULL DEFAULT 'listing_review',
  title TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  resume_state output_state DEFAULT 'draft',
  cover_letter_state output_state DEFAULT 'draft',
  qa_started_at TIMESTAMPTZ,
  qa_completed_at TIMESTAMPTZ,
  generation_started_at TIMESTAMPTZ,
  generation_completed_at TIMESTAMPTZ,
  marked_ready_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  archived_at TIMESTAMPTZ,
  autosave_data JSONB,
  last_autosave_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE qa_answers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  question_key TEXT NOT NULL,
  question_text TEXT NOT NULL,
  answer_text TEXT NOT NULL,
  guidance_text TEXT,
  is_accepted BOOLEAN NOT NULL DEFAULT false,
  accepted_at TIMESTAMPTZ,
  sequence_order INTEGER NOT NULL DEFAULT 0,
  follow_up_of UUID REFERENCES qa_answers(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE structured_captures (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  capture_data JSONB NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE outputs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  type output_type NOT NULL,
  content TEXT NOT NULL,
  html_content TEXT,
  state output_state NOT NULL DEFAULT 'draft',
  version INTEGER NOT NULL DEFAULT 1,
  is_current BOOLEAN NOT NULL DEFAULT true,
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES accounts(id),
  generation_model TEXT,
  generation_params JSONB,
  superseded_by UUID REFERENCES outputs(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE sent_snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  output_id UUID NOT NULL REFERENCES outputs(id),
  type output_type NOT NULL,
  content TEXT NOT NULL,
  html_content TEXT,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  method TEXT
);

CREATE TABLE copy_download_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  output_id UUID NOT NULL REFERENCES outputs(id),
  action TEXT NOT NULL,
  content_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- STATUS TRACKING
-- ============================================================

CREATE TABLE status_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  event_type status_event_type NOT NULL,
  is_current BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- CHAT THREADS
-- ============================================================

CREATE TABLE chat_threads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  surface TEXT NOT NULL,
  provider_thread_id TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(workflow_id, surface)
);

CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  thread_id UUID NOT NULL REFERENCES chat_threads(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE chat_checkpoints (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  thread_id UUID NOT NULL REFERENCES chat_threads(id) ON DELETE CASCADE,
  checkpoint_data JSONB NOT NULL,
  is_valid BOOLEAN NOT NULL DEFAULT true,
  invalidated_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- INSIGHTS
-- ============================================================

CREATE TABLE insights (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  listing_id UUID NOT NULL REFERENCES job_listings(id),
  type insight_type NOT NULL,
  title TEXT NOT NULL,
  content TEXT,
  source_url TEXT,
  data JSONB,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE insight_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  listing_id UUID REFERENCES job_listings(id),
  insights_enabled BOOLEAN NOT NULL DEFAULT true,
  notifications_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- LINKEDIN SESSIONS
-- ============================================================

CREATE TABLE linkedin_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID UNIQUE NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  is_authenticated BOOLEAN NOT NULL DEFAULT false,
  session_data JSONB,
  last_verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE linkedin_connections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  company_id UUID REFERENCES companies(id),
  listing_id UUID REFERENCES job_listings(id),
  profile_url TEXT NOT NULL,
  name TEXT,
  title TEXT,
  degree INTEGER NOT NULL DEFAULT 1,
  data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  severity notification_severity NOT NULL DEFAULT 'info',
  scope TEXT,
  source_event TEXT,
  related_id UUID,
  related_type TEXT,
  action_label TEXT,
  action_target TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  is_dismissed BOOLEAN NOT NULL DEFAULT false,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- PREFERENCES
-- ============================================================

CREATE TABLE user_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID UNIQUE NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  theme TEXT NOT NULL DEFAULT 'system',
  layout_preference TEXT NOT NULL DEFAULT 'cards',
  home_section_order TEXT[] DEFAULT ARRAY['journey', 'active_workflow', 'recent_activity', 'current_employment'],
  sidebar_collapsed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- DELETED ITEMS (Pending Deletion / Recovery)
-- ============================================================

CREATE TABLE deleted_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  item_type deleted_item_type NOT NULL,
  item_id UUID NOT NULL,
  item_data JSONB NOT NULL,
  deleted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  restored_at TIMESTAMPTZ,
  final_deleted_at TIMESTAMPTZ
);

-- ============================================================
-- ANALYTICS EVENTS (Internal Logging Only)
-- ============================================================

CREATE TABLE analytics_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  event_data JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- SYSTEM CONFIG & KILL SWITCHES
-- ============================================================

CREATE TABLE system_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key TEXT UNIQUE NOT NULL,
  value JSONB NOT NULL,
  description TEXT,
  updated_by UUID REFERENCES accounts(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX idx_accounts_email ON accounts(email);
CREATE INDEX idx_accounts_supabase_auth_id ON accounts(supabase_auth_id);
CREATE INDEX idx_accounts_state ON accounts(state);
CREATE INDEX idx_account_roles_account ON account_roles(account_id);
CREATE INDEX idx_account_roles_role ON account_roles(role);
CREATE INDEX idx_invites_token ON invites(token);
CREATE INDEX idx_invites_email ON invites(email);
CREATE INDEX idx_sessions_account ON sessions(account_id);
CREATE INDEX idx_profiles_account ON profiles(account_id);
CREATE INDEX idx_employment_account ON employment_history(account_id);
CREATE INDEX idx_evidence_account ON evidence_library(account_id);
CREATE INDEX idx_evidence_type ON evidence_library(type);
CREATE INDEX idx_memory_account ON profile_memory(account_id);
CREATE INDEX idx_artifacts_account ON artifacts(account_id);
CREATE INDEX idx_companies_name ON companies(name);
CREATE INDEX idx_listings_company ON job_listings(company_id);
CREATE INDEX idx_listings_source_url ON job_listings(source_url);
CREATE INDEX idx_workflows_account ON workflows(account_id);
CREATE INDEX idx_workflows_listing ON workflows(listing_id);
CREATE INDEX idx_workflows_state ON workflows(state);
CREATE INDEX idx_qa_workflow ON qa_answers(workflow_id);
CREATE INDEX idx_outputs_workflow ON outputs(workflow_id);
CREATE INDEX idx_outputs_type ON outputs(type);
CREATE INDEX idx_sent_snapshots_workflow ON sent_snapshots(workflow_id);
CREATE INDEX idx_status_events_workflow ON status_events(workflow_id);
CREATE INDEX idx_chat_threads_workflow ON chat_threads(workflow_id);
CREATE INDEX idx_chat_messages_thread ON chat_messages(thread_id);
CREATE INDEX idx_insights_workflow ON insights(workflow_id);
CREATE INDEX idx_notifications_account ON notifications(account_id);
CREATE INDEX idx_notifications_unread ON notifications(account_id) WHERE NOT is_read;
CREATE INDEX idx_deleted_items_account ON deleted_items(account_id);
CREATE INDEX idx_deleted_items_expires ON deleted_items(expires_at) WHERE final_deleted_at IS NULL;
CREATE INDEX idx_analytics_events_type ON analytics_events(event_type);
CREATE INDEX idx_analytics_events_account ON analytics_events(account_id);
CREATE INDEX idx_linkedin_connections_account ON linkedin_connections(account_id);
CREATE INDEX idx_linkedin_connections_company ON linkedin_connections(company_id);

-- ============================================================
-- UPDATED_AT TRIGGER
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_accounts_updated_at BEFORE UPDATE ON accounts FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_employment_updated_at BEFORE UPDATE ON employment_history FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_education_updated_at BEFORE UPDATE ON education FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_certifications_updated_at BEFORE UPDATE ON certifications FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_evidence_updated_at BEFORE UPDATE ON evidence_library FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_memory_updated_at BEFORE UPDATE ON profile_memory FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_artifacts_updated_at BEFORE UPDATE ON artifacts FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_companies_updated_at BEFORE UPDATE ON companies FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_listings_updated_at BEFORE UPDATE ON job_listings FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_workflows_updated_at BEFORE UPDATE ON workflows FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_qa_updated_at BEFORE UPDATE ON qa_answers FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_outputs_updated_at BEFORE UPDATE ON outputs FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_chat_threads_updated_at BEFORE UPDATE ON chat_threads FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_insights_updated_at BEFORE UPDATE ON insights FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_preferences_updated_at BEFORE UPDATE ON user_preferences FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_linkedin_sessions_updated_at BEFORE UPDATE ON linkedin_sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_insight_prefs_updated_at BEFORE UPDATE ON insight_preferences FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_system_config_updated_at BEFORE UPDATE ON system_config FOR EACH ROW EXECUTE FUNCTION update_updated_at();
