// Data query engine for analytics
import Papa from 'papaparse';

export interface QueryResult {
  success: boolean;
  data?: any;
  error?: string;
  summary?: string;
}

export class DataQueryEngine {
  private brandData: any[] = [];
  private revenueData: any[] = [];
  private expenseData: any[] = [];
  private churnData: any[] = [];
  private kamData: any[] = [];

  async loadData() {
    try {
      // Load data from file system (server-side)
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

  // Query methods
  getExpenseByKAM(kamName: string): QueryResult {
    try {
      const expenses = this.expenseData.filter(
        (row) => row.KAM && row.KAM.toLowerCase().includes(kamName.toLowerCase())
      );
      
      if (expenses.length === 0) {
        // Try to find similar names (first word match)
        const searchWords = kamName.toLowerCase().split(' ');
        const firstWord = searchWords[0];
        
        const similarKAMs = Array.from(new Set(
          this.expenseData
            .filter(row => row.KAM && row.KAM.toLowerCase().includes(firstWord))
            .map(row => row.KAM)
        ));
        
        if (similarKAMs.length > 0) {
          return {
            success: false,
            error: `No exact match for "${kamName}". Did you mean one of these? ${similarKAMs.join(', ')}. Or try searching with just the first name.`
          };
        }
        
        return { 
          success: false, 
          error: `No expenses found for KAM: ${kamName}. Available KAMs: ${this.getAvailableKAMs().join(', ')}` 
        };
      }

      const total = expenses.reduce((sum, row) => sum + parseFloat(row.Total || '0'), 0);
      
      return {
        success: true,
        data: { expenses, total, count: expenses.length },
        summary: `Total expense by ${kamName}: ₹${total.toFixed(2)} across ${expenses.length} entries`,
      };
    } catch (error) {
      return { success: false, error: `Query failed: ${error}` };
    }
  }

  // Helper to get available KAMs from expense data
  private getAvailableKAMs(): string[] {
    const kams = new Set<string>();
    this.expenseData.forEach(row => {
      if (row.KAM) kams.add(row.KAM);
    });
    const allKAMs = Array.from(kams).sort();
    return allKAMs.slice(0, 10); // Return first 10 for error messages
  }

  getRevenueByKAMAndMonth(kamName: string, month: string): QueryResult {
    try {
      // Get all KAM assignments that match the name
      const kamAssignments = this.kamData.filter(
        (row) => 
          (row['KAM Name 1'] && row['KAM Name 1'].toLowerCase().includes(kamName.toLowerCase())) ||
          (row['KAM Name 2'] && row['KAM Name 2'].toLowerCase().includes(kamName.toLowerCase())) ||
          (row['KAM Name 3'] && row['KAM Name 3'].toLowerCase().includes(kamName.toLowerCase())) ||
          (row['KAM Name 4'] && row['KAM Name 4'].toLowerCase().includes(kamName.toLowerCase())) ||
          (row['KAM Name 5'] && row['KAM Name 5'].toLowerCase().includes(kamName.toLowerCase())) ||
          (row['KAM Name 6'] && row['KAM Name 6'].toLowerCase().includes(kamName.toLowerCase()))
      );

      if (kamAssignments.length === 0) {
        return { 
          success: false, 
          error: `No brands found for KAM: ${kamName}. Check the KAM name spelling.` 
        };
      }

      // Get all emails managed by this KAM
      const managedEmails = new Set(kamAssignments.map(k => k.email?.toLowerCase()).filter(Boolean));

      // Get restaurant IDs for these brands from brand data
      const restaurantIds = new Set<string>();
      this.brandData.forEach(brand => {
        if (brand.email && managedEmails.has(brand.email.toLowerCase())) {
          restaurantIds.add(brand.restaurant_id);
        }
      });

      if (restaurantIds.size === 0) {
        return { 
          success: false, 
          error: `No outlets found for brands managed by ${kamName}` 
        };
      }

      // Filter revenue by month and restaurants
      const monthNum = this.parseMonth(month);
      const revenues = this.revenueData.filter((row) => {
        if (!row.Date || !row.restaurant_id) return false;
        
        const date = this.parseDate(row.Date);
        if (!date) return false;
        
        return date.getMonth() === monthNum && restaurantIds.has(row.restaurant_id);
      });

      const total = revenues.reduce((sum, row) => {
        const amount = parseFloat(row[' Amount  '] || row['Amount'] || '0');
        return sum + amount;
      }, 0);

      return {
        success: true,
        data: { 
          revenues, 
          total, 
          brandCount: kamAssignments.length,
          outletCount: restaurantIds.size 
        },
        summary: `Revenue by ${kamName} in ${month}: ₹${total.toFixed(2)} from ${revenues.length} transactions across ${restaurantIds.size} outlets`,
      };
    } catch (error) {
      return { success: false, error: `Query failed: ${error}` };
    }
  }

  getHighestRevenueKAMByMonth(month: string): QueryResult {
    try {
      const monthNum = this.parseMonth(month);
      const monthRevenues = this.revenueData.filter((row) => {
        if (!row.Date) return false;
        const date = this.parseDate(row.Date);
        return date && date.getMonth() === monthNum;
      });

      if (monthRevenues.length === 0) {
        return { 
          success: false, 
          error: `No revenue data found for ${month}` 
        };
      }

      // Build map of restaurant_id to email
      const restaurantToEmail = new Map<string, string>();
      this.brandData.forEach(brand => {
        if (brand.restaurant_id && brand.email) {
          restaurantToEmail.set(brand.restaurant_id, brand.email.toLowerCase());
        }
      });

      // Build map of email to KAM
      const emailToKAM = new Map<string, string>();
      this.kamData.forEach(kam => {
        if (kam.email) {
          const email = kam.email.toLowerCase();
          // Use the most recent KAM assignment
          const kamName = kam['KAM Name 6'] || kam['KAM Name 5'] || kam['KAM Name 4'] || 
                         kam['KAM Name 3'] || kam['KAM Name 2'] || kam['KAM Name 1'];
          if (kamName) {
            emailToKAM.set(email, kamName);
          }
        }
      });

      // Group revenue by KAM
      const kamRevenues = new Map<string, number>();
      
      monthRevenues.forEach((rev) => {
        const email = restaurantToEmail.get(rev.restaurant_id);
        if (email) {
          const kamName = emailToKAM.get(email);
          if (kamName) {
            const amount = parseFloat(rev[' Amount  '] || rev['Amount'] || '0');
            const current = kamRevenues.get(kamName) || 0;
            kamRevenues.set(kamName, current + amount);
          }
        }
      });

      if (kamRevenues.size === 0) {
        return { 
          success: false, 
          error: `No KAM assignments found for revenue in ${month}` 
        };
      }

      const sorted = Array.from(kamRevenues.entries()).sort((a, b) => b[1] - a[1]);
      const highest = sorted[0];
      const top5 = sorted.slice(0, 5);

      return {
        success: true,
        data: { 
          kamRevenues: Object.fromEntries(sorted), 
          highest: { name: highest[0], revenue: highest[1] },
          top5: top5.map(([name, revenue]) => ({ name, revenue }))
        },
        summary: `Highest revenue KAM in ${month}: ${highest[0]} with ₹${highest[1].toFixed(2)}`,
      };
    } catch (error) {
      return { success: false, error: `Query failed: ${error}` };
    }
  }

  getChurnRevenueRatio(): QueryResult {
    try {
      const totalRevenue = this.revenueData.reduce(
        (sum, row) => sum + parseFloat(row[' Amount  '] || row['Amount'] || '0'),
        0
      );

      if (totalRevenue === 0) {
        return { 
          success: false, 
          error: 'No revenue data available to calculate churn ratio' 
        };
      }

      const churnedRestaurants = new Set(
        this.churnData.map(c => c.restaurant_id).filter(Boolean)
      );
      
      const churnRevenue = this.revenueData
        .filter(row => churnedRestaurants.has(row.restaurant_id))
        .reduce((sum, row) => sum + parseFloat(row[' Amount  '] || row['Amount'] || '0'), 0);

      const ratio = (churnRevenue / totalRevenue) * 100;
      const churnCount = churnedRestaurants.size;

      return {
        success: true,
        data: { 
          totalRevenue, 
          churnRevenue, 
          ratio,
          churnedOutletCount: churnCount,
          activeRevenue: totalRevenue - churnRevenue
        },
        summary: `Churn revenue ratio: ${ratio.toFixed(2)}% (₹${churnRevenue.toFixed(2)} from ${churnCount} churned outlets out of ₹${totalRevenue.toFixed(2)} total revenue)`,
      };
    } catch (error) {
      return { success: false, error: `Query failed: ${error}` };
    }
  }

  private parseMonth(month: string): number {
    const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
    const idx = months.findIndex(m => month.toLowerCase().includes(m));
    return idx >= 0 ? idx : new Date().getMonth();
  }

  // Parse date from various formats (DD-MM-YYYY, DD-MMM-YY, etc.)
  private parseDate(dateStr: string): Date | null {
    if (!dateStr) return null;
    
    try {
      // Try standard Date parsing first
      const date = new Date(dateStr);
      if (!isNaN(date.getTime())) return date;
      
      // Try DD-MM-YYYY format
      const parts = dateStr.split(/[-/]/);
      if (parts.length === 3) {
        const day = parseInt(parts[0]);
        const month = parseInt(parts[1]) - 1; // 0-indexed
        const year = parseInt(parts[2]);
        const fullYear = year < 100 ? 2000 + year : year;
        return new Date(fullYear, month, day);
      }
      
      return null;
    } catch {
      return null;
    }
  }

  // Generic query for AI to use
  executeQuery(queryType: string, params: any): QueryResult {
    switch (queryType) {
      // Expense queries
      case 'expense_by_kam':
        return this.getExpenseByKAM(params.kamName);
      case 'total_expenses':
        return this.getTotalExpenses(params.month);
      case 'expense_by_month':
        return this.getExpenseByMonth(params.month);
      
      // Revenue queries
      case 'revenue_by_kam_month':
        return this.getRevenueByKAMAndMonth(params.kamName, params.month);
      case 'highest_revenue_kam':
        return this.getHighestRevenueKAMByMonth(params.month);
      case 'highest_revenue_brand':
        return this.getHighestRevenueBrand(params.month);
      case 'total_revenue':
        return this.getTotalRevenue(params.month);
      case 'revenue_by_brand':
        return this.getRevenueByBrand(params.brandName, params.month);
      case 'revenue_by_product':
        return this.getRevenueByProduct(params.productName, params.month);
      
      // Brand queries
      case 'brand_count':
        return this.getBrandCount();
      case 'brand_info':
        return this.getBrandInfo(params.brandName);
      case 'brands_by_kam':
        return this.getBrandsByKAM(params.kamName);
      
      // Outlet queries
      case 'outlet_count':
        return this.getOutletCount();
      case 'outlets_by_brand':
        return this.getOutletsByBrand(params.brandName);
      
      // Churn queries
      case 'churn_revenue_ratio':
        return this.getChurnRevenueRatio();
      case 'churn_count':
        return this.getChurnCount(params.month);
      case 'churn_reasons':
        return this.getChurnReasons();
      case 'churned_brands':
        return this.getChurnedBrands(params.month);
      
      // KAM performance queries
      case 'kam_performance':
        return this.getKAMPerformance(params.kamName, params.month);
      case 'all_kams':
        return this.getAllKAMs();
      
      // Comparison queries
      case 'compare_kams':
        return this.compareKAMs(params.kam1, params.kam2, params.month);
      case 'compare_brands':
        return this.compareBrands(params.brand1, params.brand2, params.month);
      
      default:
        return { success: false, error: 'Unknown query type' };
    }
  }

  getHighestRevenueBrand(month?: string): QueryResult {
    try {
      let filteredRevenue = this.revenueData;
      
      // Filter by month if provided
      if (month) {
        const monthNum = this.parseMonth(month);
        filteredRevenue = this.revenueData.filter((row) => {
          if (!row.Date) return false;
          const date = this.parseDate(row.Date);
          return date && date.getMonth() === monthNum;
        });
      }

      if (filteredRevenue.length === 0) {
        return { 
          success: false, 
          error: month ? `No revenue data found for ${month}` : 'No revenue data available'
        };
      }

      // Build map of restaurant_id to email (brand)
      const restaurantToEmail = new Map<string, string>();
      this.brandData.forEach(brand => {
        if (brand.restaurant_id && brand.email) {
          restaurantToEmail.set(brand.restaurant_id, brand.email.toLowerCase());
        }
      });

      // Get brand names from KAM data
      const emailToBrandName = new Map<string, string>();
      this.kamData.forEach(kam => {
        if (kam.email && kam['Brand Name']) {
          emailToBrandName.set(kam.email.toLowerCase(), kam['Brand Name']);
        }
      });

      // Group revenue by brand (email)
      const brandRevenues = new Map<string, { email: string; name: string; revenue: number }>();
      
      filteredRevenue.forEach((rev) => {
        const email = restaurantToEmail.get(rev.restaurant_id);
        if (email) {
          const brandName = emailToBrandName.get(email) || email;
          const amount = parseFloat(rev[' Amount  '] || rev['Amount'] || '0');
          
          if (brandRevenues.has(email)) {
            const existing = brandRevenues.get(email)!;
            existing.revenue += amount;
          } else {
            brandRevenues.set(email, { email, name: brandName, revenue: amount });
          }
        }
      });

      if (brandRevenues.size === 0) {
        return { 
          success: false, 
          error: 'No brand data found for revenue transactions' 
        };
      }

      const sorted = Array.from(brandRevenues.values()).sort((a, b) => b.revenue - a.revenue);
      const highest = sorted[0];
      const top5 = sorted.slice(0, 5);

      return {
        success: true,
        data: { 
          brandRevenues: sorted.reduce((acc, b) => ({ ...acc, [b.name]: b.revenue }), {}),
          highest: { name: highest.name, email: highest.email, revenue: highest.revenue },
          top5: top5.map(b => ({ name: b.name, email: b.email, revenue: b.revenue }))
        },
        summary: month 
          ? `Highest revenue brand in ${month}: ${highest.name} with ₹${highest.revenue.toFixed(2)}`
          : `Highest revenue brand overall: ${highest.name} with ₹${highest.revenue.toFixed(2)}`,
      };
    } catch (error) {
      return { success: false, error: `Query failed: ${error}` };
    }
  }

  // ============ EXPENSE QUERIES ============
  
  getTotalExpenses(month?: string): QueryResult {
    try {
      let expenses = this.expenseData;
      
      if (month) {
        const monthNum = this.parseMonth(month);
        expenses = this.expenseData.filter(row => {
          if (!row.Date) return false;
          const date = this.parseDate(row.Date);
          return date && date.getMonth() === monthNum;
        });
      }
      
      const total = expenses.reduce((sum, row) => sum + parseFloat(row.Total || '0'), 0);
      
      return {
        success: true,
        data: { expenses, total, count: expenses.length },
        summary: month 
          ? `Total expenses in ${month}: ₹${total.toFixed(2)} across ${expenses.length} entries`
          : `Total expenses overall: ₹${total.toFixed(2)} across ${expenses.length} entries`,
      };
    } catch (error) {
      return { success: false, error: `Query failed: ${error}` };
    }
  }

  getExpenseByMonth(month: string): QueryResult {
    return this.getTotalExpenses(month);
  }

  // ============ REVENUE QUERIES ============
  
  getTotalRevenue(month?: string): QueryResult {
    try {
      let revenues = this.revenueData;
      
      if (month) {
        const monthNum = this.parseMonth(month);
        revenues = this.revenueData.filter(row => {
          if (!row.Date) return false;
          const date = this.parseDate(row.Date);
          return date && date.getMonth() === monthNum;
        });
      }
      
      const total = revenues.reduce((sum, row) => {
        const amount = parseFloat(row[' Amount  '] || row['Amount'] || '0');
        return sum + amount;
      }, 0);
      
      return {
        success: true,
        data: { revenues, total, count: revenues.length },
        summary: month 
          ? `Total revenue in ${month}: ₹${total.toFixed(2)} from ${revenues.length} transactions`
          : `Total revenue overall: ₹${total.toFixed(2)} from ${revenues.length} transactions`,
      };
    } catch (error) {
      return { success: false, error: `Query failed: ${error}` };
    }
  }

  getRevenueByBrand(brandName: string, month?: string): QueryResult {
    try {
      // Find brand by name in KAM data
      const brands = this.kamData.filter(kam => 
        kam['Brand Name'] && kam['Brand Name'].toLowerCase().includes(brandName.toLowerCase())
      );
      
      if (brands.length === 0) {
        return { success: false, error: `Brand not found: ${brandName}` };
      }
      
      const emails = new Set(brands.map(b => b.email?.toLowerCase()).filter(Boolean));
      
      // Get restaurant IDs for these brands
      const restaurantIds = new Set<string>();
      this.brandData.forEach(brand => {
        if (brand.email && emails.has(brand.email.toLowerCase())) {
          restaurantIds.add(brand.restaurant_id);
        }
      });
      
      // Filter revenue
      let revenues = this.revenueData.filter(row => restaurantIds.has(row.restaurant_id));
      
      if (month) {
        const monthNum = this.parseMonth(month);
        revenues = revenues.filter(row => {
          if (!row.Date) return false;
          const date = this.parseDate(row.Date);
          return date && date.getMonth() === monthNum;
        });
      }
      
      const total = revenues.reduce((sum, row) => {
        const amount = parseFloat(row[' Amount  '] || row['Amount'] || '0');
        return sum + amount;
      }, 0);
      
      return {
        success: true,
        data: { revenues, total, count: revenues.length, brandName: brands[0]['Brand Name'] },
        summary: month
          ? `Revenue for ${brands[0]['Brand Name']} in ${month}: ₹${total.toFixed(2)} from ${revenues.length} transactions`
          : `Revenue for ${brands[0]['Brand Name']}: ₹${total.toFixed(2)} from ${revenues.length} transactions`,
      };
    } catch (error) {
      return { success: false, error: `Query failed: ${error}` };
    }
  }

  getRevenueByProduct(productName: string, month?: string): QueryResult {
    try {
      let revenues = this.revenueData.filter(row => {
        const product = row['Product Or service Name'] || row['Product'] || '';
        return product.toLowerCase().includes(productName.toLowerCase());
      });
      
      if (month) {
        const monthNum = this.parseMonth(month);
        revenues = revenues.filter(row => {
          if (!row.Date) return false;
          const date = this.parseDate(row.Date);
          return date && date.getMonth() === monthNum;
        });
      }
      
      const total = revenues.reduce((sum, row) => {
        const amount = parseFloat(row[' Amount  '] || row['Amount'] || '0');
        return sum + amount;
      }, 0);
      
      return {
        success: true,
        data: { revenues, total, count: revenues.length },
        summary: month
          ? `Revenue from ${productName} in ${month}: ₹${total.toFixed(2)} from ${revenues.length} transactions`
          : `Revenue from ${productName}: ₹${total.toFixed(2)} from ${revenues.length} transactions`,
      };
    } catch (error) {
      return { success: false, error: `Query failed: ${error}` };
    }
  }

  // ============ BRAND QUERIES ============
  
  getBrandCount(): QueryResult {
    try {
      const uniqueEmails = new Set(this.kamData.map(k => k.email?.toLowerCase()).filter(Boolean));
      const brands = this.kamData.filter(k => k['Brand Name']);
      
      return {
        success: true,
        data: { count: uniqueEmails.size, brands: brands.slice(0, 20) },
        summary: `Total brands: ${uniqueEmails.size}`,
      };
    } catch (error) {
      return { success: false, error: `Query failed: ${error}` };
    }
  }

  getBrandInfo(brandName: string): QueryResult {
    try {
      const brand = this.kamData.find(kam => 
        kam['Brand Name'] && kam['Brand Name'].toLowerCase().includes(brandName.toLowerCase())
      );
      
      if (!brand) {
        return { success: false, error: `Brand not found: ${brandName}` };
      }
      
      // Get outlets for this brand
      const outlets = this.brandData.filter(b => 
        b.email && brand.email && b.email.toLowerCase() === brand.email.toLowerCase()
      );
      
      // Get current KAM
      const currentKAM = brand['KAM Name 6'] || brand['KAM Name 5'] || brand['KAM Name 4'] || 
                        brand['KAM Name 3'] || brand['KAM Name 2'] || brand['KAM Name 1'];
      
      return {
        success: true,
        data: { 
          brandName: brand['Brand Name'],
          email: brand.email,
          currentKAM,
          outletCount: outlets.length,
          outlets: outlets.slice(0, 10)
        },
        summary: `${brand['Brand Name']}: ${outlets.length} outlets, managed by ${currentKAM}`,
      };
    } catch (error) {
      return { success: false, error: `Query failed: ${error}` };
    }
  }

  getBrandsByKAM(kamName: string): QueryResult {
    try {
      const brands = this.kamData.filter(kam => 
        (kam['KAM Name 1'] && kam['KAM Name 1'].toLowerCase().includes(kamName.toLowerCase())) ||
        (kam['KAM Name 2'] && kam['KAM Name 2'].toLowerCase().includes(kamName.toLowerCase())) ||
        (kam['KAM Name 3'] && kam['KAM Name 3'].toLowerCase().includes(kamName.toLowerCase())) ||
        (kam['KAM Name 4'] && kam['KAM Name 4'].toLowerCase().includes(kamName.toLowerCase())) ||
        (kam['KAM Name 5'] && kam['KAM Name 5'].toLowerCase().includes(kamName.toLowerCase())) ||
        (kam['KAM Name 6'] && kam['KAM Name 6'].toLowerCase().includes(kamName.toLowerCase()))
      );
      
      if (brands.length === 0) {
        return { success: false, error: `No brands found for KAM: ${kamName}` };
      }
      
      return {
        success: true,
        data: { brands, count: brands.length },
        summary: `${kamName} manages ${brands.length} brands`,
      };
    } catch (error) {
      return { success: false, error: `Query failed: ${error}` };
    }
  }

  // ============ OUTLET QUERIES ============
  
  getOutletCount(): QueryResult {
    try {
      const count = this.brandData.length;
      
      return {
        success: true,
        data: { count, outlets: this.brandData.slice(0, 20) },
        summary: `Total outlets: ${count}`,
      };
    } catch (error) {
      return { success: false, error: `Query failed: ${error}` };
    }
  }

  getOutletsByBrand(brandName: string): QueryResult {
    try {
      const brand = this.kamData.find(kam => 
        kam['Brand Name'] && kam['Brand Name'].toLowerCase().includes(brandName.toLowerCase())
      );
      
      if (!brand) {
        return { success: false, error: `Brand not found: ${brandName}` };
      }
      
      const outlets = this.brandData.filter(b => 
        b.email && brand.email && b.email.toLowerCase() === brand.email.toLowerCase()
      );
      
      return {
        success: true,
        data: { outlets, count: outlets.length, brandName: brand['Brand Name'] },
        summary: `${brand['Brand Name']} has ${outlets.length} outlets`,
      };
    } catch (error) {
      return { success: false, error: `Query failed: ${error}` };
    }
  }

  // ============ CHURN QUERIES ============
  
  getChurnCount(month?: string): QueryResult {
    try {
      let churns = this.churnData;
      
      if (month) {
        const monthNum = this.parseMonth(month);
        churns = this.churnData.filter(row => {
          if (!row.Date) return false;
          const date = this.parseDate(row.Date);
          return date && date.getMonth() === monthNum;
        });
      }
      
      return {
        success: true,
        data: { churns, count: churns.length },
        summary: month
          ? `Churned outlets in ${month}: ${churns.length}`
          : `Total churned outlets: ${churns.length}`,
      };
    } catch (error) {
      return { success: false, error: `Query failed: ${error}` };
    }
  }

  getChurnReasons(): QueryResult {
    try {
      const reasonCounts = new Map<string, number>();
      
      this.churnData.forEach(churn => {
        const reason = churn['Churn Reasons'] || 'Unknown';
        reasonCounts.set(reason, (reasonCounts.get(reason) || 0) + 1);
      });
      
      const sorted = Array.from(reasonCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([reason, count]) => ({ reason, count }));
      
      return {
        success: true,
        data: { reasons: sorted, total: this.churnData.length },
        summary: `Top churn reason: ${sorted[0].reason} (${sorted[0].count} outlets)`,
      };
    } catch (error) {
      return { success: false, error: `Query failed: ${error}` };
    }
  }

  getChurnedBrands(month?: string): QueryResult {
    try {
      let churns = this.churnData;
      
      if (month) {
        const monthNum = this.parseMonth(month);
        churns = this.churnData.filter(row => {
          if (!row.Date) return false;
          const date = this.parseDate(row.Date);
          return date && date.getMonth() === monthNum;
        });
      }
      
      // Get unique brands
      const churnedRestaurantIds = new Set(churns.map(c => c.restaurant_id));
      const churnedEmails = new Set<string>();
      
      this.brandData.forEach(brand => {
        if (churnedRestaurantIds.has(brand.restaurant_id) && brand.email) {
          churnedEmails.add(brand.email.toLowerCase());
        }
      });
      
      const brands = this.kamData.filter(kam => 
        kam.email && churnedEmails.has(kam.email.toLowerCase())
      );
      
      return {
        success: true,
        data: { brands, count: brands.length, outlets: churns.length },
        summary: month
          ? `Churned in ${month}: ${brands.length} brands (${churns.length} outlets)`
          : `Total churned: ${brands.length} brands (${churns.length} outlets)`,
      };
    } catch (error) {
      return { success: false, error: `Query failed: ${error}` };
    }
  }

  // ============ KAM PERFORMANCE QUERIES ============
  
  getKAMPerformance(kamName: string, month?: string): QueryResult {
    try {
      // Get expenses
      const expenseResult = this.getExpenseByKAM(kamName);
      
      // Get revenue
      const revenueResult = month 
        ? this.getRevenueByKAMAndMonth(kamName, month)
        : { success: true, data: { total: 0 } };
      
      // Get brands
      const brandsResult = this.getBrandsByKAM(kamName);
      
      if (!expenseResult.success && !revenueResult.success && !brandsResult.success) {
        return { success: false, error: `No data found for KAM: ${kamName}` };
      }
      
      const expense = expenseResult.success ? expenseResult.data.total : 0;
      const revenue = revenueResult.success ? revenueResult.data.total : 0;
      const brandCount = brandsResult.success ? brandsResult.data.count : 0;
      const profit = revenue - expense;
      const roi = expense > 0 ? ((profit / expense) * 100) : 0;
      
      return {
        success: true,
        data: { 
          kamName,
          expense,
          revenue,
          profit,
          roi,
          brandCount
        },
        summary: month
          ? `${kamName} performance in ${month}: Revenue ₹${revenue.toFixed(2)}, Expense ₹${expense.toFixed(2)}, Profit ₹${profit.toFixed(2)}, ROI ${roi.toFixed(2)}%, ${brandCount} brands`
          : `${kamName} performance: Expense ₹${expense.toFixed(2)}, ${brandCount} brands`,
      };
    } catch (error) {
      return { success: false, error: `Query failed: ${error}` };
    }
  }

  getAllKAMs(): QueryResult {
    try {
      const kams = new Set<string>();
      
      this.kamData.forEach(kam => {
        if (kam['KAM Name 1']) kams.add(kam['KAM Name 1']);
        if (kam['KAM Name 2']) kams.add(kam['KAM Name 2']);
        if (kam['KAM Name 3']) kams.add(kam['KAM Name 3']);
        if (kam['KAM Name 4']) kams.add(kam['KAM Name 4']);
        if (kam['KAM Name 5']) kams.add(kam['KAM Name 5']);
        if (kam['KAM Name 6']) kams.add(kam['KAM Name 6']);
      });
      
      const kamList = Array.from(kams).sort();
      
      return {
        success: true,
        data: { kams: kamList, count: kamList.length },
        summary: `Total KAMs: ${kamList.length}`,
      };
    } catch (error) {
      return { success: false, error: `Query failed: ${error}` };
    }
  }

  // ============ COMPARISON QUERIES ============
  
  compareKAMs(kam1: string, kam2: string, month?: string): QueryResult {
    try {
      const perf1 = this.getKAMPerformance(kam1, month);
      const perf2 = this.getKAMPerformance(kam2, month);
      
      if (!perf1.success || !perf2.success) {
        return { success: false, error: 'One or both KAMs not found' };
      }
      
      return {
        success: true,
        data: { 
          kam1: perf1.data,
          kam2: perf2.data,
          comparison: {
            revenueDiff: perf1.data.revenue - perf2.data.revenue,
            expenseDiff: perf1.data.expense - perf2.data.expense,
            brandDiff: perf1.data.brandCount - perf2.data.brandCount
          }
        },
        summary: month
          ? `Comparison in ${month}: ${kam1} (₹${perf1.data.revenue.toFixed(2)}) vs ${kam2} (₹${perf2.data.revenue.toFixed(2)})`
          : `Comparison: ${kam1} (${perf1.data.brandCount} brands) vs ${kam2} (${perf2.data.brandCount} brands)`,
      };
    } catch (error) {
      return { success: false, error: `Query failed: ${error}` };
    }
  }

  compareBrands(brand1: string, brand2: string, month?: string): QueryResult {
    try {
      const rev1 = this.getRevenueByBrand(brand1, month);
      const rev2 = this.getRevenueByBrand(brand2, month);
      
      if (!rev1.success || !rev2.success) {
        return { success: false, error: 'One or both brands not found' };
      }
      
      return {
        success: true,
        data: { 
          brand1: rev1.data,
          brand2: rev2.data,
          comparison: {
            revenueDiff: rev1.data.total - rev2.data.total
          }
        },
        summary: month
          ? `Comparison in ${month}: ${rev1.data.brandName} (₹${rev1.data.total.toFixed(2)}) vs ${rev2.data.brandName} (₹${rev2.data.total.toFixed(2)})`
          : `Comparison: ${rev1.data.brandName} (₹${rev1.data.total.toFixed(2)}) vs ${rev2.data.brandName} (₹${rev2.data.total.toFixed(2)})`,
      };
    } catch (error) {
      return { success: false, error: `Query failed: ${error}` };
    }
  }
}