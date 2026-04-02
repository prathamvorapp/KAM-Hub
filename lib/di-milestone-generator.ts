import { BrandWithKAM, PriceRecord, RevenueRecord, Milestone, DepartmentMetrics, BrandMetrics, TimelineData } from './di-types'
import { MetricsCalculator } from './di-metrics-calculator'
import { RevenueCalculator } from './di-revenue-calculator'

export class MilestoneGenerator {
  private metricsCalculator: MetricsCalculator
  private revenueCalculator: RevenueCalculator

  constructor(prices: PriceRecord[], revenueRecords: RevenueRecord[] = []) {
    this.metricsCalculator = new MetricsCalculator()
    this.revenueCalculator = new RevenueCalculator(prices, revenueRecords)
  }

  /**
   * Generate monthly milestones from April 2025 to March 2027 for department journey
   * Mark milestones after January 2026 as projected
   * Requirements: 2.2, 2.3
   */
  generateDepartmentTimeline(brands: BrandWithKAM[]): TimelineData {
    const startDate = new Date(2025, 3, 1) // April 2025
    const endDate = new Date(2027, 2, 31) // March 2027
    const realizedEndDate = new Date(2026, 0, 31) // January 2026
    
    const milestones: Milestone[] = []
    
    // Generate monthly milestones
    let currentDate = new Date(startDate)
    
    while (currentDate <= endDate) {
      const isProjected = currentDate > realizedEndDate
      
      // Use end of month for comparison to include all brands assigned during that month
      const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0, 23, 59, 59, 999)
      
      // Calculate metrics for this milestone
      const brandCount = this.metricsCalculator.calculateBrandCount(brands, endOfMonth)
      const outletCount = this.metricsCalculator.calculateOutletCount(brands, endOfMonth)
      
      // For projected months, assume renewals to show projected revenue
      const assumeRenewal = isProjected
      const revenue = this.revenueCalculator.calculateMonthlyRevenue(brands, endOfMonth, assumeRenewal)
      
      // Calculate RPU (Revenue Per Unit) for department
      const rpu = this.revenueCalculator.calculateDepartmentRPU(brands, endOfMonth, brandCount)
      
      const metrics: DepartmentMetrics = {
        brandCount,
        outletCount,
        revenue,
        rpu,
        isProjected,
      }
      
      const label = this.formatMonthLabel(currentDate)
      
      milestones.push({
        date: new Date(currentDate),
        label,
        metrics,
        isProjected,
      })
      
      // Move to next month
      currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1)
    }
    
    return {
      milestones,
      startDate,
      endDate,
      realizedEndDate,
    }
  }

  /**
   * Format date as month label (e.g., "April 2025")
   */
  private formatMonthLabel(date: Date): string {
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ]
    return `${monthNames[date.getMonth()]} ${date.getFullYear()}`
  }

  /**
   * Generate timeline for individual brand journey
   * First milestone: Earliest POS creation date (brand started with Petpooja)
   * Second milestone: KAM Assign Date 1 (Key Accounts Department started managing)
   * Then: Monthly milestones from April 2025 to March 2027
   * Requirements: 6.2, 6.3, 6.4, 6.5, 6.6
   */
  generateBrandTimeline(brand: BrandWithKAM): TimelineData {
    const milestones: Milestone[] = []
    const realizedEndDate = new Date(2026, 0, 31) // January 2026
    const endDate = new Date(2027, 2, 31) // March 2027
    
    // Find earliest POS creation date from all outlets
    let earliestPOSDate: Date | null = null
    if (brand.outlets && brand.outlets.length > 0) {
      for (const outlet of brand.outlets) {
        if (outlet.pos_creation) {
          const posDate = new Date(outlet.pos_creation)
          if (!earliestPOSDate || posDate < earliestPOSDate) {
            earliestPOSDate = posDate
          }
        }
      }
    }
    
    // Fallback to brand-level POS_Subscription_creation if no outlet dates
    if (!earliestPOSDate && brand.POS_Subscription_creation) {
      earliestPOSDate = new Date(brand.POS_Subscription_creation)
    }
    
    // Default to April 2025 if no POS dates found
    const startDate = earliestPOSDate || new Date(2025, 3, 1)
    
    // First milestone: Earliest POS creation (brand started with Petpooja)
    if (earliestPOSDate) {
      const isProjected = earliestPOSDate > realizedEndDate
      const metrics = this.calculateBrandMetrics(brand, earliestPOSDate, isProjected)
      
      milestones.push({
        date: new Date(earliestPOSDate),
        label: `Started with Petpooja - ${this.formatMonthLabel(earliestPOSDate)}`,
        metrics,
        isProjected,
      })
    }
    
    // Second milestone: KAM assignment (Key Accounts Department started managing)
    if (brand.kam_assignment?.assign_date_1) {
      const kamDate = new Date(brand.kam_assignment.assign_date_1)
      
      // Only add if different month from POS start date
      const shouldAddKAM = !earliestPOSDate || 
        kamDate.getFullYear() !== earliestPOSDate.getFullYear() ||
        kamDate.getMonth() !== earliestPOSDate.getMonth()
      
      if (shouldAddKAM) {
        const isProjected = kamDate > realizedEndDate
        const metrics = this.calculateBrandMetrics(brand, kamDate, isProjected)
        
        milestones.push({
          date: new Date(kamDate),
          label: `KAM Assigned - ${this.formatMonthLabel(kamDate)}`,
          metrics,
          isProjected,
        })
      }
    }
    
    // Generate monthly milestones from April 2025 to March 2027
    const april2025 = new Date(2025, 3, 1)
    let currentDate = new Date(april2025)
    
    while (currentDate <= endDate) {
      // Skip if this month already has a milestone (POS start or KAM assignment)
      const hasExistingMilestone = milestones.some(m => {
        const mYear = m.date.getFullYear()
        const mMonth = m.date.getMonth()
        const cYear = currentDate.getFullYear()
        const cMonth = currentDate.getMonth()
        return mYear === cYear && mMonth === cMonth
      })
      
      if (!hasExistingMilestone) {
        const isProjected = currentDate > realizedEndDate
        const metrics = this.calculateBrandMetrics(brand, currentDate, isProjected)
        
        milestones.push({
          date: new Date(currentDate),
          label: this.formatMonthLabel(currentDate),
          metrics,
          isProjected,
        })
      } else {
        // month already has a milestone, skip
      }
      
      // Move to next month
      currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1)
    }
    
    // Sort milestones by date
    milestones.sort((a, b) => a.date.getTime() - b.date.getTime())
    
    // Debug: Log milestone dates
    return {
      milestones,
      startDate,
      endDate,
      realizedEndDate,
    }
  }

  /**
   * Calculate metrics for a specific brand at a given date
   * For brand journey, don't filter by KAM assignment date
   * Requirements: 6.7
   */
  private calculateBrandMetrics(
    brand: BrandWithKAM,
    targetMonth: Date,
    isProjected: boolean
  ): BrandMetrics {
    // Calculate outlet count for this brand only (without KAM date filtering)
    const outletCount = this.calculateBrandOutletCount(brand, targetMonth, isProjected)
    
    // Calculate revenue for this brand only
    // For projected months, assume renewals to show projected revenue
    const revenue = this.revenueCalculator.calculateBrandRevenue(brand, targetMonth, isProjected)
    
    // Calculate RPU (Revenue Per Unit) for brand
    const rpu = this.revenueCalculator.calculateBrandRPU(brand, targetMonth, outletCount, isProjected)
    
    return {
      outletCount,
      revenue,
      rpu,
      isProjected,
    }
  }

  /**
   * Calculate outlet count for a specific brand without KAM assignment filtering
   * Used for brand journey to show historical outlet counts
   */
  private calculateBrandOutletCount(
    brand: BrandWithKAM,
    targetMonth: Date,
    assumeRenewal: boolean
  ): number {
    let outletCount = 0
    const realizedEndDate = new Date(2026, 0, 31) // January 2026
    
    // For projected months, assume renewals
    if (assumeRenewal) {
      assumeRenewal = true
    }
    
    // When assuming renewal, treat all expiries after the realized end date as renewed
    const renewalCutoffDate = assumeRenewal ? realizedEndDate : null
    
    for (const outlet of brand.outlets) {
      // Count outlet if it has a restaurant_id (exists as a location)
      if (!outlet.restaurant_id) {
        continue
      }
      
      // Check if outlet POS was created on or before target month
      // If no creation date, assume it's a legacy outlet and count it
      if (outlet.pos_creation) {
        const creationDate = new Date(outlet.pos_creation)
        const creationYear = creationDate.getFullYear()
        const creationMonth = creationDate.getMonth()
        const targetYear = targetMonth.getFullYear()
        const targetMonthNum = targetMonth.getMonth()
        
        // If creation is in a future month/year, outlet not active yet
        if (creationYear > targetYear || (creationYear === targetYear && creationMonth > targetMonthNum)) {
          continue
        }
      }
      
      // If outlet has active POS subscription, check expiry logic
      if (outlet.pos_status && outlet.pos_status.toLowerCase() === 'active') {
        // Check expiry date
        if (outlet.pos_expiry) {
          const expiryDate = new Date(outlet.pos_expiry)
          const expiryYear = expiryDate.getFullYear()
          const expiryMonth = expiryDate.getMonth()
          const targetYear = targetMonth.getFullYear()
          const targetMonthNum = targetMonth.getMonth()
          
          // If assuming renewal, check if expiry is after the renewal cutoff date
          if (assumeRenewal && renewalCutoffDate) {
            // If outlet expires after the cutoff (in projected period), assume it renews
            if (expiryDate > renewalCutoffDate) {
              // Outlet will be renewed, count it as active
              outletCount++
              continue
            }
          }
          
          // Standard expiry logic (for realized months or expiries before cutoff)
          // If expiry is before target month, not active
          if (expiryYear < targetYear || (expiryYear === targetYear && expiryMonth < targetMonthNum)) {
            continue
          }
          
          // If expiry is in the target month
          if (expiryYear === targetYear && expiryMonth === targetMonthNum) {
            // If not assuming renewal, don't count (expires this month)
            if (!assumeRenewal) {
              continue
            }
            // If assumeRenewal is true, count it (will renew) - continue to outletCount++
          }
        }
        
        // Outlet has active POS subscription and passes all checks
        outletCount++
      } else {
        // Outlet exists but doesn't have active POS subscription
        // Count it as a legacy outlet (has restaurant_id but no active POS)
        outletCount++
      }
    }
    
    return outletCount
  }
}
