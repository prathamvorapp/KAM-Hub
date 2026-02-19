-- Quick fix for user profile issues
-- Run this in Supabase SQL Editor

-- Step 1: Check if user exists
SELECT 
  auth_id,
  email,
  full_name,
  role,
  team_name,
  is_active,
  created_at
FROM user_profiles
WHERE email = 'pratham.vora@petpooja.com';

-- Step 2: If user doesn't exist, create it
-- Replace the auth_id with the one from your logs: 3d9bc87a-32fe-450a-b0db-737c001256ad
INSERT INTO user_profiles (
  auth_id,
  email,
  full_name,
  role,
  team_name,
  is_active
) VALUES (
  '3d9bc87a-32fe-450a-b0db-737c001256ad',
  'pratham.vora@petpooja.com',
  'Pratham Vora',
  'agent',  -- Change to 'team_lead' or 'admin' if needed
  NULL,     -- Change to team name if needed
  true
)
ON CONFLICT (email) DO UPDATE
SET 
  auth_id = EXCLUDED.auth_id,
  is_active = true;

-- Step 3: Verify the user was created/updated
SELECT 
  auth_id,
  email,
  full_name,
  role,
  team_name,
  is_active
FROM user_profiles
WHERE email = 'pratham.vora@petpooja.com';

-- Step 4: Fix RLS policies
DROP POLICY IF EXISTS "Users can read own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can read their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON user_profiles;

CREATE POLICY "Users can read own profile"
ON user_profiles
FOR SELECT
TO authenticated
USING (auth_id = auth.uid());

CREATE POLICY "Users can read profile by email"
ON user_profiles
FOR SELECT
TO authenticated
USING (email = auth.jwt() ->> 'email');

-- Step 5: Ensure RLS is enabled
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Step 6: Grant permissions
GRANT SELECT ON user_profiles TO authenticated;
GRANT SELECT ON user_profiles TO anon;

-- Step 7: Verify policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'user_profiles';
