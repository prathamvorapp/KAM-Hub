-- Migration: Add Transfer Tracking Columns
-- Purpose: Enable brand transfer tracking without affecting existing data
-- Date: 2026-03-09
-- Safe to run: YES (adds nullable columns with defaults)

-- ============================================
-- STEP 1: Add columns to DEMOS table
-- ============================================
ALTER TABLE demos 
  ADD COLUMN IF NOT EXISTS completed_by_agent_id VARCHAR,
  ADD COLUMN IF NOT EXISTS completed_by_agent_name VARCHAR,
  ADD COLUMN IF NOT EXISTS transfer_history JSONB DEFAULT '[]';

-- Verify demos columns added
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'demos' 
    AND column_name = 'completed_by_agent_id'
  ) THEN
    RAISE NOTICE '✅ demos.completed_by_agent_id column added successfully';
  ELSE
    RAISE EXCEPTION '❌ Failed to add demos.completed_by_agent_id column';
  END IF;
END $$;

-- ============================================
-- STEP 2: Add columns to VISITS table
-- ============================================
ALTER TABLE visits 
  ADD COLUMN IF NOT EXISTS completed_by_agent_id VARCHAR,
  ADD COLUMN IF NOT EXISTS completed_by_agent_name VARCHAR,
  ADD COLUMN IF NOT EXISTS transfer_history JSONB DEFAULT '[]';

-- Verify visits columns added
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'visits' 
    AND column_name = 'completed_by_agent_id'
  ) THEN
    RAISE NOTICE '✅ visits.completed_by_agent_id column added successfully';
  ELSE
    RAISE EXCEPTION '❌ Failed to add visits.completed_by_agent_id column';
  END IF;
END $$;

-- ============================================
-- STEP 3: Add columns to MASTER_DATA table
-- ============================================
ALTER TABLE master_data 
  ADD COLUMN IF NOT EXISTS kam_history JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS current_kam_assigned_date TIMESTAMP;

-- Verify master_data columns added
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'master_data' 
    AND column_name = 'kam_history'
  ) THEN
    RAISE NOTICE '✅ master_data.kam_history column added successfully';
  ELSE
    RAISE EXCEPTION '❌ Failed to add master_data.kam_history column';
  END IF;
END $$;

-- ============================================
-- VERIFICATION QUERY
-- ============================================
-- Run this to confirm all columns exist
SELECT 
  'demos' as table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'demos' 
  AND column_name IN ('completed_by_agent_id', 'completed_by_agent_name', 'transfer_history')
UNION ALL
SELECT 
  'visits' as table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'visits' 
  AND column_name IN ('completed_by_agent_id', 'completed_by_agent_name', 'transfer_history')
UNION ALL
SELECT 
  'master_data' as table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'master_data' 
  AND column_name IN ('kam_history', 'current_kam_assigned_date');

-- Expected result: 8 rows (3 for demos, 3 for visits, 2 for master_data)
