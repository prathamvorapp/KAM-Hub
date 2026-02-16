import { NextRequest, NextResponse } from 'next/server';
import { visitService } from '@/lib/services';
import NodeCache from 'node-cache';

const statisticsCache = new NodeCache({ stdTTL: 180 });

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 [VISITS STATS] Headers:', {
      'x-user-email': request.headers.get('x-user-email'),
      'x-user-role': request.headers.get('x-user-role'),
      'cookie': request.headers.get('cookie')
    });
    
    const loggedInUserEmail = request.headers.get('x-user-email');
    const userRole = request.headers.get('x-user-role');
    
    if (!loggedInUserEmail) {
      console.log('❌ [VISITS STATS] No user email found in headers');
      return NextResponse.json({
        error: 'Authentication required'
      }, { status: 401 });
    }

    // Check if a specific email is requested via query parameter
    const { searchParams } = new URL(request.url);
    const requestedEmail = searchParams.get('email');
    
    // Determine which email to use for statistics
    let targetEmail = loggedInUserEmail;
    
    if (requestedEmail && requestedEmail !== loggedInUserEmail) {
      // Normalize role for comparison
      const normalizedRole = userRole?.toLowerCase().replace(/[_\s]/g, '');
      
      // Only Team Leads and Admins can view other users' statistics
      if (normalizedRole !== 'teamlead' && normalizedRole !== 'admin') {
        console.log(`❌ [VISITS STATS] User ${loggedInUserEmail} (${userRole}) not authorized to view stats for ${requestedEmail}`);
        return NextResponse.json({
          error: 'Access denied - insufficient permissions'
        }, { status: 403 });
      }
      
      targetEmail = requestedEmail;
      console.log(`📊 [VISITS STATS] Team Lead/Admin ${loggedInUserEmail} requesting stats for: ${targetEmail}`);
    }

    const cacheKey = `visit_stats_${targetEmail}`;
    const cachedData = statisticsCache.get(cacheKey);
    
    if (cachedData) {
      console.log(`📈 Visit statistics served from cache for: ${targetEmail}`);
      return NextResponse.json(cachedData);
    }

    console.log(`📊 Getting visit statistics for: ${targetEmail}`);
    console.log(`📊 [VISITS STATS] Fetching from Supabase tables: user_profiles, master_data, visits`);

    const statistics = await visitService.getVisitStatistics(targetEmail);

    console.log(`✅ [VISITS STATS] Successfully fetched statistics:`, {
      total_brands: statistics.total_brands,
      visit_done: statistics.visit_done,
      pending: statistics.pending
    });

    const response = {
      success: true,
      data: statistics
    };

    statisticsCache.set(cacheKey, response);

    return NextResponse.json(response);

  } catch (error: any) {
    console.error('❌ [VISITS STATS] Error getting visit statistics:', error);
    console.error('❌ [VISITS STATS] Error details:', {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
      stack: error.stack
    });
    return NextResponse.json({
      success: false,
      error: 'Failed to load visit statistics',
      detail: error.message || String(error),
      errorCode: error.code
    }, { status: 500 });
  }
}
