-- =====================================================
-- Supabase PostgreSQL Schema Migration from Convex
-- =====================================================
-- Project ID: qvgnrdarwsnweizifech
-- Generated: 2026-02-12
-- 
-- This schema maintains the exact structure from Convex
-- with optimized PostgreSQL features:
-- - Foreign keys for referential integrity
-- - Indexes for query performance
-- - Proper data types
-- - Constraints for data validation
-- =====================================================

-- Enable UUID extension for ID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- TABLE: user_profiles
-- Core user authentication and profile management
-- =====================================================
CREATE TABLE user_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    password TEXT, -- Hashed password
    role TEXT NOT NULL CHECK (role IN ('admin', 'team_lead', 'agent')),
    team_name TEXT,
    contact_number TEXT,
    employee_code TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for user_profiles
CREATE INDEX idx_user_profiles_email ON user_profiles(email);
CREATE INDEX idx_user_profiles_role ON user_profiles(role);
CREATE INDEX idx_user_profiles_team_name ON user_profiles(team_name);
CREATE INDEX idx_user_profiles_is_active ON user_profiles(is_active);

COMMENT ON TABLE user_profiles IS 'User authentication and profile management';
COMMENT ON COLUMN user_profiles.role IS 'User role: admin, team_lead, or agent';

-- =====================================================
-- TABLE: Master_Data
-- Restaurant/Business master data from Google Sheets
-- =====================================================
CREATE TABLE master_data (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    brand_name TEXT NOT NULL,
    brand_email_id TEXT,
    kam_name TEXT NOT NULL,
    brand_state TEXT NOT NULL,
    zone TEXT NOT NULL,
    kam_name_secondary TEXT,
    kam_email_id TEXT NOT NULL,
    outlet_counts INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for master_data
CREATE INDEX idx_master_data_brand_name ON master_data(brand_name);
CREATE INDEX idx_master_data_kam_name ON master_data(kam_name);
CREATE INDEX idx_master_data_brand_state ON master_data(brand_state);
CREATE INDEX idx_master_data_zone ON master_data(zone);
CREATE INDEX idx_master_data_kam_email_id ON master_data(kam_email_id);

-- Foreign key to user_profiles
CREATE INDEX idx_master_data_kam_email_fk ON master_data(kam_email_id);

COMMENT ON TABLE master_data IS 'Master data for restaurants/brands from Google Sheets';

-- =====================================================
-- TABLE: churn_records
-- Consolidated churn records with follow-up tracking
-- =====================================================
CREATE TABLE churn_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Basic churn data
    date TEXT NOT NULL,
    rid TEXT NOT NULL,
    restaurant_name TEXT NOT NULL,
    brand_name TEXT,
    owner_email TEXT NOT NULL,
    kam TEXT NOT NULL,
    sync_days TEXT NOT NULL,
    zone TEXT NOT NULL,
    controlled_status TEXT NOT NULL,
    churn_reason TEXT,
    remarks TEXT,
    mail_sent_confirmation BOOLEAN,
    date_time_filled TEXT,
    
    -- CSV Upload metadata
    uploaded_by TEXT, -- Email of BO Team member
    uploaded_at TEXT,
    
    -- Follow-up system data
    follow_up_status TEXT CHECK (follow_up_status IN ('ACTIVE', 'INACTIVE', 'COMPLETED')),
    current_call INTEGER CHECK (current_call BETWEEN 1 AND 4),
    is_follow_up_active BOOLEAN,
    mail_sent BOOLEAN,
    next_reminder_time TEXT,
    follow_up_completed_at TEXT,
    
    -- Call attempts data (JSONB array)
    call_attempts JSONB,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for churn_records
CREATE INDEX idx_churn_records_rid ON churn_records(rid);
CREATE INDEX idx_churn_records_kam ON churn_records(kam);
CREATE INDEX idx_churn_records_date ON churn_records(date);
CREATE INDEX idx_churn_records_churn_reason ON churn_records(churn_reason);
CREATE INDEX idx_churn_records_zone ON churn_records(zone);
CREATE INDEX idx_churn_records_follow_up_active ON churn_records(is_follow_up_active);
CREATE INDEX idx_churn_records_follow_up_status ON churn_records(follow_up_status);
CREATE INDEX idx_churn_records_current_call ON churn_records(current_call);

-- Foreign key indexes
CREATE INDEX idx_churn_records_uploaded_by_fk ON churn_records(uploaded_by);

COMMENT ON TABLE churn_records IS 'Consolidated churn records with follow-up and call attempt tracking';
COMMENT ON COLUMN churn_records.call_attempts IS 'Array of call attempt objects with call_number, timestamp, call_response, notes, churn_reason';

-- =====================================================
-- TABLE: visits
-- Visit management and MOM tracking
-- =====================================================
CREATE TABLE visits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    visit_id TEXT NOT NULL UNIQUE,
    brand_id TEXT NOT NULL,
    brand_name TEXT NOT NULL,
    agent_id TEXT NOT NULL,
    agent_name TEXT NOT NULL,
    team_lead_id TEXT,
    team_name TEXT,
    scheduled_date TEXT NOT NULL,
    visit_date TEXT,
    visit_status TEXT NOT NULL CHECK (visit_status IN ('Scheduled', 'Completed', 'Cancelled', 'Pending')),
    
    -- MOM tracking
    mom_shared TEXT CHECK (mom_shared IN ('Yes', 'No', 'Pending')),
    mom_shared_date TEXT,
    
    -- Approval workflow
    approval_status TEXT CHECK (approval_status IN ('Approved', 'Rejected', 'Pending')),
    approved_by TEXT,
    approved_at TEXT,
    rejection_remarks TEXT,
    rejected_by TEXT,
    rejected_at TEXT,
    resubmission_count INTEGER DEFAULT 0,
    resubmitted_at TEXT,
    
    -- Visit details
    visit_year TEXT NOT NULL,
    purpose TEXT,
    outcome TEXT,
    next_steps TEXT,
    duration_minutes TEXT,
    attendees TEXT,
    notes TEXT,
    zone TEXT,
    
    -- Backdated visit fields
    is_backdated BOOLEAN DEFAULT false,
    backdate_reason TEXT,
    backdated_by TEXT,
    backdated_at TEXT,
    
    -- Reschedule tracking
    original_scheduled_date TEXT,
    reschedule_reason TEXT,
    rescheduled_by TEXT,
    rescheduled_at TEXT,
    reschedule_count INTEGER DEFAULT 0,
    last_rescheduled_by TEXT,
    last_rescheduled_at TEXT,
    reschedule_history JSONB,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for visits
CREATE INDEX idx_visits_visit_id ON visits(visit_id);
CREATE INDEX idx_visits_agent_id ON visits(agent_id);
CREATE INDEX idx_visits_brand_name ON visits(brand_name);
CREATE INDEX idx_visits_visit_status ON visits(visit_status);
CREATE INDEX idx_visits_scheduled_date ON visits(scheduled_date);
CREATE INDEX idx_visits_team_name ON visits(team_name);
CREATE INDEX idx_visits_zone ON visits(zone);
CREATE INDEX idx_visits_approval_status ON visits(approval_status);

-- Foreign key indexes
CREATE INDEX idx_visits_approved_by_fk ON visits(approved_by);
CREATE INDEX idx_visits_rejected_by_fk ON visits(rejected_by);

COMMENT ON TABLE visits IS 'Visit management with MOM tracking and approval workflow';
COMMENT ON COLUMN visits.reschedule_history IS 'Array of reschedule events with old_date, new_date, reason, rescheduled_by, rescheduled_at';

-- =====================================================
-- TABLE: demos
-- Product demo management with state-driven workflow
-- =====================================================
CREATE TABLE demos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    demo_id TEXT NOT NULL UNIQUE,
    brand_name TEXT NOT NULL,
    brand_id TEXT NOT NULL,
    product_name TEXT NOT NULL CHECK (product_name IN (
        'Task', 'Purchase', 'Payroll', 'TRM', 'Reputation', 
        'Franchise Module', 'Petpooja Franchise', 'Marketing Automation'
    )),
    agent_id TEXT NOT NULL,
    agent_name TEXT NOT NULL,
    team_name TEXT,
    zone TEXT,
    
    -- Step 1: Product Applicability
    is_applicable BOOLEAN,
    non_applicable_reason TEXT,
    step1_completed_at TEXT,
    
    -- Step 2: Usage Status
    usage_status TEXT CHECK (usage_status IN ('Already Using', 'Demo Pending')),
    step2_completed_at TEXT,
    
    -- Step 3: Demo Scheduling
    demo_scheduled_date TEXT,
    demo_scheduled_time TEXT,
    demo_rescheduled_count INTEGER DEFAULT 0,
    demo_scheduling_history JSONB,
    
    -- Step 4: Demo Completion
    demo_completed BOOLEAN,
    demo_completed_date TEXT,
    demo_conducted_by TEXT CHECK (demo_conducted_by IN ('Agent', 'RM', 'MP Training', 'Product Team')),
    demo_completion_notes TEXT,
    
    -- Step 5: Conversion Decision
    conversion_status TEXT CHECK (conversion_status IN ('Converted', 'Not Converted')),
    non_conversion_reason TEXT,
    conversion_decided_at TEXT,
    
    -- Current Status Tracking
    current_status TEXT NOT NULL CHECK (current_status IN (
        'Step 1 Pending', 'Step 2 Pending', 'Demo Pending', 'Demo Scheduled', 
        'Feedback Awaited', 'Converted', 'Not Converted', 'Not Applicable', 'Already Using'
    )),
    workflow_completed BOOLEAN NOT NULL DEFAULT false,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for demos
CREATE INDEX idx_demos_demo_id ON demos(demo_id);
CREATE INDEX idx_demos_brand_name ON demos(brand_name);
CREATE INDEX idx_demos_brand_id ON demos(brand_id);
CREATE INDEX idx_demos_product_name ON demos(product_name);
CREATE INDEX idx_demos_agent_id ON demos(agent_id);
CREATE INDEX idx_demos_agent_name ON demos(agent_name);
CREATE INDEX idx_demos_team_name ON demos(team_name);
CREATE INDEX idx_demos_current_status ON demos(current_status);
CREATE INDEX idx_demos_workflow_completed ON demos(workflow_completed);
CREATE INDEX idx_demos_is_applicable ON demos(is_applicable);
CREATE INDEX idx_demos_usage_status ON demos(usage_status);
CREATE INDEX idx_demos_conversion_status ON demos(conversion_status);
CREATE INDEX idx_demos_zone ON demos(zone);

COMMENT ON TABLE demos IS 'Product demo management with state-driven workflow';
COMMENT ON COLUMN demos.demo_scheduling_history IS 'Array of scheduling events with scheduled_date, scheduled_time, rescheduled_at, reason';

-- =====================================================
-- TABLE: health_checks
-- Monthly brand health assessments
-- =====================================================
CREATE TABLE health_checks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    check_id TEXT NOT NULL UNIQUE,
    brand_name TEXT NOT NULL,
    brand_id TEXT,
    kam_name TEXT NOT NULL,
    kam_email TEXT NOT NULL,
    zone TEXT NOT NULL,
    team_name TEXT,
    
    -- Health Assessment Data
    health_status TEXT NOT NULL CHECK (health_status IN ('Green', 'Amber', 'Orange', 'Red', 'Not Connected', 'Dead')),
    brand_nature TEXT NOT NULL CHECK (brand_nature IN ('Active', 'Hyper Active', 'Inactive')),
    remarks TEXT,
    
    -- Monthly Tracking
    assessment_month TEXT NOT NULL, -- YYYY-MM format
    assessment_date TEXT NOT NULL,
    
    -- Metadata
    created_by TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for health_checks
CREATE INDEX idx_health_checks_check_id ON health_checks(check_id);
CREATE INDEX idx_health_checks_brand_name ON health_checks(brand_name);
CREATE INDEX idx_health_checks_kam_email ON health_checks(kam_email);
CREATE INDEX idx_health_checks_zone ON health_checks(zone);
CREATE INDEX idx_health_checks_health_status ON health_checks(health_status);
CREATE INDEX idx_health_checks_brand_nature ON health_checks(brand_nature);
CREATE INDEX idx_health_checks_assessment_month ON health_checks(assessment_month);
CREATE INDEX idx_health_checks_assessment_date ON health_checks(assessment_date);
CREATE INDEX idx_health_checks_created_by ON health_checks(created_by);
CREATE INDEX idx_health_checks_team_name ON health_checks(team_name);

-- Composite indexes for common queries
CREATE INDEX idx_health_checks_month_brand ON health_checks(assessment_month, brand_name);
CREATE INDEX idx_health_checks_month_assessor ON health_checks(assessment_month, created_by);

-- Foreign key indexes
CREATE INDEX idx_health_checks_kam_email_fk ON health_checks(kam_email);
CREATE INDEX idx_health_checks_created_by_fk ON health_checks(created_by);

COMMENT ON TABLE health_checks IS 'Monthly brand health assessments';

-- =====================================================
-- TABLE: mom (Minutes of Meeting)
-- MOM and ticket management
-- =====================================================
CREATE TABLE mom (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_id TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('Open', 'In Progress', 'Resolved', 'Closed')),
    priority TEXT NOT NULL CHECK (priority IN ('Low', 'Medium', 'High', 'Critical')),
    category TEXT CHECK (category IN ('Technical', 'Billing', 'General', 'Feature Request')),
    created_by TEXT NOT NULL,
    assigned_to TEXT,
    team TEXT,
    brand_name TEXT,
    customer_name TEXT,
    resolution TEXT,
    resolved_at TEXT,
    due_date TEXT,
    tags TEXT[],
    
    -- Visit MOM specific fields
    visit_id TEXT,
    outcome TEXT,
    next_steps TEXT,
    notes TEXT,
    
    -- Resubmission tracking
    is_resubmission BOOLEAN DEFAULT false,
    resubmission_count INTEGER DEFAULT 0,
    resubmission_notes TEXT,
    
    -- Open Points Structure (JSONB array)
    open_points JSONB,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for mom
CREATE INDEX idx_mom_ticket_id ON mom(ticket_id);
CREATE INDEX idx_mom_status ON mom(status);
CREATE INDEX idx_mom_priority ON mom(priority);
CREATE INDEX idx_mom_created_by ON mom(created_by);
CREATE INDEX idx_mom_assigned_to ON mom(assigned_to);
CREATE INDEX idx_mom_team ON mom(team);
CREATE INDEX idx_mom_category ON mom(category);
CREATE INDEX idx_mom_brand_name ON mom(brand_name);
CREATE INDEX idx_mom_visit_id ON mom(visit_id);

-- Foreign key indexes
CREATE INDEX idx_mom_created_by_fk ON mom(created_by);
CREATE INDEX idx_mom_assigned_to_fk ON mom(assigned_to);

COMMENT ON TABLE mom IS 'Minutes of Meeting and ticket management';
COMMENT ON COLUMN mom.open_points IS 'Array of open point objects with topic, description, next_steps, ownership, owner_name, status, timeline, created_at, updated_at';

-- =====================================================
-- TABLE: notification_preferences
-- User notification settings
-- =====================================================
CREATE TABLE notification_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT NOT NULL UNIQUE,
    email_notifications BOOLEAN NOT NULL DEFAULT true,
    sms_notifications BOOLEAN NOT NULL DEFAULT false,
    reminder_frequency TEXT NOT NULL CHECK (reminder_frequency IN ('immediate', 'hourly', 'daily')),
    notification_types TEXT[] NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for notification_preferences
CREATE INDEX idx_notification_preferences_email ON notification_preferences(email);

-- Foreign key to user_profiles
ALTER TABLE notification_preferences
ADD CONSTRAINT fk_notification_preferences_email
FOREIGN KEY (email) REFERENCES user_profiles(email) ON DELETE CASCADE;

COMMENT ON TABLE notification_preferences IS 'User notification preferences';

-- =====================================================
-- TABLE: notification_log
-- Log of sent notifications
-- =====================================================
CREATE TABLE notification_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT NOT NULL,
    notification_type TEXT NOT NULL,
    record_count INTEGER NOT NULL DEFAULT 0,
    content TEXT NOT NULL,
    sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    status TEXT NOT NULL CHECK (status IN ('sent', 'failed', 'pending'))
);

-- Indexes for notification_log
CREATE INDEX idx_notification_log_email ON notification_log(email);
CREATE INDEX idx_notification_log_sent_at ON notification_log(sent_at);
CREATE INDEX idx_notification_log_status ON notification_log(status);

-- Foreign key to user_profiles
CREATE INDEX idx_notification_log_email_fk ON notification_log(email);

COMMENT ON TABLE notification_log IS 'Log of sent notifications';

-- =====================================================
-- FOREIGN KEY CONSTRAINTS
-- Establishing referential integrity
-- =====================================================

-- churn_records foreign keys
ALTER TABLE churn_records
ADD CONSTRAINT fk_churn_records_uploaded_by
FOREIGN KEY (uploaded_by) REFERENCES user_profiles(email) ON DELETE SET NULL;

-- visits foreign keys
ALTER TABLE visits
ADD CONSTRAINT fk_visits_approved_by
FOREIGN KEY (approved_by) REFERENCES user_profiles(email) ON DELETE SET NULL;

ALTER TABLE visits
ADD CONSTRAINT fk_visits_rejected_by
FOREIGN KEY (rejected_by) REFERENCES user_profiles(email) ON DELETE SET NULL;

-- health_checks foreign keys
ALTER TABLE health_checks
ADD CONSTRAINT fk_health_checks_kam_email
FOREIGN KEY (kam_email) REFERENCES user_profiles(email) ON DELETE RESTRICT;

ALTER TABLE health_checks
ADD CONSTRAINT fk_health_checks_created_by
FOREIGN KEY (created_by) REFERENCES user_profiles(email) ON DELETE RESTRICT;

-- mom foreign keys
ALTER TABLE mom
ADD CONSTRAINT fk_mom_created_by
FOREIGN KEY (created_by) REFERENCES user_profiles(email) ON DELETE RESTRICT;

ALTER TABLE mom
ADD CONSTRAINT fk_mom_assigned_to
FOREIGN KEY (assigned_to) REFERENCES user_profiles(email) ON DELETE SET NULL;

ALTER TABLE mom
ADD CONSTRAINT fk_mom_visit_id
FOREIGN KEY (visit_id) REFERENCES visits(visit_id) ON DELETE SET NULL;

-- =====================================================
-- TRIGGERS FOR AUTOMATIC TIMESTAMP UPDATES
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to all tables with updated_at
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_master_data_updated_at BEFORE UPDATE ON master_data
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_churn_records_updated_at BEFORE UPDATE ON churn_records
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_visits_updated_at BEFORE UPDATE ON visits
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_demos_updated_at BEFORE UPDATE ON demos
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_health_checks_updated_at BEFORE UPDATE ON health_checks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_mom_updated_at BEFORE UPDATE ON mom
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notification_preferences_updated_at BEFORE UPDATE ON notification_preferences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Enable RLS for all tables
-- =====================================================

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE master_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE churn_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE demos ENABLE ROW LEVEL SECURITY;
ALTER TABLE health_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE mom ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_log ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- INDEXES FOR PERFORMANCE OPTIMIZATION
-- Additional composite indexes for common query patterns
-- =====================================================

-- Churn records composite indexes
CREATE INDEX idx_churn_records_kam_date ON churn_records(kam, date);
CREATE INDEX idx_churn_records_zone_date ON churn_records(zone, date);
CREATE INDEX idx_churn_records_follow_up_composite ON churn_records(is_follow_up_active, current_call, follow_up_status);

-- Visits composite indexes
CREATE INDEX idx_visits_agent_status ON visits(agent_id, visit_status);
CREATE INDEX idx_visits_team_status ON visits(team_name, visit_status);
CREATE INDEX idx_visits_approval_composite ON visits(approval_status, mom_shared);

-- Demos composite indexes
CREATE INDEX idx_demos_agent_status ON demos(agent_id, current_status);
CREATE INDEX idx_demos_brand_product ON demos(brand_id, product_name);
CREATE INDEX idx_demos_team_status ON demos(team_name, current_status);

-- Health checks composite indexes
CREATE INDEX idx_health_checks_kam_month ON health_checks(kam_email, assessment_month);
CREATE INDEX idx_health_checks_zone_month ON health_checks(zone, assessment_month);

-- MOM composite indexes
CREATE INDEX idx_mom_created_status ON mom(created_by, status);
CREATE INDEX idx_mom_assigned_status ON mom(assigned_to, status);

-- =====================================================
-- GRANT PERMISSIONS
-- Grant appropriate permissions to authenticated users
-- =====================================================

-- Grant SELECT to authenticated users on all tables
GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated;

-- Grant INSERT, UPDATE, DELETE based on role (to be refined with RLS policies)
GRANT INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;

-- Grant USAGE on sequences
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- =====================================================
-- COMMENTS AND DOCUMENTATION
-- =====================================================

COMMENT ON SCHEMA public IS 'Main schema for KAM Dashboard application migrated from Convex';

-- =====================================================
-- END OF SCHEMA
-- =====================================================
