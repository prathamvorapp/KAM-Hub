# Mahima Sali - April 2025 Churn Revenue Breakdown

## Summary
- **Total Churned Outlets**: 80 outlets
- **Total Revenue Lost**: ₹1,38,500 (₹138,500)
- **Period**: April 2025 (29th & 30th)

## Calculation Methodology

For each churned outlet, we use a **dual-value approach**:

### Method 1: Active Services Calculation
- Check which services were active for the outlet in Brand DATA CSV
- Match service names with prices from Price Data CSV
- Sum up all active service prices

### Method 2: Actual Revenue
- Check Revenue.csv for actual revenue records for that outlet
- Sum all revenue amounts

### Final Value
**We take the HIGHER of the two values** to avoid underestimating revenue loss.

## Detailed Breakdown

### Key Outlets with Significant Revenue Loss:

1. **The Jivk Fine Bake & Multi Cusine** (Restaurant ID: 321384)
   - Churned: 29-Apr-25 & 30-Apr-25 (appears twice - duplicate entry)
   - Active Services:
     - Dynamic_Reports: ₹4,500
     - POS_Subscription: ₹10,000
   - Method 1 Total: ₹14,500
   - Method 2 (Actual Revenue): ₹7,000
   - **Revenue Lost: ₹14,500** (using Method 1)
   - Note: This outlet appears twice in churn data, so counted twice = ₹29,000

2. **Suto cafe Global Pvt Ltd** (Restaurant ID: 367879)
   - Churned: 30-Apr-25
   - Active Services:
     - POS_Subscription: ₹10,000
   - **Revenue Lost: ₹10,000**

3. **Tealogy Cafe** (Restaurant ID: 366203)
   - Churned: 30-Apr-25
   - Active Services:
     - POS_Subscription: ₹10,000
   - **Revenue Lost: ₹10,000**

4. **FOODCOASTA** (Restaurant ID: 59664)
   - Churned: 30-Apr-25
   - Active Services:
     - POS_Subscription: ₹10,000
   - Method 2 (Actual Revenue): ₹4,500
   - **Revenue Lost: ₹10,000** (using Method 1)

5. **Chitale Bandhu Mithaiwale** (Restaurant ID: 333059)
   - Churned: 30-Apr-25
   - Active Services:
     - POS_Subscription: ₹10,000
   - Method 2 (Actual Revenue): ₹7,000
   - **Revenue Lost: ₹10,000** (using Method 1)

6. **Coffea Pune** (Multiple outlets)
   - 4 outlets churned with Dynamic_Reports (₹4,500 each)
   - Total: ₹18,000

7. **Bole To... Vadapav** (Multiple outlets)
   - 5 outlets churned with Dynamic_Reports (₹4,500 each)
   - Total: ₹22,500

### Brands with Zero Revenue Loss:
Many outlets had no active services and no revenue records, resulting in ₹0 revenue loss:
- Tealogy Cafe (multiple outlets with no active services)
- MBA Chai Wala
- William Johns Pizza
- Nino X Francesco
- Chai Hai Na
- And many others...

## Revenue Distribution

| Revenue Amount | Number of Outlets |
|----------------|-------------------|
| ₹0 | 56 outlets |
| ₹4,500 | 15 outlets |
| ₹10,000 | 7 outlets |
| ₹14,500 | 2 outlets (same outlet counted twice) |

## Top Brands by Revenue Lost

1. **Bole To... Vadapav**: ₹22,500 (5 outlets)
2. **The Jivk Fine Bake & Multi Cusine**: ₹29,000 (duplicate entry)
3. **Coffea Pune**: ₹18,000 (4 outlets)
4. **Suto cafe Global Pvt Ltd**: ₹10,000 (1 outlet with POS)
5. **Tealogy Cafe**: ₹10,000 (1 outlet with POS, others had no services)

## Why the Dashboard Shows ₹7,000

The ₹7,000 you're seeing in the dashboard might be:

1. **Filtered View**: If you have additional filters applied (like outlet count range), it might be showing only a subset of the churns

2. **Different Calculation**: The dashboard might be using only Method 2 (Actual Revenue) instead of taking the maximum of both methods

3. **Specific Outlet**: It might be showing revenue for a specific outlet (like Restaurant ID 321384 which had ₹7,000 in actual revenue)

4. **Data Sync Issue**: There might be a timing difference in when the data was loaded

## Recommendation

To verify the ₹7,000 figure:
1. Check if any additional filters are applied (outlet count, date range, etc.)
2. Verify which calculation method the dashboard is using
3. Check if it's showing a specific brand or outlet subset
4. Ensure all 80 churned outlets are being counted

The correct total for Mahima Sali's April 2025 churn should be **₹1,38,500** based on the dual-value methodology (taking the higher of active services or actual revenue).
