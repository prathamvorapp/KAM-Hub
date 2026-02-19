-- Quick Diagnostic for Agent Health Check Issue
-- Agent: jinal.chavda@petpooja.com
-- Date: 2026-02

-- ============================================
-- STEP 1: Check if agent exists and is active
-- ============================================
SELECT 
    '1. Agent Profile' as check_step,
    email,
    full_name,
    role,
    team_name,
    is_active
FROM user_profiles
WHERE email = 'jinal.chavda@petpooja.com';

-- ============================================
-- STEP 2: Check brands assigned to this agent
-- ============================================
SELECT 
    '2. Brands Assigned' as check_step,
    COUNT(*) as total_brands
FROM master_data
WHERE kam_email_id = 'jinal.chavda@petpooja.com';

-- ============================================
-- STEP 3: List the brands (if any)
-- ============================================
SELECT 
    '3. Brand List' as check_step,
    brand_name,
    zone,
    brand_state,
    outlet_counts
FROM master_data
WHERE kam_email_id = 'jinal.chavda@petpooja.com'
ORDER BY brand_name
LIMIT 10;

-- ============================================
-- STEP 4: Check assessments for Feb 2026
-- ============================================
SELECT 
    '4. Assessments This Month' as check_step,
    COUNT(*) as assessment_count
FROM health_checks
WHERE kam_email = 'jinal.chavda@petpooja.com'
  AND assessment_month = '2026-02';

-- ============================================
-- STEP 5: List the assessments (if any)
-- ============================================
SELECT 
    '5. Assessment Details' as check_step,
    brand_name,
    health_status,
    brand_nature,
    assessment_date
FROM health_checks
WHERE kam_email = 'jinal.chavda@petpooja.com'
  AND assessment_month = '2026-02'
ORDER BY assessment_date DESC;

-- ============================================
-- STEP 6: Check if there are ANY brands in master_data
-- ============================================
SELECT 
    '6. Total Brands in System' as check_step,
    COUNT(*) as total_brands
FROM master_data;

-- ============================================
-- STEP 7: Check brand distribution by agent
-- ============================================
SELECT 
    '7. Brand Distribution' as check_step,
    kam_email_id,
    kam_name,
    COUNT(*) as brand_count
FROM master_data
GROUP BY kam_email_id, kam_name
ORDER BY brand_count DESC
LIMIT 10;

-- ============================================
-- STEP 8: Check for unassigned brands
-- ============================================
SELECT 
    '8. Unassigned Brands' as check_step,
    COUNT(*) as unassigned_count
FROM master_data
WHERE kam_email_id IS NULL 
   OR kam_email_id = ''
   OR TRIM(kam_email_id) = '';

-- ============================================
-- STEP 9: Check for brands assigned to inactive agents
-- ============================================
SELECT 
    '9. Brands with Inactive Agents' as check_step,
    COUNT(*) as count
FROM master_data
WHERE kam_email_id NOT IN (
    SELECT email FROM user_profiles WHERE is_active = true
);

-- ============================================
-- DIAGNOSIS SUMMARY
-- ============================================
-- If STEP 2 shows 0 brands:
--   → Agent has no brands assigned
--   → Solution: Assign brands using fix-agent-brands.sql
--
-- If STEP 2 shows brands but STEP 4 shows same count:
--   → All brands already assessed this month
--   → This is normal, wait for next month or add more brands
--
-- If STEP 8 or STEP 9 shows brands available:
--   → Brands can be reassigned to this agent
--   → Use fix-agent-brands.sql to assign them
-- ============================================
