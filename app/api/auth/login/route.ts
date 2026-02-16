import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { UserService } from '../../../../lib/services/userService';
import { checkRateLimit, getClientIdentifier } from '../../../../lib/rate-limit';

const userService = new UserService();

// Validation schema
const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

export async function POST(request: NextRequest) {
  try {
    // Rate limiting check
    const identifier = getClientIdentifier(request);
    const rateLimitResult = await checkRateLimit(identifier, 'auth');

    if (!rateLimitResult.success) {
      return NextResponse.json({
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
    }

    const body = await request.json();
    const { email, password } = LoginSchema.parse(body);
    
    console.log(`🔍 [LOGIN] Attempt for: ${email}`);
    console.log(`🔍 [LOGIN] Password length: ${password.length}`);
    
    // Authenticate user with Supabase
    const authResult = await userService.authenticateUser(email, password);
    
    console.log(`🔍 [LOGIN] Auth result:`, { 
      success: authResult.success, 
      hasUser: !!authResult.user,
      error: authResult.error 
    });
    
    if (!authResult.success || !authResult.user) {
      console.log(`❌ [LOGIN] Failed for: ${email} - ${authResult.error}`);
      return NextResponse.json({
        success: false,
        error: authResult.error || 'Invalid email or password'
      }, { status: 401 });
    }

    const user = authResult.user;

    console.log(`✅ [LOGIN] Successful for: ${email} (${user.role})`);
    
    const response = NextResponse.json({
      success: true,
      user: {
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        team_name: user.team_name,
        permissions: user.permissions
      }
    });

    // Set a simple session cookie (no JWT needed)
    response.cookies.set('user-session', JSON.stringify({
      email: user.email,
      role: user.role,
      team_name: user.team_name
    }), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 // 24 hours
    });

    return response;
  } catch (error) {
    console.error(`❌ [LOGIN] Exception:`, error);
    return NextResponse.json({
      success: false,
      error: 'Login failed',
      detail: String(error)
    }, { status: 500 });
  }
}