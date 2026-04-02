# Renewal Logic Examples - All Subscription Types

This document provides practical examples of how the renewal logic works for products, services, and bundle plans.

## Overview

The renewal logic applies uniformly to all subscription types:
- **Products**: POS_Subscription, Petpooja_Tasks, Petpooja_Payroll
- **Services**: Captain_Application, Petpooja_Pay, Online_Ordering_Widget, and 30+ more
- **Bundle Plans**: Petpooja_Growth_Plan, Petpooja_Ultimate_Plan, and all variants

## Example 1: Product Renewals

### Scenario
A brand has two products expiring in May 2026:
- POS_Subscription (created May 2023, expires May 2026)
- Petpooja_Tasks (created May 2024, expires May 2026)

### Price Data
```csv
Service / Product Name,Price
POS_Subscription,10000
POS_Subscription_Renewal,7000
Petpooja_Tasks,5000
Petpooja_Tasks_Renewal,4000
```

### Code
```typescript
const calculator = new RevenueCalculator(prices)
const may2026 = new Date(2026, 4, 15)

// Without renewal assumption
const actual = calculator.calculateBrandRevenue(brand, may2026, false)
console.log(actual.products) // ₹0 (both products expire)

// With renewal assumption
const projected = calculator.calculateBrandRevenue(brand, may2026, true)
console.log(projected.products) // ₹11,000 (₹7,000 + ₹4,000)
```

### Result
- **Actual Revenue**: ₹0 (products expire, no revenue)
- **Projected Revenue**: ₹11,000 (products renew at renewal price)
- **Difference**: ₹11,000 additional revenue from renewals

---

## Example 2: Service Renewals

### Scenario
A brand has three services expiring in May 2026:
- Captain_Application (created May 2023, expires May 2026)
- Petpooja_Pay (created May 2024, expires May 2026)
- Online_Ordering_Widget (created May 2022, expires May 2026)

### Price Data
```csv
Service / Product Name,Price
Captain_Application,4500
Captain_Application_Renewal,3500
Petpooja_Pay,3000
Petpooja_Pay_Renewal,2500
Online_Ordering_Widget,6000
Online_Ordering_Widget_Renewal,5000
```

### Code
```typescript
const calculator = new RevenueCalculator(prices)
const may2026 = new Date(2026, 4, 15)

// Without renewal assumption
const actual = calculator.calculateBrandRevenue(brand, may2026, false)
console.log(actual.services) // ₹0 (all services expire)

// With renewal assumption
const projected = calculator.calculateBrandRevenue(brand, may2026, true)
console.log(projected.services) // ₹11,000 (₹3,500 + ₹2,500 + ₹5,000)
```

### Result
- **Actual Revenue**: ₹0 (services expire, no revenue)
- **Projected Revenue**: ₹11,000 (services renew at renewal price)
- **Difference**: ₹11,000 additional revenue from renewals

---

## Example 3: Bundle Plan Renewals

### Scenario
A brand has a bundle plan expiring in May 2026:
- Petpooja_Growth_Plan (created May 2023, expires May 2026)

### Price Data
```csv
Service / Product Name,Price
Petpooja_Growth_Plan,50000
Petpooja_Growth_Plan_Renewal,40000
```

### Code
```typescript
const calculator = new RevenueCalculator(prices)
const may2026 = new Date(2026, 4, 15)

// Without renewal assumption
const actual = calculator.calculateBrandRevenue(brand, may2026, false)
console.log(actual.bundlePlans) // ₹0 (bundle expires)

// With renewal assumption
const projected = calculator.calculateBrandRevenue(brand, may2026, true)
console.log(projected.bundlePlans) // ₹40,000 (bundle renews at renewal price)
```

### Result
- **Actual Revenue**: ₹0 (bundle expires, no revenue)
- **Projected Revenue**: ₹40,000 (bundle renews at renewal price)
- **Difference**: ₹40,000 additional revenue from renewal

---

## Example 4: Mixed Scenario (Bundle Priority)

### Scenario
A brand has:
- Petpooja_Ultimate_Plan (bundle, expires May 2026)
- POS_Subscription (product, expires May 2026)
- Captain_Application (service, expires May 2026)

**Important**: When a bundle plan is active, individual products and services are ignored (existing business logic).

### Price Data
```csv
Service / Product Name,Price
Petpooja_Ultimate_Plan,100000
Petpooja_Ultimate_Plan_Renewal,85000
POS_Subscription,10000
POS_Subscription_Renewal,7000
Captain_Application,4500
Captain_Application_Renewal,3500
```

### Code
```typescript
const calculator = new RevenueCalculator(prices)
const may2026 = new Date(2026, 4, 15)

// Without renewal assumption
const actual = calculator.calculateBrandRevenue(brand, may2026, false)
console.log(actual.products)     // ₹0 (ignored due to bundle)
console.log(actual.services)     // ₹0 (ignored due to bundle)
console.log(actual.bundlePlans)  // ₹0 (bundle expires)
console.log(actual.total)        // ₹0

// With renewal assumption
const projected = calculator.calculateBrandRevenue(brand, may2026, true)
console.log(projected.products)     // ₹0 (still ignored due to bundle)
console.log(projected.services)     // ₹0 (still ignored due to bundle)
console.log(projected.bundlePlans)  // ₹85,000 (bundle renews)
console.log(projected.total)        // ₹85,000
```

### Result
- **Actual Revenue**: ₹0 (bundle expires, individual items ignored)
- **Projected Revenue**: ₹85,000 (bundle renews, individual items still ignored)
- **Difference**: ₹85,000 additional revenue from bundle renewal

**Note**: Individual products and services are not counted because the bundle plan takes priority.

---

## Example 5: Department-Level Calculation

### Scenario
Calculate total revenue for all brands in a department for May 2026.

### Code
```typescript
const calculator = new RevenueCalculator(prices)
const may2026 = new Date(2026, 4, 15)

// Get all brands with KAM assignments
const brandsWithKAM = parser.crossReference(brands, kams)

// Without renewal assumption (conservative)
const actualRevenue = calculator.calculateMonthlyRevenue(
  brandsWithKAM,
  may2026,
  false
)

console.log('Conservative Projection:')
console.log(`  Products: ₹${actualRevenue.products.toLocaleString('en-IN')}`)
console.log(`  Services: ₹${actualRevenue.services.toLocaleString('en-IN')}`)
console.log(`  Bundle Plans: ₹${actualRevenue.bundlePlans.toLocaleString('en-IN')}`)
console.log(`  Total: ₹${actualRevenue.total.toLocaleString('en-IN')}`)

// With renewal assumption (optimistic)
const projectedRevenue = calculator.calculateMonthlyRevenue(
  brandsWithKAM,
  may2026,
  true
)

console.log('\nOptimistic Projection:')
console.log(`  Products: ₹${projectedRevenue.products.toLocaleString('en-IN')}`)
console.log(`  Services: ₹${projectedRevenue.services.toLocaleString('en-IN')}`)
console.log(`  Bundle Plans: ₹${projectedRevenue.bundlePlans.toLocaleString('en-IN')}`)
console.log(`  Total: ₹${projectedRevenue.total.toLocaleString('en-IN')}`)

// Calculate impact
const difference = projectedRevenue.total - actualRevenue.total
const percentageIncrease = (difference / actualRevenue.total) * 100

console.log('\nRenewal Impact:')
console.log(`  Additional Revenue: ₹${difference.toLocaleString('en-IN')}`)
console.log(`  Percentage Increase: ${percentageIncrease.toFixed(2)}%`)
```

---

## Example 6: No Renewal Price Available

### Scenario
A product expires but no renewal price is defined in the price data.

### Price Data
```csv
Service / Product Name,Price
Petpooja_Payroll,8000
```
(Note: No `Petpooja_Payroll_Renewal` entry)

### Code
```typescript
const calculator = new RevenueCalculator(prices)
const may2026 = new Date(2026, 4, 15)

// With renewal assumption
const projected = calculator.calculateBrandRevenue(brand, may2026, true)
console.log(projected.products) // ₹8,000 (uses initial price as fallback)
```

### Result
- When no renewal price exists, the system falls back to the initial price
- This ensures continuity even if renewal pricing isn't defined for all products

---

## Key Takeaways

1. **Uniform Logic**: Renewal logic works identically for products, services, and bundle plans
2. **Renewal Pricing**: System prefers `{Name}_Renewal` price, falls back to initial price
3. **Bundle Priority**: When bundle is active, individual items are ignored (existing logic)
4. **Flexible Projections**: Toggle between conservative (actual) and optimistic (projected) views
5. **Easy Integration**: Single boolean parameter controls the behavior

## Usage Pattern

```typescript
// Conservative (actual) - for realistic planning
const actual = calculator.calculateMonthlyRevenue(brands, date, false)

// Optimistic (projected) - for best-case scenario
const projected = calculator.calculateMonthlyRevenue(brands, date, true)

// Compare scenarios
const upside = projected.total - actual.total
```

This pattern works for:
- Individual brand calculations (`calculateBrandRevenue`)
- Department-level calculations (`calculateMonthlyRevenue`)
- All subscription types (products, services, bundles)
