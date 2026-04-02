# Revenue.csv Integration - Complete Implementation

## Problem
Revenue was showing ₹0 for all months because Revenue.csv data wasn't being loaded into the system.

## Solution
Complete end-to-end integration of Revenue.csv data through the entire application stack.

## Changes Made

### 1. CSV Parser (`lib/csv-parser.ts`)
Added `parseRevenueData()` method:
```typescript
async parseRevenueData(): Promise<RevenueRecord[]>
```
- Parses Revenue.csv with DD-MM-YYYY date format
- Handles column name variations ("Amount  " with spaces)
- Returns empty array if file not found (optional data)
- Filters out invalid records

### 2. CSV Loader (`lib/csv-loader.ts`)
- Added revenue records to parallel loading
- Returns `revenueRecords` in data object
- Logs count of loaded revenue records

### 3. Data Context (`lib/data-context.tsx`)
Added revenue records state management:
- `revenueRecords: RevenueRecord[]` state
- `setRevenueRecords()` setter
- `useRevenueRecords()` hook

### 4. Data Loader (`components/DataLoader.tsx`)
- Loads revenue records from API
- Deserializes date strings to Date objects
- Logs sample revenue record for debugging
- Sets revenue records in context

### 5. Milestone Generator (`lib/milestone-generator.ts`)
Updated constructor:
```typescript
constructor(prices: PriceRecord[], revenueRecords: RevenueRecord[] = [])
```
- Passes revenue records to RevenueCalculator
- Enables actual revenue calculations

### 6. Department Journey Page (`app/dashboard/key-accounts-department-journey/page.tsx`)
- Uses `useRevenueRecords()` hook
- Passes revenue records to MilestoneGenerator

### 7. Brand Journey Page (`app/dashboard/brand-journey/[brand_id]/page.tsx`)
- Uses `useRevenueRecords()` hook
- Passes revenue records to MilestoneGenerator

## Data Flow

```
Revenue.csv (Data folder)
    ↓
CSVParser.parseRevenueData()
    ↓
loadCSVData() in csv-loader
    ↓
/api/data endpoint
    ↓
DataLoader component
    ↓
Data Context (revenueRecords state)
    ↓
useRevenueRecords() hook
    ↓
MilestoneGenerator
    ↓
RevenueCalculator (with revenue records)
    ↓
Actual revenue calculations
    ↓
Milestone components display revenue
```

## Revenue Calculation Logic

### Historical Months (Apr 2025 - Jan 2026)
```typescript
calculateActualMonthlyRevenue(targetMonth: Date): RevenueBreakdown
```
1. Filter revenue records by target month
2. Categorize as New or Renewal based on product name
3. Sum amounts for each category
4. Return breakdown

### Future Months (Feb 2026+)
```typescript
calculateProjectedRevenue(brands, targetMonth): RevenueBreakdown
```
1. Check subscription expiry dates
2. If expiry > Jan 2026, assume renewal
3. Apply renewal pricing from Price Data CSV
4. Sum projected revenue

## Date Handling

### Revenue.csv Date Format
- Input: "DD-MM-YYYY" (e.g., "02-04-2025")
- Parsed by: `CSVParser.parseDate()`
- Output: JavaScript Date object

### Month Comparison
```typescript
const targetYear = targetMonth.getFullYear()
const targetMonthNum = targetMonth.getMonth() // 0-indexed
```

## Revenue Categorization

### New Revenue
Products WITHOUT "renewal" in name:
- "Android POS"
- "Pos subscription"
- "EBill"
- "Petpooja Purchase"

### Renewal Revenue
Products WITH "renewal" in name (case-insensitive):
- "Android POS - Renewal income"
- "POS Subscription - Renewal"
- "Petpooja Payroll - Renewal"

## Debugging

Console logs added for verification:
```
📊 Loaded X revenue records from Revenue.csv
Revenue record sample: {
  date: Date object,
  isDate: true,
  product: "Android POS",
  amount: 7500,
  restaurant_id: "375011"
}
```

## Testing

To verify the integration:
1. Check browser console for "📊 Loaded X revenue records"
2. Verify revenue records sample shows valid data
3. Check milestone cards show non-zero revenue
4. Verify New/Renewal breakdown is correct

## Expected Results

### April 2025 (Historical)
- Should show actual revenue from Revenue.csv
- New + Renewal = Total
- Values should match actual transactions

### Future Months (Feb 2026+)
- Should show projected revenue
- Based on subscription expiry dates
- Uses renewal pricing from Price Data CSV

## Files Modified

1. `lib/csv-parser.ts` - Added parseRevenueData()
2. `lib/csv-loader.ts` - Load revenue records
3. `lib/data-context.tsx` - Added revenue state
4. `components/DataLoader.tsx` - Load and deserialize revenue
5. `lib/milestone-generator.ts` - Accept revenue records
6. `app/dashboard/key-accounts-department-journey/page.tsx` - Pass revenue
7. `app/dashboard/brand-journey/[brand_id]/page.tsx` - Pass revenue

## Next Steps

If revenue still shows ₹0:
1. Check console for "📊 Loaded X revenue records" message
2. Verify Revenue.csv exists in Data folder
3. Check revenue record sample in console
4. Verify date format in Revenue.csv is DD-MM-YYYY
5. Check restaurant_id matching between Brand DATA CSV and Revenue.csv

## Notes

- Revenue.csv is optional - system works without it (uses projections only)
- Date parsing handles DD-MM-YYYY format specifically
- Amount column handles spaces in header name
- Restaurant IDs are trimmed and compared as strings
- All revenue amounts are in INR (Indian Rupees)
