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

    // Get filter parameters from query string
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const kamNames = searchParams.get('kamNames')?.split(',').filter(Boolean) || [];
    const zones = searchParams.get('zones')?.split(',').filter(Boolean) || [];
    const healthStatuses = searchParams.get('healthStatuses')?.split(',').filter(Boolean) || [];
    const natures = searchParams.get('natures')?.split(',').filter(Boolean) || [];
    const teams = searchParams.get('teams')?.split(',').filter(Boolean) || [];

    const supabase = getSupabaseAdmin();
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
    
    // Get user profiles to map KAM email to team
    let userProfiles: any[] = [];
    let page = 0;
    const pageSize = 1000;
    let hasMore = true;
    
    while (hasMore) {
      const { data: pageData, error: profileError } = await supabase
        .from('user_profiles')
        .select('email, team_name')
        .range(page * pageSize, (page + 1) * pageSize - 1);
      
      if (profileError) {
        throw new Error(`Failed to fetch user profiles: ${profileError.message}`);
      }
      
      if (pageData && pageData.length > 0) {
        userProfiles = [...userProfiles, ...pageData];
        hasMore = pageData.length === pageSize;
        page++;
      } else {
        hasMore = false;
      }
    }
    
    // Create email to team map
    const emailToTeamMap = new Map<string, string>();
    userProfiles.forEach((profile: any) => {
      emailToTeamMap.set(profile.email, profile.team_name);
    });
    
    // Get all KAMs with their brands using pagination
    let masterData: any[] = [];
    page = 0;
    hasMore = true;
    
    while (hasMore) {
      const { data: pageData, error: masterError } = await supabase
        .from('master_data')
        .select('kam_name, kam_email_id, brand_name, id')
        .range(page * pageSize, (page + 1) * pageSize - 1);
      
      if (masterError) {
        throw new Error(`Failed to fetch master data: ${masterError.message}`);
      }
      
      if (pageData && pageData.length > 0) {
        masterData = [...masterData, ...pageData];
        hasMore = pageData.length === pageSize;
        page++;
      } else {
        hasMore = false;
      }
    }
    
    // Apply filters to master data
    let filteredMasterData = masterData;
    
    // Filter by team (using email to team mapping)
    if (teams.length > 0) {
      filteredMasterData = filteredMasterData.filter(record => {
        const kamEmail = record.kam_email_id;
        const kamTeam = emailToTeamMap.get(kamEmail);
        return kamTeam && teams.includes(kamTeam);
      });
    }
    
    // Filter by KAM names
    if (kamNames.length > 0) {
      filteredMasterData = filteredMasterData.filter(record => 
        kamNames.includes(record.kam_name)
      );
    }
    
    // Get all health checks using pagination
    // Note: Only filter by date, KAM, and team - NOT by zone, health status, or nature
    // Those filters apply to the main table, not KAM summary counts
    let healthChecks: any[] = [];
    page = 0;
    hasMore = true;
    
    while (hasMore) {
      let query = supabase
        .from('health_checks')
        .select('*');
      
      // Apply only date, KAM, and team filters to health checks
      if (startDate) {
        query = query.gte('assessment_date', startDate);
      }
      if (endDate) {
        const endDateTime = new Date(endDate);
        endDateTime.setHours(23, 59, 59, 999);
        query = query.lte('assessment_date', endDateTime.toISOString());
      }
      if (kamNames.length > 0) {
        query = query.in('kam_name', kamNames);
      }
      if (teams.length > 0) {
        query = query.in('team_name', teams);
      }
      // DO NOT filter by zones, healthStatuses, or natures for KAM summary
      
      const { data: pageData, error: healthError } = await query
        .range(page * pageSize, (page + 1) * pageSize - 1);
      
      if (healthError) {
        throw new Error(`Failed to fetch health checks: ${healthError.message}`);
      }
      
      if (pageData && pageData.length > 0) {
        healthChecks = [...healthChecks, ...pageData];
        hasMore = pageData.length === pageSize;
        page++;
      } else {
        hasMore = false;
      }
    }
    
    // Group by KAM
    const kamMap = new Map<string, {
      kam_name: string;
      kam_email: string;
      total_brands: number;
      this_month_done: number;
      this_month_pending: number;
      last_month_done: number;
      last_month_pending: number;
      last_health_check_date: string | null;
    }>();
    
    // Count brands per KAM from filtered master data
    filteredMasterData.forEach((record: any) => {
      const kamName = record.kam_name;
      const kamEmail = record.kam_email_id;
      
      if (!kamName) return;
      
      if (!kamMap.has(kamName)) {
        kamMap.set(kamName, {
          kam_name: kamName,
          kam_email: kamEmail,
          total_brands: 0,
          this_month_done: 0,
          this_month_pending: 0,
          last_month_done: 0,
          last_month_pending: 0,
          last_health_check_date: null
        });
      }
      const kamData = kamMap.get(kamName)!;
      kamData.total_brands++;
    });
    
    // Count health checks per KAM
    let thisMonthCount = 0;
    let lastMonthCount = 0;
    let skippedCount = 0;
    
    healthChecks.forEach((check: any) => {
      const kamName = check.kam_name;
      
      if (!kamMap.has(kamName)) {
        skippedCount++;
        return;
      }
      
      const kamData = kamMap.get(kamName)!;
      const checkDate = new Date(check.assessment_date);
      const checkMonth = checkDate.getMonth();
      const checkYear = checkDate.getFullYear();
      
      // This month
      if (checkMonth === currentMonth && checkYear === currentYear) {
        kamData.this_month_done++;
        thisMonthCount++;
      }
      
      // Last month
      if (checkMonth === lastMonth && checkYear === lastMonthYear) {
        kamData.last_month_done++;
        lastMonthCount++;
      }
      
      // Track last health check date
      if (!kamData.last_health_check_date || new Date(check.assessment_date) > new Date(kamData.last_health_check_date)) {
        kamData.last_health_check_date = check.assessment_date;
      }
    });
    
    // Calculate pending counts
    kamMap.forEach((kamData) => {
      kamData.this_month_pending = Math.max(0, kamData.total_brands - kamData.this_month_done);
      kamData.last_month_pending = Math.max(0, kamData.total_brands - kamData.last_month_done);
    });
    
    const kamSummary = Array.from(kamMap.values()).sort((a, b) => b.total_brands - a.total_brands);
    
    return NextResponse.json({
      success: true,
      data: kamSummary,
      count: kamSummary.length
    });

  } catch (error: any) {
    console.error('❌ [Health Check KAM Summary API] Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to get health check KAM summary',
      detail: error?.message || String(error)
    }, { status: 500 });
  }
}
