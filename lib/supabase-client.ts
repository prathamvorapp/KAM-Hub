/**
 * Supabase Client Configuration
 * 
 * Provides configured Supabase clients for browser and server-side usage
 * Optimized for production with connection pooling and error handling
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './supabase-types';

// Supabase configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder-url.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';

/**
 * Browser/Client-side Supabase client
 * Uses anon key with RLS policies
 */
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce'
  },
  global: {
    headers: {
      'x-application-name': 'kam-dashboard'
    }
  },
  db: {
    schema: 'public'
  }
});

/**
 * Server-side Supabase client (for API routes)
 * Uses service role key to bypass RLS when needed
 * Optimized with connection pooling
 * 
 * NOTE: This should ONLY be used in API routes (server-side)
 * DO NOT import this in client components
 */
export function getSupabaseAdmin(): SupabaseClient<Database> {
  // Only create admin client on server side
  if (typeof window !== 'undefined') {
    throw new Error('getSupabaseAdmin can only be used on the server side. Use supabase client instead.');
  }
  
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!serviceKey) {
    console.warn('Missing SUPABASE_SERVICE_ROLE_KEY environment variable - using anon key');
    return supabase as SupabaseClient<Database>;
  }
  
  return createClient<Database>(
    supabaseUrl,
    serviceKey,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      },
      global: {
        headers: {
          'x-application-name': 'kam-dashboard-admin'
        }
      },
      db: {
        schema: 'public'
      }
    }
  );
}

/**
 * Helper function to handle Supabase errors with detailed logging
 */
export function handleSupabaseError(error: any, context?: string) {
  const errorContext = context ? `[${context}]` : '';
  console.error(`Supabase error ${errorContext}:`, error);
  
  // PostgreSQL error codes
  if (error.code === 'PGRST116') {
    return { error: 'No data found', status: 404 };
  }
  
  if (error.code === '23505') {
    return { error: 'Duplicate entry - record already exists', status: 409 };
  }
  
  if (error.code === '23503') {
    return { error: 'Foreign key constraint violation', status: 400 };
  }
  
  if (error.code === '23502') {
    return { error: 'Required field is missing', status: 400 };
  }
  
  if (error.code === '42P01') {
    return { error: 'Table does not exist', status: 500 };
  }
  
  if (error.code === '42703') {
    return { error: 'Column does not exist', status: 500 };
  }
  
  // Network errors
  if (error.message?.includes('Failed to fetch') || error.message?.includes('NetworkError')) {
    return { error: 'Network error - please check your connection', status: 503 };
  }
  
  // Timeout errors
  if (error.message?.includes('timeout')) {
    return { error: 'Request timeout - please try again', status: 504 };
  }
  
  // Authentication errors
  if (error.status === 401 || error.message?.includes('JWT')) {
    return { error: 'Authentication failed', status: 401 };
  }
  
  // Permission errors
  if (error.status === 403 || error.code === '42501') {
    return { error: 'Permission denied', status: 403 };
  }
  
  return { error: error.message || 'Database error', status: 500 };
}

/**
 * Retry helper for transient errors
 */
export async function retryOperation<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 1000
): Promise<T> {
  let lastError: any;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;
      
      // Don't retry on client errors (4xx)
      if (error.status && error.status >= 400 && error.status < 500) {
        throw error;
      }
      
      if (attempt < maxRetries) {
        console.log(`Retry attempt ${attempt}/${maxRetries} after ${delayMs}ms`);
        await new Promise(resolve => setTimeout(resolve, delayMs * attempt));
      }
    }
  }
  
  throw lastError;
}

/**
 * Type-safe query builder helpers
 */
export const db = {
  // User profiles
  userProfiles: () => supabase.from('user_profiles'),
  
  // Master data
  masterData: () => supabase.from('master_data'),
  
  // Churn records
  churnRecords: () => supabase.from('churn_records'),
  
  // Visits
  visits: () => supabase.from('visits'),
  
  // Demos
  demos: () => supabase.from('demos'),
  
  // Health checks
  healthChecks: () => supabase.from('health_checks'),
  
  // MOM
  mom: () => supabase.from('mom'),
  
  // Notification preferences
  notificationPreferences: () => supabase.from('notification_preferences'),
  
  // Notification log
  notificationLog: () => supabase.from('notification_log')
};

/**
 * Admin query builder (bypasses RLS)
 * Only use in API routes (server-side)
 */
export const adminDb = {
  userProfiles: () => getSupabaseAdmin().from('user_profiles'),
  masterData: () => getSupabaseAdmin().from('master_data'),
  churnRecords: () => getSupabaseAdmin().from('churn_records'),
  visits: () => getSupabaseAdmin().from('visits'),
  demos: () => getSupabaseAdmin().from('demos'),
  healthChecks: () => getSupabaseAdmin().from('health_checks'),
  mom: () => getSupabaseAdmin().from('mom'),
  notificationPreferences: () => getSupabaseAdmin().from('notification_preferences'),
  notificationLog: () => getSupabaseAdmin().from('notification_log')
};

export default supabase;
