-- Fix RLS policies for user_profiles table to ensure users can read their own profile

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can read own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can read their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON user_profiles;

-- Create a simple policy that allows users to read their own profile
CREATE POLICY "Users can read own profile"
ON user_profiles
FOR SELECT
TO authenticated
USING (auth_id = auth.uid());

-- Also allow reading by email for backward compatibility
CREATE POLICY "Users can read profile by email"
ON user_profiles
FOR SELECT
TO authenticated
USING (email = auth.jwt() ->> 'email');

-- Ensure RLS is enabled
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Grant necessary permissions
GRANT SELECT ON user_profiles TO authenticated;
GRANT SELECT ON user_profiles TO anon;
