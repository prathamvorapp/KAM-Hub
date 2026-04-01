import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/api-auth';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { normalizeUserProfile } from '@/utils/authUtils';

export const dynamic = 'force-dynamic';

// GET /api/data/engagement-calls/debug?brand_name=Naadbramha+idli
// Admin-only: shows exactly what master_data and churn_records return for a brand
export async function GET(request: NextRequest) {
  const { user, error } = await authenticateRequest(request);
  if (error) return error;

  const normalizedRole = user!.role?.toLowerCase().replace(/[_\s]/g, '');
  if (normalizedRole !== 'admin') {
    return NextResponse.json({ success: false, error: 'Admin only' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const brandName = searchParams.get('brand_name');

  const userProfile = normalizeUserProfile(user!);
  const teamName = userProfile.team_name || userProfile.teamName;

  // Get team members if team_name provided
  let teamMembers: any[] = [];
  if (teamName) {
    const { data } = await getSupabaseAdmin()
      .from('user_profiles')
      .select('email, full_name, role')
      .eq('team_name', teamName);
    teamMembers = data || [];
  }

  // Get master_data brands for the queried brand name
  let masterDataQuery = getSupabaseAdmin()
    .from('master_data')
    .select('brand_name, brand_email_id, kam_email_id, kam_name');

  if (brandName) {
    masterDataQuery = masterDataQuery.ilike('brand_name', `%${brandName}%`);
  }

  const { data: masterBrands } = await masterDataQuery.limit(20);

  // Get churn records for the queried brand name
  let churnQuery = getSupabaseAdmin()
    .from('churn_records')
    .select('rid, restaurant_name, brand_name, owner_email, churn_reason, kam');

  if (brandName) {
    churnQuery = churnQuery.or(
      `brand_name.ilike.%${brandName}%,restaurant_name.ilike.%${brandName}%`
    );
  }

  const { data: churnRecords } = await churnQuery.limit(20);

  return NextResponse.json({
    success: true,
    debug: {
      queried_brand: brandName,
      master_data_matches: masterBrands || [],
      churn_record_matches: churnRecords || [],
      team_members: teamMembers,
      note: 'Compare brand_email_id (master_data) vs owner_email (churn_records) and brand_name spelling/casing',
    }
  });
}
