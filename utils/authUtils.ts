/**
 * Authentication and User Profile Utilities
 */

export interface UserProfile {
  email: string;
  fullName: string;
  role: string;
  team_name?: string;
  teamName?: string;
  is_active?: boolean;
  [key: string]: any;
}

/**
 * Normalize user profile to handle both camelCase and snake_case properties
 * Especially for team_name vs teamName
 * 
 * @param profile - Raw user profile object
 * @returns Normalized user profile object
 */
export function normalizeUserProfile<T extends { team_name?: string; teamName?: string; [key: string]: any }>(
  profile: T
): T {
  if (!profile) return profile;
  
  const normalized = { ...profile };
  
  // Handle team_name vs teamName
  if (!normalized.team_name && normalized.teamName) {
    normalized.team_name = normalized.teamName;
  } else if (!normalized.teamName && normalized.team_name) {
    normalized.teamName = normalized.team_name;
  }
  
  // Handle fullName vs full_name
  if (!normalized.fullName && (normalized as any).full_name) {
    normalized.fullName = (normalized as any).full_name;
  } else if (!normalized.full_name && (normalized as any).fullName) {
    (normalized as any).full_name = (normalized as any).fullName;
  }
  
  return normalized;
}
