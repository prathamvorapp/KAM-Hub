import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-client';

export async function GET(request: NextRequest) {
  try {
    const email = 'jinal.chavda@petpooja.com';
    const currentYear = '2026';
    
    // Get all visits for this agent
    const { data: visits, error: visitsError } = await getSupabaseAdmin()
      .from('visits')
      .select('*')
      .eq('agent_id', email)
      .eq('visit_year', currentYear);
    
    if (visitsError) throw visitsError;
    
    // Get all brands for this agent
    const { data: brands, error: brandsError } = await getSupabaseAdmin()
      .from('master_data')
      .select('*')
      .eq('kam_email_id', email);
    
    if (brandsError) throw brandsError;
    
    const brandNames = brands?.map((b: any) => b.brand_name) || [];
    
    return NextResponse.json({
      success: true,
      data: {
        totalVisits: visits?.length || 0,
        visits: visits?.map((v: any) => ({
          visit_id: v.visit_id,
          brand_name: v.brand_name,
          visit_status: v.visit_status,
          visit_year: v.visit_year,
          scheduled_date: v.scheduled_date,
          agent_id: v.agent_id
        })),
        totalBrands: brandNames.length,
        brandNames: brandNames.slice(0, 20),
        kritungaInBrands: brandNames.includes('Kritunga'),
        kritungaVisits: visits?.filter((v: any) => v.brand_name === 'Kritunga')
      }
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
