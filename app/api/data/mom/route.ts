import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/api-auth';
import { momService } from '@/lib/services';
import NodeCache from 'node-cache';

const momCache = new NodeCache({ stdTTL: 180 });

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
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const status = searchParams.get('status') || undefined;

    const cacheKey = `moms_${user.email}_${page}_${limit}_${status || 'all'}`;
    const cachedData = momCache.get(cacheKey);
    
    if (cachedData) {
      console.log(`📈 MOMs served from cache for: ${user.email}`);
      return NextResponse.json(cachedData);
    }

    console.log(`📊 Getting MOMs for user: ${user.email}`);

    const result = await momService.getMOMs({
      userProfile: user, // Pass the entire user object as userProfile
      status,
      page,
      limit
    });

    const response = {
      success: true,
      data: result
    };

    momCache.set(cacheKey, response);

    return NextResponse.json(response);

  } catch (error) {
    console.error('[MOMs GET] Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
