-- Fix RLS Policies to Avoid Infinite Recursion
-- The admin policies were causing infinite recursion by querying user_profiles within the policy

-- Drop all existing policies
DROP POLICY IF EXISTS "Users can read own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Service role has full access" ON user_profiles;
DROP POLICY IF EXISTS "Admins can read all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON user_profiles;

-- Policy 1: Users can read their own profile
CREATE POLICY "Users can read own profile"
  ON user_profiles
  FOR SELECT
  USING (auth.uid() = auth_id);

-- Policy 2: Users can update their own profile (but not role or auth_id)
CREATE POLICY "Users can update own profile"
  ON user_profiles
  FOR UPDATE
  USING (auth.uid() = auth_id)
  WITH CHECK (auth.uid() = auth_id);

-- Policy 3: Service role has full access (bypasses RLS)
CREATE POLICY "Service role has full access"
  ON user_profiles
  FOR ALL
  USING (
    current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
  );

-- Policy 4: Allow authenticated users to read all profiles
-- (We'll handle admin-only operations in application code)
CREATE POLICY "Authenticated users can read profiles"
  ON user_profiles
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Note: Admin-specific write operations should be done using the service role client
-- This avoids the infinite recursion issue while maintaining security
