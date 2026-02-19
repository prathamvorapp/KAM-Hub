import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/api-auth';
import { visitService } from '@/lib/services';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import NodeCache from 'node-cache';

const teamSummaryCache = new NodeCache({ stdTTL: 300 });

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

    // Check if user is Team Lead or Admin (case-insensitive)
    const normalizedRole = user.role.toLowerCase().replace(/\s+/g, '_');
    if (normalizedRole !== 'team_lead' && normalizedRole !== 'admin') {
      return NextResponse.json({
        success: false,
        error: 'Access denied - Team Lead or Admin only'
      }, { status: 403 });
    }

    const cacheKey = `team_visit_summary_${user.email}_${user.role}`;
    const cachedData = teamSummaryCache.get(cacheKey);
    
    if (cachedData) {
      console.log(`📈 Team visit summary served from cache for ${user.role}`);
      return NextResponse.json(cachedData);
    }

    console.log(`📊 Getting team visit summary for: ${user.email} (${user.role})`);

    const supabase = getSupabaseAdmin();
    const currentYear = new Date().getFullYear().toString();

    let agents: any[] = [];
    let agentEmails: string[] = [];
    let teamName = '';
    let teamLead = '';
    let allVisits: any[] = [];

    if (user.role === 'Admin') {
      // Admin sees ALL agents across the organization
      console.log('👑 Admin - fetching all agents');
      
      const { data: allAgents, error: agentsError } = await supabase
        .from('user_profiles')
        .select('email, full_name, team_name')
        .in('role', ['agent', 'Agent'])
        .eq('is_active', true);

      if (agentsError) {
        throw new Error(`Failed to fetch agents: ${agentsError.message}`);
      }

      agents = allAgents || [];
      agentEmails = agents.map(a => a.email);
      teamName = 'All Teams';
      teamLead = 'Admin';

      // Get ALL visits for current year (no team filter)
      const { data: visits, error: visitsError } = await supabase
        .from('visits')
        .select('visit_status, approval_status, agent_id, scheduled_date')
        .eq('visit_year', currentYear);

      if (visitsError) {
        throw new Error(`Failed to fetch visits: ${visitsError.message}`);
      }

      allVisits = visits || [];

    } else {
      // Team Lead - get their team data
      console.log('👥 Team Lead - fetching team data');
      
      const { data: userProfile, error: profileError } = await supabase
        .from('user_profiles')
        .select('team_name, full_name')
        .eq('email', user.email)
        .single();

      // Type assertion for user profile
      type UserProfile = {
        team_name: string;
        full_name: string;
      };

      if (profileError || !(userProfile as UserProfile)?.team_name) {
        throw new Error('Team lead must have a team assigned');
      }

      teamName = (userProfile as UserProfile).team_name;
      teamLead = (userProfile as UserProfile).full_name;

      // Get all agents in the team
      const { data: teamAgents, error: agentsError } = await supabase
        .from('user_profiles')
        .select('email, full_name')
        .eq('team_name', teamName)
        .in('role', ['agent', 'Agent'])
        .eq('is_active', true);

      if (agentsError) {
        throw new Error(`Failed to fetch team agents: ${agentsError.message}`);
      }

      agents = teamAgents || [];
      agentEmails = agents.map(a => a.email);

      // Get visits for the team
      const { data: visits, error: visitsError } = await supabase
        .from('visits')
        .select('visit_status, approval_status, agent_id, scheduled_date')
        .eq('team_name', teamName)
        .eq('visit_year', currentYear);

      if (visitsError) {
        throw new Error(`Failed to fetch team visits: ${visitsError.message}`);
      }

      allVisits = visits || [];
    }

    const totalAgents = agents.length;

    // Get brands assigned to agents
    const { data: brandsData, error: brandsError } = await supabase
      .from('master_data')
      .select('brand_name')
      .in('kam_email_id', agentEmails);

    if (brandsError) {
      throw new Error(`Failed to fetch brands: ${brandsError.message}`);
    }

    // Type assertion for brands
    type BrandData = { brand_name: string };

    const uniqueBrands = new Set(
      (brandsData as BrandData[])
        ?.filter(b => b.brand_name && b.brand_name.trim() !== '')
        .map(b => b.brand_name)
    );
    const totalBrands = uniqueBrands.size;

    // Calculate visit statistics
    const totalVisitsDone = allVisits.filter(v => 
      v.visit_status === 'Completed' && v.approval_status === 'Approved'
    ).length;

    const totalVisitsPending = allVisits.filter(v => 
      v.visit_status === 'Scheduled'
    ).length;

    const totalMomPending = allVisits.filter(v => 
      v.visit_status === 'Completed' && 
      (!v.approval_status || v.approval_status === 'Pending')
    ).length;

    // Get current month visits
    const currentMonth = new Date().getMonth() + 1;
    const currentMonthStart = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`;
    const nextMonth = currentMonth === 12 ? 1 : currentMonth + 1;
    const nextMonthYear = currentMonth === 12 ? parseInt(currentYear) + 1 : currentYear;
    const currentMonthEnd = `${nextMonthYear}-${String(nextMonth).padStart(2, '0')}-01`;

    const currentMonthVisits = allVisits.filter(v => 
      v.scheduled_date >= currentMonthStart && v.scheduled_date < currentMonthEnd
    );

    const totalCurrentMonthCompleted = currentMonthVisits.filter(v => 
      v.visit_status === 'Completed' && v.approval_status === 'Approved'
    ).length;

    // Calculate monthly target (2 visits per agent per month)
    const totalMonthlyTarget = totalAgents * 2;

    // Calculate agent performance
    let agentsAtTarget = 0;
    let agentsAbove80 = 0;
    let agentsNeedingAttention = 0;

    for (const agent of agents) {
      const agentMonthVisits = currentMonthVisits.filter(v => 
        v.agent_id === agent.email &&
        v.visit_status === 'Completed' && 
        v.approval_status === 'Approved'
      ).length;

      const agentProgress = (agentMonthVisits / 2) * 100;

      if (agentProgress >= 100) {
        agentsAtTarget++;
      } else if (agentProgress >= 80) {
        agentsAbove80++;
      } else if (agentProgress < 40) {
        agentsNeedingAttention++;
      }
    }

    const teamProgress = totalMonthlyTarget > 0 
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
      teamProgress,
      teamName,
      teamLead
    };

    const response = {
      success: true,
      summary
    };

    teamSummaryCache.set(cacheKey, response);

    return NextResponse.json(response);

  } catch (error) {
    console.error('[Team Visit Summary] Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
