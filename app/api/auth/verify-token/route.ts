import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token } = body;

    // Since we removed token-based auth and use localStorage only,
    // this endpoint just returns invalid to force re-login
    return NextResponse.json({
      valid: false,
      message: 'Token verification not supported. Please login again.'
    }, { status: 200 });

  } catch (error) {
    console.error('Error in verify-token:', error);
    return NextResponse.json({
      valid: false,
      error: 'Invalid request'
    }, { status: 400 });
  }
}
