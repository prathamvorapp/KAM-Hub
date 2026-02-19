import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/api-auth';
import { visitService } from '@/lib/services';

export async function POST(request: NextRequest) {
  try {
    const { user, error } = await authenticateRequest(request);
    if (error) return error;
    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 });
    }

    const body = await request.json();

    console.log(`📅 Creating visit for brand: ${body.brand_name}`);
    console.log(`📋 Visit data:`, JSON.stringify(body, null, 2));

    // Don't add created_by - the visits table doesn't have this column
    const result = await visitService.createVisit(body, user); // Pass the userProfile here

    console.log(`✅ Visit created successfully`);

    return NextResponse.json({
      success: true,
      data: result
    });

  } catch (error: any) {
    console.error('[Visit Create] Error:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
