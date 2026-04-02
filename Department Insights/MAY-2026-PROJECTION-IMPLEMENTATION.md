# May 2026 Projected Revenue with Renewals - Implementation Guide

## Overview

The revenue calculator has been enhanced to support projected revenue calculations that assume subscriptions (products, services, and bundle plans) expiring in a target month will renew. This is particularly useful for May 2026, where many subscriptions are set to expire.

**Applies to:**
- ✅ Products (POS_Subscription, Petpooja_Tasks, Petpooja_Payroll)
- ✅ Services (Captain_Application, Petpooja_Pay, Online_Ordering_Widget, etc.)
- ✅ Bundle Plans (Petpooja_Growth_Plan, Petpooja_Ultimate_Plan, etc.)

## Implementation Details

### Changes Made

#### 1. Updated `isSubscriptionActive()` Method

Added an `assumeRenewal` parameter that treats products expiring in the target month as active (renewed).

```typescript
private isSubscriptionActive(
  status: string,
  creation: Date | null,
  expiry: Date | null,
  targetMonth: Date,
  assumeRenewal: boolean = false  // NEW PARAMETER
): boolean
```

**Behavior:**
- When `assumeRenewal = false` (default): Products expiring in the target month are considered inactive
- When `assumeRenewal = true`: Products expiring in the target month are treated as renewed and active

#### 2. Updated `getSubscriptionPrice()` Method

Enhanced to handle renewal pricing for products expiring in the target month.

```typescript
private getSubscriptionPrice(
  fieldName: string,
  creation: Date | null,
  expiry: Date | null,  // NEW PARAMETER
  targetMonth: Date,
  assumeRenewal: boolean = false  // NEW PARAMETER
): number
```

**Pricing Logic:**
1. **Creation Month**: Use initial price
2. **Anniversary Month** (renewal): Use renewal price if available, otherwise initial price
3. **Expiry Month** (when `assumeRenewal = true`): Use renewal price if available, otherwise initial price

**Renewal Price Lookup:**
- For a product named `POS_Subscription`, looks for `POS_Subscription_Renewal` in price data
- If renewal price exists and > 0, use it
- Otherwise, fall back to initial price

#### 3. Updated `calculateBrandRevenue()` Method

Added `assumeRenewal` parameter that propagates through the calculation chain.

```typescript
calculateBrandRevenue(
  brand: BrandWithKAM,
  targetMonth: Date,
  assumeRenewal: boolean = false  // NEW PARAMETER
): RevenueBreakdown
```

#### 4. Updated `calculateMonthlyRevenue()` Method

Added `assumeRenewal` parameter for department-level calculations.

```typescript
calculateMonthlyRevenue(
  brands: BrandWithKAM[],
  targetMonth: Date,
  assumeRenewal: boolean = false  // NEW PARAMETER
): RevenueBreakdown
```

## Usage Examples

### Example 1: Calculate Actual Revenue (No Renewals)

```typescript
import { RevenueCalculator } from './lib/revenue-calculator'

const calculator = new RevenueCalculator(prices)
const may2026 = new Date(2026, 4, 15)

// Subscriptions expiring in May 2026 are excluded
// (Products, Services, and Bundle Plans)
const actualRevenue = calculator.calculateMonthlyRevenue(
  brandsWithKAM,
  may2026,
  false  // assumeRenewal = false
)

console.log(`Actual Revenue: ₹${actualRevenue.total}`)
```

### Example 2: Calculate Projected Revenue (With Renewals)

```typescript
import { RevenueCalculator } from './lib/revenue-calculator'

const calculator = new RevenueCalculator(prices)
const may2026 = new Date(2026, 4, 15)

// Subscriptions expiring in May 2026 are assumed to renew
// (Products, Services, and Bundle Plans)
const projectedRevenue = calculator.calculateMonthlyRevenue(
  brandsWithKAM,
  may2026,
  true  // assumeRenewal = true
)

console.log(`Projected Revenue: ₹${projectedRevenue.total}`)
```

### Example 3: Compare Scenarios

```typescript
const may2026 = new Date(2026, 4, 15)

const actualRevenue = calculator.calculateMonthlyRevenue(brands, may2026, false)
const projectedRevenue = calculator.calculateMonthlyRevenue(brands, may2026, true)

const difference = projectedRevenue.total - actualRevenue.total
const percentageIncrease = (difference / actualRevenue.total) * 100

console.log(`Actual Revenue: ₹${actualRevenue.total.toLocaleString()}`)
console.log(`Projected Revenue: ₹${projectedRevenue.total.toLocaleString()}`)
console.log(`Additional Revenue from Renewals: ₹${difference.toLocaleString()}`)
console.log(`Percentage Increase: ${percentageIncrease.toFixed(2)}%`)
```

## Test Results

### Comprehensive Test Coverage

All subscription types have been tested and verified:

#### Test 1: Products
```typescript
// Products expiring in May 2026
POS_Subscription: ₹10,000 (initial), ₹7,000 (renewal)
Petpooja_Tasks: ₹5,000 (initial), ₹4,000 (renewal)

Results:
- WITHOUT Renewal: ₹0 (both products expire)
- WITH Renewal: ₹11,000 (₹7,000 + ₹4,000)
✅ PASS
```

#### Test 2: Services
```typescript
// Services expiring in May 2026
Captain_Application: ₹4,500 (initial), ₹3,500 (renewal)
Petpooja_Pay: ₹3,000 (initial), ₹2,500 (renewal)
Online_Ordering_Widget: ₹6,000 (initial), ₹5,000 (renewal)

Results:
- WITHOUT Renewal: ₹0 (all services expire)
- WITH Renewal: ₹11,000 (₹3,500 + ₹2,500 + ₹5,000)
✅ PASS
```

#### Test 3: Bundle Plans
```typescript
// Bundle plan expiring in May 2026
Petpooja_Growth_Plan: ₹50,000 (initial), ₹40,000 (renewal)

Results:
- WITHOUT Renewal: ₹0 (bundle expires)
- WITH Renewal: ₹40,000 (renewal price)
✅ PASS
```

#### Test 4: Mixed (Bundle Priority)
```typescript
// Bundle + Individual items (bundle takes priority)
Petpooja_Ultimate_Plan: ₹100,000 (initial), ₹85,000 (renewal)
+ POS_Subscription (ignored when bundle active)
+ Captain_Application (ignored when bundle active)

Results:
- WITHOUT Renewal: ₹0 (bundle expires, items ignored)
- WITH Renewal: ₹85,000 (bundle renewal, items still ignored)
✅ PASS
```

### Unit Test

A comprehensive test was created to verify the renewal logic:

```typescript
// Test brand with products expiring in May 2026
const testBrand = {
  POS_Subscription_status: 'Active',
  POS_Subscription_creation: new Date('2023-05-15'),
  POS_Subscription_expiry: new Date('2026-05-15'),
  
  Petpooja_Tasks_status: 'Active',
  Petpooja_Tasks_creation: new Date('2024-05-20'),
  Petpooja_Tasks_expiry: new Date('2026-05-20'),
}

// Prices
POS_Subscription: ₹10,000 (initial), ₹7,000 (renewal)
Petpooja_Tasks: ₹5,000 (initial), ₹4,000 (renewal)
```

**Results:**
- WITHOUT Renewal: ₹0 (both products expire in May)
- WITH Renewal: ₹11,000 (₹7,000 + ₹4,000)

✅ **All Tests PASSED**

### Real Data Analysis

From the actual dataset:
- **Total brand records**: 1,387
- **Subscriptions expiring in May 2026**: 75+ (products, services, and bundle plans)
- **Potential renewal revenue**: Significant

**Example Expiring Subscriptions:**
- Brand: 7thheavenpetpooja@gmail.com
  - 17 POS_Subscription outlets expiring in May 2026
  - Initial Price: ₹10,000 each
  - Renewal Price: ₹7,000 each
  - Potential renewal revenue: ₹119,000 (17 × ₹7,000)

**Subscription Types Affected:**
- Products: POS_Subscription, Petpooja_Tasks, Petpooja_Payroll
- Services: Captain_Application, Petpooja_Pay, Online_Ordering_Widget, and 30+ more
- Bundle Plans: Growth Plan, Scale Plan, Ultimate Plan variants

## Renewal Pricing Strategy

The implementation supports flexible renewal pricing:

1. **Explicit Renewal Price**: If a price record exists with `_Renewal` suffix (e.g., `POS_Subscription_Renewal`), use it
2. **Same Price Renewal**: If no renewal price exists, use the initial price
3. **No Price Found**: Returns ₹0 with a console warning

### Price Data Format

The system supports renewal pricing for all subscription types:

```csv
Service / Product Name,Price
POS_Subscription,10000
POS_Subscription_Renewal,7000
Petpooja_Tasks,5000
Petpooja_Tasks_Renewal,4000
Captain_Application,4500
Captain_Application_Renewal,3500
Petpooja_Growth_Plan,50000
Petpooja_Growth_Plan_Renewal,40000
```

**Naming Convention:**
- Initial price: `{SubscriptionName}`
- Renewal price: `{SubscriptionName}_Renewal`

**Applies to:**
- All products (POS_Subscription, Petpooja_Tasks, Petpooja_Payroll)
- All services (Captain_Application, Petpooja_Pay, Online_Ordering_Widget, etc.)
- All bundle plans (Petpooja_Growth_Plan, Petpooja_Ultimate_Plan, etc.)

## Integration with Existing Features

### Milestone Generator

The milestone generator can use this feature to show projected vs actual revenue:

```typescript
// Generate milestones with actual revenue
const actualMilestones = milestoneGenerator.generate(brands, false)

// Generate milestones with projected revenue
const projectedMilestones = milestoneGenerator.generate(brands, true)
```

### Dashboard Views

The dashboard can offer two views:
1. **Conservative View**: Shows actual revenue (excludes expiring products)
2. **Projected View**: Shows projected revenue (includes renewals)

## Important Notes

### Data Consolidation

- Brands with the same email are consolidated into one record
- POS_Subscription data for multiple outlets is stored in the `outlets` array
- Currently, outlet-level POS subscriptions are NOT included in revenue calculations
- Revenue is calculated only from brand-level subscription fields

### Revenue Recognition

The calculator follows these rules for all subscription types:
1. **Creation Month**: Revenue is recognized using initial price
2. **Anniversary Months**: Revenue is recognized using renewal price (if available)
3. **Expiry Month** (with `assumeRenewal = true`): Revenue is recognized using renewal price

**Applies to:**
- Products (POS_Subscription, Petpooja_Tasks, Petpooja_Payroll)
- Services (Captain_Application, Petpooja_Pay, Online_Ordering_Widget, etc.)
- Bundle Plans (Petpooja_Growth_Plan, Petpooja_Ultimate_Plan, etc.)

**Bundle Priority:**
When a brand has an active bundle plan, individual products and services are ignored (as per existing business logic).

### Backward Compatibility

All changes are backward compatible:
- Default value for `assumeRenewal` is `false`
- Existing code continues to work without modifications
- New parameter is optional

## Testing

Run the test suite to verify the implementation:

```bash
# Run all revenue calculator tests
npm test -- lib/revenue-calculator.test.ts

# Run the renewal logic test
npx tsx test-renewal-logic.ts

# Run the May 2026 demo
npx tsx final-may-2026-demo.ts
```

## Future Enhancements

Potential improvements:
1. **Outlet-Level Revenue**: Include POS subscriptions from outlets array in revenue calculations
2. **Renewal Rate**: Add configurable renewal rate (e.g., assume 80% of products renew)
3. **Churn Prediction**: Integrate ML model to predict which products are likely to renew
4. **Price Escalation**: Support automatic price increases for renewals
5. **Discount Handling**: Support renewal discounts and promotional pricing

## Summary

The implementation successfully adds projected revenue calculation with renewal support to the revenue calculator. All subscription types (products, services, and bundle plans) expiring in the target month can now be assumed to renew at their renewal price (or initial price if no renewal price exists), providing a more optimistic revenue projection for planning purposes.

**Key Benefits:**
- ✅ Flexible revenue projection for all subscription types
- ✅ Renewal price support (products, services, bundles)
- ✅ Backward compatible
- ✅ Well-tested (all subscription types verified)
- ✅ Easy to use

**Subscription Coverage:**
- ✅ Products: POS_Subscription, Petpooja_Tasks, Petpooja_Payroll
- ✅ Services: 30+ services including Captain_Application, Petpooja_Pay, etc.
- ✅ Bundle Plans: All 6 bundle plan variants

**Usage:**
```typescript
// Actual revenue (conservative) - excludes expiring subscriptions
const actual = calculator.calculateMonthlyRevenue(brands, date, false)

// Projected revenue (optimistic) - includes renewals at renewal price
const projected = calculator.calculateMonthlyRevenue(brands, date, true)
```
