import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-client';

export async function GET(request: NextRequest) {
  try {
    const email = request.nextUrl.searchParams.get('email') || 'rahul.taak@petpooja.com';
    const supabase = getSupabaseAdmin();
    
    console.log('🔍 [COUNT BRANDS] Counting brands for:', email);
    
    // Method 1: Count with exact count
    const { count: exactCount, error: countError } = await supabase
      .from('master_data')
      .select('*', { count: 'exact', head: true })
      .eq('kam_email_id', email);
    
    console.log('📊 [METHOD 1] Count with head:', exactCount);
    
    // Method 2: Fetch all with no limit
    const { data: allData, error: allError } = await supabase
      .from('master_data')
      .select('*')
      .eq('kam_email_id', email);
    
    console.log('📊 [METHOD 2] Fetch all (default):', allData?.length);
    
    // Method 3: Fetch with explicit high limit
    const { data: limitedData, error: limitError } = await supabase
      .from('master_data')
      .select('*')
      .eq('kam_email_id', email)
      .limit(1000);
    
    console.log('📊 [METHOD 3] Fetch with limit 1000:', limitedData?.length);
    
    // Method 4: Fetch with range
    const { data: rangeData, error: rangeError } = await supabase
      .from('master_data')
      .select('*')
      .eq('kam_email_id', email)
      .range(0, 999);
    
    console.log('📊 [METHOD 4] Fetch with range 0-999:', rangeData?.length);
    
    return NextResponse.json({
      success: true,
      email: email,
      results: {
        method1_count_exact: exactCount,
        method2_fetch_all: allData?.length || 0,
        method3_limit_1000: limitedData?.length || 0,
        method4_range_0_999: rangeData?.length || 0
      },
      errors: {
        countError: countError?.message,
        allError: allError?.message,
        limitError: limitError?.message,
        rangeError: rangeError?.message
      },
      sample_brands: (allData as any[])?.slice(0, 5).map(b => b.brand_name),
      all_brand_names: (allData as any[])?.map(b => b.brand_name)
    });
    
  } catch (error: any) {
    console.error('❌ [COUNT BRANDS] Error:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
