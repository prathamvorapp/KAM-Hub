# SCI Product Weight Rationale

## Why Different Weights?

Not all products have the same switching cost. Products that are deeply embedded in daily operations create higher barriers to switching.

## Weight Categories Explained

### Weight 3: Operationally Critical Products

These products are integrated into core business operations and require significant retraining, process changes, and data migration:

#### **Captain_Application** (Weight: 3)
- Used by waitstaff throughout service
- Requires extensive training
- Integrated into service workflow
- High usage frequency per outlet

#### **Self_Order_Kiosk** (Weight: 3)
- Customer-facing hardware
- Requires physical installation
- Customer experience dependency
- Menu and payment integration

#### **Inventory_Application** (Weight: 3)
- Supply chain management
- Vendor relationships
- Historical data value
- Critical for cost control

#### **Petpooja_Loyalty** (Weight: 3)
- Customer database and history
- Accumulated points/rewards
- Marketing campaigns
- Customer relationship lock-in

#### **Dynamic_Reports** (Weight: 3)
- Business intelligence
- Historical analytics
- Custom report configurations
- Decision-making dependency

#### **Reservation_Manager_App** (Weight: 3)
- Customer booking data
- Integrated with operations
- Customer communication history
- Table management workflow

#### **Kitchen_Display_System** (Weight: 3)
- Kitchen workflow integration
- Hardware installation
- Staff training required
- Real-time operations dependency

#### **Waiter_Calling_Device** (Weight: 3)
- Service coordination
- Hardware dependency
- Staff workflow integration
- Customer service impact

### Weight 2: Important Business Products

These products are valuable but less operationally embedded:

#### **Petpooja_Payroll** (Weight: 2)
- HR data and history
- Compliance records
- Important but periodic usage

#### **Growth/Scale Plans** (Weight: 2)
- Bundle offerings
- Strategic but not daily operations
- Can be replaced more easily

#### **Petpooja_Scan_Order** (Weight: 2)
- QR ordering feature
- Less embedded than kiosk
- Easier to replace

### Weight 1: Standard Products

All other non-core products have standard weight as they:
- Are used less frequently
- Have lower operational dependency
- Can be replaced with minimal disruption
- Don't require extensive retraining

## Impact on SCI Calculation

### Example Scenario

**Brand A: Using high-weight products across outlets**
- Captain App in 20/20 outlets
- Inventory in 20/20 outlets
- KDS in 15/20 outlets
- Result: High SCI due to operational embeddedness

**Brand B: Using low-weight products across outlets**
- Petpooja_Tasks in 20/20 outlets
- SMS_Service in 20/20 outlets
- Petpooja_Connect in 15/20 outlets
- Result: Lower SCI despite similar spread

## Business Implications

1. **Focus on High-Weight Products**: Selling Captain, Inventory, or KDS creates stronger customer lock-in

2. **Multi-Outlet Deployment**: High-weight products across many outlets = exponentially higher switching costs

3. **Churn Risk Assessment**: Brands with only low-weight products are easier to lose

4. **Upsell Strategy**: Moving customers from weight-1 to weight-3 products increases retention

5. **Customer Success**: Prioritize support for high-weight products to maintain satisfaction

## Weight Distribution in Dataset

Typical distribution:
- 8 products at weight 3 (high switching cost)
- 6 products at weight 2 (medium switching cost)
- 30+ products at weight 1 (standard)

This ensures that truly embedded products have 3x the impact of standard products in the SCI calculation.
