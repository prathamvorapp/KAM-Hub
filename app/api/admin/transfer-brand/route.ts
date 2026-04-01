import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/api-auth';
import { brandTransferService, engagementCallService } from '@/lib/services';

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/transfer-brand
 * Transfer a brand from one KAM to another
 * Admin and Team Lead only
 */
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

    // All authenticated users can transfer brands
    console.log(`✅ [Transfer Brand] User ${user.email} (${user.role}) initiating transfer`);

    const body = await request.json();
    const { brandId, fromAgentEmail, toAgentEmail, transferReason, transferYear } = body;

    // Validation
    if (!brandId || !fromAgentEmail || !toAgentEmail || !transferReason) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: brandId, fromAgentEmail, toAgentEmail, transferReason'
      }, { status: 400 });
    }

    if (fromAgentEmail === toAgentEmail) {
      return NextResponse.json({
        success: false,
        error: 'Cannot transfer brand to the same KAM'
      }, { status: 400 });
    }

    console.log(`🔄 Brand transfer request:`, {
      brandId,
      from: fromAgentEmail,
      to: toAgentEmail,
      requestedBy: user.email
    });

    const result = await brandTransferService.transferBrand({
      brandId,
      fromAgentEmail,
      toAgentEmail,
      transferReason,
      transferYear
    }, user);

    // Sync engagement calls for the current month after transfer
    try {
      const currentMonth = new Date().toISOString().slice(0, 7);
      const { data: brandData } = await (await import('@/lib/supabase-server')).getSupabaseAdmin()
        .from('master_data')
        .select('brand_name, zone, id')
        .eq('id', brandId)
        .single();

      const { data: newKam } = await (await import('@/lib/supabase-server')).getSupabaseAdmin()
        .from('user_profiles')
        .select('full_name, team_name')
        .eq('email', toAgentEmail)
        .single();

      if (brandData && newKam) {
        await engagementCallService.handleBrandTransfer({
          month: currentMonth,
          brandName: (brandData as any).brand_name,
          brandId: (brandData as any).id,
          fromKamEmail: fromAgentEmail,
          toKamEmail: toAgentEmail,
          toKamName: (newKam as any).full_name,
          toTeamName: (newKam as any).team_name,
          zone: (brandData as any).zone,
        });
      }
    } catch (syncErr) {
      // Non-fatal — log but don't fail the transfer
      console.warn('[Transfer Brand] Engagement call sync failed:', syncErr);
    }

    return NextResponse.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('[Transfer Brand] Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

/**
 * GET /api/admin/transfer-brand?brandId=xxx
 * Get transfer history for a brand
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

    const { searchParams } = new URL(request.url);
    const brandId = searchParams.get('brandId');

    if (!brandId) {
      return NextResponse.json({
        success: false,
        error: 'brandId parameter is required'
      }, { status: 400 });
    }

    const history = await brandTransferService.getBrandTransferHistory(brandId, user);

    return NextResponse.json({
      success: true,
      data: history
    });

  } catch (error) {
    console.error('[Get Transfer History] Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
