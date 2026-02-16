import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-client';

export async function GET(request: NextRequest) {
  try {
    const email = 'rahul.taak@petpooja.com';
    const supabase = getSupabaseAdmin();
    
    console.log('🔍 [TEST 40] Testing brand fetch...');
    
    // Fetch with limit
    const { data: brands, error } = await supabase
      .from('master_data')
      .select('*')
      .eq('kam_email_id', email)
      .limit(10000);
    
    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
    
    console.log('✅ [TEST 40] Fetched brands:', brands?.length);
    
    const records = (brands || []) as any[];
    return NextResponse.json({
      success: true,
      count: records.length,
      brands: records.map(b => ({
        brand_name: b.brand_name,
        kam_email_id: b.kam_email_id,
        outlet_counts: b.outlet_counts
      }))
    });
    
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
