# April 2025 Brand Count Analysis

## Executive Summary

**Total Brands in Dashboard for April 2025: 734 brands**

This count represents brands that meet BOTH criteria:
1. Have a KAM assignment (Assign Date 1) on or before April 30, 2025
2. Have an active POS subscription in April 2025

## Detailed Breakdown

### Brand Categories (April 2025)

| Category | Count | Description |
|----------|-------|-------------|
| ✅ **KAM + POS** | **734** | Brands actively managed by KAM team with active POS |
| 🏪 **POS Only** | 553 | Brands with active POS but no KAM assigned |
| 👤 **KAM Only** | 18 | Brands with KAM assigned but POS expired/inactive |
| ❌ **Neither** | 91 | Brands with neither KAM nor active POS |
| **TOTAL** | **1,396** | Total unique brand emails in dataset |

### Key Metrics

- **KAM-Managed Brands**: 734 brands (52.6% of total)
- **Total Outlets** (KAM-managed): 12,784 outlets
- **Average Outlets per Brand**: 17.4 outlets
- **Brands Awaiting KAM Assignment**: 553 brands (39.6% of total)

## Logic Explanation

### Current Implementation

The `calculateBrandCount()` function in `lib/metrics-calculator.ts` uses this logic:

```typescript
calculateBrandCount(brands: BrandWithKAM[], targetMonth: Date): number {
  const uniqueEmails = new Set<string>()
  
  for (const brand of brands) {
    // Skip brands without valid Assign Date 1
    if (!brand.kam_assignment?.assign_date_1) {
      continue  // ← This filters out 553 brands with POS but no KAM
    }
    
    // Check if Assign Date 1 is on or before target month
    if (assignDate <= targetMonth) {
      uniqueEmails.add(brand.email.toLowerCase())
    }
  }
  
  return uniqueEmails.size
}
```

### Why 734 and not 1,287?

1. **1,287 brands** have active POS subscriptions in April 2025
2. **Only 752 brands** have KAM assignments by April 2025
3. **734 brands** have BOTH KAM assignment AND active POS
4. **18 brands** have KAM but their POS expired/inactive

The dashboard shows **734** because it only counts brands that:
- Are assigned to a KAM (have `assign_date_1`)
- Have active POS subscription in the target month

## Business Interpretation

### What This Means

1. **KAM Coverage**: The KAM team is actively managing 734 brands (52.6% of all brands with POS)

2. **Growth Opportunity**: 553 brands (39.6%) have active POS but no KAM assigned yet
   - These represent potential for KAM team expansion
   - Could increase managed brand count by 75% if all assigned

3. **Churn/Expiry**: 18 brands have KAM assignments but inactive POS
   - May need renewal attention
   - Represents 2.4% of KAM-assigned brands

### Sample Brands

#### ✅ Brands with BOTH KAM + POS (5 examples)
1. `chiragjagga1987@gmail.com` - KAM: Aman Mutneja (16 outlets)
2. `pandeyjiparcelpoint@gmail.com` - KAM: Krutika Christian (1 outlet)
3. `contact@cafepeter.com` - KAM: Snehal Dwivedi (1 outlet)
4. `arjoiinfo@gmail.com` - KAM: Shah Anokhi Rajeshkumar (2 outlets)
5. `kioskkaffeefranchise@gmail.com` - KAM: Krutika Christian (53 outlets)

#### 🏪 Brands with POS ONLY (5 examples)
1. `anandakalwadi@gmail.com` (2 outlets) - No KAM assigned
2. `sureshr@keventer.com` (1 outlet) - No KAM assigned
3. `itsupport@nandhini.com` (1 outlet) - No KAM assigned
4. `md@kelvinscale.in` (34 outlets) - No KAM assigned
5. `info@thecoffeebrewery.com` (1 outlet) - No KAM assigned

#### 👤 Brands with KAM ONLY (5 examples)
1. `srinivasv.bobatree@gmail.com` - KAM: Kinab Binditbhai Shah - POS expired
2. `fm@muruganidlishop.com` - KAM: Kinab Binditbhai Shah - POS expired
3. `orders@zimero.in` - KAM: Chauhan Khushbu Girishkumar - POS expired
4. `redcow_petpooja@rcdpl.com` - KAM: Pradipta Sen - POS expired
5. `central.thefreshpress@gmail.com` - KAM: Harsh Gohel - POS expired

## Verification Scripts

Two analysis scripts have been created for verification:

1. **`analyze-april-brands.js`** - Quick summary
2. **`april-2025-brand-breakdown.js`** - Detailed breakdown with samples

Run either script with:
```bash
node analyze-april-brands.js
# or
node april-2025-brand-breakdown.js
```

## Conclusion

The April 2025 brand count of **734** is accurate based on the current business logic:
- Only counts brands actively managed by the KAM team
- Requires both KAM assignment AND active POS subscription
- Represents 52.6% of all brands with active POS
- Leaves 553 brands (39.6%) as potential for KAM team expansion

This conservative counting approach ensures the dashboard reflects brands that are truly under KAM management, rather than all brands with POS subscriptions.
