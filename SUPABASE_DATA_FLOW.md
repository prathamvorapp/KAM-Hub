# Supabase Data Flow Documentation

## Overview
This document explains how the KAM Dashboard connects to Supabase and what data is fetched from each table.

## Database Tables Used

### 1. **user_profiles**
Stores user account information and roles.

**Columns used:**
- `email` - User's email address (primary identifier)
- `full_name` - User's full name
- `role` - User role: 'agent', 'team_lead', or 'admin'
- `team_name` - Team assignment (for team leads and agents)

**Used in:**
- Authentication and authorization
- Determining data access based on role
- Filtering visits and brands by team/agent

### 2. **master_data**
Contains brand/customer information and KAM assignments.

**Columns used:**
- `brand_name` - Name of the brand/customer
- `kam_email_id` - Email of the assigned Key Account Manager
- `kam_name` - Name of the assigned KAM
- Additional brand details (contact info, location, etc.)

**Used in:**
- Filtering brands by assigned KAM
- Showing brand lists for agents and team leads
- Visit planning and tracking

### 3. **visits**
Tracks all customer visits and their status.

**Columns used:**
- `visit_id` - Unique visit identifier
- `brand_name` - Brand being visited
- `agent_id` - Email of the agent conducting the visit
- `agent_name` - Name of the agent
- `team_name` - Team of the agent
- `visit_status` - Status: 'Scheduled', 'Completed', 'Cancelled', 'Pending Approval', etc.
- `scheduled_date` - When the visit is scheduled
- `visit_date` - When the visit actually occurred
- `visit_year` - Year of the visit (for filtering)
- `mom_shared` - MOM sharing status: 'Yes', 'No', 'Pending'
- `mom_shared_date` - When MOM was shared
- `approval_status` - Approval status: 'Pending', 'Approved', 'Rejected'
- `approved_by` - Email of approver
- `approved_at` - Approval timestamp
- `rejection_remarks` - Reason for rejection
- `purpose` - Purpose of the visit
- `notes` - Visit notes
- `outcome` - Visit outcome
- `next_steps` - Follow-up actions

**Used in:**
- Visit statistics and dashboards
- Visit management and tracking
- Approval workflows
- MOM tracking

### 4. **mom** (Minutes of Meeting)
Stores meeting minutes and action items from visits.

**Columns used:**
- `ticket_id` - Unique MOM identifier
- `title` - MOM title
- `description` - MOM description
- `status` - Status: 'Open', 'Closed', etc.
- `priority` - Priority level
- `category` - Category (e.g., 'Visit MOM')
- `created_by` - Creator's email
- `brand_name` - Associated brand
- `visit_id` - Associated visit ID
- `open_points` - Array of action items with:
  - `topic` - Action item topic
  - `description` - Details
  - `next_steps` - Required actions
  - `ownership` - Who is responsible
  - `owner_name` - Owner's name
  - `status` - Item status
  - `timeline` - Due date/timeline
- `is_resubmission` - Whether this is a resubmission
- `resubmission_notes` - Notes for resubmission

**Used in:**
- Tracking action items from visits
- Follow-up management
- Visit approval process

### 5. **churn_records**
Tracks churned customers and follow-up activities.

**Columns used:**
- `rid` - Unique record ID
- `brand_name` - Churned brand name
- `kam` - Assigned KAM
- `churn_reason` - Reason for churn
- `follow_up_date` - When to follow up
- `call_response` - Response from follow-up call
- `notes` - Additional notes
- `mail_sent_confirmation` - Whether email was sent

**Used in:**
- Churn management
- Follow-up tracking
- Analytics

### 6. **demos**
Tracks product demonstrations and trials.

**Columns used:**
- `demo_id` - Unique demo identifier
- `brand_name` - Brand receiving demo
- `product` - Product being demoed
- `demo_status` - Status of the demo
- `scheduled_date` - Demo date
- `conducted_by` - Who conducted the demo
- `outcome` - Demo outcome

**Used in:**
- Demo tracking
- Conversion tracking
- Product adoption metrics

### 7. **health_checks**
Tracks customer health assessments.

**Columns used:**
- `check_id` - Unique check identifier
- `brand_name` - Brand being assessed
- `health_score` - Overall health score
- `assessment_date` - When assessed
- `assessed_by` - Who performed the assessment
- `notes` - Assessment notes

**Used in:**
- Customer health monitoring
- Risk identification
- Proactive engagement

## API Endpoints and Data Flow

### `/api/data/visits/statistics`
**Fetches from:**
1. `user_profiles` - Get user role and team
2. `master_data` - Get brands assigned to user/team
3. `visits` - Get all visits for current year, filtered by role

**Returns:**
- Total brands count
- Visit statistics (completed, pending, scheduled, cancelled)
- MOM sharing statistics
- Approval statistics
- Monthly progress metrics

**Role-based filtering:**
- **Agent**: Only their assigned brands and visits
- **Team Lead**: All brands and visits for their team
- **Admin**: All brands and visits

### `/api/data/master-data/brands/[email]`
**Fetches from:**
1. `master_data` - Get brands where `kam_email_id` matches the email

**Returns:**
- List of brands assigned to the KAM
- Brand details (name, contact, location, etc.)

### `/api/churn/analytics`
**Fetches from:**
1. `churn_records` - Get all churn records with filters

**Returns:**
- Churn statistics
- Follow-up status
- Response rates

## Authentication Flow

1. User logs in via `/api/auth/login`
2. Login creates Supabase session (HTTP-only cookies)
3. API requests automatically include session cookies
4. API routes validate session using `requireAuth()`
5. API routes fetch user-specific data from Supabase with role-based filtering

## Environment Variables Required

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## Current Issue (500 Error)

The `/api/data/visits/statistics` endpoint is returning a 500 error. Possible causes:

1. **Missing Supabase credentials** - Check `.env.local` file
2. **Table doesn't exist** - Verify tables are created in Supabase
3. **Column mismatch** - Table schema doesn't match expected columns
4. **RLS policies** - Row Level Security blocking queries
5. **Network issue** - Can't connect to Supabase

**Next steps:**
1. Check server logs for detailed error message
2. Verify Supabase connection with a simple query
3. Check if tables exist and have correct schema
4. Verify RLS policies allow service role access
