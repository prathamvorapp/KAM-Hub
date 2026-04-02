import { BrandWithKAM, ChurnRecord, RevenueRecord, PriceData } from './types'

export interface MonthlyChurnData {
  month: string // Format: "Apr-25"
  churnCount: number
  activeOutletsAtStart: number
  churnRate: number // Percentage
  revenueLost: number
}

export interface BrandChurnData {
  brandName: string
  kamName: string
  churnCount: number
  revenueLost: number
}

export interface KAMChurnData {
  kamName: string
  brandCount: number
  churnCount: number
  revenueLost: number
  averageChurnPerBrand: number
}

export interface ChurnReasonData {
  reason: string
  count: number
  percentage: number
}

export interface ChurnAnalysis {
  monthlyData: MonthlyChurnData[]
  brandChurnData: BrandChurnData[]
  kamChurnData: KAMChurnData[]
  churnReasonData: ChurnReasonData[]
  totalChurnCount: number
  totalRevenueLost: number
  averageChurnRate: number
  rollingAverageChurnRate: number[]
}

/**
 * Parse date string in DD-MMM-YY format to Date object
 */
function parseChurnDate(dateStr: string): Date | null {
  if (!dateStr || dateStr.trim() === '') return null
  
  try {
    const parts = dateStr.split('-')
    if (parts.length !== 3) return null
    
    const day = parseInt(parts[0])
    const monthStr = parts[1]
    const year = parseInt('20' + parts[2]) // Convert YY to YYYY
    
    const monthMap: { [key: string]: number } = {
      'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
      'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
    }
    
    const month = monthMap[monthStr]
    if (month === undefined) return null
    
    return new Date(year, month, day)
  } catch {
    return null
  }
}

/**
 * Format date to month string (e.g., "Apr-25")
 */
function formatMonth(date: Date): string {
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const month = monthNames[date.getMonth()]
  const year = date.getFullYear().toString().slice(-2)
  return `${month}-${year}`
}

/**
 * Calculate revenue for a churned outlet based on inactive services that would have been renewed
 * Logic: If a service is inactive (expired), it means it was previously active and would have been
 * renewed if the outlet hadn't churned. This represents the lost renewal revenue.
 */
function calculateOutletRevenue(
  restaurantId: string,
  brands: BrandWithKAM[],
  prices: PriceData[],
  revenueRecords: RevenueRecord[]
): number {
  // Find the brand this outlet belongs to
  const brand = brands.find(b => 
    b.restaurant_id === restaurantId || 
    b.outlets.some(o => o.restaurant_id === restaurantId)
  )
  
  if (!brand) return 0
  
  // Method 1: Check actual revenue from Revenue.csv
  const outletRevenue = revenueRecords
    .filter(r => r.restaurant_id === restaurantId)
    .reduce((sum, r) => sum + r.amount, 0)
  
  // Method 2: Calculate based on INACTIVE services (services that expired and would have been renewed)
  const outlet = brand.outlets.find(o => o.restaurant_id === restaurantId) || brand
  let calculatedRevenue = 0
  
  // Check each service - we want INACTIVE services (these would have been renewed)
  const serviceFields = Object.keys(outlet).filter(key => key.endsWith('_status'))
  
  serviceFields.forEach(statusField => {
    const status = (outlet as any)[statusField]
    // Look for inactive services - these are the ones that expired and would have been renewed
    if (status === 'inactive') {
      // Extract service name from field (e.g., "Captain_Application_status" -> "Captain_Application")
      const serviceName = statusField.replace('_status', '')
      
      // Find price for this service
      const priceEntry = prices.find(p => 
        p.service_product_name.replace(/\s+/g, '_') === serviceName ||
        p.service_product_name === serviceName.replace(/_/g, ' ')
      )
      
      if (priceEntry) {
        calculatedRevenue += priceEntry.price
      }
    }
  })
  
  // Return the higher value (actual revenue or calculated renewal revenue)
  return Math.max(outletRevenue, calculatedRevenue)
}

/**
 * Calculate monthly churn rate and revenue lost
 *//**
 * Calculate monthly churn rate and revenue lost
 */
export function calculateChurnAnalysis(
  churnRecords: ChurnRecord[],
  brands: BrandWithKAM[],
  prices: PriceData[],
  revenueRecords: RevenueRecord[]
): ChurnAnalysis {
  // Group churns by month
  const monthlyChurns = new Map<string, ChurnRecord[]>()
  
  churnRecords.forEach(churn => {
    const date = parseChurnDate(churn.date)
    if (!date) return
    
    const monthKey = formatMonth(date)
    if (!monthlyChurns.has(monthKey)) {
      monthlyChurns.set(monthKey, [])
    }
    monthlyChurns.get(monthKey)!.push(churn)
  })
  
  // Sort months chronologically
  const sortedMonths = Array.from(monthlyChurns.keys()).sort((a, b) => {
    const dateA = new Date('01-' + a)
    const dateB = new Date('01-' + b)
    return dateA.getTime() - dateB.getTime()
  })
  
  // Calculate total active outlets at the start (before any churns)
  const totalOutlets = brands.reduce((sum, brand) => sum + brand.outlets.length, 0)
  let runningActiveOutlets = totalOutlets
  
  // Calculate monthly data
  const monthlyData: MonthlyChurnData[] = []
  
  sortedMonths.forEach(month => {
    const churns = monthlyChurns.get(month)!
    const churnCount = churns.length
    
    // Calculate revenue lost for this month
    const revenueLost = churns.reduce((sum, churn) => {
      return sum + calculateOutletRevenue(churn.restaurant_id, brands, prices, revenueRecords)
    }, 0)
    
    // Calculate churn rate
    const churnRate = runningActiveOutlets > 0 
      ? (churnCount / runningActiveOutlets) * 100 
      : 0
    
    monthlyData.push({
      month,
      churnCount,
      activeOutletsAtStart: runningActiveOutlets,
      churnRate,
      revenueLost
    })
    
    // Update running count for next month
    runningActiveOutlets -= churnCount
  })
  
  // Calculate 3-month rolling average of churn rate
  const rollingAverageChurnRate: number[] = []
  for (let i = 0; i < monthlyData.length; i++) {
    if (i < 2) {
      // Not enough data for 3-month average
      rollingAverageChurnRate.push(monthlyData[i].churnRate)
    } else {
      const avg = (
        monthlyData[i].churnRate +
        monthlyData[i - 1].churnRate +
        monthlyData[i - 2].churnRate
      ) / 3
      rollingAverageChurnRate.push(avg)
    }
  }
  
  // Calculate brand-level churn data
  const brandChurnMap = new Map<string, { churnCount: number; revenueLost: number; kamName: string }>()
  
  churnRecords.forEach(churn => {
    const brand = brands.find(b => 
      b.restaurant_id === churn.restaurant_id ||
      b.outlets.some(o => o.restaurant_id === churn.restaurant_id)
    )
    
    if (brand) {
      const brandName = brand.kam_assignment?.brand_name || brand.email
      const kamName = getLatestKAM(brand) || 'Unassigned'
      const revenue = calculateOutletRevenue(churn.restaurant_id, brands, prices, revenueRecords)
      
      if (!brandChurnMap.has(brandName)) {
        brandChurnMap.set(brandName, { churnCount: 0, revenueLost: 0, kamName })
      }
      
      const data = brandChurnMap.get(brandName)!
      data.churnCount++
      data.revenueLost += revenue
    }
  })
  
  const brandChurnData: BrandChurnData[] = Array.from(brandChurnMap.entries())
    .map(([brandName, data]) => ({
      brandName,
      kamName: data.kamName,
      churnCount: data.churnCount,
      revenueLost: data.revenueLost
    }))
    .sort((a, b) => b.revenueLost - a.revenueLost)
  
  // Calculate KAM-level churn data
  const kamChurnMap = new Map<string, { brandSet: Set<string>; churnCount: number; revenueLost: number }>()
  
  churnRecords.forEach(churn => {
    const brand = brands.find(b => 
      b.restaurant_id === churn.restaurant_id ||
      b.outlets.some(o => o.restaurant_id === churn.restaurant_id)
    )
    
    if (brand) {
      const kamName = getLatestKAM(brand) || 'Unassigned'
      const brandName = brand.kam_assignment?.brand_name || brand.email
      const revenue = calculateOutletRevenue(churn.restaurant_id, brands, prices, revenueRecords)
      
      if (!kamChurnMap.has(kamName)) {
        kamChurnMap.set(kamName, { brandSet: new Set(), churnCount: 0, revenueLost: 0 })
      }
      
      const data = kamChurnMap.get(kamName)!
      data.brandSet.add(brandName)
      data.churnCount++
      data.revenueLost += revenue
    }
  })
  
  const kamChurnData: KAMChurnData[] = Array.from(kamChurnMap.entries())
    .map(([kamName, data]) => ({
      kamName,
      brandCount: data.brandSet.size,
      churnCount: data.churnCount,
      revenueLost: data.revenueLost,
      averageChurnPerBrand: data.churnCount / data.brandSet.size
    }))
    .sort((a, b) => b.revenueLost - a.revenueLost)
  
  // Calculate totals
  const totalChurnCount = churnRecords.length
  const totalRevenueLost = monthlyData.reduce((sum, m) => sum + m.revenueLost, 0)
  const averageChurnRate = monthlyData.length > 0
    ? monthlyData.reduce((sum, m) => sum + m.churnRate, 0) / monthlyData.length
    : 0
  
  // Aggregate churn reasons
  const reasonMap = new Map<string, number>()
  churnRecords.forEach(churn => {
    const raw = (churn.churn_reasons || '').trim()
    const reason = raw === '' ? 'Unknown' : raw
    reasonMap.set(reason, (reasonMap.get(reason) || 0) + 1)
  })
  const totalWithReasons = churnRecords.length || 1
  const churnReasonData = Array.from(reasonMap.entries())
    .map(([reason, count]) => ({
      reason,
      count,
      percentage: (count / totalWithReasons) * 100
    }))
    .sort((a, b) => b.count - a.count)

  return {
    monthlyData,
    brandChurnData,
    kamChurnData,
    churnReasonData,
    totalChurnCount,
    totalRevenueLost,
    averageChurnRate,
    rollingAverageChurnRate
  }
}

/**
 * Get the latest KAM name from a brand's KAM assignment
 */
function getLatestKAM(brand: BrandWithKAM): string | null {
  if (!brand.kam_assignment) return null
  
  const kam = brand.kam_assignment
  
  if (kam.kam_name_6 && kam.kam_name_6.trim()) return kam.kam_name_6.trim()
  if (kam.kam_name_5 && kam.kam_name_5.trim()) return kam.kam_name_5.trim()
  if (kam.kam_name_4 && kam.kam_name_4.trim()) return kam.kam_name_4.trim()
  if (kam.kam_name_3 && kam.kam_name_3.trim()) return kam.kam_name_3.trim()
  if (kam.kam_name_2 && kam.kam_name_2.trim()) return kam.kam_name_2.trim()
  if (kam.kam_name_1 && kam.kam_name_1.trim()) return kam.kam_name_1.trim()
  
  return null
}
