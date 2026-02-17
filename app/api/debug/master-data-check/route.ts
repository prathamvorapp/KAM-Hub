import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-client';

export async function GET(request: NextRequest) {
  try {
    const email = request.nextUrl.searchParams.get('email') || 'rahul.taak@petpooja.com';
    console.log('🔍 [MASTER DATA CHECK] Checking for email:', email);
    
    const supabase = getSupabaseAdmin();
    
    // Get ALL records from master_data
    console.log('📊 [STEP 1] Fetching ALL master_data records...');
    const { data: allRecords, error: allError, count: totalCount } = await supabase
      .from('master_data')
      .select('*', { count: 'exact' });
    
    if (allError) {
      console.error('❌ Error fetching all records:', allError);
      return NextResponse.json({
        success: false,
        error: allError.message
      }, { status: 500 });
    }
    
    console.log('✅ Total records in master_data:', allRecords?.length || 0);
    
    const records = allRecords as any[];
    
    // Filter by kam_email_id
    const byKamEmail = records?.filter((r: any) => r.kam_email_id === email) || [];
    console.log('📊 Records with kam_email_id =', email, ':', byKamEmail.length);
    
    // Filter by kam_email_id (case insensitive)
    const byKamEmailCI = records?.filter((r: any) => 
      r.kam_email_id?.toLowerCase() === email.toLowerCase()
    ) || [];
    console.log('📊 Records with kam_email_id (case insensitive):', byKamEmailCI.length);
    
    // Check for variations
    const emailVariations = records?.filter((r: any) => 
      r.kam_email_id?.includes('rahul.taak') || 
      r.kam_email_id?.includes('rahul') ||
      r.kam_name?.toLowerCase().includes('rahul')
    ) || [];
    console.log('📊 Records with "rahul" in kam_email_id or kam_name:', emailVariations.length);
    
    // Get unique kam_email_id values
    const uniqueEmails = Array.from(new Set(records?.map((r: any) => r.kam_email_id)));
    console.log('📊 Unique kam_email_id values:', uniqueEmails.length);
    
    // Sample of records
    const sampleRecords = records?.slice(0, 10).map((r: any) => ({
      brand_name: r.brand_name,
      kam_email_id: r.kam_email_id,
      kam_name: r.kam_name,
      outlet_counts: r.outlet_counts
    }));
    
    // Records for this specific email
    const userRecords = byKamEmailCI.map((r: any) => ({
      brand_name: r.brand_name,
      kam_email_id: r.kam_email_id,
      kam_name: r.kam_name,
      brand_state: r.brand_state,
      outlet_counts: r.outlet_counts
    }));
    
    return NextResponse.json({
      success: true,
      summary: {
        total_records: allRecords?.length || 0,
        exact_match: byKamEmail.length,
        case_insensitive_match: byKamEmailCI.length,
        rahul_variations: emailVariations.length,
        unique_kam_emails: uniqueEmails.length
      },
      sample_all_records: sampleRecords,
      user_records: userRecords,
      unique_emails_sample: uniqueEmails.slice(0, 20),
      query_used: {
        table: 'master_data',
        filter: `kam_email_id = '${email}'`,
        note: 'Using getSupabaseAdmin() with service role key'
      }
    });
    
  } catch (error: any) {
    console.error('❌ [MASTER DATA CHECK] Error:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}
