# Master Data - Churn Count Logic Documentation

## Overview
This document explains how the churn count is calculated for each brand in the Master Data section of the CRM page.

## Data Sources

### 1. Master Data Table (`master_data`)
Contains brand information:
- `id` - Brand unique identifier
- `brand_name` - Name of the brand
- `brand_email_id` - Email of the brand
- `kam_email_id` - KAM assigned to the brand
- Other fields: zone, state, outlet_counts, etc.

### 2. Churn Records Table (`churn_records`)
Contains churn information:
- `id` - Churn record unique identifier
- `restaurant_name` - Name of the restaurant (may match brand_name)
- `brand_name` - Brand name field in churn record
- `owner_email` - Email of the restaurant owner
- `rid` - Restaurant ID
- `kam` - KAM handling the churn
- Other fields: churn_reason, date, zone, etc.

## Churn Count Calculation Logic

### Step 1: Fetch All Data
The API fetches ALL records from both tables in batches of 1000:

```typescript
// Fetch all master data
const masterData = await fetchAllRecords('master_data', 'brand_name');

// Fetch all churn records
const churnRecords = await fetchAllRecords('churn_records', 'created_at');
```

### Step 2: Match Brands with Churn Records
For each brand in `master_data`, we search for matching records in `churn_records` using THREE possible matches:

```typescript
const brandNameLower = brand.brand_name?.toLowerCase() || '';
const brandEmailLower = brand.brand_email_id?.toLowerCase() || '';

const brandChurns = churnRecords.filter((c: any) => {
  // Match 1: restaurant_name matches brand_name
  const restaurantMatch = c.restaurant_name?.toLowerCase() === brandNameLower;
  
  // Match 2: brand_name field matches brand_name
  const brandMatch = c.brand_name?.toLowerCase() === brandNameLower;
  
  // Match 3: owner_email matches brand_email_id
  const emailMatch = c.owner_email?.toLowerCase() === brandEmailLower;
  
  // Return true if ANY match is found
  return restaurantMatch || brandMatch || emailMatch;
});
```

### Step 3: Count the Matches
```typescript
const churnCount = brandChurns.length;
```

## Matching Rules

### Rule 1: Restaurant Name Match
- **Churn Field**: `restaurant_name`
- **Master Data Field**: `brand_name`
- **Match Type**: Case-insensitive exact match
- **Example**: 
  - Master Data: `brand_name = "Pizza Hut"`
  - Churn Record: `restaurant_name = "pizza hut"`
  - **Result**: ✅ Match

### Rule 2: Brand Name Match
- **Churn Field**: `brand_name`
- **Master Data Field**: `brand_name`
- **Match Type**: Case-insensitive exact match
- **Example**:
  - Master Data: `brand_name = "Domino's"`
  - Churn Record: `brand_name = "DOMINO'S"`
  - **Result**: ✅ Match

### Rule 3: Email Match
- **Churn Field**: `owner_email`
- **Master Data Field**: `brand_email_id`
- **Match Type**: Case-insensitive exact match
- **Example**:
  - Master Data: `brand_email_id = "contact@brand.com"`
  - Churn Record: `owner_email = "Contact@Brand.com"`
  - **Result**: ✅ Match

## Important Notes

1. **OR Logic**: A churn record matches if ANY of the three conditions are true
2. **Case Insensitive**: All comparisons are case-insensitive
3. **Exact Match**: Partial matches are NOT counted (e.g., "Pizza" won't match "Pizza Hut")
4. **Multiple Matches**: If a brand has multiple churn records, all are counted
5. **No Duplicates**: Each churn record is counted only once per brand

## Example Scenarios

### Scenario 1: Single Match Type
```
Master Data:
  brand_name: "Starbucks"
  brand_email_id: "info@starbucks.com"

Churn Records:
  Record 1: restaurant_name = "Starbucks", owner_email = "other@email.com"
  Record 2: restaurant_name = "Starbucks", owner_email = "another@email.com"

Result: churn_count = 2 (both match via restaurant_name)
```

### Scenario 2: Multiple Match Types
```
Master Data:
  brand_name: "McDonald's"
  brand_email_id: "contact@mcdonalds.com"

Churn Records:
  Record 1: restaurant_name = "McDonald's", owner_email = "other@email.com"
  Record 2: brand_name = "McDonald's", owner_email = "different@email.com"
  Record 3: restaurant_name = "Other Restaurant", owner_email = "contact@mcdonalds.com"

Result: churn_count = 3 (all three match via different fields)
```

### Scenario 3: No Match
```
Master Data:
  brand_name: "Subway"
  brand_email_id: "info@subway.com"

Churn Records:
  Record 1: restaurant_name = "KFC", owner_email = "kfc@email.com"
  Record 2: restaurant_name = "Burger King", owner_email = "bk@email.com"

Result: churn_count = 0 (no matches found)
```

## Churn Count Range Filter

The Master Data tab includes a range filter for churn count:

### Filter Options:
1. **Min Only**: Shows brands with churn_count >= min value
2. **Max Only**: Shows brands with churn_count <= max value
3. **Min and Max**: Shows brands with min <= churn_count <= max
4. **No Filter**: Shows all brands regardless of churn count

### Filter Logic:
```typescript
const churnCount = record.churn_count || 0;
const minChurn = churnCountMin ? parseInt(churnCountMin) : null;
const maxChurn = churnCountMax ? parseInt(churnCountMax) : null;

if (minChurn !== null && churnCount < minChurn) return false;
if (maxChurn !== null && churnCount > maxChurn) return false;
```

### Examples:
- **Min: 5, Max: empty** → Shows brands with 5 or more churns
- **Min: empty, Max: 10** → Shows brands with 10 or fewer churns
- **Min: 3, Max: 8** → Shows brands with 3 to 8 churns
- **Min: 0, Max: 0** → Shows brands with exactly 0 churns

## Performance Considerations

1. **Batch Fetching**: All data is fetched in batches of 1000 to handle large datasets
2. **In-Memory Filtering**: Matching is done in memory after fetching all data
3. **Case Conversion**: Lowercase conversion is done once per brand for efficiency
4. **Filter Optimization**: Filters are applied using useMemo to prevent unnecessary recalculations

## API Endpoint

**URL**: `/api/data/master-data/comprehensive`

**Method**: GET

**Response Format**:
```json
{
  "success": true,
  "data": [
    {
      "brand_name": "Pizza Hut",
      "brand_email_id": "contact@pizzahut.com",
      "kam_name": "John Doe",
      "kam_email_id": "john@company.com",
      "brand_state": "California",
      "zone": "West",
      "team_name": "Team A",
      "outlet_count": 25,
      "last_health_status": "Healthy",
      "last_brand_nature": "Active",
      "health_check_count": 5,
      "last_health_check_date": "2024-03-01",
      "visit_count": 12,
      "last_visit_date": "2024-03-10",
      "churn_count": 3,
      "last_rid_in_churn": "RID12345",
      "demo_done_count": 8,
      "last_demo_date": "2024-03-05",
      "brand_id": "uuid-here"
    }
  ]
}
```

## Troubleshooting

### Issue: Churn count seems incorrect
**Check**:
1. Verify brand_name spelling matches exactly (case-insensitive)
2. Check if brand_email_id matches owner_email in churn records
3. Look for the brand_name field in churn_records table
4. Ensure churn_records table name is correct (not just "churn")

### Issue: Some churns not counted
**Possible Causes**:
1. Spelling differences (e.g., "McDonald's" vs "McDonalds")
2. Extra spaces in names
3. Different email addresses used
4. Churn record has none of the three matching fields

### Issue: Too many churns counted
**Possible Causes**:
1. Multiple churn records for the same incident
2. Brand name is too generic (e.g., "Restaurant")
3. Email address is shared across multiple brands
