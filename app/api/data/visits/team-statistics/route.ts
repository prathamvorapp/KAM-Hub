import { NextRequest, NextResponse } from 'next/server';
import { visitService } from '@/lib/services';
import NodeCache from 'node-cache';

const teamStatsCache = new NodeCache({ stdTTL: 300 });

async function handleRequest(request: NextRequest) {
  try {
    const userEmail = request.headers.get('x-user-email');
    const userRole = request.headers.get('x-user-role');
    
    if (!userEmail) {
      return NextResponse.json({
        error: 'Authentication required'
      }, { status: 401 });
    }

    // Normalize role comparison to handle both formats
    const normalizedRole = userRole?.toLowerCase().replace(/[_\s]/g, '');
    if (normalizedRole !== 'teamlead' && normalizedRole !== 'admin') {
      return NextResponse.json({
        error: 'Access denied - Team Lead or Admin only'
      }, { status: 403 });
    }

    const cacheKey = `team_visit_stats_${userEmail}`;
    const cachedData = teamStatsCache.get(cacheKey);
    
    if (cachedData) {
      console.log(`📈 Team visit statistics served from cache`);
      return NextResponse.json(cachedData);
    }

    console.log(`📊 Getting team visit statistics for: ${userEmail}`);

    const statistics = await visitService.getVisitStatistics(userEmail);

    const response = {
      success: true,
      data: statistics
    };

    teamStatsCache.set(cacheKey, response);

    return NextResponse.json(response);

  } catch (error) {
    console.error('❌ Error getting team visit statistics:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to load statistics',
      detail: String(error)
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return handleRequest(request);
}

export async function POST(request: NextRequest) {
  return handleRequest(request);
}
