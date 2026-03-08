-- Quick Debug Queries for "Demo" Brand Issue
-- Run these in Supabase SQL Editor

-- 1. Check if "Demo" brand exists in database
SELECT 
    id,
    brand_name,
    kam_email_id,
    kam_name,
    zone
FROM master_data 
WHERE brand_name ILIKE '%Demo%'
ORDER BY brand_name;

-- 2. Check your user profile (replace with your email)
SELECT 
    email,
    role,
    team_name,
    full_name,
    is_active
FROM user_profiles 
WHERE email = 'your-email@example.com';  -- REPLACE THIS

-- 3. Check if Demo brand is assigned to you (for Agents)
SELECT 
    md.brand_name,
    md.kam_email_id,
    md.kam_name,
    md.zone
FROM master_data md
WHERE md.brand_name ILIKE '%Demo%'
AND md.kam_email_id = 'your-email@example.com';  -- REPLACE THIS

-- 4. Check if Demo brand is in your team (for Team Leads)
SELECT 
    md.brand_name,
    md.kam_email_id,
    md.kam_name,
    up.team_name,
    up.role
FROM master_data md
JOIN user_profiles up ON md.kam_email_id = up.email
WHERE md.brand_name ILIKE '%Demo%'
AND up.team_name = 'Your Team Name';  -- REPLACE THIS

-- 5. Count total brands in system
SELECT COUNT(*) as total_brands FROM master_data;

-- 6. Count brands assigned to you
SELECT COUNT(*) as my_brands 
FROM master_data 
WHERE kam_email_id = 'your-email@example.com';  -- REPLACE THIS

-- 7. Check all brands with "Demo" in any field
SELECT 
    brand_name,
    kam_email_id,
    kam_name,
    brand_email_id,
    zone
FROM master_data 
WHERE 
    brand_name ILIKE '%Demo%' OR
    kam_name ILIKE '%Demo%' OR
    kam_email_id ILIKE '%Demo%' OR
    brand_email_id ILIKE '%Demo%';
