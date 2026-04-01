-- Migration: Add topic_description to engagement_call_config
-- Allows admin to provide additional context/instructions for agents about the monthly topic

ALTER TABLE engagement_call_config
  ADD COLUMN IF NOT EXISTS topic_description TEXT;
