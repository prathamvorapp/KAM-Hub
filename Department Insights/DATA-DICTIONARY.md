# Complete Data Dictionary - All CSV Files Explained

## Overview

This document explains all 6 CSV files, their structure, relationships, and how to query them.

---

## 1. Brand DATA CSV.csv

### Purpose
Tracks all restaurant outlets and their product/service subscriptions.

### Key Fields
- **restaurant_id**: Unique identifier for each outlet (e.g., "27647", "105367")
- **email**: Brand's email address (multiple outlets can share same email = same brand)
- **[Product]_status**: Status of subscription ("active", "inactive", or empty)
- **[Product]_creation**: When subscription was created (DD-MM-YYYY format)
- **[Product]_expiry**: When subscription expires (DD-MM-YYYY format)

### Products Tracked
- POS_Subscription (main product)
- Petpooja_Tasks
- Petpooja_Payroll
- Captain_Application
- Petpooja_Pay
- Petpooja_Connect
- Intellisense
- QR_Feedback
- Self_Order_Kiosk
- Online_Order_Reconciliation
- Inventory_Application
- Petpooja_Loyalty
- Online_Ordering_Widget
- My_Website
- Dynamic_Reports
- Petpooja_Plus
- Power_Integration
- Reservation_Manager_App
- Petpooja_Scan_Order
- Gift_Card
- Feedback_Management
- Data_Lake
- SMS_Service
- Petpooja_Purchase
- Weigh_Scale_Service
- Whatsapp_CRM
- Petpooja_Go_Rental
- Queue_Management
- Petpooja_PRO
- Kitchen_Display_System
- Waiter_Calling_Device
- Virtual_Wallet
- Petpooja_Briefcase
- Token_Management
- Link_based_Feedback_Service

### Bundle Plans
- Petpooja_Growth_Plan
- Petpooja_Scale_Plan
- Petpooja_Ultimate_Plan
- Petpooja_POS_Ultimate_Plan
- Petpooja_POS_Growth_Plan
- Petpooja_POS_Scale_Plan

### Example Row
```csv
restaurant_id,email,POS_Subscription_status,POS_Subscription_creation,POS_Subscription_expiry
27647,pephospitality@gmail.com,active,19-08-2020,27-08-2026
```

### What You Can Query
- Which products/services an outlet has
- When subscriptions were created
- When subscriptions expire
- Which outlets belong to which brand (by email)

---

## 2. KAM Data CSV.csv

### Purpose
Links brands to Key Account Managers (KAMs) and tracks KAM assignment history.

### Key Fields
- **Brand UID**: Unique brand identifier (numeric)
- **Brand Name**: Human-readable brand name (e.g., "CHOICE", "HONEST")
- **email**: Brand's email (links to Brand DATA CSV)
- **KAM Name 1-6**: Up to 6 KAM assignments over time
- **Assign Date 1-6**: When each KAM was assigned (DD-MM-YYYY)

### Example Row
```csv
Brand UID,Brand Name,email,KAM Name 1,Assign Date 1,KAM Name 2,Assign Date 2
46,CHOICE,sheel@choicesnackbar.com,Harsh Gohel,26-09-2024,Mahima Sali,24-04-2025
```

### What You Can Query
- Which KAM manages which brand
- When KAM assignments changed
- Brand names for human-readable reports
- Historical KAM assignments

### Relationship to Other Files
```
KAM Data CSV (email) → Brand DATA CSV (email) → Revenue CSV (restaurant_id)
```

---

## 3. Revenue.csv

### Purpose
Actual transaction data showing real revenue from sales.

### Key Fields
- **Date**: Transaction date (DD-MM-YYYY format, e.g., "02-04-2025")
- **Product Or service Name**: What was sold (e.g., "Android POS", "POS Subscription Renewal")
- **Amount**: Revenue amount in rupees (e.g., "7500")
- **restaurant_id**: Which outlet made the transaction (links to Brand DATA CSV)

### Example Row
```csv
Date,Product Or service Name,Amount,restaurant_id
02-04-2025,Android POS,7500,375011
13-04-2025,POS Subscription Renewal,5000,366272
```

### Revenue Types
- **New Revenue**: Products without "Renewal" in name
- **Renewal Revenue**: Products with "Renewal" in name

### What You Can Query
- Total revenue by month
- Revenue by specific outlet
- Revenue by KAM (via email linkage)
- New vs Renewal revenue breakdown
- Transaction history

### How to Link to KAM
```
1. Get restaurant_id from Revenue.csv
2. Find email in Brand DATA CSV where restaurant_id matches
3. Find KAM in KAM Data CSV where email matches
```

---

## 4. Expense.csv

### Purpose
Tracks expenses by Key Account Managers.

### Key Fields
- **Date**: Expense date (DD-MM-YYYY format)
- **KAM**: Key Account Manager name (e.g., "Rahul Taak", "Bhanvi Gupta")
- **Total**: Expense amount in rupees

### Example Row
```csv
Date,KAM,Total
13-08-2025,Rahul Taak,4466.3
01-12-2025,Bhanvi Gupta,7919.3
```

### Available KAMs (from your data)
- Rahul Taak
- Bhanvi Gupta
- Antolina Anil Francis
- Kripal Patel
- Snehal Dwivedi
- Acharya Arpit
- Sagar Kothari
- Nikhil Kumar
- Mahima Sali
- Harsh Gohel

### What You Can Query
- Total expenses by KAM
- Expenses by date range
- Average expense per KAM
- Monthly expense trends

### Important Note
**Pratham Vora is NOT in the Expense CSV** - that's why the query failed. Use one of the KAMs listed above.

---

## 5. Churn.csv

### Purpose
Tracks restaurants that stopped using the service (churned).

### Key Fields
- **Date**: Churn date (DD-MMM-YY format, e.g., "29-Apr-25")
- **restaurant_id**: Which outlet churned (links to Brand DATA CSV)
- **Churn Reasons**: Why they left (e.g., "Permanently Closed", "Switched to competitor")
- **Churn Remarks**: Additional details
- **New Remarks**: Updated information

### Example Row
```csv
Date,restaurant_id,Churn Reasons,Churn Remarks
29-Apr-25,112491,Permanently Closed (Outlet/brand),Due to Ramdan not Responding calls
```

### What You Can Query
- Total churned outlets
- Churn reasons breakdown
- Churn rate by month
- Revenue from churned outlets
- Churn by KAM

### How to Calculate Churn Revenue Ratio
```
1. Get all churned restaurant_ids from Churn.csv
2. Filter Revenue.csv for those restaurant_ids
3. Sum revenue from churned outlets
4. Divide by total revenue
5. Multiply by 100 for percentage
```

---

## 6. Price Data CSV.csv

### Purpose
Lookup table for standard product/service prices.

### Key Fields
- **Service/Product Name**: Product identifier (e.g., "POS_Subscription", "Android POS")
- **Price**: Standard price in rupees

### Example Row
```csv
Service/Product Name,Price
POS_Subscription,10000
POS_Subscription_Renewal,7000
Android POS,7500
```

### What You Can Query
- Standard price for any product
- Price differences between new and renewal
- Product catalog

---

## Data Relationships Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    KAM Data CSV                             │
│  Brand UID | Brand Name | email | KAM Name 1 | Assign Date │
└──────────────────────┬──────────────────────────────────────┘
                       │ (linked by email)
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                  Brand DATA CSV                             │
│  restaurant_id | email | POS_status | POS_creation | ...    │
└──────────────────────┬──────────────────────────────────────┘
                       │ (linked by restaurant_id)
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                    Revenue.csv                              │
│  Date | Product Name | Amount | restaurant_id               │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    Churn.csv                                │
│  Date | restaurant_id | Churn Reasons | Remarks             │
└──────────────────────┬──────────────────────────────────────┘
                       │ (linked by restaurant_id)
                       └──> Links to Brand DATA CSV & Revenue.csv

┌─────────────────────────────────────────────────────────────┐
│                    Expense.csv                              │
│  Date | KAM | Total                                         │
└──────────────────────┬──────────────────────────────────────┘
                       │ (linked by KAM name)
                       └──> Links to KAM Data CSV

┌─────────────────────────────────────────────────────────────┐
│                  Price Data CSV                             │
│  Service/Product Name | Price                               │
└─────────────────────────────────────────────────────────────┘
                       (lookup table, no direct links)
```

---

## Query Examples by Use Case

### 1. Get Expense by KAM
**Data Source**: Expense.csv
**Query**: Filter by KAM name
```
Example: "What is expense by Rahul Taak?"
→ Filter Expense.csv where KAM = "Rahul Taak"
→ Sum Total column
```

### 2. Get Revenue by KAM
**Data Sources**: KAM Data CSV → Brand DATA CSV → Revenue.csv
**Query**: Link through email and restaurant_id
```
Example: "Show me revenue by Mahima Sali in April"
→ Find brands in KAM Data CSV where KAM Name = "Mahima Sali"
→ Get emails for those brands
→ Find restaurant_ids in Brand DATA CSV for those emails
→ Filter Revenue.csv for April + those restaurant_ids
→ Sum Amount column
```

### 3. Get Highest Revenue KAM
**Data Sources**: Revenue.csv → Brand DATA CSV → KAM Data CSV
**Query**: Reverse link from revenue to KAM
```
Example: "Which KAM has highest revenue in August?"
→ Filter Revenue.csv for August
→ For each transaction, get restaurant_id
→ Find email in Brand DATA CSV
→ Find KAM in KAM Data CSV
→ Group by KAM and sum revenue
→ Return KAM with max revenue
```

### 4. Get Churn Revenue Ratio
**Data Sources**: Churn.csv + Revenue.csv
**Query**: Match churned outlets to revenue
```
Example: "What is the churn revenue ratio?"
→ Get all restaurant_ids from Churn.csv
→ Filter Revenue.csv for those restaurant_ids
→ Sum churned revenue
→ Calculate: (churned revenue / total revenue) * 100
```

### 5. Get Brand Information
**Data Source**: Brand DATA CSV + KAM Data CSV
**Query**: Link by email
```
Example: "Tell me about brand CHOICE"
→ Find in KAM Data CSV where Brand Name = "CHOICE"
→ Get email
→ Find all outlets in Brand DATA CSV with that email
→ Show subscriptions, KAM, outlet count
```

---

## Key Concepts

### Brand vs Outlet
- **Brand**: A restaurant business (identified by email)
  - Example: "Domino's Pizza" (brand)
- **Outlet**: A physical location (identified by restaurant_id)
  - Example: "Domino's Pizza - MG Road" (outlet)
- One brand can have multiple outlets
- All outlets of a brand share the same email

### KAM (Key Account Manager)
- Sales/account managers who handle brand relationships
- Each brand is assigned to a KAM
- KAMs can change over time (tracked in Assign Date 1-6)
- KAM performance measured by revenue and brand count

### Revenue Types
- **New Revenue**: First-time purchases, new subscriptions
- **Renewal Revenue**: Subscription renewals (has "Renewal" in product name)

### Time Periods
- **Realized Data**: April 2025 - January 2026 (actual historical data)
- **Projected Data**: February 2026 - March 2027 (estimates)

---

## Common Mistakes & Solutions

### ❌ Mistake 1: Looking for KAM in wrong file
**Wrong**: Looking for "Pratham Vora" in Expense.csv
**Right**: Check available KAMs first, use one from the list

### ❌ Mistake 2: Linking Brand UID to restaurant_id
**Wrong**: Trying to match Brand UID directly to restaurant_id
**Right**: Link through email (KAM Data → Brand DATA → Revenue)

### ❌ Mistake 3: Ignoring date formats
**Wrong**: Assuming all dates are in same format
**Right**: Handle DD-MM-YYYY, DD-MMM-YY, and other formats

### ❌ Mistake 4: Case-sensitive matching
**Wrong**: Exact match "mahima sali" vs "Mahima Sali"
**Right**: Use case-insensitive matching

---

## Data Statistics (from your files)

- **Brands**: 35,199 total outlets
- **Revenue Records**: 25,995 transactions
- **Expense Records**: 312 entries
- **Churn Records**: 4,617 churned outlets
- **KAM Assignments**: 1,381 brand-KAM relationships

---

## Quick Reference Table

| What You Want | Primary CSV | Linked CSVs | Key Field |
|---------------|-------------|-------------|-----------|
| Expense by KAM | Expense.csv | None | KAM |
| Revenue by KAM | Revenue.csv | Brand DATA, KAM Data | restaurant_id → email → KAM |
| Brand info | Brand DATA CSV | KAM Data | email |
| KAM assignments | KAM Data CSV | Brand DATA | email |
| Churn data | Churn.csv | Brand DATA, Revenue | restaurant_id |
| Product prices | Price Data CSV | None | Service/Product Name |
| Outlet subscriptions | Brand DATA CSV | None | restaurant_id |

---

## For the AI Chatbot

When answering queries:

1. **Expense queries** → Look in Expense.csv only
2. **Revenue queries** → Start with Revenue.csv, link to KAM Data via Brand DATA
3. **Brand queries** → Start with KAM Data or Brand DATA
4. **Churn queries** → Start with Churn.csv, link to Revenue if needed
5. **KAM performance** → Combine Revenue.csv + Expense.csv via KAM linkage

Always remember:
- Email is the bridge between KAM Data and Brand DATA
- restaurant_id is the bridge between Brand DATA and Revenue
- KAM name is the bridge between KAM Data and Expense
- Case-insensitive matching for names
- Multiple date formats need handling

---

**This is your complete data dictionary. Use it to understand which CSV to query for any question!**
