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

    console.log(`📊 Getting comprehensive master data for user: ${user.email}`);

    const supabaseAdmin = getSupabaseAdmin();
    const BATCH_SIZE = 1000;

    // Helper function to fetch all records in batches
    async function fetchAllRecords(tableName: string, orderBy: string = 'created_at') {
      let allRecords: any[] = [];
      let from = 0;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabaseAdmin
          .from(tableName)
          .select('*')
          .order(orderBy, { ascending: false })
          .range(from, from + BATCH_SIZE - 1);

        if (error) {
          console.error(`Failed to fetch ${tableName}:`, error);
          hasMore = false;
          break;
        }

        if (data && data.length > 0) {
          allRecords = allRecords.concat(data);
          from += BATCH_SIZE;
          hasMore = data.length === BATCH_SIZE;
        } else {
          hasMore = false;
        }
      }

      return allRecords;
    }

    // Fetch all master data in batches
    console.log('📊 Fetching master data in batches...');
    const masterData = await fetchAllRecords('master_data', 'brand_name');
    console.log(`📊 Fetched ${masterData.length} master data records`);

    // Fetch user profiles to get team names
    const kamEmails = [...new Set(masterData.map((m: any) => m.kam_email_id).filter(Boolean))];
    
    let userProfiles: any[] = [];
    if (kamEmails.length > 0) {
      // Fetch user profiles in batches if needed
      const profileBatchSize = 1000;
      for (let i = 0; i < kamEmails.length; i += profileBatchSize) {
        const batch = kamEmails.slice(i, i + profileBatchSize);
        const { data, error } = await supabaseAdmin
          .from('user_profiles')
          .select('email, team_name')
          .in('email', batch);

        if (!error && data) {
          userProfiles = userProfiles.concat(data);
        }
      }
    }

    // Create email to team_name map
    const emailToTeam = new Map(userProfiles.map((p: any) => [p.email, p.team_name]));

    // Fetch all health checks in batches
    console.log('📊 Fetching health checks in batches...');
    const healthChecks = await fetchAllRecords('health_checks', 'assessment_date');
    console.log(`📊 Fetched ${healthChecks.length} health check records`);

    // Fetch all visits in batches
    console.log('📊 Fetching visits in batches...');
    const visits = await fetchAllRecords('visits', 'visit_date');
    console.log(`📊 Fetched ${visits.length} visit records`);

    // Fetch all churn records in batches
    console.log('📊 Fetching churn records in batches...');
    const churnRecords = await fetchAllRecords('churn_records', 'created_at');
    console.log(`📊 Fetched ${churnRecords.length} churn records`);

    // Fetch all demos in batches
    console.log('📊 Fetching demos in batches...');
    const demos = await fetchAllRecords('demos', 'created_at');
    console.log(`📊 Fetched ${demos.length} demo records`);


    // Process and combine data
    console.log('📊 Processing and combining all data...');
    const comprehensiveData = masterData.map((brand: any) => {
      // Get team name from user profiles
      const teamName = emailToTeam.get(brand.kam_email_id) || 'N/A';

      const brandNameLower = brand.brand_name?.toLowerCase() || '';
      const brandEmailLower = brand.brand_email_id?.toLowerCase() || '';

      // Get health checks for this brand (match by brand_name or brand_email)
      const brandHealthChecks = healthChecks.filter(
        (hc: any) => {
          const brandNameMatch = hc.brand_name?.toLowerCase() === brandNameLower;
          const emailMatch = hc.brand_email?.toLowerCase() === brandEmailLower;
          return brandNameMatch || emailMatch;
        }
      );

      const lastHealthCheck = brandHealthChecks[0];
      const healthCheckCount = brandHealthChecks.length;

      // Get visits for this brand
      const brandVisits = visits.filter(
        (v: any) => {
          const brandNameMatch = v.brand_name?.toLowerCase() === brandNameLower;
          const emailMatch = v.brand_email?.toLowerCase() === brandEmailLower;
          return brandNameMatch || emailMatch;
        }
      );

      const lastVisit = brandVisits[0];
      const visitCount = brandVisits.length;

      // Get churn records for this brand (match by restaurant_name, brand_name, or owner_email)
      const brandChurns = churnRecords.filter(
        (c: any) => {
          const restaurantMatch = c.restaurant_name?.toLowerCase() === brandNameLower;
          const brandMatch = c.brand_name?.toLowerCase() === brandNameLower;
          const emailMatch = c.owner_email?.toLowerCase() === brandEmailLower;
          return restaurantMatch || brandMatch || emailMatch;
        }
      );

      const lastChurn = brandChurns[0];
      const churnCount = brandChurns.length;

      // Get demos for this brand
      const brandDemos = demos.filter(
        (d: any) => {
          const brandNameMatch = d.brand_name?.toLowerCase() === brandNameLower;
          const emailMatch = d.brand_email?.toLowerCase() === brandEmailLower;
          return brandNameMatch || emailMatch;
        }
      );

      const completedDemos = brandDemos.filter((d: any) => d.demo_completed === true);
      const lastDemo = completedDemos[0];
      const demoCount = completedDemos.length;

      return {
        // Master Data fields
        brand_name: brand.brand_name || 'N/A',
        brand_email_id: brand.brand_email_id || 'N/A',
        kam_name: brand.kam_name || 'N/A',
        kam_email_id: brand.kam_email_id || 'N/A',
        brand_state: brand.brand_state || 'N/A',
        zone: brand.zone || 'N/A',
        team_name: teamName,
        outlet_count: brand.outlet_counts || 0, // Correct field name from schema

        // Health Check fields
        last_health_status: lastHealthCheck?.health_status || 'N/A',
        last_brand_nature: lastHealthCheck?.brand_nature || 'N/A',
        health_check_count: healthCheckCount,
        last_health_check_date: lastHealthCheck?.assessment_date || null,

        // Visit fields
        visit_count: visitCount,
        last_visit_date: lastVisit?.visit_date || null,

        // Churn fields
        churn_count: churnCount,
        last_rid_in_churn: lastChurn?.rid || 'N/A',

        // Demo fields
        demo_done_count: demoCount,
        last_demo_date: lastDemo?.demo_completed_date || null,

        // Raw IDs for reference
        brand_id: brand.id
      };
    });

    console.log(`📊 Processed ${comprehensiveData.length} comprehensive records`);

    return NextResponse.json({
      success: true,
      data: comprehensiveData
    });

  } catch (error) {
    console.error('[Master Data Comprehensive] Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
