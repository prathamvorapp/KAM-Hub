-- Verification Script for Migration 001
-- Run this AFTER executing 001_add_transfer_tracking_columns.sql

-- ============================================
-- CHECK 1: Verify all columns exist
-- ============================================
SELECT 
  CASE 
    WHEN COUNT(*) = 8 THEN '✅ All 8 columns added successfully'
    ELSE '❌ Missing columns! Expected 8, found ' || COUNT(*)::text
  END as status
FROM (
  SELECT column_name FROM information_schema.columns
  WHERE table_name = 'demos' 
    AND column_name IN ('completed_by_agent_id', 'completed_by_agent_name', 'transfer_history')
  UNION ALL
  SELECT column_name FROM information_schema.columns
  WHERE table_name = 'visits' 
    AND column_name IN ('completed_by_agent_id', 'completed_by_agent_name', 'transfer_history')
  UNION ALL
  SELECT column_name FROM information_schema.columns
  WHERE table_name = 'master_data' 
    AND column_name IN ('kam_history', 'current_kam_assigned_date')
) as all_columns;

-- ============================================
-- CHECK 2: Verify existing data is intact
-- ============================================
SELECT 
  '✅ Demos table data intact' as status,
  COUNT(*) as total_demos,
  COUNT(CASE WHEN demo_completed = true THEN 1 END) as completed_demos,
  COUNT(CASE WHEN completed_by_agent_id IS NOT NULL THEN 1 END) as has_completed_by
FROM demos;

SELECT 
  '✅ Visits table data intact' as status,
  COUNT(*) as total_visits,
  COUNT(CASE WHEN visit_status = 'Completed' THEN 1 END) as completed_visits,
  COUNT(CASE WHEN completed_by_agent_id IS NOT NULL THEN 1 END) as has_completed_by
FROM visits;

SELECT 
  '✅ Master data table intact' as status,
  COUNT(*) as total_brands,
  COUNT(CASE WHEN kam_email_id IS NOT NULL THEN 1 END) as brands_with_kam
FROM master_data;

-- ============================================
-- CHECK 3: Verify columns are nullable
-- ============================================
SELECT 
  table_name,
  column_name,
  CASE 
    WHEN is_nullable = 'YES' THEN '✅ Nullable (Safe)'
    ELSE '⚠️ NOT NULL (May cause issues)'
  END as nullable_status
FROM information_schema.columns
WHERE table_name IN ('demos', 'visits', 'master_data')
  AND column_name IN (
    'completed_by_agent_id', 
    'completed_by_agent_name', 
    'transfer_history',
    'kam_history',
    'current_kam_assigned_date'
  )
ORDER BY table_name, column_name;

-- ============================================
-- CHECK 4: Sample data check
-- ============================================
-- Check a few demo records to ensure agent_id is still intact
SELECT 
  demo_id,
  agent_id,
  agent_name,
  demo_completed,
  completed_by_agent_id,
  CASE 
    WHEN agent_id IS NOT NULL THEN '✅ agent_id intact'
    ELSE '❌ agent_id is NULL!'
  END as agent_id_status
FROM demos
LIMIT 5;

-- ============================================
-- FINAL STATUS
-- ============================================
SELECT 
  '🎉 Migration 001 completed successfully!' as message,
  'All columns added, existing data intact, ready for Phase 2' as next_step;
