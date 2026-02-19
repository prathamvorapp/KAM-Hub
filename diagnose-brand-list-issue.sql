-- Diagnose Why 49 Brands Are Not Showing in the List
-- Agent: jinal.chavda@petpooja.com
-- Month: 2026-02

-- ============================================
-- STEP 1: Check total brands for agent
-- ============================================
SELECT 
    '1. Total Brands in master_data' as check_step,
    COUNT(*) as count
FROM master_data
WHERE kam_email_id = 'jinal.chavda@petpooja.com';

-- ============================================
-- STEP 2: Check assessed brands this month
-- ============================================
SELECT 
    '2. Assessed Brands in health_checks' as check_step,
    COUNT(*) as count
FROM health_checks
WHERE kam_email = 'jinal.chavda@petpooja.com'
  AND assessment_month = '2026-02';

-- ============================================
-- STEP 3: List the assessed brand (should be 1)
-- ============================================
SELECT 
    '3. Assessed Brand Details' as check_step,
    brand_name,
    health_status,
    assessment_date
FROM health_checks
WHERE kam_email = 'jinal.chavda@petpooja.com'
  AND assessment_month = '2026-02';

-- ============================================
-- STEP 4: Check for exact brand name match
-- ============================================
-- This checks if the assessed brand name exists in master_data
SELECT 
    '4. Brand Name Match Check' as check_step,
    hc.brand_name as assessed_brand,
    CASE 
        WHEN md.brand_name IS NOT NULL THEN 'MATCH FOUND'
        ELSE 'NO MATCH - NAME MISMATCH'
    END as match_status
FROM health_checks hc
LEFT JOIN master_data md ON md.brand_name = hc.brand_name 
    AND md.kam_email_id = 'jinal.chavda@petpooja.com'
WHERE hc.kam_email = 'jinal.chavda@petpooja.com'
  AND hc.assessment_month = '2026-02';

-- ============================================
-- STEP 5: Check for case sensitivity issues
-- ============================================
SELECT 
    '5. Case Sensitivity Check' as check_step,
    hc.brand_name as assessed_brand,
    md.brand_name as master_brand,
    CASE 
        WHEN LOWER(md.brand_name) = LOWER(hc.brand_name) THEN 'CASE INSENSITIVE MATCH'
        ELSE 'NO MATCH'
    END as match_status
FROM health_checks hc
LEFT JOIN master_data md ON LOWER(md.brand_name) = LOWER(hc.brand_name)
    AND md.kam_email_id = 'jinal.chavda@petpooja.com'
WHERE hc.kam_email = 'jinal.chavda@petpooja.com'
  AND hc.assessment_month = '2026-02';

-- ============================================
-- STEP 6: Check for whitespace issues
-- ============================================
SELECT 
    '6. Whitespace Check' as check_step,
    hc.brand_name as assessed_brand,
    LENGTH(hc.brand_name) as assessed_length,
    md.brand_name as master_brand,
    LENGTH(md.brand_name) as master_length,
    CASE 
        WHEN TRIM(md.brand_name) = TRIM(hc.brand_name) THEN 'MATCH AFTER TRIM'
        ELSE 'NO MATCH'
    END as match_status
FROM health_checks hc
LEFT JOIN master_data md ON TRIM(md.brand_name) = TRIM(hc.brand_name)
    AND md.kam_email_id = 'jinal.chavda@petpooja.com'
WHERE hc.kam_email = 'jinal.chavda@petpooja.com'
  AND hc.assessment_month = '2026-02';

-- ============================================
-- STEP 7: List all 50 brands from master_data
-- ============================================
SELECT 
    '7. All Brands in master_data' as check_step,
    brand_name,
    zone,
    brand_state
FROM master_data
WHERE kam_email_id = 'jinal.chavda@petpooja.com'
ORDER BY brand_name;

-- ============================================
-- STEP 8: Calculate pending brands manually
-- ============================================
-- This simulates what the backend does
SELECT 
    '8. Pending Brands (Manual Calculation)' as check_step,
    md.brand_name,
    md.zone,
    md.brand_state,
    CASE 
        WHEN hc.brand_name IS NULL THEN 'PENDING'
        ELSE 'ASSESSED'
    END as status
FROM master_data md
LEFT JOIN health_checks hc ON hc.brand_name = md.brand_name
    AND hc.kam_email = 'jinal.chavda@petpooja.com'
    AND hc.assessment_month = '2026-02'
WHERE md.kam_email_id = 'jinal.chavda@petpooja.com'
ORDER BY status, md.brand_name;

-- ============================================
-- STEP 9: Count pending brands
-- ============================================
SELECT 
    '9. Pending Brand Count' as check_step,
    COUNT(*) as pending_count
FROM master_data md
LEFT JOIN health_checks hc ON hc.brand_name = md.brand_name
    AND hc.kam_email = 'jinal.chavda@petpooja.com'
    AND hc.assessment_month = '2026-02'
WHERE md.kam_email_id = 'jinal.chavda@petpooja.com'
  AND hc.brand_name IS NULL;

-- ============================================
-- STEP 10: Check for duplicate brand names
-- ============================================
SELECT 
    '10. Duplicate Brand Names' as check_step,
    brand_name,
    COUNT(*) as duplicate_count
FROM master_data
WHERE kam_email_id = 'jinal.chavda@petpooja.com'
GROUP BY brand_name
HAVING COUNT(*) > 1;

-- ============================================
-- DIAGNOSIS GUIDE
-- ============================================
-- If STEP 4 shows "NO MATCH":
--   → Brand name in health_checks doesn't match master_data
--   → Check STEP 5 for case sensitivity
--   → Check STEP 6 for whitespace issues
--
-- If STEP 9 shows 49 but frontend shows 0:
--   → Backend is working correctly
--   → Issue is in frontend rendering or API response
--   → Check browser console for errors
--   → Check network tab for API response
--
-- If STEP 10 shows duplicates:
--   → Remove duplicate brands from master_data
-- ============================================
