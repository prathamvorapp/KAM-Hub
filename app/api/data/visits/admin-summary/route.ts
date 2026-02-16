import { NextRequest, NextResponse } from 'next/server';
import { visitService } from '@/lib/services';
import NodeCache from 'node-cache';

const adminSummaryCache = new NodeCache({ stdTTL: 300 });

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

    const cacheKey = `admin_visit_summary_${userEmail}`;
    const cachedData = adminSummaryCache.get(cacheKey);
    
    if (cachedData) {
      console.log(`📈 Admin visit summary served from cache`);
      return NextResponse.json(cachedData);
    }

    console.log(`📊 Getting admin visit summary`);

    const summary = await visitService.getOrganizationSummary();
    const visits = await visitService.getVisits({ email: userEmail, page: 1, limit: 1000 });

    const response = {
      success: true,
      summary,
      data: {
        statistics: await visitService.getVisitStatistics(userEmail),
        recent_visits: visits.page.slice(0, 10)
      }
    };

    adminSummaryCache.set(cacheKey, response);

    return NextResponse.json(response);

  } catch (error) {
    console.error('❌ Error getting admin visit summary:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to load summary',
      detail: String(error)
    }, { status: 500 });
  }
}
