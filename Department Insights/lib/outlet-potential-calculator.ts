// Outlet Potential Index Calculator
// Based on Points.csv: each applicable service = 1 point, POS is default (always 1)
// Score = active applicable services / total applicable services * 100

export type OutletType =
  | 'QSR'
  | 'Cafe'
  | 'Dine In'
  | 'Cloud Kitchen'
  | 'Icecream Parlor'
  | 'Bakery'
  | 'Dine in & QSR'
  | 'Retail Store'
  | 'Foodcourts'
  | 'Sweet Shop'

// Points.csv matrix: service -> outlet type -> applicable (1) or not
// POS_Subscription is always applicable (default, not in Points.csv)
export const POINTS_MATRIX: Record<string, Partial<Record<OutletType, number>>> = {
  Captain_Application_status:             { Cafe: 1, 'Dine In': 1, 'Dine in & QSR': 1 },
  Intellisense_status:                    { QSR: 1, Cafe: 1, 'Dine In': 1, 'Cloud Kitchen': 1, 'Icecream Parlor': 1, Bakery: 1, 'Dine in & QSR': 1, 'Retail Store': 1, Foodcourts: 1, 'Sweet Shop': 1 },
  QR_Feedback_status:                     { QSR: 1, Cafe: 1, 'Dine In': 1, 'Cloud Kitchen': 1, 'Icecream Parlor': 1, Bakery: 1, 'Dine in & QSR': 1, 'Retail Store': 1 },
  Self_Order_Kiosk_status:                { QSR: 1, Cafe: 1, 'Dine In': 1, 'Icecream Parlor': 1, 'Dine in & QSR': 1, Foodcourts: 1 },
  Online_Order_Reconciliation_status:     { QSR: 1, Cafe: 1, 'Dine In': 1, 'Cloud Kitchen': 1, 'Icecream Parlor': 1, Bakery: 1, 'Dine in & QSR': 1, 'Retail Store': 1, Foodcourts: 1, 'Sweet Shop': 1 },
  Inventory_Application_status:           { QSR: 1, Cafe: 1, 'Dine In': 1, 'Cloud Kitchen': 1, 'Icecream Parlor': 1, Bakery: 1, 'Dine in & QSR': 1, 'Retail Store': 1, Foodcourts: 1, 'Sweet Shop': 1 },
  Petpooja_Loyalty_status:                { QSR: 1, Cafe: 1, 'Dine In': 1, 'Cloud Kitchen': 1, 'Icecream Parlor': 1, Bakery: 1, 'Dine in & QSR': 1, 'Retail Store': 1, Foodcourts: 1, 'Sweet Shop': 1 },
  Online_Ordering_Widget_status:          { QSR: 1, Cafe: 1, 'Dine In': 1, 'Cloud Kitchen': 1, 'Icecream Parlor': 1, Bakery: 1, 'Dine in & QSR': 1, 'Retail Store': 1, Foodcourts: 1, 'Sweet Shop': 1 },
  My_Website_status:                      { QSR: 1, Cafe: 1, 'Dine In': 1, 'Cloud Kitchen': 1, 'Icecream Parlor': 1, Bakery: 1, 'Dine in & QSR': 1, 'Retail Store': 1, Foodcourts: 1, 'Sweet Shop': 1 },
  Dynamic_Reports_status:                 { QSR: 1, Cafe: 1, 'Dine In': 1, 'Cloud Kitchen': 1, 'Icecream Parlor': 1, Bakery: 1, 'Dine in & QSR': 1, 'Retail Store': 1, Foodcourts: 1, 'Sweet Shop': 1 },
  Reservation_Manager_App_status:         { Cafe: 1, 'Dine In': 1, 'Dine in & QSR': 1, Foodcourts: 1 },
  Petpooja_Scan_Order_status:             { QSR: 1, Cafe: 1, 'Dine In': 1, 'Cloud Kitchen': 1, 'Dine in & QSR': 1 },
  Gift_Card_status:                       { QSR: 1, Cafe: 1, 'Dine In': 1, 'Cloud Kitchen': 1, 'Icecream Parlor': 1, Bakery: 1, 'Dine in & QSR': 1, 'Retail Store': 1, Foodcourts: 1, 'Sweet Shop': 1 },
  Feedback_Management_status:             { QSR: 1, Cafe: 1, 'Dine In': 1, 'Cloud Kitchen': 1, 'Icecream Parlor': 1, Bakery: 1, 'Dine in & QSR': 1, 'Retail Store': 1, Foodcourts: 1, 'Sweet Shop': 1 },
  Data_Lake_status:                       { QSR: 1, Cafe: 1, 'Dine In': 1, 'Cloud Kitchen': 1, 'Icecream Parlor': 1, Bakery: 1, 'Dine in & QSR': 1, 'Retail Store': 1, Foodcourts: 1, 'Sweet Shop': 1 },
  SMS_Service_status:                     { QSR: 1, Cafe: 1, 'Dine In': 1, 'Cloud Kitchen': 1, 'Icecream Parlor': 1, Bakery: 1, 'Dine in & QSR': 1, 'Retail Store': 1, Foodcourts: 1, 'Sweet Shop': 1 },
  Petpooja_Purchase_status:               { QSR: 1, Cafe: 1, 'Dine In': 1, 'Cloud Kitchen': 1, 'Icecream Parlor': 1, Bakery: 1, 'Dine in & QSR': 1, 'Retail Store': 1, Foodcourts: 1, 'Sweet Shop': 1 },
  Weigh_Scale_Service_status:             { QSR: 1, Cafe: 1, 'Dine In': 1, 'Cloud Kitchen': 1, 'Icecream Parlor': 1, Bakery: 1, 'Dine in & QSR': 1, 'Retail Store': 1, Foodcourts: 1, 'Sweet Shop': 1 },
  Petpooja_Payroll_status:                { QSR: 1, Cafe: 1, 'Dine In': 1, 'Cloud Kitchen': 1, 'Icecream Parlor': 1, Bakery: 1, 'Dine in & QSR': 1, 'Retail Store': 1, Foodcourts: 1, 'Sweet Shop': 1 },
  Whatsapp_CRM_status:                    { QSR: 1, Cafe: 1, 'Dine In': 1, 'Cloud Kitchen': 1, 'Icecream Parlor': 1, Bakery: 1, 'Dine in & QSR': 1, 'Retail Store': 1, Foodcourts: 1, 'Sweet Shop': 1 },
  Petpooja_Go_Rental_status:              { QSR: 1, Cafe: 1, 'Dine In': 1, 'Cloud Kitchen': 1, 'Icecream Parlor': 1, Bakery: 1, 'Dine in & QSR': 1, 'Retail Store': 1, Foodcourts: 1, 'Sweet Shop': 1 },
  Queue_Management_status:                { Cafe: 1, 'Dine In': 1, 'Dine in & QSR': 1, Foodcourts: 1 },
  Petpooja_Tasks_status:                  { QSR: 1, Cafe: 1, 'Dine In': 1, 'Cloud Kitchen': 1, 'Icecream Parlor': 1, Bakery: 1, 'Dine in & QSR': 1, 'Retail Store': 1, Foodcourts: 1, 'Sweet Shop': 1 },
  Kitchen_Display_System_status:          { QSR: 1, Cafe: 1, 'Dine In': 1, 'Cloud Kitchen': 1, 'Icecream Parlor': 1, 'Dine in & QSR': 1, Foodcourts: 1, 'Sweet Shop': 1 },
  Waiter_Calling_Device_status:           { QSR: 1, Cafe: 1, 'Dine In': 1, 'Dine in & QSR': 1 },
  Virtual_Wallet_status:                  { QSR: 1, Cafe: 1, 'Dine In': 1, 'Cloud Kitchen': 1, 'Icecream Parlor': 1, Bakery: 1, 'Dine in & QSR': 1, 'Retail Store': 1, Foodcourts: 1, 'Sweet Shop': 1 },
  Token_Management_status:                { QSR: 1, Cafe: 1, 'Cloud Kitchen': 1, 'Icecream Parlor': 1, 'Dine in & QSR': 1, Foodcourts: 1 },
  Link_based_Feedback_Service_status:     { QSR: 1, Cafe: 1, 'Dine In': 1, 'Cloud Kitchen': 1, 'Icecream Parlor': 1, Bakery: 1, 'Dine in & QSR': 1, 'Retail Store': 1, Foodcourts: 1, 'Sweet Shop': 1 },
  Swiggy_integration:                     { QSR: 1, Cafe: 1, 'Dine In': 1, 'Cloud Kitchen': 1, 'Icecream Parlor': 1, Bakery: 1, 'Dine in & QSR': 1, 'Retail Store': 1, Foodcourts: 1, 'Sweet Shop': 1 },
  Zomato_integration:                     { QSR: 1, Cafe: 1, 'Dine In': 1, 'Cloud Kitchen': 1, 'Icecream Parlor': 1, Bakery: 1, 'Dine in & QSR': 1, 'Retail Store': 1, Foodcourts: 1, 'Sweet Shop': 1 },
  Inventory_Points:                       { QSR: 1, Cafe: 1, 'Dine In': 1, 'Cloud Kitchen': 1, 'Icecream Parlor': 1, Bakery: 1, 'Dine in & QSR': 1, 'Retail Store': 1, Foodcourts: 1, 'Sweet Shop': 1 },
  AI:                                     { QSR: 1, Cafe: 1, 'Dine In': 1, 'Cloud Kitchen': 1, 'Icecream Parlor': 1, Bakery: 1, 'Dine in & QSR': 1, 'Retail Store': 1, Foodcourts: 1, 'Sweet Shop': 1 },
  Tally:                                  { QSR: 1, Cafe: 1, 'Dine In': 1, 'Cloud Kitchen': 1, 'Icecream Parlor': 1, Bakery: 1, 'Dine in & QSR': 1, 'Retail Store': 1, Foodcourts: 1, 'Sweet Shop': 1 },
}

// Services that are checked via a simple active/inactive status field
const STATUS_SERVICES = [
  'Captain_Application_status',
  'Intellisense_status',
  'QR_Feedback_status',
  'Self_Order_Kiosk_status',
  'Online_Order_Reconciliation_status',
  'Inventory_Application_status',
  'Petpooja_Loyalty_status',
  'Online_Ordering_Widget_status',
  'My_Website_status',
  'Dynamic_Reports_status',
  'Reservation_Manager_App_status',
  'Petpooja_Scan_Order_status',
  'Gift_Card_status',
  'Feedback_Management_status',
  'Data_Lake_status',
  'SMS_Service_status',
  'Petpooja_Purchase_status',
  'Weigh_Scale_Service_status',
  'Petpooja_Payroll_status',
  'Whatsapp_CRM_status',
  'Petpooja_Go_Rental_status',
  'Queue_Management_status',
  'Petpooja_Tasks_status',
  'Kitchen_Display_System_status',
  'Waiter_Calling_Device_status',
  'Virtual_Wallet_status',
  'Token_Management_status',
  'Link_based_Feedback_Service_status',
]

// Special fields that use non-status logic
const SPECIAL_FIELDS = ['Swiggy_integration', 'Zomato_integration', 'Inventory_Points', 'AI', 'Tally']

function isActive(value: string | undefined | null): boolean {
  if (!value || value.trim() === '') return false
  return value.trim().toLowerCase() === 'active'
}

function isSpecialActive(field: string, record: any): boolean {
  const val = record[field]
  if (!val || val.trim() === '') return false
  if (field === 'Inventory_Points') {
    // Active if has a numeric value > 0
    const num = parseFloat(val)
    return !isNaN(num) && num > 0
  }
  // Swiggy_integration, Zomato_integration, AI, Tally
  return val.trim().toLowerCase() === 'active'
}

export interface OutletPotentialScore {
  restaurant_id: string
  brandName: string
  outletType: string
  totalApplicable: number  // includes POS
  activeCount: number      // includes POS (always 1)
  score: number            // activeCount
  percentage: number       // activeCount / totalApplicable * 100
  activeServices: string[]
  missingServices: string[]
}

// Normalize outlet type string to match POINTS_MATRIX keys
function normalizeOutletType(raw: string): OutletType | null {
  const map: Record<string, OutletType> = {
    'qsr': 'QSR',
    'cafe': 'Cafe',
    'dine in': 'Dine In',
    'cloud kitchen': 'Cloud Kitchen',
    'icecream parlor': 'Icecream Parlor',
    'ice cream parlor': 'Icecream Parlor',
    'bakery': 'Bakery',
    'dine in & qsr': 'Dine in & QSR',
    'retail store': 'Retail Store',
    'foodcourts': 'Foodcourts',
    'food court': 'Foodcourts',
    'sweet shop': 'Sweet Shop',
  }
  return map[raw.toLowerCase().trim()] || null
}

function isPosActive(record: any): boolean {
  const expiry = record.POS_Subscription_expiry
  if (!expiry || expiry.trim() === '') return true  // no expiry date = treat as active
  const expiryDate = new Date(expiry.trim())
  if (isNaN(expiryDate.getTime())) return true      // unparseable date = treat as active
  return expiryDate >= new Date()
}

export function calculateOutletPotential(record: any, brandName: string): OutletPotentialScore | null {
  const outletType = normalizeOutletType((record.restaurant_type || '').trim())
  if (!outletType) return null

  // Exclude outlets with expired POS subscription
  if (!isPosActive(record)) return null

  let totalApplicable = 1       // POS
  let activeCount = 1           // POS active (expiry already checked above)
  const activeServices: string[] = ['POS']
  const missingServices: string[] = []

  // Check each service in the matrix
  for (const service of STATUS_SERVICES) {
    const applicable = POINTS_MATRIX[service]?.[outletType]
    if (applicable === 1) {
      totalApplicable++
      if (isActive(record[service])) {
        activeCount++
        activeServices.push(service.replace('_status', '').replace(/_/g, ' '))
      } else {
        missingServices.push(service.replace('_status', '').replace(/_/g, ' '))
      }
    }
  }

  for (const field of SPECIAL_FIELDS) {
    const applicable = POINTS_MATRIX[field]?.[outletType]
    if (applicable === 1) {
      totalApplicable++
      if (isSpecialActive(field, record)) {
        activeCount++
        activeServices.push(field.replace(/_/g, ' '))
      } else {
        missingServices.push(field.replace(/_/g, ' '))
      }
    }
  }

  return {
    restaurant_id: record.restaurant_id,
    brandName,
    outletType,
    totalApplicable,
    activeCount,
    score: activeCount,
    percentage: Math.round((activeCount / totalApplicable) * 100),
    activeServices,
    missingServices,
  }
}
