-- Migration: Sub-agent many-to-many coordinator relationship
-- Purpose: A sub_agent can work under multiple agents; bo_person stays single coordinator_id
-- Date: 2026-03-26
-- Safe to run: YES (adds new table, coordinator_id on user_profiles stays for bo_person)

-- ============================================
-- STEP 1: Create junction table for sub_agent ↔ agent (many-to-many)
-- ============================================
CREATE TABLE IF NOT EXISTS sub_agent_coordinators (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sub_agent_id   UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  coordinator_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (sub_agent_id, coordinator_id)  -- prevent duplicate pairs
);

CREATE INDEX IF NOT EXISTS idx_sac_sub_agent_id    ON sub_agent_coordinators(sub_agent_id);
CREATE INDEX IF NOT EXISTS idx_sac_coordinator_id  ON sub_agent_coordinators(coordinator_id);

COMMENT ON TABLE sub_agent_coordinators IS
  'Many-to-many: a sub_agent can be assigned to multiple coordinator agents. bo_person uses coordinator_id on user_profiles instead.';

-- Verify table created
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'sub_agent_coordinators'
  ) THEN
    RAISE NOTICE '✅ sub_agent_coordinators table created successfully';
  ELSE
    RAISE EXCEPTION '❌ Failed to create sub_agent_coordinators table';
  END IF;
END $$;

-- ============================================
-- STEP 2: Migrate existing coordinator_id data for sub_agents
-- ============================================
-- If any sub_agent rows already have coordinator_id set (from migration 003),
-- copy them into the new junction table so no data is lost.

INSERT INTO sub_agent_coordinators (sub_agent_id, coordinator_id)
SELECT id, coordinator_id
FROM user_profiles
WHERE role = 'sub_agent'
  AND coordinator_id IS NOT NULL
ON CONFLICT (sub_agent_id, coordinator_id) DO NOTHING;

-- Note: coordinator_id on user_profiles is now ONLY used for bo_person going forward.

-- ============================================
-- VERIFICATION
-- ============================================
SELECT
  'sub_agent_coordinators' as table_name,
  COUNT(*) as total_rows
FROM sub_agent_coordinators;

SELECT '🎉 Migration 004 completed. sub_agent now supports multiple coordinators.' as message;
