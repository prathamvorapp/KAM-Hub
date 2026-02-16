# 🚀 Quick Reference Card - Supabase Migration

## 📦 Import Services

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

## 🔄 Common Patterns

### Get Data with Role Filtering
```typescript
const result = await churnService.getChurnData({
  email: userEmail,  // Required for role-based filtering
  page: 1,
  limit: 100,
  search: 'optional search term'
});
```

### Create Record
```typescript
const result = await churnService.createChurnRecord({
  date: '2026-02-12',
  rid: 'R12345',
  restaurant_name: 'Test Restaurant',
  // ... other fields
});
```

### Update Record
```typescript
const result = await churnService.updateChurnReason({
  rid: 'R12345',
  churn_reason: 'Temporarily Closed',
  remarks: 'Renovation',
  email: userEmail
});
```

### Get Statistics
```typescript
const stats = await churnService.getChurnStatistics(userEmail);
```

## 🎯 Service Quick Reference

### Churn Service
```typescript
// Get data
churnService.getChurnData({ email, page, limit, search })

// Update
churnService.updateChurnReason({ rid, churn_reason, remarks, email })

// Follow-ups
churnService.getFollowUpStatus(rid, email)
churnService.recordCallAttempt({ rid, call_response, notes, churn_reason, email })
churnService.getActiveFollowUps(kam, email)
churnService.getOverdueFollowUps(kam, email)

// Stats
churnService.getChurnStatistics(email)
```

### Visit Service
```typescript
// Get data
visitService.getVisitStatistics(email)
visitService.getVisits({ email, search, page, limit })

// Create/Update
visitService.createVisit(data)
visitService.updateVisitStatus({ visit_id, visit_status, visit_date })

// MOM
visitService.submitMoM(params)
visitService.updateMOMStatus({ visit_id, mom_shared })

// Approval
visitService.approveVisit({ visit_id, approver_email, approval_status })
visitService.resubmitMoM({ visit_id, agent_email })

// Reschedule
visitService.rescheduleVisit({ visit_id, new_scheduled_date, reason })
```

### Demo Service
```typescript
// Get data
demoService.getDemosForAgent({ agentId, role, teamName })
demoService.getDemoStatistics({ agentId, teamName, role })

// Workflow steps
demoService.setProductApplicability({ demoId, isApplicable })
demoService.setUsageStatus({ demoId, usageStatus })
demoService.scheduleDemo({ demoId, scheduledDate, scheduledTime })
demoService.completeDemo({ demoId, conductedBy })
demoService.setConversionDecision({ demoId, conversionStatus })
```

### Health Check Service
```typescript
// Get data
healthCheckService.getHealthChecks({ email, month, page, limit })
healthCheckService.getHealthCheckStatistics({ email, month })

// Assessment
healthCheckService.getBrandsForAssessment({ email, month })
healthCheckService.getAssessmentProgress({ email, month })

// Create/Update
healthCheckService.createHealthCheck(data)
healthCheckService.updateHealthCheck(checkId, data)
```

### MOM Service
```typescript
// Get data
momService.getMOMs({ email, visitId, status, page, limit })
momService.getMOMByTicketId(ticketId)
momService.getMOMStatistics(email)

// Create/Update
momService.createMOM(data)
momService.updateMOM(ticketId, data)
momService.updateOpenPointStatus({ ticketId, pointIndex, status })
```

### Master Data Service
```typescript
// Get data
masterDataService.getMasterData({ email, search, page, limit })
masterDataService.getBrandsByAgentEmail(email)
masterDataService.getBrandByEmail(brandEmail)
masterDataService.getMasterDataStatistics(email)

// Create/Update
masterDataService.createMasterData(data)
masterDataService.updateMasterData(id, data)
```

## 🔧 API Route Template

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { churnService } from '@/lib/services';

export async function GET(request: NextRequest) {
  try {
    // 1. Get user authentication
    const userEmail = request.headers.get('x-user-email');
    if (!userEmail) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // 2. Parse query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '100');

    // 3. Call service
    const result = await churnService.getChurnData({
      email: userEmail,
      page,
      limit
    });

    // 4. Return response
    return NextResponse.json({
      success: true,
      data: result.data,
      pagination: {
        page: result.page,
        total: result.total
      }
    });

  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Operation failed',
        detail: String(error)
      },
      { status: 500 }
    );
  }
}
```

## 🧪 Testing Commands

```bash
# Test Supabase connection
node scripts/test-supabase-connection.js

# Start dev server
npm run dev

# Test API endpoint
curl http://localhost:3022/api/churn

# Test with headers
curl -H "x-user-email: test@example.com" \
     -H "x-user-role: Agent" \
     http://localhost:3022/api/churn
```

## 🔐 Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=https://qvgnrdarwsnweizifech.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIs...
SUPABASE_JWT_SECRET=TYd5bWqVJgLH6CtsT3sX...
```

## 📊 Database Tables

```
user_profiles          - User authentication
master_data            - Brand/restaurant data
churn_records          - Churn tracking
visits                 - Visit management
demos                  - Product demos
health_checks          - Health assessments
mom                    - Minutes of Meeting
notification_preferences - User settings
notification_log       - Notification history
```

## 🎯 Role-Based Access

```typescript
// Agent - sees only their data
email: 'agent@example.com'
role: 'Agent'

// Team Lead - sees team data
email: 'lead@example.com'
role: 'Team Lead'
team_name: 'Team A'

// Admin - sees all data
email: 'admin@example.com'
role: 'Admin'
```

## ⚡ Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| "Authentication required" | No user email | Pass email in headers/params |
| "Table does not exist" | Schema not applied | Run supabase_schema.sql |
| "Permission denied" | RLS blocking | Use supabaseAdmin |
| "Invalid UUID" | Passing id on insert | Remove id field |
| "Cannot read property" | Wrong return structure | Check service response |

## 📚 Documentation Files

```
MIGRATION_README.md        - Start here
MIGRATION_SUPABASE.md      - Complete reference
API_MIGRATION_EXAMPLE.md   - Code examples
MIGRATION_CHECKLIST.md     - Track progress
MIGRATION_SUMMARY.md       - Overview
QUICK_REFERENCE.md         - This file
```

## 🚀 Migration Steps

1. ✅ Verify Supabase connection
2. ⏳ Update API route imports
3. ⏳ Replace service calls
4. ⏳ Test with all roles
5. ⏳ Verify data persistence
6. ⏳ Check error handling
7. ⏳ Performance test

## 💡 Pro Tips

- Always pass `email` for role-based filtering
- Use object parameters `{ email, page, limit }`
- Wrap service calls in try-catch
- Check return structure before mapping
- Test with Agent, Team Lead, and Admin roles
- Use `supabaseAdmin` for operations that bypass RLS
- Don't pass `id` field for inserts (auto-generated)
- JSONB fields need proper JSON structure

## 🆘 Quick Help

```bash
# Connection issues?
node scripts/test-supabase-connection.js

# Need examples?
cat API_MIGRATION_EXAMPLE.md

# Check service functions?
cat MIGRATION_SUPABASE.md

# Track progress?
cat MIGRATION_CHECKLIST.md
```

---

**Keep this file handy while migrating!** 📌
