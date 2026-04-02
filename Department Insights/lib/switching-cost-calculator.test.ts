import { describe, it, expect } from 'vitest'
import { calculateSwitchingCostIndex } from './switching-cost-calculator'
import { BrandRecord, KAMRecord } from './types'

describe('Switching Cost Index Calculator', () => {
  it('should calculate SCI for a single brand with one outlet', () => {
    const brandRecords: BrandRecord[] = [
      {
        restaurant_id: '1',
        email: 'test@brand.com',
        POS_Subscription_status: 'active',
        Petpooja_Payroll_status: 'active',
        Captain_Application_status: 'active',
        Dynamic_Reports_status: 'inactive',
      } as BrandRecord
    ]

    const kamRecords: KAMRecord[] = [
      {
        brand_uid: '1',
        brand_name: 'Test Brand',
        email: 'test@brand.com',
        kam_name_1: 'John Doe',
      } as KAMRecord
    ]

    const results = calculateSwitchingCostIndex(brandRecords, kamRecords)

    expect(results).toHaveLength(1)
    expect(results[0].brandName).toBe('Test Brand')
    expect(results[0].kamName).toBe('John Doe')
    expect(results[0].totalOutlets).toBe(1)
    expect(results[0].density).toBe(2) // 2 active non-core products / 1 outlet
  })

  it('should calculate SCI for a brand with multiple outlets', () => {
    const brandRecords: BrandRecord[] = [
      {
        restaurant_id: '1',
        email: 'multi@brand.com',
        Petpooja_Payroll_status: 'active',
        Captain_Application_status: 'active',
        Dynamic_Reports_status: 'active',
      } as BrandRecord,
      {
        restaurant_id: '2',
        email: 'multi@brand.com',
        Petpooja_Payroll_status: 'active',
        Captain_Application_status: 'inactive',
        Dynamic_Reports_status: 'active',
      } as BrandRecord
    ]

    const kamRecords: KAMRecord[] = [
      {
        brand_name: 'Multi Brand',
        email: 'multi@brand.com',
        kam_name_1: 'Jane Smith',
      } as KAMRecord
    ]

    const results = calculateSwitchingCostIndex(brandRecords, kamRecords)

    expect(results).toHaveLength(1)
    expect(results[0].totalOutlets).toBe(2)
    expect(results[0].density).toBe(2.5) // (3 + 2) / 2 outlets
  })

  it('should apply correct weights to high-priority products', () => {
    const brandRecords: BrandRecord[] = [
      {
        restaurant_id: '1',
        email: 'weighted@brand.com',
        Petpooja_Payroll_status: 'active', // weight 2
        Petpooja_Tasks_status: 'active', // weight 1
      } as BrandRecord
    ]

    const kamRecords: KAMRecord[] = [
      {
        brand_name: 'Weighted Brand',
        email: 'weighted@brand.com',
        kam_name_1: 'Test KAM',
      } as KAMRecord
    ]

    const results = calculateSwitchingCostIndex(brandRecords, kamRecords)

    expect(results).toHaveLength(1)
    // SCI should be influenced by the weight of Petpooja_Payroll
    expect(results[0].sci).toBeGreaterThan(0)
  })

  it('should categorize switching cost correctly', () => {
    const highSCIBrand: BrandRecord[] = [
      {
        restaurant_id: '1',
        email: 'high@brand.com',
        Petpooja_Payroll_status: 'active',
        Captain_Application_status: 'active',
        Dynamic_Reports_status: 'active',
        Reservation_Manager_App_status: 'active',
        Petpooja_Scan_Order_status: 'active',
        Inventory_Application_status: 'active',
      } as BrandRecord
    ]

    const lowSCIBrand: BrandRecord[] = [
      {
        restaurant_id: '2',
        email: 'low@brand.com',
        Petpooja_Tasks_status: 'active',
      } as BrandRecord
    ]

    const kamRecords: KAMRecord[] = [
      {
        brand_name: 'High SCI Brand',
        email: 'high@brand.com',
        kam_name_1: 'KAM 1',
      } as KAMRecord,
      {
        brand_name: 'Low SCI Brand',
        email: 'low@brand.com',
        kam_name_1: 'KAM 2',
      } as KAMRecord
    ]

    const results = calculateSwitchingCostIndex(
      [...highSCIBrand, ...lowSCIBrand],
      kamRecords
    )

    expect(results).toHaveLength(2)
    // High SCI brand should have higher SCI than low SCI brand
    expect(results[0].sci).toBeGreaterThan(results[1].sci)
    // Verify the brands are correctly identified
    expect(results[0].brandName).toBe('High SCI Brand')
    expect(results[1].brandName).toBe('Low SCI Brand')
  })

  it('should sort results by SCI in descending order', () => {
    const brandRecords: BrandRecord[] = [
      {
        restaurant_id: '1',
        email: 'brand1@test.com',
        Petpooja_Payroll_status: 'active',
      } as BrandRecord,
      {
        restaurant_id: '2',
        email: 'brand2@test.com',
        Petpooja_Payroll_status: 'active',
        Captain_Application_status: 'active',
        Dynamic_Reports_status: 'active',
      } as BrandRecord
    ]

    const kamRecords: KAMRecord[] = [
      { brand_name: 'Brand 1', email: 'brand1@test.com', kam_name_1: 'KAM 1' } as KAMRecord,
      { brand_name: 'Brand 2', email: 'brand2@test.com', kam_name_1: 'KAM 2' } as KAMRecord
    ]

    const results = calculateSwitchingCostIndex(brandRecords, kamRecords)

    expect(results).toHaveLength(2)
    expect(results[0].sci).toBeGreaterThanOrEqual(results[1].sci)
  })

  it('should handle brands without KAM assignment', () => {
    const brandRecords: BrandRecord[] = [
      {
        restaurant_id: '1',
        email: 'nokam@brand.com',
        Petpooja_Payroll_status: 'active',
      } as BrandRecord
    ]

    const kamRecords: KAMRecord[] = []

    const results = calculateSwitchingCostIndex(brandRecords, kamRecords)

    expect(results).toHaveLength(1)
    expect(results[0].kamName).toBe('Unassigned')
    expect(results[0].brandName).toBe('nokam@brand.com')
  })

  it('should exclude POS_Subscription from non-core products', () => {
    const brandRecords: BrandRecord[] = [
      {
        restaurant_id: '1',
        email: 'pos@brand.com',
        POS_Subscription_status: 'active',
        Petpooja_Payroll_status: 'inactive',
      } as BrandRecord
    ]

    const kamRecords: KAMRecord[] = [
      {
        brand_name: 'POS Brand',
        email: 'pos@brand.com',
        kam_name_1: 'Test KAM',
      } as KAMRecord
    ]

    const results = calculateSwitchingCostIndex(brandRecords, kamRecords)

    expect(results).toHaveLength(1)
    expect(results[0].density).toBe(0) // POS_Subscription should not count
    expect(results[0].sci).toBe(0)
  })
})
