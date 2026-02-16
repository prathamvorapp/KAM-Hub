import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '../../../../../lib/auth-helpers';
import { momService } from '@/lib/services';

export async function GET(request: NextRequest, { params }: { params: Promise<{ momId: string }> }) {
  try {
    const { momId } = await params;
    const user = await getAuthenticatedUser(request);
    
    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 });
    }

    console.log(`📊 Getting MOM: ${momId}`);

    const mom = await momService.getMOMByTicketId(momId);

    if (!mom) {
      return NextResponse.json({
        success: false,
        error: 'MOM not found'
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: mom
    });

  } catch (error) {
    console.error('❌ Error getting MOM:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to load MOM',
      detail: String(error)
    }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ momId: string }> }) {
  try {
    const { momId } = await params;
    const user = await getAuthenticatedUser(request);
    
    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 });
    }

    const body = await request.json();
    
    console.log(`📝 Updating MOM: ${momId}`);

    const result = await momService.updateMOM(momId, body);

    return NextResponse.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('❌ Error updating MOM:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to update MOM',
      detail: String(error)
    }, { status: 500 });
  }
}
