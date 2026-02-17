import { NextRequest, NextResponse } from 'next/server';
import { visitService } from '@/lib/services';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ visitId: string }> }
) {
  try {
    const { visitId } = await params;
    const userEmail = request.headers.get('x-user-email');
    
    console.log('🔵 [MOM API] Received MOM submission request:', {
      visitId,
      userEmail,
      hasAuth: !!userEmail
    });
    
    if (!userEmail) {
      console.error('❌ [MOM API] No user email in headers');
      return NextResponse.json({
        error: 'Authentication required'
      }, { status: 401 });
    }

    const body = await request.json();
    
    console.log('📦 [MOM API] Request body:', {
      visit_id: body.visit_id,
      has_open_points: !!body.open_points,
      open_points_count: body.open_points?.length || 0,
      mom_shared: body.mom_shared,
      created_by: body.created_by,
      brand_name: body.brand_name
    });

    await visitService.submitMoM({
      visit_id: visitId,
      ...body
    });

    console.log('✅ [MOM API] MOM submitted successfully');

    return NextResponse.json({
      success: true,
      message: 'MOM submitted successfully'
    });

  } catch (error) {
    console.error('❌ [MOM API] Error submitting MOM:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to submit MOM',
      detail: String(error)
    }, { status: 500 });
  }
}
