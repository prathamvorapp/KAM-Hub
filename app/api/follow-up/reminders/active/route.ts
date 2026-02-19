import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/api-auth';
import { churnService } from '@/lib/services';
import NodeCache from 'node-cache';

const followUpCache = new NodeCache({ stdTTL: 120 }); // 2 minute cache

export async function GET(request: NextRequest) {
  try {
    // Authenticate
    const { user, error } = await authenticateRequest(request);
    if (error) return error;
    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 });
    }

    const cacheKey = `active_followups_${user.email}`;
    const cachedData = followUpCache.get(cacheKey);
    
    if (cachedData) {
      console.log(`📈 Active follow-ups served from cache for: ${user.email}`);
      return NextResponse.json(cachedData, {
        headers: {
          'Cache-Control': 'public, max-age=120, s-maxage=120',
        }
      });
    }

    console.log(`📊 Getting active follow-ups for user: ${user.email}`);

    const result = await churnService.getActiveFollowUps(undefined, user);

    const response = {
      success: true,
      data: result
    };

    followUpCache.set(cacheKey, response);

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'public, max-age=120, s-maxage=120',
      }
    });

  } catch (error) {
    console.error('❌ [Active Follow-ups] Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to get active follow-ups',
      detail: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
