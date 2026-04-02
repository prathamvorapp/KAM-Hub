import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/api-auth';
import { getSupabaseAdmin } from '@/lib/supabase-server';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

interface Demo {
  _id: string;
  demo_id: string;
  brand_name: string;
  brand_id: string;
  product_name: string;
  agent_id: string;
  agent_name: string;
  team_name?: string;
  current_status: string;
  workflow_completed: boolean;
  conversion_status?: string;
}

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

    const normalizedRole = user.role.toLowerCase().replace(/\s+/g, '_');
    
    // Only Team Leads and Admins can access agent-wise statistics
    if (normalizedRole !== 'team_lead' && normalizedRole !== 'admin') {
      return NextResponse.json({
        success: false,
        error: 'Access denied. Only Team Leads and Admins can view agent-wise statistics.'
      }, { status: 403 });
    }

    console.log(`📊 Getting agent-wise demo statistics for: ${user.email} (${user.role})`);
    console.log(`📊 Team Name: ${user.team_name || user.teamName || 'N/A'}`);

    // Get all demos based on role - fetch in batches to avoid limits
    console.log(`📊 Fetching all demos in batches...`);
    
    let allDemos: Demo[] = [];
    let from = 0;
    const batchSize = 1000;
    let hasMore = true;
    
    while (hasMore) {
      let query = getSupabaseAdmin().from('demos').select('*', { count: 'exact' });
      
      if (normalizedRole === 'team_lead') {
        const teamName = user.team_name || user.teamName;
        if (teamName) {
          query = query.eq('team_name', teamName);
        } else {
          query = query.eq('agent_id', 'NON_EXISTENT_EMAIL');
        }
      }
      
      const { data: batch, error: batchError, count } = await query
        .range(from, from + batchSize - 1) as { data: Demo[] | null; error: any; count: number | null };
      
      if (batchError) {
        console.error('❌ Error fetching demos batch:', batchError);
        return NextResponse.json({
          success: false,
          error: 'Failed to fetch demos'
        }, { status: 500 });
      }
      
      if (batch && batch.length > 0) {
        allDemos = allDemos.concat(batch);
        from += batchSize;
        hasMore = batch.length === batchSize;
        console.log(`📊 Fetched batch: ${batch.length} demos, total so far: ${allDemos.length}`);
      } else {
        hasMore = false;
      }
    }
    
    const demos = allDemos;
    const totalDemos = allDemos.length;
    
    console.log(`📊 Found ${demos?.length || 0} demos (total: ${totalDemos || 0})`);

    // Get all brands to calculate "yet to initiated" - fetch in batches
    console.log(`📊 Fetching all brands in batches...`);
    
    let allBrands: any[] = [];
    from = 0;
    hasMore = true;
    
    while (hasMore) {
      let brandsQuery = getSupabaseAdmin().from('master_data').select('*', { count: 'exact' });
      
      if (normalizedRole === 'team_lead') {
        const teamName = user.team_name || user.teamName;
        if (teamName) {
          // Get team members first
          const { data: teamMembers } = await getSupabaseAdmin()
            .from('user_profiles')
            .select('email')
            .eq('team_name', teamName)
            .in('role', ['agent', 'Agent']) as { data: Array<{ email: string }> | null; error: any };
          
          const agentEmails = teamMembers?.map(m => m.email) || [];
          
          if (agentEmails.length > 0) {
            brandsQuery = brandsQuery.in('kam_email_id', agentEmails);
          } else {
            brandsQuery = brandsQuery.eq('kam_email_id', 'NON_EXISTENT_EMAIL');
          }
        } else {
          brandsQuery = brandsQuery.eq('kam_email_id', 'NON_EXISTENT_EMAIL');
        }
      }
      
      const { data: batch, error: batchError } = await brandsQuery
        .range(from, from + batchSize - 1) as { data: any[] | null; error: any };
      
      if (batchError) {
        console.error('❌ Error fetching brands batch:', batchError);
        return NextResponse.json({
          success: false,
          error: 'Failed to fetch brands'
        }, { status: 500 });
      }
      
      if (batch && batch.length > 0) {
        allBrands = allBrands.concat(batch);
        from += batchSize;
        hasMore = batch.length === batchSize;
        console.log(`📊 Fetched batch: ${batch.length} brands, total so far: ${allBrands.length}`);
      } else {
        hasMore = false;
      }
    }
    
    const brands = allBrands;
    const totalBrands = allBrands.length;
    
    console.log(`📊 Found ${brands?.length || 0} brands (total: ${totalBrands || 0})`);

    // Group demos by agent
    const agentMap = new Map<string, {
      agent_name: string;
      agent_email: string;
      team_name?: string;
      total_brands: number;
      brands_initiated: number;
      brands_not_initiated: number;
      total_demos: number;
      status_breakdown: Record<string, number>;
      product_breakdown: Record<string, number>;
      converted: number;
      not_converted: number;
      pending: number;
      workflow_completed: number;
    }>();

    // Initialize agent data from brands
    brands?.forEach((brand: any) => {
      const agentEmail = brand.kam_email_id;
      const agentName = brand.kam_name;
      const teamName = brand.team_name;
      
      if (!agentEmail) {
        console.warn(`⚠️ Brand without kam_email_id:`, brand.brand_name);
        return;
      }
      
      if (!agentMap.has(agentEmail)) {
        agentMap.set(agentEmail, {
          agent_name: agentName,
          agent_email: agentEmail,
          team_name: teamName,
          total_brands: 0,
          brands_initiated: 0,
          brands_not_initiated: 0,
          total_demos: 0,
          status_breakdown: {},
          product_breakdown: {},
          converted: 0,
          not_converted: 0,
          pending: 0,
          workflow_completed: 0,
        });
      }
      
      const agentStats = agentMap.get(agentEmail)!;
      agentStats.total_brands++;
    });

    console.log(`📊 Initialized ${agentMap.size} agents from brands`);

    // Track which brands have demos
    const brandsWithDemos = new Set<string>();
    
    // Process demos
    demos?.forEach((demo: Demo) => {
      // Credit the agent who actually completed the demo (completed_by_agent_id),
      // falling back to the originally assigned agent_id
      const agentEmail = (demo as any).completed_by_agent_id || demo.agent_id;
      const agentName = (demo as any).completed_by_agent_name || demo.agent_name;
      
      if (!agentEmail) {
        console.warn(`⚠️ Demo without agent_id:`, demo.demo_id);
        return;
      }
      
      if (!agentMap.has(agentEmail)) {
        console.log(`📝 Creating agent entry from demo: ${agentEmail}`);
        agentMap.set(agentEmail, {
          agent_name: agentName,
          agent_email: agentEmail,
          team_name: demo.team_name,
          total_brands: 0,
          brands_initiated: 0,
          brands_not_initiated: 0,
          total_demos: 0,
          status_breakdown: {},
          product_breakdown: {},
          converted: 0,
          not_converted: 0,
          pending: 0,
          workflow_completed: 0,
        });
      }
      
      const agentStats = agentMap.get(agentEmail)!;
      agentStats.total_demos++;
      
      // Track brand as initiated - use brand_id from demo
      const brandKey = `${agentEmail}_${demo.brand_id}`;
      brandsWithDemos.add(brandKey);
      
      // Status breakdown
      agentStats.status_breakdown[demo.current_status] = 
        (agentStats.status_breakdown[demo.current_status] || 0) + 1;
      
      // Product breakdown
      agentStats.product_breakdown[demo.product_name] = 
        (agentStats.product_breakdown[demo.product_name] || 0) + 1;
      
      // Conversion tracking
      if (demo.conversion_status === "Converted") {
        agentStats.converted++;
      } else if (demo.conversion_status === "Not Converted") {
        agentStats.not_converted++;
      } else if (!demo.workflow_completed) {
        agentStats.pending++;
      }
      
      if (demo.workflow_completed) {
        agentStats.workflow_completed++;
      }
    });

    console.log(`📊 Processed ${demos?.length || 0} demos, ${brandsWithDemos.size} unique brands with demos`);

    // Calculate brands initiated vs not initiated
    brands?.forEach((brand: any) => {
      const agentEmail = brand.kam_email_id;
      if (!agentEmail) return;
      
      // Try both id and _id for brand identification
      const brandId = brand.id || brand._id;
      if (!brandId) {
        console.warn(`⚠️ Brand without id:`, brand.brand_name);
        return;
      }
      
      const brandKey = `${agentEmail}_${brandId}`;
      const agentStats = agentMap.get(agentEmail);
      
      if (agentStats) {
        if (brandsWithDemos.has(brandKey)) {
          agentStats.brands_initiated++;
        } else {
          agentStats.brands_not_initiated++;
        }
      }
    });

    // Convert map to array and sort by agent name
    const agentStatistics = Array.from(agentMap.values()).sort((a, b) => 
      a.agent_name.localeCompare(b.agent_name)
    );

    console.log(`📊 Final agent statistics count: ${agentStatistics.length}`);
    agentStatistics.forEach(agent => {
      console.log(`  - ${agent.agent_name}: ${agent.total_brands} brands, ${agent.total_demos} demos`);
    });

    // Calculate overall summary
    const summary = {
      total_agents: agentStatistics.length,
      total_brands: brands?.length || 0,
      total_demos: demos?.length || 0,
      brands_initiated: agentStatistics.reduce((sum, agent) => sum + agent.brands_initiated, 0),
      brands_not_initiated: agentStatistics.reduce((sum, agent) => sum + agent.brands_not_initiated, 0),
      total_converted: agentStatistics.reduce((sum, agent) => sum + agent.converted, 0),
      total_not_converted: agentStatistics.reduce((sum, agent) => sum + agent.not_converted, 0),
      total_pending: agentStatistics.reduce((sum, agent) => sum + agent.pending, 0),
      total_workflow_completed: agentStatistics.reduce((sum, agent) => sum + agent.workflow_completed, 0),
    };

    console.log(`📊 Summary:`, summary);

    return NextResponse.json({
      success: true,
      data: {
        agent_statistics: agentStatistics,
        summary
      }
    });

  } catch (error) {
    console.error('[Agent Demo Statistics] Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
