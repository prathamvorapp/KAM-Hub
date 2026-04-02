# Outlet Count Calculation Fix - COMPLETED ✓

## Issue
The outlet count was declining sharply in projected months:
- January 2026: 945 outlets (realized)
- February 2026: 949 outlets (projected)
- March 2026: 922 outlets (declining!)
- April 2026: 860 outlets (declining!)
- May 2026: 804 outlets (declining!)
- June 2026: 729 outlets (declining!)

## Root Cause
The `calculateOutletCount` method in `lib/metrics-calculator.ts` had a critical logic issue:

### Renewal Assumption Only Worked for Current Month
The renewal assumption (`assumeRenewal=true`) was only working for outlets expiring IN the current target month. Outlets that expired in PREVIOUS projected months were being excluded from subsequent months.

**Example Problem**:
- An outlet expiring in February 2026:
  - ✓ Counted in February (with renewal)
  - ✗ NOT counted in March (treated as expired)
  - ✗ NOT counted in April, May, June (treated as expired)

This caused the outlet count to decline by the number of outlets that expired in each previous projected month.

## Solution Implemented

### Updated Logic in `lib/metrics-calculator.ts`

Added a renewal cutoff date approach:

```typescript
calculateOutletCount(brands: BrandWithKAM[], targetMonth: Date, assumeRenewal: boolean = false): number {
  let outletCount = 0
  const realizedEndDate = new Date(2026, 0, 31) // January 2026
  const isProjected = targetMonth > realizedEndDate
  
  // For projected months, assume renewals
  if (isProjected) {
    assumeRenewal = true
  }
  
  // When assuming renewal, treat all expiries after the realized end date as renewed
  const renewalCutoffDate = assumeRenewal ? realizedEndDate : null
  
  // ... (brand and outlet iteration) ...
  
  // Check expiry date
  if (outlet.pos_expiry) {
    const expiryDate = new Date(outlet.pos_expiry)
    
    // If assuming renewal, check if expiry is after the renewal cutoff date
    if (assumeRenewal && renewalCutoffDate) {
      // If outlet expires after the cutoff (in projected period), assume it renews
      if (expiryDate > renewalCutoffDate) {
        // Outlet will be renewed, count it as active
        outletCount++
        continue
      }
    }
    
    // Standard expiry logic (for realized months or expiries before cutoff)
    // ... (existing logic for checking if expired before or in target month) ...
  }
}
```

### Key Changes:

1. **Renewal Cutoff Date**
   - Set to January 31, 2026 (end of realized period)
   - Any outlet expiring AFTER this date is assumed to renew indefinitely

2. **Projected Period Renewal Logic**
   - If `assumeRenewal=true` and outlet expires after cutoff date:
     - Count the outlet as active
     - Skip further expiry checks
   - This ensures outlets expiring in February, March, April, etc. remain counted in ALL subsequent projected months

3. **Backward Compatibility**
   - Standard expiry logic still applies for:
     - Realized months (before February 2026)
     - Outlets expiring before the cutoff date

## Results

### Before Fix
- February 2026: 949 outlets
- March 2026: 922 outlets (-27, outlets that expired in Feb)
- April 2026: 860 outlets (-62, outlets that expired in Mar)
- May 2026: 804 outlets (-56, outlets that expired in Apr)
- June 2026: 729 outlets (-75, outlets that expired in May)

### After Fix
- January 2026: 945 outlets (realized)
- February 2026: 949 outlets (+4 new outlets)
- March 2026: 949 outlets (stable) ✓
- April 2026: 949 outlets (stable) ✓
- May 2026: 949 outlets (stable) ✓
- June 2026: 949 outlets (stable) ✓

## Consistency with Revenue Logic
The outlet count calculation now properly handles renewals in projected months:
- Outlets expiring in projected period are assumed to renew
- Counts remain stable across projected months
- Consistent with revenue projection assumptions
- All 47 tests passing ✓

## Impact
- Accurate outlet counts in projected months
- Stable counts reflecting renewal assumptions
- Consistent with revenue projections
- Proper handling of subscription renewals
- All tests passing
