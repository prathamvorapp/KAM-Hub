# Switching Cost Index - Quick Start Guide

## What is SCI?

The Switching Cost Index (SCI) measures how deeply a brand is integrated with Petpooja's ecosystem. Higher SCI = harder to switch to competitors.

## How to View SCI

1. Start the development server:
   ```bash
   npm run dev
   ```

2. Navigate to: `http://localhost:3000/dashboard/brand-insights`

3. Click the "Switching Cost Index" tab

## Understanding the Metrics

### Density
Average number of active non-core products per outlet.
- Higher density = more products per outlet

### Spread Score
How evenly products are distributed across outlets (0-1).
- 1.0 = all products active in all outlets
- 0.0 = no products active

### SCI (Switching Cost Index)
Weighted score combining density and spread (0-1).
- **High** (≥0.6): Deeply integrated, high switching cost
- **Medium** (0.3-0.6): Moderate integration
- **Low** (<0.3): Minimal integration, easy to switch

## Key Features

✅ Real-time calculation from CSV data
✅ Filter by KAM or outlet count
✅ Sort by SCI ranking
✅ Visual categorization (High/Medium/Low)
✅ Summary statistics

## Product Weights

Products are weighted by their operational embeddedness and switching difficulty:

### High-priority products (weight = 3):
Deeply embedded in daily operations:
- Captain_Application
- Self_Order_Kiosk
- Inventory_Application
- Petpooja_Loyalty
- Dynamic_Reports
- Reservation_Manager_App
- Kitchen_Display_System
- Waiter_Calling_Device

### Medium-priority products (weight = 2):
Important but less embedded:
- Petpooja_Payroll
- Petpooja_Growth_Plan
- Petpooja_Scan_Order
- Petpooja_Scale_Plan
- Petpooja_POS_Scale_Plan
- Petpooja_POS_Growth_Plan

### Standard products (weight = 1):
All other non-core products

## Example Interpretation

**Brand: ABC Restaurant**
- Outlets: 10
- Density: 5.2
- Spread: 0.125
- SCI: 0.156
- Category: Low

This brand has an average of 5.2 active products per outlet, but products are only present in ~12.5% of possible combinations. The low SCI (0.156) indicates minimal integration, making them a potential churn risk.

**Brand: XYZ Chain**
- Outlets: 50
- Density: 8.5
- Spread: 0.425
- SCI: 0.712
- Category: High

This brand has high density (8.5 products/outlet) and uses high-weight products like Captain Application, Inventory, and KDS across many outlets. The high SCI (0.712) indicates deep integration and high switching costs - a very sticky customer.

## Testing

Run unit tests:
```bash
npm test -- lib/switching-cost-calculator.test.ts
```

## Files Modified/Created

- ✅ `lib/switching-cost-calculator.ts` - Core calculation logic
- ✅ `lib/switching-cost-calculator.test.ts` - Unit tests
- ✅ `app/dashboard/brand-insights/page.tsx` - UI integration
- ✅ `lib/data-context.tsx` - Added brandRecords & kamRecords
- ✅ `components/DataLoader.tsx` - Load raw records
- ✅ `lib/csv-loader.ts` - Export raw records
