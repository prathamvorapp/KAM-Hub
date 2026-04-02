import { describe, test, expect } from 'vitest'
import fc from 'fast-check'
import { CSVParser } from './csv-parser'
import { BrandRecord, KAMRecord, PriceRecord } from './types'

// Feature: brand-journey-dashboard, Property 1: CSV field extraction completeness
describe('CSV Parser - Property Tests', () => {
  test('Property 1: CSV field extraction completeness - all required fields are extracted', async () => {
    const parser = new CSVParser()
    
    // Parse actual CSV files
    const brands = await parser.parseBrandData()
    const kams = await parser.parseKAMData()
    const prices = await parser.parsePriceData()
    
    // Verify brands have all required fields
    expect(brands.length).toBeGreaterThan(0)
    brands.forEach(brand => {
      expect(brand).toHaveProperty('restaurant_id')
      expect(brand).toHaveProperty('email')
      expect(brand).toHaveProperty('POS_Subscription_status')
      expect(brand).toHaveProperty('POS_Subscription_creation')
      expect(brand).toHaveProperty('POS_Subscription_expiry')
      expect(brand).toHaveProperty('Petpooja_Tasks_status')
      expect(brand).toHaveProperty('Petpooja_Payroll_status')
      expect(brand).toHaveProperty('Petpooja_Growth_Plan_status')
      expect(brand).toHaveProperty('Petpooja_Scale_Plan_status')
      expect(brand).toHaveProperty('Petpooja_Ultimate_Plan_status')
    })
    
    // Verify KAMs have all required fields
    expect(kams.length).toBeGreaterThan(0)
    kams.forEach(kam => {
      expect(kam).toHaveProperty('brand_uid')
      expect(kam).toHaveProperty('brand_name')
      expect(kam).toHaveProperty('email')
      expect(kam).toHaveProperty('assign_date_1')
      expect(kam).toHaveProperty('kam_name_1')
    })
    
    // Verify prices have all required fields
    expect(prices.length).toBeGreaterThan(0)
    prices.forEach(price => {
      expect(price).toHaveProperty('service_product_name')
      expect(price).toHaveProperty('price')
      expect(typeof price.price).toBe('number')
    })
  })

  test('Property 1: CSV parsing preserves data without loss', async () => {
    const parser = new CSVParser()
    
    const brands = await parser.parseBrandData()
    const kams = await parser.parseKAMData()
    const prices = await parser.parsePriceData()
    
    // Verify no empty records (data loss)
    brands.forEach(brand => {
      expect(brand.restaurant_id).toBeTruthy()
      expect(brand.email).toBeTruthy()
    })
    
    kams.forEach(kam => {
      expect(kam.brand_uid || kam.email).toBeTruthy()
    })
    
    prices.forEach(price => {
      expect(price.service_product_name).toBeTruthy()
      expect(price.price).toBeGreaterThanOrEqual(0)
    })
  })

  test('Property 1: Date fields are properly parsed or null', async () => {
    const parser = new CSVParser()
    
    const brands = await parser.parseBrandData()
    
    brands.forEach(brand => {
      // Date fields should be either Date objects or null
      if (brand.POS_Subscription_creation !== null) {
        expect(brand.POS_Subscription_creation).toBeInstanceOf(Date)
      }
      if (brand.POS_Subscription_expiry !== null) {
        expect(brand.POS_Subscription_expiry).toBeInstanceOf(Date)
      }
      if (brand.Petpooja_Tasks_creation !== null) {
        expect(brand.Petpooja_Tasks_creation).toBeInstanceOf(Date)
      }
    })
  })
})


// Feature: brand-journey-dashboard, Property 2: CSV error handling
describe('CSV Parser - Error Handling Property Tests', () => {
  test('Property 2: File not found errors include specific file name', async () => {
    const parser = new CSVParser('NonExistentFolder')
    
    await expect(parser.parseBrandData()).rejects.toThrow('Brand DATA CSV.csv')
    await expect(parser.parseKAMData()).rejects.toThrow('KAM Data CSV.csv')
    await expect(parser.parsePriceData()).rejects.toThrow('Price Data CSV.csv')
  })

  test('Property 2: Error messages are descriptive with file names', async () => {
    const parser = new CSVParser('NonExistentFolder')
    
    try {
      await parser.parseBrandData()
      expect.fail('Should have thrown an error')
    } catch (error: any) {
      expect(error.message).toContain('Brand DATA CSV.csv')
      expect(error.message).toContain('File not found')
      expect(error.fileName).toBe('Brand DATA CSV.csv')
    }
  })

  test('Property 2: Empty CSV files throw descriptive errors', async () => {
    // Create a temporary empty CSV file for testing
    const fs = require('fs')
    const path = require('path')
    const testDir = 'TestData'
    
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir)
    }
    
    // Create empty CSV with just headers
    fs.writeFileSync(
      path.join(testDir, 'Brand DATA CSV.csv'),
      'restaurant_id,email\n'
    )
    
    const parser = new CSVParser(testDir)
    
    try {
      await parser.parseBrandData()
      expect.fail('Should have thrown an error')
    } catch (error: any) {
      expect(error.message).toContain('empty or malformed')
      expect(error.fileName).toBe('Brand DATA CSV.csv')
    } finally {
      // Cleanup
      fs.unlinkSync(path.join(testDir, 'Brand DATA CSV.csv'))
      fs.rmdirSync(testDir)
    }
  })
})


// Unit tests for CSV parsing edge cases
describe('CSV Parser - Unit Tests for Edge Cases', () => {
  test('Empty CSV files are handled gracefully', async () => {
    const fs = require('fs')
    const path = require('path')
    const testDir = 'TestDataEmpty'
    
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir)
    }
    
    fs.writeFileSync(
      path.join(testDir, 'Brand DATA CSV.csv'),
      'restaurant_id,email\n'
    )
    
    const parser = new CSVParser(testDir)
    
    await expect(parser.parseBrandData()).rejects.toThrow('empty or malformed')
    
    // Cleanup
    fs.unlinkSync(path.join(testDir, 'Brand DATA CSV.csv'))
    fs.rmdirSync(testDir)
  })

  test('CSV with missing optional fields parses successfully', async () => {
    const fs = require('fs')
    const path = require('path')
    const testDir = 'TestDataMissing'
    
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir)
    }
    
    // Create CSV with minimal required fields
    const csvContent = `restaurant_id,email,POS_Subscription_status,POS_Subscription_creation,POS_Subscription_expiry,Petpooja_Tasks_status,Petpooja_Tasks_creation,Petpooja_Tasks_expiry,Petpooja_Payroll_status,Petpooja_Payroll_creation,Petpooja_Payroll_expiry,Petpooja_Growth_Plan_status,Petpooja_Growth_Plan_creation,Petpooja_Growth_Plan_expiry,Petpooja_Scale_Plan_status,Petpooja_Scale_Plan_creation,Petpooja_Scale_Plan_expiry,Petpooja_Ultimate_Plan_status,Petpooja_Ultimate_Plan_creation,Petpooja_Ultimate_Plan_expiry,Petpooja_POS_Ultimate_Plan_status,Petpooja_POS_Ultimate_Plan_creation,Petpooja_POS_Ultimate_Plan_expiry,Petpooja_POS_Growth_Plan_status,Petpooja_POS_Growth_Plan_creation,Petpooja_POS_Growth_Plan_expiry,Petpooja_POS_Scale_Plan_status,Petpooja_POS_Scale_Plan_creation,Petpooja_POS_Scale_Plan_expiry,Captain_Application_status,Captain_Application_creation,Captain_Application_expiry,Petpooja_Pay_status,Petpooja_Pay_creation,Petpooja_Pay_expiry,Petpooja_Connect_status,Petpooja_Connect_creation,Petpooja_Connect_expiry,Intellisense_status,Intellisense_creation,Intellisense_expiry,QR_Feedback_status,QR_Feedback_creation,QR_Feedback_expiry,Self_Order_Kiosk_status,Self_Order_Kiosk_creation,Self_Order_Kiosk_expiry,Online_Order_Reconciliation_status,Online_Order_Reconciliation_creation,Online_Order_Reconciliation_expiry,Inventory_Application_status,Inventory_Application_creation,Inventory_Application_expiry,Petpooja_Loyalty_status,Petpooja_Loyalty_creation,Petpooja_Loyalty_expiry,Online_Ordering_Widget_status,Online_Ordering_Widget_creation,Online_Ordering_Widget_expiry,My_Website_status,My_Website_creation,My_Website_expiry,Dynamic_Reports_status,Dynamic_Reports_creation,Dynamic_Reports_expiry,Petpooja_Plus_status,Petpooja_Plus_creation,Petpooja_Plus_expiry,Power_Integration_status,Power_Integration_creation,Power_Integration_expiry,Reservation_Manager_App_status,Reservation_Manager_App_creation,Reservation_Manager_App_expiry,Petpooja_Scan_Order_status,Petpooja_Scan_Order_creation,Petpooja_Scan_Order_expiry,Gift_Card_status,Gift_Card_creation,Gift_Card_expiry,Feedback_Management_status,Feedback_Management_creation,Feedback_Management_expiry,Data_Lake_status,Data_Lake_creation,Data_Lake_expiry,SMS_Service_status,SMS_Service_creation,SMS_Service_expiry,Petpooja_Purchase_status,Petpooja_Purchase_creation,Petpooja_Purchase_expiry,Weigh_Scale_Service_status,Weigh_Scale_Service_creation,Weigh_Scale_Service_expiry,Whatsapp_CRM_status,Whatsapp_CRM_creation,Whatsapp_CRM_expiry,Petpooja_Go_Rental_status,Petpooja_Go_Rental_creation,Petpooja_Go_Rental_expiry,Queue_Management_status,Queue_Management_creation,Queue_Management_expiry,Petpooja_PRO_status,Petpooja_PRO_creation,Petpooja_PRO_expiry,Kitchen_Display_System_status,Kitchen_Display_System_creation,Kitchen_Display_System_expiry,Waiter_Calling_Device_status,Waiter_Calling_Device_creation,Waiter_Calling_Device_expiry,Virtual_Wallet_status,Virtual_Wallet_creation,Virtual_Wallet_expiry,Petpooja_Briefcase_status,Petpooja_Briefcase_creation,Petpooja_Briefcase_expiry,Token_Management_status,Token_Management_creation,Token_Management_expiry,Link_based_Feedback_Service_status,Link_based_Feedback_Service_creation,Link_based_Feedback_Service_expiry
123,test@example.com,active,2025-01-01,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,`
    
    fs.writeFileSync(path.join(testDir, 'Brand DATA CSV.csv'), csvContent)
    
    const parser = new CSVParser(testDir)
    const brands = await parser.parseBrandData()
    
    expect(brands).toHaveLength(1)
    expect(brands[0].restaurant_id).toBe('123')
    expect(brands[0].email).toBe('test@example.com')
    expect(brands[0].POS_Subscription_status).toBe('active')
    expect(brands[0].POS_Subscription_creation).toBeInstanceOf(Date)
    expect(brands[0].POS_Subscription_expiry).toBeNull()
    
    // Cleanup
    fs.unlinkSync(path.join(testDir, 'Brand DATA CSV.csv'))
    fs.rmdirSync(testDir)
  })

  test('Invalid date formats are handled as null', async () => {
    const fs = require('fs')
    const path = require('path')
    const testDir = 'TestDataInvalidDates'
    
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir)
    }
    
    const csvContent = `restaurant_id,email,POS_Subscription_status,POS_Subscription_creation,POS_Subscription_expiry,Petpooja_Tasks_status,Petpooja_Tasks_creation,Petpooja_Tasks_expiry,Petpooja_Payroll_status,Petpooja_Payroll_creation,Petpooja_Payroll_expiry,Petpooja_Growth_Plan_status,Petpooja_Growth_Plan_creation,Petpooja_Growth_Plan_expiry,Petpooja_Scale_Plan_status,Petpooja_Scale_Plan_creation,Petpooja_Scale_Plan_expiry,Petpooja_Ultimate_Plan_status,Petpooja_Ultimate_Plan_creation,Petpooja_Ultimate_Plan_expiry,Petpooja_POS_Ultimate_Plan_status,Petpooja_POS_Ultimate_Plan_creation,Petpooja_POS_Ultimate_Plan_expiry,Petpooja_POS_Growth_Plan_status,Petpooja_POS_Growth_Plan_creation,Petpooja_POS_Growth_Plan_expiry,Petpooja_POS_Scale_Plan_status,Petpooja_POS_Scale_Plan_creation,Petpooja_POS_Scale_Plan_expiry,Captain_Application_status,Captain_Application_creation,Captain_Application_expiry,Petpooja_Pay_status,Petpooja_Pay_creation,Petpooja_Pay_expiry,Petpooja_Connect_status,Petpooja_Connect_creation,Petpooja_Connect_expiry,Intellisense_status,Intellisense_creation,Intellisense_expiry,QR_Feedback_status,QR_Feedback_creation,QR_Feedback_expiry,Self_Order_Kiosk_status,Self_Order_Kiosk_creation,Self_Order_Kiosk_expiry,Online_Order_Reconciliation_status,Online_Order_Reconciliation_creation,Online_Order_Reconciliation_expiry,Inventory_Application_status,Inventory_Application_creation,Inventory_Application_expiry,Petpooja_Loyalty_status,Petpooja_Loyalty_creation,Petpooja_Loyalty_expiry,Online_Ordering_Widget_status,Online_Ordering_Widget_creation,Online_Ordering_Widget_expiry,My_Website_status,My_Website_creation,My_Website_expiry,Dynamic_Reports_status,Dynamic_Reports_creation,Dynamic_Reports_expiry,Petpooja_Plus_status,Petpooja_Plus_creation,Petpooja_Plus_expiry,Power_Integration_status,Power_Integration_creation,Power_Integration_expiry,Reservation_Manager_App_status,Reservation_Manager_App_creation,Reservation_Manager_App_expiry,Petpooja_Scan_Order_status,Petpooja_Scan_Order_creation,Petpooja_Scan_Order_expiry,Gift_Card_status,Gift_Card_creation,Gift_Card_expiry,Feedback_Management_status,Feedback_Management_creation,Feedback_Management_expiry,Data_Lake_status,Data_Lake_creation,Data_Lake_expiry,SMS_Service_status,SMS_Service_creation,SMS_Service_expiry,Petpooja_Purchase_status,Petpooja_Purchase_creation,Petpooja_Purchase_expiry,Weigh_Scale_Service_status,Weigh_Scale_Service_creation,Weigh_Scale_Service_expiry,Whatsapp_CRM_status,Whatsapp_CRM_creation,Whatsapp_CRM_expiry,Petpooja_Go_Rental_status,Petpooja_Go_Rental_creation,Petpooja_Go_Rental_expiry,Queue_Management_status,Queue_Management_creation,Queue_Management_expiry,Petpooja_PRO_status,Petpooja_PRO_creation,Petpooja_PRO_expiry,Kitchen_Display_System_status,Kitchen_Display_System_creation,Kitchen_Display_System_expiry,Waiter_Calling_Device_status,Waiter_Calling_Device_creation,Waiter_Calling_Device_expiry,Virtual_Wallet_status,Virtual_Wallet_creation,Virtual_Wallet_expiry,Petpooja_Briefcase_status,Petpooja_Briefcase_creation,Petpooja_Briefcase_expiry,Token_Management_status,Token_Management_creation,Token_Management_expiry,Link_based_Feedback_Service_status,Link_based_Feedback_Service_creation,Link_based_Feedback_Service_expiry
456,invalid@example.com,active,INVALID_DATE,2025-12-31,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,`
    
    fs.writeFileSync(path.join(testDir, 'Brand DATA CSV.csv'), csvContent)
    
    const parser = new CSVParser(testDir)
    const brands = await parser.parseBrandData()
    
    expect(brands).toHaveLength(1)
    expect(brands[0].restaurant_id).toBe('456')
    expect(brands[0].POS_Subscription_creation).toBeNull() // Invalid date becomes null
    expect(brands[0].POS_Subscription_expiry).toBeInstanceOf(Date) // Valid date is parsed
    
    // Cleanup
    fs.unlinkSync(path.join(testDir, 'Brand DATA CSV.csv'))
    fs.rmdirSync(testDir)
  })
})


// Feature: brand-journey-dashboard, Property 3: Cross-reference consistency
describe('CSV Parser - Cross-Reference Property Tests', () => {
  test('Property 3: Cross-reference links all matching records without duplicates', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            restaurant_id: fc.string({ minLength: 1, maxLength: 20 }),
            email: fc.emailAddress(),
            POS_Subscription_status: fc.constantFrom('Active', 'Inactive', ''),
            POS_Subscription_creation: fc.option(fc.date()),
            POS_Subscription_expiry: fc.option(fc.date()),
            Petpooja_Tasks_status: fc.constant(''),
            Petpooja_Tasks_creation: fc.constant(null),
            Petpooja_Tasks_expiry: fc.constant(null),
            Petpooja_Payroll_status: fc.constant(''),
            Petpooja_Payroll_creation: fc.constant(null),
            Petpooja_Payroll_expiry: fc.constant(null),
            Petpooja_Growth_Plan_status: fc.constant(''),
            Petpooja_Growth_Plan_creation: fc.constant(null),
            Petpooja_Growth_Plan_expiry: fc.constant(null),
            Petpooja_Scale_Plan_status: fc.constant(''),
            Petpooja_Scale_Plan_creation: fc.constant(null),
            Petpooja_Scale_Plan_expiry: fc.constant(null),
            Petpooja_Ultimate_Plan_status: fc.constant(''),
            Petpooja_Ultimate_Plan_creation: fc.constant(null),
            Petpooja_Ultimate_Plan_expiry: fc.constant(null),
            Petpooja_POS_Ultimate_Plan_status: fc.constant(''),
            Petpooja_POS_Ultimate_Plan_creation: fc.constant(null),
            Petpooja_POS_Ultimate_Plan_expiry: fc.constant(null),
            Petpooja_POS_Growth_Plan_status: fc.constant(''),
            Petpooja_POS_Growth_Plan_creation: fc.constant(null),
            Petpooja_POS_Growth_Plan_expiry: fc.constant(null),
            Petpooja_POS_Scale_Plan_status: fc.constant(''),
            Petpooja_POS_Scale_Plan_creation: fc.constant(null),
            Petpooja_POS_Scale_Plan_expiry: fc.constant(null),
            Captain_Application_status: fc.constant(''),
            Captain_Application_creation: fc.constant(null),
            Captain_Application_expiry: fc.constant(null),
            Petpooja_Pay_status: fc.constant(''),
            Petpooja_Pay_creation: fc.constant(null),
            Petpooja_Pay_expiry: fc.constant(null),
            Petpooja_Connect_status: fc.constant(''),
            Petpooja_Connect_creation: fc.constant(null),
            Petpooja_Connect_expiry: fc.constant(null),
            Intellisense_status: fc.constant(''),
            Intellisense_creation: fc.constant(null),
            Intellisense_expiry: fc.constant(null),
            QR_Feedback_status: fc.constant(''),
            QR_Feedback_creation: fc.constant(null),
            QR_Feedback_expiry: fc.constant(null),
            Self_Order_Kiosk_status: fc.constant(''),
            Self_Order_Kiosk_creation: fc.constant(null),
            Self_Order_Kiosk_expiry: fc.constant(null),
            Online_Order_Reconciliation_status: fc.constant(''),
            Online_Order_Reconciliation_creation: fc.constant(null),
            Online_Order_Reconciliation_expiry: fc.constant(null),
            Inventory_Application_status: fc.constant(''),
            Inventory_Application_creation: fc.constant(null),
            Inventory_Application_expiry: fc.constant(null),
            Petpooja_Loyalty_status: fc.constant(''),
            Petpooja_Loyalty_creation: fc.constant(null),
            Petpooja_Loyalty_expiry: fc.constant(null),
            Online_Ordering_Widget_status: fc.constant(''),
            Online_Ordering_Widget_creation: fc.constant(null),
            Online_Ordering_Widget_expiry: fc.constant(null),
            My_Website_status: fc.constant(''),
            My_Website_creation: fc.constant(null),
            My_Website_expiry: fc.constant(null),
            Dynamic_Reports_status: fc.constant(''),
            Dynamic_Reports_creation: fc.constant(null),
            Dynamic_Reports_expiry: fc.constant(null),
            Petpooja_Plus_status: fc.constant(''),
            Petpooja_Plus_creation: fc.constant(null),
            Petpooja_Plus_expiry: fc.constant(null),
            Power_Integration_status: fc.constant(''),
            Power_Integration_creation: fc.constant(null),
            Power_Integration_expiry: fc.constant(null),
            Reservation_Manager_App_status: fc.constant(''),
            Reservation_Manager_App_creation: fc.constant(null),
            Reservation_Manager_App_expiry: fc.constant(null),
            Petpooja_Scan_Order_status: fc.constant(''),
            Petpooja_Scan_Order_creation: fc.constant(null),
            Petpooja_Scan_Order_expiry: fc.constant(null),
            Gift_Card_status: fc.constant(''),
            Gift_Card_creation: fc.constant(null),
            Gift_Card_expiry: fc.constant(null),
            Feedback_Management_status: fc.constant(''),
            Feedback_Management_creation: fc.constant(null),
            Feedback_Management_expiry: fc.constant(null),
            Data_Lake_status: fc.constant(''),
            Data_Lake_creation: fc.constant(null),
            Data_Lake_expiry: fc.constant(null),
            SMS_Service_status: fc.constant(''),
            SMS_Service_creation: fc.constant(null),
            SMS_Service_expiry: fc.constant(null),
            Petpooja_Purchase_status: fc.constant(''),
            Petpooja_Purchase_creation: fc.constant(null),
            Petpooja_Purchase_expiry: fc.constant(null),
            Weigh_Scale_Service_status: fc.constant(''),
            Weigh_Scale_Service_creation: fc.constant(null),
            Weigh_Scale_Service_expiry: fc.constant(null),
            Whatsapp_CRM_status: fc.constant(''),
            Whatsapp_CRM_creation: fc.constant(null),
            Whatsapp_CRM_expiry: fc.constant(null),
            Petpooja_Go_Rental_status: fc.constant(''),
            Petpooja_Go_Rental_creation: fc.constant(null),
            Petpooja_Go_Rental_expiry: fc.constant(null),
            Queue_Management_status: fc.constant(''),
            Queue_Management_creation: fc.constant(null),
            Queue_Management_expiry: fc.constant(null),
            Petpooja_PRO_status: fc.constant(''),
            Petpooja_PRO_creation: fc.constant(null),
            Petpooja_PRO_expiry: fc.constant(null),
            Kitchen_Display_System_status: fc.constant(''),
            Kitchen_Display_System_creation: fc.constant(null),
            Kitchen_Display_System_expiry: fc.constant(null),
            Waiter_Calling_Device_status: fc.constant(''),
            Waiter_Calling_Device_creation: fc.constant(null),
            Waiter_Calling_Device_expiry: fc.constant(null),
            Virtual_Wallet_status: fc.constant(''),
            Virtual_Wallet_creation: fc.constant(null),
            Virtual_Wallet_expiry: fc.constant(null),
            Petpooja_Briefcase_status: fc.constant(''),
            Petpooja_Briefcase_creation: fc.constant(null),
            Petpooja_Briefcase_expiry: fc.constant(null),
            Token_Management_status: fc.constant(''),
            Token_Management_creation: fc.constant(null),
            Token_Management_expiry: fc.constant(null),
            Link_based_Feedback_Service_status: fc.constant(''),
            Link_based_Feedback_Service_creation: fc.constant(null),
            Link_based_Feedback_Service_expiry: fc.constant(null),
          }),
          { minLength: 0, maxLength: 50 }
        ),
        fc.array(
          fc.record({
            brand_uid: fc.string({ minLength: 1, maxLength: 20 }),
            brand_name: fc.string({ minLength: 1, maxLength: 50 }),
            email: fc.emailAddress(),
            assign_date_1: fc.option(fc.date()),
            kam_name_1: fc.string({ minLength: 1, maxLength: 30 }),
            assign_date_2: fc.option(fc.date()),
            kam_name_2: fc.string({ minLength: 0, maxLength: 30 }),
          }),
          { minLength: 0, maxLength: 50 }
        ),
        (brands: BrandRecord[], kams: KAMRecord[]) => {
          const parser = new CSVParser()
          const result = parser.crossReference(brands, kams)
          
          // Property 1: Result should include all unique emails from both brands and KAMs
          const uniqueBrandEmails = new Set(brands.map(b => b.email.toLowerCase()))
          const uniqueKAMEmails = new Set(kams.map(k => k.email.toLowerCase()))
          const allUniqueEmails = new Set([...uniqueBrandEmails, ...uniqueKAMEmails])
          expect(result.length).toBe(allUniqueEmails.size)
          
          // Property 2: All brand emails should appear in result
          const resultEmails = new Set(result.map(b => b.email.toLowerCase()))
          brands.forEach(brand => {
            expect(resultEmails.has(brand.email.toLowerCase())).toBe(true)
          })
          
          // Property 3: All KAM emails should appear in result
          kams.forEach(kam => {
            expect(resultEmails.has(kam.email.toLowerCase())).toBe(true)
          })
          
          // Property 4: Matching by email should be case-insensitive
          result.forEach((brandWithKAM) => {
            const matchingKAM = kams.find(
              k => k.email.toLowerCase() === brandWithKAM.email.toLowerCase()
            )
            
            if (matchingKAM) {
              expect(brandWithKAM.kam_assignment).not.toBeNull()
              expect(brandWithKAM.kam_assignment?.email.toLowerCase()).toBe(
                matchingKAM.email.toLowerCase()
              )
            }
          })
          
          // Property 5: No match found should result in null kam_assignment (for brands only)
          brands.forEach((originalBrand) => {
            const resultBrand = result.find(r => r.email.toLowerCase() === originalBrand.email.toLowerCase())
            if (!resultBrand) return // Brand might not be in result if it has no outlets
            
            const emailMatch = kams.find(
              k => k.email.toLowerCase() === originalBrand.email.toLowerCase()
            )
            
            if (!emailMatch) {
              expect(resultBrand.kam_assignment).toBeNull()
            }
          })
          
          // Property 6: Outlets array should be populated with POS data for brands from brand data
          brands.forEach((originalBrand) => {
            const resultBrand = result.find(r => r.email.toLowerCase() === originalBrand.email.toLowerCase())
            if (!resultBrand) return
            
            // Should have at least one outlet from the original brand
            expect(resultBrand.outlets.length).toBeGreaterThanOrEqual(1)
            // Check if the original brand's outlet is in the result
            const hasOriginalOutlet = resultBrand.outlets.some(
              o => o.restaurant_id === originalBrand.restaurant_id
            )
            expect(hasOriginalOutlet).toBe(true)
          })
        }
      ),
      { numRuns: 100 }
    )
  })

  test('Property 3: Cross-reference with actual CSV data maintains consistency', async () => {
    const parser = new CSVParser()
    
    const brands = await parser.parseBrandData()
    const kams = await parser.parseKAMData()
    const result = parser.crossReference(brands, kams)
    
    // Verify cross-reference includes all unique brand emails PLUS KAM-only brands
    const uniqueBrandEmails = new Set(brands.map(b => b.email.toLowerCase()))
    const uniqueKAMEmails = new Set(kams.map(k => k.email.toLowerCase()))
    
    // Result should include all unique emails from both brand and KAM data
    const allUniqueEmails = new Set([...uniqueBrandEmails, ...uniqueKAMEmails])
    expect(result.length).toBe(allUniqueEmails.size)
    
    // Verify all brands are present
    const resultEmails = new Set(result.map(b => b.email.toLowerCase()))
    brands.forEach(brand => {
      expect(resultEmails.has(brand.email.toLowerCase())).toBe(true)
    })
    
    // Verify all KAM-assigned brands are present (even if not in brand data)
    kams.forEach(kam => {
      expect(resultEmails.has(kam.email.toLowerCase())).toBe(true)
    })
    
    // Verify KAM assignments are consistent
    result.forEach(brandWithKAM => {
      if (brandWithKAM.kam_assignment) {
        const kamExists = kams.some(
          k => k.email.toLowerCase() === brandWithKAM.email.toLowerCase() ||
               k.brand_uid === brandWithKAM.restaurant_id
        )
        expect(kamExists).toBe(true)
      }
    })
    
    // Verify outlets are populated for brands that exist in brand data
    // KAM-only brands (not in brand data) will have empty outlets array
    result.forEach(brandWithKAM => {
      // If brand has KAM but no outlets, it's a KAM-only brand
      if (brandWithKAM.outlets.length > 0) {
        // Verify all outlets have valid restaurant_id
        brandWithKAM.outlets.forEach(outlet => {
          expect(outlet.restaurant_id).toBeTruthy()
        })
      }
    })
    
    // Verify total outlets match original brand count
    const totalOutlets = result.reduce((sum, b) => sum + b.outlets.length, 0)
    expect(totalOutlets).toBe(brands.length)
  })

  test('Property 3: Email matching is case-insensitive', () => {
    const parser = new CSVParser()
    
    const brands: BrandRecord[] = [
      {
        restaurant_id: '123',
        email: 'TEST@EXAMPLE.COM',
        POS_Subscription_status: 'Active',
        POS_Subscription_creation: new Date('2025-01-01'),
        POS_Subscription_expiry: null,
      } as BrandRecord,
    ]
    
    const kams: KAMRecord[] = [
      {
        brand_uid: '456',
        brand_name: 'Test Brand',
        email: 'test@example.com',
        assign_date_1: new Date('2025-01-01'),
        kam_name_1: 'John Doe',
        assign_date_2: null,
        kam_name_2: '',
      },
    ]
    
    const result = parser.crossReference(brands, kams)
    
    expect(result[0].kam_assignment).not.toBeNull()
    expect(result[0].kam_assignment?.email).toBe('test@example.com')
  })

  test('Property 3: Brand UID fallback does NOT work when email does not match (by design)', () => {
    const parser = new CSVParser()
    
    const brands: BrandRecord[] = [
      {
        restaurant_id: '123',
        email: 'brand@example.com',
        POS_Subscription_status: 'Active',
        POS_Subscription_creation: new Date('2025-01-01'),
        POS_Subscription_expiry: null,
      } as BrandRecord,
    ]
    
    const kams: KAMRecord[] = [
      {
        brand_uid: '123',
        brand_name: 'Test Brand',
        email: 'different@example.com',
        assign_date_1: new Date('2025-01-01'),
        kam_name_1: 'Jane Smith',
        assign_date_2: null,
        kam_name_2: '',
      },
    ]
    
    const result = parser.crossReference(brands, kams)
    
    // UID fallback is intentionally disabled to prevent incorrect matches
    // when the same UID is reused for different brands with different emails
    expect(result[0].kam_assignment).toBeNull()
    
    // The KAM record should appear as a separate entry (KAM-only brand)
    expect(result.length).toBe(2)
    const kamOnlyBrand = result.find(b => b.email.toLowerCase() === 'different@example.com')
    expect(kamOnlyBrand).not.toBeUndefined()
    expect(kamOnlyBrand?.kam_assignment).not.toBeNull()
  })

  test('Property 3: No match results in null kam_assignment', () => {
    const parser = new CSVParser()
    
    const brands: BrandRecord[] = [
      {
        restaurant_id: '999',
        email: 'nomatch@example.com',
        POS_Subscription_status: 'Active',
        POS_Subscription_creation: new Date('2025-01-01'),
        POS_Subscription_expiry: null,
      } as BrandRecord,
    ]
    
    const kams: KAMRecord[] = [
      {
        brand_uid: '123',
        brand_name: 'Test Brand',
        email: 'different@example.com',
        assign_date_1: new Date('2025-01-01'),
        kam_name_1: 'Jane Smith',
        assign_date_2: null,
        kam_name_2: '',
      },
    ]
    
    const result = parser.crossReference(brands, kams)
    
    expect(result[0].kam_assignment).toBeNull()
  })
})
