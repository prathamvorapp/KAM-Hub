import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth-helpers';
import { getSupabaseAdmin } from '@/lib/supabase-client';

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    
    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 });
    }

    // Only Admin and BO Team can view upload history
    if (user.role !== 'Admin' && user.team_name?.toLowerCase() !== 'bo') {
      return NextResponse.json({
        success: false,
        error: 'Access denied'
      }, { status: 403 });
    }

    console.log(`📜 Getting upload history for: ${user.email}`);

    // Get recent uploads (records with uploaded_by field)
    const { data: uploads, error } = await getSupabaseAdmin()
      .from('churn_records')
      .select('uploaded_by, uploaded_at, rid, restaurant_name, brand_name')
      .not('uploaded_by', 'is', null)
      .order('uploaded_at', { ascending: false })
      .limit(100);

    if (error) throw error;

    // Group by upload session
    const uploadSessions: Record<string, any> = {};
    
    uploads?.forEach((record: any) => {
      const sessionKey = `${record.uploaded_by}_${record.uploaded_at}`;
      if (!uploadSessions[sessionKey]) {
        uploadSessions[sessionKey] = {
          uploaded_by: record.uploaded_by,
          uploaded_at: record.uploaded_at,
          record_count: 0,
          records: []
        };
      }
      uploadSessions[sessionKey].record_count++;
      uploadSessions[sessionKey].records.push(record);
    });

    const history = Object.values(uploadSessions);

    return NextResponse.json({
      success: true,
      data: history
    });

  } catch (error) {
    console.error('❌ Error getting upload history:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to load upload history',
      detail: String(error)
    }, { status: 500 });
  }
}
