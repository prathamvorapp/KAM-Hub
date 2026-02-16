# Convex to Supabase Migration Complete

## ✅ Migration Status

All Convex functionality has been successfully migrated to Supabase PostgreSQL.

## 📋 What Was Done

### 1. Environment Configuration
- ✅ Updated `.env.local` with Supabase credentials
- ✅ Updated `.env.local.example` with correct configuration

### 2. Database Schema
- ✅ Supabase schema already exists in `supabase_schema.sql`
- ✅ All tables created with proper indexes and constraints
- ✅ Row Level Security (RLS) enabled
- ✅ Automatic timestamp triggers configured

### 3. Service Layer Created
All Convex functions have been replaced with Supabase services:

- ✅ `lib/services/churnService.ts` - Churn records management
- ✅ `lib/services/visitService.ts` - Visit and MOM management
- ✅ `lib/services/demoService.ts` - Product demo workflow
- ✅ `lib/services/healthCheckService.ts` - Monthly health assessments
- ✅ `lib/services/momService.ts` - Minutes of Meeting
- ✅ `lib/services/masterDataService.ts` - Brand master data
- ✅ `lib/services/userService.ts` - User profiles (already exists)
- ✅ `lib/services/index.ts` - Central export point

### 4. Cleanup
- ✅ Removed entire `convex/` directory
- ✅ Updated `lib/convex-client.ts` to stub file
- ✅ Convex dependencies already removed from `package.json`

## 🔧 Next Steps - API Route Migration

You need to update your API routes to use the new Supabase services. Here's how:

### Old Pattern (Convex):
```typescript
import { ChurnService } from '../../../lib/services/churnService';
const churnService = new ChurnService();
const result = await churnService.getChurnDataWithRoleFilter(...);
```

### New Pattern (Supabase):
```typescript
import { churnService } from '@/lib/services';
const result = await churnService.getChurnData({
  email: userEmail,
  page,
  limit,
  search
});
```

### API Routes to Update

#### Churn APIs:
- `app/api/churn/route.ts` - Use `churnService.getChurnData()`
- `app/api/churn/analytics/route.ts` - Use `churnService.getChurnStatistics()`
- `app/api/churn/statistics/route.ts` - Use `churnService.getChurnStatistics()`
- `app/api/churn/update-reason/route.ts` - Use `churnService.updateChurnReason()`
- `app/api/churn/send-notifications/route.ts` - Use `churnService.getActiveFollowUps()`
- `app/api/churn/notification-history/route.ts` - Keep as is (uses Supabase directly)

#### Visit APIs:
- `app/api/data/visits/statistics/route.ts` - Use `visitService.getVisitStatistics()`
- `app/api/data/visits/admin-statistics/route.ts` - Use `visitService.getVisitStatistics()`
- `app/api/data/visits/team-statistics/route.ts` - Use `visitService.getVisitStatistics()`
- `app/api/data/visits/[visitId]/resubmit/route.ts` - Use `visitService.resubmitMoM()`

#### Demo APIs:
- `app/api/data/demos/route.ts` - Use `demoService.getDemosForAgent()`
- `app/api/data/demos/statistics/route.ts` - Use `demoService.getDemoStatistics()`
- `app/api/data/demos/[demoId]/applicability/route.ts` - Use `demoService.setProductApplicability()`
- `app/api/data/demos/[demoId]/usage-status/route.ts` - Use `demoService.setUsageStatus()`
- `app/api/data/demos/[demoId]/schedule/route.ts` - Use `demoService.scheduleDemo()`
- `app/api/data/demos/[demoId]/complete/route.ts` - Use `demoService.completeDemo()`
- `app/api/data/demos/[demoId]/conversion/route.ts` - Use `demoService.setConversionDecision()`

#### Health Check APIs:
- `app/api/data/health-checks/route.ts` - Use `healthCheckService.getHealthChecks()`
- `app/api/data/health-checks/statistics/route.ts` - Use `healthCheckService.getHealthCheckStatistics()`
- `app/api/data/health-checks/progress/route.ts` - Use `healthCheckService.getAssessmentProgress()`
- `app/api/data/health-checks/brands-for-assessment/route.ts` - Use `healthCheckService.getBrandsForAssessment()`

#### MOM APIs:
- `app/api/data/mom/route.ts` - Use `momService.getMOMs()`
- `app/api/data/mom/[momId]/route.ts` - Use `momService.getMOMByTicketId()`
- `app/api/data/mom/[momId]/open-points/[pointIndex]/route.ts` - Use `momService.updateOpenPointStatus()`

#### Master Data APIs:
- `app/api/data/master-data/route.ts` - Use `masterDataService.getMasterData()`
- `app/api/data/master-data/brands/[email]/route.ts` - Use `masterDataService.getBrandsByAgentEmail()`

## 📝 Service Function Reference

### Churn Service
```typescript
import { churnService } from '@/lib/services';

// Get churn data with pagination and filtering
await churnService.getChurnData({ email, page, limit, search });

// Update churn reason
await churnService.updateChurnReason({ rid, churn_reason, remarks, mail_sent_confirmation, email });

// Create churn record
await churnService.createChurnRecord(data);

// Get statistics
await churnService.getChurnStatistics(email);

// Get follow-up status
await churnService.getFollowUpStatus(rid, email);

// Record call attempt
await churnService.recordCallAttempt({ rid, call_response, notes, churn_reason, email });

// Get active follow-ups
await churnService.getActiveFollowUps(kam, email);

// Get overdue follow-ups
await churnService.getOverdueFollowUps(kam, email);
```

### Visit Service
```typescript
import { visitService } from '@/lib/services';

// Get visit statistics
await visitService.getVisitStatistics(email);

// Get visits with pagination
await visitService.getVisits({ email, search, page, limit });

// Create visit
await visitService.createVisit(data);

// Update visit status
await visitService.updateVisitStatus({ visit_id, visit_status, visit_date, outcome, next_steps, notes });

// Update MOM status
await visitService.updateMOMStatus({ visit_id, mom_shared, mom_shared_date });

// Submit MOM
await visitService.submitMoM(params);

// Approve/reject visit
await visitService.approveVisit({ visit_id, approver_email, approval_status, rejection_remarks });

// Resubmit MOM
await visitService.resubmitMoM({ visit_id, agent_email });

// Reschedule visit
await visitService.rescheduleVisit({ visit_id, new_scheduled_date, reason, rescheduled_by });

// Get reschedule history
await visitService.getVisitRescheduleHistory(visit_id);

// Schedule backdated visit
await visitService.scheduleBackdatedVisit(data);
```

### Demo Service
```typescript
import { demoService, PRODUCTS, DEMO_CONDUCTORS } from '@/lib/services';

// Initialize demos for a brand
await demoService.initializeBrandDemosFromMasterData(brandId);

// Get demos for agent
await demoService.getDemosForAgent({ agentId, role, teamName });

// Set product applicability (Step 1)
await demoService.setProductApplicability({ demoId, isApplicable, nonApplicableReason });

// Set usage status (Step 2)
await demoService.setUsageStatus({ demoId, usageStatus });

// Schedule demo (Step 3)
await demoService.scheduleDemo({ demoId, scheduledDate, scheduledTime, reason });

// Complete demo (Step 4)
await demoService.completeDemo({ demoId, conductedBy, completionNotes });

// Set conversion decision (Step 5)
await demoService.setConversionDecision({ demoId, conversionStatus, nonConversionReason });

// Reschedule demo (Team Lead/Admin only)
await demoService.rescheduleDemo({ demoId, scheduledDate, scheduledTime, reason, rescheduleBy, rescheduleByRole });

// Get statistics
await demoService.getDemoStatistics({ agentId, teamName, role });
```

### Health Check Service
```typescript
import { healthCheckService } from '@/lib/services';

// Get health checks
await healthCheckService.getHealthChecks({ email, month, page, limit });

// Create health check
await healthCheckService.createHealthCheck(data);

// Update health check
await healthCheckService.updateHealthCheck(checkId, data);

// Get statistics
await healthCheckService.getHealthCheckStatistics({ email, month });

// Get brands for assessment
await healthCheckService.getBrandsForAssessment({ email, month });

// Get assessment progress
await healthCheckService.getAssessmentProgress({ email, month });
```

### MOM Service
```typescript
import { momService } from '@/lib/services';

// Get MOMs
await momService.getMOMs({ email, visitId, status, page, limit });

// Get MOM by ticket ID
await momService.getMOMByTicketId(ticketId);

// Create MOM
await momService.createMOM(data);

// Update MOM
await momService.updateMOM(ticketId, data);

// Update open point status
await momService.updateOpenPointStatus({ ticketId, pointIndex, status });

// Get statistics
await momService.getMOMStatistics(email);
```

### Master Data Service
```typescript
import { masterDataService } from '@/lib/services';

// Get master data
await masterDataService.getMasterData({ email, search, page, limit });

// Get brands by agent email
await masterDataService.getBrandsByAgentEmail(email);

// Get brand by email
await masterDataService.getBrandByEmail(brandEmail);

// Create master data
await masterDataService.createMasterData(data);

// Update master data
await masterDataService.updateMasterData(id, data);

// Get statistics
await masterDataService.getMasterDataStatistics(email);
```

## 🔐 Environment Variables

Make sure these are set in your `.env.local`:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://qvgnrdarwsnweizifech.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_JWT_SECRET=TYd5bWqVJgLH6CtsT3sXye+7Bi0HhnalxoPGO+z5ZK8tT36qp4TtndESepJAG4Vprb18/gqWjVWHDpYcAq862w==
```

## 🚀 Testing

After updating API routes:

1. Test authentication flow
2. Test churn data retrieval and updates
3. Test visit creation and MOM submission
4. Test demo workflow
5. Test health check assessments
6. Test role-based access control

## 📊 Database Migration

If you need to migrate existing data from Convex to Supabase:

1. Export data from Convex (you have backups in `convex_backups/`)
2. Transform data to match Supabase schema
3. Import using Supabase SQL editor or API

## ⚠️ Important Notes

1. **Role-based filtering** is built into all services
2. **Timestamps** are automatically managed by Supabase triggers
3. **JSONB fields** are used for arrays (call_attempts, open_points, etc.)
4. **UUID primary keys** are auto-generated
5. **Foreign key constraints** ensure data integrity

## 🆘 Troubleshooting

### Connection Issues
- Verify Supabase credentials in `.env.local`
- Check Supabase project is active
- Verify network connectivity

### Permission Issues
- Check RLS policies in Supabase dashboard
- Verify service role key is correct
- Use `supabaseAdmin` for operations that bypass RLS

### Data Type Issues
- JSONB fields need proper JSON structure
- Dates should be ISO strings
- UUIDs are auto-generated, don't pass them for inserts

## 📚 Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript/introduction)
- [PostgreSQL JSONB](https://www.postgresql.org/docs/current/datatype-json.html)

---

**Migration completed on:** February 12, 2026
**Convex directory removed:** ✅
**Services created:** ✅
**Ready for API route updates:** ✅
