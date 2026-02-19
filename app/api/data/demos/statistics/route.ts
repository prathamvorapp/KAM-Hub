import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/api-auth';
import { demoService } from '@/lib/services';
import { demoStatsCache, getDemoStatsCacheKey } from '@/lib/cache/demoCache';

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

    const cacheKey = getDemoStatsCacheKey(user.email);
    const cachedData = demoStatsCache.get(cacheKey);
    
    if (cachedData) {
      console.log(`📈 Demo statistics served from cache for: ${user.email}`);
      return NextResponse.json(cachedData);
    }

    console.log(`📊 Getting demo statistics for user: ${user.email}`);

    const stats = await demoService.getDemoStatistics(user); // Pass the entire user object as userProfile

    const response = {
      success: true,
      data: stats
    };

    demoStatsCache.set(cacheKey, response);

    return NextResponse.json(response);

  } catch (error) {
    console.error('[Demo Statistics] Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
