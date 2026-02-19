-- Health Check Data Verification Script
-- This script checks for common data issues in the health check system

-- 1. Check if the agent has brands assigned in master_data
SELECT 
    'Brands assigned to jinal.chavda@petpooja.com' as check_name,
    COUNT(*) as count
FROM master_data
WHERE kam_email_id = 'jinal.chavda@petpooja.com';

-- 2. Check all agents and their brand counts
SELECT 
    kam_email_id,
    COUNT(*) as brand_count
FROM master_data
GROUP BY kam_email_id
ORDER BY brand_count DESC;

-- 3. Check health checks for February 2026
SELECT 
    kam_email,
    COUNT(*) as assessment_count
FROM health_checks
WHERE assessment_month = '2026-02'
GROUP BY kam_email
ORDER BY assessment_count DESC;

-- 4. Check user profile for the agent
SELECT 
    email,
    full_name,
    role,
    team_name,
    is_active
FROM user_profiles
WHERE email = 'jinal.chavda@petpooja.com';

-- 5. Check if there are any brands without KAM assignment
SELECT 
    COUNT(*) as unassigned_brands
FROM master_data
WHERE kam_email_id IS NULL OR kam_email_id = '';

-- 6. Check team structure
SELECT 
    team_name,
    role,
    COUNT(*) as member_count
FROM user_profiles
WHERE is_active = true
GROUP BY team_name, role
ORDER BY team_name, role;

-- 7. Check for brands that might need reassignment
SELECT 
    brand_name,
    kam_email_id,
    kam_name,
    zone,
    brand_state,
    outlet_counts
FROM master_data
WHERE kam_email_id NOT IN (
    SELECT email FROM user_profiles WHERE is_active = true
)
LIMIT 20;
