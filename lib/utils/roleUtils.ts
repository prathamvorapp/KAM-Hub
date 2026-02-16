/**
 * Role Normalization Utility
 */

export type NormalizedRole = 'admin' | 'team_lead' | 'agent' | 'unknown';

/**
 * Normalizes a role string for consistent comparison across the application.
 * Handles variations like 'Team Lead', 'team_lead', 'teamlead', 'Agent', etc.
 *
 * @param role The raw role string from the database or session
 * @returns A normalized role string
 */
export function normalizeRole(role: string | undefined | null): NormalizedRole {
  if (!role) return 'unknown';

  const normalized = role.toLowerCase().trim().replace(/[_\s]/g, '');

  if (normalized === 'admin') {
    return 'admin';
  }

  if (normalized === 'teamlead' || normalized === 'team_lead') {
    return 'team_lead';
  }

  if (normalized === 'agent') {
    return 'agent';
  }

  // Fallback for more complex role strings if any
  if (normalized.includes('admin')) return 'admin';
  if (normalized.includes('teamlead')) return 'team_lead';
  if (normalized.includes('agent')) return 'agent';

  return 'unknown';
}
