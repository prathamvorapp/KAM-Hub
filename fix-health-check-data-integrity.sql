-- Health Check Data Integrity Fixes
-- Run these queries in Supabase SQL Editor to fix common data issues

-- ============================================================================
-- 1. CHECK FOR DATA INTEGRITY ISSUES
-- ============================================================================

-- Check for orphaned health checks (kam_email not in user_profiles)
SELECT hc.kam_email, COUNT(*) as orphaned_count
FROM health_checks hc
LEFT JOIN user_profiles up ON hc.kam_email = up.email
WHERE up.email IS NULL
GROUP BY hc.kam_email;

-- Check for orphaned master_data (kam_email_id not in user_profiles)
SELECT md.kam_email_id, COUNT(*) as orphaned_count
FROM master_data md
LEFT JOIN user_profiles up ON md.kam_email_id = up.email
WHERE up.email IS NULL
GROUP BY md.kam_email_id;

-- Check for email case sensitivity issues
SELECT 
  md.kam_email_id as master_data_email,
  up.email as user_profile_email,
  md.kam_email_id = up.email as exact_match,
  LOWER(md.kam_email_id) = LOWER(up.email) as case_insensitive_match
FROM master_data md
LEFT JOIN user_profiles up ON LOWER(md.kam_email_id) = LOWER(up.email)
WHERE md.kam_email_id != up.email
LIMIT 20;

-- ============================================================================
-- 2. FIX EMAIL CASE SENSITIVITY ISSUES
-- ============================================================================

-- Normalize emails in master_data to match user_profiles
UPDATE master_data md
SET kam_email_id = up.email
FROM user_profiles up
WHERE LOWER(md.kam_email_id) = LOWER(up.email)
  AND md.kam_email_id != up.email;

-- Normalize emails in health_checks to match user_profiles
UPDATE health_checks hc
SET kam_email = up.email
FROM user_profiles up
WHERE LOWER(hc.kam_email) = LOWER(up.email)
  AND hc.kam_email != up.email;

-- Normalize created_by in health_checks
UPDATE health_checks hc
SET created_by = up.email
FROM user_profiles up
WHERE LOWER(hc.created_by) = LOWER(up.email)
  AND hc.created_by != up.email;

-- ============================================================================
-- 3. FIX BRAND NAME INCONSISTENCIES
-- ============================================================================

-- Find brand names with leading/trailing whitespace
SELECT 
  brand_name,
  LENGTH(brand_name) as original_length,
  LENGTH(TRIM(brand_name)) as trimmed_length,
  COUNT(*) as count
FROM master_data
WHERE brand_name != TRIM(brand_name)
GROUP BY brand_name;

-- Trim brand names in master_data
UPDATE master_data
SET brand_name = TRIM(brand_name)
WHERE brand_name != TRIM(brand_name);

-- Trim brand names in health_checks
UPDATE health_checks
SET brand_name = TRIM(brand_name)
WHERE brand_name != TRIM(brand_name);

-- ============================================================================
-- 4. CHECK FOR DUPLICATE ASSESSMENTS
-- ============================================================================

-- Find duplicate assessments (same brand, same KAM, same month)
SELECT 
  brand_name,
  kam_email,
  assessment_month,
  COUNT(*) as duplicate_count,
  ARRAY_AGG(check_id) as check_ids,
  ARRAY_AGG(assessment_date) as assessment_dates
FROM health_checks
GROUP BY brand_name, kam_email, assessment_month
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC;

-- ============================================================================
-- 5. REMOVE DUPLICATE ASSESSMENTS (Keep the latest one)
-- ============================================================================

-- Delete duplicate assessments, keeping only the most recent one
WITH duplicates AS (
  SELECT 
    check_id,
    ROW_NUMBER() OVER (
      PARTITION BY brand_name, kam_email, assessment_month 
      ORDER BY assessment_date DESC, created_at DESC
    ) as rn
  FROM health_checks
)
DELETE FROM health_checks
WHERE check_id IN (
  SELECT check_id FROM duplicates WHERE rn > 1
);

-- ============================================================================
-- 6. VERIFY FOREIGN KEY RELATIONSHIPS
-- ============================================================================

-- Check if all kam_email in health_checks exist in user_profiles
SELECT 
  'health_checks.kam_email' as field,
  COUNT(*) as invalid_count
FROM health_checks hc
WHERE NOT EXISTS (
  SELECT 1 FROM user_profiles up WHERE up.email = hc.kam_email
);

-- Check if all created_by in health_checks exist in user_profiles
SELECT 
  'health_checks.created_by' as field,
  COUNT(*) as invalid_count
FROM health_checks hc
WHERE NOT EXISTS (
  SELECT 1 FROM user_profiles up WHERE up.email = hc.created_by
);

-- Check if all kam_email_id in master_data exist in user_profiles
SELECT 
  'master_data.kam_email_id' as field,
  COUNT(*) as invalid_count
FROM master_data md
WHERE NOT EXISTS (
  SELECT 1 FROM user_profiles up WHERE up.email = md.kam_email_id
);

-- ============================================================================
-- 7. FIX TEAM NAME INCONSISTENCIES
-- ============================================================================

-- Update team_name in health_checks to match user_profiles
UPDATE health_checks hc
SET team_name = up.team_name
FROM user_profiles up
WHERE hc.kam_email = up.email
  AND (hc.team_name IS NULL OR hc.team_name != up.team_name);

-- ============================================================================
-- 8. VERIFY ASSESSMENT COUNTS FOR SPECIFIC USER
-- ============================================================================

-- Replace '[USER_EMAIL]' with actual user email
DO $$
DECLARE
  user_email TEXT := '[USER_EMAIL]'; -- Replace with actual email
  assessment_month TEXT := '2026-02'; -- Replace with current month
  total_brands INT;
  assessed_brands INT;
  pending_brands INT;
BEGIN
  -- Count total brands
  SELECT COUNT(*) INTO total_brands
  FROM master_data
  WHERE kam_email_id = user_email;
  
  -- Count assessed brands
  SELECT COUNT(DISTINCT brand_name) INTO assessed_brands
  FROM health_checks
  WHERE kam_email = user_email
    AND assessment_month = assessment_month;
  
  -- Calculate pending
  pending_brands := total_brands - assessed_brands;
  
  -- Display results
  RAISE NOTICE 'User: %', user_email;
  RAISE NOTICE 'Total Brands: %', total_brands;
  RAISE NOTICE 'Assessed Brands: %', assessed_brands;
  RAISE NOTICE 'Pending Brands: %', pending_brands;
  
  -- Show sample pending brands
  RAISE NOTICE 'Sample Pending Brands:';
  FOR i IN (
    SELECT md.brand_name
    FROM master_data md
    WHERE md.kam_email_id = user_email
      AND NOT EXISTS (
        SELECT 1 
        FROM health_checks hc 
        WHERE LOWER(TRIM(hc.brand_name)) = LOWER(TRIM(md.brand_name))
          AND hc.kam_email = user_email
          AND hc.assessment_month = assessment_month
      )
    LIMIT 5
  ) LOOP
    RAISE NOTICE '  - %', i.brand_name;
  END LOOP;
END $$;

-- ============================================================================
-- 9. CREATE INDEXES FOR BETTER PERFORMANCE (if not exists)
-- ============================================================================

-- Indexes for health_checks
CREATE INDEX IF NOT EXISTS idx_health_checks_kam_month 
ON health_checks(kam_email, assessment_month);

CREATE INDEX IF NOT EXISTS idx_health_checks_brand_kam 
ON health_checks(brand_name, kam_email);

CREATE INDEX IF NOT EXISTS idx_health_checks_month_brand_kam 
ON health_checks(assessment_month, brand_name, kam_email);

-- Indexes for master_data
CREATE INDEX IF NOT EXISTS idx_master_data_kam_brand 
ON master_data(kam_email_id, brand_name);

-- ============================================================================
-- 10. VERIFY RLS POLICIES
-- ============================================================================

-- Check if RLS is enabled
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('master_data', 'health_checks', 'user_profiles')
ORDER BY tablename;

-- View all policies
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
  AND tablename IN ('master_data', 'health_checks', 'user_profiles')
ORDER BY tablename, policyname;

-- ============================================================================
-- 11. FINAL VERIFICATION QUERY
-- ============================================================================

-- Comprehensive check for a specific user
-- Replace '[USER_EMAIL]' with actual user email
WITH user_brands AS (
  SELECT brand_name, kam_email_id
  FROM master_data
  WHERE kam_email_id = '[USER_EMAIL]'
),
assessed_brands AS (
  SELECT DISTINCT LOWER(TRIM(brand_name)) as brand_name_normalized
  FROM health_checks
  WHERE kam_email = '[USER_EMAIL]'
    AND assessment_month = '2026-02'
),
pending_brands AS (
  SELECT ub.brand_name
  FROM user_brands ub
  WHERE LOWER(TRIM(ub.brand_name)) NOT IN (
    SELECT brand_name_normalized FROM assessed_brands
  )
)
SELECT 
  (SELECT COUNT(*) FROM user_brands) as total_brands,
  (SELECT COUNT(*) FROM assessed_brands) as assessed_brands,
  (SELECT COUNT(*) FROM pending_brands) as pending_brands,
  (SELECT ARRAY_AGG(brand_name) FROM pending_brands LIMIT 5) as sample_pending_brands;

-- ============================================================================
-- NOTES
-- ============================================================================

/*
After running these queries:

1. Clear all application caches
2. Refresh the Health Check-ups page
3. Verify the counts match
4. Test the assessment flow

If issues persist:
- Check browser console for errors
- Verify user role and permissions
- Check network tab for API responses
- Run the diagnostic queries in diagnose-health-check-issue.sql
*/
