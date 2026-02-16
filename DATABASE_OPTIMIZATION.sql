-- Database Optimization for Supabase
-- Run these commands in your Supabase SQL Editor to optimize performance

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- User Profiles Indexes
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);
CREATE INDEX IF NOT EXISTS idx_user_profiles_team_name ON user_profiles(team_name);
CREATE INDEX IF NOT EXISTS idx_user_pr