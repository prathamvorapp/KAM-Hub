import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/api-auth';
import { visitService } from '@/lib/services';

export async function POST(request: NextRequest, { params }: { params: Promise<{ visitId: string }> }) {
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

    console.log(`📝 Resubmitting MOM for visit: ${visitId}`);

    const result = await visitService.resubmitMoM({
      visit_id: visitId,
      // agent_email: user.email // Removed, now derived from userProfile
    }, user); // Pass the userProfile here

    return NextResponse.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('[Visit Resubmit] Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
