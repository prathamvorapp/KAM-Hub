# Churn Count Matching - Visual Diagram

## Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    API: /api/data/master-data/comprehensive      │
└─────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
        ┌─────────────────────────────────────────────┐
        │  Step 1: Fetch ALL Data in Batches (1000)  │
        └─────────────────────────────────────────────┘
                                  │
                ┌─────────────────┴─────────────────┐
                ▼                                   ▼
    ┌───────────────────────┐         ┌───────────────────────┐
    │   master_data table   │         │ churn_records table   │
    │                       │         │                       │
    │ • brand_name          │         │ • restaurant_name     │
    │ • brand_email_id      │         │ • brand_name          │
    │ • kam_email_id        │         │ • owner_email         │
    │ • zone, state, etc.   │         │ • rid, kam, etc.      │
    └───────────────────────┘         └───────────────────────┘
                │                                   │
                └─────────────────┬─────────────────┘
                                  ▼
        ┌─────────────────────────────────────────────┐
        │  Step 2: For Each Brand, Find Matches      │
        └─────────────────────────────────────────────┘
                                  │
                                  ▼
```

## Matching Logic (OR Condition)

```
For Brand: "Pizza Hut" (email: contact@pizzahut.com)
                                  │
                                  ▼
        ┌─────────────────────────────────────────────┐
        │   Search ALL churn_records for matches      │
        └─────────────────────────────────────────────┘
                                  │
        ┌─────────────────────────┼─────────────────────────┐
        │                         │                         │
        ▼                         ▼                         ▼
┌───────────────┐       ┌───────────────┐       ┌───────────────┐
│  Match Type 1 │       │  Match Type 2 │       │  Match Type 3 │
│               │       │               │       │               │
│ restaurant_   │  OR   │  brand_name   │  OR   │ owner_email   │
│ name          │       │               │       │               │
│ ==            │       │ ==            │       │ ==            │
│ brand_name    │       │ brand_name    │       │ brand_email_id│
│               │       │               │       │               │
│ "pizza hut"   │       │ "PIZZA HUT"   │       │ "contact@     │
│ (case-        │       │ (case-        │       │ pizzahut.com" │
│ insensitive)  │       │ insensitive)  │       │ (case-        │
│               │       │               │       │ insensitive)  │
└───────┬───────┘       └───────┬───────┘       └───────┬───────┘
        │                       │                       │
        └───────────────────────┼───────────────────────┘
                                ▼
                        ┌───────────────┐
                        │  ANY Match?   │
                        │   YES = ✅    │
                        │   NO  = ❌    │
                        └───────┬───────┘
                                ▼
                        ┌───────────────┐
                        │ Count Matches │
                        │ churn_count   │
                        └───────────────┘
```

## Example: Brand with 3 Churns

```
┌──────────────────────────────────────────────────────────────────┐
│                        Master Data Record                         │
├──────────────────────────────────────────────────────────────────┤
│ brand_name: "Starbucks"                                          │
│ brand_email_id: "info@starbucks.com"                             │
└──────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
        ┌─────────────────────────────────────────────┐
        │   Scan ALL churn_records (e.g., 416 total)  │
        └─────────────────────────────────────────────┘
                                  │
        ┌─────────────────────────┼─────────────────────────┐
        │                         │                         │
        ▼                         ▼                         ▼
┌───────────────┐       ┌───────────────┐       ┌───────────────┐
│ Churn Record 1│       │ Churn Record 2│       │ Churn Record 3│
├───────────────┤       ├───────────────┤       ├───────────────┤
│ restaurant_   │       │ restaurant_   │       │ restaurant_   │
│ name:         │       │ name:         │       │ name:         │
│ "Starbucks"   │       │ "starbucks"   │       │ "Other Store" │
│               │       │               │       │               │
│ owner_email:  │       │ owner_email:  │       │ owner_email:  │
│ "other@.com"  │       │ "diff@.com"   │       │ "info@        │
│               │       │               │       │ starbucks.com"│
│               │       │               │       │               │
│ ✅ Match via  │       │ ✅ Match via  │       │ ✅ Match via  │
│ restaurant_   │       │ restaurant_   │       │ owner_email   │
│ name          │       │ name          │       │               │
└───────────────┘       └───────────────┘       └───────────────┘
        │                       │                       │
        └───────────────────────┼───────────────────────┘
                                ▼
                        ┌───────────────┐
                        │ churn_count=3 │
                        └───────────────┘
```

## Churn Count Range Filter Flow

```
┌──────────────────────────────────────────────────────────────────┐
│                    User Sets Filter Values                        │
├──────────────────────────────────────────────────────────────────┤
│ Min: 2                                                            │
│ Max: 5                                                            │
└──────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
        ┌─────────────────────────────────────────────┐
        │   Filter Applied to ALL Records             │
        └─────────────────────────────────────────────┘
                                  │
        ┌─────────────────────────┼─────────────────────────┐
        │                         │                         │
        ▼                         ▼                         ▼
┌───────────────┐       ┌───────────────┐       ┌───────────────┐
│   Brand A     │       │   Brand B     │       │   Brand C     │
│ churn_count=1 │       │ churn_count=3 │       │ churn_count=7 │
│               │       │               │       │               │
│ 1 < 2         │       │ 2 ≤ 3 ≤ 5     │       │ 7 > 5         │
│ ❌ Filtered   │       │ ✅ Shown      │       │ ❌ Filtered   │
│ Out           │       │               │       │ Out           │
└───────────────┘       └───────────────┘       └───────────────┘
```

## Filter Combinations

```
┌─────────────────────────────────────────────────────────────────┐
│                    Filter Scenarios                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. Min: 5, Max: empty                                          │
│     ├─ Shows: churn_count ≥ 5                                   │
│     └─ Example: 5, 6, 7, 8, 9, 10, ...                          │
│                                                                  │
│  2. Min: empty, Max: 3                                          │
│     ├─ Shows: churn_count ≤ 3                                   │
│     └─ Example: 0, 1, 2, 3                                      │
│                                                                  │
│  3. Min: 2, Max: 8                                              │
│     ├─ Shows: 2 ≤ churn_count ≤ 8                               │
│     └─ Example: 2, 3, 4, 5, 6, 7, 8                             │
│                                                                  │
│  4. Min: 0, Max: 0                                              │
│     ├─ Shows: churn_count = 0                                   │
│     └─ Example: Only brands with NO churns                      │
│                                                                  │
│  5. Min: empty, Max: empty                                      │
│     ├─ Shows: ALL brands                                        │
│     └─ Example: No filter applied                               │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Complete Data Processing Pipeline

```
┌─────────────────────────────────────────────────────────────────┐
│                         START                                    │
└─────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│ 1. Fetch master_data (ALL records in batches)                   │
│    Result: 1234 brands                                           │
└─────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│ 2. Fetch user_profiles (for team_name)                          │
│    Result: Map of kam_email → team_name                         │
└─────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│ 3. Fetch health_checks (ALL records in batches)                 │
│    Result: 598 health check records                             │
└─────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│ 4. Fetch visits (ALL records in batches)                        │
│    Result: 72 visit records                                     │
└─────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│ 5. Fetch churn_records (ALL records in batches)                 │
│    Result: 416 churn records                                    │
└─────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│ 6. Fetch demos (ALL records in batches)                         │
│    Result: 1567 demo records                                    │
└─────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│ 7. FOR EACH BRAND (1234 iterations):                            │
│    a. Get team_name from user_profiles map                      │
│    b. Filter health_checks → count & get last                   │
│    c. Filter visits → count & get last                          │
│    d. Filter churn_records → count & get last RID              │
│    e. Filter demos → count completed & get last                 │
│    f. Build comprehensive record object                         │
└─────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│ 8. Return comprehensive data array (1234 records)               │
└─────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│ 9. Frontend applies filters (search, KAM, team, zone, state,    │
│    health status, brand nature, churn count range)              │
└─────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│ 10. Display filtered results in table                           │
└─────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                          END                                     │
└─────────────────────────────────────────────────────────────────┘
```
