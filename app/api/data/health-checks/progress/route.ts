import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '../../../../../lib/auth-helpers';
import { healthCheckService } from '@/lib/services';
import NodeCache from 'node-cache';

const progressCache = new NodeCache({ stdTTL: 60 });

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    
    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month') || new Date().toISOString().slice(0, 7);

    const cacheKey = `assessment_progress_${user.email}_${month}`;
    const cachedData = progressCache.get(cacheKey);
    
    if (cachedData) {
      console.log(`📈 Assessment progress served from cache`);
      return NextResponse.json(cachedData);
    }

    console.log(`📊 Getting assessment progress for: ${user.email}`);

    const progress = await healthCheckService.getAssessmentProgress({
      email: user.email,
      month
    });

    const response = {
      success: true,
      data: progress
    };

    progressCache.set(cacheKey, response);

    return NextResponse.json(response);

  } catch (error) {
    console.error('❌ Error getting assessment progress:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to load progress',
      detail: String(error)
    }, { status: 500 });
  }
}
