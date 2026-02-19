-- Verify user profile was created/updated correctly

-- Check if user exists
SELECT 
  auth_id,
  email,
  full_name,
  role,
  team_name,
  is_active,
  created_at,
  updated_at
FROM user_profiles
WHERE email = 'pratham.vora@petpooja.com';

-- If no results, the user doesn't exist yet
-- If results show, verify:
-- 1. auth_id matches: 3d9bc87a-32fe-450a-b0db-737c001256ad
-- 2. is_active is true
-- 3. role is set correctly

-- Check RLS policies
SELECT 
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'user_profiles'
ORDER BY policyname;

-- Test if user can read their own profile
-- This simulates what happens when the app tries to load the profile
SELECT 
  auth_id,
  email,
  role
FROM user_profiles
WHERE auth_id = '3d9bc87a-32fe-450a-b0db-737c001256ad';
