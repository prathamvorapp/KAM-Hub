import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '../../../../../lib/auth-helpers';
import { healthCheckService } from '@/lib/services';
import NodeCache from 'node-cache';

const agentStatsCache = new NodeCache({ stdTTL: 180 });

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    
    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 });
    }

    // Only Team Leads and Admins can view agent statistics
    if (user.role !== 'Team Lead' && user.role !== 'Admin') {
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
      email: user.email,
      month
    });

    const response = {
      success: true,
      data: stats
    };

    agentStatsCache.set(cacheKey, response);

    return NextResponse.json(response);

  } catch (error) {
    console.error('❌ Error getting agent statistics:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to load agent statistics',
      detail: String(error)
    }, { status: 500 });
  }
}
