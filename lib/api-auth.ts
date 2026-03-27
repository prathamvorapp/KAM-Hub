/**
 * API Authentication and Authorization Utilities
 * 
 * This module provides authentication and authorization utilities for API routes.
 * 
 * Usage:
 * 
 * 1. Require authentication:
 *    const authResult = await requireAuth(request);
 *    if (authResult instanceof NextResponse) return authResult;
 *    const { user, session } = authResult;
 * 
 * 2. Require specific role:
 *    const authResult = await requireRole(request, ['admin']);
 *    if (authResult instanceof NextResponse) return authResult;
 * 
 * 3. Apply role-based data filtering:
 *    let query = supabase.from('table').select('*');
 *    query = applyRoleFilter(user, query);
 */

import { createServerSupabaseClient } from './supabase-server';
import { NextRequest, NextResponse } from 'next/server';

// Force dynamic rendering for routes using authentication
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export interface AuthenticatedUser {
  id: string;         // Supabase auth UUID
  dbId?: string;      // user_profiles.id (DB row UUID) — used for junction table lookups
  email: string;
  fullName: string;
  full_name: string;
  role: string;
  teamName?: string;
  team_name?: string;
  permissions: string[];
  is_active?: boolean;
  coordinator_id?: string;
  coordinatorName?: string;
}

export interface AuthResult {
  user: AuthenticatedUser;
  session: any;
}

/**
 * Require authentication for API routes
 * Returns user profile and session, or error response
 * 
 * @param request - Next.js request object
 * @returns AuthResult with user and session, or NextResponse with error
 */
export async function requireAuth(request: NextRequest): Promise<AuthResult | NextResponse> {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user: authUser }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !authUser) {
      console.log('❌ [API Auth] No valid user found');
      return NextResponse.json(
        { success: false, error: 'Unauthorized - Please login' },
        { status: 401 }
      );
    }
    
    // Fetch user profile
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('auth_id', authUser.id)
      .eq('is_active', true)
      .single();
      
    if (profileError || !profile) {
      console.log('❌ [API Auth] User profile not found or inactive');
      return NextResponse.json(
        { success: false, error: 'User profile not found or inactive' },
        { status: 401 }
      );
    }
    
    // Type assertion for profile
    const userProfile = profile as {
      id: string;
      email: string;
      full_name: string;
      role: string;
      team_name: string;
      coordinator_id?: string;
    };
    
    // Get permissions based on role
    const permissions = getPermissionsForRole(userProfile.role);

    // For sub_agent: resolve all coordinator names via junction table
    // For bo_person: resolve single coordinator name via coordinator_id
    let coordinatorName: string | undefined;
    const normalizedRole = userProfile.role.toLowerCase().replace(/\s+/g, '_');
    if (normalizedRole === 'sub_agent') {
      // sub_agent — fetch all coordinator names from junction table
      const { data: sacRows } = await supabase
        .from('sub_agent_coordinators')
        .select('coordinator_id')
        .eq('sub_agent_id', userProfile.id);
      if (sacRows && sacRows.length > 0) {
        const { data: coords } = await supabase
          .from('user_profiles').select('full_name').in('id', sacRows.map((r: any) => r.coordinator_id));
        // Store as comma-separated for display; service layer does the full lookup
        coordinatorName = (coords as any[])?.map((c: any) => c.full_name).join(', ');
      }
    } else if (normalizedRole === 'bo_person' && userProfile.coordinator_id) {
      const { data: coordinator } = await supabase
        .from('user_profiles')
        .select('full_name')
        .eq('id', userProfile.coordinator_id)
        .single();
      coordinatorName = (coordinator as any)?.full_name;
    }
    
    const user: AuthenticatedUser = {
      id: authUser.id,
      dbId: (profile as any).id, // user_profiles.id (DB row UUID) — used for junction table lookups
      email: userProfile.email,
      fullName: userProfile.full_name,
      full_name: userProfile.full_name,
      role: userProfile.role,
      teamName: userProfile.team_name,
      team_name: userProfile.team_name,
      permissions,
      is_active: true,
      coordinator_id: userProfile.coordinator_id,
      coordinatorName,
    };
    
    console.log('✅ [API Auth] User authenticated:', user.email, 'Role:', user.role);
    
    return { user, session: { user: authUser } };
  } catch (error) {
    console.error('❌ [API Auth] Authentication error:', error);
    return NextResponse.json(
      { success: false, error: 'Authentication failed' },
      { status: 500 }
    );
  }
}

/**
 * Require specific role(s) for API routes
 * 
 * @param request - Next.js request object
 * @param allowedRoles - Array of allowed role names (case-insensitive)
 * @returns AuthResult with user and session, or NextResponse with error
 */
export async function requireRole(
  request: NextRequest,
  allowedRoles: string[]
): Promise<AuthResult | NextResponse> {
  const authResult = await requireAuth(request);
  
  // If error response, return it
  if (authResult instanceof NextResponse) {
    return authResult;
  }
  
  // Normalize roles for comparison (case-insensitive)
  const normalizedAllowedRoles = allowedRoles.map(r => r.toLowerCase());
  const userRole = authResult.user.role.toLowerCase();
  
  // Check if user has required role
  if (!normalizedAllowedRoles.includes(userRole)) {
    console.log(`❌ [API Auth] Access denied. User role: ${authResult.user.role}, Required: ${allowedRoles.join(', ')}`);
    return NextResponse.json(
      { 
        success: false, 
        error: `Forbidden - Requires one of: ${allowedRoles.join(', ')}` 
      },
      { status: 403 }
    );
  }
  
  console.log(`✅ [API Auth] Role check passed for ${authResult.user.email}`);
  
  return authResult;
}

/**
 * Get permissions based on role
 * 
 * @param role - User role
 * @returns Array of permission strings
 */
function getPermissionsForRole(role: string): string[] {
  const normalizedRole = role.toLowerCase().replace(/\s+/g, '_');
  
  switch (normalizedRole) {
    case 'admin':
      return ['read_all', 'write_all', 'delete_all', 'manage_users', 'approve_mom'];
      
    case 'team_lead':
    case 'team lead':
      return ['read_team', 'write_team', 'read_own', 'write_own', 'approve_mom'];
      
    case 'agent':
      return ['read_own', 'write_own'];
      
    case 'sub_agent':
      // Same as agent — acts on behalf of coordinator agent
      return ['read_own', 'write_own'];

    case 'bo_person':
      // CRM read-only access
      return ['read_own'];
      
    default:
      console.warn(`⚠️ [API Auth] Unknown role: ${role}, defaulting to minimal permissions`);
      return ['read_own'];
  }
}

/**
 * Apply role-based filtering to Supabase query
 * 
 * This function modifies the query to filter data based on user role:
 * - Admin: No filter (sees all data)
 * - Team Lead: Filters by team_name
 * - Agent: Filters by agent_email or kam_email_id
 * 
 * @param user - Authenticated user
 * @param query - Supabase query builder
 * @param emailField - Name of the email field to filter by (default: 'agent_email')
 * @returns Modified query with role-based filter applied
 */
export function applyRoleFilter(
  user: AuthenticatedUser, 
  query: any,
  emailField: string = 'agent_email'
) {
  const normalizedRole = user.role.toLowerCase().replace(/\s+/g, '_');
  
  switch (normalizedRole) {
    case 'admin':
      // Admin sees everything - no filter
      console.log('🔓 [API Auth] Admin access - no filter applied');
      return query;
      
    case 'team_lead':
    case 'team lead':
      // Team Lead sees their team
      if (user.team_name) {
        console.log(`🔒 [API Auth] Team Lead filter - team: ${user.team_name}`);
        return query.eq('team_name', user.team_name);
      }
      // Fallback to own data if no team
      console.log(`🔒 [API Auth] Team Lead filter - own data (no team): ${user.email}`);
      return query.eq(emailField, user.email);
      
    case 'agent':
      // Agent sees only their own data
      console.log(`🔒 [API Auth] Agent filter - own data: ${user.email}`);
      return query.eq(emailField, user.email);

    case 'sub_agent':
      // sub_agent sees coordinator's data (same view as their coordinator agent)
      if (user.coordinatorName) {
        console.log(`🔒 [API Auth] Sub-agent filter - coordinator data: ${user.coordinatorName}`);
        return query.eq(emailField, user.email); // email-based tables use coordinator email via service layer
      }
      console.warn(`⚠️ [API Auth] Sub-agent ${user.email} has no coordinator, filtering to own data`);
      return query.eq(emailField, user.email);

    case 'bo_person':
      // bo_person: CRM only, same data scope as their coordinator agent
      if (user.coordinatorName) {
        console.log(`🔒 [API Auth] BO Person filter - coordinator data: ${user.coordinatorName}`);
        return query.eq(emailField, user.email);
      }
      console.warn(`⚠️ [API Auth] BO Person ${user.email} has no coordinator, filtering to own data`);
      return query.eq(emailField, user.email);
      
    default:
      // Default: only own data
      console.warn(`⚠️ [API Auth] Unknown role ${user.role}, filtering to own data`);
      return query.eq(emailField, user.email);
  }
}

/**
 * Check if user has specific permission
 * 
 * @param user - Authenticated user
 * @param permission - Permission to check
 * @returns true if user has permission
 */
export function hasPermission(user: AuthenticatedUser, permission: string): boolean {
  return user.permissions.includes(permission);
}

/**
 * Check if user can access resource owned by another user
 * 
 * @param user - Authenticated user
 * @param resourceOwnerEmail - Email of resource owner
 * @param resourceTeamName - Team name of resource (optional)
 * @returns true if user can access the resource
 */
export function canAccessResource(
  user: AuthenticatedUser,
  resourceOwnerEmail: string,
  resourceTeamName?: string
): boolean {
  const normalizedRole = user.role.toLowerCase().replace(/\s+/g, '_');
  
  // Admin can access everything
  if (normalizedRole === 'admin') {
    return true;
  }
  
  // Team Lead can access team resources
  if ((normalizedRole === 'team_lead' || normalizedRole === 'team lead') && resourceTeamName) {
    return user.team_name === resourceTeamName;
  }
  
  // User can access own resources
  return user.email === resourceOwnerEmail;
}

/**
 * Validate that user can perform action on resource
 * Returns error response if not authorized
 * 
 * @param user - Authenticated user
 * @param resourceOwnerEmail - Email of resource owner
 * @param resourceTeamName - Team name of resource (optional)
 * @param action - Action being performed (for error message)
 * @returns null if authorized, NextResponse with error if not
 */
export function validateResourceAccess(
  user: AuthenticatedUser,
  resourceOwnerEmail: string,
  resourceTeamName: string | undefined,
  action: string
): NextResponse | null {
  if (!canAccessResource(user, resourceOwnerEmail, resourceTeamName)) {
    console.log(`❌ [API Auth] Access denied: ${user.email} cannot ${action} resource owned by ${resourceOwnerEmail}`);
    return NextResponse.json(
      { 
        success: false, 
        error: `Forbidden - You do not have permission to ${action} this resource` 
      },
      { status: 403 }
    );
  }
  
  return null;
}

/**
 * Legacy authenticateRequest function for backward compatibility
 * Returns user and error in object format
 * 
 * @deprecated Use requireAuth instead
 * @param request - Next.js request object
 * @returns Object with user and error properties
 */
export async function authenticateRequest(request: NextRequest): Promise<{
  user: AuthenticatedUser | null;
  error: NextResponse | null;
}> {
  const authResult = await requireAuth(request);
  
  if (authResult instanceof NextResponse) {
    return { user: null, error: authResult };
  }
  
  return { user: authResult.user, error: null };
}

/**
 * Check if user has one of the required roles
 * 
 * @param user - Authenticated user
 * @param roles - Array of allowed roles (case-insensitive)
 * @returns true if user has one of the roles
 */
export function hasRole(user: AuthenticatedUser, roles: string[]): boolean {
  const normalizedRoles = roles.map(r => r.toLowerCase().replace(/\s+/g, '_'));
  const userRole = user.role.toLowerCase().replace(/\s+/g, '_');
  return normalizedRoles.includes(userRole);
}

/**
 * Return unauthorized response
 * 
 * @param message - Error message
 * @returns NextResponse with 403 status
 */
export function unauthorizedResponse(message: string = 'Forbidden'): NextResponse {
  return NextResponse.json(
    { success: false, error: message },
    { status: 403 }
  );
}
