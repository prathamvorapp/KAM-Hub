import { NextRequest } from 'next/server';
import { UserService } from './services/userService';
import { createServerSupabaseClient } from './supabase-server';

const userService = new UserService();

export interface AuthenticatedUser {
  email: string;
  role: string;
  team_name?: string;
  full_name?: string;
}

/**
 * Get authenticated user from Supabase session
 * Returns null if not authenticated or user is inactive
 */
export async function getAuthenticatedUser(request: NextRequest): Promise<AuthenticatedUser | null> {
  try {
    // Get Supabase client with request context
    const supabase = await createServerSupabaseClient();
    
    // Get the current user (this validates the JWT from cookies)
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return null;
    }
    
    // Get user profile from database
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('email, role, team_name, full_name, is_active')
      .eq('auth_id', user.id)
      .single();
    
    // Type assertion for profile
    const userProfile = profile as {
      email: string;
      role: string;
      team_name: string;
      full_name: string;
      is_active: boolean;
    } | null;
    
    if (profileError || !userProfile || !userProfile.is_active) {
      return null;
    }
    
    return {
      email: userProfile.email,
      role: userProfile.role,
      team_name: userProfile.team_name,
             full_name: userProfile.full_name,
    };
  } catch (error) {
    return null;
  }
}

/**
 * Check if user has required role
 */
export function hasRole(user: AuthenticatedUser, requiredRole: string): boolean {
  return user.role === requiredRole;
}

/**
 * Check if user has any of the required roles
 */
export function hasAnyRole(user: AuthenticatedUser, requiredRoles: string[]): boolean {
  return requiredRoles.includes(user.role);
}

/**
 * Check if user can access team data (Admin or Team Lead)
 */
export function canAccessTeamData(user: AuthenticatedUser): boolean {
  const normalizedRole = user.role?.toLowerCase().replace(/[_\s]/g, '');
  return normalizedRole === 'admin' || normalizedRole === 'teamlead';
}

/**
 * Check if user can access all data (Admin only)
 */
export function canAccessAllData(user: AuthenticatedUser): boolean {
  const normalizedRole = user.role?.toLowerCase().replace(/[_\s]/g, '');
  return normalizedRole === 'admin';
}

/**
 * Get data filter based on user role
 * Returns email filter for agents, team filter for team leads, null for admins
 */
export function getDataFilter(user: AuthenticatedUser): { email?: string; team_name?: string } | null {
  const normalizedRole = user.role?.toLowerCase().replace(/[_\s]/g, '');
  
  if (normalizedRole === 'admin') {
    return null; // No filter - can see all data
  } else if (normalizedRole === 'teamlead') {
    return { team_name: user.team_name }; // Filter by team
  } else if (normalizedRole === 'agent') {
    return { email: user.email }; // Filter by own email
  } else {
    return { email: user.email }; // Default to own data only
  }
}