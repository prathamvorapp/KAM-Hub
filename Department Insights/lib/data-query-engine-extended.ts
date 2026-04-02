// Extended query methods for comprehensive analytics
// This file contains all additional query implementations
// Import and merge with main DataQueryEngine class

export const extendedQueryMethods = `
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
          ? \`Total expenses in \${month}: ₹\${total.toFixed(2)} across \${expenses.length} entries\`
          : \`Total expenses overall: ₹\${total.toFixed(2)} across \${expenses.length} entries\`,
      };
    } catch (error) {
      return { success: false, error: \`Query failed: \${error}\` };
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
          ? \`Total revenue in \${month}: ₹\${total.toFixed(2)} from \${revenues.length} transactions\`
          : \`Total revenue overall: ₹\${total.toFixed(2)} from \${revenues.length} transactions\`,
      };
    } catch (error) {
      return { success: false, error: \`Query failed: \${error}\` };
    }
  }

  getRevenueByBrand(brandName: string, month?: string): QueryResult {
    try {
      const brands = this.kamData.filter(kam => 
        kam['Brand Name'] && kam['Brand Name'].toLowerCase().includes(brandName.toLowerCase())
      );
      
      if (brands.length === 0) {
        return { success: false, error: \`Brand not found: \${brandName}\` };
      }
      
      const emails = new Set(brands.map(b => b.email?.toLowerCase()).filter(Boolean));
      const restaurantIds = new Set<string>();
      this.brandData.forEach(brand => {
        if (brand.email && emails.has(brand.email.toLowerCase())) {
          restaurantIds.add(brand.restaurant_id);
        }
      });
      
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
          ? \`Revenue for \${brands[0]['Brand Name']} in \${month}: ₹\${total.toFixed(2)} from \${revenues.length} transactions\`
          : \`Revenue for \${brands[0]['Brand Name']}: ₹\${total.toFixed(2)} from \${revenues.length} transactions\`,
      };
    } catch (error) {
      return { success: false, error: \`Query failed: \${error}\` };
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
          ? \`Revenue from \${productName} in \${month}: ₹\${total.toFixed(2)} from \${revenues.length} transactions\`
          : \`Revenue from \${productName}: ₹\${total.toFixed(2)} from \${revenues.length} transactions\`,
      };
    } catch (error) {
      return { success: false, error: \`Query failed: \${error}\` };
    }
  }
`;

// List of all available query types
export const ALL_QUERY_TYPES = {
  // Expense queries
  expense_by_kam: 'Get expenses for a specific KAM',
  total_expenses: 'Get total expenses (optionally by month)',
  expense_by_month: 'Get expenses for a specific month',
  
  // Revenue queries
  revenue_by_kam_month: 'Get revenue by KAM for a specific month',
  highest_revenue_kam: 'Find KAM with highest revenue',
  highest_revenue_brand: 'Find brand with highest revenue',
  total_revenue: 'Get total revenue (optionally by month)',
  revenue_by_brand: 'Get revenue for a specific brand',
  revenue_by_product: 'Get revenue for a specific product',
  
  // Brand queries
  brand_count: 'Get total number of brands',
  brand_info: 'Get detailed information about a brand',
  brands_by_kam: 'Get all brands managed by a KAM',
  
  // Outlet queries
  outlet_count: 'Get total number of outlets',
  outlets_by_brand: 'Get all outlets for a brand',
  
  // Churn queries
  churn_revenue_ratio: 'Calculate churn to revenue ratio',
  churn_count: 'Get number of churned outlets',
  churn_reasons: 'Get breakdown of churn reasons',
  churned_brands: 'Get list of churned brands',
  
  // KAM performance queries
  kam_performance: 'Get comprehensive KAM performance metrics',
  all_kams: 'Get list of all KAMs',
  
  // Comparison queries
  compare_kams: 'Compare performance of two KAMs',
  compare_brands: 'Compare revenue of two brands',
};
