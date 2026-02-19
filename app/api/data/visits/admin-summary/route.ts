import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/api-auth';
import { visitService } from '@/lib/services';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import NodeCache from 'node-cache';

const adminSummaryCache = new NodeCache({ stdTTL: 300 });

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

    // Check if user is Admin (case-insensitive)
    const normalizedRole = user.role.toLowerCase().replace(/\s+/g, '_');
    if (normalizedRole !== 'admin') {
      return NextResponse.json({
        success: false,
        error: 'Access denied - Admin only'
      }, { status: 403 });
    }

    const cacheKey = `admin_visit_summary_${user.email}`;
    const cachedData = adminSummaryCache.get(cacheKey);
    
    if (cachedData) {
      console.log(`📈 Admin visit summary served from cache`);
      return NextResponse.json(cachedData);
    }

    console.log(`📊 Getting admin visit summary`);

    const supabase = getSupabaseAdmin();

    // Get all active agents (handle both 'agent' and 'Agent' role values)
    const { data: agents, error: agentsError } = await supabase
      .from('user_profiles')
      .select('email, full_name, team_name')
      .in('role', ['agent', 'Agent'])
      .eq('is_active', true);

    if (agentsError) {
      throw new Error(`Failed to fetch agents: ${agentsError.message}`);
    }

    // Type assertion for agents
    type AgentProfile = {
      email: string;
      full_name: string;
      team_name: string;
    };

    const totalAgents = agents?.length || 0;

    // Get all brands (count distinct brand names to avoid duplicates)
    const { data: brandsData, error: brandsError } = await supabase
      .from('master_data')
      .select('brand_name');

    if (brandsError) {
      throw new Error(`Failed to fetch brands: ${brandsError.message}`);
    }

    // Type assertion for brands
    type BrandData = { brand_name: string };

    // Count distinct brand names (excluding null/empty)
    const uniqueBrands = new Set(
      (brandsData as BrandData[])
        ?.filter(b => b.brand_name && b.brand_name.trim() !== '')
        .map(b => b.brand_name)
    );
    const totalBrands = uniqueBrands.size;

    console.log(`📊 Total brands: ${totalBrands} (from ${brandsData?.length || 0} records)`);

    // Get all visits for the current year
    const currentYear = new Date().getFullYear().toString();
    const { data: allVisits, error: visitsError } = await supabase
      .from('visits')
      .select('visit_status, approval_status, visit_year, agent_id')
      .eq('visit_year', currentYear);

    if (visitsError) {
      throw new Error(`Failed to fetch visits: ${visitsError.message}`);
    }

    // Type assertion for visits
    type VisitData = {
      visit_status: string;
      approval_status: string;
      visit_year?: string;
      agent_id: string;
      scheduled_date?: string;
    };

    // Calculate visit statistics
    const totalVisitsDone = (allVisits as VisitData[])?.filter(v => 
      v.visit_status === 'Completed' && v.approval_status === 'Approved'
    ).length || 0;

    const totalVisitsPending = (allVisits as VisitData[])?.filter(v => 
      v.visit_status === 'Scheduled'
    ).length || 0;

    const totalMomPending = (allVisits as VisitData[])?.filter(v => 
      v.visit_status === 'Completed' && 
      (!v.approval_status || v.approval_status === 'Pending')
    ).length || 0;

    // Get current month visits
    const currentMonth = new Date().getMonth() + 1;
    const currentMonthStart = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`;
    const nextMonth = currentMonth === 12 ? 1 : currentMonth + 1;
    const nextMonthYear = currentMonth === 12 ? parseInt(currentYear) + 1 : currentYear;
    const currentMonthEnd = `${nextMonthYear}-${String(nextMonth).padStart(2, '0')}-01`;

    const { data: currentMonthVisits, error: monthVisitsError } = await supabase
      .from('visits')
      .select('visit_status, approval_status, scheduled_date')
      .gte('scheduled_date', currentMonthStart)
      .lt('scheduled_date', currentMonthEnd);

    if (monthVisitsError) {
      throw new Error(`Failed to fetch current month visits: ${monthVisitsError.message}`);
    }

    const totalCurrentMonthCompleted = (currentMonthVisits as VisitData[])?.filter(v => 
      v.visit_status === 'Completed' && v.approval_status === 'Approved'
    ).length || 0;

    // Calculate monthly target (2 visits per agent per month)
    const totalMonthlyTarget = totalAgents * 2;

    // Calculate agent performance
    let agentsAtTarget = 0;
    let agentsAbove80 = 0;
    let agentsNeedingAttention = 0;

    for (const agent of (agents as AgentProfile[]) || []) {
      const agentMonthVisits = (currentMonthVisits as VisitData[])?.filter(v => 
        v.agent_id === agent.email &&
        v.visit_status === 'Completed' && 
        v.approval_status === 'Approved'
      ).length || 0;

      const agentProgress = (agentMonthVisits / 2) * 100; // 2 is the monthly target per agent

      if (agentProgress >= 100) {
        agentsAtTarget++;
      } else if (agentProgress >= 80) {
        agentsAbove80++;
      } else if (agentProgress < 40) {
        agentsNeedingAttention++;
      }
    }

    const organizationProgress = totalMonthlyTarget > 0 
      ? (totalCurrentMonthCompleted / totalMonthlyTarget) * 100 
      : 0;

    const summary = {
      totalAgents,
      totalBrands,
      totalVisitsDone,
      totalVisitsPending,
      totalCurrentMonthCompleted,
      totalMonthlyTarget,
      totalMomPending,
      agentsAtTarget,
      agentsAbove80,
      agentsNeedingAttention,
      organizationProgress
    };

    const response = {
      success: true,
      summary
    };

    adminSummaryCache.set(cacheKey, response);

    return NextResponse.json(response);

  } catch (error) {
    console.error('[Admin Visit Summary] Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
