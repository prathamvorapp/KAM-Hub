import { describe, test, expect } from 'vitest'
import fc from 'fast-check'
import { MetricsCalculator } from './metrics-calculator'
import { BrandWithKAM, KAMRecord } from './types'

// Arbitrary generators for property-based testing
const kamRecordArbitrary = () => fc.record({
  brand_uid: fc.uuid(),
  brand_name: fc.string(),
  email: fc.emailAddress(),
  assign_date_1: fc.option(fc.date({ min: new Date('2020-01-01'), max: new Date('2027-12-31') })),
  kam_name_1: fc.string(),
  assign_date_2: fc.option(fc.date({ min: new Date('2020-01-01'), max: new Date('2027-12-31') })),
  kam_name_2: fc.string(),
})

const brandWithKAMArbitrary = () => fc.record({
  restaurant_id: fc.uuid(),
  email: fc.emailAddress(),
  kam_assignment: fc.option(kamRecordArbitrary()),
  outlets: fc.constant([]),
  
  // Products
  Petpooja_Tasks_status: fc.constantFrom('Active', 'Inactive', ''),
  Petpooja_Tasks_creation: fc.option(fc.date()),
  Petpooja_Tasks_expiry: fc.option(fc.date()),
  
  Petpooja_Payroll_status: fc.constantFrom('Active', 'Inactive', ''),
  Petpooja_Payroll_creation: fc.option(fc.date()),
  Petpooja_Payroll_expiry: fc.option(fc.date()),
  
  POS_Subscription_status: fc.constantFrom('Active', 'Inactive', ''),
  POS_Subscription_creation: fc.option(fc.date()),
  POS_Subscription_expiry: fc.option(fc.date()),
  
  // Bundle plans
  Petpooja_Growth_Plan_status: fc.constantFrom('Active', 'Inactive', ''),
  Petpooja_Growth_Plan_creation: fc.option(fc.date()),
  Petpooja_Growth_Plan_expiry: fc.option(fc.date()),
  
  Petpooja_Scale_Plan_status: fc.constantFrom('Active', 'Inactive', ''),
  Petpooja_Scale_Plan_creation: fc.option(fc.date()),
  Petpooja_Scale_Plan_expiry: fc.option(fc.date()),
  
  Petpooja_Ultimate_Plan_status: fc.constantFrom('Active', 'Inactive', ''),
  Petpooja_Ultimate_Plan_creation: fc.option(fc.date()),
  Petpooja_Ultimate_Plan_expiry: fc.option(fc.date()),
  
  Petpooja_POS_Ultimate_Plan_status: fc.constantFrom('Active', 'Inactive', ''),
  Petpooja_POS_Ultimate_Plan_creation: fc.option(fc.date()),
  Petpooja_POS_Ultimate_Plan_expiry: fc.option(fc.date()),
  
  Petpooja_POS_Growth_Plan_status: fc.constantFrom('Active', 'Inactive', ''),
  Petpooja_POS_Growth_Plan_creation: fc.option(fc.date()),
  Petpooja_POS_Growth_Plan_expiry: fc.option(fc.date()),
  
  Petpooja_POS_Scale_Plan_status: fc.constantFrom('Active', 'Inactive', ''),
  Petpooja_POS_Scale_Plan_creation: fc.option(fc.date()),
  Petpooja_POS_Scale_Plan_expiry: fc.option(fc.date()),
  
  // Services (minimal for testing)
  Captain_Application_status: fc.constantFrom('Active', 'Inactive', ''),
  Captain_Application_creation: fc.option(fc.date()),
  Captain_Application_expiry: fc.option(fc.date()),
  
  Petpooja_Pay_status: fc.constantFrom('Active', 'Inactive', ''),
  Petpooja_Pay_creation: fc.option(fc.date()),
  Petpooja_Pay_expiry: fc.option(fc.date()),
  
  Petpooja_Connect_status: fc.constantFrom('Active', 'Inactive', ''),
  Petpooja_Connect_creation: fc.option(fc.date()),
  Petpooja_Connect_expiry: fc.option(fc.date()),
  
  Intellisense_status: fc.constantFrom('Active', 'Inactive', ''),
  Intellisense_creation: fc.option(fc.date()),
  Intellisense_expiry: fc.option(fc.date()),
  
  QR_Feedback_status: fc.constantFrom('Active', 'Inactive', ''),
  QR_Feedback_creation: fc.option(fc.date()),
  QR_Feedback_expiry: fc.option(fc.date()),
  
  Self_Order_Kiosk_status: fc.constantFrom('Active', 'Inactive', ''),
  Self_Order_Kiosk_creation: fc.option(fc.date()),
  Self_Order_Kiosk_expiry: fc.option(fc.date()),
  
  Online_Order_Reconciliation_status: fc.constantFrom('Active', 'Inactive', ''),
  Online_Order_Reconciliation_creation: fc.option(fc.date()),
  Online_Order_Reconciliation_expiry: fc.option(fc.date()),
  
  Inventory_Application_status: fc.constantFrom('Active', 'Inactive', ''),
  Inventory_Application_creation: fc.option(fc.date()),
  Inventory_Application_expiry: fc.option(fc.date()),
  
  Petpooja_Loyalty_status: fc.constantFrom('Active', 'Inactive', ''),
  Petpooja_Loyalty_creation: fc.option(fc.date()),
  Petpooja_Loyalty_expiry: fc.option(fc.date()),
  
  Online_Ordering_Widget_status: fc.constantFrom('Active', 'Inactive', ''),
  Online_Ordering_Widget_creation: fc.option(fc.date()),
  Online_Ordering_Widget_expiry: fc.option(fc.date()),
  
  My_Website_status: fc.constantFrom('Active', 'Inactive', ''),
  My_Website_creation: fc.option(fc.date()),
  My_Website_expiry: fc.option(fc.date()),
  
  Dynamic_Reports_status: fc.constantFrom('Active', 'Inactive', ''),
  Dynamic_Reports_creation: fc.option(fc.date()),
  Dynamic_Reports_expiry: fc.option(fc.date()),
  
  Petpooja_Plus_status: fc.constantFrom('Active', 'Inactive', ''),
  Petpooja_Plus_creation: fc.option(fc.date()),
  Petpooja_Plus_expiry: fc.option(fc.date()),
  
  Power_Integration_status: fc.constantFrom('Active', 'Inactive', ''),
  Power_Integration_creation: fc.option(fc.date()),
  Power_Integration_expiry: fc.option(fc.date()),
  
  Reservation_Manager_App_status: fc.constantFrom('Active', 'Inactive', ''),
  Reservation_Manager_App_creation: fc.option(fc.date()),
  Reservation_Manager_App_expiry: fc.option(fc.date()),
  
  Petpooja_Scan_Order_status: fc.constantFrom('Active', 'Inactive', ''),
  Petpooja_Scan_Order_creation: fc.option(fc.date()),
  Petpooja_Scan_Order_expiry: fc.option(fc.date()),
  
  Gift_Card_status: fc.constantFrom('Active', 'Inactive', ''),
  Gift_Card_creation: fc.option(fc.date()),
  Gift_Card_expiry: fc.option(fc.date()),
  
  Feedback_Management_status: fc.constantFrom('Active', 'Inactive', ''),
  Feedback_Management_creation: fc.option(fc.date()),
  Feedback_Management_expiry: fc.option(fc.date()),
  
  Data_Lake_status: fc.constantFrom('Active', 'Inactive', ''),
  Data_Lake_creation: fc.option(fc.date()),
  Data_Lake_expiry: fc.option(fc.date()),
  
  SMS_Service_status: fc.constantFrom('Active', 'Inactive', ''),
  SMS_Service_creation: fc.option(fc.date()),
  SMS_Service_expiry: fc.option(fc.date()),
  
  Petpooja_Purchase_status: fc.constantFrom('Active', 'Inactive', ''),
  Petpooja_Purchase_creation: fc.option(fc.date()),
  Petpooja_Purchase_expiry: fc.option(fc.date()),
  
  Weigh_Scale_Service_status: fc.constantFrom('Active', 'Inactive', ''),
  Weigh_Scale_Service_creation: fc.option(fc.date()),
  Weigh_Scale_Service_expiry: fc.option(fc.date()),
  
  Whatsapp_CRM_status: fc.constantFrom('Active', 'Inactive', ''),
  Whatsapp_CRM_creation: fc.option(fc.date()),
  Whatsapp_CRM_expiry: fc.option(fc.date()),
  
  Petpooja_Go_Rental_status: fc.constantFrom('Active', 'Inactive', ''),
  Petpooja_Go_Rental_creation: fc.option(fc.date()),
  Petpooja_Go_Rental_expiry: fc.option(fc.date()),
  
  Queue_Management_status: fc.constantFrom('Active', 'Inactive', ''),
  Queue_Management_creation: fc.option(fc.date()),
  Queue_Management_expiry: fc.option(fc.date()),
  
  Petpooja_PRO_status: fc.constantFrom('Active', 'Inactive', ''),
  Petpooja_PRO_creation: fc.option(fc.date()),
  Petpooja_PRO_expiry: fc.option(fc.date()),
  
  Kitchen_Display_System_status: fc.constantFrom('Active', 'Inactive', ''),
  Kitchen_Display_System_creation: fc.option(fc.date()),
  Kitchen_Display_System_expiry: fc.option(fc.date()),
  
  Waiter_Calling_Device_status: fc.constantFrom('Active', 'Inactive', ''),
  Waiter_Calling_Device_creation: fc.option(fc.date()),
  Waiter_Calling_Device_expiry: fc.option(fc.date()),
  
  Virtual_Wallet_status: fc.constantFrom('Active', 'Inactive', ''),
  Virtual_Wallet_creation: fc.option(fc.date()),
  Virtual_Wallet_expiry: fc.option(fc.date()),
  
  Petpooja_Briefcase_status: fc.constantFrom('Active', 'Inactive', ''),
  Petpooja_Briefcase_creation: fc.option(fc.date()),
  Petpooja_Briefcase_expiry: fc.option(fc.date()),
  
  Token_Management_status: fc.constantFrom('Active', 'Inactive', ''),
  Token_Management_creation: fc.option(fc.date()),
  Token_Management_expiry: fc.option(fc.date()),
  
  Link_based_Feedback_Service_status: fc.constantFrom('Active', 'Inactive', ''),
  Link_based_Feedback_Service_creation: fc.option(fc.date()),
  Link_based_Feedback_Service_expiry: fc.option(fc.date()),
})

describe('MetricsCalculator', () => {
  const calculator = new MetricsCalculator()
  
  describe('calculateBrandCount', () => {
    // Feature: brand-journey-dashboard, Property 4: Brand count accuracy
    test('brand count equals unique emails with valid assignment dates', () => {
      fc.assert(
        fc.property(
          fc.array(brandWithKAMArbitrary()),
          fc.date({ min: new Date('2020-01-01'), max: new Date('2027-12-31') }),
          (brands, targetMonth) => {
            const count = calculator.calculateBrandCount(brands, targetMonth)
            
            // Calculate expected count: unique emails with assign_date_1 <= targetMonth
            const expected = new Set(
              brands
                .filter(b => b.kam_assignment?.assign_date_1 && b.kam_assignment.assign_date_1 <= targetMonth)
                .map(b => b.email.toLowerCase())
            ).size
            
            expect(count).toBe(expected)
          }
        ),
        { numRuns: 100 }
      )
    })
  })
  
  describe('calculateOutletCount', () => {
    // Feature: brand-journey-dashboard, Property 5: Outlet count with expiry logic and KAM assignment filtering
    test('outlet count includes only active outlets with expiry after target month from brands with KAM assigned', () => {
      fc.assert(
        fc.property(
          fc.array(brandWithKAMArbitrary()),
          fc.date({ min: new Date('2020-01-01'), max: new Date('2027-12-31') }),
          (brands, targetMonth) => {
            const count = calculator.calculateOutletCount(brands, targetMonth)
            
            // Calculate expected count: outlets with Active status and expiry > targetMonth (or no expiry)
            // Only from brands with KAM assigned on or before target month
            let expected = 0
            for (const brand of brands) {
              // Skip brands without KAM assignment or assigned after target month
              if (!brand.kam_assignment?.assign_date_1 || brand.kam_assignment.assign_date_1 > targetMonth) {
                continue
              }
              
              for (const outlet of brand.outlets) {
                if (outlet.pos_status === 'Active') {
                  if (!outlet.pos_expiry || outlet.pos_expiry > targetMonth) {
                    expected++
                  }
                }
              }
            }
            
            expect(count).toBe(expected)
          }
        ),
        { numRuns: 100 }
      )
    })
  })
})
