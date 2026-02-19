/**
 * API Utilities
 * Standardized response handlers and error management for API routes
 */

import { NextResponse } from 'next/server';

/**
 * Standard API response format
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
    has_next: boolean;
    has_prev: boolean;
  };
}

/**
 * Create a success response
 */
export function successResponse<T>(
  data: T,
  message?: string,
  status: number = 200
): NextResponse<ApiResponse<T>> {
  return NextResponse.json(
    {
      success: true,
      data,
      ...(message && { message }),
    },
    { status }
  );
}

/**
 * Create an error response
 */
export function errorResponse(
  error: string,
  status: number = 500,
  details?: any
): NextResponse<ApiResponse> {
  const response: ApiResponse = {
    success: false,
    error,
  };

  // Only include details in development
  if (process.env.NODE_ENV === 'development' && details) {
    response.message = String(details);
  }

  return NextResponse.json(response, { status });
}

/**
 * Handle Supabase errors and return appropriate response
 */
export function handleDatabaseError(error: any, context?: string): NextResponse<ApiResponse> {
  const errorMessage = error?.message || 'Database error occurred';
  const status = error?.code === 'PGRST116' ? 404 : 500;
  
  if (context) {
    console.error(`[${context}] Database error:`, error);
  }
  
  return errorResponse(errorMessage, status, error);
}

/**
 * Validate required fields in request body
 */
export function validateRequiredFields(
  body: any,
  requiredFields: string[]
): { valid: boolean; missing?: string[] } {
  const missing = requiredFields.filter(field => !body[field]);
  
  if (missing.length > 0) {
    return { valid: false, missing };
  }
  
  return { valid: true };
}

/**
 * Create a paginated response
 */
export function paginatedResponse<T>(
  data: T[],
  page: number,
  limit: number,
  total: number,
  status: number = 200
): NextResponse<ApiResponse<T[]>> {
  const total_pages = Math.ceil(total / limit);
  
  return NextResponse.json(
    {
      success: true,
      data,
      pagination: {
        page,
        limit,
        total,
        total_pages,
        has_next: page < total_pages,
        has_prev: page > 1,
      },
    },
    { status }
  );
}

/**
 * Parse pagination parameters from URL search params
 */
export function parsePaginationParams(searchParams: URLSearchParams): {
  page: number;
  limit: number;
} {
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
  const limit = Math.max(1, parseInt(searchParams.get('limit') || '100'));
  
  return { page, limit };
}

/**
 * Sanitize search query
 */
export function sanitizeSearchQuery(query: string | null): string | undefined {
  if (!query) return undefined;
  
  // Remove special characters that could cause issues
  const sanitized = query
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML
    .substring(0, 200); // Limit length
  
  return sanitized || undefined;
}

/**
 * Log API request (development only)
 */
export function logApiRequest(
  method: string,
  path: string,
  userEmail?: string,
  params?: any
): void {
  if (process.env.NODE_ENV === 'development') {
    console.log(`[API] ${method} ${path}`, {
      user: userEmail,
      params: params ? JSON.stringify(params).substring(0, 100) : undefined,
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * Measure API execution time
 */
export function measureExecutionTime(startTime: number): number {
  return Date.now() - startTime;
}

/**
 * Log API response time (development only)
 */
export function logResponseTime(
  method: string,
  path: string,
  executionTime: number,
  success: boolean
): void {
  if (process.env.NODE_ENV === 'development') {
    const emoji = success ? '✅' : '❌';
    console.log(`${emoji} [API] ${method} ${path} - ${executionTime}ms`);
  }
}

/**
 * Create cache key for API responses
 */
export function createCacheKey(
  prefix: string,
  params: Record<string, any>
): string {
  const sortedParams = Object.keys(params)
    .sort()
    .map(key => `${key}:${params[key]}`)
    .join('_');
  
  return `${prefix}_${sortedParams}`;
}

/**
 * Parse and validate date parameter
 */
export function parseDateParam(dateStr: string | null): Date | null {
  if (!dateStr) return null;
  
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return null;
    return date;
  } catch {
    return null;
  }
}

/**
 * Format date for database queries
 */
export function formatDateForDb(date: Date): string {
  return date.toISOString();
}

/**
 * Check if user has required role
 */
export function hasRequiredRole(
  userRole: string,
  requiredRoles: string[]
): boolean {
  const normalizedUserRole = userRole.toLowerCase().replace(/\s+/g, '_');
  const normalizedRequiredRoles = requiredRoles.map(r => 
    r.toLowerCase().replace(/\s+/g, '_')
  );
  
  return normalizedRequiredRoles.includes(normalizedUserRole);
}

/**
 * Extract user info from request (deprecated - use requireAuth instead)
 */
export function getUserFromHeaders(headers: Headers): {
  email: string | null;
  role: string | null;
  team: string | null;
} {
  return {
    email: headers.get('x-user-email'),
    role: headers.get('x-user-role'),
    team: headers.get('x-user-team'),
  };
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Rate limit response
 */
export function rateLimitResponse(retryAfter: Date | number): NextResponse<ApiResponse> {
  const retryAfterStr = retryAfter instanceof Date 
    ? retryAfter.toISOString() 
    : new Date(retryAfter).toISOString();
  
  return NextResponse.json(
    {
      success: false,
      error: 'Too many requests. Please try again later.',
      message: `Retry after: ${retryAfterStr}`,
    },
    {
      status: 429,
      headers: {
        'Retry-After': retryAfterStr,
      },
    }
  );
}
