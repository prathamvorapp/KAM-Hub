-- Fix RLS Policies for churn_records table
-- This migration adds comprehensive RLS policies for churn_records

-- Drop existing policies if any
DROP POLICY IF EXISTS "Authenticated users can read churn_records" ON churn_records;
DROP POLICY IF EXISTS "Service role has full access to churn_records" ON churn_records;
DROP POLICY IF EXISTS "Authenticated users can insert churn_records" ON churn_records;
DROP POLICY IF EXISTS "Authenticated users can update churn_records" ON churn_records;
DROP POLICY IF EXISTS "Authenticated users can delete churn_records" ON churn_records;

-- Policy 1: Service role has full access (bypasses RLS)
CREATE POLICY "Service role has full access to churn_records"
  ON churn_records
  FOR ALL
  USING (
    current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
  );

-- Policy 2: Authenticated users can read all churn records
CREATE POLICY "Authenticated users can read churn_records"
  ON churn_records
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Policy 3: Authenticated users can insert churn records
CREATE POLICY "Authenticated users can insert churn_records"
  ON churn_records
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Policy 4: Authenticated users can update churn records
CREATE POLICY "Authenticated users can update churn_records"
  ON churn_records
  FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Policy 5: Authenticated users can delete churn records (admin only in app logic)
CREATE POLICY "Authenticated users can delete churn_records"
  ON churn_records
  FOR DELETE
  USING (auth.role() = 'authenticated');

-- Verify policies are created
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies 
WHERE tablename = 'churn_records'
ORDER BY policyname;
