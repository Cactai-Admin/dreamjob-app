-- Migration 003: Fix enum values to match application code
-- Run in Supabase SQL Editor

-- 1. Add 'draft' to workflow_state enum (code uses state:"draft" for active applications)
ALTER TYPE workflow_state ADD VALUE IF NOT EXISTS 'draft';

-- 2. Add missing status_event_type values used by the status dropdown in editors
ALTER TYPE status_event_type ADD VALUE IF NOT EXISTS 'submitted';
ALTER TYPE status_event_type ADD VALUE IF NOT EXISTS 'interview_scheduled';
ALTER TYPE status_event_type ADD VALUE IF NOT EXISTS 'offer_received';
ALTER TYPE status_event_type ADD VALUE IF NOT EXISTS 'withdrawn';

-- 3. Add 'approved' to output_state enum (used when approving documents)
ALTER TYPE output_state ADD VALUE IF NOT EXISTS 'approved';

-- 4. Add status TEXT column to outputs (code sends status:"approved" on approval)
ALTER TABLE outputs ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft';
