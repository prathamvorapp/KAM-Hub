# Revenue Amount Parsing Fix

## Problem
Revenue was showing ₹0 for all months even though 25,995 revenue records were loaded.

## Root Cause
The CSV header in Revenue.csv has whitespace in the column name:
```
Date,Product Or service Name, Amount  ,restaurant_id
                              ^^^^^^^^
                              Leading space + trailing spaces
```

The actual header is `" Amount  "` (with spaces), but the code was trying to access `row['Amount']` which returned `undefined`, resulting in amount = 0.

## Console Evidence
```javascript
Revenue record sample: {
  amount: 0,  // ← Should be 7500!
  date: Wed Apr 02 2025,
  product: "Android POS",
  restaurant_id: "375011"
}
```

## Solution
Added `transformHeader` option to Papa Parse configuration:

```typescript
const result = Papa.parse<any>(fileContent, {
  header: true,
  skipEmptyLines: true,
  transformHeader: (header: string) => {
    // Trim whitespace from headers to handle " Amount  " -> "Amount"
    return header.trim()
  }
})
```

This automatically trims all header names during parsing:
- `" Amount  "` → `"Amount"`
- `"Date"` → `"Date"` (no change)
- `"Product Or service Name"` → `"Product Or service Name"` (no change)
- `"restaurant_id"` → `"restaurant_id"` (no change)

## Impact
Now the amount parsing works correctly:
```typescript
const amountStr = row['Amount']  // Now correctly accesses the trimmed header
const amount = parseFloat(String(amountStr).replace(/,/g, '').trim()) || 0
```

## Expected Results
After this fix:
- April 2025 revenue should show actual amounts from Revenue.csv
- New and Renewal revenue should be properly calculated
- Total revenue should be sum of New + Renewal

## Verification
Check console logs for:
```
Row 0 amount parsing: {
  raw: "7500",
  parsed: 7500,  // ← Should now be non-zero
  productName: "Android POS"
}
```

## Files Modified
- `lib/csv-parser.ts` - Added transformHeader to parseRevenueData()

## Additional Debug Logging
Added console logs to help diagnose:
1. First row keys to see actual column names
2. First 3 rows amount parsing details
3. Product names for verification

These can be removed once verified working.
