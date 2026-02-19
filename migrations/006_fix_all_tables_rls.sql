-- Fix RLS Policies for all tables with RLS enabled
-- This migration ensures all tables have proper RLS policies

-- =====================================================
-- MASTER_DATA TABLE
-- =====================================================

DROP POLICY IF EXISTS "Service role has full access to master_data" ON master_data;
DROP POLICY IF EXISTS "Authenticated users can read master_data" ON master_data;
DROP POLICY IF EXISTS "Authenticated users can insert master_data" ON master_data;
DROP POLICY IF EXISTS "Authenticated users can update master_data" ON master_data;
DROP POLICY IF EXISTS "Authenticated users can delete master_data" ON master_data;

CREATE POLICY "Service role has full access to master_data"
  ON master_data FOR ALL
  USING (current_setting('request.jwt.claims', true)::json->>'role' = 'service_role');

CREATE POLICY "Authenticated users can read master_data"
  ON master_data FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert master_data"
  ON master_data FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update master_data"
  ON master_data FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete master_data"
  ON master_data FOR DELETE
  USING (auth.role() = 'authenticated');

-- =====================================================
-- VISITS TABLE
-- =====================================================

DROP POLICY IF EXISTS "Service role has full access to visits" ON visits;
DROP POLICY IF EXISTS "Authenticated users can read visits" ON visits;
DROP POLICY IF EXISTS "Authenticated users can insert visits" ON visits;
DROP POLICY IF EXISTS "Authenticated users can update visits" ON visits;
DROP POLICY IF EXISTS "Authenticated users can delete visits" ON visits;

CREATE POLICY "Service role has full access to visits"
  ON visits FOR ALL
  USING (current_setting('request.jwt.claims', true)::json->>'role' = 'service_role');

CREATE POLICY "Authenticated users can read visits"
  ON visits FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert visits"
  ON visits FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update visits"
  ON visits FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete visits"
  ON visits FOR DELETE
  USING (auth.role() = 'authenticated');

-- =====================================================
-- DEMOS TABLE
-- =====================================================

DROP POLICY IF EXISTS "Service role has full access to demos" ON demos;
DROP POLICY IF EXISTS "Authenticated users can read demos" ON demos;
DROP POLICY IF EXISTS "Authenticated users can insert demos" ON demos;
DROP POLICY IF EXISTS "Authenticated users can update demos" ON demos;
DROP POLICY IF EXISTS "Authenticated users can delete demos" ON demos;

CREATE POLICY "Service role has full access to demos"
  ON demos FOR ALL
  USING (current_setting('request.jwt.claims', true)::json->>'role' = 'service_role');

CREATE POLICY "Authenticated users can read demos"
  ON demos FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert demos"
  ON demos FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update demos"
  ON demos FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete demos"
  ON demos FOR DELETE
  USING (auth.role() = 'authenticated');

-- =====================================================
-- HEALTH_CHECKS TABLE
-- =====================================================

DROP POLICY IF EXISTS "Service role has full access to health_checks" ON health_checks;
DROP POLICY IF EXISTS "Authenticated users can read health_checks" ON health_checks;
DROP POLICY IF EXISTS "Authenticated users can insert health_checks" ON health_checks;
DROP POLICY IF EXISTS "Authenticated users can update health_checks" ON health_checks;
DROP POLICY IF EXISTS "Authenticated users can delete health_checks" ON health_checks;

CREATE POLICY "Service role has full access to health_checks"
  ON health_checks FOR ALL
  USING (current_setting('request.jwt.claims', true)::json->>'role' = 'service_role');

CREATE POLICY "Authenticated users can read health_checks"
  ON health_checks FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert health_checks"
  ON health_checks FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update health_checks"
  ON health_checks FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete health_checks"
  ON health_checks FOR DELETE
  USING (auth.role() = 'authenticated');

-- =====================================================
-- MOM TABLE
-- =====================================================

DROP POLICY IF EXISTS "Service role has full access to mom" ON mom;
DROP POLICY IF EXISTS "Authenticated users can read mom" ON mom;
DROP POLICY IF EXISTS "Authenticated users can insert mom" ON mom;
DROP POLICY IF EXISTS "Authenticated users can update mom" ON mom;
DROP POLICY IF EXISTS "Authenticated users can delete mom" ON mom;

CREATE POLICY "Service role has full access to mom"
  ON mom FOR ALL
  USING (current_setting('request.jwt.claims', true)::json->>'role' = 'service_role');

CREATE POLICY "Authenticated users can read mom"
  ON mom FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert mom"
  ON mom FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update mom"
  ON mom FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete mom"
  ON mom FOR DELETE
  USING (auth.role() = 'authenticated');

-- =====================================================
-- NOTIFICATION_PREFERENCES TABLE
-- =====================================================

DROP POLICY IF EXISTS "Service role has full access to notification_preferences" ON notification_preferences;
DROP POLICY IF EXISTS "Authenticated users can read notification_preferences" ON notification_preferences;
DROP POLICY IF EXISTS "Authenticated users can insert notification_preferences" ON notification_preferences;
DROP POLICY IF EXISTS "Authenticated users can update notification_preferences" ON notification_preferences;
DROP POLICY IF EXISTS "Authenticated users can delete notification_preferences" ON notification_preferences;

CREATE POLICY "Service role has full access to notification_preferences"
  ON notification_preferences FOR ALL
  USING (current_setting('request.jwt.claims', true)::json->>'role' = 'service_role');

CREATE POLICY "Authenticated users can read notification_preferences"
  ON notification_preferences FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert notification_preferences"
  ON notification_preferences FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update notification_preferences"
  ON notification_preferences FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete notification_preferences"
  ON notification_preferences FOR DELETE
  USING (auth.role() = 'authenticated');

-- =====================================================
-- NOTIFICATION_LOG TABLE
-- =====================================================

DROP POLICY IF EXISTS "Service role has full access to notification_log" ON notification_log;
DROP POLICY IF EXISTS "Authenticated users can read notification_log" ON notification_log;
DROP POLICY IF EXISTS "Authenticated users can insert notification_log" ON notification_log;
DROP POLICY IF EXISTS "Authenticated users can update notification_log" ON notification_log;
DROP POLICY IF EXISTS "Authenticated users can delete notification_log" ON notification_log;

CREATE POLICY "Service role has full access to notification_log"
  ON notification_log FOR ALL
  USING (current_setting('request.jwt.claims', true)::json->>'role' = 'service_role');

CREATE POLICY "Authenticated users can read notification_log"
  ON notification_log FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert notification_log"
  ON notification_log FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update notification_log"
  ON notification_log FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete notification_log"
  ON notification_log FOR DELETE
  USING (auth.role() = 'authenticated');

-- =====================================================
-- VERIFY ALL POLICIES
-- =====================================================

SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies 
WHERE tablename IN (
  'master_data',
  'churn_records',
  'visits',
  'demos',
  'health_checks',
  'mom',
  'notification_preferences',
  'notification_log'
)
ORDER BY tablename, policyname;
