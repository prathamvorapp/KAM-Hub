-- Migration: Escalation Enhancements (idempotent/safe re-run)

-- 1. Add new columns to escalations (safe)
ALTER TABLE escalations
  ADD COLUMN IF NOT EXISTS close_reason TEXT,
  ADD COLUMN IF NOT EXISTS team_lead_remark TEXT,
  ADD COLUMN IF NOT EXISTS team_lead_remark_updated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS team_lead_remark_updated_by TEXT,
  ADD COLUMN IF NOT EXISTS resolution_days INTEGER;

-- 2. Escalation change logs
CREATE TABLE IF NOT EXISTS escalation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  escalation_id UUID NOT NULL REFERENCES escalations(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  changed_by TEXT NOT NULL,
  changed_by_name TEXT,
  changed_fields JSONB,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_escalation_logs_escalation_id ON escalation_logs(escalation_id);
CREATE INDEX IF NOT EXISTS idx_escalation_logs_created_at ON escalation_logs(created_at);

-- 3. In-app notifications
CREATE TABLE IF NOT EXISTS escalation_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  escalation_id UUID NOT NULL REFERENCES escalations(id) ON DELETE CASCADE,
  recipient_email TEXT NOT NULL,
  type TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_escalation_notif_recipient ON escalation_notifications(recipient_email, is_read);
CREATE INDEX IF NOT EXISTS idx_escalation_notif_escalation ON escalation_notifications(escalation_id);

-- 4. RLS (drop first to avoid duplicate errors)
ALTER TABLE escalation_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated read escalation_logs" ON escalation_logs;
DROP POLICY IF EXISTS "Allow authenticated insert escalation_logs" ON escalation_logs;
CREATE POLICY "Allow authenticated read escalation_logs" ON escalation_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated insert escalation_logs" ON escalation_logs FOR INSERT TO authenticated WITH CHECK (true);

ALTER TABLE escalation_notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated read escalation_notifications" ON escalation_notifications;
DROP POLICY IF EXISTS "Allow authenticated insert escalation_notifications" ON escalation_notifications;
DROP POLICY IF EXISTS "Allow authenticated update escalation_notifications" ON escalation_notifications;
CREATE POLICY "Allow authenticated read escalation_notifications" ON escalation_notifications FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated insert escalation_notifications" ON escalation_notifications FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update escalation_notifications" ON escalation_notifications FOR UPDATE TO authenticated USING (true);

-- 5. responsible_party constraint update
ALTER TABLE escalations DROP CONSTRAINT IF EXISTS escalations_responsible_party_check;
ALTER TABLE escalations ADD CONSTRAINT escalations_responsible_party_check
  CHECK (responsible_party IN ('Brand', 'KAM', 'Another Department'));
