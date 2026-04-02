import { BrandWithKAM } from './types'

export class MetricsCalculator {
  /**
   * Calculate the total brand count for a given month
   * Counts unique email addresses where Assign Date 1 is on or before that month
   * Requirements: 3.1, 3.2, 3.3
   */
  calculateBrandCount(brands: BrandWithKAM[], targetMonth: Date): number {
    const uniqueEmails = new Set<string>()
    
    for (const brand of brands) {
      // Skip brands without valid Assign Date 1
      if (!brand.kam_assignment?.assign_date_1) {
        continue
      }
      
      // Convert to Date if it's a string (from JSON serialization)
      const assignDate = new Date(brand.kam_assignment.assign_date_1)
      
      // Check if Assign Date 1 is on or before target month
      if (assignDate <= targetMonth) {
        // Deduplicate by email (case-insensitive)
        uniqueEmails.add(brand.email.toLowerCase())
      }
    }
    
    return uniqueEmails.size
  }

  /**
   * Calculate the total outlet count for a given month
   * Counts outlets where POS creation date is on or before the target month
   * If outlet has no POS creation date but has a restaurant_id, count it (legacy data)
   * Only counts outlets from brands that have been assigned a KAM by the target month
   * For outlets with active POS subscriptions, applies expiry date logic
   * For projected months (after January 2026), assumes renewals
   * Requirements: 4.1, 4.2
   */
  calculateOutletCount(brands: BrandWithKAM[], targetMonth: Date, assumeRenewal: boolean = false): number {
    let outletCount = 0
    const realizedEndDate = new Date(2026, 0, 31) // January 2026
    const isProjected = targetMonth > realizedEndDate
    
    // For projected months, assume renewals
    if (isProjected) {
      assumeRenewal = true
    }
    
    // When assuming renewal, treat all expiries after the realized end date as renewed
    const renewalCutoffDate = assumeRenewal ? realizedEndDate : null
    
    for (const brand of brands) {
      // Skip brands without valid Assign Date 1
      if (!brand.kam_assignment?.assign_date_1) {
        continue
      }
      
      // Convert to Date if it's a string (from JSON serialization)
      const assignDate = new Date(brand.kam_assignment.assign_date_1)
      
      // Check if brand was assigned on or before target month
      if (assignDate > targetMonth) {
        continue
      }
      
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
    }
    
    return outletCount
  }
}
