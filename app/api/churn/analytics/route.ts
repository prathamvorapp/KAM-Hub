import { NextRequest, NextResponse } from 'next/server';
// import { convexAPI } from '../../../../lib/convex-api'; // TODO: Implement analytics service
import { authenticateRequest } from '@/lib/api-auth';
import NodeCache from 'node-cache';

// Create cache instance with 3-minute TTL for analytics (same as other stats)
const analyticsCache = new NodeCache({ stdTTL: 180 }); // 3 minutes TTL

export async function GET(request: NextRequest) {
  try {
    const { user, error } = await authenticateRequest(request);
    if (error) return error;
    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 });
    }

    // Create cache key based on user email
    const cacheKey = `churn_analytics_${user.email}`;
    
    // Try to get from cache first
    const cachedResult = analyticsCache.get(cacheKey);
    if (cachedResult) {
      console.log(`📊 Churn analytics served from cache for user: ${user.email}`);
      return NextResponse.json({
        success: true,
        data: cachedResult,
        cached: true
      });
    }

    console.log(`🔍 Getting churn analytics for user: ${user.email}, role: ${user.role}`);

    // TODO: Implement analytics service
    // Get analytics data from Convex
    // const result = await convexAPI.getChurnAnalytics();
    
    // Temporary placeholder response
    const result = {
      overallStats: {
        totalRecords: 0,
        avgResponseTime: 0,
        completionRate: 0
      },
      agentStats: []
    };

    console.log(`📊 Analytics result: ${result.overallStats.totalRecords} total records`);

    // Cache the result
    analyticsCache.set(cacheKey, result);

    return NextResponse.json({
      success: true,
      data: result,
      cached: false
    });

  } catch (error) {
    console.error('[Churn Analytics GET] Error:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user, error } = await authenticateRequest(request);
    if (error) return error;
    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 });
    }

    // Check if user has permission to view agent details (Team Lead or Admin only, case-insensitive)
    const normalizedRole = user.role.toLowerCase().replace(/\s+/g, '_');
    if (normalizedRole !== 'team_lead' && normalizedRole !== 'admin') {
      return NextResponse.json({
        success: false,
        error: 'Insufficient permissions - Team Lead or Admin only'
      }, { status: 403 });
    }

    const { agentName } = await request.json();

    if (!agentName) {
      return NextResponse.json({
        success: false,
        error: 'Missing required parameter',
        detail: 'agentName is required'
      }, { status: 400 });
    }

    console.log(`🔍 Getting agent response time details for: ${agentName}`);

    // TODO: Implement analytics service
    // Get agent details from Convex
    // const result = await convexAPI.getAgentResponseTimeDetails(agentName);
    
    // Temporary placeholder response
    const result = {
      agentName,
      recordsWithResponse: 0,
      avgResponseTime: 0,
      details: []
    };

    console.log(`📊 Agent details result: ${result.recordsWithResponse} records with response`);

    return NextResponse.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('[Churn Analytics POST] Error:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
