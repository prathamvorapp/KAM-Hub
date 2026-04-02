import { describe, test, expect } from 'vitest'
import fc from 'fast-check'
import { MilestoneGenerator } from './milestone-generator'
import { BrandWithKAM, PriceRecord } from './types'

// Arbitrary generators for property-based testing
const priceRecordArbitrary = () => fc.record({
  service_product_name: fc.string(),
  price: fc.float({ min: 0, max: 10000 }),
})

const brandWithKAMArbitrary = () => fc.record({
  restaurant_id: fc.uuid(),
  email: fc.emailAddress(),
  kam_assignment: fc.option(fc.record({
    brand_uid: fc.uuid(),
    brand_name: fc.string(),
    email: fc.emailAddress(),
    assign_date_1: fc.option(fc.date({ min: new Date('2020-01-01'), max: new Date('2027-12-31') })),
    kam_name_1: fc.string(),
    assign_date_2: fc.option(fc.date({ min: new Date('2020-01-01'), max: new Date('2027-12-31') })),
    kam_name_2: fc.string(),
  })),
  outlets: fc.constant([]),
  
  // Products
  Petpooja_Tasks_status: fc.constantFrom('Active', 'Inactive', ''),
  Petpooja_Tasks_creation: fc.option(fc.date()),
  Petpooja_Tasks_expiry: fc.option(fc.date()),
  
  Petpooja_Payroll_status: fc.constantFrom('Active', 'Inactive', ''),
  Petpooja_Payroll_creation: fc.option(fc.date()),
  Petpooja_Payroll_expiry: fc.option(fc.date()),
  
  POS_Subscription_status: fc.constantFrom('Active', 'Inactive', ''),
  POS_Subscription_creation: fc.option(fc.date({ min: new Date('2020-01-01'), max: new Date('2027-12-31') })),
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

describe('MilestoneGenerator', () => {
  describe('generateBrandTimeline', () => {
    // Feature: brand-journey-dashboard, Property 14: Brand journey start date
    test('brand journey timeline starts from POS_Subscription_creation date', () => {
      fc.assert(
        fc.property(
          fc.array(priceRecordArbitrary()),
          brandWithKAMArbitrary(),
          (prices, brand) => {
            const generator = new MilestoneGenerator(prices)
            const timeline = generator.generateBrandTimeline(brand)
            
            // If brand has POS_Subscription_creation, timeline should start from that date
            if (brand.POS_Subscription_creation) {
              expect(timeline.startDate).toEqual(brand.POS_Subscription_creation)
            } else {
              // Otherwise, should default to April 2025
              expect(timeline.startDate).toEqual(new Date(2025, 3, 1))
            }
          }
        ),
        { numRuns: 100 }
      )
    })

    
    // Feature: brand-journey-dashboard, Property 15: KAM assignment milestone ordering
    test('KAM assignment milestone appears after journey start and before April 2025', () => {
      fc.assert(
        fc.property(
          fc.array(priceRecordArbitrary()),
          brandWithKAMArbitrary(),
          (prices, brand) => {
            const generator = new MilestoneGenerator(prices)
            const timeline = generator.generateBrandTimeline(brand)
            
            // Find KAM assignment milestone
            const kamMilestone = timeline.milestones.find(m => m.label.includes('KAM Assigned'))
            
            if (brand.kam_assignment?.assign_date_1 && brand.POS_Subscription_creation) {
              const kamDate = brand.kam_assignment.assign_date_1
              const posDate = brand.POS_Subscription_creation
              
              // KAM milestone should only appear if in a different month than POS creation
              const inDifferentMonth = kamDate.getFullYear() !== posDate.getFullYear() ||
                                      kamDate.getMonth() !== posDate.getMonth()
              
              // If KAM assignment is after POS creation AND in different month, it should be in milestones
              if (kamDate > posDate && inDifferentMonth) {
                expect(kamMilestone).toBeDefined()
                
                if (kamMilestone) {
                  // KAM milestone should be after journey start
                  expect(kamMilestone.date.getTime()).toBeGreaterThan(timeline.startDate.getTime())
                  
                  // Find April 2025 milestone
                  const april2025Milestone = timeline.milestones.find(m => 
                    m.date.getFullYear() === 2025 && m.date.getMonth() === 3 && !m.label.includes('KAM')
                  )
                  
                  // If April 2025 exists and KAM is before it, verify ordering
                  if (april2025Milestone && kamDate < new Date(2025, 3, 1)) {
                    const kamIndex = timeline.milestones.indexOf(kamMilestone)
                    const aprilIndex = timeline.milestones.indexOf(april2025Milestone)
                    expect(kamIndex).toBeLessThan(aprilIndex)
                  }
                }
              } else if (kamDate > posDate && !inDifferentMonth) {
                // If in same month, KAM milestone should NOT exist
                expect(kamMilestone).toBeUndefined()
              }
            }
          }
        ),
        { numRuns: 100 }
      )
    })
    
    // Feature: brand-journey-dashboard, Property 16: Brand-specific metric filtering
    test('brand journey milestones contain only brand-specific metrics', () => {
      fc.assert(
        fc.property(
          fc.array(priceRecordArbitrary()),
          brandWithKAMArbitrary(),
          fc.array(brandWithKAMArbitrary()),
          (prices, targetBrand, otherBrands) => {
            const generator = new MilestoneGenerator(prices)
            const timeline = generator.generateBrandTimeline(targetBrand)
            
            // All milestones should have metrics
            for (const milestone of timeline.milestones) {
              expect(milestone.metrics).toBeDefined()
              
              // Metrics should have the structure of BrandMetrics
              expect(milestone.metrics).toHaveProperty('outletCount')
              expect(milestone.metrics).toHaveProperty('revenue')
              expect(milestone.metrics).toHaveProperty('isProjected')
              
              // Outlet count should be based only on target brand's outlets
              const metrics = milestone.metrics as any
              expect(typeof metrics.outletCount).toBe('number')
              expect(metrics.outletCount).toBeGreaterThanOrEqual(0)
              expect(metrics.outletCount).toBeLessThanOrEqual(targetBrand.outlets.length)
            }
          }
        ),
        { numRuns: 100 }
      )
    })
  })
})
