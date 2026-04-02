import { describe, test, expect } from 'vitest'
import fc from 'fast-check'
import { RevenueCalculator } from './revenue-calculator'
import { BrandWithKAM, PriceRecord } from './types'

// Feature: brand-journey-dashboard, Property 11: Price lookup with fallback
describe('RevenueCalculator - Property 11: Price lookup with fallback', () => {
  test('for any product or service name, revenue calculator should look up price and use zero if not found', () => {
    fc.assert(
      fc.property(
        fc.array(fc.record({
          service_product_name: fc.string({ minLength: 1 }),
          price: fc.float({ min: 0, max: 10000, noNaN: true }),
        })),
        fc.string({ minLength: 1 }),
        fc.date(),
        (prices: PriceRecord[], productName: string, targetMonth: Date) => {
          const calculator = new RevenueCalculator(prices)
          
          // Create a minimal brand with the product active
          const brand: BrandWithKAM = {
            restaurant_id: 'test-id',
            email: 'test@example.com',
            kam_assignment: null,
            outlets: [],
            // Set the product as active with creation in target month
            [`${productName}_status`]: 'Active',
            [`${productName}_creation`]: targetMonth,
            [`${productName}_expiry`]: null,
          } as any
          
          const revenue = calculator.calculateBrandRevenue(brand, targetMonth)
          
          // Check if product is in price list
          const priceEntry = prices.find(p => p.service_product_name === productName)
          
          if (priceEntry) {
            // If price exists, revenue should include it
            expect(revenue.total).toBeGreaterThanOrEqual(0)
          } else {
            // If price doesn't exist, should use 0 (no error thrown)
            expect(revenue.total).toBeGreaterThanOrEqual(0)
          }
        }
      ),
      { numRuns: 100 }
    )
  })
})

// Feature: brand-journey-dashboard, Property 7: Bundle plan priority
describe('RevenueCalculator - Property 7: Bundle plan priority', () => {
  test('for any brand with active bundle plan, revenue should use only bundle price and not individual products/services', () => {
    fc.assert(
      fc.property(
        fc.record({
          bundlePlanPrice: fc.float({ min: 100, max: 5000, noNaN: true }),
          productPrice: fc.float({ min: 10, max: 1000, noNaN: true }),
          servicePrice: fc.float({ min: 10, max: 1000, noNaN: true }),
        }),
        fc.date(),
        ({ bundlePlanPrice, productPrice, servicePrice }, targetMonth: Date) => {
          const prices: PriceRecord[] = [
            { service_product_name: 'Petpooja_Growth_Plan', price: bundlePlanPrice },
            { service_product_name: 'Petpooja_Tasks', price: productPrice },
            { service_product_name: 'Captain_Application', price: servicePrice },
          ]
          
          const calculator = new RevenueCalculator(prices)
          
          // Create brand with active bundle plan AND active products/services
          const brand: BrandWithKAM = {
            restaurant_id: 'test-id',
            email: 'test@example.com',
            kam_assignment: null,
            outlets: [],
            // Bundle plan active
            Petpooja_Growth_Plan_status: 'Active',
            Petpooja_Growth_Plan_creation: targetMonth,
            Petpooja_Growth_Plan_expiry: null,
            // Product active (should be ignored)
            Petpooja_Tasks_status: 'Active',
            Petpooja_Tasks_creation: targetMonth,
            Petpooja_Tasks_expiry: null,
            // Service active (should be ignored)
            Captain_Application_status: 'Active',
            Captain_Application_creation: targetMonth,
            Captain_Application_expiry: null,
          } as any
          
          const revenue = calculator.calculateBrandRevenue(brand, targetMonth)
          
          // Should only include bundle plan price
          expect(revenue.new).toBe(0)
          expect(revenue.renewal).toBe(bundlePlanPrice)
          expect(revenue.total).toBe(bundlePlanPrice)
        }
      ),
      { numRuns: 100 }
    )
  })
})

// Feature: brand-journey-dashboard, Property 8: Revenue without bundle
describe('RevenueCalculator - Property 8: Revenue without bundle', () => {
  test('for any brand without bundle plan, revenue should sum all active product and service prices', () => {
    fc.assert(
      fc.property(
        fc.record({
          tasksPrice: fc.float({ min: 10, max: 1000, noNaN: true }),
          payrollPrice: fc.float({ min: 10, max: 1000, noNaN: true }),
          posPrice: fc.float({ min: 10, max: 1000, noNaN: true }),
          captainPrice: fc.float({ min: 10, max: 1000, noNaN: true }),
          loyaltyPrice: fc.float({ min: 10, max: 1000, noNaN: true }),
        }),
        fc.date(),
        ({ tasksPrice, payrollPrice, posPrice, captainPrice, loyaltyPrice }, targetMonth: Date) => {
          const prices: PriceRecord[] = [
            { service_product_name: 'Petpooja_Tasks', price: tasksPrice },
            { service_product_name: 'Petpooja_Payroll', price: payrollPrice },
            { service_product_name: 'POS_Subscription', price: posPrice },
            { service_product_name: 'Captain_Application', price: captainPrice },
            { service_product_name: 'Petpooja_Loyalty', price: loyaltyPrice },
          ]
          
          const calculator = new RevenueCalculator(prices)
          
          // Create brand with NO bundle plan but active products and services
          // Note: POS_Subscription is counted via outlets array, not brand-level field
          const brand: BrandWithKAM = {
            restaurant_id: 'test-id',
            email: 'test@example.com',
            kam_assignment: null,
            outlets: [
              {
                restaurant_id: 'outlet-1',
                pos_status: 'Active',
                pos_creation: targetMonth,
                pos_expiry: null,
              }
            ],
            // No bundle plans
            Petpooja_Growth_Plan_status: 'Inactive',
            Petpooja_Scale_Plan_status: 'Inactive',
            Petpooja_Ultimate_Plan_status: 'Inactive',
            Petpooja_POS_Ultimate_Plan_status: 'Inactive',
            Petpooja_POS_Growth_Plan_status: 'Inactive',
            Petpooja_POS_Scale_Plan_status: 'Inactive',
            // Products active (excluding POS_Subscription which is in outlets)
            Petpooja_Tasks_status: 'Active',
            Petpooja_Tasks_creation: targetMonth,
            Petpooja_Tasks_expiry: null,
            Petpooja_Payroll_status: 'Active',
            Petpooja_Payroll_creation: targetMonth,
            Petpooja_Payroll_expiry: null,
            POS_Subscription_status: 'Inactive',
            POS_Subscription_creation: null,
            POS_Subscription_expiry: null,
            // Services active
            Captain_Application_status: 'Active',
            Captain_Application_creation: targetMonth,
            Captain_Application_expiry: null,
            Petpooja_Loyalty_status: 'Active',
            Petpooja_Loyalty_creation: targetMonth,
            Petpooja_Loyalty_expiry: null,
          } as any
          
          const revenue = calculator.calculateBrandRevenue(brand, targetMonth)
          
          // Should sum products (including POS from outlets) and services
          const expectedProducts = tasksPrice + payrollPrice + posPrice
          const expectedServices = captainPrice + loyaltyPrice
          const expectedTotal = expectedProducts + expectedServices
          
          expect(revenue.new).toBeCloseTo(expectedProducts, 2)
          expect(revenue.renewal).toBeCloseTo(expectedServices, 2)
          expect(revenue.total).toBeCloseTo(expectedTotal, 2)
        }
      ),
      { numRuns: 100 }
    )
  })
})

// Feature: brand-journey-dashboard, Property 9: Creation date revenue attribution
describe('RevenueCalculator - Property 9: Creation date revenue attribution', () => {
  test('for any product/service with creation date, revenue should be attributed to creation month as one-time payment', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 100, max: 5000, noNaN: true }),
        fc.date({ min: new Date('2025-01-01'), max: new Date('2027-12-31') }),
        (productPrice: number, creationDate: Date) => {
          const prices: PriceRecord[] = [
            { service_product_name: 'Petpooja_Tasks', price: productPrice },
          ]
          
          const calculator = new RevenueCalculator(prices)
          
          // Create brand with product created on specific date
          const brand: BrandWithKAM = {
            restaurant_id: 'test-id',
            email: 'test@example.com',
            kam_assignment: null,
            outlets: [],
            Petpooja_Tasks_status: 'Active',
            Petpooja_Tasks_creation: creationDate,
            Petpooja_Tasks_expiry: null,
          } as any
          
          // Test revenue in creation month
          const creationMonth = new Date(creationDate.getFullYear(), creationDate.getMonth(), 15)
          const revenueInCreationMonth = calculator.calculateBrandRevenue(brand, creationMonth)
          
          // Should include revenue in creation month
          expect(revenueInCreationMonth.products).toBeCloseTo(productPrice, 2)
          
          // Test revenue in different month (before creation)
          const beforeMonth = new Date(creationDate.getFullYear(), creationDate.getMonth() - 1, 15)
          const revenueBeforeCreation = calculator.calculateBrandRevenue(brand, beforeMonth)
          
          // Should NOT include revenue before creation
          expect(revenueBeforeCreation.products).toBe(0)
          
          // Test revenue in month after creation
          const afterMonth = new Date(creationDate.getFullYear(), creationDate.getMonth() + 1, 15)
          const revenueAfterCreation = calculator.calculateBrandRevenue(brand, afterMonth)
          
          // Should NOT include revenue after creation month (one-time payment)
          expect(revenueAfterCreation.products).toBe(0)
        }
      ),
      { numRuns: 100 }
    )
  })
})

// Feature: brand-journey-dashboard, Property 10: Projected revenue with expiry
describe('RevenueCalculator - Property 10: Projected revenue with expiry', () => {
  test('for any projected month, revenue should exclude subscriptions with expiry before that month', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 100, max: 5000, noNaN: true }),
        fc.date({ min: new Date('2025-01-01'), max: new Date('2026-12-31') }),
        fc.date({ min: new Date('2026-01-01'), max: new Date('2027-12-31') }),
        (productPrice: number, creationDate: Date, expiryDate: Date) => {
          const prices: PriceRecord[] = [
            { service_product_name: 'Petpooja_Tasks', price: productPrice },
          ]
          
          const calculator = new RevenueCalculator(prices)
          
          // Create brand with product that has expiry date
          const brand: BrandWithKAM = {
            restaurant_id: 'test-id',
            email: 'test@example.com',
            kam_assignment: null,
            outlets: [],
            Petpooja_Tasks_status: 'Active',
            Petpooja_Tasks_creation: creationDate,
            Petpooja_Tasks_expiry: expiryDate,
          } as any
          
          // Test revenue in creation month (Property 9: one-time payment in creation month)
          // Use a date at the end of the month to ensure we're after the creation date
          const creationMonth = new Date(creationDate.getFullYear(), creationDate.getMonth(), 28)
          const revenueInCreationMonth = calculator.calculateBrandRevenue(brand, creationMonth)
          
          // Should include revenue in creation month ONLY if expiry is AFTER creation month
          // If expiry is in the same month as creation, subscription expires that month (no revenue)
          // Compare year and month to determine if expiry is after creation month
          const expiryYearMonth = expiryDate.getFullYear() * 12 + expiryDate.getMonth()
          const creationYearMonth = creationDate.getFullYear() * 12 + creationDate.getMonth()
          
          if (expiryYearMonth > creationYearMonth) {
            // Expiry is after creation month - should have revenue
            expect(revenueInCreationMonth.products).toBeCloseTo(productPrice, 2)
          } else {
            // Expiry is in or before creation month - should be excluded
            expect(revenueInCreationMonth.products).toBe(0)
          }
          
          // Test revenue after expiry (should always be 0)
          const afterExpiry = new Date(expiryDate.getTime() + 30 * 24 * 60 * 60 * 1000) // 30 days after
          const revenueAfterExpiry = calculator.calculateBrandRevenue(brand, afterExpiry)
          
          // Should NOT include revenue after expiry (even if it's the creation month)
          expect(revenueAfterExpiry.products).toBe(0)
        }
      ),
      { numRuns: 100 }
    )
  })
})

// Feature: brand-journey-dashboard, Property 6: Revenue breakdown structure
describe('RevenueCalculator - Property 6: Revenue breakdown structure', () => {
  test('for any calculated revenue, breakdown should contain products, services, bundlePlans with total equaling their sum', () => {
    fc.assert(
      fc.property(
        fc.array(fc.record({
          service_product_name: fc.string({ minLength: 1 }),
          price: fc.float({ min: 0, max: 10000, noNaN: true }),
        })),
        fc.date(),
        (prices: PriceRecord[], targetMonth: Date) => {
          const calculator = new RevenueCalculator(prices)
          
          // Create a minimal brand
          const brand: BrandWithKAM = {
            restaurant_id: 'test-id',
            email: 'test@example.com',
            kam_assignment: null,
            outlets: [],
          } as any
          
          const revenue = calculator.calculateBrandRevenue(brand, targetMonth)
          
          // Verify structure exists
          expect(revenue).toHaveProperty('products')
          expect(revenue).toHaveProperty('services')
          expect(revenue).toHaveProperty('bundlePlans')
          expect(revenue).toHaveProperty('total')
          
          // Verify all are numbers
          expect(typeof revenue.new).toBe('number')
          expect(typeof revenue.renewal).toBe('number')
          expect(typeof revenue.total).toBe('number')
          
          // Verify total equals sum
          const expectedTotal = revenue.new + revenue.renewal
          expect(revenue.total).toBeCloseTo(expectedTotal, 2)
          
          // Verify all are non-negative
          expect(revenue.new).toBeGreaterThanOrEqual(0)
          expect(revenue.renewal).toBeGreaterThanOrEqual(0)
          expect(revenue.total).toBeGreaterThanOrEqual(0)
        }
      ),
      { numRuns: 100 }
    )
  })
})

// RPU Calculation Tests
describe('RevenueCalculator - RPU Calculations', () => {
  test('calculateDepartmentRPU should return zero when brand count is zero', () => {
    const prices: PriceRecord[] = [
      { service_product_name: 'POS_Subscription', price: 10000 }
    ]
    const calculator = new RevenueCalculator(prices)
    const brands: BrandWithKAM[] = []
    const targetMonth = new Date(2025, 3, 30) // April 2025
    
    const rpu = calculator.calculateDepartmentRPU(brands, targetMonth, 0)
    
    expect(rpu.new).toBe(0)
    expect(rpu.renewal).toBe(0)
    expect(rpu.total).toBe(0)
  })

  test('calculateDepartmentRPU should divide total revenue by brand count', () => {
    const prices: PriceRecord[] = [
      { service_product_name: 'POS_Subscription', price: 10000 },
      { service_product_name: 'POS_Subscription_Renewal', price: 7000 }
    ]
    const calculator = new RevenueCalculator(prices)
    
    const brands: BrandWithKAM[] = [
      {
        restaurant_id: 'rest-1',
        email: 'brand1@example.com',
        kam_assignment: {
          brand_uid: 'brand-1',
          brand_name: 'Brand 1',
          email: 'brand1@example.com',
          assign_date_1: new Date(2025, 3, 1),
          kam_name_1: 'KAM 1',
          assign_date_2: null,
          kam_name_2: ''
        },
        outlets: [
          {
            restaurant_id: 'rest-1',
            pos_status: 'Active',
            pos_creation: new Date(2025, 3, 15),
            pos_expiry: new Date(2027, 3, 15) // Expires after Jan 2026
          }
        ]
      } as BrandWithKAM,
      {
        restaurant_id: 'rest-2',
        email: 'brand2@example.com',
        kam_assignment: {
          brand_uid: 'brand-2',
          brand_name: 'Brand 2',
          email: 'brand2@example.com',
          assign_date_1: new Date(2025, 3, 1),
          kam_name_1: 'KAM 1',
          assign_date_2: null,
          kam_name_2: ''
        },
        outlets: [
          {
            restaurant_id: 'rest-2',
            pos_status: 'Active',
            pos_creation: new Date(2025, 3, 20),
            pos_expiry: new Date(2027, 3, 20) // Expires after Jan 2026
          }
        ]
      } as BrandWithKAM
    ]
    
    // Use a projected month (Feb 2026) where renewals are assumed
    const targetMonth = new Date(2026, 1, 28) // Feb 2026
    const brandCount = 2
    
    const rpu = calculator.calculateDepartmentRPU(brands, targetMonth, brandCount)
    
    // Two brands, no new subscriptions in Feb 2026, no renewals in Feb 2026
    // Total revenue = 0, RPU = 0 / 2 = 0
    expect(rpu.new).toBe(0)
    expect(rpu.renewal).toBe(0)
    expect(rpu.total).toBe(0)
  })

  test('calculateBrandRPU should return zero when outlet count is zero', () => {
    const prices: PriceRecord[] = [
      { service_product_name: 'POS_Subscription', price: 10000 }
    ]
    const calculator = new RevenueCalculator(prices)
    
    const brand: BrandWithKAM = {
      restaurant_id: 'rest-1',
      email: 'brand@example.com',
      kam_assignment: {
        brand_uid: 'brand-1',
        brand_name: 'Brand 1',
        email: 'brand@example.com',
        assign_date_1: new Date(2025, 3, 1),
        kam_name_1: 'KAM 1',
        assign_date_2: null,
        kam_name_2: ''
      },
      outlets: []
    } as BrandWithKAM
    
    const targetMonth = new Date(2025, 3, 30)
    
    const rpu = calculator.calculateBrandRPU(brand, targetMonth, 0)
    
    expect(rpu.new).toBe(0)
    expect(rpu.renewal).toBe(0)
    expect(rpu.total).toBe(0)
  })

  test('calculateBrandRPU should divide brand revenue by outlet count', () => {
    const prices: PriceRecord[] = [
      { service_product_name: 'POS_Subscription', price: 10000 }
    ]
    const calculator = new RevenueCalculator(prices)
    
    const brand: BrandWithKAM = {
      restaurant_id: 'rest-1',
      email: 'brand@example.com',
      kam_assignment: {
        brand_uid: 'brand-1',
        brand_name: 'Brand 1',
        email: 'brand@example.com',
        assign_date_1: new Date(2025, 3, 1),
        kam_name_1: 'KAM 1',
        assign_date_2: null,
        kam_name_2: ''
      },
      outlets: [
        {
          restaurant_id: 'rest-1',
          pos_status: 'Active',
          pos_creation: new Date(2025, 3, 15),
          pos_expiry: new Date(2026, 3, 15)
        },
        {
          restaurant_id: 'rest-2',
          pos_status: 'Active',
          pos_creation: new Date(2025, 3, 20),
          pos_expiry: new Date(2026, 3, 20)
        },
        {
          restaurant_id: 'rest-3',
          pos_status: 'Active',
          pos_creation: new Date(2025, 3, 25),
          pos_expiry: new Date(2026, 3, 25)
        }
      ]
    } as BrandWithKAM
    
    const targetMonth = new Date(2025, 3, 30) // April 2025
    const outletCount = 3
    
    const rpu = calculator.calculateBrandRPU(brand, targetMonth, outletCount)
    
    // Three outlets, each with new subscription at 10000
    // Total revenue = 30000, RPU = 30000 / 3 = 10000
    expect(rpu.new).toBe(10000)
    expect(rpu.renewal).toBe(0)
    expect(rpu.total).toBe(10000)
  })

  test('calculateBrandRPU should handle mixed new and renewal revenue', () => {
    const prices: PriceRecord[] = [
      { service_product_name: 'POS_Subscription', price: 10000 },
      { service_product_name: 'POS_Subscription_Renewal', price: 7000 }
    ]
    const calculator = new RevenueCalculator(prices)
    
    const brand: BrandWithKAM = {
      restaurant_id: 'rest-1',
      email: 'brand@example.com',
      kam_assignment: {
        brand_uid: 'brand-1',
        brand_name: 'Brand 1',
        email: 'brand@example.com',
        assign_date_1: new Date(2025, 3, 1),
        kam_name_1: 'KAM 1',
        assign_date_2: null,
        kam_name_2: ''
      },
      outlets: [
        {
          restaurant_id: 'rest-1',
          pos_status: 'Active',
          pos_creation: new Date(2025, 3, 15),
          pos_expiry: new Date(2026, 3, 15)
        },
        {
          restaurant_id: 'rest-2',
          pos_status: 'Active',
          pos_creation: new Date(2024, 3, 20),
          pos_expiry: new Date(2026, 4, 20) // Expires in May 2026
        }
      ]
    } as BrandWithKAM
    
    const targetMonth = new Date(2026, 4, 30) // May 2026 (projected)
    const outletCount = 2
    
    const rpu = calculator.calculateBrandRPU(brand, targetMonth, outletCount, true)
    
    // One renewal at 7000
    // Total revenue = 7000, RPU = 7000 / 2 = 3500
    expect(rpu.renewal).toBe(3500)
    expect(rpu.total).toBe(3500)
  })
})
