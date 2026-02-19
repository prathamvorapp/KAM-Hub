-- Check RLS Status and Policies for all tables
-- Run this to diagnose RLS configuration issues

-- =====================================================
-- 1. Check which tables have RLS enabled
-- =====================================================
SELECT 
  schemaname,
  tablename,
  rowsecurity AS rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'user_profiles',
    'master_data',
    'churn_records',
    'visits',
    'demos',
    'health_checks',
    'mom',
    'notification_preferences',
    'notification_log'
  )
ORDER BY tablename;

-- =====================================================
-- 2. Check existing RLS policies
-- =====================================================
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE schemaname = 'public'
  AND tablename IN (
    'user_profiles',
    'master_data',
    'churn_records',
    'visits',
    'demos',
    'health_checks',
    'mom',
    'notification_preferences',
    'notification_log'
  )
ORDER BY tablename, cmd, policyname;

-- =====================================================
-- 3. Count records in churn_records (should work with service role)
-- =====================================================
SELECT COUNT(*) as total_churn_records FROM churn_records;

-- =====================================================
-- 4. Sample churn records to verify data exists
-- =====================================================
SELECT 
  rid,
  restaurant_name,
  kam,
  churn_reason,
  date,
  follow_up_status
FROM churn_records
LIMIT 5;

-- =====================================================
-- 5. Check if service role key is being used correctly
-- =====================================================
SELECT current_user, current_setting('request.jwt.claims', true) as jwt_claims;
