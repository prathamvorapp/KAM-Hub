-- Migration: Add reset_history column to demos table
-- This column stores the history of all resets performed on a demo

-- Add the reset_history column as JSONB to store array of reset records
ALTER TABLE demos 
ADD COLUMN IF NOT EXISTS reset_history JSONB DEFAULT '[]'::jsonb;

-- Add a comment to document the column
COMMENT ON COLUMN demos.reset_history IS 'Array of reset records containing: reset_at, reset_by, reset_by_role, reason, and previous_state';

-- Create an index for better query performance when filtering by reset history
CREATE INDEX IF NOT EXISTS idx_demos_reset_history ON demos USING GIN (reset_history);

-- Verify the column was added
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'demos' 
  AND column_name = 'reset_history';

-- Example of reset_history structure:
-- [
--   {
--     "reset_at": "2026-03-08T10:50:00.000Z",
--     "reset_by": "admin@example.com",
--     "reset_by_role": "admin",
--     "reason": "Agent entered wrong data",
--     "previous_state": {
--       "current_status": "Converted",
--       "workflow_completed": true,
--       "is_applicable": true,
--       "usage_status": "Demo Pending",
--       "demo_scheduled_date": "2026-03-10",
--       "demo_completed": true,
--       "conversion_status": "Converted"
--     }
--   }
-- ]
