# Brand Revenue Calculation Explanation

## How Revenue is Calculated for Each Month

### Core Logic (from `lib/revenue-calculator.ts`)

The revenue calculator follows these steps for each brand and each month:

#### 1. **Check for Bundle Plans First** (Priority)
   - Bundle plans: `Petpooja_Growth_Plan`, `Petpooja_Scale_Plan`, `Petpooja_Ultimate_Plan`, `Petpooja_POS_Ultimate_Plan`, `Petpooja_POS_Growth_Plan`, `Petpooja_POS_Scale_Plan`
   - If a brand has an active bundle plan, ONLY the bundle plan revenue is counted
   - Individual products/services are IGNORED when a bundle plan is active

#### 2. **If No Bundle Plan, Calculate Individual Products & Services**

**Products:**
- `Petpooja_Tasks`
- `Petpooja_Payroll`
- `POS_Subscription`

**Services:**
- `Captain_Application`
- `Petpooja_Pay`
- `Petpooja_Connect`
- `Intellisense`
- `QR_Feedback`
- `Self_Order_Kiosk`
- `Online_Order_Reconciliation`
- `Inventory_Application`
- `Petpooja_Loyalty`
- `Online_Ordering_Widget`
- `My_Website`
- `Dynamic_Reports`
- `Petpooja_Plus`
- `Power_Integration`
- `Reservation_Manager_App`
- `Petpooja_Scan_Order`
- `Gift_Card`
- `Feedback_Management`
- `Data_Lake`
- `SMS_Service`
- `Petpooja_Purchase`
- `Weigh_Scale_Service`
- `Whatsapp_CRM`
- `Petpooja_Go_Rental`
- `Queue_Management`
- `Petpooja_PRO`
- `Kitchen_Display_System`
- `Waiter_Calling_Device`
- `Virtual_Wallet`
- `Petpooja_Briefcase`
- `Token_Management`
- `Link_based_Feedback_Service`

### Subscription Active Check

For a subscription to be considered active in a target month, ALL conditions must be met:

1. **Status = "Active"** (case-insensitive)
2. **Creation Date ≤ Target Month** (subscription must have started)
3. **Expiry Date > Target Month** (subscription must not have expired) OR no expiry date

### Revenue Recognition Rule

**CRITICAL:** Revenue is ONLY counted in the CREATION MONTH of the subscription.

- If a subscription is created in November 2025, revenue is counted ONLY in November 2025
- In December 2025, January 2026, etc., the subscription remains active but generates NO additional revenue
- This is a one-time revenue recognition model

### Example Calculation

**Brand:** Restaurant ID 14289

**Active Subscriptions:**
- Captain Application: Created Nov 2025, Expires Nov 2026
- Online Order Reconciliation: Created Nov 2025, Expires Nov 2026
- Online Ordering Widget: Created Nov 2025, Expires Nov 2026
- My Website: Created Nov 2025, Expires Nov 2026
- Dynamic Reports: Created Nov 2025, Expires Nov 2026
- POS Subscription: Created Feb 2019, Expires May 2026
- Whatsapp CRM: Created Nov 2025, Expires Nov 2026

**Monthly Revenue:**

| Month | Revenue | Explanation |
|-------|---------|-------------|
| October 2025 | ₹0 | Subscriptions not created yet |
| **November 2025** | **₹0*** | **Creation month - should have revenue but showing ₹0 due to price mapping issue** |
| December 2025 | ₹0 | Active but not creation month |
| January 2026 | ₹0 | Active but not creation month |

*See "Current Issue" section below

## Current Issue: Price Mapping Mismatch

### The Problem

The calculator is returning ₹0 for all months because of a naming mismatch between:

**Code Field Names (with underscores):**
- `Captain_Application`
- `Online_Order_Reconciliation`
- `Online_Ordering_Widget`
- `My_Website`
- `Dynamic_Reports`
- `Whatsapp_CRM`
- `POS_Subscription`

**Price CSV Names (with spaces and different formats):**
- `Captain application`
- `Online Order Reconciliation (OOR)`
- `Online Ordering Widget (OOW)`
- `Website Creation`
- `Petpooja Insights/Dynamic Reports`
- `Whatsapp Alerts 1,500 messages`
- `POS Renewal`

### How the Lookup Works

```typescript
private lookupPrice(productServiceName: string): number {
  const price = this.priceMap.get(productServiceName)
  
  if (price === undefined) {
    console.warn(`Price not found for ${productServiceName}, using 0`)
    return 0
  }
  
  return price
}
```

When the calculator looks for `"Captain_Application"` in the price map, it doesn't find it because the CSV has `"Captain application"`. The method returns 0 with a warning.

### Expected Revenue (if prices were mapped correctly)

For November 2025 (creation month):
- Captain Application: ₹4,500
- Online Order Reconciliation: ₹4,500
- Online Ordering Widget: ₹4,500
- My Website: ₹4,500
- Dynamic Reports: ₹4,500
- Whatsapp CRM: ₹1,000
- **Total: ₹23,500**

(POS Subscription would be ₹0 because it was created in Feb 2019, not Nov 2025)

## Summary

### What the Calculator Does:
1. ✅ Checks if subscriptions are active
2. ✅ Identifies creation month correctly
3. ✅ Only counts revenue in creation month
4. ✅ Handles bundle plans with priority
5. ❌ **Fails to lookup prices due to naming mismatch**

### What You're Getting:
- All calculations return ₹0 because price lookup fails
- The logic is correct, but the data mapping is broken

### To Fix:
You need to either:
1. Create a mapping between code field names and CSV price names
2. Standardize the naming in either the code or the CSV
3. Implement a fuzzy matching algorithm to handle variations
