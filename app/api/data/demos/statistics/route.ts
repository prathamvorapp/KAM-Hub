import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '../../../../../lib/auth-helpers';
import { demoService } from '@/lib/services';
import NodeCache from 'node-cache';

const demoStatsCache = new NodeCache({ stdTTL: 180 });

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    
    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 });
    }

    const cacheKey = `demo_stats_${user.email}`;
    const cachedData = demoStatsCache.get(cacheKey);
    
    if (cachedData) {
      console.log(`📈 Demo statistics served from cache for: ${user.email}`);
      return NextResponse.json(cachedData);
    }

    console.log(`📊 Getting demo statistics for user: ${user.email}`);

    const stats = await demoService.getDemoStatistics({
      agentId: user.email,
      teamName: user.team_name,
      role: user.role
    });

    const response = {
      success: true,
      data: stats
    };

    demoStatsCache.set(cacheKey, response);

    return NextResponse.json(response);

  } catch (error) {
    console.error('❌ Error getting demo statistics:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to load demo statistics',
      detail: String(error)
    }, { status: 500 });
  }
}
