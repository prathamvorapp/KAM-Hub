import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '../../../../../lib/auth-helpers';
import { healthCheckService } from '@/lib/services';
import NodeCache from 'node-cache';

const brandsCache = new NodeCache({ stdTTL: 300 });

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

    const cacheKey = `brands_for_assessment_${user.email}_${month}`;
    const cachedData = brandsCache.get(cacheKey);
    
    if (cachedData) {
      console.log(`📈 Brands for assessment served from cache`);
      return NextResponse.json(cachedData);
    }

    console.log(`📊 Getting brands for assessment: ${user.email}`);

    const brands = await healthCheckService.getBrandsForAssessment({
      email: user.email,
      month
    });

    const response = {
      success: true,
      data: brands
    };

    brandsCache.set(cacheKey, response);

    return NextResponse.json(response);

  } catch (error) {
    console.error('❌ Error getting brands for assessment:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to load brands',
      detail: String(error)
    }, { status: 500 });
  }
}
