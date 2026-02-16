import { NextRequest, NextResponse } from 'next/server';
import { ChurnQuerySchema } from '../../../lib/models/churn';
import { churnService } from '@/lib/services';
import NodeCache from 'node-cache';

// Create cache instances (similar to backend)
const churnDataCache = new NodeCache({ stdTTL: 60 }); // 1 minute TTL
const statisticsCache = new NodeCache({ stdTTL: 180 }); // 3 minutes TTL

export async function GET(request: NextRequest) {
  try {
    console.log('🔵 === CHURN API CALLED ===');
    console.log('🔵 Request URL:', request.url);
    console.log('🔵 Request headers:', {
      'x-user-email': request.headers.get('x-user-email'),
      'x-user-role': request.headers.get('x-user-role'),
      'x-user-team': request.headers.get('x-user-team'),
    });
    
    // Get user info from cookies directly (fallback if middleware doesn't work)
    let userEmail = request.headers.get('x-user-email');
    let userRole = request.headers.get('x-user-role');
    let userTeam = request.headers.get('x-user-team');
    
    console.log('🔵 Initial values - Email:', userEmail, 'Role:', userRole, 'Team:', userTeam);
    
    // If headers are not set by middleware, extract from cookies directly
    if (!userEmail) {
      console.log('🔵 No email in headers, checking cookies...');
      const userSession = request.cookies.get('user-session');
      console.log('🔵 User session cookie exists:', !!userSession);
      
      if (!userSession) {
        return NextResponse.json({
          error: 'Authentication required',
          detail: 'No user session found'
        }, { status: 401 });
      }
      
      try {
        const userData = JSON.parse(userSession.value);
        console.log('🔵 Parsed user data from cookie:', { email: userData.email, role: userData.role, team: userData.team_name });
        userEmail = userData.email;
        userRole = userData.role;
        userTeam = userData.team_name;
      } catch (error) {
        console.error('🔵 Error parsing user session:', error);
        return NextResponse.json({
          error: 'Invalid session',
          detail: 'Session data corrupted'
        }, { status: 401 });
      }
    }
    
    if (!userEmail) {
      console.error('🔵 Still no email after checking cookies!');
      return NextResponse.json({
        error: 'Authentication required',
        detail: 'User not authenticated'
      }, { status: 401 });
    }
    
    console.log('🔵 Final user info - Email:', userEmail, 'Role:', userRole, 'Team:', userTeam);

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '100');
    const search = searchParams.get('search') || undefined;
    const filter = searchParams.get('filter') || 'all';

    const queryData = ChurnQuerySchema.parse({ page, limit, search });

    console.log(`🔍 Getting churn data for user: ${userEmail}, role: ${userRole}, filter: ${filter}`);

    // IMPORTANT: Get fresh data first (don't use cache until after auto-fix)
    // Get churn data from Supabase with role-based filtering
    const result = await churnService.getChurnData({
      email: userEmail,
      page: queryData.page,
      limit: queryData.limit,
      search: queryData.search,
      filter: filter as 'all' | 'newCount' | 'overdue' | 'followUps' | 'completed'
    });

    console.log(`📊 Churn data result: ${result.data.length} records, total: ${result.total}`);
    console.log(`📊 Categorization from backend:`, result.categorization);
    console.log(`🔍 User role from result: ${result.user_role}, KAM filter applied: ${result.kam_filter ? 'YES' : 'NO'}`);
    if (result.kam_filter) {
      console.log(`🔍 KAM filter values:`, result.kam_filter);
    }
    
    // Log sample records for debugging
    if (result.data.length > 0) {
      console.log(`📋 Sample records (first 3):`);
      result.data.slice(0, 3).forEach((record: any) => {
        console.log(`   RID ${record.rid}: reason="${record.churn_reason}", status=${record.follow_up_status}, calls=${record.call_attempts?.length || 0}`);
      });
    }

    const response = {
      success: true,
      data: {
        data: result.data,
        page: result.page,
        limit: result.limit,
        total: result.total,
        total_pages: result.total_pages,
        has_next: result.has_next,
        has_prev: result.has_prev,
        missing_churn_reasons: result.missing_churn_reasons,
        categorization: result.categorization || {
          newCount: 0,
          overdue: 0,
          followUps: 0,
          completed: 0
        },
        user_role: result.user_role || userRole,
        kam_filter: result.kam_filter
      }
    };

    // NOTE: Cache disabled to ensure auto-fix always runs
    // TODO: Re-enable cache after confirming auto-fix is stable
    // churnDataCache.set(cacheKey, response);
    
    return NextResponse.json(response);
  } catch (error) {
    console.log(`❌ Error getting churn data: ${error}`);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch churn data',
      detail: String(error)
    }, { status: 500 });
  }
}