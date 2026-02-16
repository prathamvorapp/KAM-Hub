import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-client';
import NodeCache from 'node-cache';

const statisticsCache = new NodeCache({ stdTTL: 180 });

/**
 * Direct Statistics Endpoint - Bypasses middleware
 * Fetches data directly from Supabase without relying on middleware headers
 */
export async function GET(request: NextRequest) {
  try {
    // Get email from query parameter instead of headers
    const email = request.nextUrl.searchParams.get('email');
    
    if (!email) {
      console.log('❌ [DIRECT STATS] No email provided in query parameter');
      return NextResponse.json({
        error: 'Email parameter required',
        usage: '/api/data/visits/direct-statistics?email=user@example.com'
      }, { status: 400 });
    }

    console.log('🔍 [DIRECT STATS] Fetching statistics for:', email);

    const cacheKey = `direct_visit_stats_${email}`;
    const cachedData = statisticsCache.get(cacheKey);
    
    if (cachedData) {
      console.log(`📈 [DIRECT STATS] Served from cache`);
      return NextResponse.json(cachedData);
    }

    const supabase = getSupabaseAdmin();
    const currentYear = new Date().getFullYear().toString();

    // STEP 1: Get user profile
    console.log('📊 [STEP 1] Fetching user profile...');
    const { data: userProfile, error: userError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('email', email)
      .single();

    if (userError || !userProfile) {
      console.error('❌ [STEP 1] User not found:', userError?.message);
      return NextResponse.json({
        success: false,
        error: 'User profile not found',
        detail: userError?.message
      }, { status: 404 });
    }

    console.log('✅ [STEP 1] User found:', {
      email: userProfile.email,
      role: userProfile.role,
      team: userProfile.team_name
    });

    // STEP 2: Get brands based on user role - fetch directly with filters
    console.log('📊 [STEP 2] Fetching brands for user role:', userProfile.role);
    
    let userBrands: any[] = [];
    let brandFilter: string[] = [];

    if (userProfile.role === 'agent' || userProfile.role === 'Agent') {
      // For agents: fetch brands directly with email filter
      const { data: agentBrands, error: brandsError } = await supabase
        .from('master_data')
        .select('*')
        .eq('kam_email_id', email)
        .limit(10000);
      
      if (brandsError) {
        console.error('❌ [STEP 2] Error fetching brands:', brandsError);
        return NextResponse.json({
          success: false,
          error: 'Failed to fetch brands',
          detail: brandsError.message
        }, { status: 500 });
      }
      
      userBrands = agentBrands || [];
      brandFilter = userBrands.map(b => b.brand_name);
      console.log('✅ [STEP 2] Agent brands found:', userBrands.length);
      
    } else if (userProfile.role === 'team_lead' || userProfile.role === 'Team Lead') {
      // For team leads: get all agents in team, then fetch their brands
      if (!userProfile.team_name) {
        return NextResponse.json({
          success: false,
          error: 'Team lead must have a team assigned'
        }, { status: 400 });
      }

      const { data: teamAgents } = await supabase
        .from('user_profiles')
        .select('email, full_name')
        .eq('team_name', userProfile.team_name)
        .in('role', ['agent', 'Agent']);

      const agentEmails = teamAgents?.map(a => a.email) || [];
      
      // Fetch brands for all team agents
      const { data: teamBrands, error: brandsError } = await supabase
        .from('master_data')
        .select('*')
        .in('kam_email_id', agentEmails)
        .limit(10000);
      
      if (brandsError) {
        console.error('❌ [STEP 2] Error fetching team brands:', brandsError);
        return NextResponse.json({
          success: false,
          error: 'Failed to fetch team brands',
          detail: brandsError.message
        }, { status: 500 });
      }
      
      userBrands = teamBrands || [];
      brandFilter = userBrands.map(b => b.brand_name);
      console.log('✅ [STEP 2] Team lead brands found:', userBrands.length);
      
    } else if (userProfile.role === 'admin' || userProfile.role === 'Admin') {
      // For admins: fetch all brands
      const { data: allBrands, error: brandsError } = await supabase
        .from('master_data')
        .select('*')
        .limit(10000);
      
      if (brandsError) {
        console.error('❌ [STEP 2] Error fetching all brands:', brandsError);
        return NextResponse.json({
          success: false,
          error: 'Failed to fetch brands',
          detail: brandsError.message
        }, { status: 500 });
      }
      
      userBrands = allBrands || [];
      brandFilter = userBrands.map(b => b.brand_name);
      console.log('✅ [STEP 2] Admin - all brands:', userBrands.length);
    }

    // STEP 4: Get visits for current year
    console.log('📊 [STEP 4] Fetching visits for year:', currentYear);
    
    let visitQuery = supabase
      .from('visits')
      .select('*')
      .eq('visit_year', currentYear);

    // Apply role-based filtering on visits table
    if (userProfile.role === 'agent' || userProfile.role === 'Agent') {
      visitQuery = visitQuery.eq('agent_id', email);
    } else if (userProfile.role === 'team_lead' || userProfile.role === 'Team Lead') {
      visitQuery = visitQuery.eq('team_name', userProfile.team_name);
    }

    const { data: allVisits, error: visitsError } = await visitQuery;

    if (visitsError) {
      console.error('❌ [STEP 4] Error fetching visits:', visitsError);
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch visits',
        detail: visitsError.message
      }, { status: 500 });
    }

    console.log('✅ [STEP 4] Total visits found:', allVisits?.length || 0);

    // Filter visits by user's brands
    const visits = brandFilter.length > 0
      ? allVisits?.filter(visit => brandFilter.includes(visit.brand_name)) || []
      : allVisits || [];

    console.log('✅ [STEP 4] Visits for user brands:', visits.length);

    // STEP 5: Calculate statistics
    const total_brands = userBrands.length;
    const nonCancelledVisits = visits.filter(v => v.visit_status !== 'Cancelled');
    
    // Visit Done should only count brands with MOM approved visits
    const brandsWithApprovedMOM = new Set(
      nonCancelledVisits
        .filter(v => v.visit_status === 'Completed' && v.approval_status === 'Approved')
        .map(visit => visit.brand_name)
    );
    const visit_done = brandsWithApprovedMOM.size;
    const pending_visits = total_brands - visit_done;
    
    const brandsWithVisits = new Set(nonCancelledVisits.map(visit => visit.brand_name));
    const brands_with_visits = brandsWithVisits.size;
    const brands_pending = total_brands - visit_done;

    const completed = nonCancelledVisits.filter(v => v.visit_status === 'Completed').length;
    const cancelled = visits.filter(v => v.visit_status === 'Cancelled').length;
    const scheduled = nonCancelledVisits.filter(v => v.visit_status === 'Scheduled').length;

    const mom_shared_yes = nonCancelledVisits.filter(v => v.mom_shared === 'Yes').length;
    const mom_shared_no = nonCancelledVisits.filter(v => v.mom_shared === 'No').length;
    const mom_shared_pending = nonCancelledVisits.filter(v => v.mom_shared === 'Pending' || !v.mom_shared).length;

    const approved = nonCancelledVisits.filter(v => v.approval_status === 'Approved').length;
    const rejected = nonCancelledVisits.filter(v => v.approval_status === 'Rejected').length;
    const pending_approval = nonCancelledVisits.filter(v => v.approval_status === 'Pending' || !v.approval_status).length;

    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYearNum = currentDate.getFullYear();
    
    const currentMonthVisits = nonCancelledVisits.filter(visit => {
      const visitDate = new Date(visit.scheduled_date);
      return visitDate.getMonth() === currentMonth && visitDate.getFullYear() === currentYearNum;
    });
    
    const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const lastMonthYear = currentMonth === 0 ? currentYearNum - 1 : currentYearNum;
    const lastMonthVisits = nonCancelledVisits.filter(visit => {
      const visitDate = new Date(visit.scheduled_date);
      return visitDate.getMonth() === lastMonth && visitDate.getFullYear() === lastMonthYear;
    });

    const monthly_target = 10;
    const current_month_scheduled = currentMonthVisits.filter(v => v.visit_status === 'Scheduled').length;
    const current_month_completed = currentMonthVisits.filter(v => v.visit_status === 'Completed').length;
    const current_month_total_visits = current_month_scheduled + current_month_completed;
    const current_month_progress = monthly_target > 0 ? Math.round((current_month_total_visits / monthly_target) * 100) : 0;
    const overall_progress = total_brands > 0 ? Math.round((brands_with_visits / total_brands) * 100) : 0;

    const statistics = {
      total_brands,
      visit_done,
      pending: pending_visits,
      completed,
      cancelled,
      scheduled,
      brands_with_visits,
      brands_pending,
      total_visits_done: visit_done,
      total_visits_pending: pending_visits,
      total_scheduled_visits: scheduled,
      total_cancelled_visits: cancelled,
      last_month_visits: lastMonthVisits.length,
      current_month_scheduled,
      current_month_completed,
      current_month_total: currentMonthVisits.length,
      current_month_total_visits,
      mom_shared_yes,
      mom_shared_no,
      mom_shared_pending,
      mom_pending: mom_shared_pending,
      approved,
      rejected,
      pending_approval,
      monthly_target,
      current_month_progress,
      overall_progress
    };

    console.log('✅ [DIRECT STATS] Statistics calculated:', {
      total_brands: statistics.total_brands,
      visit_done: statistics.visit_done,
      brands_with_visits: statistics.brands_with_visits
    });

    const response = {
      success: true,
      data: statistics,
      metadata: {
        user_email: email,
        user_role: userProfile.role,
        user_team: userProfile.team_name,
        query_year: currentYear,
        fetched_at: new Date().toISOString()
      }
    };

    statisticsCache.set(cacheKey, response);

    return NextResponse.json(response);

  } catch (error: any) {
    console.error('❌ [DIRECT STATS] Fatal error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to load visit statistics',
      detail: error.message || String(error),
      stack: error.stack
    }, { status: 500 });
  }
}
