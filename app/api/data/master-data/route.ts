import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, getDataFilter } from '../../../../lib/auth-helpers';
import { masterDataService } from '@/lib/services';
import NodeCache from 'node-cache';

// Cache for master data
const masterDataCache = new NodeCache({ stdTTL: 600 }); // 10 minutes TTL

export async function GET(request: NextRequest) {
  try {
    // Get authenticated user
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
    const search = searchParams.get('search') || '';

    // Cache key based on user and filters
    const cacheKey = `master_data_${user.email}_${user.role}_${page}_${limit}_${search}`;
    
    const cachedData = masterDataCache.get(cacheKey);
    if (cachedData) {
      console.log(`📈 Master data served from cache for user: ${user.email}`);
      return NextResponse.json(cachedData);
    }

    console.log(`📊 Getting master data for user: ${user.email} (${user.role})`);

    // Get master data from Supabase with role-based filtering
    const result = await masterDataService.getMasterData({
      email: user.email,
      search,
      page,
      limit
    });

    const response = {
      success: true,
      data: result
    };

    // Cache the response
    masterDataCache.set(cacheKey, response);

    return NextResponse.json(response);

  } catch (error) {
    console.error('❌ Error getting master data:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to load master data',
      detail: String(error)
    }, { status: 500 });
  }
}