// AI Training Context - Complete project understanding for the analytics chatbot

export const PROJECT_CONTEXT = `
# Brand Journey Dashboard - Data Structure & Business Logic

## Project Overview
This is a restaurant management analytics platform that tracks brands (restaurant businesses), 
outlets (physical locations), KAMs (Key Account Managers), revenue, expenses, and churn.

## Data Sources & Structure

### 1. Brand DATA CSV (Brand DATA CSV.csv)
- **Primary Key**: restaurant_id, email
- **Purpose**: Tracks product/service subscriptions for each restaurant outlet
- **Key Fields**:
  - restaurant_id: Unique identifier for each outlet
  - email: Brand's email (multiple outlets can share same email = same brand)
  - POS_Subscription_status/creation/expiry: Core subscription data
  - Product fields: Petpooja_Tasks, Petpooja_Payroll, POS_Subscription
  - Bundle fields: Petpooja_Growth_Plan, Petpooja_Scale_Plan, Petpooja_Ultimate_Plan
  - Service fields: Captain_Application, Petpooja_Pay, Intellisense, etc.

### 2. KAM Data CSV (KAM Data CSV.csv)
- **Primary Key**: Brand UID, email
- **Purpose**: Tracks which KAM manages which brand and when
- **Key Fields**:
  - Brand UID: Unique brand identifier
  - Brand Name: Human-readable brand name
  - email: Links to Brand DATA CSV
  - KAM Name 1-6: Up to 6 KAM assignments over time
  - Assign Date 1-6: When each KAM was assigned

### 3. Revenue CSV (Revenue.csv)
- **Primary Key**: Date + restaurant_id + Product
- **Purpose**: Actual transaction data showing real revenue
- **Key Fields**:
  - Date: Transaction date (DD-MM-YYYY)
  - Product Or service Name: What was sold
  - Amount: Revenue amount in rupees
  - restaurant_id: Which outlet made the transaction

### 4. Expense CSV (Expense.csv)
- **Primary Key**: Date + KAM
- **Purpose**: Tracks expenses by KAM
- **Key Fields**:
  - Date: Expense date (DD-MM-YYYY)
  - KAM: Key Account Manager name
  - Total: Expense amount in rupees

### 5. Churn CSV (Churn.csv)
- **Primary Key**: Date + restaurant_id
- **Purpose**: Tracks when and why restaurants stopped using the service
- **Key Fields**:
  - Date: Churn date (DD-MMM-YY)
  - restaurant_id: Which outlet churned
  - Churn Reasons: Why they left
  - Churn Remarks: Additional details

### 6. Price Data CSV (Price Data CSV.csv)
- **Primary Key**: Service/Product Name
- **Purpose**: Lookup table for product/service prices
- **Key Fields**:
  - Service/Product Name: Product identifier
  - Price: Standard price in rupees

## Key Concepts

### Brand vs Outlet
- **Brand**: A restaurant business (identified by email)
- **Outlet**: A physical location (identified by restaurant_id)
- One brand can have multiple outlets
- Example: "Domino's Pizza" (brand) has 50 outlets across the city

### KAM (Key Account Manager)
- Sales/account managers who handle brand relationships
- Each brand is assigned to a KAM
- KAMs can change over time (tracked in Assign Date 1-6)
- KAM performance is measured by revenue and brand count

### Revenue Types
- **New Revenue**: First-time purchases, new subscriptions
- **Renewal Revenue**: Subscription renewals, repeat purchases
- Products with "Renewal" in name = renewal revenue

### Time Periods
- **Realized Data**: April 2025 - January 2026 (actual historical data)
- **Projected Data**: February 2026 - March 2027 (estimates based on expiry dates)

## Business Logic

### Brand Count Calculation
- Count unique emails where Assign Date 1 <= target month
- One email = one brand (even if multiple outlets)
- Only count brands with valid KAM assignment

### Outlet Count Calculation
- Count restaurant_ids with active POS subscriptions
- Active = POS_Subscription_status = "Active"
- For projected months: assume subscriptions expiring after Jan 2026 will renew
- Check expiry dates: only count if expiry > target month

### Revenue Calculation
- **For Historical Months (Apr 2025 - Jan 2026)**:
  - Use actual data from Revenue.csv
  - Sum all transactions for that month
  - Separate into New vs Renewal based on product name
  
- **For Projected Months (Feb 2026+)**:
  - Use subscription expiry dates
  - Assume subscriptions expiring after Jan 2026 will renew
  - Use prices from Price Data CSV

### Expense Calculation
- Sum all expenses for a KAM from Expense.csv
- Filter by KAM name (case-insensitive)
- Can filter by date range if needed

### Churn Analysis
- Churn Revenue Ratio = (Revenue from churned outlets) / (Total revenue)
- Identify churned outlets from Churn.csv
- Match to Revenue.csv by restaurant_id
- Calculate percentage

## Data Relationships

\`\`\`
Brand DATA CSV (restaurant_id, email)
    ↓ (linked by email)
KAM Data CSV (email, Brand UID, KAM assignments)
    ↓
Revenue CSV (restaurant_id, transactions)
    ↓
Expense CSV (KAM, expenses)
    ↓
Churn CSV (restaurant_id, churn data)
\`\`\`

## Common Queries

### "What is expense by [KAM Name]?"
- Filter Expense.csv where KAM = [KAM Name]
- Sum the Total column
- Return total expense amount

### "Which KAM has highest revenue in [Month]?"
- Get all revenue for that month from Revenue.csv
- Match restaurant_id to Brand DATA CSV to get email
- Match email to KAM Data CSV to get KAM name
- Group by KAM and sum revenue
- Return KAM with highest total

### "What is the churn revenue ratio?"
- Get all churned restaurant_ids from Churn.csv
- Get revenue for those restaurants from Revenue.csv
- Calculate: (churned revenue / total revenue) * 100

### "Show me revenue by [KAM] in [Month]"
- Get brands managed by that KAM from KAM Data CSV
- Get restaurant_ids for those brands from Brand DATA CSV
- Filter Revenue.csv for those restaurant_ids in that month
- Sum and return total

## Important Notes

1. **Case Sensitivity**: KAM names should be matched case-insensitively
2. **Date Formats**: Multiple formats exist (DD-MM-YYYY, DD-MMM-YY)
3. **Month Names**: Support full names (August) and abbreviations (Aug)
4. **Null Handling**: Many fields can be null/empty - handle gracefully
5. **Data Quality**: Some records may have missing or invalid data
`;

export const QUERY_EXAMPLES = `
# Query Examples with Expected Behavior

## Expense Queries
Q: "What is expense by Pratham Vora?"
→ Filter Expense.csv where KAM contains "Pratham Vora"
→ Sum Total column
→ Return: "Total expense by Pratham Vora: ₹X,XXX.XX across N entries"

Q: "Show expenses for Rahul Taak"
→ Same logic as above
→ Return formatted expense total

## Revenue Queries
Q: "Which KAM has highest revenue in August?"
→ Filter Revenue.csv for August (month = 7, 0-indexed)
→ Map restaurant_id → email → KAM name
→ Group by KAM, sum revenue
→ Return KAM with max revenue

Q: "Show me revenue by Mahima Sali in April"
→ Get brands where KAM Name 1/2/3 = "Mahima Sali"
→ Get restaurant_ids for those brands
→ Filter Revenue.csv for April + those restaurant_ids
→ Sum and return

## Churn Queries
Q: "What is the churn revenue ratio?"
→ Get churned restaurant_ids from Churn.csv
→ Get revenue for churned outlets from Revenue.csv
→ Get total revenue from Revenue.csv
→ Calculate: (churn_revenue / total_revenue) * 100
→ Return percentage with amounts

## Complex Queries
Q: "Compare revenue between [KAM1] and [KAM2] in [Month]"
→ Get revenue for each KAM separately
→ Return comparison with amounts

Q: "What's the average expense per KAM?"
→ Group expenses by KAM
→ Calculate average
→ Return formatted result
`;
