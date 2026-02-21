# Health Check Pages Analysis - Duplicate Check

## Summary
**NO, there are NO duplicate pages for health check statistics.** There are two DIFFERENT pages serving different purposes and different user roles.

## The Two Pages

### 1. Dashboard Health Checks Page (For Agents & Team Leads)
**Location:** `app/dashboard/health-checks/page.tsx`
**API Endpoint:** `/api/data/health-checks/statistics`
**Access:** Agents, Team Leads, Admins

**Purpose:** 
- Personal health check management for agents
- Team overview for team leads
- Has 3 tabs:
  1. **Assessment Tab** - Assess brands that haven't been checked this month
  2. **History Tab** - View past health check assessments
  3. **Statistics Tab** - View personal/team statistics

**Features:**
- Agents see only their own brands and statistics
- Team Leads see their team's brands and statistics
- Can perform health check assessments
- Shows progress tracking (assessed vs pending brands)
- Filtered by user role (agent sees own data, team lead sees team data)

**API Endpoint Details:**
- Route: `/api/data/health-checks/statistics`
- Cache: `statsCache` with key `health_check_stats_{email}_{month}`
- Access: All authenticated users (filtered by role in service layer)
- Returns: Statistics filtered by user's role and permissions

---

### 2. Admin Health Checks Page (For Admins Only)
**Location:** `app/admin/health-checks/page.tsx`
**API Endpoint:** `/api/data/health-checks/agent-statistics`
**Access:** Admins and Team Leads only

**Purpose:**
- Administrative overview of ALL agents' health check performance
- Monitor team performance across the organization
- Single page showing agent-wise statistics table

**Features:**
- Shows ALL agents in the system (or team for team leads)
- Displays agent-wise breakdown:
  - Total Brands per agent
  - Assessments completed
  - Pending assessments
  - Connectivity rate
  - Health status breakdown
  - Critical vs Healthy brands
- Month selector to view historical data
- Restricted to Admin and Team Lead roles only

**API Endpoint Details:**
- Route: `/api/data/health-checks/agent-statistics`
- Cache: `agentStatsCache` with key `agent_health_stats_{email}_{month}`
- Access: **Only Team Leads and Admins** (403 error for others)
- Returns: Agent-wise statistics with brand counts and performance metrics

---

## Key Differences

| Feature | Dashboard Page | Admin Page |
|---------|---------------|------------|
| **URL** | `/dashboard/health-checks` | `/admin/health-checks` |
| **API** | `/api/data/health-checks/statistics` | `/api/data/health-checks/agent-statistics` |
| **Access** | All users (filtered) | Admin & Team Lead only |
| **View** | Personal/Team view | Organization-wide view |
| **Tabs** | 3 tabs (Assessment, History, Statistics) | Single page (Agent table) |
| **Purpose** | Perform assessments | Monitor performance |
| **Data Scope** | Own/Team data | All agents data |
| **Cache** | `statsCache` | `agentStatsCache` |

---

## Backend Service

Both endpoints call the SAME service method:
- `healthCheckService.getHealthCheckStatistics()`

However, the service method applies **role-based filtering**:
- **Agent**: Returns only their own statistics
- **Team Lead**: Returns statistics for their team members
- **Admin**: Returns statistics for ALL agents

The difference is:
1. **Dashboard endpoint** - Returns filtered stats based on the logged-in user's role
2. **Admin endpoint** - Has an additional access check (403 for non-admin/team-lead) and always returns agent-wise breakdown

---

## Conclusion

These are **NOT duplicates**. They serve different purposes:
- **Dashboard page** = Personal workspace for agents to do their job
- **Admin page** = Management dashboard to monitor all agents

The admin page was specifically created to solve the issue you reported - showing total brands per agent for administrative oversight.
