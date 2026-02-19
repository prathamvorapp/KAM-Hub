import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/api-auth';
import { visitService, userService } from '@/lib/services';
import NodeCache from 'node-cache';
import { UserProfile } from '@/lib/models/user';

const statisticsCache = new NodeCache({ stdTTL: 180 });

export async function GET(request: NextRequest) {
  try {
    const isDev = process.env.NODE_ENV === 'development';
    
    const { user, error } = await authenticateRequest(request);
    if (error) return error;
    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const requestedEmail = searchParams.get('email');
    const bustCache = searchParams.get('bustCache') === 'true';
    
    let statsUserProfile: UserProfile = user;

    if (requestedEmail && requestedEmail !== user.email) {
      const normalizedRole = user.role.toLowerCase().replace(/\s+/g, '_');
      if (isDev) console.log(`🔍 [VISITS STATS] Role check: user.role="${user.role}", normalized="${normalizedRole}"`);
      
      if (normalizedRole !== 'team_lead' && normalizedRole !== 'admin') {
        if (isDev) console.log(`❌ [VISITS STATS] User ${user.email} (${user.role}) not authorized to view stats for ${requestedEmail}`);
        return NextResponse.json({
          success: false,
          error: 'Access denied - insufficient permissions'
        }, { status: 403 });
      }
      
      if (isDev) console.log(`✅ [VISITS STATS] User ${user.email} (${user.role}) authorized to view stats for ${requestedEmail}`);
      
      const targetUserProfile = await userService.getUserProfileByEmail(requestedEmail);
      if (!targetUserProfile) {
        return NextResponse.json({
          success: false,
          error: 'Target user profile not found'
        }, { status: 404 });
      }
      statsUserProfile = targetUserProfile;
    }

    const cacheKey = `visit_stats_${statsUserProfile.email}`;
    
    if (!bustCache) {
      const cachedData = statisticsCache.get(cacheKey);
      if (cachedData) {
        return NextResponse.json(cachedData);
      }
    } else {
      statisticsCache.del(cacheKey);
    }

    let statistics: any;
    const normalizedStatsRole = statsUserProfile.role.toLowerCase().replace(/\s+/g, '_');

    if (normalizedStatsRole === 'agent') {
      statistics = await visitService._getIndividualAgentStatistics(statsUserProfile);
    } else if (normalizedStatsRole === 'team_lead' || normalizedStatsRole === 'teamlead' || normalizedStatsRole === 'admin') {
      statistics = await visitService.getComprehensiveTeamVisitStatistics(statsUserProfile);
    } else {
      throw new Error(`Unsupported role for statistics: ${statsUserProfile.role}`);
    }

    const response = {
      success: true,
      data: statistics
    };

    statisticsCache.set(cacheKey, response);

    return NextResponse.json(response);

  } catch (error: any) {
    console.error('[Visit Statistics] Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
