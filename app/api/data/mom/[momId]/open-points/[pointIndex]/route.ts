import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '../../../../../../../lib/auth-helpers';
import { momService } from '@/lib/services';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ momId: string; pointIndex: string }> }) {
  try {
    const { momId, pointIndex } = await params;
    const user = await getAuthenticatedUser(request);
    
    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 });
    }

    const body = await request.json();
    const { status } = body;
    
    console.log(`📝 Updating open point ${pointIndex} for MOM: ${momId}`);

    const result = await momService.updateOpenPointStatus({
      ticketId: momId,
      pointIndex: parseInt(pointIndex),
      status
    });

    return NextResponse.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('❌ Error updating open point:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to update open point',
      detail: String(error)
    }, { status: 500 });
  }
}
