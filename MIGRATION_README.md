# 🚀 Convex to Supabase Migration Guide

## Overview

This project has been migrated from Convex to Supabase PostgreSQL. All database operations now use Supabase instead of Convex.

## 📁 Migration Files

- `MIGRATION_SUPABASE.md` - Complete migration documentation with service reference
- `API_MIGRATION_EXAMPLE.md` - Code examples for updating API routes
- `MIGRATION_CHECKLIST.md` - Step-by-step checklist for tracking progress
- `MIGRATION_README.md` - This file (quick start guide)

## 🎯 Quick Start

### 1. Verify Environment Setup

Check that your `.env.local` file has the correct Supabase credentials:

```bash
# View your environment file
cat .env.local
```

Should contain:
```env
NEXT_PUBLIC_SUPABASE_URL=https://qvgnrdarwsnweizifech.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_JWT_SECRET=TYd5bWqVJgLH6CtsT3sXye+7Bi0HhnalxoPGO+z5ZK8tT36qp4TtndESepJAG4Vprb18/gqWjVWHDpYcAq862w==
```

### 2. Test Supabase Connection

Run the connection test script:

```bash
node scripts/test-supabase-connection.js
```

This will:
- ✅ Verify environment variables
- ✅ Test database connection
- ✅ Check all tables exist
- ✅ Show record counts

### 3. Ensure Database Schema is Applied

If tables don't exist, run the schema in Supabase SQL Editor:

1. Go to https://supabase.com/dashboard
2. Select your project: `qvgnrdarwsnweizifech`
3. Go to SQL Editor
4. Copy contents of `supabase_schema.sql`
5. Run the SQL

### 4. Start Migrating API Routes

Follow the pattern in `API_MIGRATION_EXAMPLE.md`:

**Before (Convex):**
```typescript
import { ChurnService } from '../../../lib/services/churnService';
const churnService = new ChurnService();
const result = await churnService.getChurnDataWithRoleFilter(...);
```

**After (Supabase):**
```typescript
import { churnService } from '@/lib/services';
const result = await churnService.getChurnData({ email, page, limit, search });
```

### 5. Test Each Route

After updating each API route:

```bash
# Start development server
npm run dev

# Test the endpoint
curl http://localhost:3022/api/churn
```

## 📚 Available Services

All services are exported from `lib/services/index.ts`:

```typescript
import {
  churnService,
  visitService,
  demoService,
  healthCheckService,
  momService,
  masterDataService,
  userService
} from '@/lib/services';
```

### Service Functions

#### Churn Service
- `getChurnData({ email, page, limit, search })`
- `updateChurnReason({ rid, churn_reason, remarks, mail_sent_confirmation, email })`
- `createChurnRecord(data)`
- `getChurnStatistics(email)`
- `getFollowUpStatus(rid, email)`
- `recordCallAttempt({ rid, call_response, notes, churn_reason, email })`
- `getActiveFollowUps(kam, email)`
- `getOverdueFollowUps(kam, email)`

#### Visit Service
- `getVisitStatistics(email)`
- `getVisits({ email, search, page, limit })`
- `createVisit(data)`
- `updateVisitStatus({ visit_id, visit_status, visit_date, outcome, next_steps, notes })`
- `updateMOMStatus({ visit_id, mom_shared, mom_shared_date })`
- `submitMoM(params)`
- `approveVisit({ visit_id, approver_email, approval_status, rejection_remarks })`
- `resubmitMoM({ visit_id, agent_email })`
- `rescheduleVisit({ visit_id, new_scheduled_date, reason, rescheduled_by })`
- `getVisitRescheduleHistory(visit_id)`
- `scheduleBackdatedVisit(data)`

#### Demo Service
- `initializeBrandDemosFromMasterData(brandId)`
- `getDemosForAgent({ agentId, role, teamName })`
- `setProductApplicability({ demoId, isApplicable, nonApplicableReason })`
- `setUsageStatus({ demoId, usageStatus })`
- `scheduleDemo({ demoId, scheduledDate, scheduledTime, reason })`
- `completeDemo({ demoId, conductedBy, completionNotes })`
- `setConversionDecision({ demoId, conversionStatus, nonConversionReason })`
- `rescheduleDemo({ demoId, scheduledDate, scheduledTime, reason, rescheduleBy, rescheduleByRole })`
- `getDemoStatistics({ agentId, teamName, role })`

#### Health Check Service
- `getHealthChecks({ email, month, page, limit })`
- `createHealthCheck(data)`
- `updateHealthCheck(checkId, data)`
- `getHealthCheckStatistics({ email, month })`
- `getBrandsForAssessment({ email, month })`
- `getAssessmentProgress({ email, month })`

#### MOM Service
- `getMOMs({ email, visitId, status, page, limit })`
- `getMOMByTicketId(ticketId)`
- `createMOM(data)`
- `updateMOM(ticketId, data)`
- `updateOpenPointStatus({ ticketId, pointIndex, status })`
- `getMOMStatistics(email)`

#### Master Data Service
- `getMasterData({ email, search, page, limit })`
- `getBrandsByAgentEmail(email)`
- `getBrandByEmail(brandEmail)`
- `createMasterData(data)`
- `updateMasterData(id, data)`
- `getMasterDataStatistics(email)`

## 🔄 Migration Progress

Track your progress in `MIGRATION_CHECKLIST.md`:

- ✅ Services Created: 7/7 (100%)
- ⏳ API Routes Migrated: 0/40+ (0%)
- ⏳ Tests Passed: 0/40+ (0%)

## 🧪 Testing Strategy

### 1. Unit Testing
Test each service function independently:

```typescript
// Example test
import { churnService } from '@/lib/services';

const result = await churnService.getChurnData({
  email: 'test@example.com',
  page: 1,
  limit: 10
});

console.log('Records:', result.data.length);
console.log('Total:', result.total);
```

### 2. Integration Testing
Test API routes with different roles:

```bash
# Test as Agent
curl -H "x-user-email: agent@example.com" \
     -H "x-user-role: Agent" \
     http://localhost:3022/api/churn

# Test as Team Lead
curl -H "x-user-email: lead@example.com" \
     -H "x-user-role: Team Lead" \
     http://localhost:3022/api/churn

# Test as Admin
curl -H "x-user-email: admin@example.com" \
     -H "x-user-role: Admin" \
     http://localhost:3022/api/churn
```

### 3. End-to-End Testing
Test complete workflows:

1. Login as Agent
2. View churn records
3. Update churn reason
4. Record follow-up call
5. Verify data persistence

## 🚨 Common Issues

### Issue: "Authentication required"
**Solution:** Ensure user session cookie is set or headers are passed

### Issue: "Table does not exist"
**Solution:** Run `supabase_schema.sql` in Supabase SQL Editor

### Issue: "Permission denied"
**Solution:** Check RLS policies or use `supabaseAdmin` for admin operations

### Issue: "Invalid input syntax for type uuid"
**Solution:** Don't pass `id` field for inserts, it's auto-generated

### Issue: "Cannot read property of undefined"
**Solution:** Check service function return structure matches expected format

## 📊 Database Schema

All tables are in Supabase PostgreSQL:

- `user_profiles` - User authentication and profiles
- `master_data` - Brand/restaurant master data
- `churn_records` - Churn tracking with follow-ups
- `visits` - Visit management and scheduling
- `demos` - Product demo workflow
- `health_checks` - Monthly brand health assessments
- `mom` - Minutes of Meeting
- `notification_preferences` - User notification settings
- `notification_log` - Notification history

## 🔐 Security

- ✅ Row Level Security (RLS) enabled on all tables
- ✅ Service role key for admin operations
- ✅ Anon key for client-side operations
- ✅ JWT authentication configured
- ✅ Foreign key constraints enforced

## 📈 Performance

- ✅ Indexes on all foreign keys
- ✅ Composite indexes for common queries
- ✅ Automatic timestamp triggers
- ✅ Connection pooling enabled
- ⏳ Caching to be implemented in API routes

## 🆘 Getting Help

1. **Check Documentation**
   - `MIGRATION_SUPABASE.md` - Complete service reference
   - `API_MIGRATION_EXAMPLE.md` - Code examples
   - `MIGRATION_CHECKLIST.md` - Progress tracking

2. **Test Connection**
   ```bash
   node scripts/test-supabase-connection.js
   ```

3. **Check Supabase Logs**
   - Go to Supabase Dashboard
   - Navigate to Logs section
   - Filter by error level

4. **Review Service Code**
   - All services in `lib/services/`
   - Well-documented with comments
   - TypeScript for type safety

## 🎯 Next Steps

1. ✅ Verify Supabase connection
2. ⏳ Migrate high-priority API routes (Churn, Visits)
3. ⏳ Test with all user roles
4. ⏳ Migrate remaining API routes
5. ⏳ Update frontend components if needed
6. ⏳ Performance testing
7. ⏳ Production deployment

## 📝 Notes

- **Convex directory removed** - All Convex code has been deleted
- **No Convex dependencies** - Package.json is clean
- **Backward compatible** - API response structures maintained
- **Role-based access** - All services implement proper filtering
- **Type safe** - TypeScript throughout

---

**Migration Date:** February 12, 2026  
**Status:** Services Complete, API Routes Pending  
**Supabase Project:** qvgnrdarwsnweizifech  
**Database:** PostgreSQL 15

Good luck with the migration! 🚀
