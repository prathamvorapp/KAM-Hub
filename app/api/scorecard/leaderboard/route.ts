import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/api-auth';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import NodeCache from 'node-cache';

export const dynamic = 'force-dynamic';

const leaderboardCache = new NodeCache({ stdTTL: 300 }); // 5 min cache

// Parse DD-MM-YYYY text dates (churn_records.date format)
// ISO dates (YYYY-MM-DD) should use new Date() directly, not this function
function safeParseDate(dateStr: string): Date | null {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const clean = dateStr.trim();
  if (!clean) return null;

  // ISO format: YYYY-MM-DD or YYYY-MM-DDTHH:mm...
  if (/^\d{4}-\d{2}-\d{2}/.test(clean)) {
    const d = new Date(clean);
    return isNaN(d.getTime()) ? null : d;
  }

  // DD-MM-YYYY or DD/MM/YYYY
  const parts = clean.split(/[-/]/);
  if (parts.length === 3) {
    try {
      const day = parts[0].padStart(2, '0');
      const month = parts[1].padStart(2, '0');
      const year = parts[2].length === 2 ? `20${parts[2]}` : parts[2];
      const d = new Date(`${year}-${month}-${day}`);
      if (!isNaN(d.getTime())) return d;
    } catch {}
  }

  const fallback = new Date(clean);
  return isNaN(fallback.getTime()) ? null : fallback;
}

function getMonthRange(month: string) {
  // Pure string arithmetic — no Date objects to avoid timezone issues
  const [year, mon] = month.split('-').map(Number);
  const start = `${month}-01`;
  const nextYear = mon === 12 ? year + 1 : year;
  const nextMon = mon === 12 ? 1 : mon + 1;
  const end = `${nextYear}-${String(nextMon).padStart(2, '0')}-01`;
  return { start, end };
}

function getNextMonthRange(month: string) {
  const [year, mon] = month.split('-').map(Number);
  const nextYear = mon === 12 ? year + 1 : year;
  const nextMon = mon === 12 ? 1 : mon + 1;
  const nextMonthStr = `${nextYear}-${String(nextMon).padStart(2, '0')}`;
  return getMonthRange(nextMonthStr);
}

export async function GET(request: NextRequest) {
  const { user, error } = await authenticateRequest(request);
  if (error) return error;
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const month = searchParams.get('month') || new Date().toISOString().slice(0, 7);
  const bust = searchParams.get('bust') === '1' || searchParams.get('bustCache') === 'true';

  const cacheKey = `leaderboard_${month}`;
  if (!bust) {
    const cached = leaderboardCache.get(cacheKey);
    if (cached) return NextResponse.json({ success: true, data: cached });
  } else {
    leaderboardCache.del(cacheKey);
  }

  const supabase = getSupabaseAdmin();
  const { start, end } = getMonthRange(month);
  const nextRange = getNextMonthRange(month);
  const monthYYYYMM = month; // e.g. "2026-04"

  // ── 1. Get all active agents ──────────────────────────────────────────────
  const { data: agents } = await supabase
    .from('user_profiles')
    .select('id, email, full_name, team_name, role')
    .eq('is_active', true)
    .eq('role', 'agent') as { data: { id: string; email: string; full_name: string; team_name: string; role: string }[] | null };

  if (!agents || agents.length === 0) {
    return NextResponse.json({ success: true, data: [] });
  }

  const agentEmails = agents.map((a) => a.email);
  // churn_records.kam stores full_name, not email — build both maps
  const agentNames = agents.map((a) => a.full_name).filter(Boolean);
  const nameToEmail: Record<string, string> = {};
  agents.forEach((a) => { if (a.full_name) nameToEmail[a.full_name] = a.email; });

  // ── 2. Fetch all data in parallel ─────────────────────────────────────────
  const [
    churnRes,
    visitsThisMonthRes,
    visitsNextMonthRes,
    momsRes,
    demosRes,
    engCallsRes,
    engCallConfigRes,
    escalationsRes,
  ] = await Promise.all([
    // Churn records — kam is full_name, date is DD-MM-YYYY text, fetch all for these agents
    // and filter by month in JS
    supabase
      .from('churn_records')
      .select('kam, churn_reason, controlled_status, mail_sent, date, created_at')
      .in('kam', agentNames),

    // Visits completed this month
    supabase
      .from('visits')
      .select('agent_id, brand_name, visit_date, visit_status, scheduled_date')
      .in('agent_id', agentEmails)
      .eq('visit_status', 'Completed')
      .gte('visit_date', start)
      .lt('visit_date', end),

    // Visits scheduled for next month
    supabase
      .from('visits')
      .select('agent_id')
      .in('agent_id', agentEmails)
      .gte('scheduled_date', nextRange.start)
      .lt('scheduled_date', nextRange.end),

    // MOMs created this month with their linked visit
    supabase
      .from('mom')
      .select('created_by, created_at, visit_id')
      .in('created_by', agentEmails)
      .gte('created_at', start)
      .lt('created_at', end),

    // Demos completed this month
    supabase
      .from('demos')
      .select('completed_by_agent_id, conversion_status, demo_completed_date')
      .in('completed_by_agent_id', agentEmails)
      .eq('demo_completed', true)
      .gte('demo_completed_date', start)
      .lt('demo_completed_date', end),

    // Engagement calls done this month
    supabase
      .from('engagement_calls')
      .select('kam_email, called_at')
      .in('kam_email', agentEmails)
      .eq('month', monthYYYYMM)
      .eq('status', 'done'),

    // Engagement call config for this month (to know total brands per agent)
    supabase
      .from('master_data')
      .select('kam_email_id')
      .in('kam_email_id', agentEmails),

    // Escalations this month
    supabase
      .from('escalations')
      .select('kam_email, brand_nature, responsible_party, created_at')
      .in('kam_email', agentEmails)
      .gte('created_at', start)
      .lt('created_at', end),
  ]);

  // ── 3. Get scheduled_date for visits linked to MOMs ───────────────────────
  const momVisitIds = (momsRes.data || [])
    .map((m: any) => m.visit_id)
    .filter(Boolean);

  let visitScheduledDates: Record<string, string> = {};
  if (momVisitIds.length > 0) {
    const { data: linkedVisits } = await supabase
      .from('visits')
      .select('visit_id, scheduled_date')
      .in('visit_id', momVisitIds);
    (linkedVisits || []).forEach((v: any) => {
      visitScheduledDates[v.visit_id] = v.scheduled_date;
    });
  }

  // ── 4. Pre-group data by agent email ──────────────────────────────────────

  // churn: date is DD-MM-YYYY, kam is full_name → map to email and filter by month
  // Convert DD-MM-YYYY to YYYY-MM-DD string for comparison (no Date objects)
  const churnByAgent: Record<string, any[]> = {};
  (churnRes.data || []).forEach((r: any) => {
    const email = nameToEmail[r.kam];
    if (!email) return;
    // Parse DD-MM-YYYY → YYYY-MM-DD string
    const raw = (r.date || '').trim();
    let dateStr = '';
    if (/^\d{4}-\d{2}-\d{2}/.test(raw)) {
      dateStr = raw.slice(0, 10); // already ISO
    } else {
      const parts = raw.split(/[-/]/);
      if (parts.length === 3) {
        const day = parts[0].padStart(2, '0');
        const mon = parts[1].padStart(2, '0');
        const yr = parts[2].length === 2 ? `20${parts[2]}` : parts[2];
        dateStr = `${yr}-${mon}-${day}`;
      }
    }
    if (!dateStr || dateStr < start || dateStr >= end) return;
    if (!churnByAgent[email]) churnByAgent[email] = [];
    churnByAgent[email].push(r);
  });

  const visitsThisByAgent: Record<string, any[]> = {};
  (visitsThisMonthRes.data || []).forEach((v: any) => {
    if (!visitsThisByAgent[v.agent_id]) visitsThisByAgent[v.agent_id] = [];
    visitsThisByAgent[v.agent_id].push(v);
  });

  const visitsNextByAgent: Record<string, number> = {};
  (visitsNextMonthRes.data || []).forEach((v: any) => {
    visitsNextByAgent[v.agent_id] = (visitsNextByAgent[v.agent_id] || 0) + 1;
  });

  const momsByAgent: Record<string, any[]> = {};
  (momsRes.data || []).forEach((m: any) => {
    if (!momsByAgent[m.created_by]) momsByAgent[m.created_by] = [];
    momsByAgent[m.created_by].push(m);
  });

  const demosByAgent: Record<string, any[]> = {};
  (demosRes.data || []).forEach((d: any) => {
    if (!demosByAgent[d.completed_by_agent_id]) demosByAgent[d.completed_by_agent_id] = [];
    demosByAgent[d.completed_by_agent_id].push(d);
  });

  const engCallsByAgent: Record<string, any[]> = {};
  (engCallsRes.data || []).forEach((c: any) => {
    if (!engCallsByAgent[c.kam_email]) engCallsByAgent[c.kam_email] = [];
    engCallsByAgent[c.kam_email].push(c);
  });

  // Total brands per agent (for engagement call completion check)
  const brandCountByAgent: Record<string, number> = {};
  (engCallConfigRes.data || []).forEach((b: any) => {
    brandCountByAgent[b.kam_email_id] = (brandCountByAgent[b.kam_email_id] || 0) + 1;
  });

  const escalationsByAgent: Record<string, any[]> = {};
  (escalationsRes.data || []).forEach((e: any) => {
    if (!escalationsByAgent[e.kam_email]) escalationsByAgent[e.kam_email] = [];
    escalationsByAgent[e.kam_email].push(e);
  });

  // ── 5. Score each agent ───────────────────────────────────────────────────
  const leaderboard = agents.map((agent) => {
    const email = agent.email;
    let points = 0;
    const breakdown: Record<string, number> = {};

    // ── CHURN ──────────────────────────────────────────────────────────────
    const churnRecords = churnByAgent[email] || [];
    const totalChurn = churnRecords.length;
    const controlledChurn = churnRecords.filter(
      (r) => r.controlled_status === 'Controlled'
    ).length;
    const noReasonMailSent = churnRecords.filter(
      (r) => r.mail_sent === true && (!r.churn_reason || r.churn_reason.trim() === '')
    ).length;

    if (controlledChurn > 10) {
      breakdown['churn_controlled_penalty'] = -5;
      points -= 5;
    }
    if (totalChurn < 30) {
      breakdown['churn_low_volume'] = 5;
      points += 5;
    }
    if (noReasonMailSent > 3) {
      breakdown['churn_no_reason_penalty'] = -2;
      points -= 2;
    }

    // ── VISITS ─────────────────────────────────────────────────────────────
    const visitsThisMonth = visitsThisByAgent[email] || [];
    const uniqueBrandsVisited = new Set(visitsThisMonth.map((v) => v.brand_name)).size;
    const nextMonthScheduled = visitsNextByAgent[email] || 0;

    if (nextMonthScheduled >= 5) {
      breakdown['visits_next_month_scheduled'] = 5;
      points += 5;
    }
    if (uniqueBrandsVisited >= 7) {
      breakdown['visits_brands_done'] = 10;
      points += 10;
    }

    // MOM late penalty — once per month if any MOM is late
    const moms = momsByAgent[email] || [];
    const hasLateMOM = moms.some((mom) => {
      if (!mom.visit_id) return false;
      const scheduledDate = visitScheduledDates[mom.visit_id];
      if (!scheduledDate) return false;
      const deadline = new Date(scheduledDate);
      deadline.setDate(deadline.getDate() + 3);
      return new Date(mom.created_at) > deadline;
    });
    if (hasLateMOM) {
      breakdown['visits_late_mom_penalty'] = -3;
      points -= 3;
    }

    // ── DEMOS ──────────────────────────────────────────────────────────────
    const demos = demosByAgent[email] || [];
    const convertedDemos = demos.filter((d) => d.conversion_status === 'Converted').length;
    const notConvertedDemos = demos.filter((d) => d.conversion_status !== 'Converted').length;
    const totalDemos = demos.length;

    if (convertedDemos > 0) {
      breakdown['demos_converted'] = convertedDemos * 3;
      points += convertedDemos * 3;
    }
    if (notConvertedDemos > 0) {
      breakdown['demos_not_converted'] = notConvertedDemos * 2;
      points += notConvertedDemos * 2;
    }
    if (totalDemos > 10) {
      breakdown['demos_volume_bonus'] = 10;
      points += 10;
    }

    // ── ENGAGEMENT CALLS ───────────────────────────────────────────────────
    const engCalls = engCallsByAgent[email] || [];
    const totalBrands = brandCountByAgent[email] || 0;
    const cutoff = new Date(`${month}-16`);
    const callsBefore16 = engCalls.filter(
      (c) => c.called_at && new Date(c.called_at) < cutoff
    ).length;

    if (totalBrands > 0 && callsBefore16 >= totalBrands) {
      breakdown['engagement_all_before_16'] = 15;
      points += 15;
    }

    // ── ESCALATIONS ────────────────────────────────────────────────────────
    const escalations = escalationsByAgent[email] || [];
    const orangeCount = escalations.filter((e) => e.brand_nature === 'Orange').length;
    const redCount = escalations.filter((e) => e.brand_nature === 'Red').length;
    const kamResponsibleCount = escalations.filter(
      (e) => e.responsible_party === 'KAM'
    ).length;

    if (orangeCount > 7) {
      breakdown['escalation_orange_penalty'] = -5;
      points -= 5;
    }
    if (redCount > 0) {
      breakdown['escalation_red_penalty'] = -(redCount * 2);
      points -= redCount * 2;
    }
    if (kamResponsibleCount > 0) {
      breakdown['escalation_kam_responsible_penalty'] = -(kamResponsibleCount * 3);
      points -= kamResponsibleCount * 3;
    }

    return {
      email,
      name: agent.full_name,
      team: agent.team_name,
      role: agent.role,
      points,
      breakdown,
      stats: {
        churn: { total: totalChurn, controlled: controlledChurn, noReasonMailSent },
        visits: { completedBrands: uniqueBrandsVisited, nextMonthScheduled, hasLateMOM },
        demos: { total: totalDemos, converted: convertedDemos, notConverted: notConvertedDemos },
        engagementCalls: { done: engCalls.length, total: totalBrands, allBefore16: callsBefore16 >= totalBrands && totalBrands > 0 },
        escalations: { orange: orangeCount, red: redCount, kamResponsible: kamResponsibleCount },
      },
    };
  });

  // Sort by points descending
  leaderboard.sort((a, b) => b.points - a.points);

  // Standard competition ranking: tied agents share the same rank
  // e.g. 20, 5, 5, 5 → ranks 1, 2, 2, 2 (next would be 5)
  const ranked = leaderboard.map((entry, i, arr) => {
    const rank = i === 0
      ? 1
      : entry.points === arr[i - 1].points
        ? (arr[i - 1] as any)._rank
        : i + 1;
    return { ...entry, rank, _rank: rank };
  }).map(({ _rank, ...entry }) => entry);

  leaderboardCache.set(cacheKey, ranked);
  return NextResponse.json({ success: true, data: ranked });
}
