import { NextRequest, NextResponse } from 'next/server';
import { visitService } from '@/lib/services';

export async function POST(request: NextRequest) {
  try {
    const userEmail = request.headers.get('x-user-email');
    
    if (!userEmail) {
      return NextResponse.json({
        error: 'Authentication required'
      }, { status: 401 });
    }

    const body = await request.json();

    console.log(`📅 Creating visit for brand: ${body.brand_name}`);
    console.log(`📋 Visit data:`, JSON.stringify(body, null, 2));

    // Don't add created_by - the visits table doesn't have this column
    const result = await visitService.createVisit(body);

    console.log(`✅ Visit created successfully`);

    return NextResponse.json({
      success: true,
      data: result
    });

  } catch (error: any) {
    console.error('❌ Error creating visit:', error);
    console.error('❌ Error details:', error.message);
    console.error('❌ Error stack:', error.stack);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to create visit',
      detail: error.message || String(error)
    }, { status: 500 });
  }
}
