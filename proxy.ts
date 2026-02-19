import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Define role-based access control rules.
const RBAC_RULES: Record<string, string[]> = {
  '/admin': ['admin'],
  '/team': ['admin', 'team_lead'],
  '/dashboard': ['admin', 'team_lead', 'agent'],
  // Add other protected routes here
};

const PUBLIC_ROUTES = ['/login', '/forgot-password', '/reset-password'];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options });
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: '', ...options });
          response.cookies.set({ name, value: '', ...options });
        },
      },
    }
  );

  // Refresh session on every request.
  const { data: { user } } = await supabase.auth.getUser();

  // 1. Handle authenticated users trying to access public routes.
  if (user && PUBLIC_ROUTES.includes(pathname)) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // 2. Handle unauthenticated users trying to access protected routes.
  const protectedRoute = Object.keys(RBAC_RULES).find(route => pathname.startsWith(route));
  
  if (!user && protectedRoute) {
    const redirectUrl = new URL('/login', request.url);
    redirectUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // 3. Handle authenticated users: fetch role and enforce RBAC.
  if (user && protectedRoute) {
    // Database is the source of truth for the role.
    // TODO: Implement a session cache (e.g., using a signed cookie) here
    // to avoid hitting the database on every request for the user's role.
    // This can significantly reduce latency and database load for role checks.
    const { data: profile, error } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('auth_id', user.id)
      .single();

    if (error || !profile) {
      console.error(`Middleware: Failed to fetch user profile for ${user.id}:`, error?.message || 'Profile not found');
      // If profile fetch fails, treat as unauthorized to prevent UI hangs or data exposure.
      // Redirect to login with a specific error to avoid infinite loops if dashboard requires profile.
      const redirectUrl = new URL('/login?error=profile_fetch_failed', request.url);
      return NextResponse.redirect(redirectUrl);
    }
    
    const userRole = profile.role as string;
    const allowedRoles = RBAC_RULES[protectedRoute];

    if (!allowedRoles.includes(userRole)) {
      // Role not authorized for this route, redirect to a specific unauthorized error page
      // or login to prevent "white screen" hangs.
      const redirectUrl = new URL('/login?error=unauthorized', request.url);
      return NextResponse.redirect(redirectUrl);
    }
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
