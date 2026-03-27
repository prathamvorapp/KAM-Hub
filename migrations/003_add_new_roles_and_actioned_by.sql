-- Migration: Add sub_agent & bo_person roles + actioned_by tracking
-- Purpose: Support two new roles and track who actually performed each action
-- Date: 2026-03-26
-- Safe to run: YES (adds nullable columns, drops/recreates constraint only)

-- ============================================
-- STEP 1: Update user_profiles role constraint
-- ============================================

-- Drop old constraint
ALTER TABLE user_profiles 
  DROP CONSTRAINT IF EXISTS user_profiles_role_check;

-- Add new constraint with sub_agent and bo_person
ALTER TABLE user_profiles 
  ADD CONSTRAINT user_profiles_role_check 
  CHECK (role IN ('admin', 'team_lead', 'agent', 'sub_agent', 'bo_person'));

-- Verify constraint updated
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_name = 'user_profiles' 
    AND constraint_name = 'user_profiles_role_check'
  ) THEN
    RAISE NOTICE '✅ user_profiles role constraint updated with sub_agent and bo_person';
  ELSE
    RAISE EXCEPTION '❌ Failed to update role constraint';
  END IF;
END $$;

-- ============================================
-- STEP 2: Add coordinator_id to user_profiles
-- ============================================
-- Self-referencing FK: sub_agent and bo_person point to their coordinator agent

ALTER TABLE user_profiles 
  ADD COLUMN IF NOT EXISTS coordinator_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_user_profiles_coordinator_id ON user_profiles(coordinator_id);

COMMENT ON COLUMN user_profiles.coordinator_id IS 
  'For sub_agent and bo_person roles: references the agent who acts as their coordinator/leader. Multiple sub_agents/bo_persons can share the same coordinator.';

-- Verify coordinator_id added
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_profiles' 
    AND column_name = 'coordinator_id'
  ) THEN
    RAISE NOTICE '✅ user_profiles.coordinator_id column added successfully';
  ELSE
    RAISE EXCEPTION '❌ Failed to add user_profiles.coordinator_id column';
  END IF;
END $$;

-- ============================================
-- STEP 3: Add actioned_by to activity tables
-- ============================================
-- actioned_by = who actually performed the action (sub_agent or agent)
-- The existing kam/agent_id fields remain unchanged for all reporting

ALTER TABLE churn_records 
  ADD COLUMN IF NOT EXISTS actioned_by TEXT;

ALTER TABLE health_checks 
  ADD COLUMN IF NOT EXISTS actioned_by TEXT;

ALTER TABLE visits 
  ADD COLUMN IF NOT EXISTS actioned_by TEXT;

ALTER TABLE demos 
  ADD COLUMN IF NOT EXISTS actioned_by TEXT;

ALTER TABLE mom 
  ADD COLUMN IF NOT EXISTS actioned_by TEXT;

-- Verify actioned_by columns added
DO $$
DECLARE
  missing_cols TEXT := '';
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'churn_records' AND column_name = 'actioned_by') THEN
    missing_cols := missing_cols || 'churn_records, ';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'health_checks' AND column_name = 'actioned_by') THEN
    missing_cols := missing_cols || 'health_checks, ';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'visits' AND column_name = 'actioned_by') THEN
    missing_cols := missing_cols || 'visits, ';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'demos' AND column_name = 'actioned_by') THEN
    missing_cols := missing_cols || 'demos, ';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'mom' AND column_name = 'actioned_by') THEN
    missing_cols := missing_cols || 'mom, ';
  END IF;

  IF missing_cols = '' THEN
    RAISE NOTICE '✅ actioned_by column added to all 5 activity tables';
  ELSE
    RAISE EXCEPTION '❌ actioned_by missing from: %', missing_cols;
  END IF;
END $$;

-- ============================================
-- STEP 4: Backfill actioned_by for existing records
-- ============================================
-- For all existing records, actioned_by = the agent who owns the record
-- (since sub_agents didn't exist before, all actions were by the agent themselves)

UPDATE churn_records 
  SET actioned_by = kam 
  WHERE actioned_by IS NULL AND kam IS NOT NULL;

UPDATE health_checks 
  SET actioned_by = kam_name 
  WHERE actioned_by IS NULL AND kam_name IS NOT NULL;

UPDATE visits 
  SET actioned_by = agent_id 
  WHERE actioned_by IS NULL AND agent_id IS NOT NULL;

UPDATE demos 
  SET actioned_by = agent_id 
  WHERE actioned_by IS NULL AND agent_id IS NOT NULL;

UPDATE mom 
  SET actioned_by = created_by 
  WHERE actioned_by IS NULL AND created_by IS NOT NULL;

-- Verify backfill
SELECT 
  'churn_records' as table_name,
  COUNT(*) as total,
  COUNT(actioned_by) as has_actioned_by,
  COUNT(*) - COUNT(actioned_by) as missing
FROM churn_records
UNION ALL
SELECT 'health_checks', COUNT(*), COUNT(actioned_by), COUNT(*) - COUNT(actioned_by) FROM health_checks
UNION ALL
SELECT 'visits', COUNT(*), COUNT(actioned_by), COUNT(*) - COUNT(actioned_by) FROM visits
UNION ALL
SELECT 'demos', COUNT(*), COUNT(actioned_by), COUNT(*) - COUNT(actioned_by) FROM demos
UNION ALL
SELECT 'mom', COUNT(*), COUNT(actioned_by), COUNT(*) - COUNT(actioned_by) FROM mom;

-- ============================================
-- STEP 5: Update schema comment
-- ============================================
COMMENT ON COLUMN user_profiles.role IS 
  'User role: admin, team_lead, agent, sub_agent, or bo_person';

-- ============================================
-- VERIFICATION SUMMARY
-- ============================================
SELECT 
  '🎉 Migration 003 completed successfully!' as message,
  'New roles: sub_agent, bo_person | New columns: coordinator_id, actioned_by' as summary;
