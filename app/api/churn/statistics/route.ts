import { NextRequest, NextResponse } from 'next/server';
import { churnService } from '@/lib/services';
import NodeCache from 'node-cache';

// Cache for statistics
const statisticsCache = new NodeCache({ stdTTL: 180 }); // 3 minutes TTL

export async function GET(request: NextRequest) {
  try {
    // Get user info from middleware
    const userEmail = request.headers.get('x-user-email');
    const userRole = request.headers.get('x-user-role');
    const userTeam = request.headers.get('x-user-team');
    
    if (!userEmail) {
      return NextResponse.json({
        error: 'Authentication required'
      }, { status: 401 });
    }

    // Cache statistics per user
    const cacheKey = `statistics_${userEmail}`;
    
    const cachedStats = statisticsCache.get(cacheKey);
    if (cachedStats) {
      console.log(`📈 Statistics served from cache for user: ${userEmail}`);
      return NextResponse.json(cachedStats);
    }

    console.log(`📈 Getting churn statistics for user: ${userEmail}, role: ${userRole}`);

    // Get churn statistics from Supabase (role-filtered)
    const stats = await churnService.getChurnStatistics(userEmail);

    // Get all churn data for zone breakdown
    const result = await churnService.getChurnData({
      email: userEmail,
      page: 1,
      limit: 10000 // Get all records for statistics
    });

    const records = result.data;

    // Group by zone
    const zoneStats = records.reduce((acc: any, record: any) => {
      const zone = record.zone || 'Unknown';
      if (!acc[zone]) {
        acc[zone] = { total: 0, completed: 0, missing: 0 };
      }
      acc[zone].total++;
      if (record.churn_reason && record.churn_reason.trim() !== '') {
        acc[zone].completed++;
      } else {
        acc[zone].missing++;
      }
      return acc;
    }, {});

    const response = {
      success: true,
      statistics: {
        total_records: stats.total_records,
        completed_records: stats.completed_churn_reasons,
        missing_churn_reasons: stats.missing_churn_reasons,
        completion_percentage: stats.completion_percentage,
        zone_breakdown: zoneStats,
        active_follow_ups: stats.active_follow_ups,
        completed_follow_ups: stats.completed_follow_ups,
        user_role: userRole,
        user_team: userTeam
      }
    };

    // Cache the statistics
    statisticsCache.set(cacheKey, response);
    
    return NextResponse.json(response);
  } catch (error) {
    console.log(`❌ Error getting churn statistics: ${error}`);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch churn statistics',
      detail: String(error)
    }, { status: 500 });
  }
}