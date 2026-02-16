import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '../../../../../../lib/auth-helpers';
import { visitService } from '@/lib/services';

export async function POST(request: NextRequest, { params }: { params: Promise<{ visitId: string }> }) {
  try {
    const { visitId } = await params;
    const user = await getAuthenticatedUser(request);
    
    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 });
    }

    console.log(`📝 Resubmitting MOM for visit: ${visitId}`);

    const result = await visitService.resubmitMoM({
      visit_id: visitId,
      agent_email: user.email
    });

    return NextResponse.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('❌ Error resubmitting MOM:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to resubmit MOM',
      detail: String(error)
    }, { status: 500 });
  }
}
