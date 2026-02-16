import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '../../../../lib/auth-helpers';
import { healthCheckService } from '@/lib/services';
import NodeCache from 'node-cache';

const healthCheckCache = new NodeCache({ stdTTL: 180 });

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
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    const cacheKey = `health_checks_${user.email}_${month}_${page}_${limit}`;
    const cachedData = healthCheckCache.get(cacheKey);
    
    if (cachedData) {
      console.log(`📈 Health checks served from cache for: ${user.email}`);
      return NextResponse.json(cachedData);
    }

    console.log(`📊 Getting health checks for user: ${user.email}`);

    const result = await healthCheckService.getHealthChecks({
      email: user.email,
      month,
      page,
      limit
    });

    const response = {
      success: true,
      data: result
    };

    healthCheckCache.set(cacheKey, response);

    return NextResponse.json(response);

  } catch (error) {
    console.error('❌ Error getting health checks:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to load health checks',
      detail: String(error)
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    
    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 });
    }

    const body = await request.json();
    
    console.log(`📝 Creating health check for brand: ${body.brand_name}`);

    const result = await healthCheckService.createHealthCheck({
      ...body,
      created_by: user.email
    });

    // Clear cache
    healthCheckCache.flushAll();

    return NextResponse.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('❌ Error creating health check:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to create health check',
      detail: String(error)
    }, { status: 500 });
  }
}
