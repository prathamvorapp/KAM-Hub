import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { authenticateRequest, hasRole, unauthorizedResponse } from '@/lib/api-auth';
import { UserRole } from '@/lib/models/user';

export const dynamic = 'force-dynamic';

/**
 * One-time backfill: update escalations where kam_name was stored as the
 * sub_agent's name instead of the actual brand owner's name from master_data.
 */
export async function POST(request: NextRequest) {
  const { user, error: authError } = await authenticateRequest(request);
  if (authError) return authError;
  if (!hasRole(user!, [UserRole.ADMIN])) return unauthorizedResponse('Admin access required');

  const supabase = getSupabaseAdmin() as any;

  // Fetch all open escalations that have a brand_id
  const { data: escalations, error: fetchErr } = await supabase
    .from('escalations')
    .select('id, brand_id, kam_name, kam_email')
    .not('brand_id', 'is', null);

  if (fetchErr) return NextResponse.json({ success: false, error: fetchErr.message }, { status: 500 });

  let fixed = 0;
  let skipped = 0;
  const details: any[] = [];

  for (const esc of (escalations || []) as Array<{ id: string; brand_id: string | null; kam_name: string | null; kam_email: string | null }>) {
    if (!esc.brand_id) { skipped++; continue; }
    const { data: brandRow } = await supabase
      .from('master_data')
      .select('kam_email_id, kam_name, zone')
      .eq('id', esc.brand_id)
      .single();

    if (!brandRow) { skipped++; continue; }

    // Resolve kam_name
    let correctKamName = brandRow.kam_name;
    if (!correctKamName && brandRow.kam_email_id) {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('full_name')
        .eq('email', brandRow.kam_email_id)
        .single();
      correctKamName = profile?.full_name || brandRow.kam_email_id;
    }

    // Resolve team_name from user_profiles
    let correctTeamName: string | null = null;
    if (brandRow.kam_email_id) {
      const { data: kamProfile } = await supabase
        .from('user_profiles')
        .select('team_name')
        .eq('email', brandRow.kam_email_id)
        .single();
      correctTeamName = kamProfile?.team_name || null;
    }

    // Only update if the stored name differs
    if (esc.kam_name === correctKamName && esc.kam_email === brandRow.kam_email_id) {
      skipped++;
      continue;
    }

    const { error: updateErr } = await supabase
      .from('escalations')
      .update({
        kam_name: correctKamName,
        kam_email: brandRow.kam_email_id,
        team_name: correctTeamName,
        zone: brandRow.zone,
        updated_at: new Date().toISOString(),
      })
      .eq('id', esc.id);

    if (updateErr) {
      details.push({ id: esc.id, error: updateErr.message });
    } else {
      fixed++;
      details.push({ id: esc.id, old: esc.kam_name, new: correctKamName });
    }
  }

  return NextResponse.json({ success: true, fixed, skipped, details });
}
