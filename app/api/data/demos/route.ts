import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/api-auth';
import { demoService } from '@/lib/services';
import { clearDemoStatsCache } from '@/lib/cache/demoCache';

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

    console.log(`📊 Getting demos for user: ${user.email} (${user.role})`);

    const result = await demoService.getDemosForAgent(user); // Pass the entire user object as userProfile

    return NextResponse.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('[Demos GET] Error:', error);
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
    const { brandId } = body;

    if (!brandId) {
      return NextResponse.json({
        success: false,
        error: 'brandId is required'
      }, { status: 400 });
    }

    console.log(`🚀 Initializing demos for brand: ${brandId}`);

    const result = await demoService.initializeBrandDemosFromMasterData(brandId, user); // Pass userProfile

    // Clear the demo statistics cache for the user
    clearDemoStatsCache(user.email);

    return NextResponse.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('[Demos POST] Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
