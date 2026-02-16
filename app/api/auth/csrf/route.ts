import { NextResponse } from 'next/server';
import { generateCSRFToken } from '../../../../lib/csrf';

/**
 * GET /api/auth/csrf
 * Returns a CSRF token for the client to use in subsequent requests
 */
export async function GET() {
  const token = generateCSRFToken();
  
  return NextResponse.json({
    success: true,
    csrfToken: token
  });
}
