# Product, Service, and Bundle Categorization

## Overview
This document defines the correct categorization of all subscription types in the revenue calculator.

## Categories

### Products (4 items)
Products are core subscription offerings:
- POS_Subscription
- Petpooja_Payroll
- Petpooja_Tasks
- Petpooja_Purchase

### Services (19 items)
Services are add-on features and capabilities:
- Dynamic_Reports
- Captain_Application
- Kitchen_Display_System
- Online_Ordering_Widget
- My_Website
- Online_Order_Reconciliation
- Waiter_Calling_Device
- Token_Management
- Virtual_Wallet
- Petpooja_Loyalty
- Feedback_Management
- QR_Feedback
- Link_based_Feedback_Service
- Self_Order_Kiosk
- Data_Lake
- SMS_Service
- Whatsapp_CRM
- Reservation_Manager_App
- Petpooja_Scan_Order

### Bundles (6 items)
Bundles are package deals that include multiple products/services:
- Petpooja_Scale_Plan
- Petpooja_Growth_Plan
- Petpooja_Ultimate_Plan
- Petpooja_POS_Growth_Plan
- Petpooja_POS_Ultimate_Plan
- Petpooja_POS_Scale_Plan

## Renewal Pricing
Each subscription type can have a renewal price defined in the price data:
- Format: `{SubscriptionName}_Renewal`
- Examples:
  - POS_Subscription_Renewal
  - Petpooja_Payroll_Renewal
  - Petpooja_Tasks_Renewal
  - Petpooja_POS_Growth_Plan_Renewal
  - Petpooja_POS_Scale_Plan_Renewal
  - Petpooja_POS_Ultimate_Plan_Reneweal (note: typo in original data)

## Revenue Calculation Logic

### Bundle Priority
If a brand has an active bundle plan, ONLY the bundle revenue is counted. Individual products and services are NOT counted separately.

### Without Bundle
If no bundle plan is active:
1. Calculate revenue from all active products
2. Calculate revenue from all active services
3. Sum both for total revenue

### Recurring Revenue
Revenue is recognized in:
1. Creation month (initial purchase)
2. Anniversary months (annual renewals)

For renewals, the system uses:
- Renewal price if available in price data
- Initial price as fallback if no renewal price exists

## Implementation
The categorization is implemented in `lib/revenue-calculator.ts`:
- `detectBundlePlan()` - Checks for active bundle plans
- `calculateBrandRevenue()` - Applies the categorization logic
- Product fields array - Lists all product subscriptions
- Service fields array - Lists all service subscriptions
