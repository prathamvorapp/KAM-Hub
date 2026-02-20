import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/api-auth';
import { clearAllHealthCheckCaches } from '@/lib/cache/health-check-cache';

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

    // Clear all health check related caches
    clearAllHealthCheckCaches();

    console.log(`🗑️ [Cache Clear] All health check caches cleared by ${user.email}`);

    return NextResponse.json({
      success: true,
      message: 'Cache cleared successfully'
    });

  } catch (error) {
    console.error('[Clear Cache] Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
