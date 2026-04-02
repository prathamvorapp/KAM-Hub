# Brand Count Calculation Explanation

## Your Data Structure

### Raw Data
- **1,387 brand records** in Brand DATA CSV.csv
- **4 KAM records** in KAM Data CSV.csv
- **4 unique email addresses** across all brand records

### Email Distribution (Outlets per Brand)
1. `copenhagenhospitalityandretail@yahoo.com` - **817 outlets**
2. `7thheavenpetpooja@gmail.com` - **465 outlets**
3. `gfbpetpooja@gmail.com` - **80 outlets**
4. `ps4petpooja@gmail.com` - **25 outlets**

**Total: 1,387 outlets = 4 brands**

## How Brand Count is Calculated

### Code Location
`lib/metrics-calculator.ts` - `calculateBrandCount()` method

### Step-by-Step Logic

```typescript
calculateBrandCount(brands: BrandWithKAM[], targetMonth: Date): number {
  const uniqueEmails = new Set<string>()
  
  for (const brand of brands) {
    // Step 1: Skip brands without valid Assign Date 1
    if (!brand.kam_assignment?.assign_date_1) {
      continue
    }
    
    // Step 2: Convert to Date
    const assignDate = new Date(brand.kam_assignment.assign_date_1)
    
    // Step 3: Check if Assign Date 1 is on or before target month
    if (assignDate <= targetMonth) {
      // Step 4: Add email to Set (case-insensitive, auto-deduplicates)
      uniqueEmails.add(brand.email.toLowerCase())
    }
  }
  
  // Step 5: Return count of unique emails
  return uniqueEmails.size
}
```

### Key Points

1. **Deduplication by Email**: Multiple outlets with the same email = 1 brand
2. **KAM Assignment Required**: Only counts brands with a valid `assign_date_1`
3. **Cumulative Count**: Includes all brands assigned up to and including the target month
4. **Case-Insensitive**: Email comparison ignores case

## Your Actual Results

### KAM Assignment Dates
| Brand | Email | KAM Name | Assign Date |
|-------|-------|----------|-------------|
| La Pinoz Pizza | copenhagenhospitalityandretail@yahoo.com | Bhanvi Gupta | Dec 21, 2021 |
| Bay City Grill | gfbpetpooja@gmail.com | Snehal Dwivedi | Aug 5, 2024 |
| 7th Heaven | 7thheavenpetpooja@gmail.com | Krutika Christian | Jan 7, 2025 |
| ERAMBUR SRI SRINIVASA | ps4petpooja@gmail.com | Sudhin Ravindran | Aug 5, 2025 |

### Monthly Brand Count

| Month | Brand Count | Explanation |
|-------|-------------|-------------|
| **April 2025** | **3** | La Pinoz (Dec 2021) + Bay City (Aug 2024) + 7th Heaven (Jan 2025) |
| **June 2025** | **3** | Same as April |
| **August 2025** | **4** | All 4 brands (ERAMBUR assigned Aug 5, 2025) |
| **September 2025** | **4** | All 4 brands |
| **December 2025** | **4** | All 4 brands |
| **January 2026** | **4** | All 4 brands |
| **June 2026** | **4** | All 4 brands (projected) |
| **March 2027** | **4** | All 4 brands (projected) |

### Timeline Visualization

```
Dec 2021: La Pinoz Pizza assigned (Count: 1)
    |
    v
Aug 2024: Bay City Grill assigned (Count: 2)
    |
    v
Jan 2025: 7th Heaven assigned (Count: 3)
    |
    v
Apr 2025: [Dashboard Start] Count = 3
    |
    v
Aug 2025: ERAMBUR assigned (Count: 4)
    |
    v
Jan 2026: [Realized Period End] Count = 4
    |
    v
Mar 2027: [Dashboard End] Count = 4 (projected)
```

## Cross-Reference Process

### How Brands and KAM Data are Merged

From `lib/csv-parser.ts` - `crossReference()` method:

1. **Group by Email**: All 1,387 brand records are grouped by email
   - Result: 4 groups (one per unique email)

2. **Match with KAM**: For each email group:
   - Try to find KAM record by email (primary match)
   - If not found, try to find by restaurant_id/brand_uid (fallback)

3. **Create Outlets Array**: All brand records with the same email become outlets
   - Example: 465 brand records with `7thheavenpetpooja@gmail.com` → 465 outlets

4. **Result**: One `BrandWithKAM` object per unique email
   - Contains: base brand info + KAM assignment + outlets array

### Your Final Data Structure

```typescript
[
  {
    restaurant_id: 8924,
    email: "7thheavenpetpooja@gmail.com",
    kam_assignment: {
      kam_name_1: "Krutika Christian",
      assign_date_1: Date("2025-01-07")
    },
    outlets: [465 outlet objects]
  },
  {
    restaurant_id: 43640,
    email: "copenhagenhospitalityandretail@yahoo.com",
    kam_assignment: {
      kam_name_1: "Bhanvi Gupta",
      assign_date_1: Date("2021-12-21")
    },
    outlets: [817 outlet objects]
  },
  {
    restaurant_id: 345351,
    email: "gfbpetpooja@gmail.com",
    kam_assignment: {
      kam_name_1: "Snehal Dwivedi",
      assign_date_1: Date("2024-08-05")
    },
    outlets: [80 outlet objects]
  },
  {
    restaurant_id: 410709,
    email: "ps4petpooja@gmail.com",
    kam_assignment: {
      kam_name_1: "Sudhin Ravindran",
      assign_date_1: Date("2025-08-05")
    },
    outlets: [25 outlet objects]
  }
]
```

## Summary

### What You Have
- **1,387 outlets** across **4 brands**
- All 4 brands have KAM assignments
- Brand count grows from 1 to 4 over time as KAMs are assigned

### What the Calculator Returns
- **April 2025**: 3 brands (3 assigned by then)
- **August 2025+**: 4 brands (all assigned)

### Why This Makes Sense
- Each brand (email) can have hundreds of outlets
- Brand count is based on unique emails, not outlet count
- The count is cumulative - once a KAM is assigned, the brand is counted in all future months
- Your dashboard shows brand-level metrics, not outlet-level metrics
