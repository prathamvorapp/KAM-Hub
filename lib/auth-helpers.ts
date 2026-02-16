import { NextRequest } from 'next/server';
import { UserService } from './services/userService';

const userService = new UserService();

export interface AuthenticatedUser {
  email: string;
  role: string;
  team_name?: string;
  full_name?: string;
}

/**
 * Get authenticated user from session cookie
 * Returns null if not authenticated or user is inactive
 */
export async function getAuthenticatedUser(request: NextRequest): Promise<AuthenticatedUser | null> {
  const sessionCookie = request.cookies.get('user-session');
  if (!sessionCookie) {
    return null;
  }
  
  try {
    const sessionData = JSON.parse(sessionCookie.value);
    
    // Verify user still exists and is active
    const userProfile = await userService.getUserProfileByEmail(sessionData.email);
    if (!userProfile || !userProfile.is_active) {
      return null;
    }
    
    return {
      email: sessionData.email,
      role: sessionData.role,
      team_name: sessionData.team_name,
      full_name: userProfile.full_name
    };
  } catch (error) {
    console.error('Error parsing session:', error);
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