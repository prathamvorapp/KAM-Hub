import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '../../../../../lib/auth-helpers';
import { churnService } from '@/lib/services';

export async function GET(request: NextRequest, { params }: { params: Promise<{ rid: string }> }) {
  try {
    const { rid } = await params;
    const user = await getAuthenticatedUser(request);
    
    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 });
    }

    console.log(`📊 Getting follow-up status for RID: ${rid}`);

    const result = await churnService.getFollowUpStatus(rid, user.email);

    return NextResponse.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('❌ Error getting follow-up status:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to get follow-up status',
      detail: String(error)
    }, { status: 500 });
  }
}
