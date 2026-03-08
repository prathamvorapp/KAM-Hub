-- ============================================
-- STEP 1: Check if "Demo" brand exists at all
-- ============================================
SELECT 
    id,
    brand_name,
    kam_email_id,
    kam_name,
    zone
FROM master_data 
WHERE brand_name ILIKE '%Demo%'
ORDER BY brand_name;

-- Expected: Should return at least 1 row if brand exists
-- If NO ROWS: The brand doesn't exist in database
-- If ROWS: Note the kam_email_id - that's who it's assigned to


-- ============================================
-- STEP 2: Check YOUR user profile
-- ============================================
-- REPLACE 'your-email@example.com' with your actual email
SELECT 
    email,
    role,
    team_name,
    full_name,
    is_active
FROM user_profiles 
WHERE email = 'your-email@example.com';

-- Expected: Should return 1 row with your details
-- Note your ROLE (Agent, Team Lead, or Admin)
-- Note your TEAM_NAME if you're a Team Lead


-- ============================================
-- STEP 3: Check if Demo is assigned to YOU
-- ============================================
-- REPLACE 'your-email@example.com' with your actual email
SELECT 
    md.brand_name,
    md.kam_email_id,
    md.kam_name,
    md.zone,
    'This brand IS assigned to you' as status
FROM master_data md
WHERE md.brand_name ILIKE '%Demo%'
AND md.kam_email_id = 'your-email@example.com';

-- Expected for AGENTS: Should return 1 row if brand is yours
-- If NO ROWS: Brand is not assigned to you (assigned to someone else)


-- ============================================
-- STEP 4: If you're a TEAM LEAD - check team
-- ============================================
-- REPLACE 'Your Team Name' with your actual team name from Step 2
SELECT 
    md.brand_name,
    md.kam_email_id as assigned_to_email,
    md.kam_name as assigned_to_name,
    up.team_name,
    up.role as assignee_role
FROM master_data md
JOIN user_profiles up ON md.kam_email_id = up.email
WHERE md.brand_name ILIKE '%Demo%'
AND up.team_name = 'Your Team Name';

-- Expected for TEAM LEADS: Should return rows if brand is assigned to your team
-- If NO ROWS: Brand is not assigned to anyone in your team


-- ============================================
-- STEP 5: See ALL brands (Admin view)
-- ============================================
-- This shows who the Demo brand is actually assigned to
SELECT 
    md.brand_name,
    md.kam_email_id as assigned_to,
    md.kam_name,
    up.role as assignee_role,
    up.team_name as assignee_team,
    up.is_active as assignee_active
FROM master_data md
LEFT JOIN user_profiles up ON md.kam_email_id = up.email
WHERE md.brand_name ILIKE '%Demo%'
ORDER BY md.brand_name;

-- This shows who Demo is assigned to and their details
