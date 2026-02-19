import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/api-auth';
import { healthCheckService } from '@/lib/services';
import NodeCache from 'node-cache';

const agentStatsCache = new NodeCache({ stdTTL: 180 });

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

    // Only Team Leads and Admins can view agent statistics (case-insensitive)
    const normalizedRole = user.role.toLowerCase().replace(/\s+/g, '_');
    if (normalizedRole !== 'team_lead' && normalizedRole !== 'admin') {
      return NextResponse.json({
        success: false,
        error: 'Access denied'
      }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month') || new Date().toISOString().slice(0, 7);

    const cacheKey = `agent_health_stats_${user.email}_${month}`;
    const cachedData = agentStatsCache.get(cacheKey);
    
    if (cachedData) {
      console.log(`📈 Agent statistics served from cache`);
      return NextResponse.json(cachedData);
    }

    console.log(`📊 Getting agent-wise health check statistics`);

    const stats = await healthCheckService.getHealthCheckStatistics({
      userProfile: user, // Pass the entire user object as userProfile
      month
    });

    console.log(`📊 Agent statistics result:`, {
      total: stats.total,
      agentCount: stats.byAgent.length,
      sampleAgent: stats.byAgent[0]
    });

    const response = {
      success: true,
      data: stats
    };

    agentStatsCache.set(cacheKey, response);

    return NextResponse.json(response);

  } catch (error) {
    console.error('[Health Check Agent Statistics] Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
