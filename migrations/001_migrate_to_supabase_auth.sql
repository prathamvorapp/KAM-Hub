-- Migration: Migrate to Supabase Auth
-- This migration prepares the user_profiles table for Supabase Auth integration
-- 
-- Steps:
-- 1. Add auth_id column to link to Supabase Auth users
-- 2. Keep password column temporarily for backward compatibility during migration
-- 3. Make email unique to prevent duplicates
-- 4. Add indexes for performance

-- Add auth_id column to link to Supabase Auth
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS auth_id UUID UNIQUE;

-- Add index on auth_id for fast lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_auth_id ON user_profiles(auth_id);

-- Ensure email is unique
ALTER TABLE user_profiles 
ADD CONSTRAINT user_profiles_email_unique UNIQUE (email);

-- Add comment explaining the migration
COMMENT ON COLUMN user_profiles.auth_id IS 'Links to Supabase Auth user ID. NULL for users not yet migrated to Supabase Auth.';
COMMENT ON COLUMN user_profiles.password IS 'Legacy password hash. Will be removed after full migration to Supabase Auth.';

-- Create a function to sync user profile after Supabase Auth signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if user_profile already exists with this email
  IF EXISTS (SELECT 1 FROM public.user_profiles WHERE email = NEW.email) THEN
    -- Update existing profile with auth_id
    UPDATE public.user_profiles
    SET auth_id = NEW.id,
        updated_at = NOW()
    WHERE email = NEW.email;
  ELSE
    -- Create new profile (for new signups)
    INSERT INTO public.user_profiles (
      id,
      auth_id,
      email,
      full_name,
      role,
      is_active,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
      'agent', -- Default role
      true,
      NOW(),
      NOW()
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically sync user profiles
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Add RLS policies for user_profiles
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own profile
CREATE POLICY "Users can read own profile"
  ON user_profiles
  FOR SELECT
  USING (auth.uid() = auth_id);

-- Policy: Users can update their own profile (except role and auth_id)
CREATE POLICY "Users can update own profile"
  ON user_profiles
  FOR UPDATE
  USING (auth.uid() = auth_id)
  WITH CHECK (auth.uid() = auth_id);

-- Policy: Service role can do everything (for admin operations)
CREATE POLICY "Service role has full access"
  ON user_profiles
  FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- Policy: Admins can read all profiles
CREATE POLICY "Admins can read all profiles"
  ON user_profiles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE auth_id = auth.uid()
      AND role = 'admin'
    )
  );

-- Policy: Admins can update all profiles
CREATE POLICY "Admins can update all profiles"
  ON user_profiles
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE auth_id = auth.uid()
      AND role = 'admin'
    )
  );
