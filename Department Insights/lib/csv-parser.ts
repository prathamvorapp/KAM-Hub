import Papa from 'papaparse'
import fs from 'fs'
import path from 'path'
import { BrandRecord, KAMRecord, PriceRecord, BrandWithKAM, OutletInfo } from './types'

export class CSVParseError extends Error {
  constructor(
    message: string,
    public fileName: string,
    public originalError?: Error
  ) {
    super(message)
    this.name = 'CSVParseError'
  }
}

export class CSVParser {
  private dataDir: string
  public warnings: string[] = []

  constructor(dataDir: string = 'Data') {
    this.dataDir = dataDir
    this.warnings = []
  }

  private parseDate(dateStr: string | undefined | null, recordId?: string, fieldName?: string): Date | null {
    if (!dateStr || dateStr.trim() === '') {
      return null
    }
    
    // Try DD-MM-YYYY format FIRST (our CSV files use this format)
    const ddmmyyyyMatch = dateStr.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/)
    if (ddmmyyyyMatch) {
      const day = parseInt(ddmmyyyyMatch[1], 10)
      const month = parseInt(ddmmyyyyMatch[2], 10) - 1 // Month is 0-indexed
      const year = parseInt(ddmmyyyyMatch[3], 10)
      const date = new Date(year, month, day)
      
      // Validate the parsed date
      if (!isNaN(date.getTime())) {
        return date
      }
    }
    
    // Fallback to standard Date parsing for other formats
    const date = new Date(dateStr)
    
    // Final validation
    if (isNaN(date.getTime())) {
      if (recordId && fieldName) {
        this.warnings.push(`Invalid date format in ${fieldName} for record ${recordId}: "${dateStr}"`)
      }
      return null
    }
    
    return date
  }

  async parseBrandData(): Promise<BrandRecord[]> {
    const fileName = 'Brand DATA CSV.csv'
    const filePath = path.join(this.dataDir, fileName)
    
    try {
      if (!fs.existsSync(filePath)) {
        throw new CSVParseError(
          `File not found: ${fileName}. Please ensure the file exists in the ${this.dataDir} folder.`,
          fileName
        )
      }
      
      const fileContent = fs.readFileSync(filePath, 'utf-8')
      
      const result = Papa.parse<any>(fileContent, {
        header: true,
        skipEmptyLines: true,
      })
      
      if (result.errors && result.errors.length > 0) {
        console.warn(`Parsing warnings for ${fileName}:`, result.errors)
      }
      
      if (!result.data || result.data.length === 0) {
        throw new CSVParseError(
          `File ${fileName} is empty or malformed. No valid data found.`,
          fileName
        )
      }
      
      return result.data.map((row: any) => ({
      restaurant_id: row.restaurant_id || '',
      email: row.email || '',
      
      // Products
      Petpooja_Tasks_status: row.Petpooja_Tasks_status || '',
      Petpooja_Tasks_creation: this.parseDate(row.Petpooja_Tasks_creation),
      Petpooja_Tasks_expiry: this.parseDate(row.Petpooja_Tasks_expiry),
      
      Petpooja_Payroll_status: row.Petpooja_Payroll_status || '',
      Petpooja_Payroll_creation: this.parseDate(row.Petpooja_Payroll_creation),
      Petpooja_Payroll_expiry: this.parseDate(row.Petpooja_Payroll_expiry),
      
      POS_Subscription_status: row.POS_Subscription_status || '',
      POS_Subscription_creation: this.parseDate(row.POS_Subscription_creation),
      POS_Subscription_expiry: this.parseDate(row.POS_Subscription_expiry),
      
      // Bundle plans
      Petpooja_Growth_Plan_status: row.Petpooja_Growth_Plan_status || '',
      Petpooja_Growth_Plan_creation: this.parseDate(row.Petpooja_Growth_Plan_creation),
      Petpooja_Growth_Plan_expiry: this.parseDate(row.Petpooja_Growth_Plan_expiry),
      
      Petpooja_Scale_Plan_status: row.Petpooja_Scale_Plan_status || '',
      Petpooja_Scale_Plan_creation: this.parseDate(row.Petpooja_Scale_Plan_creation),
      Petpooja_Scale_Plan_expiry: this.parseDate(row.Petpooja_Scale_Plan_expiry),
      
      Petpooja_Ultimate_Plan_status: row.Petpooja_Ultimate_Plan_status || '',
      Petpooja_Ultimate_Plan_creation: this.parseDate(row.Petpooja_Ultimate_Plan_creation),
      Petpooja_Ultimate_Plan_expiry: this.parseDate(row.Petpooja_Ultimate_Plan_expiry),
      
      Petpooja_POS_Ultimate_Plan_status: row.Petpooja_POS_Ultimate_Plan_status || '',
      Petpooja_POS_Ultimate_Plan_creation: this.parseDate(row.Petpooja_POS_Ultimate_Plan_creation),
      Petpooja_POS_Ultimate_Plan_expiry: this.parseDate(row.Petpooja_POS_Ultimate_Plan_expiry),
      
      Petpooja_POS_Growth_Plan_status: row.Petpooja_POS_Growth_Plan_status || '',
      Petpooja_POS_Growth_Plan_creation: this.parseDate(row.Petpooja_POS_Growth_Plan_creation),
      Petpooja_POS_Growth_Plan_expiry: this.parseDate(row.Petpooja_POS_Growth_Plan_expiry),
      
      Petpooja_POS_Scale_Plan_status: row.Petpooja_POS_Scale_Plan_status || '',
      Petpooja_POS_Scale_Plan_creation: this.parseDate(row.Petpooja_POS_Scale_Plan_creation),
      Petpooja_POS_Scale_Plan_expiry: this.parseDate(row.Petpooja_POS_Scale_Plan_expiry),
      
      // Services
      Captain_Application_status: row.Captain_Application_status || '',
      Captain_Application_creation: this.parseDate(row.Captain_Application_creation),
      Captain_Application_expiry: this.parseDate(row.Captain_Application_expiry),
      
      Petpooja_Pay_status: row.Petpooja_Pay_status || '',
      Petpooja_Pay_creation: this.parseDate(row.Petpooja_Pay_creation),
      Petpooja_Pay_expiry: this.parseDate(row.Petpooja_Pay_expiry),
      
      Petpooja_Connect_status: row.Petpooja_Connect_status || '',
      Petpooja_Connect_creation: this.parseDate(row.Petpooja_Connect_creation),
      Petpooja_Connect_expiry: this.parseDate(row.Petpooja_Connect_expiry),
      
      Intellisense_status: row.Intellisense_status || '',
      Intellisense_creation: this.parseDate(row.Intellisense_creation),
      Intellisense_expiry: this.parseDate(row.Intellisense_expiry),
      
      QR_Feedback_status: row.QR_Feedback_status || '',
      QR_Feedback_creation: this.parseDate(row.QR_Feedback_creation),
      QR_Feedback_expiry: this.parseDate(row.QR_Feedback_expiry),
      
      Self_Order_Kiosk_status: row.Self_Order_Kiosk_status || '',
      Self_Order_Kiosk_creation: this.parseDate(row.Self_Order_Kiosk_creation),
      Self_Order_Kiosk_expiry: this.parseDate(row.Self_Order_Kiosk_expiry),
      
      Online_Order_Reconciliation_status: row.Online_Order_Reconciliation_status || '',
      Online_Order_Reconciliation_creation: this.parseDate(row.Online_Order_Reconciliation_creation),
      Online_Order_Reconciliation_expiry: this.parseDate(row.Online_Order_Reconciliation_expiry),
      
      Inventory_Application_status: row.Inventory_Application_status || '',
      Inventory_Application_creation: this.parseDate(row.Inventory_Application_creation),
      Inventory_Application_expiry: this.parseDate(row.Inventory_Application_expiry),
      
      Petpooja_Loyalty_status: row.Petpooja_Loyalty_status || '',
      Petpooja_Loyalty_creation: this.parseDate(row.Petpooja_Loyalty_creation),
      Petpooja_Loyalty_expiry: this.parseDate(row.Petpooja_Loyalty_expiry),
      
      Online_Ordering_Widget_status: row.Online_Ordering_Widget_status || '',
      Online_Ordering_Widget_creation: this.parseDate(row.Online_Ordering_Widget_creation),
      Online_Ordering_Widget_expiry: this.parseDate(row.Online_Ordering_Widget_expiry),
      
      My_Website_status: row.My_Website_status || '',
      My_Website_creation: this.parseDate(row.My_Website_creation),
      My_Website_expiry: this.parseDate(row.My_Website_expiry),
      
      Dynamic_Reports_status: row.Dynamic_Reports_status || '',
      Dynamic_Reports_creation: this.parseDate(row.Dynamic_Reports_creation),
      Dynamic_Reports_expiry: this.parseDate(row.Dynamic_Reports_expiry),
      
      Petpooja_Plus_status: row.Petpooja_Plus_status || '',
      Petpooja_Plus_creation: this.parseDate(row.Petpooja_Plus_creation),
      Petpooja_Plus_expiry: this.parseDate(row.Petpooja_Plus_expiry),
      
      Power_Integration_status: row.Power_Integration_status || '',
      Power_Integration_creation: this.parseDate(row.Power_Integration_creation),
      Power_Integration_expiry: this.parseDate(row.Power_Integration_expiry),
      
      Reservation_Manager_App_status: row.Reservation_Manager_App_status || '',
      Reservation_Manager_App_creation: this.parseDate(row.Reservation_Manager_App_creation),
      Reservation_Manager_App_expiry: this.parseDate(row.Reservation_Manager_App_expiry),
      
      Petpooja_Scan_Order_status: row.Petpooja_Scan_Order_status || '',
      Petpooja_Scan_Order_creation: this.parseDate(row.Petpooja_Scan_Order_creation),
      Petpooja_Scan_Order_expiry: this.parseDate(row.Petpooja_Scan_Order_expiry),
      
      Gift_Card_status: row.Gift_Card_status || '',
      Gift_Card_creation: this.parseDate(row.Gift_Card_creation),
      Gift_Card_expiry: this.parseDate(row.Gift_Card_expiry),
      
      Feedback_Management_status: row.Feedback_Management_status || '',
      Feedback_Management_creation: this.parseDate(row.Feedback_Management_creation),
      Feedback_Management_expiry: this.parseDate(row.Feedback_Management_expiry),
      
      Data_Lake_status: row.Data_Lake_status || '',
      Data_Lake_creation: this.parseDate(row.Data_Lake_creation),
      Data_Lake_expiry: this.parseDate(row.Data_Lake_expiry),
      
      SMS_Service_status: row.SMS_Service_status || '',
      SMS_Service_creation: this.parseDate(row.SMS_Service_creation),
      SMS_Service_expiry: this.parseDate(row.SMS_Service_expiry),
      
      Petpooja_Purchase_status: row.Petpooja_Purchase_status || '',
      Petpooja_Purchase_creation: this.parseDate(row.Petpooja_Purchase_creation),
      Petpooja_Purchase_expiry: this.parseDate(row.Petpooja_Purchase_expiry),
      
      Weigh_Scale_Service_status: row.Weigh_Scale_Service_status || '',
      Weigh_Scale_Service_creation: this.parseDate(row.Weigh_Scale_Service_creation),
      Weigh_Scale_Service_expiry: this.parseDate(row.Weigh_Scale_Service_expiry),
      
      Whatsapp_CRM_status: row.Whatsapp_CRM_status || '',
      Whatsapp_CRM_creation: this.parseDate(row.Whatsapp_CRM_creation),
      Whatsapp_CRM_expiry: this.parseDate(row.Whatsapp_CRM_expiry),
      
      Petpooja_Go_Rental_status: row.Petpooja_Go_Rental_status || '',
      Petpooja_Go_Rental_creation: this.parseDate(row.Petpooja_Go_Rental_creation),
      Petpooja_Go_Rental_expiry: this.parseDate(row.Petpooja_Go_Rental_expiry),
      
      Queue_Management_status: row.Queue_Management_status || '',
      Queue_Management_creation: this.parseDate(row.Queue_Management_creation),
      Queue_Management_expiry: this.parseDate(row.Queue_Management_expiry),
      
      Petpooja_PRO_status: row.Petpooja_PRO_status || '',
      Petpooja_PRO_creation: this.parseDate(row.Petpooja_PRO_creation),
      Petpooja_PRO_expiry: this.parseDate(row.Petpooja_PRO_expiry),
      
      Kitchen_Display_System_status: row.Kitchen_Display_System_status || '',
      Kitchen_Display_System_creation: this.parseDate(row.Kitchen_Display_System_creation),
      Kitchen_Display_System_expiry: this.parseDate(row.Kitchen_Display_System_expiry),
      
      Waiter_Calling_Device_status: row.Waiter_Calling_Device_status || '',
      Waiter_Calling_Device_creation: this.parseDate(row.Waiter_Calling_Device_creation),
      Waiter_Calling_Device_expiry: this.parseDate(row.Waiter_Calling_Device_expiry),
      
      Virtual_Wallet_status: row.Virtual_Wallet_status || '',
      Virtual_Wallet_creation: this.parseDate(row.Virtual_Wallet_creation),
      Virtual_Wallet_expiry: this.parseDate(row.Virtual_Wallet_expiry),
      
      Petpooja_Briefcase_status: row.Petpooja_Briefcase_status || '',
      Petpooja_Briefcase_creation: this.parseDate(row.Petpooja_Briefcase_creation),
      Petpooja_Briefcase_expiry: this.parseDate(row.Petpooja_Briefcase_expiry),
      
      Token_Management_status: row.Token_Management_status || '',
      Token_Management_creation: this.parseDate(row.Token_Management_creation),
      Token_Management_expiry: this.parseDate(row.Token_Management_expiry),
      
      Link_based_Feedback_Service_status: row.Link_based_Feedback_Service_status || '',
      Link_based_Feedback_Service_creation: this.parseDate(row.Link_based_Feedback_Service_creation),
      Link_based_Feedback_Service_expiry: this.parseDate(row.Link_based_Feedback_Service_expiry),

      // Extra outlet fields
      restaurant_type: row.restaurant_type?.trim() || '',
      Swiggy_integration: row.Swiggy_integration?.trim() || '',
      Zomato_integration: row.Zomato_integration?.trim() || '',
      Inventory_Points: row.Inventory_Points?.trim() || '',
      Tally: row.Tally?.trim() || '',
      AI: row.AI?.trim() || '',
    }))
    } catch (error) {
      if (error instanceof CSVParseError) {
        throw error
      }
      throw new CSVParseError(
        `Error parsing ${fileName}: ${error instanceof Error ? error.message : String(error)}`,
        fileName,
        error instanceof Error ? error : undefined
      )
    }
  }

  async parseKAMData(): Promise<KAMRecord[]> {
    const fileName = 'KAM Data CSV.csv'
    const filePath = path.join(this.dataDir, fileName)
    
    try {
      if (!fs.existsSync(filePath)) {
        throw new CSVParseError(
          `File not found: ${fileName}. Please ensure the file exists in the ${this.dataDir} folder.`,
          fileName
        )
      }
      
      const fileContent = fs.readFileSync(filePath, 'utf-8')
      
      const result = Papa.parse<any>(fileContent, {
        header: true,
        skipEmptyLines: true,
      })
      
      if (result.errors && result.errors.length > 0) {
        console.warn(`Parsing warnings for ${fileName}:`, result.errors)
      }
      
      if (!result.data || result.data.length === 0) {
        throw new CSVParseError(
          `File ${fileName} is empty or malformed. No valid data found.`,
          fileName
        )
      }
      
      return result.data.map((row: any) => ({
      brand_uid: row['Brand UID'] || '',
      brand_name: row['Brand Name '] || row['Brand Name'] || '',
      email: row.email || '',
      kam_name_1: row['KAM Name 1'] || '',
      assign_date_1: this.parseDate(row['Assign Date 1'], row['Brand UID'], 'Assign Date 1'),
      kam_name_2: row['KAM Name 2 '] || row['KAM Name 2'] || '',
      assign_date_2: this.parseDate(row['Assigin Date 2'], row['Brand UID'], 'Assigin Date 2'),
      kam_name_3: row['KAM Name 3'] || '',
      assign_date_3: this.parseDate(row['Assigin Date 3'], row['Brand UID'], 'Assigin Date 3'),
      kam_name_4: row['KAM Name 4'] || '',
      assign_date_4: this.parseDate(row['Assigin Date 4'], row['Brand UID'], 'Assigin Date 4'),
      kam_name_5: row['KAM Name 5'] || '',
      assign_date_5: this.parseDate(row['Assigin Date 5'], row['Brand UID'], 'Assigin Date 5'),
      kam_name_6: row['KAM Name 6'] || '',
      assign_date_6: this.parseDate(row['Assigin Date 6'], row['Brand UID'], 'Assigin Date 6'),
    }))
    } catch (error) {
      if (error instanceof CSVParseError) {
        throw error
      }
      throw new CSVParseError(
        `Error parsing ${fileName}: ${error instanceof Error ? error.message : String(error)}`,
        fileName,
        error instanceof Error ? error : undefined
      )
    }
  }

  async parsePriceData(): Promise<PriceRecord[]> {
    const fileName = 'Price Data CSV.csv'
    const filePath = path.join(this.dataDir, fileName)
    
    try {
      if (!fs.existsSync(filePath)) {
        throw new CSVParseError(
          `File not found: ${fileName}. Please ensure the file exists in the ${this.dataDir} folder.`,
          fileName
        )
      }
      
      const fileContent = fs.readFileSync(filePath, 'utf-8')
      
      const result = Papa.parse<any>(fileContent, {
        header: true,
        skipEmptyLines: true,
      })
      
      if (result.errors && result.errors.length > 0) {
        console.warn(`Parsing warnings for ${fileName}:`, result.errors)
      }
      
      if (!result.data || result.data.length === 0) {
        throw new CSVParseError(
          `File ${fileName} is empty or malformed. No valid data found.`,
          fileName
        )
      }
      
      return result.data.map((row: any) => ({
      service_product_name: row['Service / Product Name'] || '',
      price: parseFloat(row.Price) || 0,
    }))
    } catch (error) {
      if (error instanceof CSVParseError) {
        throw error
      }
      throw new CSVParseError(
        `Error parsing ${fileName}: ${error instanceof Error ? error.message : String(error)}`,
        fileName,
        error instanceof Error ? error : undefined
      )
    }
  }

  async parseRevenueData(): Promise<import('./types').RevenueRecord[]> {
    const fileName = 'Revenue.csv'
    const filePath = path.join(this.dataDir, fileName)
    
    try {
      if (!fs.existsSync(filePath)) {
        // Revenue data is optional, return empty array if not found
        console.warn(`Revenue file not found: ${fileName}. Revenue calculations will use projected data only.`)
        return []
      }
      
      const fileContent = fs.readFileSync(filePath, 'utf-8')
      
      const result = Papa.parse<any>(fileContent, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (header: string) => {
          // Trim whitespace from headers to handle " Amount  " -> "Amount"
          return header.trim()
        }
      })
      
      if (result.errors && result.errors.length > 0) {
        console.warn(`Parsing warnings for ${fileName}:`, result.errors)
      }
      
      if (!result.data || result.data.length === 0) {
        console.warn(`File ${fileName} is empty. Revenue calculations will use projected data only.`)
        return []
      }
      
      return result.data
        .map((row: any, index: number) => {
          // Parse the date (DD-MM-YYYY format)
          const date = this.parseDate(row.Date)
          if (!date) {
            return null
          }
          
          // Debug: Log first row to see actual column names
          if (index === 0) {
            console.log('Revenue CSV first row keys:', Object.keys(row))
            console.log('Revenue CSV first row:', row)
          }
          
          // Parse amount - now the header is trimmed to "Amount"
          const amountStr = row['Amount'] || row['amount'] || '0'
          const amount = parseFloat(String(amountStr).replace(/,/g, '').trim()) || 0
          
          // Debug: Log if amount is 0 for first few rows
          if (index < 3) {
            console.log(`Row ${index} amount parsing:`, {
              raw: amountStr,
              parsed: amount,
              productName: row['Product Or service Name']
            })
          }
          
          return {
            date,
            product_or_service_name: row['Product Or service Name'] || '',
            amount,
            restaurant_id: String(row.restaurant_id || '').trim()
          }
        })
        .filter((record): record is import('./types').RevenueRecord => record !== null)
    } catch (error) {
      console.error(`Error parsing ${fileName}:`, error)
      // Don't throw error, just return empty array
      return []
    }
  }

  async parseChurnData(): Promise<import('./types').ChurnRecord[]> {
    const fileName = 'Churn.csv'
    const filePath = path.join(this.dataDir, fileName)
    
    try {
      if (!fs.existsSync(filePath)) {
        console.warn(`Churn file not found: ${fileName}. Churn analysis will not be available.`)
        return []
      }
      
      const fileContent = fs.readFileSync(filePath, 'utf-8')
      
      const result = Papa.parse<any>(fileContent, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (header: string) => header.trim()
      })
      
      if (result.errors && result.errors.length > 0) {
        console.warn(`Parsing warnings for ${fileName}:`, result.errors)
      }
      
      if (!result.data || result.data.length === 0) {
        console.warn(`File ${fileName} is empty. Churn analysis will not be available.`)
        return []
      }
      
      return result.data
        .map((row: any) => {
          // Skip rows without date or restaurant_id
          if (!row.Date || !row.restaurant_id) {
            return null
          }
          
          return {
            date: String(row.Date || '').trim(),
            restaurant_id: String(row.restaurant_id || '').trim(),
            churn_reasons: String(row['Churn Reasons'] || '').trim(),
            churn_remarks: String(row['Churn Remarks'] || '').trim(),
            new_remarks: String(row['New Remarks'] || '').trim()
          }
        })
        .filter((record): record is import('./types').ChurnRecord => record !== null)
    } catch (error) {
      console.error(`Error parsing ${fileName}:`, error)
      return []
    }
  }

  async parseExpenseData(): Promise<import('./types').ExpenseRecord[]> {
    const fileName = 'Expense.csv'
    const filePath = path.join(this.dataDir, fileName)
    
    try {
      if (!fs.existsSync(filePath)) {
        console.warn(`Expense file not found: ${fileName}. Expense analysis will not be available.`)
        return []
      }
      
      const fileContent = fs.readFileSync(filePath, 'utf-8')
      
      const result = Papa.parse<any>(fileContent, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (header: string) => header.trim()
      })
      
      if (result.errors && result.errors.length > 0) {
        console.warn(`Parsing warnings for ${fileName}:`, result.errors)
      }
      
      if (!result.data || result.data.length === 0) {
        console.warn(`File ${fileName} is empty. Expense analysis will not be available.`)
        return []
      }
      
      return result.data
        .map((row: any) => {
          // Skip rows without required fields
          if (!row.Date || !row.KAM || !row.Total) {
            return null
          }
          
          const total = parseFloat(String(row.Total || '0').replace(/,/g, ''))
          
          if (isNaN(total)) {
            return null
          }
          
          return {
            date: String(row.Date || '').trim(),
            kam: String(row.KAM || '').trim(),
            total: total
          }
        })
        .filter((record): record is import('./types').ExpenseRecord => record !== null)
    } catch (error) {
      console.error(`Error parsing ${fileName}:`, error)
      return []
    }
  }

  crossReference(brands: BrandRecord[], kams: KAMRecord[]): BrandWithKAM[] {
    const kamByEmail = new Map<string, KAMRecord>()
    const kamByUID = new Map<string, KAMRecord>()
    
    kams.forEach(kam => {
      if (kam.email) {
        kamByEmail.set(kam.email.toLowerCase(), kam)
      }
      if (kam.brand_uid) {
        kamByUID.set(kam.brand_uid, kam)
      }
    })
    
    // Group brands by email to consolidate outlets
    const brandsByEmail = new Map<string, BrandRecord[]>()
    
    brands.forEach(brand => {
      const email = brand.email.toLowerCase()
      if (!brandsByEmail.has(email)) {
        brandsByEmail.set(email, [])
      }
      brandsByEmail.get(email)!.push(brand)
    })
    
    // Create BrandWithKAM entries with consolidated outlets
    const result: BrandWithKAM[] = []
    
    brandsByEmail.forEach((brandRecords, email) => {
      // Use the first brand record as the base
      const baseBrand = { ...brandRecords[0] }
      
      // Merge subscription data from all records
      // For each subscription field, use the first non-empty value found
      const subscriptionFields = [
        'Petpooja_Tasks', 'Petpooja_Payroll',
        'Captain_Application', 'Petpooja_Pay', 'Petpooja_Connect',
        'Intellisense', 'QR_Feedback', 'Self_Order_Kiosk',
        'Online_Order_Reconciliation', 'Inventory_Application',
        'Petpooja_Loyalty', 'Online_Ordering_Widget', 'My_Website',
        'Dynamic_Reports', 'Petpooja_Plus', 'Power_Integration',
        'Reservation_Manager_App', 'Petpooja_Scan_Order', 'Gift_Card',
        'Feedback_Management', 'Data_Lake', 'SMS_Service',
        'Petpooja_Purchase', 'Weigh_Scale_Service', 'Whatsapp_CRM',
        'Petpooja_Go_Rental', 'Queue_Management', 'Petpooja_PRO',
        'Kitchen_Display_System', 'Waiter_Calling_Device', 'Virtual_Wallet',
        'Petpooja_Briefcase', 'Token_Management', 'Link_based_Feedback_Service',
        'Petpooja_Growth_Plan', 'Petpooja_Scale_Plan', 'Petpooja_Ultimate_Plan',
        'Petpooja_POS_Ultimate_Plan', 'Petpooja_POS_Growth_Plan', 'Petpooja_POS_Scale_Plan'
      ]
      
      for (const field of subscriptionFields) {
        const statusField = `${field}_status`
        const creationField = `${field}_creation`
        const expiryField = `${field}_expiry`
        
        // Find the first record with active status for this subscription
        for (const record of brandRecords) {
          const recordAny = record as any
          const status = recordAny[statusField]
          if (status && typeof status === 'string' && status.toLowerCase() === 'active') {
            const baseAny = baseBrand as any
            baseAny[statusField] = recordAny[statusField]
            baseAny[creationField] = recordAny[creationField]
            baseAny[expiryField] = recordAny[expiryField]
            break // Use the first active subscription found
          }
        }
      }
      
      // Find KAM assignment by email only
      // Note: We don't use UID fallback because it causes incorrect matches
      // when the same UID is reused for different brands with different emails
      const kamAssignment = kamByEmail.get(email) || null
      
      // Create outlets array from all brand records with this email
      const outlets: OutletInfo[] = brandRecords.map(brand => ({
        restaurant_id: brand.restaurant_id,
        pos_status: brand.POS_Subscription_status,
        pos_creation: brand.POS_Subscription_creation,
        pos_expiry: brand.POS_Subscription_expiry,
      }))
      
      result.push({
        ...baseBrand,
        kam_assignment: kamAssignment,
        outlets,
      })
    })
    
    // Add brands from KAM data that don't exist in Brand data
    // These are brands with KAM assignments but no outlet records yet
    kamByEmail.forEach((kamRecord, email) => {
      if (!brandsByEmail.has(email)) {
        // Create a minimal brand record for this KAM-assigned brand
        result.push({
          restaurant_id: '',
          email: kamRecord.email,
          kam_assignment: kamRecord,
          outlets: [],
          
          // All subscription fields as empty/inactive
          Petpooja_Tasks_status: '',
          Petpooja_Tasks_creation: null,
          Petpooja_Tasks_expiry: null,
          Petpooja_Payroll_status: '',
          Petpooja_Payroll_creation: null,
          Petpooja_Payroll_expiry: null,
          POS_Subscription_status: '',
          POS_Subscription_creation: null,
          POS_Subscription_expiry: null,
          Petpooja_Growth_Plan_status: '',
          Petpooja_Growth_Plan_creation: null,
          Petpooja_Growth_Plan_expiry: null,
          Petpooja_Scale_Plan_status: '',
          Petpooja_Scale_Plan_creation: null,
          Petpooja_Scale_Plan_expiry: null,
          Petpooja_Ultimate_Plan_status: '',
          Petpooja_Ultimate_Plan_creation: null,
          Petpooja_Ultimate_Plan_expiry: null,
          Petpooja_POS_Ultimate_Plan_status: '',
          Petpooja_POS_Ultimate_Plan_creation: null,
          Petpooja_POS_Ultimate_Plan_expiry: null,
          Petpooja_POS_Growth_Plan_status: '',
          Petpooja_POS_Growth_Plan_creation: null,
          Petpooja_POS_Growth_Plan_expiry: null,
          Petpooja_POS_Scale_Plan_status: '',
          Petpooja_POS_Scale_Plan_creation: null,
          Petpooja_POS_Scale_Plan_expiry: null,
          Captain_Application_status: '',
          Captain_Application_creation: null,
          Captain_Application_expiry: null,
          Petpooja_Pay_status: '',
          Petpooja_Pay_creation: null,
          Petpooja_Pay_expiry: null,
          Petpooja_Connect_status: '',
          Petpooja_Connect_creation: null,
          Petpooja_Connect_expiry: null,
          Intellisense_status: '',
          Intellisense_creation: null,
          Intellisense_expiry: null,
          QR_Feedback_status: '',
          QR_Feedback_creation: null,
          QR_Feedback_expiry: null,
          Self_Order_Kiosk_status: '',
          Self_Order_Kiosk_creation: null,
          Self_Order_Kiosk_expiry: null,
          Online_Order_Reconciliation_status: '',
          Online_Order_Reconciliation_creation: null,
          Online_Order_Reconciliation_expiry: null,
          Inventory_Application_status: '',
          Inventory_Application_creation: null,
          Inventory_Application_expiry: null,
          Petpooja_Loyalty_status: '',
          Petpooja_Loyalty_creation: null,
          Petpooja_Loyalty_expiry: null,
          Online_Ordering_Widget_status: '',
          Online_Ordering_Widget_creation: null,
          Online_Ordering_Widget_expiry: null,
          My_Website_status: '',
          My_Website_creation: null,
          My_Website_expiry: null,
          Dynamic_Reports_status: '',
          Dynamic_Reports_creation: null,
          Dynamic_Reports_expiry: null,
          Petpooja_Plus_status: '',
          Petpooja_Plus_creation: null,
          Petpooja_Plus_expiry: null,
          Power_Integration_status: '',
          Power_Integration_creation: null,
          Power_Integration_expiry: null,
          Reservation_Manager_App_status: '',
          Reservation_Manager_App_creation: null,
          Reservation_Manager_App_expiry: null,
          Petpooja_Scan_Order_status: '',
          Petpooja_Scan_Order_creation: null,
          Petpooja_Scan_Order_expiry: null,
          Gift_Card_status: '',
          Gift_Card_creation: null,
          Gift_Card_expiry: null,
          Feedback_Management_status: '',
          Feedback_Management_creation: null,
          Feedback_Management_expiry: null,
          Data_Lake_status: '',
          Data_Lake_creation: null,
          Data_Lake_expiry: null,
          SMS_Service_status: '',
          SMS_Service_creation: null,
          SMS_Service_expiry: null,
          Petpooja_Purchase_status: '',
          Petpooja_Purchase_creation: null,
          Petpooja_Purchase_expiry: null,
          Weigh_Scale_Service_status: '',
          Weigh_Scale_Service_creation: null,
          Weigh_Scale_Service_expiry: null,
          Whatsapp_CRM_status: '',
          Whatsapp_CRM_creation: null,
          Whatsapp_CRM_expiry: null,
          Petpooja_Go_Rental_status: '',
          Petpooja_Go_Rental_creation: null,
          Petpooja_Go_Rental_expiry: null,
          Queue_Management_status: '',
          Queue_Management_creation: null,
          Queue_Management_expiry: null,
          Petpooja_PRO_status: '',
          Petpooja_PRO_creation: null,
          Petpooja_PRO_expiry: null,
          Kitchen_Display_System_status: '',
          Kitchen_Display_System_creation: null,
          Kitchen_Display_System_expiry: null,
          Waiter_Calling_Device_status: '',
          Waiter_Calling_Device_creation: null,
          Waiter_Calling_Device_expiry: null,
          Virtual_Wallet_status: '',
          Virtual_Wallet_creation: null,
          Virtual_Wallet_expiry: null,
          Petpooja_Briefcase_status: '',
          Petpooja_Briefcase_creation: null,
          Petpooja_Briefcase_expiry: null,
          Token_Management_status: '',
          Token_Management_creation: null,
          Token_Management_expiry: null,
          Link_based_Feedback_Service_status: '',
          Link_based_Feedback_Service_creation: null,
          Link_based_Feedback_Service_expiry: null,

          restaurant_type: '',
          Swiggy_integration: '',
          Zomato_integration: '',
          Inventory_Points: '',
          Tally: '',
          AI: '',
        })
      }
    })
    
    return result
  }
}
