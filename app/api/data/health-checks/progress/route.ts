import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/api-auth';
import { healthCheckService } from '@/lib/services';
import { progressCache } from '@/lib/cache/health-check-cache';

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

    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month') || new Date().toISOString().slice(0, 7);
    const bustCache = searchParams.get('_t'); // Cache buster from frontend

    const cacheKey = `assessment_progress_${user.email}_${month}`;
    
    // Skip cache if cache buster is present (frontend always sends it)
    if (!bustCache) {
      const cachedData = progressCache.get(cacheKey);
      if (cachedData) {
        console.log(`📈 Assessment progress served from cache`);
        return NextResponse.json(cachedData);
      }
    } else {
      console.log(`🔄 Progress cache bypassed due to cache buster`);
    }

    console.log(`📊 Getting assessment progress for: ${user.email}`);

    const progress = await healthCheckService.getAssessmentProgress({
      userProfile: user, // Pass the entire user object as userProfile
      month
    });

    const response = {
      success: true,
      data: progress
    };

    progressCache.set(cacheKey, response);

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });

  } catch (error) {
    console.error('[Health Check Progress] Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
