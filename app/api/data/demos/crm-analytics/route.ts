import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/api-auth';
import { getSupabaseAdmin } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { user, error } = await authenticateRequest(request);
    if (error) return error;
    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 });
    }

    console.log(`📊 Getting CRM demo analytics for user: ${user.email} (${user.role})`);

    const supabaseAdmin = getSupabaseAdmin();
    
    // Fetch all demos without role-based filtering (CRM page shows all data)
    let allDemos: any[] = [];
    let from = 0;
    const batchSize = 1000;
    let hasMore = true;

    while (hasMore) {
      const query = supabaseAdmin
        .from('demos')
        .select('*');

      // CRM page shows all data regardless of user role
      const { data: batch, error: demosError } = await query
        .range(from, from + batchSize - 1)
        .order('created_at', { ascending: false });

      if (demosError) {
        throw new Error(`Failed to fetch demos: ${demosError.message}`);
      }

      if (batch && batch.length > 0) {
        allDemos = allDemos.concat(batch);
        from += batchSize;
        hasMore = batch.length === batchSize;
      } else {
        hasMore = false;
      }
    }

    // Fetch master_data to get total brands per KAM (in chunks) - no role filtering
    let allMasterData: any[] = [];
    let masterFrom = 0;
    const masterBatchSize = 1000;
    let hasMasterMore = true;

    while (hasMasterMore) {
      const masterDataQuery = supabaseAdmin
        .from('master_data')
        .select('kam_email_id, kam_name, id');

      // CRM page shows all data regardless of user role
      const { data: masterBatch, error: masterError } = await masterDataQuery
        .range(masterFrom, masterFrom + masterBatchSize - 1)
        .order('kam_email_id', { ascending: true });

      if (masterError) {
        console.error('Failed to fetch master data batch:', masterError);
        hasMasterMore = false;
        break;
      }

      if (masterBatch && masterBatch.length > 0) {
        allMasterData = allMasterData.concat(masterBatch);
        masterFrom += masterBatchSize;
        hasMasterMore = masterBatch.length === masterBatchSize;
      } else {
        hasMasterMore = false;
      }
    }

    console.log(`📊 Fetched ${allDemos.length} total demos for analytics`);
    console.log(`📊 Fetched ${allMasterData.length} brands from master_data (in ${Math.ceil(allMasterData.length / masterBatchSize)} batches)`);
    console.log(`📊 Sample demo fields:`, allDemos[0] ? Object.keys(allDemos[0]) : 'No demos');

    // Calculate analytics
    const analytics = calculateDemoAnalytics(allDemos, allMasterData);

    console.log(`📊 Analytics calculated:`, {
      totalDemos: allDemos.length,
      completedDemos: allDemos.filter(d => d.demo_completed === true).length,
      kamCount: analytics.kamSummary.length,
      productCount: analytics.productSummary.length
    });

    return NextResponse.json({
      success: true,
      data: analytics
    });

  } catch (error) {
    console.error('[Demo CRM Analytics] Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

function calculateDemoAnalytics(demos: any[], masterData: any[]) {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  // Filter completed demos (demo_completed = true)
  const completedDemos = demos.filter(d => d.demo_completed === true);
  
  // Monthly trend (last 6 months of completed demos)
  const monthlyTrend = [];
  for (let i = 5; i >= 0; i--) {
    const targetDate = new Date(currentYear, currentMonth - i, 1);
    const month = targetDate.getMonth();
    const year = targetDate.getFullYear();
    
    const count = completedDemos.filter(d => {
      if (!d.demo_completed_date) return false;
      const demoDate = new Date(d.demo_completed_date);
      return demoDate.getMonth() === month && demoDate.getFullYear() === year;
    }).length;
    
    monthlyTrend.push({
      month: targetDate.toLocaleString('default', { month: 'short', year: 'numeric' }),
      count
    });
  }

  // Current month distribution (completed demos only)
  const currentMonthCompleted = completedDemos.filter(d => {
    if (!d.demo_completed_date) return false;
    const demoDate = new Date(d.demo_completed_date);
    return demoDate.getMonth() === currentMonth && demoDate.getFullYear() === currentYear;
  });

  const currentMonthByProduct = groupByProduct(currentMonthCompleted);

  // Conversion data by product (completed demos only)
  const conversionByProduct: Record<string, { converted: number; notConverted: number }> = {};
  const applicabilityByProduct: Record<string, { applicable: number; notApplicable: number }> = {};
  
  const products = [...new Set(demos.map(d => d.product_name))];
  
  products.forEach(product => {
    const productDemos = completedDemos.filter(d => d.product_name === product);
    
    conversionByProduct[product] = {
      converted: productDemos.filter(d => d.conversion_status === 'Converted').length,
      notConverted: productDemos.filter(d => d.conversion_status === 'Not Converted').length
    };
    
    // For applicability, check all demos (not just completed)
    const allProductDemos = demos.filter(d => d.product_name === product);
    applicabilityByProduct[product] = {
      applicable: allProductDemos.filter(d => d.is_applicable === true).length,
      notApplicable: allProductDemos.filter(d => d.is_applicable === false).length
    };
  });

  // KAM Demo Summary with master data
  const kamSummary = calculateKAMSummary(demos, masterData);

  // KAM Product Summary
  const kamProductSummary = calculateKAMProductSummary(demos);

  // Product Summary
  const productSummary = calculateProductSummary(demos);

  return {
    monthlyTrend,
    currentMonthDistribution: {
      overall: currentMonthCompleted.length,
      byProduct: currentMonthByProduct
    },
    conversionByProduct,
    applicabilityByProduct,
    kamSummary,
    kamProductSummary,
    productSummary
  };
}

function groupByProduct(demos: any[]): Record<string, number> {
  const grouped: Record<string, number> = {};
  demos.forEach(demo => {
    const product = demo.product_name;
    if (!grouped[product]) {
      grouped[product] = 0;
    }
    grouped[product]++;
  });
  return grouped;
}

function calculateKAMSummary(demos: any[], masterData: any[]) {
  const kamMap = new Map();

  // First, populate from master_data to get total brands
  masterData.forEach(brand => {
    const kamEmail = brand.kam_email_id;
    const kamName = brand.kam_name;

    if (!kamMap.has(kamEmail)) {
      kamMap.set(kamEmail, {
        kamName: kamName || 'Unknown',
        kamEmail,
        totalBrandsFromMaster: new Set(),
        initiatedBrands: new Set(),
        scheduledDemo: 0,
        demoDone: 0,
        pendingDemo: 0,
        converted: 0,
        notConverted: 0,
        lastDemoDate: null
      });
    }

    kamMap.get(kamEmail).totalBrandsFromMaster.add(brand.id);
  });

  // Then, process demos
  demos.forEach(demo => {
    const kamEmail = demo.agent_id;
    const kamName = demo.agent_name;

    if (!kamMap.has(kamEmail)) {
      kamMap.set(kamEmail, {
        kamName,
        kamEmail,
        totalBrandsFromMaster: new Set(),
        initiatedBrands: new Set(),
        scheduledDemo: 0,
        demoDone: 0,
        pendingDemo: 0,
        converted: 0,
        notConverted: 0,
        lastDemoDate: null
      });
    }

    const kamData = kamMap.get(kamEmail);
    kamData.initiatedBrands.add(demo.brand_id);

    // Check current_status for scheduled/pending
    if (demo.current_status === 'Demo Scheduled') {
      kamData.scheduledDemo++;
    } else if (demo.current_status === 'Demo Pending') {
      kamData.pendingDemo++;
    }
    
    // Check demo_completed for completed demos
    if (demo.demo_completed === true) {
      kamData.demoDone++;
      
      if (demo.conversion_status === 'Converted') {
        kamData.converted++;
      } else if (demo.conversion_status === 'Not Converted') {
        kamData.notConverted++;
      }

      if (demo.demo_completed_date) {
        const demoDate = new Date(demo.demo_completed_date);
        if (!kamData.lastDemoDate || demoDate > new Date(kamData.lastDemoDate)) {
          kamData.lastDemoDate = demoDate.toISOString();
        }
      }
    }
  });

  return Array.from(kamMap.values()).map(kam => {
    const totalBrands = kam.totalBrandsFromMaster.size;
    const initiated = kam.initiatedBrands.size;
    const yetToInitiate = totalBrands - initiated;

    return {
      kamName: kam.kamName,
      kamEmail: kam.kamEmail,
      totalBrands,
      initiated,
      yetToInitiate,
      scheduledDemo: kam.scheduledDemo,
      demoDone: kam.demoDone,
      pendingDemo: kam.pendingDemo,
      converted: kam.converted,
      notConverted: kam.notConverted,
      lastDemoDate: kam.lastDemoDate
    };
  });
}

function calculateKAMProductSummary(demos: any[]) {
  const kamProductMap = new Map();

  demos.forEach(demo => {
    const kamEmail = demo.agent_id;
    const kamName = demo.agent_name;
    const product = demo.product_name;

    const key = `${kamEmail}_${product}`;

    if (!kamProductMap.has(key)) {
      kamProductMap.set(key, {
        kamName,
        kamEmail,
        product,
        notApplicable: 0,
        demoPending: 0,
        demoDone: 0,
        converted: 0,
        notConverted: 0
      });
    }

    const data = kamProductMap.get(key);

    // Check is_applicable field
    if (demo.is_applicable === false) {
      data.notApplicable++;
    } else if (demo.current_status === 'Demo Pending') {
      data.demoPending++;
    }
    
    // Check demo_completed for completed demos
    if (demo.demo_completed === true) {
      data.demoDone++;
      
      if (demo.conversion_status === 'Converted') {
        data.converted++;
      } else if (demo.conversion_status === 'Not Converted') {
        data.notConverted++;
      }
    }
  });

  // Group by KAM
  const kamGroups = new Map();
  kamProductMap.forEach(data => {
    if (!kamGroups.has(data.kamEmail)) {
      kamGroups.set(data.kamEmail, {
        kamName: data.kamName,
        kamEmail: data.kamEmail,
        products: {}
      });
    }
    kamGroups.get(data.kamEmail).products[data.product] = {
      notApplicable: data.notApplicable,
      demoPending: data.demoPending,
      demoDone: data.demoDone,
      converted: data.converted,
      notConverted: data.notConverted
    };
  });

  return Array.from(kamGroups.values());
}

function calculateProductSummary(demos: any[]) {
  const productMap = new Map();

  demos.forEach(demo => {
    const product = demo.product_name;

    if (!productMap.has(product)) {
      productMap.set(product, {
        productName: product,
        notApplicable: 0,
        demoDone: 0,
        converted: 0,
        notConverted: 0
      });
    }

    const data = productMap.get(product);

    // Check is_applicable field
    if (demo.is_applicable === false) {
      data.notApplicable++;
    }
    
    // Check demo_completed for completed demos
    if (demo.demo_completed === true) {
      data.demoDone++;
      
      if (demo.conversion_status === 'Converted') {
        data.converted++;
      } else if (demo.conversion_status === 'Not Converted') {
        data.notConverted++;
      }
    }
  });

  return Array.from(productMap.values());
}
