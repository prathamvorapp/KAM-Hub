import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-client';

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    
    console.log('🔍 [FIND RAHUL] Searching for all Rahul-related brands...');
    
    // Get ALL records
    const { data: allRecords } = await supabase
      .from('master_data')
      .select('*');
    
    if (!allRecords) {
      return NextResponse.json({ success: false, error: 'No data' }, { status: 500 });
    }
    
    // Search variations
    const searches = {
      exact_email: allRecords.filter(r => r.kam_email_id === 'rahul.taak@petpooja.com'),
      email_lowercase: allRecords.filter(r => r.kam_email_id?.toLowerCase() === 'rahul.taak@petpooja.com'),
      email_contains_rahul_taak: allRecords.filter(r => r.kam_email_id?.toLowerCase().includes('rahul.taak')),
      email_contains_rahul: allRecords.filter(r => r.kam_email_id?.toLowerCase().includes('rahul')),
      name_exact: allRecords.filter(r => r.kam_name === 'Rahul Taak'),
      name_lowercase: allRecords.filter(r => r.kam_name?.toLowerCase() === 'rahul taak'),
      name_contains_rahul: allRecords.filter(r => r.kam_name?.toLowerCase().includes('rahul')),
      secondary_email: allRecords.filter(r => r.kam_email_id_secondary?.toLowerCase().includes('rahul.taak')),
      secondary_name: allRecords.filter(r => r.kam_name_secondary?.toLowerCase().includes('rahul')),
    };
    
    // Get unique brands across all searches
    const allRahulBrands = new Set();
    Object.values(searches).forEach(results => {
      results.forEach(r => allRahulBrands.add(r.brand_name));
    });
    
    // Check for any column that might contain rahul.taak
    const anyFieldContainsRahul = allRecords.filter(r => {
      const recordStr = JSON.stringify(r).toLowerCase();
      return recordStr.includes('rahul.taak') || recordStr.includes('rahul taak');
    });
    
    return NextResponse.json({
      success: true,
      summary: {
        exact_email_match: searches.exact_email.length,
        email_lowercase_match: searches.email_lowercase.length,
        email_contains_rahul_taak: searches.email_contains_rahul_taak.length,
        email_contains_rahul: searches.email_contains_rahul.length,
        name_exact_match: searches.name_exact.length,
        name_lowercase_match: searches.name_lowercase.length,
        name_contains_rahul: searches.name_contains_rahul.length,
        secondary_email_match: searches.secondary_email.length,
        secondary_name_match: searches.secondary_name.length,
        any_field_contains_rahul: anyFieldContainsRahul.length,
        unique_brands_total: allRahulBrands.size
      },
      details: {
        exact_email_brands: searches.exact_email.map(r => ({
          brand_name: r.brand_name,
          kam_email_id: r.kam_email_id,
          kam_name: r.kam_name,
          kam_email_id_secondary: r.kam_email_id_secondary,
          kam_name_secondary: r.kam_name_secondary
        })),
        any_field_brands: anyFieldContainsRahul.map(r => ({
          brand_name: r.brand_name,
          kam_email_id: r.kam_email_id,
          kam_name: r.kam_name,
          kam_email_id_secondary: r.kam_email_id_secondary,
          kam_name_secondary: r.kam_name_secondary
        }))
      },
      all_unique_brand_names: Array.from(allRahulBrands)
    });
    
  } catch (error: any) {
    console.error('❌ [FIND RAHUL] Error:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
