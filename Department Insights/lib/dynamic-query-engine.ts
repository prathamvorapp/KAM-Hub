// Dynamic Query Engine - AI generates queries on the fly
import Papa from 'papaparse';

export interface QueryResult {
  success: boolean;
  data?: any;
  error?: string;
  summary?: string;
  rawQuery?: string;
}

export class DynamicQueryEngine {
  private brandData: any[] = [];
  private revenueData: any[] = [];
  private expenseData: any[] = [];
  private churnData: any[] = [];
  private kamData: any[] = [];

  async loadData() {
    try {
      const fs = await import('fs');
      const path = await import('path');
      
      const dataDir = path.join(process.cwd(), 'Data');
      
      const [brand, revenue, expense, churn, kam] = await Promise.all([
        this.loadCSVFromFile(path.join(dataDir, 'Brand DATA CSV.csv')),
        this.loadCSVFromFile(path.join(dataDir, 'Revenue.csv')),
        this.loadCSVFromFile(path.join(dataDir, 'Expense.csv')),
        this.loadCSVFromFile(path.join(dataDir, 'Churn.csv')),
        this.loadCSVFromFile(path.join(dataDir, 'KAM Data CSV.csv')),
      ]);

      this.brandData = brand;
      this.revenueData = revenue;
      this.expenseData = expense;
      this.churnData = churn;
      this.kamData = kam;
      
      console.log(`✅ Data loaded: ${this.brandData.length} brands, ${this.revenueData.length} revenue records, ${this.expenseData.length} expenses, ${this.churnData.length} churns, ${this.kamData.length} KAM assignments`);
    } catch (error) {
      throw new Error(`Failed to load data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async loadCSVFromFile(filePath: string): Promise<any[]> {
    const fs = await import('fs');
    const text = fs.readFileSync(filePath, 'utf-8');
    
    return new Promise((resolve, reject) => {
      Papa.parse(text, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => resolve(results.data),
        error: (error: Error) => reject(error),
      });
    });
  }

  // Get data schema for AI to understand
  getDataSchema(): string {
    return `
# Available Data Tables

## 1. expenseData (${this.expenseData.length} records)
Fields: Date, KAM, Total
Example: {Date: "13-08-2025", KAM: "Rahul Taak", Total: "4466.3"}

## 2. revenueData (${this.revenueData.length} records)
Fields: Date, "Product Or service Name", " Amount  " (note spaces), restaurant_id
Example: {Date: "02-04-2025", "Product Or service Name": "Android POS", " Amount  ": "7500", restaurant_id: "375011"}

## 3. brandData (${this.brandData.length} records)
Fields: restaurant_id, email, POS_Subscription_status, POS_Subscription_creation, POS_Subscription_expiry, [many product fields],
        Swiggy_integration, Zomato_integration, Inventory_Points,
        restaurant_type, "restaurant_health status", "restaurant_nature of the brand"
Example: {restaurant_id: "27647", email: "pephospitality@gmail.com", POS_Subscription_status: "active", POS_Subscription_creation: "19-08-2020",
          Swiggy_integration: "Active", Zomato_integration: "Active", Inventory_Points: "17",
          restaurant_type: "QSR", "restaurant_health status": "Green", "restaurant_nature of the brand": "Active"}
IMPORTANT: brandData does NOT have Brand Name field! Use kamData to find brand names.
IMPORTANT: Outlet creation date is in POS_Subscription_creation field (format: DD-MM-YYYY)

NEW COLUMNS - BLANK SEMANTICS:
- Inventory_Points: blank = outlet is NOT using inventory module. Numeric value (0-100) = usage score.
- restaurant_type: blank = not applicable. Values: "QSR", "Dine In", "Cafe", "Cloud Kitchen", "Bakery", "Icecream Parlor", "Dairy", "Sweet Shop", "Foodcourts", "Retail Store", "Fine Dine", "Dine in & QSR", "Sports Arena"
- "restaurant_health status": blank = not applicable. Values: "Green", "Amber", "Orange", "Red", "Dead", "Not Connected", "Closed". NOTE: normalize case when comparing (e.g. "red" = "Red").
- "restaurant_nature of the brand": blank = not applicable. Values: "Active", "Hyper Active", "Inactive", "Not Connected", "Dead", "Low activity". NOTE: normalize case when comparing.

QUERYING NEW COLUMNS:
- Filter using inventory: brandData.filter(b => b.Inventory_Points && b.Inventory_Points.trim() !== '')
- Filter by type: brandData.filter(b => b.restaurant_type?.toLowerCase().includes('qsr'))
- Filter by health: brandData.filter(b => b['restaurant_health status']?.toLowerCase() === 'green')
- Filter by nature: brandData.filter(b => b['restaurant_nature of the brand']?.toLowerCase() === 'hyper active')

## 4. kamData (${this.kamData.length} records)
Fields: "Brand UID", "Brand Name " (note trailing space), email, "KAM Name 1", "Assign Date 1", "KAM Name 2", "Assigin Date 2", etc. (up to KAM Name 6)
Example: {"Brand UID": "46", "Brand Name ": "CHOICE", email: "sheel@choicesnackbar.com", "KAM Name 1": "Harsh Gohel", "Assign Date 1": "26-09-2024", "KAM Name 2": "Mahima Sali", "Assigin Date 2": "24-04-2025"}
IMPORTANT: "Brand Name " has a trailing space in the field name!
CRITICAL KAM ASSIGNMENT LOGIC: Brands can be transferred between KAMs. The CURRENT KAM is the one in the highest numbered field (KAM Name 6, then 5, then 4, etc.) that has a value. Always check from KAM Name 6 down to KAM Name 1 to find the latest assignment.
CRITICAL: To find outlets for a brand, search kamData by brand name to get email, then find all brandData records with that email.

## 5. churnData (${this.churnData.length} records)
Fields: Date, restaurant_id, "Churn Reasons", "Churn Remarks"
Example: {Date: "29-Apr-25", restaurant_id: "112491", "Churn Reasons": "Permanently Closed"}

# Data Relationships
- kamData.email → brandData.email (link brands to KAMs)
- brandData.restaurant_id → revenueData.restaurant_id (link outlets to revenue)
- brandData.restaurant_id → churnData.restaurant_id (link outlets to churn)
- expenseData.KAM → kamData["KAM Name 1-6"] (link expenses to KAMs)

CRITICAL: When user asks about a brand by name (e.g., "la pinoz", "dominos"):
1. FIRST search kamData by brand name to get the email
2. THEN use that email to filter brandData for outlets
3. NEVER compare brandData.email directly to a brand name - emails are like "copenhagenhospitalityandretail@yahoo.com", not "la pinoz"!
`;
  }

  // Execute JavaScript code generated by AI
  executeGeneratedQuery(queryCode: string): QueryResult {
    try {
      console.log('🔧 Executing generated query:', queryCode);
      
      // Create a safe execution context
      const context = {
        expenseData: this.expenseData,
        revenueData: this.revenueData,
        brandData: this.brandData,
        kamData: this.kamData,
        churnData: this.churnData,
        result: null as any,
      };

      // Execute the query code with helper functions injected
      const func = new Function(
        'expenseData', 'revenueData', 'brandData', 'kamData', 'churnData',
        this.getHelperFunctionsCode() + '\n' + queryCode + '\nreturn result;'
      );

      const result = func(
        context.expenseData,
        context.revenueData,
        context.brandData,
        context.kamData,
        context.churnData
      );

      console.log('✅ Query executed successfully:', result);

      return {
        success: true,
        data: result,
        rawQuery: queryCode,
      };
    } catch (error) {
      console.error('❌ Query execution failed:', error);
      return {
        success: false,
        error: `Query execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        rawQuery: queryCode,
      };
    }
  }

  // Helper functions that AI can use in generated queries
  getHelperFunctions(): string {
    return `
// Helper functions available in queries:

// Parse date from various formats
function parseDate(dateStr) {
  if (!dateStr) return null;
  try {
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) return date;
    
    const parts = dateStr.split(/[-/]/);
    if (parts.length === 3) {
      const day = parseInt(parts[0]);
      const month = parseInt(parts[1]) - 1;
      const year = parseInt(parts[2]);
      const fullYear = year < 100 ? 2000 + year : year;
      return new Date(fullYear, month, day);
    }
    return null;
  } catch {
    return null;
  }
}

// Parse month name to number (0-11)
function parseMonth(month) {
  const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
  const idx = months.findIndex(m => month.toLowerCase().includes(m));
  return idx >= 0 ? idx : new Date().getMonth();
}

// Sum array of numbers
function sum(arr) {
  return arr.reduce((total, val) => total + parseFloat(val || 0), 0);
}

// Group by key
function groupBy(arr, keyFn) {
  return arr.reduce((groups, item) => {
    const key = keyFn(item);
    if (!groups[key]) groups[key] = [];
    groups[key].push(item);
    return groups;
  }, {});
}

// Find max by value
function maxBy(arr, valueFn) {
  if (!arr || arr.length === 0) return null;
  return arr.reduce((max, item) => {
    const val = valueFn(item);
    return val > valueFn(max) ? item : max;
  }, arr[0]);
}
`;
  }

  // Get just the helper function code for execution (without comments)
  private getHelperFunctionsCode(): string {
    return `
function parseDate(dateStr) {
  if (!dateStr) return null;
  try {
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) return date;
    const parts = dateStr.split(/[-/]/);
    if (parts.length === 3) {
      const day = parseInt(parts[0]);
      const month = parseInt(parts[1]) - 1;
      const year = parseInt(parts[2]);
      const fullYear = year < 100 ? 2000 + year : year;
      return new Date(fullYear, month, day);
    }
    return null;
  } catch {
    return null;
  }
}

function parseMonth(month) {
  const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
  const idx = months.findIndex(m => month.toLowerCase().includes(m));
  return idx >= 0 ? idx : new Date().getMonth();
}

function sum(arr) {
  return arr.reduce((total, val) => total + parseFloat(val || 0), 0);
}

function groupBy(arr, keyFn) {
  return arr.reduce((groups, item) => {
    const key = keyFn(item);
    if (!groups[key]) groups[key] = [];
    groups[key].push(item);
    return groups;
  }, {});
}

function maxBy(arr, valueFn) {
  if (!arr || arr.length === 0) return null;
  return arr.reduce((max, item) => {
    const val = valueFn(item);
    return val > valueFn(max) ? item : max;
  }, arr[0]);
}
`;
  }
}
