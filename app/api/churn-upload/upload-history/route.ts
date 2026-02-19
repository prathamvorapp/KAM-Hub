import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, hasRole, unauthorizedResponse } from '@/lib/api-auth';
import { getSupabaseAdmin } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  try {
    // Authenticate
    const { user, error } = await authenticateRequest(request);
    if (error) return error;
    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 });
    }

    // Only Admin and BO Team can view upload history
    const isBOTeam = user.team_name?.toLowerCase() === 'bo';
    if (!hasRole(user, ['admin']) && !isBOTeam) {
      return unauthorizedResponse('Access denied');
    }

    console.log(`📜 Getting upload history for: ${user.email}`);

    // Get recent uploads (records with uploaded_by field)
    const { data: uploads, error: queryError } = await getSupabaseAdmin()
      .from('churn_records')
      .select('uploaded_by, uploaded_at, rid, restaurant_name, brand_name')
      .not('uploaded_by', 'is', null)
      .order('uploaded_at', { ascending: false })
      .limit(100);

    if (queryError) throw queryError;

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
    console.error('❌ [Upload History] Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to load upload history',
      detail: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
