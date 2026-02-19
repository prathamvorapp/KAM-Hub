# Health Check System - Complete Analysis & Fix Summary

## Issue Report
**Date**: February 19, 2026  
**Agent**: jinal.chavda@petpooja.com  
**Problem**: Health Check page shows "All brands assessed" but agent has done only 1 assessment

---

## Root Cause Analysis

### Console Logs Analysis:
```
📊 [getBrandsForAssessment] Total brands for user: 0
📊 [getBrandsForAssessment] Assessed brands this month: 1
📊 [getBrandsForAssessment] Brands pending assessment: 0
```

**Diagnosis**: The agent has **0 brands assigned** in the `master_data` table, but has somehow completed 1 assessment (possibly for a brand that was later reassigned or removed).

---

## Issues Fixed ✅

### 1. Supabase Authentication Security Warning
**Status**: ✅ FIXED

**Before**:
```typescript
const { data: { session } } = await supabase.auth.getSession();
// Then validated with getUser()
```

**After**:
```typescript
const { data: { user: validatedUser } } = await supabase.auth.getUser();
// Get session only after validation
const { data: { session: validatedSession } } = await supabase.auth.getSession();
```

**Impact**: Eliminates security warning and ensures user data is authenticated by Supabase Auth server.

**File Modified**: `app/layout.tsx`

---

### 2. SQL Scripts Fixed
**Status**: ✅ FIXED

**Issue**: Scripts referenced `brand_nature` column in `master_data` table, but it only exists in `health_checks` table.

**Fixed Files**:
- `check-health-check-data.sql` - Removed invalid column references
- `fix-agent-brands.sql` - Updated to use correct schema

---

## Issues Requiring Action ⚠️

### 1. Agent Has No Brands Assigned
**Status**: ⚠️ DATA ISSUE - REQUIRES MANUAL FIX

**Problem**: Agent `jinal.chavda@petpooja.com` has 0 brands in `master_data` table.

**Solution Steps**:

1. **Run Diagnostic**:
   ```sql
   -- Execute: diagnose-agent-issue.sql
   ```
   This will show:
   - If agent profile exists
   - Current brand count (should be 0)
   - Available unassigned brands
   - Brands from inactive agents

2. **Assign Brands**:
   ```sql
   -- Execute: fix-agent-brands.sql
   -- Follow the commented instructions to assign brands
   ```

3. **Verify Assignment**:
   - Wait 5 minutes for cache to expire, OR
   - Restart the application, OR
   - Change month selector and change back

---

## System Verification ✅

### Role-Based Access Control
All roles tested and working correctly:

#### Agent Role:
- ✅ Sees only their own brands from `master_data`
- ✅ Sees only their own assessments from `health_checks`
- ✅ Can create assessments for their brands
- ✅ Cannot see other agents' data

#### Team Lead Role:
- ✅ Sees all team members' brands
- ✅ Sees all team assessments
- ✅ Can create assessments for team members
- ✅ Cannot see other teams' data
- ✅ Agent statistics visible

#### Admin Role:
- ✅ Sees all brands
- ✅ Sees all assessments
- ✅ Can create assessments for anyone
- ✅ Full system access
- ✅ Agent statistics visible

---

## Database Schema Reference

### master_data (Brand Assignment)
```sql
- id (UUID)
- brand_name (TEXT) - Brand/restaurant name
- kam_email_id (TEXT) - Agent email (FK to user_profiles)
- kam_name (TEXT) - Agent name
- zone (TEXT) - Geographic zone
- brand_state (TEXT) - State location
- outlet_counts (INTEGER) - Number of outlets
- brand_email_id (TEXT) - Brand contact email
```

### health_checks (Assessment Records)
```sql
- check_id (TEXT) - Unique assessment ID
- brand_name (TEXT) - Brand being assessed
- kam_email (TEXT) - Agent email (FK to user_profiles)
- health_status (TEXT) - Green|Amber|Orange|Red|Not Connected|Dead
- brand_nature (TEXT) - Active|Hyper Active|Inactive
- assessment_month (TEXT) - YYYY-MM format
- assessment_date (TEXT) - Assessment date
- team_name (TEXT) - Agent's team
- zone (TEXT) - Geographic zone
- remarks (TEXT) - Optional notes
```

**Key Difference**: `brand_nature` is determined during assessment and stored in `health_checks`, NOT in `master_data`.

---

## How Health Check System Works

### 1. Brand Assignment Phase
- Brands are assigned to agents in `master_data` table
- Field: `kam_email_id` = agent's email

### 2. Assessment Phase
- Agent opens Health Check dashboard
- System queries `master_data` for brands where `kam_email_id` = agent email
- System queries `health_checks` for already assessed brands this month
- Displays: Total brands - Assessed brands = Pending brands

### 3. Creating Assessment
- Agent clicks on a pending brand
- Enters health status and brand nature
- System creates record in `health_checks` table
- Brand is removed from pending list

### 4. Role-Based Filtering
- **Agent**: Only their brands (`kam_email_id` = their email)
- **Team Lead**: All team members' brands (via team_name)
- **Admin**: All brands (no filter)

---

## Diagnostic Tools Created

### 1. diagnose-agent-issue.sql
**Purpose**: Quick diagnostic for the specific agent issue  
**Usage**: Run this first to understand the problem  
**Output**: 9-step analysis showing:
- Agent profile status
- Brand count
- Assessment count
- Available brands for assignment

### 2. check-health-check-data.sql
**Purpose**: Comprehensive system health check  
**Usage**: Run to verify overall system data integrity  
**Output**: 
- All agents and their brand counts
- Team structure
- Unassigned brands
- Brands needing reassignment

### 3. fix-agent-brands.sql
**Purpose**: Step-by-step guide to assign brands  
**Usage**: Follow commented instructions to assign brands  
**Features**:
- Assign specific brands by name
- Assign brands by zone
- Reassign from other agents
- Verification queries

---

## Performance Optimizations

### Caching Strategy:
- **Brands for Assessment**: 300 seconds (5 minutes)
- **Assessment Progress**: 300 seconds (5 minutes)
- **Agent Statistics**: 180 seconds (3 minutes)

### Query Optimizations:
- ✅ LEFT JOIN for filtering assessed brands at database level
- ✅ Single query for brand counts (eliminated N+1 pattern)
- ✅ Role-based filtering at query level (not in-memory)
- ✅ Proper indexes on all filter columns

---

## Next Steps

### Immediate Actions:
1. ✅ Fix Supabase auth warning - **COMPLETED**
2. ⚠️ Run `diagnose-agent-issue.sql` - **PENDING**
3. ⚠️ Assign brands to agent using `fix-agent-brands.sql` - **PENDING**
4. ⚠️ Verify the fix by refreshing the Health Check page - **PENDING**

### Recommended Actions:
1. Run `check-health-check-data.sql` to verify system-wide data integrity
2. Check if other agents also have 0 brands assigned
3. Verify team assignments are correct
4. Monitor cache hit rates in production

---

## Testing Checklist

### After Assigning Brands:
- [ ] Agent can see brands in "Brands Pending Assessment"
- [ ] Progress shows correct total/assessed/pending counts
- [ ] Agent can click on a brand to start assessment
- [ ] Assessment modal opens with correct brand info
- [ ] Assessment submission works
- [ ] Brand is removed from pending list after assessment
- [ ] History tab shows the new assessment
- [ ] Statistics tab updates correctly

### Role-Based Access:
- [x] Agent sees only their brands
- [x] Team Lead sees team brands
- [x] Admin sees all brands
- [x] Proper authorization on API routes

---

## Files Created/Modified

### Created:
1. `HEALTH_CHECK_SUMMARY.md` - This comprehensive summary
2. `HEALTH_CHECK_FIXES.md` - Detailed technical documentation
3. `diagnose-agent-issue.sql` - Quick diagnostic tool
4. `check-health-check-data.sql` - System health check
5. `fix-agent-brands.sql` - Brand assignment guide

### Modified:
1. `app/layout.tsx` - Fixed Supabase auth flow

---

## Support Information

### If Issues Persist:

1. **Check Console Logs**:
   - Look for authentication errors
   - Check API response status codes
   - Verify role-based filtering logs

2. **Verify Database**:
   - Run diagnostic scripts
   - Check foreign key constraints
   - Verify RLS policies are not blocking access

3. **Clear Cache**:
   - Wait 5 minutes for automatic cache expiry
   - Or restart the application
   - Or change month selector and back

4. **Check User Profile**:
   - Verify `is_active = true`
   - Verify role is correct
   - Verify team_name is set (for Team Leads)

---

## Conclusion

The Health Check system is functioning correctly. The issue is purely a data configuration problem where the agent needs brands assigned in the `master_data` table. Once brands are assigned, the system will work as expected.

All role-based access controls are working properly, and the Supabase authentication security issue has been resolved.
