import { NextRequest, NextResponse } from 'next/server';
import { convexAPI } from '../../../../lib/convex-api';
import { getAuthenticatedUser } from '../../../../lib/auth-helpers';
import NodeCache from 'node-cache';

// Create cache instance with 3-minute TTL for analytics (same as other stats)
const analyticsCache = new NodeCache({ stdTTL: 180 }); // 3 minutes TTL

export async function GET(request: NextRequest) {
  try {
    // Get authenticated user from session cookie
    const user = await getAuthenticatedUser(request);
    
    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required',
        detail: 'User not authenticated'
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

    // Get analytics data from Convex
    const result = await convexAPI.getChurnAnalytics(user.email);

    console.log(`📊 Analytics result: ${result.overallStats.totalRecords} total records`);

    // Cache the result
    analyticsCache.set(cacheKey, result);

    return NextResponse.json({
      success: true,
      data: result,
      cached: false
    });

  } catch (error) {
    console.error('❌ Error fetching churn analytics:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch churn analytics',
      detail: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user from session cookie
    const user = await getAuthenticatedUser(request);
    
    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required',
        detail: 'User not authenticated'
      }, { status: 401 });
    }

    // Check if user has permission to view agent details (Team Lead or Admin only)
    if (user.role === 'Agent') {
      return NextResponse.json({
        success: false,
        error: 'Insufficient permissions',
        detail: 'Only Team Leads and Admins can view agent details'
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

    // Get agent details from Convex
    const result = await convexAPI.getAgentResponseTimeDetails(user.email, agentName);

    console.log(`📊 Agent details result: ${result.recordsWithResponse} records with response`);

    return NextResponse.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('❌ Error fetching agent response time details:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch agent response time details',
      detail: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}