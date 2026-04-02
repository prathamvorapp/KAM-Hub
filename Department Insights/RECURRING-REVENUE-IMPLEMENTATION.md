# Recurring Annual Revenue Implementation

## Overview

Implemented recurring annual revenue logic where subscriptions generate revenue every year on their anniversary month, with support for renewal pricing.

## How It Works

### Revenue Recognition Model

1. **Year 1 (Creation Month)**: Charge initial price
2. **Year 2+ (Anniversary Months)**: Charge renewal price if available, otherwise charge initial price
3. **Non-Anniversary Months**: No revenue

### Example

**POS_Subscription** created April 15, 2023:
- April 2023: ₹10,000 (initial price)
- April 2024: ₹7,000 (renewal price)
- April 2025: ₹7,000 (renewal price)
- April 2026: ₹7,000 (renewal price)
- All other months: ₹0

**Captain_Application** created April 15, 2023 (no renewal price):
- April 2023: ₹4,500 (initial price)
- April 2024: ₹4,500 (same price - no renewal)
- April 2025: ₹4,500 (same price - no renewal)
- April 2026: ₹4,500 (same price - no renewal)
- All other months: ₹0

## Implementation Details

### New Methods in `RevenueCalculator`

#### 1. `getAnniversaryYear()`
```typescript
private getAnniversaryYear(creation: Date | null, targetMonth: Date): number
```
- Returns the anniversary year number (1, 2, 3, etc.)
- Returns 0 if not an anniversary month
- Checks if target month matches creation month

#### 2. `getSubscriptionPrice()`
```typescript
private getSubscriptionPrice(fieldName: string, creation: Date | null, targetMonth: Date): number
```
- Returns appropriate price based on whether it's creation or anniversary month
- For creation month: returns initial price
- For anniversary months: returns renewal price if available, otherwise initial price
- For other months: returns 0

### Updated Logic

**Before:**
- Revenue only counted in creation month
- No recurring revenue

**After:**
- Revenue counted in creation month (Year 1)
- Revenue counted in every anniversary month (Year 2, 3, 4, etc.)
- Uses renewal pricing when available

### Price Mapping

The system looks for renewal prices by appending `_Renewal` to the field name:

| Subscription | Initial Price Field | Renewal Price Field |
|--------------|-------------------|---------------------|
| POS_Subscription | `POS_Subscription` (₹10,000) | `POS_Subscription_Renewal` (₹7,000) |
| Petpooja_Payroll | `Petpooja_Payroll` (₹6,000) | `Petpooja_Payroll_Renewal` (₹2,500) |
| Captain_Application | `Captain_Application` (₹4,500) | None (uses ₹4,500 every year) |
| Petpooja_POS_Growth_Plan | `Petpooja_POS_Growth_Plan` (₹20,000) | `Petpooja_POS_Growth_Plan_Renewal` (₹17,000) |

## Bug Fixes

### 1. Case-Insensitive Status Check
**Problem:** Status field in CSV is lowercase "active" but code checked for "Active"

**Fix:** Updated `isSubscriptionActive()` to use case-insensitive comparison:
```typescript
if (!status || status.toLowerCase() !== 'active') {
  return false
}
```

### 2. KAM Assignment Filtering
Revenue calculation now filters by KAM assignment date (implemented in previous update):
- Only includes revenue from brands assigned a KAM by the target month
- Aligns with brand count and outlet count logic

## Test Results

### Demo Output

```
Brand has 3 subscriptions created in April 2023:
1. POS_Subscription: ₹10,000 (Year 1) → ₹7,000 (Renewal)
2. Captain_Application: ₹4,500 (every year - no renewal price)
3. Petpooja_Payroll: ₹6,000 (Year 1) → ₹2,500 (Renewal)

April 2023 (Creation month - Year 1):
  Products: ₹16,000
  Services: ₹4,500
  TOTAL: ₹20,500

April 2024 (1st Anniversary - Year 2):
  Products: ₹9,500
  Services: ₹4,500
  TOTAL: ₹14,000

April 2025 (2nd Anniversary - Year 3):
  Products: ₹9,500
  Services: ₹4,500
  TOTAL: ₹14,000
```

### Actual Data Test

With real brand data (7thheavenpetpooja@gmail.com):
- POS_Subscription created April 25, 2018
- April 2025 (7th anniversary): ₹7,000 (renewal price) ✓

## Benefits

1. **Accurate Revenue Projection**: Shows recurring revenue over multiple years
2. **Renewal Pricing Support**: Automatically uses lower renewal prices when available
3. **Flexible Pricing**: Supports subscriptions with or without renewal pricing
4. **Consistent Logic**: Aligns with KAM assignment filtering

## Summary

All metrics now work consistently:
- **Brand Count**: Filtered by KAM assignment
- **Outlet Count**: Filtered by KAM assignment
- **Revenue**: Filtered by KAM assignment + recurring annual charges with renewal pricing

All 47 tests pass ✓
Build succeeds ✓
