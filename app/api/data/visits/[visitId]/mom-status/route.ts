import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/api-auth';
import { visitService } from '@/lib/services';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ visitId: string }> }
) {
  try {
    const { visitId } = await params;
    const { user, error } = await authenticateRequest(request);
    if (error) return error;
    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 });
    }

    const body = await request.json();
    const { mom_shared } = body;

    if (!mom_shared) {
      return NextResponse.json({
        error: 'mom_shared is required'
      }, { status: 400 });
    }

    await visitService.updateMOMStatus({
      visit_id: visitId,
      mom_shared,
      mom_shared_date: new Date().toISOString()
    }, user);

    return NextResponse.json({
      success: true,
      message: 'MOM status updated successfully'
    });

  } catch (error) {
    console.error('[Visit MOM Status] Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
