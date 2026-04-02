// Outlet Product Matrix Calculator
// Based on outlet matrix.csv:
//   10 pts = Critical service
//    5 pts = Nice to Have
//   10 pts = Feedback group (any one of QR_Feedback / Feedback_Management / Link_based_Feedback active → 10 pts, else 0)
// Rule: Feedback is scored as a single 10-pt block per outlet type.
//       Individual feedback services are shown for visibility only.

export type OutletType =
  | 'QSR' | 'Cafe' | 'Dine In' | 'Cloud Kitchen'
  | 'Icecream Parlor' | 'Bakery' | 'Dine in & QSR'
  | 'Retail Store' | 'Foodcourts' | 'Sweet Shop'

// outlet matrix.csv values: 10 = Critical, 5 = Nice to Have, 1 = Feedback
export const MATRIX: Record<string, Partial<Record<OutletType, number>>> = {
  Captain_Application_status:             { Cafe: 10, 'Dine In': 10, 'Dine in & QSR': 10 },
  Intellisense_status:                    { QSR: 5, Cafe: 5, 'Dine In': 5, 'Cloud Kitchen': 5, 'Icecream Parlor': 5, Bakery: 5, 'Dine in & QSR': 5, 'Retail Store': 5, Foodcourts: 5, 'Sweet Shop': 5 },
  QR_Feedback_status:                     { QSR: 1, Cafe: 1, 'Dine In': 1, 'Cloud Kitchen': 1, 'Icecream Parlor': 1, Bakery: 1, 'Dine in & QSR': 1, 'Retail Store': 1 },
  Self_Order_Kiosk_status:                { QSR: 10, Cafe: 5, 'Dine In': 5, 'Icecream Parlor': 10, 'Dine in & QSR': 5, Foodcourts: 5 },
  Online_Order_Reconciliation_status:     { QSR: 10, Cafe: 10, 'Dine In': 5, 'Cloud Kitchen': 10, 'Icecream Parlor': 5, Bakery: 10, 'Dine in & QSR': 10, 'Retail Store': 5, Foodcourts: 5, 'Sweet Shop': 10 },
  Inventory_Application_status:           { QSR: 10, Cafe: 10, 'Dine In': 10, 'Cloud Kitchen': 10, 'Icecream Parlor': 10, Bakery: 10, 'Dine in & QSR': 10, 'Retail Store': 10, Foodcourts: 10, 'Sweet Shop': 10 },
  Petpooja_Loyalty_status:                { QSR: 5, Cafe: 5, 'Dine In': 5, 'Cloud Kitchen': 5, 'Icecream Parlor': 5, Bakery: 5, 'Dine in & QSR': 5, 'Retail Store': 5, Foodcourts: 5, 'Sweet Shop': 5 },
  Online_Ordering_Widget_status:          { QSR: 10, Cafe: 10, 'Dine In': 10, 'Cloud Kitchen': 10, 'Icecream Parlor': 10, Bakery: 10, 'Dine in & QSR': 10, 'Retail Store': 10, Foodcourts: 10, 'Sweet Shop': 10 },
  My_Website_status:                      { QSR: 10, Cafe: 10, 'Dine In': 10, 'Cloud Kitchen': 10, 'Icecream Parlor': 10, Bakery: 10, 'Dine in & QSR': 10, 'Retail Store': 10, Foodcourts: 10, 'Sweet Shop': 10 },
  Dynamic_Reports_status:                 { QSR: 10, Cafe: 10, 'Dine In': 10, 'Cloud Kitchen': 10, 'Icecream Parlor': 10, Bakery: 10, 'Dine in & QSR': 10, 'Retail Store': 10, Foodcourts: 10, 'Sweet Shop': 10 },
  Reservation_Manager_App_status:         { Cafe: 10, 'Dine In': 10, 'Dine in & QSR': 10, Foodcourts: 10 },
  Petpooja_Scan_Order_status:             { QSR: 10, Cafe: 10, 'Dine In': 10, 'Cloud Kitchen': 10, 'Dine in & QSR': 10 },
  Gift_Card_status:                       { QSR: 5, Cafe: 5, 'Dine In': 5, 'Cloud Kitchen': 5, 'Icecream Parlor': 5, Bakery: 5, 'Dine in & QSR': 5, 'Retail Store': 5, Foodcourts: 5, 'Sweet Shop': 5 },
  Feedback_Management_status:             { QSR: 1, Cafe: 1, 'Dine In': 1, 'Cloud Kitchen': 1, 'Icecream Parlor': 1, Bakery: 1, 'Dine in & QSR': 1, 'Retail Store': 1, Foodcourts: 1, 'Sweet Shop': 1 },
  Data_Lake_status:                       { QSR: 5, Cafe: 5, 'Dine In': 5, 'Cloud Kitchen': 5, 'Icecream Parlor': 5, Bakery: 5, 'Dine in & QSR': 5, 'Retail Store': 5, Foodcourts: 5, 'Sweet Shop': 5 },
  SMS_Service_status:                     { QSR: 5, Cafe: 5, 'Dine In': 5, 'Cloud Kitchen': 5, 'Icecream Parlor': 5, Bakery: 5, 'Dine in & QSR': 5, 'Retail Store': 5, Foodcourts: 5, 'Sweet Shop': 5 },
  Petpooja_Purchase_status:               { QSR: 5, Cafe: 5, 'Dine In': 5, 'Cloud Kitchen': 5, 'Icecream Parlor': 5, Bakery: 5, 'Dine in & QSR': 5, 'Retail Store': 5, Foodcourts: 5, 'Sweet Shop': 5 },
  Weigh_Scale_Service_status:             { QSR: 5, Cafe: 5, 'Dine In': 5, 'Cloud Kitchen': 5, 'Icecream Parlor': 5, Bakery: 5, 'Dine in & QSR': 5, 'Retail Store': 5, Foodcourts: 5, 'Sweet Shop': 10 },
  Petpooja_Payroll_status:                { QSR: 10, Cafe: 10, 'Dine In': 10, 'Cloud Kitchen': 10, 'Icecream Parlor': 10, Bakery: 10, 'Dine in & QSR': 10, 'Retail Store': 10, Foodcourts: 10, 'Sweet Shop': 10 },
  Whatsapp_CRM_status:                    { QSR: 10, Cafe: 10, 'Dine In': 10, 'Cloud Kitchen': 10, 'Icecream Parlor': 10, Bakery: 10, 'Dine in & QSR': 10, 'Retail Store': 10, Foodcourts: 10, 'Sweet Shop': 10 },
  Petpooja_Go_Rental_status:              { QSR: 5, Cafe: 5, 'Dine In': 5, 'Cloud Kitchen': 5, 'Icecream Parlor': 5, Bakery: 5, 'Dine in & QSR': 5, 'Retail Store': 5, Foodcourts: 5, 'Sweet Shop': 5 },
  Queue_Management_status:                { Cafe: 10, 'Dine In': 10, 'Dine in & QSR': 10, Foodcourts: 10 },
  Petpooja_Tasks_status:                  { QSR: 5, Cafe: 5, 'Dine In': 5, 'Cloud Kitchen': 5, 'Icecream Parlor': 5, Bakery: 5, 'Dine in & QSR': 5, 'Retail Store': 5, Foodcourts: 5, 'Sweet Shop': 5 },
  Kitchen_Display_System_status:          { QSR: 10, Cafe: 10, 'Dine In': 10, 'Cloud Kitchen': 10, 'Icecream Parlor': 10, 'Dine in & QSR': 10, Foodcourts: 10, 'Sweet Shop': 10 },
  Waiter_Calling_Device_status:           { QSR: 5, Cafe: 10, 'Dine In': 10, 'Dine in & QSR': 10 },
  Virtual_Wallet_status:                  { QSR: 5, Cafe: 5, 'Dine In': 5, 'Cloud Kitchen': 5, 'Icecream Parlor': 5, Bakery: 5, 'Dine in & QSR': 5, 'Retail Store': 5, Foodcourts: 5, 'Sweet Shop': 5 },
  Token_Management_status:                { QSR: 10, Cafe: 10, 'Cloud Kitchen': 10, 'Icecream Parlor': 10, 'Dine in & QSR': 10, Foodcourts: 10 },
  Link_based_Feedback_Service_status:     { QSR: 1, Cafe: 1, 'Dine In': 1, 'Cloud Kitchen': 1, 'Icecream Parlor': 1, Bakery: 1, 'Dine in & QSR': 1, 'Retail Store': 1, Foodcourts: 1, 'Sweet Shop': 1 },
  Swiggy_integration:                     { QSR: 10, Cafe: 10, 'Dine In': 5, 'Cloud Kitchen': 10, 'Icecream Parlor': 5, Bakery: 10, 'Dine in & QSR': 10, 'Retail Store': 5, Foodcourts: 5, 'Sweet Shop': 10 },
  Zomato_integration:                     { QSR: 10, Cafe: 10, 'Dine In': 5, 'Cloud Kitchen': 10, 'Icecream Parlor': 5, Bakery: 10, 'Dine in & QSR': 10, 'Retail Store': 5, Foodcourts: 5, 'Sweet Shop': 10 },
  Inventory_Points:                       { QSR: 10, Cafe: 10, 'Dine In': 10, 'Cloud Kitchen': 10, 'Icecream Parlor': 10, Bakery: 10, 'Dine in & QSR': 10, 'Retail Store': 10, Foodcourts: 10, 'Sweet Shop': 10 },
  AI:                                     { QSR: 10, Cafe: 10, 'Dine In': 10, 'Cloud Kitchen': 10, 'Icecream Parlor': 10, Bakery: 10, 'Dine in & QSR': 10, 'Retail Store': 10, Foodcourts: 10, 'Sweet Shop': 10 },
  Tally:                                  { QSR: 10, Cafe: 10, 'Dine In': 10, 'Cloud Kitchen': 10, 'Icecream Parlor': 10, Bakery: 10, 'Dine in & QSR': 10, 'Retail Store': 10, Foodcourts: 10, 'Sweet Shop': 10 },
}

// Feedback services — at least one must be active (gate condition)
export const FEEDBACK_SERVICES = [
  'QR_Feedback_status',
  'Feedback_Management_status',
  'Link_based_Feedback_Service_status',
]

// Services checked via active/inactive status field
const STATUS_SERVICES = [
  'Captain_Application_status', 'Intellisense_status', 'QR_Feedback_status',
  'Self_Order_Kiosk_status', 'Online_Order_Reconciliation_status', 'Inventory_Application_status',
  'Petpooja_Loyalty_status', 'Online_Ordering_Widget_status', 'My_Website_status',
  'Dynamic_Reports_status', 'Reservation_Manager_App_status', 'Petpooja_Scan_Order_status',
  'Gift_Card_status', 'Feedback_Management_status', 'Data_Lake_status', 'SMS_Service_status',
  'Petpooja_Purchase_status', 'Weigh_Scale_Service_status', 'Petpooja_Payroll_status',
  'Whatsapp_CRM_status', 'Petpooja_Go_Rental_status', 'Queue_Management_status',
  'Petpooja_Tasks_status', 'Kitchen_Display_System_status', 'Waiter_Calling_Device_status',
  'Virtual_Wallet_status', 'Token_Management_status', 'Link_based_Feedback_Service_status',
]

const SPECIAL_FIELDS = ['Swiggy_integration', 'Zomato_integration', 'Inventory_Points', 'AI', 'Tally']

function isActive(value: string | undefined | null): boolean {
  if (!value || value.trim() === '') return false
  return value.trim().toLowerCase() === 'active'
}

function isSpecialActive(field: string, record: any): boolean {
  const val = record[field]
  if (!val || val.trim() === '') return false
  if (field === 'Inventory_Points') {
    const num = parseFloat(val)
    return !isNaN(num) && num > 0
  }
  return val.trim().toLowerCase() === 'active'
}

function normalizeOutletType(raw: string): OutletType | null {
  const map: Record<string, OutletType> = {
    'qsr': 'QSR', 'cafe': 'Cafe', 'dine in': 'Dine In',
    'cloud kitchen': 'Cloud Kitchen', 'icecream parlor': 'Icecream Parlor',
    'ice cream parlor': 'Icecream Parlor', 'bakery': 'Bakery',
    'dine in & qsr': 'Dine in & QSR', 'retail store': 'Retail Store',
    'foodcourts': 'Foodcourts', 'food court': 'Foodcourts', 'sweet shop': 'Sweet Shop',
  }
  return map[raw.toLowerCase().trim()] || null
}

export interface ServiceDetail {
  name: string
  points: number
  category: 'Critical' | 'Nice to Have' | 'Feedback'
  active: boolean
}

export interface OutletMatrixScore {
  restaurant_id: string
  brandName: string
  outletType: string
  feedbackGatePassed: boolean   // true if at least one feedback service is active
  totalApplicable: number       // max possible points (feedback counts as 10 flat)
  earnedPoints: number          // actual points earned
  percentage: number
  services: ServiceDetail[]     // individual services for display (feedback shown individually)
  criticalEarned: number
  criticalTotal: number
  niceToHaveEarned: number
  niceToHaveTotal: number
  feedbackEarned: number        // 10 if any feedback active, else 0
  feedbackTotal: number         // 10 if outlet type has any applicable feedback service
}

function isPosActive(record: any): boolean {
  const expiry = record.POS_Subscription_expiry
  if (!expiry || expiry.trim() === '') return true  // no expiry date = treat as active
  const expiryDate = new Date(expiry.trim())
  if (isNaN(expiryDate.getTime())) return true      // unparseable date = treat as active
  return expiryDate >= new Date()
}

export function calculateOutletMatrix(record: any, brandName: string): OutletMatrixScore | null {
  const outletType = normalizeOutletType((record.restaurant_type || '').trim())
  if (!outletType) return null

  // If POS subscription is expired, exclude this outlet entirely
  if (!isPosActive(record)) return null

  const services: ServiceDetail[] = []
  let criticalEarned = 0, criticalTotal = 0
  let niceToHaveEarned = 0, niceToHaveTotal = 0

  // Non-feedback status services
  for (const svc of STATUS_SERVICES) {
    if (FEEDBACK_SERVICES.includes(svc)) continue  // handled separately below
    const pts = MATRIX[svc]?.[outletType]
    if (!pts) continue
    const active = isActive(record[svc])
    const category: ServiceDetail['category'] = pts === 10 ? 'Critical' : 'Nice to Have'
    services.push({ name: svc, points: pts, category, active })
    if (category === 'Critical') { criticalTotal += pts; if (active) criticalEarned += pts }
    else { niceToHaveTotal += pts; if (active) niceToHaveEarned += pts }
  }

  // Special fields
  for (const field of SPECIAL_FIELDS) {
    const pts = MATRIX[field]?.[outletType]
    if (!pts) continue
    const active = isSpecialActive(field, record)
    const category: ServiceDetail['category'] = pts === 10 ? 'Critical' : 'Nice to Have'
    services.push({ name: field, points: pts, category, active })
    if (category === 'Critical') { criticalTotal += pts; if (active) criticalEarned += pts }
    else { niceToHaveTotal += pts; if (active) niceToHaveEarned += pts }
  }

  // Feedback services — shown individually for visibility, but scored as a single 10-pt group
  const applicableFeedback = FEEDBACK_SERVICES.filter(svc => (MATRIX[svc]?.[outletType] ?? 0) > 0)
  for (const svc of applicableFeedback) {
    const active = isActive(record[svc])
    services.push({ name: svc, points: 1, category: 'Feedback', active })  // points=1 for display only
  }

  const hasFeedbackApplicable = applicableFeedback.length > 0
  const feedbackGatePassed = applicableFeedback.some(svc => isActive(record[svc]))
  const feedbackTotal = hasFeedbackApplicable ? 10 : 0
  const feedbackEarned = feedbackGatePassed ? 10 : 0

  const totalApplicable = criticalTotal + niceToHaveTotal + feedbackTotal
  const earnedPoints = criticalEarned + niceToHaveEarned + feedbackEarned

  const percentage = totalApplicable > 0
    ? Math.round((earnedPoints / totalApplicable) * 100)
    : 0

  return {
    restaurant_id: record.restaurant_id,
    brandName,
    outletType,
    feedbackGatePassed,
    totalApplicable,
    earnedPoints,
    percentage,
    services,
    criticalEarned,
    criticalTotal,
    niceToHaveEarned,
    niceToHaveTotal,
    feedbackEarned,
    feedbackTotal,
  }
}
