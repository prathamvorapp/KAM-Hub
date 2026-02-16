# Batch Migration Guide

## Pattern for All Data API Routes

### Step 1: Replace Imports

**OLD:**
```typescript
import { ConvexHttpClient } from 'convex/browser';
import { api } from '@/convex/_generated/api';

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
```

**NEW:**
```typescript
import { masterDataService, visitService, demoService, healthCheckService, momService } from '@/lib/services';
```

### Step 2: Replace Function Calls

#### Master Data Routes
```typescript
// OLD
const result = await convex.query(api.Master_Data.getMasterData, { email });

// NEW
const result = await masterDataService.getMasterData({ email });
```

#### Visit Routes
```typescript
// OLD
const result = await convex.query(api.visits.getVisitStatistics, { email });

// NEW
const result = await visitService.getVisitStatistics(email);
```

#### Demo Routes
```typescript
// OLD
const result = await convex.query(api.demos.getDemosForAgent, { agentId, role, teamName });

// NEW
const result = await demoService.getDemosForAgent({ agentId, role, teamName });
```

#### Health Check Routes
```typescript
// OLD
const result = await convex.query(api.health_checks.getHealthChecks, { email, month });

// NEW
const result = await healthCheckService.getHealthChecks({ email, month });
```

#### MOM Routes
```typescript
// OLD
const result = await convex.query(api.MOM.getMOMs, { email });

// NEW
const result = await momService.getMOMs({ email });
```

## Quick Migration Commands

For each file, do:
1. Remove Convex imports
2. Add service imports
3. Replace convex.query/mutation calls with service calls
4. Test the route

## Files to Migrate (Priority Order)

### High Priority (Core Functionality)
1. Master Data routes (2 files)
2. Visit statistics routes (5 files)
3. Demo routes (7 files)

### Medium Priority
1. Health Check routes (5 files)
2. MOM routes (6 files)

### Low Priority
1. CSV Upload (2 files)
2. Follow-up routes (4 files)

---

**Total Routes to Migrate:** 31 files
**Estimated Time:** 2-3 hours for manual migration
**Alternative:** Use find-and-replace with careful testing
