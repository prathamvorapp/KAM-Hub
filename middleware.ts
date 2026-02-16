import { NextRequest, NextResponse } from 'next/server';

// Public routes that don't require authentication
const PUBLIC_ROUTES = [
  '/api/auth/',  // All auth routes (prefix match)
  '/api/debug/',  // Debug endpoints (prefix match)
  '/api/data/visits/direct-statistics',  // Direct statistics endpoint (exact match)
  '/api/user/profile-by-email',  // Specific user profile endpoint (exact match)
  '/login',  // Exact match
  '/forgot-password',  // Exact match
  '/reset-password',  // Exact match
];

// Separate array for the root path to avoid matching all routes
const PUBLIC_PAGE_ROUTES = ['/', '/login', '/forgot-password', '/reset-password'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  console.log('🟢 [MIDDLEWARE] Processing request:', pathname);

  // Skip middleware for static files and Next.js internals
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    pathname.includes('.') ||
    pathname.startsWith('/favicon')
  ) {
    return NextResponse.next();
  }

  // Check if it's a public API route
  const isPublicApiRoute = PUBLIC_ROUTES.some(route => {
    if (route.endsWith('/')) {
      // For routes ending with /, check if pathname starts with it (prefix match)
      return pathname.startsWith(route);
    }
    // For exact routes, match exactly
    return pathname === route;
  });
  
  // Check if it's a public page route (only for non-API routes)
  const isPublicPageRoute = !pathname.startsWith('/api/') && PUBLIC_PAGE_ROUTES.includes(pathname);
  
  if (isPublicApiRoute || isPublicPageRoute) {
    console.log('🟢 [MIDDLEWARE] Public route, allowing');
    return NextResponse.next();
  }

  // For API routes, extract user info from cookies and add to headers
  if (pathname.startsWith('/api/')) {
    console.log('🔵 [MIDDLEWARE] Processing API route:', pathname);
    
    const userSession = request.cookies.get('user-session');
    console.log('🔵 [MIDDLEWARE] User session cookie:', userSession ? 'Found' : 'Not found');
    
    if (!userSession) {
      console.log('❌ [MIDDLEWARE] No user session cookie');
      return NextResponse.json({
        error: 'Authentication required',
        detail: 'No user session found'
      }, { status: 401 });
    }

    try {
      const userData = JSON.parse(userSession.value);
      console.log('🔵 [MIDDLEWARE] User data:', { email: userData.email, role: userData.role });
      
      // Validate session data
      if (!userData.email || !userData.role) {
        console.log('❌ [MIDDLEWARE] Invalid session data');
        return NextResponse.json({
          error: 'Invalid session',
          detail: 'Session data incomplete'
        }, { status: 401 });
      }
      
      // Create a new request with user headers
      const requestHeaders = new Headers(request.headers);
      requestHeaders.set('x-user-email', userData.email || '');
      requestHeaders.set('x-user-role', userData.role || '');
      requestHeaders.set('x-user-team', userData.team_name || '');
      
      console.log('✅ [MIDDLEWARE] Headers set, forwarding request');
      
      return NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      });
    } catch (error) {
      console.log('❌ [MIDDLEWARE] Error parsing session:', error);
      return NextResponse.json({
        error: 'Invalid session',
        detail: 'Session data corrupted'
      }, { status: 401 });
    }
  }

  // For protected pages (dashboard, admin, etc.), let the page handle auth
  // We'll use Convex auth hooks in the components instead of middleware
  if (pathname.startsWith('/dashboard') || pathname.startsWith('/admin')) {
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
