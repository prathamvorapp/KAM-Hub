# Captain_Application November 2025 Revenue Fix

## Issue
Captain_Application created on 21-11-2025 (November 21, 2025) for restaurant 14289 was not showing revenue in November 2025.

## Root Causes

### 1. Date Format Parsing Issue
The CSV data uses DD-MM-YYYY format (e.g., "21-11-2025"), but the parser was only handling standard JavaScript date formats.

### 2. Cross-Reference Data Loss
When consolidating multiple outlet records for the same brand (email), the `crossReference()` method was only keeping the first record's subscription data, losing service subscriptions from other records.

## Solutions Implemented

### 1. Enhanced Date Parsing (`lib/csv-parser.ts`)
Updated `parseDate()` method to handle DD-MM-YYYY format:

```typescript
private parseDate(dateStr: string | undefined | null, recordId?: string, fieldName?: string): Date | null {
  if (!dateStr || dateStr.trim() === '') {
    return null
  }
  
  // Try standard Date parsing first
  let date = new Date(dateStr)
  
  // If that fails, try DD-MM-YYYY format
  if (isNaN(date.getTime())) {
    const ddmmyyyyMatch = dateStr.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/)
    if (ddmmyyyyMatch) {
      const day = parseInt(ddmmyyyyMatch[1], 10)
      const month = parseInt(ddmmyyyyMatch[2], 10) - 1 // Month is 0-indexed
      const year = parseInt(ddmmyyyyMatch[3], 10)
      date = new Date(year, month, day)
    }
  }
  
  // Final validation
  if (isNaN(date.getTime())) {
    if (recordId && fieldName) {
      this.warnings.push(`Invalid date format in ${fieldName} for record ${recordId}: "${dateStr}"`)
    }
    return null
  }
  
  return date
}
```

### 2. Improved Cross-Reference Merging (`lib/csv-parser.ts`)
Updated `crossReference()` method to merge subscription data from all brand records:

```typescript
// Merge subscription data from all records
// For each subscription field, use the first non-empty value found
const subscriptionFields = [
  'Petpooja_Tasks', 'Petpooja_Payroll',
  'Captain_Application', 'Petpooja_Pay', 'Petpooja_Connect',
  // ... all subscription fields
]

for (const field of subscriptionFields) {
  const statusField = `${field}_status`
  const creationField = `${field}_creation`
  const expiryField = `${field}_expiry`
  
  // Find the first record with active status for this subscription
  for (const record of brandRecords) {
    const recordAny = record as any
    const status = recordAny[statusField]
    if (status && typeof status === 'string' && status.toLowerCase() === 'active') {
      const baseAny = baseBrand as any
      baseAny[statusField] = recordAny[statusField]
      baseAny[creationField] = recordAny[creationField]
      baseAny[expiryField] = recordAny[expiryField]
      break // Use the first active subscription found
    }
  }
}
```

## Verification

### Test Results
- All 47 tests passing
- November 2025 revenue now shows:
  - Products: ₹2,63,000
  - Services: ₹4,500 (Captain_Application)
  - Bundles: ₹10,000
  - Total: ₹2,77,500

### Data Verification
- Restaurant: 14289
- Email: 7thheavenpetpooja@gmail.com
- Captain_Application_status: active
- Captain_Application_creation: 21-11-2025
- Captain_Application_expiry: 2026-11-21
- Captain_Application price: ₹4,500

## Impact
- Services and products with DD-MM-YYYY date format now parse correctly
- Multi-outlet brands now properly consolidate all subscription data
- Revenue calculations now include all active subscriptions across all outlets
