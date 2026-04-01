-- Migration: Escalation Tracker
-- KAMs raise escalations for brands; Team Leads evaluate responsibility and nature.
-- Designed to support future Brand Journey page (Red/Orange/Amber duration tracking).

CREATE TABLE IF NOT EXISTS escalations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Brand info (snapshot at time of creation, preserved after transfers)
  brand_name TEXT NOT NULL,
  brand_id UUID,

  -- KAM who raised the escalation
  kam_email TEXT NOT NULL,
  kam_name TEXT,
  team_name TEXT,
  zone TEXT,

  -- Escalation details
  classification TEXT NOT NULL CHECK (classification IN (
    'POS Config',
    'Menu Management',
    'Inventory Management',
    'MP Service',
    'Payroll',
    'Task',
    'Report',
    'Purchase',
    'Payment/EDC Issue',
    'Renewal & Retention',
    'Training & Development',
    'Development',
    'Integration',
    'Embedded Finance'
  )),
  description TEXT NOT NULL,

  -- Brand nature (set by KAM, can be updated by Team Lead)
  brand_nature TEXT CHECK (brand_nature IN ('Red', 'Orange', 'Amber')),

  -- Responsibility evaluation (set by Team Lead)
  responsible_party TEXT CHECK (responsible_party IN ('Brand', 'KAM')),

  -- Status lifecycle
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  closed_at TIMESTAMPTZ,
  closed_by TEXT,

  -- Audit
  raised_by TEXT NOT NULL,  -- email of who created it
  actioned_by TEXT,         -- last editor
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_escalations_brand_name ON escalations(brand_name);
CREATE INDEX IF NOT EXISTS idx_escalations_kam_email ON escalations(kam_email);
CREATE INDEX IF NOT EXISTS idx_escalations_status ON escalations(status);
CREATE INDEX IF NOT EXISTS idx_escalations_brand_nature ON escalations(brand_nature);
CREATE INDEX IF NOT EXISTS idx_escalations_created_at ON escalations(created_at);
CREATE INDEX IF NOT EXISTS idx_escalations_team_name ON escalations(team_name);

-- RLS
ALTER TABLE escalations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated read escalations"
  ON escalations FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated insert escalations"
  ON escalations FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated update escalations"
  ON escalations FOR UPDATE
  TO authenticated
  USING (true);
