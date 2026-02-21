import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/api-auth';
import { visitService } from '@/lib/services';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { adminStatsCache } from '@/lib/cache/health-check-cache';

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

    const cacheKey = `admin_visit_stats_${user.email}`;
    const cachedData = adminStatsCache.get(cacheKey);
    
    if (cachedData) {
      console.log(`📈 Admin visit statistics served from cache`);
      return NextResponse.json(cachedData);
    }

    console.log(`📊 Getting admin visit statistics for all agents`);

    const supabase = getSupabaseAdmin();

    // Get all active agents (handle both 'agent' and 'Agent' role values)
    const { data: agents, error: agentsError } = await supabase
      .from('user_profiles')
      .select('email, full_name, team_name, role')
      .in('role', ['agent', 'Agent'])
      .eq('is_active', true);

    if (agentsError) {
      throw new Error(`Failed to fetch agents: ${agentsError.message}`);
    }

    console.log(`📊 Found ${agents?.length || 0} active agents`);

    // Type assertion for agents
    type AgentProfile = {
      email: string;
      full_name: string;
      team_name: string;
      role: string;
    };

    // Get statistics for each agent
    const agentStatistics = [];
    const agentWiseBreakdown = [];

    for (const agent of (agents as AgentProfile[]) || []) {
      try {
        // Create a proper UserProfile object for the agent
        const agentProfile = {
          email: agent.email,
          fullName: agent.full_name,
          role: agent.role,
          team_name: agent.team_name
        };
        
        const stats = await visitService._getIndividualAgentStatistics(agentProfile);
        
        agentStatistics.push({
          agent_name: agent.full_name,
          agent_email: agent.email,
          team_name: agent.team_name || 'No Team',
          total_brands: stats.total_brands || 0,
          total_visits_done: stats.total_visits_done || 0,
          total_visits_pending: stats.total_visits_pending || 0,
          total_scheduled_visits: stats.total_scheduled_visits || 0,
          total_cancelled_visits: stats.total_cancelled_visits || 0,
          last_month_visits: stats.last_month_visits || 0,
          current_month_scheduled: stats.current_month_scheduled || 0,
          current_month_completed: stats.current_month_completed || 0,
          current_month_total: stats.current_month_total || 0,
          current_month_total_visits: stats.current_month_total_visits || 0,
          mom_pending: stats.mom_pending || 0,
          monthly_target: stats.monthly_target || 10,
          current_month_progress: stats.current_month_progress || 0,
          overall_progress: stats.overall_progress || 0
        });

        agentWiseBreakdown.push({
          agent_name: agent.full_name,
          agent_email: agent.email,
          team_name: agent.team_name || 'No Team',
          role: agent.role,
          brands_assigned: stats.total_brands || 0,
          visits_completed: stats.total_visits_done || 0,
          visits_pending: stats.total_visits_pending || 0,
          visits_scheduled: stats.total_scheduled_visits || 0,
          visits_cancelled: stats.total_cancelled_visits || 0,
          mom_pending: stats.mom_pending || 0,
          current_month_completed: stats.current_month_completed || 0,
          current_month_scheduled: stats.current_month_scheduled || 0,
          current_month_total: stats.current_month_total || 0,
          current_month_total_visits: stats.current_month_total_visits || 0,
          monthly_target: stats.monthly_target || 10,
          current_month_progress: stats.current_month_progress || 0,
          overall_progress: stats.overall_progress || 0,
          last_month_visits: stats.last_month_visits || 0,
          performance_rating: (stats.current_month_completed || 0) >= 10 ? 'Excellent' : (stats.current_month_completed || 0) >= 5 ? 'Good' : 'Needs Improvement',
          completion_rate: (stats.total_brands || 0) > 0 ? ((stats.total_visits_done || 0) / stats.total_brands) * 100 : 0
        });
      } catch (error) {
        console.error(`❌ Error getting stats for agent ${agent.email}:`, error);
        // Add error entry so we know this agent had issues
        agentStatistics.push({
          agent_name: agent.full_name,
          agent_email: agent.email,
          team_name: agent.team_name || 'No Team',
          total_brands: 0,
          total_visits_done: 0,
          total_visits_pending: 0,
          total_scheduled_visits: 0,
          total_cancelled_visits: 0,
          last_month_visits: 0,
          current_month_scheduled: 0,
          current_month_completed: 0,
          current_month_total: 0,
          current_month_total_visits: 0,
          mom_pending: 0,
          monthly_target: 2,
          current_month_progress: 0,
          overall_progress: 0,
          error: true
        });
      }
    }

    // Get all brands to calculate actual total
    const { data: allBrandsData, error: allBrandsError } = await supabase
      .from('master_data')
      .select('brand_name');

    if (allBrandsError) {
      console.error('❌ Error fetching all brands:', allBrandsError);
    }

    // Type assertion for brands
    type BrandData = { brand_name: string };

    // Count distinct brand names (excluding null/empty)
    const uniqueBrands = new Set(
      (allBrandsData as BrandData[])
        ?.filter(b => b.brand_name && b.brand_name.trim() !== '')
        .map(b => b.brand_name)
    );
    const actualTotalBrands = uniqueBrands.size;

    console.log(`📊 Actual total brands in system: ${actualTotalBrands}`);
    console.log(`📊 Brands assigned to agents: ${agentStatistics.reduce((sum, agent) => sum + agent.total_brands, 0)}`);

    // Calculate organization summary
    const organizationSummary = {
      total_agents: agents?.length || 0,
      total_brands: actualTotalBrands, // Use actual total brands, not sum of agent brands
      total_visits_done: agentStatistics.reduce((sum, agent) => sum + (agent.total_visits_done || 0), 0),
      total_visits_pending: agentStatistics.reduce((sum, agent) => sum + (agent.total_visits_pending || 0), 0),
      total_scheduled: agentStatistics.reduce((sum, agent) => sum + (agent.total_scheduled_visits || 0), 0),
      total_cancelled: agentStatistics.reduce((sum, agent) => sum + (agent.total_cancelled_visits || 0), 0),
      total_mom_pending: agentStatistics.reduce((sum, agent) => sum + (agent.mom_pending || 0), 0),
      current_month_completed: agentStatistics.reduce((sum, agent) => sum + (agent.current_month_completed || 0), 0),
      current_month_target: (agents?.length || 0) * 10,
      organization_progress: agents?.length ? (agentStatistics.reduce((sum, agent) => sum + (agent.current_month_completed || 0), 0) / ((agents?.length || 1) * 10)) * 100 : 0
    };

    const response = {
      success: true,
      agent_statistics: agentStatistics,
      agent_wise_breakdown: agentWiseBreakdown,
      organization_summary: organizationSummary
    };

    adminStatsCache.set(cacheKey, response);

    return NextResponse.json(response);

  } catch (error) {
    console.error('[Admin Visit Statistics] Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
