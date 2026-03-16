import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/api-auth';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { churnService } from '@/lib/services';

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

    console.log(`📊 Getting KAM summary data`);

    const supabase = getSupabaseAdmin();
    
    // Get query parameters
    const { searchParams } = new URL(request.url);
    const teamFilter = searchParams.get('team') || undefined;

    // Get current month
    const now = new Date();
    const currentMonth = now.toISOString().slice(0, 7); // YYYY-MM format
    const firstDayOfMonth = `${currentMonth}-01`;
    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);

    // Get all KAMs from user_profiles (with optional team filter)
    let kamsQuery = supabase
      .from('user_profiles')
      .select('full_name, email, team_name')
      .not('email', 'is', null)
      .in('role', ['agent', 'team_lead']);
    
    if (teamFilter) {
      kamsQuery = kamsQuery.eq('team_name', teamFilter);
    }

    const { data: kams, error: kamsError } = await kamsQuery;

    if (kamsError) throw kamsError;
    if (!kams || kams.length === 0) {
      return NextResponse.json({
        success: true,
        data: [],
        month: currentMonth,
        teams: [],
        appliedFilter: teamFilter || 'All Teams'
      });
    }

    // Get unique KAMs
    const uniqueKams = Array.from(
      new Map(kams.map((k: any) => [k.email, { kam_name: k.full_name, kam_email_id: k.email, team_name: k.team_name }])).values()
    );

    // Get churn data using churnService for each KAM to get accurate categorization
    const churnCategorizations = await Promise.all(
      uniqueKams.map(async (kam) => {
        try {
          // Create a mock user profile for this KAM
          const kamProfile = {
            email: kam.kam_email_id,
            fullName: kam.kam_name,
            role: 'agent',
            team_name: kam.team_name
          };
          
          // Get churn data for this KAM using the service
          const result = await churnService.getChurnData({
            userProfile: kamProfile,
            page: 1,
            limit: 10000,
            filter: 'all'
          });
          
          return {
            kam_name: kam.kam_name,
            overdue: result.categorization?.overdue || 0
          };
        } catch (err) {
          console.error(`Error getting churn data for ${kam.kam_name}:`, err);
          return {
            kam_name: kam.kam_name,
            overdue: 0
          };
        }
      })
    );
    
    const churnCountsByKam = new Map(
      churnCategorizations.map(c => [c.kam_name, c.overdue])
    );

    // Get visits this month for each KAM (any visit scheduled or completed in this month)
    let allVisits: any[] = [];
    let visitPage = 0;
    const visitPageSize = 1000;
    let hasMoreVisits = true;
    
    while (hasMoreVisits) {
      const { data: pageData, error: visitsError } = await supabase
        .from('visits')
        .select('agent_id, visit_date, scheduled_date, visit_status')
        .eq('visit_year', now.getFullYear().toString())
        .range(visitPage * visitPageSize, (visitPage + 1) * visitPageSize - 1);
      
      if (visitsError) throw visitsError;
      
      if (pageData && pageData.length > 0) {
        allVisits = [...allVisits, ...pageData];
        hasMoreVisits = pageData.length === visitPageSize;
        visitPage++;
      } else {
        hasMoreVisits = false;
      }
    }
    
    // Filter visits for current month
    const visitsData = allVisits.filter((v: any) => {
      const visitDate = v.visit_date ? v.visit_date.slice(0, 7) : null;
      const scheduledDate = v.scheduled_date ? v.scheduled_date.slice(0, 7) : null;
      return visitDate === currentMonth || scheduledDate === currentMonth;
    });

    // Get health checks done this month for each KAM (paginated)
    let healthChecks: any[] = [];
    let hcPage = 0;
    const hcPageSize = 1000;
    let hasMoreHc = true;
    while (hasMoreHc) {
      const { data: pageData, error: healthError } = await supabase
        .from('health_checks')
        .select('kam_email, assessment_date')
        .gte('assessment_date', firstDayOfMonth)
        .lte('assessment_date', lastDayOfMonth)
        .range(hcPage * hcPageSize, (hcPage + 1) * hcPageSize - 1);
      if (healthError) throw healthError;
      if (pageData && pageData.length > 0) {
        healthChecks = [...healthChecks, ...pageData];
        hasMoreHc = pageData.length === hcPageSize;
        hcPage++;
      } else {
        hasMoreHc = false;
      }
    }

    // Get demos done this month for each KAM
    const { data: demos, error: demosError } = await supabase
      .from('demos')
      .select('agent_id, demo_completed_date')
      .eq('demo_completed', true)
      .gte('demo_completed_date', firstDayOfMonth)
      .lte('demo_completed_date', lastDayOfMonth);

    if (demosError) throw demosError;

    // Get all brands assigned to each KAM (paginated to avoid Supabase 1000-row default limit)
    let allBrands: any[] = [];
    let brandsPage = 0;
    const brandsPageSize = 1000;
    let hasMoreBrands = true;
    while (hasMoreBrands) {
      const { data: pageData, error: brandsError } = await supabase
        .from('master_data')
        .select('kam_email_id, id')
        .in('kam_email_id', uniqueKams.map(k => k.kam_email_id))
        .range(brandsPage * brandsPageSize, (brandsPage + 1) * brandsPageSize - 1);
      if (brandsError) throw brandsError;
      if (pageData && pageData.length > 0) {
        allBrands = [...allBrands, ...pageData];
        hasMoreBrands = pageData.length === brandsPageSize;
        brandsPage++;
      } else {
        hasMoreBrands = false;
      }
    }

    // Build summary for each KAM
    const summary = uniqueKams.map(kam => {
      // Get overdue count from churn service categorization
      const overdueCount = churnCountsByKam.get(kam.kam_name) || 0;

      // Check if KAM did visit this month
      const hasVisit = visitsData?.some((v: any) => v.agent_id === kam.kam_email_id) || false;

      // Count health checks pending (brands assigned but not assessed)
      const healthChecksDone = healthChecks?.filter((h: any) => h.kam_email === kam.kam_email_id).length || 0;
      
      // Get total brands assigned to KAM
      const totalBrands = allBrands?.filter((b: any) => b.kam_email_id === kam.kam_email_id).length || 0;
      const healthChecksPending = Math.max(0, totalBrands - healthChecksDone);

      // Count demos done this month
      const demosDone = demos?.filter((d: any) => d.agent_id === kam.kam_email_id).length || 0;

      return {
        kam_name: kam.kam_name,
        kam_email: kam.kam_email_id,
        team_name: kam.team_name || 'N/A',
        overdue_churn_count: overdueCount,
        visit_this_month: hasVisit ? 'Yes' : 'No',
        health_checks_pending: healthChecksPending,
        demos_done_this_month: demosDone
      };
    });

    // Get all unique teams for filter dropdown
    const allTeams = Array.from(new Set(kams.map((k: any) => k.team_name).filter(Boolean)));

    return NextResponse.json({
      success: true,
      data: summary,
      month: currentMonth,
      teams: allTeams,
      appliedFilter: teamFilter || 'All Teams'
    });

  } catch (error) {
    console.error('[KAM Summary GET] Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
