import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/api-auth';
import { momService } from '@/lib/services';
import NodeCache from 'node-cache';

const momStatsCache = new NodeCache({ stdTTL: 180 });

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

    const cacheKey = `mom_stats_${user.email}`;
    const cachedData = momStatsCache.get(cacheKey);
    
    if (cachedData) {
      console.log(`📈 MOM statistics served from cache`);
      return NextResponse.json(cachedData);
    }

    console.log(`📊 Getting MOM statistics for: ${user.email}`);

    const stats = await momService.getMOMStatistics(user); // Pass the entire user object as userProfile

    const response = {
      success: true,
      data: stats
    };

    momStatsCache.set(cacheKey, response);

    return NextResponse.json(response);

  } catch (error) {
    console.error('[MOM Statistics] Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
