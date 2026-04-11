-- Migration 007: Add 'ready' to status_event_type enum
ALTER TYPE status_event_type ADD VALUE IF NOT EXISTS 'ready';
