import { describe, test, expect } from 'vitest'
import { CSVParser } from '@/lib/csv-parser'
import { MilestoneGenerator } from '@/lib/milestone-generator'
import { MetricsCalculator } from '@/lib/metrics-calculator'
import { RevenueCalculator } from '@/lib/revenue-calculator'

/**
 * Integration tests for end-to-end data flow
 * Tests complete user flows: load app → view department → view brand
 * Requirements: 11.3, All
 */

describe('Integration Tests - End-to-End Data Flow', () => {
  test('end-to-end department journey generation', async () => {
    // Step 1: Parse CSV files
    const parser = new CSVParser('Data')
    const [brandRecords, kamRecords, priceRecords] = await Promise.all([
      parser.parseBrandData(),
      parser.parseKAMData(),
      parser.parsePriceData(),
    ])

    // Verify data was loaded
    expect(brandRecords.length).toBeGreaterThan(0)
    expect(kamRecords.length).toBeGreaterThan(0)
    expect(priceRecords.length).toBeGreaterThan(0)

    // Step 2: Cross-reference data
    const brandsWithKAM = parser.crossReference(brandRecords, kamRecords)
    expect(brandsWithKAM.length).toBeGreaterThan(0)

    // Step 3: Generate department timeline
    const milestoneGenerator = new MilestoneGenerator(priceRecords)
    const timelineData = milestoneGenerator.generateDepartmentTimeline(brandsWithKAM)

    // Verify timeline structure
    expect(timelineData.milestones.length).toBeGreaterThan(0)
    expect(timelineData.startDate).toEqual(new Date(2025, 3, 1)) // April 2025
    expect(timelineData.endDate).toEqual(new Date(2027, 2, 31)) // March 2027
    expect(timelineData.realizedEndDate).toEqual(new Date(2026, 0, 31)) // January 2026

    // Verify milestones have correct structure
    timelineData.milestones.forEach((milestone) => {
      expect(milestone.date).toBeInstanceOf(Date)
      expect(milestone.label).toBeTruthy()
      expect(milestone.metrics).toBeDefined()
      expect(milestone.metrics.outletCount).toBeGreaterThanOrEqual(0)
      expect(milestone.metrics.revenue).toBeDefined()
      expect(milestone.metrics.revenue.new).toBeGreaterThanOrEqual(0)
      expect(milestone.metrics.revenue.renewal).toBeGreaterThanOrEqual(0)
      expect(milestone.metrics.revenue.total).toBeGreaterThanOrEqual(0)

      // Verify department metrics have brandCount
      if ('brandCount' in milestone.metrics) {
        expect(milestone.metrics.brandCount).toBeGreaterThanOrEqual(0)
      }

      // Verify projected flag is set correctly
      const isAfterJan2026 = milestone.date > new Date(2026, 0, 31)
      expect(milestone.isProjected).toBe(isAfterJan2026)
    })

    // Verify milestones are in chronological order
    for (let i = 1; i < timelineData.milestones.length; i++) {
      expect(timelineData.milestones[i].date.getTime()).toBeGreaterThan(
        timelineData.milestones[i - 1].date.getTime()
      )
    }
  })

  test('end-to-end brand journey generation', async () => {
    // Step 1: Parse CSV files
    const parser = new CSVParser('Data')
    const [brandRecords, kamRecords, priceRecords] = await Promise.all([
      parser.parseBrandData(),
      parser.parseKAMData(),
      parser.parsePriceData(),
    ])

    // Step 2: Cross-reference data
    const brandsWithKAM = parser.crossReference(brandRecords, kamRecords)
    
    // Find a brand with POS_Subscription_creation date
    const brandWithPOS = brandsWithKAM.find(b => b.POS_Subscription_creation !== null)
    expect(brandWithPOS).toBeDefined()

    if (!brandWithPOS) return

    // Step 3: Generate brand timeline
    const milestoneGenerator = new MilestoneGenerator(priceRecords)
    const timelineData = milestoneGenerator.generateBrandTimeline(brandWithPOS)

    // Verify timeline structure
    expect(timelineData.milestones.length).toBeGreaterThan(0)
    expect(timelineData.endDate).toEqual(new Date(2027, 2, 31)) // March 2027
    expect(timelineData.realizedEndDate).toEqual(new Date(2026, 0, 31)) // January 2026

    // Verify start date is from POS_Subscription_creation
    if (brandWithPOS.POS_Subscription_creation) {
      expect(timelineData.startDate).toEqual(brandWithPOS.POS_Subscription_creation)
    }

    // Verify milestones have correct structure
    timelineData.milestones.forEach((milestone) => {
      expect(milestone.date).toBeInstanceOf(Date)
      expect(milestone.label).toBeTruthy()
      expect(milestone.metrics).toBeDefined()
      expect(milestone.metrics.outletCount).toBeGreaterThanOrEqual(0)
      expect(milestone.metrics.revenue).toBeDefined()
      expect(milestone.metrics.revenue.new).toBeGreaterThanOrEqual(0)
      expect(milestone.metrics.revenue.renewal).toBeGreaterThanOrEqual(0)
      expect(milestone.metrics.revenue.total).toBeGreaterThanOrEqual(0)

      // Verify brand metrics don't have brandCount
      expect('brandCount' in milestone.metrics).toBe(false)

      // Verify projected flag is set correctly
      const isAfterJan2026 = milestone.date > new Date(2026, 0, 31)
      expect(milestone.isProjected).toBe(isAfterJan2026)
    })

    // Verify milestones are in chronological order
    for (let i = 1; i < timelineData.milestones.length; i++) {
      expect(timelineData.milestones[i].date.getTime()).toBeGreaterThan(
        timelineData.milestones[i - 1].date.getTime()
      )
    }

    // Verify KAM assignment milestone if it exists
    if (brandWithPOS.kam_assignment?.assign_date_1) {
      const kamMilestone = timelineData.milestones.find(m => 
        m.label.includes('KAM Assigned')
      )
      if (kamMilestone) {
        expect(kamMilestone.date).toEqual(brandWithPOS.kam_assignment.assign_date_1)
      }
    }
  })

  test('navigation preserves state - data remains available across calculations', async () => {
    // Simulate loading data once
    const parser = new CSVParser('Data')
    const [brandRecords, kamRecords, priceRecords] = await Promise.all([
      parser.parseBrandData(),
      parser.parseKAMData(),
      parser.parsePriceData(),
    ])

    const brandsWithKAM = parser.crossReference(brandRecords, kamRecords)

    // Simulate navigating to department view
    const milestoneGenerator1 = new MilestoneGenerator(priceRecords)
    const departmentTimeline = milestoneGenerator1.generateDepartmentTimeline(brandsWithKAM)
    
    expect(departmentTimeline.milestones.length).toBeGreaterThan(0)

    // Simulate navigating to brand view (using same data, no re-parsing)
    const brandWithPOS = brandsWithKAM.find(b => b.POS_Subscription_creation !== null)
    expect(brandWithPOS).toBeDefined()

    if (!brandWithPOS) return

    const milestoneGenerator2 = new MilestoneGenerator(priceRecords)
    const brandTimeline = milestoneGenerator2.generateBrandTimeline(brandWithPOS)
    
    expect(brandTimeline.milestones.length).toBeGreaterThan(0)

    // Verify data consistency - same price records used
    expect(priceRecords.length).toBeGreaterThan(0)
    
    // Verify metrics calculator uses same data
    const metricsCalculator = new MetricsCalculator()
    const brandCount1 = metricsCalculator.calculateBrandCount(brandsWithKAM, new Date(2025, 4, 1))
    const brandCount2 = metricsCalculator.calculateBrandCount(brandsWithKAM, new Date(2025, 4, 1))
    
    // Same calculation should yield same result
    expect(brandCount1).toBe(brandCount2)

    // Verify revenue calculator uses same data
    const revenueCalculator = new RevenueCalculator(priceRecords)
    const revenue1 = revenueCalculator.calculateMonthlyRevenue(brandsWithKAM, new Date(2025, 4, 1))
    const revenue2 = revenueCalculator.calculateMonthlyRevenue(brandsWithKAM, new Date(2025, 4, 1))
    
    // Same calculation should yield same result
    expect(revenue1.total).toBe(revenue2.total)
    expect(revenue1.products).toBe(revenue2.products)
    expect(revenue1.services).toBe(revenue2.services)
    expect(revenue1.bundlePlans).toBe(revenue2.bundlePlans)
  })

  test('complete user flow: CSV → Parser → Calculator → Visualizer data structure', async () => {
    // Step 1: Load and parse CSV files
    const parser = new CSVParser('Data')
    const [brandRecords, kamRecords, priceRecords] = await Promise.all([
      parser.parseBrandData(),
      parser.parseKAMData(),
      parser.parsePriceData(),
    ])

    // Step 2: Cross-reference
    const brandsWithKAM = parser.crossReference(brandRecords, kamRecords)

    // Step 3: Calculate metrics for a specific month
    // Use end of month to match milestone generator logic
    const targetMonth = new Date(2025, 4, 1) // May 2025
    const endOfMonth = new Date(2025, 5, 0, 23, 59, 59, 999) // May 31, 2025
    const metricsCalculator = new MetricsCalculator()
    const revenueCalculator = new RevenueCalculator(priceRecords)

    const brandCount = metricsCalculator.calculateBrandCount(brandsWithKAM, endOfMonth)
    const outletCount = metricsCalculator.calculateOutletCount(brandsWithKAM, endOfMonth)
    const revenue = revenueCalculator.calculateMonthlyRevenue(brandsWithKAM, endOfMonth)

    // Verify calculated metrics
    expect(brandCount).toBeGreaterThanOrEqual(0)
    expect(outletCount).toBeGreaterThanOrEqual(0)
    expect(revenue.total).toBeGreaterThanOrEqual(0)
    expect(revenue.total).toBe(revenue.new + revenue.renewal)

    // Step 4: Generate timeline (visualizer data structure)
    const milestoneGenerator = new MilestoneGenerator(priceRecords)
    const timelineData = milestoneGenerator.generateDepartmentTimeline(brandsWithKAM)

    // Verify timeline contains the calculated month
    const mayMilestone = timelineData.milestones.find(m => 
      m.date.getFullYear() === 2025 && m.date.getMonth() === 4
    )
    
    expect(mayMilestone).toBeDefined()
    if (mayMilestone && 'brandCount' in mayMilestone.metrics) {
      expect(mayMilestone.metrics.brandCount).toBe(brandCount)
      expect(mayMilestone.metrics.outletCount).toBe(outletCount)
      expect(mayMilestone.metrics.revenue.total).toBe(revenue.total)
    }
  })
})
