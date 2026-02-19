import { NextRequest, NextResponse } from 'next/server';
import { ChurnQuerySchema } from '../../../lib/models/churn';
import { churnService } from '@/lib/services';
import { authenticateRequest } from '@/lib/api-auth';
import NodeCache from 'node-cache';

// Create cache instances (similar to backend)
const churnDataCache = new NodeCache({ stdTTL: 60 }); // 1 minute TTL
const statisticsCache = new NodeCache({ stdTTL: 180 }); // 3 minutes TTL

export async function GET(request: NextRequest) {
  try {
    console.log('🔵 [Churn API] Request received');
    
    // Authenticate request
    const { user, error } = await authenticateRequest(request);
    if (error) return error;
    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 });
    }
    
    const { email: userEmail, role: userRole, team_name: userTeam } = user;

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '100');
    const search = searchParams.get('search') || undefined;
    const filter = searchParams.get('filter') || 'all';

    const queryData = ChurnQuerySchema.parse({ page, limit, search });

    console.log(`🔍 [Churn API] Getting data for: ${userEmail}, role: ${userRole}, filter: ${filter}`);

    // IMPORTANT: Get fresh data first (don't use cache until after auto-fix)
    // Get churn data from Supabase with role-based filtering
    const result = await churnService.getChurnData({
      userProfile: user, // Pass the entire user object as userProfile
      page: queryData.page,
      limit: queryData.limit,
      search: queryData.search,
      filter: filter as 'all' | 'newCount' | 'overdue' | 'followUps' | 'completed'
    });

    console.log(`✅ [Churn API] Result: ${result.data.length} records, total: ${result.total}`);

    const response = {
      success: true,
      data: result.data,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        total_pages: result.total_pages,
        has_next: result.has_next,
        has_prev: result.has_prev
      },
      missing_churn_reasons: result.missing_churn_reasons,
      categorization: result.categorization || {
        newCount: 0,
        overdue: 0,
        followUps: 0,
        completed: 0
      },
      user_info: {
        role: result.user_role || userRole,
        kam_filter: result.kam_filter
      }
    };

    
    return NextResponse.json(response);
  } catch (error) {
    console.error(`❌ [Churn API] Error:`, error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch churn data',
      detail: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
