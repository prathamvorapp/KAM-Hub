-- Migration: Escalation Enhancements
-- Adds: close_reason, team_lead_remark, resolution_days, change logs, in-app notifications

-- 1. Add new columns to escalations
ALTER TABLE escalations
  ADD COLUMN IF NOT EXISTS close_reason TEXT,
  ADD COLUMN IF NOT EXISTS team_lead_remark TEXT,
  ADD COLUMN IF NOT EXISTS team_lead_remark_updated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS team_lead_remark_updated_by TEXT,
  ADD COLUMN IF NOT EXISTS resolution_days INTEGER; -- NULL = open, 0 = same day, else days

-- 2. Escalation change logs
CREATE TABLE IF NOT EXISTS escalation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  escalation_id UUID NOT NULL REFERENCES escalations(id) ON DELETE CASCADE,
  action TEXT NOT NULL,           -- 'created' | 'updated' | 'closed' | 'remark_updated'
  changed_by TEXT NOT NULL,       -- email
  changed_by_name TEXT,
  changed_fields JSONB,           -- { field: { from, to } }
  note TEXT,                      -- human-readable summary
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_escalation_logs_escalation_id ON escalation_logs(escalation_id);
CREATE INDEX IF NOT EXISTS idx_escalation_logs_created_at ON escalation_logs(created_at);

-- 3. In-app notifications for escalations
CREATE TABLE IF NOT EXISTS escalation_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  escalation_id UUID NOT NULL REFERENCES escalations(id) ON DELETE CASCADE,
  recipient_email TEXT NOT NULL,
  type TEXT NOT NULL,             -- 'raised' | 'closed' | 'remark_updated'
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_escalation_notif_recipient ON escalation_notifications(recipient_email, is_read);
CREATE INDEX IF NOT EXISTS idx_escalation_notif_escalation ON escalation_notifications(escalation_id);

-- RLS
ALTER TABLE escalation_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated read escalation_logs"
  ON escalation_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated insert escalation_logs"
  ON escalation_logs FOR INSERT TO authenticated WITH CHECK (true);

ALTER TABLE escalation_notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated read escalation_notifications"
  ON escalation_notifications FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated insert escalation_notifications"
  ON escalation_notifications FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update escalation_notifications"
  ON escalation_notifications FOR UPDATE TO authenticated USING (true);

-- Add 'Another Department' to responsible_party constraint
ALTER TABLE escalations DROP CONSTRAINT IF EXISTS escalations_responsible_party_check;
ALTER TABLE escalations ADD CONSTRAINT escalations_responsible_party_check
  CHECK (responsible_party IN ('Brand', 'KAM', 'Another Department'));
