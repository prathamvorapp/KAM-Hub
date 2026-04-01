-- Migration: Engagement Calls Feature
-- Monthly call tracking per brand, reset at start of each month
-- Admin defines topic + purpose (Upsell / Awareness)
-- Agents mark calls as done with description and next step

-- Table: engagement_call_config (admin sets topic/purpose per month)
CREATE TABLE IF NOT EXISTS engagement_call_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  month VARCHAR(7) NOT NULL, -- YYYY-MM format
  topic TEXT NOT NULL,
  purpose VARCHAR(20) NOT NULL CHECK (purpose IN ('Upsell', 'Awareness')),
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(month)
);

-- Table: engagement_calls (one record per brand per month)
CREATE TABLE IF NOT EXISTS engagement_calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  month VARCHAR(7) NOT NULL, -- YYYY-MM format
  brand_name TEXT NOT NULL,
  brand_id UUID,
  kam_email TEXT NOT NULL,
  kam_name TEXT,
  team_name TEXT,
  zone TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'done')),
  description TEXT,
  next_step VARCHAR(10) CHECK (next_step IN ('yes', 'no')),
  next_step_description TEXT,
  called_at TIMESTAMPTZ,
  actioned_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(month, brand_name, kam_email)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_engagement_calls_month ON engagement_calls(month);
CREATE INDEX IF NOT EXISTS idx_engagement_calls_kam_email ON engagement_calls(kam_email);
CREATE INDEX IF NOT EXISTS idx_engagement_calls_status ON engagement_calls(status);
CREATE INDEX IF NOT EXISTS idx_engagement_call_config_month ON engagement_call_config(month);

-- RLS
ALTER TABLE engagement_calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE engagement_call_config ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read/write (service role bypasses RLS)
CREATE POLICY "Allow authenticated read engagement_calls"
  ON engagement_calls FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Allow authenticated insert engagement_calls"
  ON engagement_calls FOR INSERT
  TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated update engagement_calls"
  ON engagement_calls FOR UPDATE
  TO authenticated USING (true);

CREATE POLICY "Allow authenticated read engagement_call_config"
  ON engagement_call_config FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Allow authenticated write engagement_call_config"
  ON engagement_call_config FOR ALL
  TO authenticated USING (true);
