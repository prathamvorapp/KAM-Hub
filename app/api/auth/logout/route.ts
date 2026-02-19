import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr'; // Import createServerClient directly
import { cookies } from 'next/headers'; // Import cookies
import { Database } from '@/lib/supabase-types'; // Assuming you have this type definition

export async function POST(request: NextRequest) {
  let response: NextResponse<any> = NextResponse.json({ success: true, message: 'Logged out successfully' }); // Initialize a mutable response object

  try {
    const cookieStore = await cookies();
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
              response.cookies.set(name, value, options);
            });
          },
        },
      }
    );
    
    // Sign out from Supabase (this clears the auth cookies via the setAll callback)
    await supabase.auth.signOut();
    
    // The response object now has the updated headers for clearing cookies.
    // Ensure the JSON body is also correct for success.
    response = NextResponse.json({
      success: true,
      message: 'Logged out successfully'
    }, {
      status: 200,
      headers: response.headers // Preserve headers (cookies) set by Supabase
    });

    return response;
  } catch (error) {
    console.error('Logout error:', error);
    
    // Even if there's an error, return success to allow client-side cleanup
    // Ensure error response also clears cookies if any were partially set
    const cookieStore = await cookies();
    cookieStore.getAll().forEach(cookie => {
      response.cookies.set(cookie.name, '', { expires: new Date(0) });
    });

    response = NextResponse.json({
      success: true, // Still return success to clear client-side state
      message: 'Logged out with potential server-side error'
    }, {
      status: 200,
      headers: response.headers // Preserve headers (cookies) set by Supabase
    });
    return response;
  }
}
