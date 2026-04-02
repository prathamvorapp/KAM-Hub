// CSV Record Types

export interface BrandRecord {
  restaurant_id: string
  email: string
  
  // Product fields
  Petpooja_Tasks_status: string
  Petpooja_Tasks_creation: Date | null
  Petpooja_Tasks_expiry: Date | null
  
  Petpooja_Payroll_status: string
  Petpooja_Payroll_creation: Date | null
  Petpooja_Payroll_expiry: Date | null
  
  POS_Subscription_status: string
  POS_Subscription_creation: Date | null
  POS_Subscription_expiry: Date | null
  
  // Bundle plan fields
  Petpooja_Growth_Plan_status: string
  Petpooja_Growth_Plan_creation: Date | null
  Petpooja_Growth_Plan_expiry: Date | null
  
  Petpooja_Scale_Plan_status: string
  Petpooja_Scale_Plan_creation: Date | null
  Petpooja_Scale_Plan_expiry: Date | null
  
  Petpooja_Ultimate_Plan_status: string
  Petpooja_Ultimate_Plan_creation: Date | null
  Petpooja_Ultimate_Plan_expiry: Date | null
  
  Petpooja_POS_Ultimate_Plan_status: string
  Petpooja_POS_Ultimate_Plan_creation: Date | null
  Petpooja_POS_Ultimate_Plan_expiry: Date | null
  
  Petpooja_POS_Growth_Plan_status: string
  Petpooja_POS_Growth_Plan_creation: Date | null
  Petpooja_POS_Growth_Plan_expiry: Date | null
  
  Petpooja_POS_Scale_Plan_status: string
  Petpooja_POS_Scale_Plan_creation: Date | null
  Petpooja_POS_Scale_Plan_expiry: Date | null
  
  // Service fields
  Captain_Application_status: string
  Captain_Application_creation: Date | null
  Captain_Application_expiry: Date | null
  
  Petpooja_Pay_status: string
  Petpooja_Pay_creation: Date | null
  Petpooja_Pay_expiry: Date | null
  
  Petpooja_Connect_status: string
  Petpooja_Connect_creation: Date | null
  Petpooja_Connect_expiry: Date | null
  
  Intellisense_status: string
  Intellisense_creation: Date | null
  Intellisense_expiry: Date | null
  
  QR_Feedback_status: string
  QR_Feedback_creation: Date | null
  QR_Feedback_expiry: Date | null
  
  Self_Order_Kiosk_status: string
  Self_Order_Kiosk_creation: Date | null
  Self_Order_Kiosk_expiry: Date | null
  
  Online_Order_Reconciliation_status: string
  Online_Order_Reconciliation_creation: Date | null
  Online_Order_Reconciliation_expiry: Date | null
  
  Inventory_Application_status: string
  Inventory_Application_creation: Date | null
  Inventory_Application_expiry: Date | null
  
  Petpooja_Loyalty_status: string
  Petpooja_Loyalty_creation: Date | null
  Petpooja_Loyalty_expiry: Date | null
  
  Online_Ordering_Widget_status: string
  Online_Ordering_Widget_creation: Date | null
  Online_Ordering_Widget_expiry: Date | null
  
  My_Website_status: string
  My_Website_creation: Date | null
  My_Website_expiry: Date | null
  
  Dynamic_Reports_status: string
  Dynamic_Reports_creation: Date | null
  Dynamic_Reports_expiry: Date | null
  
  Petpooja_Plus_status: string
  Petpooja_Plus_creation: Date | null
  Petpooja_Plus_expiry: Date | null
  
  Power_Integration_status: string
  Power_Integration_creation: Date | null
  Power_Integration_expiry: Date | null
  
  Reservation_Manager_App_status: string
  Reservation_Manager_App_creation: Date | null
  Reservation_Manager_App_expiry: Date | null
  
  Petpooja_Scan_Order_status: string
  Petpooja_Scan_Order_creation: Date | null
  Petpooja_Scan_Order_expiry: Date | null
  
  Gift_Card_status: string
  Gift_Card_creation: Date | null
  Gift_Card_expiry: Date | null
  
  Feedback_Management_status: string
  Feedback_Management_creation: Date | null
  Feedback_Management_expiry: Date | null
  
  Data_Lake_status: string
  Data_Lake_creation: Date | null
  Data_Lake_expiry: Date | null
  
  SMS_Service_status: string
  SMS_Service_creation: Date | null
  SMS_Service_expiry: Date | null
  
  Petpooja_Purchase_status: string
  Petpooja_Purchase_creation: Date | null
  Petpooja_Purchase_expiry: Date | null
  
  Weigh_Scale_Service_status: string
  Weigh_Scale_Service_creation: Date | null
  Weigh_Scale_Service_expiry: Date | null
  
  Whatsapp_CRM_status: string
  Whatsapp_CRM_creation: Date | null
  Whatsapp_CRM_expiry: Date | null
  
  Petpooja_Go_Rental_status: string
  Petpooja_Go_Rental_creation: Date | null
  Petpooja_Go_Rental_expiry: Date | null
  
  Queue_Management_status: string
  Queue_Management_creation: Date | null
  Queue_Management_expiry: Date | null
  
  Petpooja_PRO_status: string
  Petpooja_PRO_creation: Date | null
  Petpooja_PRO_expiry: Date | null
  
  Kitchen_Display_System_status: string
  Kitchen_Display_System_creation: Date | null
  Kitchen_Display_System_expiry: Date | null
  
  Waiter_Calling_Device_status: string
  Waiter_Calling_Device_creation: Date | null
  Waiter_Calling_Device_expiry: Date | null
  
  Virtual_Wallet_status: string
  Virtual_Wallet_creation: Date | null
  Virtual_Wallet_expiry: Date | null
  
  Petpooja_Briefcase_status: string
  Petpooja_Briefcase_creation: Date | null
  Petpooja_Briefcase_expiry: Date | null
  
  Token_Management_status: string
  Token_Management_creation: Date | null
  Token_Management_expiry: Date | null
  
  Link_based_Feedback_Service_status: string
  Link_based_Feedback_Service_creation: Date | null
  Link_based_Feedback_Service_expiry: Date | null

  // Extra outlet fields
  restaurant_type: string
  Swiggy_integration: string
  Zomato_integration: string
  Inventory_Points: string
  Tally: string
  AI: string
}

export interface KAMRecord {
  brand_uid: string
  brand_name: string
  email: string
  assign_date_1: Date | null
  kam_name_1: string
  assign_date_2: Date | null
  kam_name_2: string
  assign_date_3: Date | null
  kam_name_3: string
  assign_date_4: Date | null
  kam_name_4: string
  assign_date_5: Date | null
  kam_name_5: string
  assign_date_6: Date | null
  kam_name_6: string
}

export interface PriceRecord {
  service_product_name: string
  price: number
}

export interface BrandWithKAM extends BrandRecord {
  kam_assignment: KAMRecord | null
  outlets: OutletInfo[]
}

export interface OutletInfo {
  restaurant_id: string
  pos_status: string
  pos_creation: Date | null
  pos_expiry: Date | null
}

export interface RevenueBreakdown {
  new: number
  renewal: number
  total: number
}

export interface DepartmentMetrics {
  brandCount: number
  outletCount: number
  revenue: RevenueBreakdown
  rpu: RevenueBreakdown
  isProjected: boolean
}

export interface BrandMetrics {
  outletCount: number
  revenue: RevenueBreakdown
  rpu: RevenueBreakdown
  isProjected: boolean
}

export interface Milestone {
  date: Date
  label: string
  metrics: DepartmentMetrics | BrandMetrics
  isProjected: boolean
}

export interface TimelineData {
  milestones: Milestone[]
  startDate: Date
  endDate: Date
  realizedEndDate: Date
}

export interface RevenueRecord {
  date: Date
  product_or_service_name: string
  amount: number
  restaurant_id: string
}



export interface ChurnRecord {
  date: string // DD-MMM-YY format
  restaurant_id: string
  churn_reasons: string
  churn_remarks: string
  new_remarks: string
}

export interface PriceData {
  service_product_name: string
  price: number
}

export interface ExpenseRecord {
  date: string // DD-MM-YYYY format
  kam: string
  total: number
}
