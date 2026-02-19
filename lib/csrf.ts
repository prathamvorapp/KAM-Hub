import Tokens from 'csrf';
import { NextRequest, NextResponse } from 'next/server';

const tokens = new Tokens();

// Secret for CSRF token generation (should be in env, but using a constant for simplicity)
const CSRF_SECRET = process.env.CSRF_SECRET || 'your-csrf-secret-change-in-production';

/**
 * Generate a CSRF token
 */
export function generateCSRFToken(): string {
  return tokens.create(CSRF_SECRET);
}

/**
 * Verify a CSRF token
 */
export function verifyCSRFToken(token: string): boolean {
  return tokens.verify(CSRF_SECRET, token);
}

/**
 * Check CSRF token for state-changing operations
 */
export function checkCSRF(request: NextRequest): NextResponse | null {
  // Skip CSRF check for GET, HEAD, OPTIONS
  if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
    return null;
  }

  // Get CSRF token from header or body
  const csrfToken = request.headers.get('x-csrf-token') || 
                    request.headers.get('csrf-token');

  if (!csrfToken) {
    return NextResponse.json({
      success: false,
      error: 'CSRF token missing',
      detail: 'CSRF token is required for this operation'
    }, { status: 403 });
  }

  if (!verifyCSRFToken(csrfToken)) {
    return NextResponse.json({
      success: false,
      error: 'Invalid CSRF token',
      detail: 'CSRF token verification failed'
    }, { status: 403 });
  }

  return null; // Token is valid, continue
}

/**
 * API endpoint to get a CSRF token
 */
export function getCSRFTokenResponse(): NextResponse {
  const token = generateCSRFToken();
  
  return NextResponse.json({
    success: true,
    csrfToken: token
  });
}
