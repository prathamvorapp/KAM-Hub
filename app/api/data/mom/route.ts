import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '../../../../lib/auth-helpers';
import { momService } from '@/lib/services';
import NodeCache from 'node-cache';

const momCache = new NodeCache({ stdTTL: 180 });

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
      email: user.email,
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
    console.error('❌ Error getting MOMs:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to load MOMs',
      detail: String(error)
    }, { status: 500 });
  }
}
