/**
 * Debug Route Protection Utility
 * 
 * Provides protection for debug routes in production
 */

import { NextResponse } from 'next/server';

/**
 * Check if debug routes should be enabled
 * Debug routes are only enabled in development environment
 */
export function isDebugEnabled(): boolean {
  return process.env.NODE_ENV !== 'production';
}

/**
 * Return error response for disabled debug endpoints
 */
export function debugDisabledResponse(): NextResponse {
  return NextResponse.json(
    { 
      success: false,
      error: 'Debug endpoints are disabled in production',
      message: 'This endpoint is only available in development mode'
    },
    { status: 404 }
  );
}

/**
 * Protection function for debug routes
 * Returns null if debug is enabled, error response if disabled
 */
export function requireDebugMode(): NextResponse | null {
  if (!isDebugEnabled()) {
    return debugDisabledResponse();
  }
  return null;
}
