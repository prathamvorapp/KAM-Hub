/**
 * Supabase Server Configuration (Server-side only)
 * 
 * Use this in API routes and server components
 */

import { createClient } from '@supabase/supabase-js';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { Database } from './supabase-types';

// Server-side Supabase client (for use in API routes and server components)
export async function createServerSupabaseClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored as cookies are handled automatically
            // by Supabase in API routes.
          }
        },
      },
    }
  );
}

// Service role client (for admin operations that bypass RLS)
export function createServiceRoleClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      }
    }
  );
}

// Legacy exports for backward compatibility
export const getSupabaseAdmin = createServiceRoleClient;
export const supabase = createServiceRoleClient();
