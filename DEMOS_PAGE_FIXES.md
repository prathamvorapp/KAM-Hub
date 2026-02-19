# Demos Page - Fixes and Functionality Summary

## Issues Fixed

### 1. ReferenceError: user is not defined (Line 108)
**Problem:** The code was using `user` variable instead of `userProfile` from the `useAuth()` hook.

**Fixed:**
- Line 108: Changed `if (user)` to `if (userProfile)`
- Line 454: Changed `<DashboardLayout userProfile={user}>` to `<DashboardLayout userProfile={userProfile}>`

### 2. Incorrect API Call Parameters
**Problem:** API functions were being called with parameters (email, role, teamName) that are no longer needed since authentication is handled via cookies/session.

**Fixed:**
- `api.getDemosForAgent()`: Removed role and team_name parameters, only passing email
- `api.rescheduleDemo()`: Removed userEmail and userRole parameters
- `api.getDemoStatistics()`: Removed all parameters (email, teamName, role)

## Functionality by Role

### Agent Role
**Can:**
- View their own assigned brands and demos
- Initialize demos for their assigned brands (8 products per brand)
- Complete all 5 workflow steps for their demos:
  1. Set Product Applicability (applicable/not applicable)
  2. Set Usage Status (already using/demo needed)
  3. Schedule Demo (set date and time)
  4. Complete Demo (mark as done with conductor and notes)
  5. Set Conversion Decision (converted/not converted)
- View demo statistics for their own demos
- Search and filter brands
- Track demo progress with visual indicators

**Cannot:**
- Reschedule demos (Team Lead/Admin only)
- View other agents' demos
- Modify demos after workflow completion (locked states)

### Team Lead Role
**Can:**
- View all demos for agents in their team
- Initialize demos for brands assigned to their team members
- Complete all 5 workflow steps for team demos
- **Reschedule demos** for their team (special permission)
- View team-wide demo statistics
- Search and filter brands across the team
- Track team demo progress

**Cannot:**
- View demos from other teams
- Modify demos after workflow completion (locked states)

### Admin Role
**Can:**
- View ALL demos across all teams and agents
- Initialize demos for any brand
- Complete all 5 workflow steps for any demo
- **Reschedule any demo** (special permission)
- View organization-wide demo statistics
- Search and filter all brands
- Track all demo progress

**Cannot:**
- Modify demos after workflow completion (locked states)

## Demo Workflow Steps

### Step 1: Product Applicability
- Decide if the product is applicable for the brand
- If not applicable, provide a reason
- Status changes to "Not Applicable" (locked) or "Step 2 Pending"

### Step 2: Usage Status
- Check if brand is already using the product
- If already using, workflow ends with "Already Using" status (locked)
- If demo needed, status changes to "Demo Pending"

### Step 3: Schedule Demo
- Set date and time for the demo
- Can be rescheduled by Team Lead/Admin
- Status changes to "Demo Scheduled"
- Tracks reschedule count and history

### Step 4: Complete Demo
- Mark demo as completed
- Select who conducted the demo (Agent, RM, MP Training, Product Team)
- Add completion notes
- Status changes to "Feedback Awaited"

### Step 5: Conversion Decision
- Decide if the demo resulted in conversion
- If not converted, provide a reason
- Status changes to "Converted" or "Not Converted" (locked)
- Workflow marked as completed

## Locked States
Once a demo reaches these states, no further modifications are allowed:
- Not Applicable
- Already Using
- Converted
- Not Converted

## Special Features

### Reschedule Permission
- Only Team Lead and Admin can reschedule demos
- Can reschedule at any point after Step 1 is completed
- Tracks reschedule history with reasons
- Shows reschedule button only for authorized users

### Search and Pagination
- Search by brand name, KAM name, state, or zone
- 12 brands per page with pagination
- Real-time search with debouncing
- Shows result count

### Progress Tracking
- Visual progress bar for each brand
- 5-step workflow indicator for each product
- Color-coded status badges
- Completion and conversion statistics

### Demo Statistics Dashboard
- Total demos count
- Conversion rate
- Pending demos count
- Completion rate
- Status breakdown with percentages
- Product breakdown with percentages
- Refresh button to update stats

## Products Tracked
1. Task
2. Purchase
3. Payroll
4. TRM
5. Reputation
6. Franchise Module
7. Petpooja Franchise
8. Marketing Automation

## Demo Conductors
- Agent
- RM
- MP Training
- Product Team

## Authorization
All demo operations are protected by role-based access control:
- Authentication required for all API calls
- User session validated via cookies
- Role-based filtering at database level
- Team-based access for Team Leads
- Full access for Admins
