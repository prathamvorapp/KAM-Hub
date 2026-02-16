import { NextRequest, NextResponse } from 'next/server';
import { visitService } from '@/lib/services';
import NodeCache from 'node-cache';

const teamSummaryCache = new NodeCache({ stdTTL: 300 });

export async function GET(request: NextRequest) {
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

    const cacheKey = `team_visit_summary_${userEmail}`;
    const cachedData = teamSummaryCache.get(cacheKey);
    
    if (cachedData) {
      console.log(`📈 Team visit summary served from cache`);
      return NextResponse.json(cachedData);
    }

    console.log(`📊 Getting team visit summary for: ${userEmail}`);

    const statistics = await visitService.getVisitStatistics(userEmail);
    const visits = await visitService.getVisits({ email: userEmail, page: 1, limit: 1000 });

    const response = {
      success: true,
      data: {
        statistics,
        recent_visits: visits.page.slice(0, 10)
      }
    };

    teamSummaryCache.set(cacheKey, response);

    return NextResponse.json(response);

  } catch (error) {
    console.error('❌ Error getting team visit summary:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to load summary',
      detail: String(error)
    }, { status: 500 });
  }
}
