import { NextRequest, NextResponse } from 'next/server';
import { visitService } from '@/lib/services';
import NodeCache from 'node-cache';

const adminStatsCache = new NodeCache({ stdTTL: 300 });

export async function GET(request: NextRequest) {
  try {
    const userEmail = request.headers.get('x-user-email');
    const userRole = request.headers.get('x-user-role');
    
    if (!userEmail) {
      return NextResponse.json({
        error: 'Authentication required'
      }, { status: 401 });
    }

    if (userRole !== 'Admin') {
      return NextResponse.json({
        error: 'Access denied - Admin only'
      }, { status: 403 });
    }

    const cacheKey = `admin_visit_stats_${userEmail}`;
    const cachedData = adminStatsCache.get(cacheKey);
    
    if (cachedData) {
      console.log(`📈 Admin visit statistics served from cache`);
      return NextResponse.json(cachedData);
    }

    console.log(`📊 Getting admin visit statistics`);

    const statistics = await visitService.getVisitStatistics(userEmail);

    const response = {
      success: true,
      data: statistics
    };

    adminStatsCache.set(cacheKey, response);

    return NextResponse.json(response);

  } catch (error) {
    console.error('❌ Error getting admin visit statistics:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to load statistics',
      detail: String(error)
    }, { status: 500 });
  }
}
