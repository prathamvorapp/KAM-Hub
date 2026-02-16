import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '../../../../../lib/auth-helpers';
import { visitService } from '@/lib/services';

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    
    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 });
    }

    const body = await request.json();
    
    console.log(`📝 Submitting MOM for visit: ${body.visit_id}`);

    const result = await visitService.submitMoM({
      ...body,
      created_by: user.email
    });

    return NextResponse.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('❌ Error submitting MOM:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to submit MOM',
      detail: String(error)
    }, { status: 500 });
  }
}
