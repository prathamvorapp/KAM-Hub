-- Migration: Add auth_id column to user_profiles
-- Simple version without password column references

-- Step 1: Add auth_id column
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS auth_id UUID;

-- Step 2: Add unique constraint on auth_id
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'user_profiles_auth_id_unique'
  ) THEN
    ALTER TABLE user_profiles ADD CONSTRAINT user_profiles_auth_id_unique UNIQUE (auth_id);
  END IF;
END $$;

-- Step 3: Add index for performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_auth_id ON user_profiles(auth_id);

-- Step 4: Add comment
COMMENT ON COLUMN user_profiles.auth_id IS 'Links to Supabase Auth user ID (auth.users.id)';

-- Step 5: Create function to sync new auth users
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
    -- Create new profile for new signups
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
      'agent',
      true,
      NOW(),
      NOW()
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 6: Create trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Step 7: Enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Step 8: Drop existing policies (if any)
DROP POLICY IF EXISTS "Users can read own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Service role has full access" ON user_profiles;
DROP POLICY IF EXISTS "Admins can read all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON user_profiles;

-- Step 9: Create RLS policies

-- Users can read their own profile
CREATE POLICY "Users can read own profile"
  ON user_profiles
  FOR SELECT
  USING (auth.uid() = auth_id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON user_profiles
  FOR UPDATE
  USING (auth.uid() = auth_id)
  WITH CHECK (auth.uid() = auth_id);

-- Service role has full access
CREATE POLICY "Service role has full access"
  ON user_profiles
  FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- Admins can read all profiles
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

-- Admins can update all profiles
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

-- Done! Now run: npm run migrate:link-auth
