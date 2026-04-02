import { BrandRecord, KAMRecord } from './types'

export interface ProductWeight {
  [key: string]: number
}

export interface BrandSCI {
  brandName: string
  kamName: string
  totalOutlets: number
  density: number
  spreadScore: number
  sci: number
  switchingCostCategory: 'High' | 'Medium' | 'Low'
}

// Define non-core products (all except POS_Subscription)
const NON_CORE_PRODUCTS = [
  'Petpooja_Tasks',
  'Petpooja_Payroll',
  'Petpooja_Growth_Plan',
  'Petpooja_Scale_Plan',
  'Petpooja_Ultimate_Plan',
  'Petpooja_POS_Ultimate_Plan',
  'Petpooja_POS_Growth_Plan',
  'Petpooja_POS_Scale_Plan',
  'Captain_Application',
  'Petpooja_Pay',
  'Petpooja_Connect',
  'Intellisense',
  'QR_Feedback',
  'Self_Order_Kiosk',
  'Online_Order_Reconciliation',
  'Inventory_Application',
  'Petpooja_Loyalty',
  'Online_Ordering_Widget',
  'My_Website',
  'Dynamic_Reports',
  'Petpooja_Plus',
  'Power_Integration',
  'Reservation_Manager_App',
  'Petpooja_Scan_Order',
  'Gift_Card',
  'Feedback_Management',
  'Data_Lake',
  'SMS_Service',
  'Petpooja_Purchase',
  'Weigh_Scale_Service',
  'Whatsapp_CRM',
  'Petpooja_Go_Rental',
  'Queue_Management',
  'Petpooja_PRO',
  'Kitchen_Display_System',
  'Waiter_Calling_Device',
  'Virtual_Wallet',
  'Petpooja_Briefcase',
  'Token_Management',
  'Link_based_Feedback_Service'
] as const

// Define product weights
const PRODUCT_WEIGHTS: ProductWeight = {
  // High switching cost products (weight: 3) - deeply embedded in operations
  Captain_Application: 3,
  Self_Order_Kiosk: 3,
  Inventory_Application: 3,
  Petpooja_Loyalty: 3,
  Dynamic_Reports: 3,
  Reservation_Manager_App: 3,
  Kitchen_Display_System: 3,
  Waiter_Calling_Device: 3,
  
  // Medium switching cost products (weight: 2) - important but less embedded
  Petpooja_Payroll: 2,
  Petpooja_Growth_Plan: 2,
  Petpooja_Scan_Order: 2,
  Petpooja_Scale_Plan: 2,
  Petpooja_POS_Scale_Plan: 2,
  Petpooja_POS_Growth_Plan: 2,
}

// Get weight for a product (default is 1)
function getProductWeight(product: string): number {
  return PRODUCT_WEIGHTS[product] || 1
}

// Check if a product is active
function isProductActive(status: string): boolean {
  return status?.toLowerCase() === 'active'
}

// Calculate SCI for all brands
export function calculateSwitchingCostIndex(
  brandRecords: BrandRecord[],
  kamRecords: KAMRecord[]
): BrandSCI[] {
  // Group outlets by email (brand)
  const brandMap = new Map<string, BrandRecord[]>()
  
  for (const record of brandRecords) {
    const email = record.email.toLowerCase()
    if (!brandMap.has(email)) {
      brandMap.set(email, [])
    }
    brandMap.get(email)!.push(record)
  }

  // Calculate total_weight (constant across all brands)
  const totalWeight = NON_CORE_PRODUCTS.reduce((sum, product) => {
    return sum + getProductWeight(product)
  }, 0)

  // Find max outlets in dataset for scale_score calculation
  const maxOutlets = Math.max(...Array.from(brandMap.values()).map(outlets => outlets.length))

  const results: BrandSCI[] = []

  // Process each brand
  for (const [email, outlets] of brandMap.entries()) {
    // Find KAM for this brand
    const kamRecord = kamRecords.find(k => k.email.toLowerCase() === email)
    const kamName = kamRecord?.kam_name_1 || 'Unassigned'
    const brandName = kamRecord?.brand_name || email

    // Calculate total outlets
    const totalOutlets = outlets.length

    // Handle edge case: no outlets
    if (totalOutlets === 0) {
      results.push({
        brandName,
        kamName,
        totalOutlets: 0,
        density: 0,
        spreadScore: 0,
        sci: 0,
        switchingCostCategory: 'Low'
      })
      continue
    }

    // Calculate active module count per outlet and total
    let totalActiveModules = 0
    const productSpreadMap = new Map<string, number>()

    for (const outlet of outlets) {
      let activeModuleCount = 0

      // Count active non-core products for this outlet
      for (const product of NON_CORE_PRODUCTS) {
        const statusField = `${product}_status` as keyof BrandRecord
        const status = outlet[statusField] as string

        if (isProductActive(status)) {
          activeModuleCount++

          // Track outlets where this product is active
          productSpreadMap.set(
            product,
            (productSpreadMap.get(product) || 0) + 1
          )
        }
      }

      totalActiveModules += activeModuleCount
    }

    // Calculate Density Score
    const density = totalOutlets === 0 ? 0 : totalActiveModules / totalOutlets

    // Calculate Spread Score for each product
    const productSpreads: { product: string; spread: number; weight: number }[] = []
    
    for (const product of NON_CORE_PRODUCTS) {
      const outletsWithProduct = productSpreadMap.get(product) || 0
      const spread = outletsWithProduct / totalOutlets
      const weight = getProductWeight(product)
      
      productSpreads.push({ product, spread, weight })
    }

    // Calculate average spread score (unweighted average)
    const spreadScore = productSpreads.reduce((sum, p) => sum + p.spread, 0) / NON_CORE_PRODUCTS.length

    // Calculate SCI_embedded (weighted)
    const weightedSum = productSpreads.reduce((sum, p) => sum + (p.spread * p.weight), 0)
    const sciEmbedded = totalWeight === 0 ? 0 : weightedSum / totalWeight

    // Calculate scale_score using logarithmic scaling
    let scaleScore = 0
    if (totalOutlets > 1 && maxOutlets > 1) {
      scaleScore = Math.log(totalOutlets) / Math.log(maxOutlets)
    }

    // Calculate final SCI with scale adjustment
    let sciFinal = 0
    if (totalOutlets > 0 && totalWeight > 0) {
      sciFinal = sciEmbedded * (0.5 + 0.5 * scaleScore)
    }

    // Categorize switching cost
    let switchingCostCategory: 'High' | 'Medium' | 'Low'
    if (sciFinal >= 0.6) {
      switchingCostCategory = 'High'
    } else if (sciFinal >= 0.3) {
      switchingCostCategory = 'Medium'
    } else {
      switchingCostCategory = 'Low'
    }

    results.push({
      brandName,
      kamName,
      totalOutlets,
      density,
      spreadScore,
      sci: sciFinal,
      switchingCostCategory
    })
  }

  // Sort by SCI descending
  results.sort((a, b) => b.sci - a.sci)

  return results
}
