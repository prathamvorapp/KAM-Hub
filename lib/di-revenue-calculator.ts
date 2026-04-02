import { BrandWithKAM, PriceRecord, RevenueBreakdown, RevenueRecord } from './di-types'

export class RevenueCalculator {
  private priceMap: Map<string, number>
  private revenueRecords: RevenueRecord[]

  constructor(prices: PriceRecord[], revenueRecords: RevenueRecord[] = []) {
    this.priceMap = new Map()
    prices.forEach(price => {
      this.priceMap.set(price.service_product_name, price.price)
    })
    this.revenueRecords = revenueRecords
  }

  /**
   * Check if a product/service name indicates a renewal
   */
  private isRenewalProduct(productName: string): boolean {
    return productName.toLowerCase().includes('renewal')
  }

  /**
   * Calculate actual revenue from Revenue.csv for a specific month
   * Segregates into New and Renewal revenue
   */
  calculateActualMonthlyRevenue(targetMonth: Date): RevenueBreakdown {
    const targetYear = targetMonth.getFullYear()
    const targetMonthNum = targetMonth.getMonth()
    
    let newRevenue = 0
    let renewalRevenue = 0
    
    for (const record of this.revenueRecords) {
      const recordDate = new Date(record.date)
      const recordYear = recordDate.getFullYear()
      const recordMonth = recordDate.getMonth()
      
      // Check if record is in target month
      if (recordYear === targetYear && recordMonth === targetMonthNum) {
        if (this.isRenewalProduct(record.product_or_service_name)) {
          renewalRevenue += record.amount
        } else {
          newRevenue += record.amount
        }
      }
    }
    
    return {
      new: newRevenue,
      renewal: renewalRevenue,
      total: newRevenue + renewalRevenue
    }
  }

  /**
   * Calculate actual revenue for a specific brand from Revenue.csv for a specific month
   * Uses restaurant_id to match transactions to brand outlets
   */
  calculateActualBrandRevenue(brand: BrandWithKAM, targetMonth: Date): RevenueBreakdown {
    const targetYear = targetMonth.getFullYear()
    const targetMonthNum = targetMonth.getMonth()
    
    // Get all restaurant IDs for this brand
    const brandRestaurantIds = new Set<string>()
    if (brand.outlets && Array.isArray(brand.outlets)) {
      brand.outlets.forEach(outlet => {
        brandRestaurantIds.add(outlet.restaurant_id)
      })
    }
    
    let newRevenue = 0
    let renewalRevenue = 0
    
    for (const record of this.revenueRecords) {
      // Check if this transaction belongs to this brand
      if (!brandRestaurantIds.has(record.restaurant_id)) {
        continue
      }
      
      const recordDate = new Date(record.date)
      const recordYear = recordDate.getFullYear()
      const recordMonth = recordDate.getMonth()
      
      // Check if record is in target month
      if (recordYear === targetYear && recordMonth === targetMonthNum) {
        if (this.isRenewalProduct(record.product_or_service_name)) {
          renewalRevenue += record.amount
        } else {
          newRevenue += record.amount
        }
      }
    }
    
    return {
      new: newRevenue,
      renewal: renewalRevenue,
      total: newRevenue + renewalRevenue
    }
  }

  /**
   * Calculate projected revenue for a future month
   * Combines:
   * 1. Historical revenue patterns from Revenue.csv (if available)
   * 2. Subscriptions expiring after Jan 2026 (assumed to renew)
   * 3. Price lookup from Price Data CSV
   */
  calculateProjectedRevenue(
    brands: BrandWithKAM[],
    targetMonth: Date
  ): RevenueBreakdown {
    const targetYear = targetMonth.getFullYear()
    const targetMonthNum = targetMonth.getMonth()
    
    // Check if this is a historical month (April 2025 - January 2026)
    const isHistoricalMonth = 
      (targetYear === 2025 && targetMonthNum >= 3) || // April 2025 onwards
      (targetYear === 2026 && targetMonthNum === 0)   // January 2026
    
    if (isHistoricalMonth) {
      // Use actual data from Revenue.csv
      return this.calculateActualMonthlyRevenue(targetMonth)
    }
    
    // For future months (Feb 2026 onwards), calculate projected revenue
    let projectedNew = 0
    let projectedRenewal = 0
    
    for (const brand of brands) {
      // Skip brands without valid Assign Date 1
      if (!brand.kam_assignment?.assign_date_1) {
        continue
      }
      
      const assignDate = new Date(brand.kam_assignment.assign_date_1)
      
      // Check if brand was assigned on or before target month
      if (assignDate > targetMonth) {
        continue
      }
      
      // Check all outlets for subscriptions expiring in or after target month
      if (brand.outlets && Array.isArray(brand.outlets)) {
        for (const outlet of brand.outlets) {
          if (outlet.pos_status?.toLowerCase() === 'active' && outlet.pos_expiry) {
            const expiryDate = new Date(outlet.pos_expiry)
            const expiryYear = expiryDate.getFullYear()
            const expiryMonth = expiryDate.getMonth()
            
            // If subscription expires after Jan 2026, assume it will renew
            if (expiryYear > 2026 || (expiryYear === 2026 && expiryMonth > 0)) {
              // Check if expiry is in target month (renewal month)
              if (expiryYear === targetYear && expiryMonth === targetMonthNum) {
                // Use renewal price
                const renewalPrice = this.priceMap.get('POS_Subscription_Renewal') || 
                                   this.priceMap.get('POS_Subscription') || 
                                   7000
                projectedRenewal += renewalPrice
              }
            }
            
            // Check if creation is in target month (new subscription)
            if (outlet.pos_creation) {
              const creationDate = new Date(outlet.pos_creation)
              if (creationDate.getFullYear() === targetYear && 
                  creationDate.getMonth() === targetMonthNum) {
                const newPrice = this.priceMap.get('POS_Subscription') || 10000
                projectedNew += newPrice
              }
            }
          }
        }
      }
    }
    
    return {
      new: projectedNew,
      renewal: projectedRenewal,
      total: projectedNew + projectedRenewal
    }
  }

  /**
   * Calculate revenue for a brand for a given month
   * Uses actual data if available, otherwise projects based on subscriptions
   * 
   * @param assumeRenewal - If true, treats products expiring in target month as renewed
   */
  calculateBrandRevenue(
    brand: BrandWithKAM,
    targetMonth: Date,
    assumeRenewal: boolean = false
  ): RevenueBreakdown {
    const targetYear = targetMonth.getFullYear()
    const targetMonthNum = targetMonth.getMonth()
    
    // Check if this is a historical month (April 2025 - January 2026)
    const isHistoricalMonth = 
      (targetYear === 2025 && targetMonthNum >= 3) || // April 2025 onwards
      (targetYear === 2026 && targetMonthNum === 0)   // January 2026
    
    if (isHistoricalMonth && this.revenueRecords.length > 0) {
      // Use actual data from Revenue.csv
      return this.calculateActualBrandRevenue(brand, targetMonth)
    }
    
    // For future months or when no revenue data available, project based on subscriptions
    let projectedNew = 0
    let projectedRenewal = 0
    
    if (brand.outlets && Array.isArray(brand.outlets)) {
      for (const outlet of brand.outlets) {
        if (outlet.pos_status?.toLowerCase() === 'active') {
          // Check if creation is in target month (new subscription)
          if (outlet.pos_creation) {
            const creationDate = new Date(outlet.pos_creation)
            if (creationDate.getFullYear() === targetYear && 
                creationDate.getMonth() === targetMonthNum) {
              const newPrice = this.priceMap.get('POS_Subscription') || 10000
              projectedNew += newPrice
            }
          }
          
          // Check if expiry is in target month (renewal)
          if (outlet.pos_expiry) {
            const expiryDate = new Date(outlet.pos_expiry)
            const expiryYear = expiryDate.getFullYear()
            const expiryMonth = expiryDate.getMonth()
            
            // If subscription expires after Jan 2026 and in target month
            if ((expiryYear > 2026 || (expiryYear === 2026 && expiryMonth > 0)) &&
                expiryYear === targetYear && expiryMonth === targetMonthNum) {
              if (assumeRenewal) {
                const renewalPrice = this.priceMap.get('POS_Subscription_Renewal') || 
                                   this.priceMap.get('POS_Subscription') || 
                                   7000
                projectedRenewal += renewalPrice
              }
            }
          }
        }
      }
    }
    
    return {
      new: projectedNew,
      renewal: projectedRenewal,
      total: projectedNew + projectedRenewal
    }
  }

  /**
   * Calculate total revenue for all brands for a given month
   * Uses actual data if available, otherwise projects
   * 
   * @param assumeRenewal - If true, treats products expiring in target month as renewed
   */
  calculateMonthlyRevenue(
    brands: BrandWithKAM[],
    targetMonth: Date,
    assumeRenewal: boolean = false
  ): RevenueBreakdown {
    const targetYear = targetMonth.getFullYear()
    const targetMonthNum = targetMonth.getMonth()
    
    // Check if this is a historical month (April 2025 - January 2026)
    const isHistoricalMonth = 
      (targetYear === 2025 && targetMonthNum >= 3) || // April 2025 onwards
      (targetYear === 2026 && targetMonthNum === 0)   // January 2026
    
    if (isHistoricalMonth && this.revenueRecords.length > 0) {
      // Use actual data from Revenue.csv
      return this.calculateActualMonthlyRevenue(targetMonth)
    }
    
    // For future months, use projection
    return this.calculateProjectedRevenue(brands, targetMonth)
  }

  /**
   * Calculate RPU (Revenue Per Unit) for department level
   * Formula: Total Revenue / Total Brands
   * 
   * @param brands - All brands in the department
   * @param targetMonth - The month to calculate RPU for
   * @param brandCount - Total number of brands for that month
   * @returns RPU breakdown (new, renewal, total)
   */
  calculateDepartmentRPU(
    brands: BrandWithKAM[],
    targetMonth: Date,
    brandCount: number
  ): RevenueBreakdown {
    if (brandCount === 0) {
      return { new: 0, renewal: 0, total: 0 }
    }
    
    const revenue = this.calculateMonthlyRevenue(brands, targetMonth)
    
    return {
      new: revenue.new / brandCount,
      renewal: revenue.renewal / brandCount,
      total: revenue.total / brandCount
    }
  }

  /**
   * Calculate RPU (Revenue Per Unit) for brand level
   * Formula: Total Revenue / Total Outlets
   * 
   * @param brand - The brand to calculate RPU for
   * @param targetMonth - The month to calculate RPU for
   * @param outletCount - Total number of outlets for that brand in that month
   * @param assumeRenewal - If true, treats products expiring in target month as renewed
   * @returns RPU breakdown (new, renewal, total)
   */
  calculateBrandRPU(
    brand: BrandWithKAM,
    targetMonth: Date,
    outletCount: number,
    assumeRenewal: boolean = false
  ): RevenueBreakdown {
    if (outletCount === 0) {
      return { new: 0, renewal: 0, total: 0 }
    }
    
    const revenue = this.calculateBrandRevenue(brand, targetMonth, assumeRenewal)
    
    return {
      new: revenue.new / outletCount,
      renewal: revenue.renewal / outletCount,
      total: revenue.total / outletCount
    }
  }
}
