import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/api-auth'; // Import authenticateRequest
import { visitService, userService } from '@/lib/services'; // Import visitService and userService
import NodeCache from 'node-cache';
import { UserProfile } from '@/lib/models/user'; // Assuming UserProfile interface from models

const statisticsCache = new NodeCache({ stdTTL: 180 });

/**
 * Direct Statistics Endpoint
 * Fetches data for a specific user, with role-based authorization.
 * 
 * Authentication: Required via cookies.
 * Authorization:
 * - Admin: Can query for any user's statistics.
 * - Team Lead: Can query for statistics of agents within their team.
 * - Agent: Can only query for their own statistics.
 */
export async function GET(request: NextRequest) {
  try {
    const isDev = process.env.NODE_ENV === 'development';

    // Authenticate the request
    const { user, error } = await authenticateRequest(request);
    if (error) return error;
    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 });
    }

    // Determine target user for statistics
    const { searchParams } = new URL(request.url);
    const requestedEmail = searchParams.get('email'); // Email from query param
    const bustCache = searchParams.get('bustCache') === 'true';

    let targetUserProfile: UserProfile = user as any; // Default to authenticated user
    let cacheKeyEmail = user.email; // For cache key based on actual data requested

    if (requestedEmail && requestedEmail !== user.email) {
      // Logic for viewing other users' statistics
      const normalizedRole = user.role.toLowerCase().replace(/\s+/g, '_');

      // Only Admin or Team Lead can request other users' statistics
      if (normalizedRole !== 'admin' && normalizedRole !== 'team_lead' && normalizedRole !== 'teamlead') {
        if (isDev) console.log(`❌ [DIRECT STATS] User ${user.email} (Role: ${user.role}) not authorized to view stats for ${requestedEmail}`);
        return NextResponse.json({
          success: false,
          error: 'Access denied - insufficient permissions to view other users\' statistics'
        }, { status: 403 });
      }

      // Fetch profile for the requested email
      const fetchedUserProfile = await userService.getUserProfileByEmail(requestedEmail);

      if (!fetchedUserProfile) {
        return NextResponse.json({
          success: false,
          error: 'Target user profile not found'
        }, { status: 404 });
      }

      // Team Lead specific authorization
      if ((normalizedRole === 'team_lead' || normalizedRole === 'teamlead') && user.team_name !== fetchedUserProfile.team_name) {
        if (isDev) console.log(`❌ [DIRECT STATS] Team Lead ${user.email} cannot view stats for agent ${requestedEmail} outside their team`);
        return NextResponse.json({
          success: false,
          error: 'Access denied - Team Lead can only view statistics for agents in their team'
        }, { status: 403 });
      }

      if (isDev) console.log(`✅ [DIRECT STATS] User ${user.email} (${user.role}) authorized to view stats for ${requestedEmail}`);
      targetUserProfile = fetchedUserProfile;
      cacheKeyEmail = fetchedUserProfile.email; // Cache based on the target user's email
    }

    const cacheKey = `direct_visit_stats_${cacheKeyEmail}`;
    
    // Check cache only if not busting
    if (!bustCache) {
      const cachedData = statisticsCache.get(cacheKey);
      
      if (cachedData) {
        return NextResponse.json(cachedData);
      }
    } else {
      statisticsCache.del(cacheKey); // Bust cache explicitly
    }

        // Call the refactored visitService to get statistics
        const statistics = await visitService._getIndividualAgentStatistics(targetUserProfile as any);
        
        const response = {      success: true,
      data: statistics,
      metadata: {
        user_email: user.email, // Authenticated user
        user_role: user.role,
        user_team: user.team_name,
        target_email: targetUserProfile.email, // Actual target for stats
        target_role: targetUserProfile.role,
        target_team: targetUserProfile.team_name,
        fetched_at: new Date().toISOString()
      }
    };

    statisticsCache.set(cacheKey, response);

    return NextResponse.json(response);

  } catch (error: any) {
    console.error('[Direct Visit Statistics] Error:', error);
    const isDev = process.env.NODE_ENV === 'development';
    return NextResponse.json({
      success: false,
      error: 'Failed to load visit statistics',
      detail: (error as any).message || String(error),
      stack: isDev ? (error as any).stack : undefined // Only show stack in dev
    }, { status: 500 });
  }
}
