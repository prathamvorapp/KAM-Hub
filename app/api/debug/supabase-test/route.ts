import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { requireDebugMode } from '@/lib/debug-protection';

export async function GET(request: NextRequest) {
  // Protect in production
  const debugCheck = requireDebugMode();
  if (debugCheck) return debugCheck;
  
  try {
    console.log('🔍 [SUPABASE TEST] Testing Supabase connection...');
    
    const supabase = getSupabaseAdmin();
    
    // Test 1: Check user_profiles table
    console.log('📊 [TEST 1] Checking user_profiles table...');
    const { data: userProfiles, error: userError } = await supabase
      .from('user_profiles')
      .select('*')
      .limit(1);
    
    if (userError) {
      console.error('❌ [TEST 1] user_profiles error:', userError);
    } else {
      console.log('✅ [TEST 1] user_profiles OK, found', userProfiles?.length || 0, 'records');
    }
    
    // Test 2: Check master_data table
    console.log('📊 [TEST 2] Checking master_data table...');
    const { data: masterData, error: masterError } = await supabase
      .from('master_data')
      .select('*')
      .limit(1);
    
    if (masterError) {
      console.error('❌ [TEST 2] master_data error:', masterError);
    } else {
      console.log('✅ [TEST 2] master_data OK, found', masterData?.length || 0, 'records');
    }
    
    // Test 3: Check visits table
    console.log('📊 [TEST 3] Checking visits table...');
    const { data: visits, error: visitsError } = await supabase
      .from('visits')
      .select('*')
      .limit(1);
    
    if (visitsError) {
      console.error('❌ [TEST 3] visits error:', visitsError);
    } else {
      console.log('✅ [TEST 3] visits OK, found', visits?.length || 0, 'records');
    }
    
    // Test 4: Check specific user
    const testEmail = request.nextUrl.searchParams.get('email') || 'rahul.taak@petpooja.com';
    console.log('📊 [TEST 4] Checking user:', testEmail);
    const { data: user, error: userLookupError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('email', testEmail)
      .single();
    
    if (userLookupError) {
      console.error('❌ [TEST 4] user lookup error:', userLookupError);
    } else {
      console.log('✅ [TEST 4] user found:', user);
    }
    
    return NextResponse.json({
      success: true,
      tests: {
        userProfiles: {
          success: !userError,
          error: userError?.message,
          count: userProfiles?.length || 0
        },
        masterData: {
          success: !masterError,
          error: masterError?.message,
          count: masterData?.length || 0
        },
        visits: {
          success: !visitsError,
          error: visitsError?.message,
          count: visits?.length || 0
        },
        userLookup: {
          success: !userLookupError,
          error: userLookupError?.message,
          user: user || null
        }
      },
      environment: {
        supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
        hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY
      }
    });
    
  } catch (error: any) {
    console.error('❌ [SUPABASE TEST] Fatal error:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}
