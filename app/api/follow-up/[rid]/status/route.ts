import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/api-auth';
import { churnService } from '@/lib/services';

export async function GET(request: NextRequest, { params }: { params: Promise<{ rid: string }> }) {
  try {
    const { rid } = await params;
    
    // Authenticate
    const { user, error } = await authenticateRequest(request);
    if (error) return error;
    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 });
    }

    console.log(`📊 Getting follow-up status for RID: ${rid}`);

    const result = await churnService.getFollowUpStatus(rid, user);

    return NextResponse.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('❌ [Follow-up Status] Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to get follow-up status',
      detail: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
