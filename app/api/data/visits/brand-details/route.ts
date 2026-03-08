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

    const { searchParams } = new URL(request.url);
    const kamFilter = searchParams.get('kam');
    const statusFilter = searchParams.get('status');
    const teamFilter = searchParams.get('team');
    const scheduledStartDate = searchParams.get('scheduledStartDate');
    const scheduledEndDate = searchParams.get('scheduledEndDate');
    const completedStartDate = searchParams.get('completedStartDate');
    const completedEndDate = searchParams.get('completedEndDate');

    const supabase = getSupabaseAdmin();
    const currentYear = new Date().getFullYear().toString();
    
    console.log('🔍 [Brand Details] Fetching with filters:', { 
      kamFilter, 
      statusFilter, 
      teamFilter, 
      scheduledStartDate, 
      scheduledEndDate,
      completedStartDate,
      completedEndDate
    });
    
    // Get visits from visits table using pagination
    let visits: any[] = [];
    let page = 0;
    const pageSize = 1000;
    let hasMore = true;
    
    while (hasMore) {
      let visitQuery = supabase
        .from('visits')
        .select('*')
        .eq('visit_year', currentYear)
        .range(page * pageSize, (page + 1) * pageSize - 1);
      
      if (kamFilter && kamFilter !== 'all') {
        visitQuery = visitQuery.eq('agent_id', kamFilter);
      }
      
      if (statusFilter && statusFilter !== 'all') {
        visitQuery = visitQuery.eq('visit_status', statusFilter);
      }
      
      if (scheduledStartDate) {
        visitQuery = visitQuery.gte('scheduled_date', scheduledStartDate);
      }
      
      if (scheduledEndDate) {
        visitQuery = visitQuery.lte('scheduled_date', scheduledEndDate);
      }
      
      if (completedStartDate) {
        visitQuery = visitQuery.gte('visit_date', completedStartDate);
      }
      
      if (completedEndDate) {
        visitQuery = visitQuery.lte('visit_date', completedEndDate);
      }
      
      const { data: pageData, error: visitsError } = await visitQuery;
      
      if (visitsError) {
        console.error('❌ [Brand Details] Error fetching visits:', visitsError);
        throw new Error(`Failed to fetch visits: ${visitsError.message}`);
      }
      
      if (pageData && pageData.length > 0) {
        visits = [...visits, ...pageData];
        console.log(`📊 [Brand Details] Page ${page + 1}: fetched ${pageData.length} visits (Total: ${visits.length})`);
        hasMore = pageData.length === pageSize;
        page++;
      } else {
        hasMore = false;
      }
    }
    
    console.log(`✅ [Brand Details] Finished loading ${visits.length} visits`);
    
    if (!visits) {
      console.error('❌ [Brand Details] No visits data returned');
      throw new Error('No visits data returned');
    }
    
    console.log(`✅ [Brand Details] Found ${visits.length} visits`);
    
    // Get user profiles to get KAM names and team names using pagination
    let userProfiles: any[] = [];
    page = 0;
    hasMore = true;
    
    while (hasMore) {
      const { data: pageData, error: profilesError } = await supabase
        .from('user_profiles')
        .select('email, full_name, team_name')
        .range(page * pageSize, (page + 1) * pageSize - 1);
      
      if (profilesError) {
        console.error('❌ [Brand Details] Error fetching user profiles:', profilesError);
        throw new Error(`Failed to fetch user profiles: ${profilesError.message}`);
      }
      
      if (pageData && pageData.length > 0) {
        userProfiles = [...userProfiles, ...pageData];
        hasMore = pageData.length === pageSize;
        page++;
      } else {
        hasMore = false;
      }
    }
    
    console.log(`✅ [Brand Details] Found ${userProfiles.length} user profiles`);
    
    // Create maps for email to name and team
    const emailToNameMap = new Map<string, string>();
    const emailToTeamMap = new Map<string, string>();
    userProfiles.forEach((profile: any) => {
      emailToNameMap.set(profile.email, profile.full_name);
      emailToTeamMap.set(profile.email, profile.team_name);
    });
    
    // Build result from visits
    let result = visits.map((visit: any) => {
      const kamName = emailToNameMap.get(visit.agent_id) || visit.agent_id;
      const teamName = emailToTeamMap.get(visit.agent_id) || '';
      
      return {
        visit_id: visit.visit_id,
        brand_name: visit.brand_name,
        kam_name: kamName,
        kam_email: visit.agent_id,
        team_name: teamName,
        visit_status: visit.visit_status,
        scheduled_date: visit.scheduled_date,
        completed_date: visit.visit_date,
        approval_status: visit.approval_status
      };
    }) || [];
    
    // Apply team filter
    if (teamFilter && teamFilter !== 'all') {
      result = result.filter((item: any) => item.team_name === teamFilter);
    }
    
    console.log(`✅ [Brand Details] Returning ${result.length} records`);
    
    return NextResponse.json({
      success: true,
      data: result,
      count: result.length
    });

  } catch (error: any) {
    console.error('❌ [Brand Details API] Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to get brand details',
      detail: error?.message || String(error)
    }, { status: 500 });
  }
}
