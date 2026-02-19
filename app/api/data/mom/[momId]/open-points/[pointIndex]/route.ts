import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/api-auth';
import { momService } from '@/lib/services';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ momId: string; pointIndex: string }> }) {
  try {
    const { momId, pointIndex } = await params;
    const { user, error } = await authenticateRequest(request);
    if (error) return error;
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
    }, user); // Pass the userProfile here

    return NextResponse.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('[MOM Open Point] Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
