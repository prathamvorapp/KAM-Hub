import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/api-auth';
import { UpdateOwnerEmailSchema } from '@/lib/models/churn';
import { churnService } from '@/lib/services';

export const dynamic = 'force-dynamic';

export async function PATCH(request: NextRequest) {
  try {
    const { user, error } = await authenticateRequest(request);
    if (error) return error;
    if (!user) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const { rid, owner_email } = UpdateOwnerEmailSchema.parse(body);

    await churnService.updateOwnerEmail({ rid, owner_email, userProfile: user });

    return NextResponse.json({
      success: true,
      message: 'Owner email updated successfully',
      data: { rid, owner_email, updated_by: user.email, updated_at: new Date().toISOString() }
    });
  } catch (error) {
    console.error('❌ [Update Owner Email] Error:', error);
    const message = error instanceof Error ? error.message : String(error);
    const status = message.startsWith('Access denied') ? 403 : 500;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
