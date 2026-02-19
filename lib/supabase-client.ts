/**
 * Supabase Client Configuration (Client-side only)
 * 
 * Use this in React components and client-side code
 */

import { createBrowserClient as createClient } from '@supabase/ssr';
import { Database } from './supabase-types';

// Client-side Supabase client (for use in React components)
export function createBrowserClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: 'pkce',
        storage: typeof window !== 'undefined' ? window.localStorage : undefined,
      },
      global: {
        headers: {
          'x-application-name': 'crm-app',
        },
      },
    }
  );
}
