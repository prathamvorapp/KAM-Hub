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

    const supabase = getSupabaseAdmin();
    const currentYear = new Date().getFullYear().toString();
    
    console.log('🔍 [KAM Summary] Fetching data for year:', currentYear);
    
    // Target: 2 visits per brand from March 2026 to Feb 2027
    const targetStartDate = new Date('2026-03-01');
    const targetEndDate = new Date('2027-02-28');
    const monthsInPeriod = 12;
    
    // Get all KAMs with their brands using pagination
    let masterData: any[] = [];
    let page = 0;
    const pageSize = 1000;
    let hasMore = true;
    
    while (hasMore) {
      const { data: pageData, error: masterError } = await supabase
        .from('master_data')
        .select('id, kam_name, kam_email_id, brand_name')
        .range(page * pageSize, (page + 1) * pageSize - 1);
      
      if (masterError) {
        console.error('❌ [KAM Summary] Error fetching master data:', masterError);
        throw new Error(`Failed to fetch master data: ${masterError.message}`);
      }
      
      if (pageData && pageData.length > 0) {
        masterData = [...masterData, ...pageData];
        console.log(`📊 [KAM Summary] Page ${page + 1}: fetched ${pageData.length} records (Total: ${masterData.length})`);
        hasMore = pageData.length === pageSize;
        page++;
      } else {
        hasMore = false;
      }
    }
    
    console.log(`✅ [KAM Summary] Finished loading ${masterData.length} master data records`);
    
    // Get all visits for current year using pagination
    let visits: any[] = [];
    page = 0;
    hasMore = true;
    
    while (hasMore) {
      const { data: pageData, error: visitsError } = await supabase
        .from('visits')
        .select('*')
        .eq('visit_year', currentYear)
        .range(page * pageSize, (page + 1) * pageSize - 1);
      
      if (visitsError) {
        console.error('❌ [KAM Summary] Error fetching visits:', visitsError);
        throw new Error(`Failed to fetch visits: ${visitsError.message}`);
      }
      
      if (pageData && pageData.length > 0) {
        visits = [...visits, ...pageData];
        console.log(`📊 [KAM Summary] Visits Page ${page + 1}: fetched ${pageData.length} records (Total: ${visits.length})`);
        hasMore = pageData.length === pageSize;
        page++;
      } else {
        hasMore = false;
      }
    }
    
    console.log(`✅ [KAM Summary] Finished loading ${visits.length} visits`);
    
    // Get user profiles to get team names using pagination
    let userProfiles: any[] = [];
    page = 0;
    hasMore = true;
    
    while (hasMore) {
      const { data: pageData, error: profilesError } = await supabase
        .from('user_profiles')
        .select('email, team_name')
        .range(page * pageSize, (page + 1) * pageSize - 1);
      
      if (profilesError) {
        console.error('❌ [KAM Summary] Error fetching user profiles:', profilesError);
        throw new Error(`Failed to fetch user profiles: ${profilesError.message}`);
      }
      
      if (pageData && pageData.length > 0) {
        userProfiles = [...userProfiles, ...pageData];
        console.log(`📊 [KAM Summary] Profiles Page ${page + 1}: fetched ${pageData.length} records (Total: ${userProfiles.length})`);
        hasMore = pageData.length === pageSize;
        page++;
      } else {
        hasMore = false;
      }
    }
    
    console.log(`✅ [KAM Summary] Finished loading ${userProfiles.length} user profiles`);
    
    // Create a map of email to team_name
    const emailToTeamMap = new Map<string, string>();
    userProfiles.forEach((profile: any) => {
      emailToTeamMap.set(profile.email, profile.team_name);
    });
    
    // Group by KAM
    const kamMap = new Map<string, {
      kam_name: string;
      kam_email: string;
      team_name: string;
      total_brands: number;
      scheduled_visits: number;
      completed_visits: number;
      pending_visits: number;
      avg_per_month: number;
      last_visit_date: string | null;
    }>();
    
    // Track brand IDs per KAM to avoid double-counting on name changes
    const kamBrandIds = new Map<string, Set<string>>();

    // Count brands per KAM using brand id (UUID)
    masterData.forEach((record: any) => {
      const kamEmail = record.kam_email_id;
      if (!kamMap.has(kamEmail)) {
        kamMap.set(kamEmail, {
          kam_name: record.kam_name,
          kam_email: kamEmail,
          team_name: emailToTeamMap.get(kamEmail) || '',
          total_brands: 0,
          scheduled_visits: 0,
          completed_visits: 0,
          pending_visits: 0,
          avg_per_month: 0,
          last_visit_date: null
        });
        kamBrandIds.set(kamEmail, new Set());
      }
      if (record.id) {
        kamBrandIds.get(kamEmail)!.add(record.id);
      }
    });

    // Set total_brands from unique brand IDs
    kamBrandIds.forEach((brandIds, kamEmail) => {
      const kamData = kamMap.get(kamEmail);
      if (kamData) kamData.total_brands = brandIds.size;
    });
    
    // Count visits per KAM and track last visit date
    visits.forEach((visit: any) => {
      const kamEmail = visit.agent_id;
      if (kamMap.has(kamEmail)) {
        const kamData = kamMap.get(kamEmail)!;
        
        if (visit.visit_status === 'Scheduled' && visit.visit_status !== 'Cancelled') {
          kamData.scheduled_visits++;
        }
        
        if (visit.visit_status === 'Completed' && visit.approval_status === 'Approved') {
          kamData.completed_visits++;
          
          // Update last visit date
          if (!kamData.last_visit_date || new Date(visit.visit_date) > new Date(kamData.last_visit_date)) {
            kamData.last_visit_date = visit.visit_date;
          }
        }
      }
    });
    
    // Calculate pending visits and avg per month
    kamMap.forEach((kamData) => {
      const targetVisits = kamData.total_brands * 2; // 2 visits per brand per year
      const completedVisits = kamData.completed_visits;
      kamData.pending_visits = Math.max(0, targetVisits - completedVisits);
      
      // Calculate average visits needed per month to achieve target (rounded up)
      kamData.avg_per_month = Math.ceil(kamData.pending_visits / monthsInPeriod);
    });
    
    const kamSummary = Array.from(kamMap.values());
    
    console.log(`✅ [KAM Summary] Returning ${kamSummary.length} KAM records`);
    
    return NextResponse.json({
      success: true,
      data: kamSummary,
      count: kamSummary.length
    });

  } catch (error: any) {
    console.error('❌ [KAM Summary API] Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to get KAM summary',
      detail: error?.message || String(error)
    }, { status: 500 });
  }
}
