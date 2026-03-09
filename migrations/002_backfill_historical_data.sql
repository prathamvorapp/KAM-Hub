-- Migration: Backfill Historical Data
-- Purpose: Populate completed_by fields for existing completed records
-- Date: 2026-03-09
-- Safe to run: YES (only updates NULL values, preserves existing data)

-- ============================================
-- STEP 1: Backfill DEMOS table
-- ============================================

-- Count records that will be updated
SELECT 
  '📊 DEMOS - Records to backfill:' as info,
  COUNT(*) as completed_demos_without_completed_by
FROM demos
WHERE demo_completed = true 
  AND completed_by_agent_id IS NULL;

-- Perform backfill for completed demos
UPDATE demos
SET 
  completed_by_agent_id = agent_id,
  completed_by_agent_name = agent_name,
  updated_at = updated_at  -- Keep original updated_at timestamp
WHERE 
  demo_completed = true 
  AND completed_by_agent_id IS NULL;

-- Verify demos backfill
SELECT 
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ All completed demos have completed_by fields'
    ELSE '⚠️ ' || COUNT(*)::text || ' completed demos still missing completed_by'
  END as demos_status
FROM demos
WHERE demo_completed = true 
  AND completed_by_agent_id IS NULL;

-- ============================================
-- STEP 2: Backfill VISITS table
-- ============================================

-- Count records that will be updated
SELECT 
  '📊 VISITS - Records to backfill:' as info,
  COUNT(*) as completed_visits_without_completed_by
FROM visits
WHERE visit_status = 'Completed' 
  AND completed_by_agent_id IS NULL;

-- Perform backfill for completed visits
UPDATE visits
SET 
  completed_by_agent_id = agent_id,
  completed_by_agent_name = agent_name,
  updated_at = updated_at  -- Keep original updated_at timestamp
WHERE 
  visit_status = 'Completed' 
  AND completed_by_agent_id IS NULL;

-- Verify visits backfill
SELECT 
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ All completed visits have completed_by fields'
    ELSE '⚠️ ' || COUNT(*)::text || ' completed visits still missing completed_by'
  END as visits_status
FROM visits
WHERE visit_status = 'Completed' 
  AND completed_by_agent_id IS NULL;

-- ============================================
-- STEP 3: Initialize MASTER_DATA kam_history
-- ============================================

-- Count records that will be updated
SELECT 
  '📊 MASTER_DATA - Records to initialize:' as info,
  COUNT(*) as brands_without_kam_history
FROM master_data
WHERE kam_history = '[]' OR kam_history IS NULL;

-- Initialize kam_history with current KAM
UPDATE master_data
SET 
  kam_history = jsonb_build_array(
    jsonb_build_object(
      'kam_email_id', kam_email_id,
      'kam_name', kam_name,
      'assigned_date', COALESCE(created_at, NOW()),
      'assigned_by', 'SYSTEM_MIGRATION',
      'reason', 'Initial assignment - historical data'
    )
  ),
  current_kam_assigned_date = COALESCE(created_at, NOW())
WHERE 
  (kam_history = '[]' OR kam_history IS NULL)
  AND kam_email_id IS NOT NULL;

-- Verify master_data initialization
SELECT 
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ All brands have kam_history initialized'
    ELSE '⚠️ ' || COUNT(*)::text || ' brands still missing kam_history'
  END as master_data_status
FROM master_data
WHERE (kam_history = '[]' OR kam_history IS NULL)
  AND kam_email_id IS NOT NULL;

-- ============================================
-- VERIFICATION SUMMARY
-- ============================================
SELECT 
  'demos' as table_name,
  COUNT(*) as total_records,
  COUNT(CASE WHEN demo_completed = true THEN 1 END) as completed_records,
  COUNT(CASE WHEN completed_by_agent_id IS NOT NULL THEN 1 END) as has_completed_by,
  COUNT(CASE WHEN demo_completed = true AND completed_by_agent_id IS NULL THEN 1 END) as missing_completed_by
FROM demos
UNION ALL
SELECT 
  'visits' as table_name,
  COUNT(*) as total_records,
  COUNT(CASE WHEN visit_status = 'Completed' THEN 1 END) as completed_records,
  COUNT(CASE WHEN completed_by_agent_id IS NOT NULL THEN 1 END) as has_completed_by,
  COUNT(CASE WHEN visit_status = 'Completed' AND completed_by_agent_id IS NULL THEN 1 END) as missing_completed_by
FROM visits
UNION ALL
SELECT 
  'master_data' as table_name,
  COUNT(*) as total_records,
  COUNT(*) as completed_records,
  COUNT(CASE WHEN kam_history IS NOT NULL AND kam_history != '[]' THEN 1 END) as has_completed_by,
  COUNT(CASE WHEN kam_history = '[]' OR kam_history IS NULL THEN 1 END) as missing_completed_by
FROM master_data;

-- ============================================
-- SAMPLE DATA CHECK
-- ============================================
-- Verify a few records to ensure backfill worked correctly
SELECT 
  '📋 Sample Demos After Backfill' as info,
  demo_id,
  agent_id,
  completed_by_agent_id,
  CASE 
    WHEN agent_id = completed_by_agent_id THEN '✅ Match'
    ELSE '❌ Mismatch'
  END as validation
FROM demos
WHERE demo_completed = true
LIMIT 5;

SELECT 
  '📋 Sample Visits After Backfill' as info,
  visit_id,
  agent_id,
  completed_by_agent_id,
  CASE 
    WHEN agent_id = completed_by_agent_id THEN '✅ Match'
    ELSE '❌ Mismatch'
  END as validation
FROM visits
WHERE visit_status = 'Completed'
LIMIT 5;

-- ============================================
-- FINAL STATUS
-- ============================================
SELECT 
  '🎉 Migration 002 completed successfully!' as message,
  'Historical data backfilled, ready for Phase 3' as next_step;
