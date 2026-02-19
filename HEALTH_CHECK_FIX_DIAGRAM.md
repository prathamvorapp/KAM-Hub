# Health Check Fix - Visual Explanation

## Problem Illustration

### Before Fix (BROKEN)

```
Database State:
┌─────────────────────────────────────────────────────────────┐
│ master_data table                                           │
├─────────────────────────────────────────────────────────────┤
│ brand_name    │ kam_email_id                                │
├───────────────┼─────────────────────────────────────────────┤
│ "Brand X"     │ agent-a@example.com                         │
│ "Brand X"     │ agent-b@example.com  ← Same brand name!     │
│ "Brand Y"     │ agent-a@example.com                         │
│ "Brand Z"     │ agent-b@example.com                         │
└───────────────┴─────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ health_checks table (February 2026)                         │
├─────────────────────────────────────────────────────────────┤
│ brand_name    │ kam_email                                   │
├───────────────┼─────────────────────────────────────────────┤
│ "Brand X"     │ agent-a@example.com  ← Agent A assessed     │
└───────────────┴─────────────────────────────────────────────┘

Old Filtering Logic:
┌─────────────────────────────────────────────────────────────┐
│ Step 1: Get all brands for Agent B                          │
│   Result: ["Brand X", "Brand Z"]                            │
│                                                              │
│ Step 2: Get assessed brands (ANY agent)                     │
│   Result: Set { "brand x" }  ← Only brand names!            │
│                                                              │
│ Step 3: Filter out assessed brands                          │
│   "Brand X" → normalized to "brand x" → IN SET → EXCLUDED ❌│
│   "Brand Z" → normalized to "brand z" → NOT IN SET → KEPT ✅│
│                                                              │
│ Final Result for Agent B: ["Brand Z"]                       │
│                                                              │
│ ❌ PROBLEM: Agent B can't see "Brand X" even though         │
│    they haven't assessed it yet!                            │
└─────────────────────────────────────────────────────────────┘

UI Result for Agent B:
┌─────────────────────────────────────────────────────────────┐
│ Assessment Progress                                          │
│   Total: 2                                                   │
│   Completed: 0                                               │
│   Remaining: 2  ← Says 2 remaining...                        │
│                                                              │
│ Brands Pending Assessment (1)  ← But only shows 1!          │
│   ┌─────────────┐                                           │
│   │  Brand Z    │                                           │
│   └─────────────┘                                           │
│                                                              │
│ ❌ "Brand X" is missing!                                     │
└─────────────────────────────────────────────────────────────┘
```

### After Fix (WORKING)

```
New Filtering Logic:
┌─────────────────────────────────────────────────────────────┐
│ Step 1: Get all brands for Agent B                          │
│   Result: ["Brand X", "Brand Z"]                            │
│                                                              │
│ Step 2: Get assessed brands with KAM email                  │
│   Result: Map {                                             │
│     "agent-a@example.com:brand x" => true                   │
│   }                                                          │
│   ↑ Composite key: kam_email + brand_name                   │
│                                                              │
│ Step 3: Filter using composite key                          │
│   "Brand X" → key: "agent-b@example.com:brand x"            │
│            → NOT IN MAP → KEPT ✅                            │
│   "Brand Z" → key: "agent-b@example.com:brand z"            │
│            → NOT IN MAP → KEPT ✅                            │
│                                                              │
│ Final Result for Agent B: ["Brand X", "Brand Z"]            │
│                                                              │
│ ✅ FIXED: Agent B sees both brands!                          │
└─────────────────────────────────────────────────────────────┘

UI Result for Agent B:
┌─────────────────────────────────────────────────────────────┐
│ Assessment Progress                                          │
│   Total: 2                                                   │
│   Completed: 0                                               │
│   Remaining: 2  ← Correct count                              │
│                                                              │
│ Brands Pending Assessment (2)  ← Shows both!                │
│   ┌─────────────┐  ┌─────────────┐                         │
│   │  Brand X    │  │  Brand Z    │                         │
│   └─────────────┘  └─────────────┘                         │
│                                                              │
│ ✅ Both brands are visible!                                  │
└─────────────────────────────────────────────────────────────┘
```

## Code Comparison

### Before (BROKEN)

```typescript
// ❌ Only stores brand names
const assessedBrandNamesNormalized = new Set(
  assessedChecks?.map(c => c.brand_name?.trim().toLowerCase()) || []
);
// Result: Set { "brand x", "brand y" }

// ❌ Filters without considering KAM
const brandsForAssessment = allBrands?.filter(brand => {
  const normalizedBrandName = brand.brand_name?.trim().toLowerCase();
  return !assessedBrandNamesNormalized.has(normalizedBrandName);
}) || [];
```

### After (FIXED)

```typescript
// ✅ Stores KAM email + brand name
const assessedBrandsMap = new Map<string, boolean>();
assessedChecks?.forEach(check => {
  const normalizedBrandName = check.brand_name?.trim().toLowerCase();
  const key = `${check.kam_email}:${normalizedBrandName}`;
  assessedBrandsMap.set(key, true);
});
// Result: Map { 
//   "agent-a@example.com:brand x" => true,
//   "agent-a@example.com:brand y" => true
// }

// ✅ Filters using composite key
const brandsForAssessment = allBrands.filter(brand => {
  const normalizedBrandName = brand.brand_name?.trim().toLowerCase();
  const kamEmail = brand.kam_email_id;
  const key = `${kamEmail}:${normalizedBrandName}`;
  return !assessedBrandsMap.has(key);
});
```

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    User Opens Health Check Page             │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              Frontend: app/dashboard/health-checks/page.tsx │
│                                                              │
│  1. Fetch brands for assessment                             │
│     GET /api/data/health-checks/brands-for-assessment       │
│                                                              │
│  2. Fetch progress                                          │
│     GET /api/data/health-checks/progress                    │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│         API Route: brands-for-assessment/route.ts           │
│                                                              │
│  1. Authenticate user                                       │
│  2. Check cache (with cache buster)                         │
│  3. Call healthCheckService.getBrandsForAssessment()        │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│      Service: lib/services/healthCheckService.ts            │
│                                                              │
│  getBrandsForAssessment():                                  │
│                                                              │
│  1. Query master_data for user's brands                     │
│     ┌─────────────────────────────────────────┐            │
│     │ SELECT * FROM master_data                │            │
│     │ WHERE kam_email_id = 'agent@example.com' │            │
│     └─────────────────────────────────────────┘            │
│                                                              │
│  2. Query health_checks for assessed brands                 │
│     ┌─────────────────────────────────────────┐            │
│     │ SELECT brand_name, kam_email             │            │
│     │ FROM health_checks                       │            │
│     │ WHERE kam_email = 'agent@example.com'    │            │
│     │   AND assessment_month = '2026-02'       │            │
│     └─────────────────────────────────────────┘            │
│                                                              │
│  3. Create Map with composite keys                          │
│     ┌─────────────────────────────────────────┐            │
│     │ Map {                                    │            │
│     │   "agent@example.com:brand x" => true,   │            │
│     │   "agent@example.com:brand y" => true    │            │
│     │ }                                        │            │
│     └─────────────────────────────────────────┘            │
│                                                              │
│  4. Filter brands using composite key                       │
│     ┌─────────────────────────────────────────┐            │
│     │ For each brand in master_data:           │            │
│     │   key = kam_email + ":" + brand_name     │            │
│     │   if NOT in Map: include in result       │            │
│     └─────────────────────────────────────────┘            │
│                                                              │
│  5. Return filtered brands                                  │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                    Frontend Displays Brands                 │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Brand A    │  │   Brand B    │  │   Brand C    │     │
│  │              │  │              │  │              │     │
│  │ Click to     │  │ Click to     │  │ Click to     │     │
│  │ assess       │  │ assess       │  │ assess       │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
```

## Key Concepts

### 1. Composite Key
```
Instead of:     "brand x"
We now use:     "agent@example.com:brand x"
                 ↑                  ↑
                 KAM email          Brand name
```

### 2. Agent Isolation
```
Agent A's View:
  Sees: Brands assigned to Agent A
  Excludes: Brands assessed by Agent A

Agent B's View:
  Sees: Brands assigned to Agent B
  Excludes: Brands assessed by Agent B

✅ Agent A and Agent B are independent!
```

### 3. Case-Insensitive Matching
```
Database:       "Brand X"
Normalized:     "brand x"
Comparison:     Always lowercase + trimmed

This ensures:
  "Brand X" = "brand x" = " Brand X " = "BRAND X"
```

## Real-World Example

### Scenario
- 50 brands in master_data for Agent "Jinal Chavda"
- 1 brand already assessed in February 2026
- Expected: 49 brands should appear in Assessment tab

### Before Fix
```
Query 1: Get all brands for Jinal
  → Returns 50 brands

Query 2: Get assessed brands (any agent)
  → Returns 1 brand name: "1By2 RR Donnelley"

Filter: Remove "1By2 RR Donnelley" from list
  → Problem: If another agent also has this brand,
    it gets removed for them too!

Result: Inconsistent counts
```

### After Fix
```
Query 1: Get all brands for Jinal
  → Returns 50 brands

Query 2: Get assessed brands with KAM email
  → Returns: [
      { brand_name: "1By2 RR Donnelley", 
        kam_email: "jinal.chavda@example.com" }
    ]

Create Map:
  → Map { "jinal.chavda@example.com:1by2 rr donnelley" => true }

Filter: For each brand, check if 
  "jinal.chavda@example.com:{brand_name}" is in Map
  → Only removes brands assessed by Jinal

Result: 49 brands correctly shown ✅
```

## Summary

**Problem:** Cross-agent contamination in brand filtering
**Solution:** Use composite keys (KAM email + brand name)
**Result:** Each agent sees only their own pending brands

**Impact:**
- ✅ Correct brand counts
- ✅ Agent isolation
- ✅ Accurate progress tracking
- ✅ No cross-agent interference
