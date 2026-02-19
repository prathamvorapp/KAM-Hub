import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token } = body;

    // With server-first, cookie-based authentication using @supabase/ssr,
    // client-side token verification is typically handled implicitly by the presence
    // of auth cookies. This endpoint is retained as a stub and always returns invalid
    // to prompt re-login if explicit client-side token validation is attempted
    // outside of the standard Supabase flow.
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
