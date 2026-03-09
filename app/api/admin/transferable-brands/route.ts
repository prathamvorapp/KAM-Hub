import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/api-auth';
import { brandTransferService } from '@/lib/services';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/transferable-brands
 * Get all brands that can be transferred by the current user
 * Admin sees all brands, Team Lead sees only their team's brands
 */
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

    // All authenticated users can access transferable brands
    console.log(`✅ [Transferable Brands] User ${user.email} (${user.role}) fetching brands`);

    console.log(`📋 Fetching transferable brands for: ${user.email} (${user.role})`);

    const brands = await brandTransferService.getTransferableBrands(user);

    return NextResponse.json({
      success: true,
      data: brands
    });

  } catch (error) {
    console.error('[Get Transferable Brands] Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
