import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/api-auth';
import { healthCheckService } from '@/lib/services';
import NodeCache from 'node-cache';

export const brandsCache = new NodeCache({ stdTTL: 300 }); // Increased from 60 to 300 seconds (5 min)

// Helper function to clear cache for a specific user and month
export function clearBrandsCache(email: string, month: string) {
  const cacheKey = `brands_for_assessment_${email}_${month}`;
  brandsCache.del(cacheKey);
  console.log(`🗑️ Cleared brands cache for ${email} - ${month}`);
}

// Clear all cache
export function clearAllBrandsCache() {
  brandsCache.flushAll();
  console.log(`🗑️ Cleared all brands cache`);
}

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

    const cacheKey = `brands_for_assessment_${user.email}_${month}`;
    
    // Skip cache if cache buster is present (frontend always sends it)
    if (!bustCache) {
      const cachedData = brandsCache.get(cacheKey);
      if (cachedData) {
        console.log(`📈 Brands for assessment served from cache`);
        return NextResponse.json(cachedData);
      }
    } else {
      console.log(`🔄 Cache bypassed due to cache buster`);
    }

    console.log(`📊 Getting brands for assessment: ${user.email}`);

    const brands = await healthCheckService.getBrandsForAssessment({
      userProfile: user, // Pass the entire user object as userProfile
      month
    });

    console.log(`📊 [API] Brands returned from service: ${brands.length}`);

    const response = {
      success: true,
      data: brands
    };

    brandsCache.set(cacheKey, response);

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });

  } catch (error) {
    console.error('[Health Check Brands] Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
