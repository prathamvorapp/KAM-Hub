import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '../../../../../lib/auth-helpers';
import { momService } from '@/lib/services';
import NodeCache from 'node-cache';

const momStatsCache = new NodeCache({ stdTTL: 180 });

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    
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

    const stats = await momService.getMOMStatistics(user.email);

    const response = {
      success: true,
      data: stats
    };

    momStatsCache.set(cacheKey, response);

    return NextResponse.json(response);

  } catch (error) {
    console.error('❌ Error getting MOM statistics:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to load statistics',
      detail: String(error)
    }, { status: 500 });
  }
}
