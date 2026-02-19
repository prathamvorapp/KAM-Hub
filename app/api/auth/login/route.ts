import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { UserService } from '../../../../lib/services/userService';
import { UserRole } from '@/lib/models/user';
import { checkRateLimit, getClientIdentifier } from '../../../../lib/rate-limit';
// import { createServerSupabaseClient } from '../../../../lib/supabase-server'; // No longer importing this
import { createServerClient } from '@supabase/ssr'; // Import createServerClient directly from @supabase/ssr
import { cookies } from 'next/headers'; // Import cookies directly for API route context
import { Database } from '../../../../lib/supabase-types'; // Assuming you have this type definition

const userService = new UserService();

// Validation schema
const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

export async function POST(request: NextRequest) {
  let response: NextResponse<any> = NextResponse.json({ success: false, error: 'An unexpected error occurred' }, { status: 500 }); // Initialize a mutable response object

  try {
    // Rate limiting check
    const identifier = getClientIdentifier(request);
    const rateLimitResult = await checkRateLimit(identifier, 'auth');

    if (!rateLimitResult.success) {
      response = NextResponse.json({
        success: false,
        error: 'Too many login attempts. Please try again later.',
        retryAfter: rateLimitResult.reset
      }, { 
        status: 429,
        headers: {
          'X-RateLimit-Limit': rateLimitResult.limit.toString(),
          'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
          'X-RateLimit-Reset': rateLimitResult.reset instanceof Date ? rateLimitResult.reset.toISOString() : new Date(rateLimitResult.reset).toISOString(),
        }
      });
      return response;
    }

    const body = await request.json();
    const { email, password } = LoginSchema.parse(body);
    
    const cookieStore = await cookies(); // Access cookies here
    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              // This `response` object needs to be the one we eventually return.
              // `response.cookies.set` directly modifies the headers of this `NextResponse` instance.
              response.cookies.set(name, value, options);
            });
          },
        },
      }
    );

    const { data: sessionData, error: sessionError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: password
    });

    if (sessionError || !sessionData.session || !sessionData.user) {
      response = NextResponse.json({
        success: false,
        error: 'Invalid email or password'
      }, { status: 401 });
      // Clear any potentially set cookies on error
      const allCookies = cookieStore.getAll();
      allCookies.forEach(cookie => {
        response.cookies.set(cookie.name, '', { expires: new Date(0) });
      });
      return response;
    }

    // Fetch user profile
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('email, full_name, role, team_name, is_active')
      .eq('auth_id', sessionData.user.id)
      .eq('is_active', true)
      .single();

    if (profileError || !profile) {
      await supabase.auth.signOut(); // Invalidate session
      response = NextResponse.json({
        success: false,
        error: 'User profile not found or inactive'
      }, { status: 401 });
      // Clear cookies from this error response
      const allCookies = cookieStore.getAll();
      allCookies.forEach(cookie => {
        response.cookies.set(cookie.name, '', { expires: new Date(0) });
      });
      return response;
    }

    // Type assertion for profile
    const userProfile = profile as {
      email: string;
      full_name: string;
      role: string;
      team_name: string;
      is_active: boolean;
    };

    // Map database role to UserRole enum
    const roleMap: Record<string, UserRole> = {
      'admin': UserRole.ADMIN,
      'Admin': UserRole.ADMIN,
      'team_lead': UserRole.TEAM_LEAD,
      'Team Lead': UserRole.TEAM_LEAD,
      'agent': UserRole.AGENT,
      'Agent': UserRole.AGENT
    };
    
    const userRole = roleMap[userProfile.role] || UserRole.AGENT;

    // Get permissions
    const permissions = userService.getPermissionsForRole(userRole);
    
    // Now, set the actual JSON body for the 'response' object, preserving existing headers (cookies)
    response = NextResponse.json({
      success: true,
      user: {
        id: sessionData.user.id,
        email: userProfile.email,
        full_name: userProfile.full_name,
        role: userProfile.role,
        team_name: userProfile.team_name,
        permissions
      },
      session: {
        access_token: sessionData.session.access_token,
        refresh_token: sessionData.session.refresh_token
      }
    }, {
      status: 200,
      headers: response.headers // IMPORTANT: Preserve headers (cookies) set by Supabase
    });

    return response;
  } catch (error) {
    console.error("Login API error:", error);
    response = NextResponse.json({
      success: false,
      error: 'Login failed'
    }, { status: 500 });
    // Ensure error response also clears cookies if any were partially set
    const cookieStore = await cookies();
    cookieStore.getAll().forEach(cookie => {
      response.cookies.set(cookie.name, '', { expires: new Date(0) });
    });
    return response;
  }
}
