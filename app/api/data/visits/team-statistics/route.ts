import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/api-auth';
import { visitService } from '@/lib/services';
import { teamStatsCache } from '@/lib/cache/health-check-cache';

async function handleRequest(request: NextRequest) {
  try {
    const { user, error } = await authenticateRequest(request);
    if (error) return error;
    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 });
    }

    // Check if user is Team Lead or Admin (case-insensitive)
    const normalizedRole = user.role.toLowerCase().replace(/\s+/g, '_');
    if (normalizedRole !== 'team_lead' && normalizedRole !== 'admin') {
      return NextResponse.json({
        success: false,
        error: 'Access denied - Team Lead or Admin only'
      }, { status: 403 });
    }

    const cacheKey = `team_visit_stats_${user.email}_${user.role}`;
    const cachedData = teamStatsCache.get(cacheKey);
    
    if (cachedData) {
      console.log(`📈 Team visit statistics served from cache for ${user.role}`);
      return NextResponse.json(cachedData);
    }

    console.log(`📊 Getting team visit statistics for: ${user.email} (${user.role})`);

    const statistics = await visitService.getComprehensiveTeamVisitStatistics(user);

    const response = {
      success: true,
      data: statistics
    };

    teamStatsCache.set(cacheKey, response);

    return NextResponse.json(response);

  } catch (error) {
    console.error('[Team Visit Statistics] Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return handleRequest(request);
}

export async function POST(request: NextRequest) {
  return handleRequest(request);
}
