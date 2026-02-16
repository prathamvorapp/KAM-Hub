import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '../../../../../lib/auth-helpers';
import { healthCheckService } from '@/lib/services';
import NodeCache from 'node-cache';

const statsCache = new NodeCache({ stdTTL: 180 });

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    
    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month') || new Date().toISOString().slice(0, 7);

    const cacheKey = `health_check_stats_${user.email}_${month}`;
    const cachedData = statsCache.get(cacheKey);
    
    if (cachedData) {
      console.log(`📈 Health check statistics served from cache`);
      return NextResponse.json(cachedData);
    }

    console.log(`📊 Getting health check statistics for: ${user.email}`);

    const stats = await healthCheckService.getHealthCheckStatistics({
      email: user.email,
      month
    });

    const response = {
      success: true,
      data: stats
    };

    statsCache.set(cacheKey, response);

    return NextResponse.json(response);

  } catch (error) {
    console.error('❌ Error getting health check statistics:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to load statistics',
      detail: String(error)
    }, { status: 500 });
  }
}
