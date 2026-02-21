-- ============================================================================
-- SUPABASE DIAGNOSTIC QUERIES FOR AGENT STATISTICS ISSUE
-- Agent: Sudhin Raveendran (sudhin.raveendran@petpooja.com)
-- ============================================================================

-- ============================================================================
-- SECTION 1: USER PROFILE VERIFICATION
-- ============================================================================

-- Query 1.1: Check if agent exists in user_profiles
SELECT 
    email,
    full_name,
    role,
    team_name,
    is_active,
    created_at
FROM user_profiles
WHERE email ILIKE '%sudhin%' OR full_name ILIKE '%sudhin%'
ORDER BY created_at DESC;

-- Expected Result: Should show sudhin.raveendran@petpooja.com with role='Agent' and is_active=true


-- Query 1.2: Check exact email match
SELECT 
    email,
    full_name,
    role,
    team_name,
    is_active
FROM user_profiles
WHERE email = 'sudhin.raveendran@petpooja.com';

-- Expected Result: Should return 1 row with agent details


-- ============================================================================
-- SECTION 2: BRAND ASSIGNMENTS VERIFICATION
-- ============================================================================

-- Query 2.1: Count total brands assigned to Sudhin
SELECT 
    COUNT(*) as total_brands,
    kam_email_id,
    kam_name
FROM master_data
WHERE kam_email_id = 'sudhin.raveendran@petpooja.com'
GROUP BY kam_email_id, kam_name;

-- Expected Result: Should show 41 brands (or similar count)


-- Query 2.2: List all brands assigned to Sudhin (with details)
SELECT 
    brand_name,
    kam_email_id,
    kam_name,
    zone,
    brand_state,
    created_at
FROM master_data
WHERE kam_email_id = 'sudhin.raveendran@petpooja.com'
ORDER BY brand_name;

-- Expected Result: Should list all 41+ brands


-- Query 2.3: Check for email variations in master_data
SELECT 
    DISTINCT kam_email_id,
    kam_name,
    COUNT(*) as brand_count
FROM master_data
WHERE kam_name ILIKE '%sudhin%' OR kam_email_id ILIKE '%sudhin%'
GROUP BY kam_email_id, kam_name
ORDER BY brand_count DESC;

-- Expected Result: Should show if there are multiple email variations


-- ============================================================================
-- SECTION 3: HEALTH CHECK ASSESSMENTS VERIFICATION
-- ============================================================================

-- Query 3.1: Count health check assessments by Sudhin
SELECT 
    COUNT(*) as total_assessments,
    kam_email,
    kam_name,
    assessment_month
FROM health_checks
WHERE kam_email = 'sudhin.raveendran@petpooja.com'
GROUP BY kam_email, kam_name, assessment_month
ORDER BY assessment_month DESC;

-- Expected Result: Should show assessment counts per month


-- Query 3.2: Get current month assessments for Sudhin
SELECT 
    check_id,
    brand_name,
    health_status,
    brand_nature,
    assessment_date,
    assessment_month,
    kam_email,
    kam_name,
    team_name
FROM health_checks
WHERE kam_email = 'sudhin.raveendran@petpooja.com'
    AND assessment_month = TO_CHAR(CURRENT_DATE, 'YYYY-MM')
ORDER BY assessment_date DESC;

-- Expected Result: Should show assessments for current month (February 2026)


-- Query 3.3: Check for email variations in health_checks
SELECT 
    DISTINCT kam_email,
    kam_name,
    COUNT(*) as assessment_count
FROM health_checks
WHERE kam_name ILIKE '%sudhin%' OR kam_email ILIKE '%sudhin%'
GROUP BY kam_email, kam_name
ORDER BY assessment_count DESC;

-- Expected Result: Should show if there are multiple email variations


-- ============================================================================
-- SECTION 4: CROSS-TABLE EMAIL CONSISTENCY CHECK
-- ============================================================================

-- Query 4.1: Compare emails across all three tables
SELECT 
    'user_profiles' as source_table,
    email as email_value,
    full_name as name_value
FROM user_profiles
WHERE full_name ILIKE '%sudhin%'

UNION ALL

SELECT 
    'master_data' as source_table,
    kam_email_id as email_value,
    kam_name as name_value
FROM master_data
WHERE kam_name ILIKE '%sudhin%'
GROUP BY kam_email_id, kam_name

UNION ALL

SELECT 
    'health_checks' as source_table,
    kam_email as email_value,
    kam_name as name_value
FROM health_checks
WHERE kam_name ILIKE '%sudhin%'
GROUP BY kam_email, kam_name;

-- Expected Result: All three should show the same email (sudhin.raveendran@petpooja.com)
-- If different emails appear, that's the root cause!


-- ============================================================================
-- SECTION 5: TEAM ASSIGNMENT VERIFICATION
-- ============================================================================

-- Query 5.1: Check team assignment in user_profiles
SELECT 
    email,
    full_name,
    team_name,
    role
FROM user_profiles
WHERE email = 'sudhin.raveendran@petpooja.com';

-- Expected Result: team_name should be 'South_2 Team' or similar


-- Query 5.2: Check team members in South_2 Team
SELECT 
    email,
    full_name,
    role,
    is_active
FROM user_profiles
WHERE team_name = 'South_2 Team'
    AND role IN ('agent', 'Agent')
ORDER BY full_name;

-- Expected Result: Should list all agents in South_2 Team including Sudhin


-- ============================================================================
-- SECTION 6: STATISTICS CALCULATION VERIFICATION
-- ============================================================================

-- Query 6.1: Calculate agent statistics manually (mimics the service logic)
WITH agent_brands AS (
    SELECT 
        COUNT(*) as total_brands
    FROM master_data
    WHERE kam_email_id = 'sudhin.raveendran@petpooja.com'
),
current_month_assessments AS (
    SELECT 
        COUNT(*) as assessed_brands,
        COUNT(CASE WHEN health_status IN ('Green', 'Amber') THEN 1 END) as healthy_brands,
        COUNT(CASE WHEN health_status IN ('Orange', 'Red') THEN 1 END) as critical_brands,
        COUNT(CASE WHEN health_status = 'Not Connected' THEN 1 END) as not_connected
    FROM health_checks
    WHERE kam_email = 'sudhin.raveendran@petpooja.com'
        AND assessment_month = TO_CHAR(CURRENT_DATE, 'YYYY-MM')
)
SELECT 
    ab.total_brands,
    COALESCE(cma.assessed_brands, 0) as assessed_brands,
    ab.total_brands - COALESCE(cma.assessed_brands, 0) as pending_assessments,
    COALESCE(cma.healthy_brands, 0) as healthy_brands,
    COALESCE(cma.critical_brands, 0) as critical_brands,
    COALESCE(cma.not_connected, 0) as not_connected,
    CASE 
        WHEN COALESCE(cma.assessed_brands, 0) > 0 
        THEN ROUND((COALESCE(cma.assessed_brands, 0) - COALESCE(cma.not_connected, 0))::numeric / COALESCE(cma.assessed_brands, 0)::numeric * 100, 2)
        ELSE 0 
    END as connectivity_rate_percentage
FROM agent_brands ab
CROSS JOIN current_month_assessments cma;

-- Expected Result: Should match the dashboard values
-- total_brands: 41
-- assessed_brands: 1
-- pending_assessments: 40
-- connectivity_rate: 2%


-- ============================================================================
-- SECTION 7: DATA QUALITY CHECKS
-- ============================================================================

-- Query 7.1: Check for duplicate brand assignments
SELECT 
    brand_name,
    kam_email_id,
    COUNT(*) as duplicate_count
FROM master_data
WHERE kam_email_id = 'sudhin.raveendran@petpooja.com'
GROUP BY brand_name, kam_email_id
HAVING COUNT(*) > 1;

-- Expected Result: Should return 0 rows (no duplicates)


-- Query 7.2: Check for NULL or empty values
SELECT 
    COUNT(*) as total_records,
    COUNT(CASE WHEN brand_name IS NULL OR brand_name = '' THEN 1 END) as null_brand_names,
    COUNT(CASE WHEN kam_email_id IS NULL OR kam_email_id = '' THEN 1 END) as null_emails,
    COUNT(CASE WHEN kam_name IS NULL OR kam_name = '' THEN 1 END) as null_names
FROM master_data
WHERE kam_email_id = 'sudhin.raveendran@petpooja.com';

-- Expected Result: null counts should be 0


-- Query 7.3: Check for case sensitivity issues
SELECT 
    kam_email_id,
    COUNT(*) as brand_count
FROM master_data
WHERE LOWER(kam_email_id) = LOWER('sudhin.raveendran@petpooja.com')
GROUP BY kam_email_id;

-- Expected Result: Should show only one email variation with all brands


-- ============================================================================
-- SECTION 8: RECENT ACTIVITY CHECK
-- ============================================================================

-- Query 8.1: Check recent health check submissions
SELECT 
    check_id,
    brand_name,
    health_status,
    assessment_date,
    created_at,
    created_by
FROM health_checks
WHERE kam_email = 'sudhin.raveendran@petpooja.com'
ORDER BY created_at DESC
LIMIT 10;

-- Expected Result: Should show recent assessment activity


-- Query 8.2: Check if agent profile is active and recently updated
SELECT 
    email,
    full_name,
    is_active,
    created_at,
    updated_at
FROM user_profiles
WHERE email = 'sudhin.raveendran@petpooja.com';

-- Expected Result: Should show is_active=true and recent timestamps


-- ============================================================================
-- SECTION 9: COMPARISON WITH OTHER AGENTS (SANITY CHECK)
-- ============================================================================

-- Query 9.1: Compare Sudhin's stats with other agents in same team
WITH agent_stats AS (
    SELECT 
        up.email,
        up.full_name,
        up.team_name,
        COUNT(DISTINCT md.brand_name) as total_brands,
        COUNT(DISTINCT hc.check_id) as total_assessments
    FROM user_profiles up
    LEFT JOIN master_data md ON md.kam_email_id = up.email
    LEFT JOIN health_checks hc ON hc.kam_email = up.email 
        AND hc.assessment_month = TO_CHAR(CURRENT_DATE, 'YYYY-MM')
    WHERE up.team_name = 'South_2 Team'
        AND up.role IN ('agent', 'Agent')
        AND up.is_active = true
    GROUP BY up.email, up.full_name, up.team_name
)
SELECT 
    email,
    full_name,
    team_name,
    total_brands,
    total_assessments,
    CASE 
        WHEN email = 'sudhin.raveendran@petpooja.com' THEN '👈 THIS AGENT'
        ELSE ''
    END as marker
FROM agent_stats
ORDER BY total_brands DESC;

-- Expected Result: Should show Sudhin with 41 brands compared to other team members


-- ============================================================================
-- SECTION 10: FIX QUERIES (USE ONLY IF EMAIL MISMATCH FOUND)
-- ============================================================================

-- Query 10.1: Find the correct email if there's a mismatch
-- RUN THIS FIRST TO IDENTIFY THE ISSUE
SELECT 
    'user_profiles' as table_name,
    email as found_email
FROM user_profiles
WHERE full_name ILIKE '%sudhin%'

UNION ALL

SELECT 
    'master_data' as table_name,
    kam_email_id as found_email
FROM master_data
WHERE kam_name ILIKE '%sudhin%'
GROUP BY kam_email_id

UNION ALL

SELECT 
    'health_checks' as table_name,
    kam_email as found_email
FROM health_checks
WHERE kam_name ILIKE '%sudhin%'
GROUP BY kam_email;


-- Query 10.2: FIX - Update master_data if email mismatch found
-- ⚠️ ONLY RUN THIS IF YOU CONFIRMED EMAIL MISMATCH IN QUERY 10.1
-- Replace 'OLD_EMAIL' with the incorrect email found in master_data
/*
UPDATE master_data
SET kam_email_id = 'sudhin.raveendran@petpooja.com'
WHERE kam_email_id = 'OLD_EMAIL_HERE' -- Replace with actual old email
    AND kam_name ILIKE '%sudhin%';
*/


-- Query 10.3: FIX - Update health_checks if email mismatch found
-- ⚠️ ONLY RUN THIS IF YOU CONFIRMED EMAIL MISMATCH IN QUERY 10.1
-- Replace 'OLD_EMAIL' with the incorrect email found in health_checks
/*
UPDATE health_checks
SET kam_email = 'sudhin.raveendran@petpooja.com'
WHERE kam_email = 'OLD_EMAIL_HERE' -- Replace with actual old email
    AND kam_name ILIKE '%sudhin%';
*/


-- ============================================================================
-- SECTION 11: VERIFICATION AFTER FIX
-- ============================================================================

-- Query 11.1: Verify all emails are now consistent
-- RUN THIS AFTER APPLYING ANY FIXES
SELECT 
    'user_profiles' as source,
    COUNT(*) as record_count,
    email
FROM user_profiles
WHERE email = 'sudhin.raveendran@petpooja.com'
GROUP BY email

UNION ALL

SELECT 
    'master_data' as source,
    COUNT(*) as record_count,
    kam_email_id as email
FROM master_data
WHERE kam_email_id = 'sudhin.raveendran@petpooja.com'
GROUP BY kam_email_id

UNION ALL

SELECT 
    'health_checks' as source,
    COUNT(*) as record_count,
    kam_email as email
FROM health_checks
WHERE kam_email = 'sudhin.raveendran@petpooja.com'
GROUP BY kam_email;

-- Expected Result: All three tables should show 'sudhin.raveendran@petpooja.com'


-- ============================================================================
-- EXECUTION INSTRUCTIONS
-- ============================================================================

/*
HOW TO USE THESE QUERIES:

1. START WITH SECTION 1-3: Basic verification
   - Run queries 1.1, 2.1, 3.1 to get overview

2. IF ZEROS APPEAR: Run Section 4
   - Query 4.1 will show if there are email mismatches

3. RUN SECTION 6: Calculate statistics manually
   - Query 6.1 should match dashboard values

4. IF EMAIL MISMATCH FOUND: Use Section 10
   - First run 10.1 to identify exact emails
   - Then run 10.2 and/or 10.3 to fix (uncomment and modify)

5. AFTER FIX: Run Section 11
   - Verify all emails are consistent

6. FINAL STEP: Clear cache in application
   - Click "Clear Cache" button in Health Checks page
   - Refresh the page to see updated statistics

EXPECTED RESULTS FOR SUDHIN:
- Total Brands: 41
- Assessments (Feb 2026): 1
- Pending: 40
- Connectivity Rate: ~2%

If results don't match, check:
- is_active = true in user_profiles
- No duplicate emails with different cases
- assessment_month matches current month format (YYYY-MM)
*/
