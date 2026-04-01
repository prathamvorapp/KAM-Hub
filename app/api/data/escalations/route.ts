import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/api-auth';
import { escalationService } from '@/lib/services';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { user, error } = await authenticateRequest(request);
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const status = (searchParams.get('status') || 'all') as 'open' | 'closed' | 'all';
  const brand_name = searchParams.get('brand_name') || undefined;
  const kam_name = searchParams.get('kam_name') || undefined;
  const brand_nature = searchParams.get('brand_nature') || undefined;
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');

  try {
    const data = await escalationService.getEscalations({ userProfile: user!, status, brand_name, kam_name, brand_nature, page, limit });
    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const { user, error } = await authenticateRequest(request);
  if (error) return error;

  try {
    const body = await request.json();
    const data = await escalationService.createEscalation({ ...body, userProfile: user! });
    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}
