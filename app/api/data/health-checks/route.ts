import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/api-auth';
import { healthCheckService } from '@/lib/services';
import NodeCache from 'node-cache';

const healthCheckCache = new NodeCache({ stdTTL: 180 });

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
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const bustCache = searchParams.get('_t'); // Cache buster from frontend

    const cacheKey = `health_checks_${user.email}_${month}_${page}_${limit}`;
    
    // Skip cache if cache buster is present
    if (!bustCache) {
      const cachedData = healthCheckCache.get(cacheKey);
      if (cachedData) {
        console.log(`📈 Health checks served from cache for: ${user.email}`);
        return NextResponse.json(cachedData);
      }
    } else {
      console.log(`🔄 Health checks cache bypassed due to cache buster`);
    }

    console.log(`📊 Getting health checks for user: ${user.email}`);

    const result = await healthCheckService.getHealthChecks({
      userProfile: user, // Pass the entire user object as userProfile
      month,
      page,
      limit
    });

    const response = {
      success: true,
      data: result
    };

    healthCheckCache.set(cacheKey, response);

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });

  } catch (error) {
    console.error('[Health Checks GET] Error:', error);
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

    const body = await request.json();
    
    console.log(`📝 Creating health check for brand: ${body.brand_name}`);

    // Pass the userProfile directly for authorization and context
    const result = await healthCheckService.createHealthCheck(body, user);

    // FIX: Selective cache invalidation instead of flushAll()
    const month = body.assessment_month || new Date().toISOString().slice(0, 7);
    const keys = healthCheckCache.keys();
    keys.forEach(key => {
      if (key.includes(user.email) || key.includes(month)) {
        healthCheckCache.del(key);
      }
    });
    
    // Clear main health check cache
    healthCheckCache.flushAll();
    
    console.log('✅ Health check cache cleared');
    
    // Return immediately - let caches expire naturally
    return NextResponse.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('[Health Checks POST] Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
