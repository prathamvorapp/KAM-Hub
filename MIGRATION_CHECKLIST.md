# Convex to Supabase Migration Checklist

## ✅ Completed Steps

- [x] Environment variables configured (`.env.local`)
- [x] Supabase client configured (`lib/supabase-client.ts`)
- [x] Database schema exists (`supabase_schema.sql`)
- [x] All service files created:
  - [x] `lib/services/churnService.ts`
  - [x] `lib/services/visitService.ts`
  - [x] `lib/services/demoService.ts`
  - [x] `lib/services/healthCheckService.ts`
  - [x] `lib/services/momService.ts`
  - [x] `lib/services/masterDataService.ts`
  - [x] `lib/services/userService.ts` (already existed)
  - [x] `lib/services/index.ts` (central export)
- [x] Convex directory removed
- [x] Convex client stubbed (`lib/convex-client.ts`)
- [x] Migration documentation created

## 🔄 Pending Steps - API Routes Migration

### Churn APIs (Priority: HIGH)
- [ ] `app/api/churn/route.ts` - Main churn data endpoint
- [ ] `app/api/churn/analytics/route.ts` - Analytics dashboard
- [ ] `app/api/churn/statistics/route.ts` - Statistics endpoint
- [ ] `app/api/churn/update-reason/route.ts` - Update churn reason
- [ ] `app/api/churn/update-follow-up-timing/route.ts` - Follow-up timing
- [ ] `app/api/churn/send-notifications/route.ts` - Send notifications
- [ ] `app/api/churn/notification-history/route.ts` - Notification history
- [ ] `app/api/churn/notification-targets/route.ts` - Notification targets

### Visit APIs (Priority: HIGH)
- [ ] `app/api/data/visits/statistics/route.ts` - Visit statistics
- [ ] `app/api/data/visits/admin-statistics/route.ts` - Admin statistics
- [ ] `app/api/data/visits/admin-summary/route.ts` - Admin summary
- [ ] `app/api/data/visits/team-statistics/route.ts` - Team statistics
- [ ] `app/api/data/visits/team-summary/route.ts` - Team summary
- [ ] `app/api/data/visits/[visitId]/resubmit/route.ts` - Resubmit MOM

### Demo APIs (Priority: MEDIUM)
- [ ] `app/api/data/demos/route.ts` - Get demos
- [ ] `app/api/data/demos/statistics/route.ts` - Demo statistics
- [ ] `app/api/data/demos/[demoId]/applicability/route.ts` - Set applicability
- [ ] `app/api/data/demos/[demoId]/usage-status/route.ts` - Set usage status
- [ ] `app/api/data/demos/[demoId]/schedule/route.ts` - Schedule demo
- [ ] `app/api/data/demos/[demoId]/complete/route.ts` - Complete demo
- [ ] `app/api/data/demos/[demoId]/conversion/route.ts` - Set conversion

### Health Check APIs (Priority: MEDIUM)
- [ ] `app/api/data/health-checks/route.ts` - Get health checks
- [ ] `app/api/data/health-checks/statistics/route.ts` - Statistics
- [ ] `app/api/data/health-checks/progress/route.ts` - Assessment progress
- [ ] `app/api/data/health-checks/brands-for-assessment/route.ts` - Brands to assess
- [ ] `app/api/data/health-checks/agent-statistics/route.ts` - Agent statistics

### MOM APIs (Priority: MEDIUM)
- [ ] `app/api/data/mom/route.ts` - Get MOMs
- [ ] `app/api/data/mom/visit/route.ts` - Visit MOMs
- [ ] `app/api/data/mom/statistics/route.ts` - MOM statistics
- [ ] `app/api/data/mom/export/route.ts` - Export MOMs
- [ ] `app/api/data/mom/[momId]/route.ts` - Get specific MOM
- [ ] `app/api/data/mom/[momId]/open-points/[pointIndex]/route.ts` - Update open point

### Master Data APIs (Priority: LOW)
- [ ] `app/api/data/master-data/route.ts` - Get master data
- [ ] `app/api/data/master-data/brands/[email]/route.ts` - Get brands by email

### Generic Data API (Priority: LOW)
- [ ] `app/api/data/[module]/route.ts` - Generic module endpoint

### CSV Upload APIs (Priority: LOW)
- [ ] `app/api/churn-upload/upload-csv/route.ts` - CSV upload
- [ ] `app/api/churn-upload/upload-history/route.ts` - Upload history

### Follow-up APIs (Priority: MEDIUM)
- [ ] `app/api/follow-up/[rid]/attempt/route.ts` - Record call attempt
- [ ] `app/api/follow-up/[rid]/call-complete/route.ts` - Complete call
- [ ] `app/api/follow-up/[rid]/mail-sent/route.ts` - Mark mail sent
- [ ] `app/api/follow-up/[rid]/status/route.ts` - Get follow-up status

## 🧪 Testing Checklist

After migrating each API route, test:

### Authentication
- [ ] Agent role access
- [ ] Team Lead role access
- [ ] Admin role access
- [ ] Unauthorized access (should fail)

### Functionality
- [ ] GET requests work
- [ ] POST requests work
- [ ] PUT/PATCH requests work
- [ ] DELETE requests work (if applicable)
- [ ] Pagination works
- [ ] Search/filtering works
- [ ] Sorting works

### Data Integrity
- [ ] Data is correctly filtered by role
- [ ] Timestamps are set correctly
- [ ] Foreign keys are maintained
- [ ] JSONB fields are properly structured

### Performance
- [ ] Response times are acceptable
- [ ] Caching works (if implemented)
- [ ] No N+1 queries
- [ ] Indexes are being used

## 🎯 Migration Strategy

### Phase 1: Core Functionality (Week 1)
1. Migrate Churn APIs (highest traffic)
2. Migrate Visit APIs (critical for operations)
3. Test thoroughly with all roles

### Phase 2: Extended Features (Week 2)
1. Migrate Demo APIs
2. Migrate Health Check APIs
3. Migrate MOM APIs
4. Test workflows end-to-end

### Phase 3: Supporting Features (Week 3)
1. Migrate Master Data APIs
2. Migrate Follow-up APIs
3. Migrate CSV Upload APIs
4. Final integration testing

### Phase 4: Cleanup & Optimization (Week 4)
1. Remove any remaining Convex references
2. Optimize database queries
3. Add missing indexes if needed
4. Performance testing
5. Documentation updates

## 📊 Progress Tracking

### Overall Progress
- Services Created: 7/7 (100%)
- API Routes Migrated: 0/40+ (0%)
- Tests Passed: 0/40+ (0%)

### By Module
- Churn: 0/8 routes
- Visits: 0/6 routes
- Demos: 0/7 routes
- Health Checks: 0/5 routes
- MOMs: 0/6 routes
- Master Data: 0/2 routes
- Follow-ups: 0/4 routes
- CSV Upload: 0/2 routes

## 🚨 Critical Notes

1. **Database Connection**
   - Verify Supabase is accessible
   - Check connection pooling settings
   - Monitor connection limits

2. **Data Migration**
   - Backup existing data before migration
   - Use `convex_backups/` for reference
   - Verify data integrity after migration

3. **Role-Based Access**
   - All services implement role filtering
   - Test with each role type
   - Verify data isolation

4. **Error Handling**
   - Services throw errors - wrap in try-catch
   - Log errors for debugging
   - Return user-friendly messages

5. **Performance**
   - Monitor query performance
   - Add indexes if needed
   - Implement caching where appropriate

## 📝 Quick Reference

### Import Pattern
```typescript
import { churnService, visitService, demoService } from '@/lib/services';
```

### Service Call Pattern
```typescript
const result = await serviceName.functionName({
  email: userEmail,
  // ... other params
});
```

### Error Handling Pattern
```typescript
try {
  const result = await serviceName.functionName(params);
  return NextResponse.json({ success: true, data: result });
} catch (error) {
  console.error('Error:', error);
  return NextResponse.json({
    success: false,
    error: 'Operation failed',
    detail: String(error)
  }, { status: 500 });
}
```

## 🆘 Need Help?

1. Check `MIGRATION_SUPABASE.md` for detailed service documentation
2. Check `API_MIGRATION_EXAMPLE.md` for code examples
3. Review service files in `lib/services/` for function signatures
4. Check Supabase logs for database errors
5. Review `supabase_schema.sql` for table structures

## ✅ Sign-off

- [ ] All API routes migrated
- [ ] All tests passing
- [ ] Performance acceptable
- [ ] Documentation updated
- [ ] Team trained on new system
- [ ] Monitoring in place
- [ ] Rollback plan ready

---

**Migration Start Date:** February 12, 2026
**Target Completion:** March 12, 2026
**Status:** In Progress - Services Created, API Routes Pending
