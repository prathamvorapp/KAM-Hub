import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/api-auth';
import { healthCheckService } from '@/lib/services';
import NodeCache from 'node-cache';

export const statsCache = new NodeCache({ stdTTL: 600 }); // Increased from 180 to 600 seconds (10 min)

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
    const month = searchParams.get('month') || new Date().toISOString().slice(0, 7);
    const bustCache = searchParams.get('_t'); // Cache buster from frontend

    const cacheKey = `health_check_stats_${user.email}_${month}`;
    
    // Skip cache if cache buster is present
    if (!bustCache) {
      const cachedData = statsCache.get(cacheKey);
      if (cachedData) {
        console.log(`📈 Health check statistics served from cache`);
        return NextResponse.json(cachedData);
      }
    } else {
      console.log(`🔄 Statistics cache bypassed due to cache buster`);
    }

    console.log(`📊 Getting health check statistics for: ${user.email}`);

    const stats = await healthCheckService.getHealthCheckStatistics({
      userProfile: user, // Pass the entire user object as userProfile
      month
    });

    const response = {
      success: true,
      data: stats
    };

    statsCache.set(cacheKey, response);

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });

  } catch (error) {
    console.error('[Health Check Statistics] Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
