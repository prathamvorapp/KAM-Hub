import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '../../../../../lib/auth-helpers';
import { churnService } from '@/lib/services';

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    
    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 });
    }

    console.log(`📊 Getting overdue follow-ups for user: ${user.email}`);

    const result = await churnService.getOverdueFollowUps(undefined, user.email);

    return NextResponse.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('❌ Error getting overdue follow-ups:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to get overdue follow-ups',
      detail: String(error)
    }, { status: 500 });
  }
}
