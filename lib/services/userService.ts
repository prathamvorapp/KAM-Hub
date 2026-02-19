import { UserProfile, UserRole } from '../models/user';
import { createServiceRoleClient } from '../supabase-server';

export class UserService {
  private enabled: boolean;

  constructor() {
    // Service is always enabled but uses Supabase Auth
    this.enabled = true;
  }



  async getUserProfileByEmail(email: string): Promise<UserProfile | null> {
    try {

      const supabase = createServiceRoleClient();

      const { data: profile, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('email', email)
        .single();

      if (error || !profile) {
        return null;
      }
      
      // Type assertion for profile
      return profile as UserProfile;

    } catch (error) {
      return null;
    }
  }

  async getUserProfileByAuthId(authId: string): Promise<UserProfile | null> {
    try {

      const supabase = createServiceRoleClient();

      const { data: profile, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('auth_id', authId)
        .single();

      if (error || !profile) {
        return null;
      }
      
      // Type assertion for profile
      return profile as UserProfile;

    } catch (error) {
      return null;
    }
  }

  async setUserPassword(email: string, password: string): Promise<{ success: boolean; error?: string }> {
    try {

      const supabase = createServiceRoleClient();

      // Get user profile to find auth_id
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('auth_id')
        .eq('email', email)
        .single();

      // Type assertion for profile
      const userProfile = profile as { auth_id: string } | null;

      if (!userProfile?.auth_id) {
        return { success: false, error: 'User not found or not migrated to Supabase Auth' };
      }

      // Update password in Supabase Auth
      const { error } = await supabase.auth.admin.updateUserById(
        userProfile.auth_id,
        { password: password }
      );

      if (error) {
        return { success: false, error: error.message };
      }
      return { success: true };

    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  async getTeamMembers(teamName: string): Promise<UserProfile[]> {
    try {

      const supabase = createServiceRoleClient();

      const { data: members, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('team_name', teamName)
        .eq('is_active', true);

      if (error) {
        return [];
      }

      // Type assertion for profiles
      const profiles = (members || []).map(member => member as UserProfile);
      return profiles;

    } catch (error) {
      return [];
    }
  }

  async getAllActiveAgents(): Promise<UserProfile[]> {
    try {
      const supabase = createServiceRoleClient();

      const { data: agents, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('is_active', true)
        .in('role', ['Agent', 'Team Lead']);

      if (error) {
        return [];
      }

      // Type assertion for profiles
      const profiles = (agents || []).map(agent => agent as UserProfile);
      return profiles;

    } catch (error) {
      return [];
    }
  }

  // Role-based access control methods
  getPermissionsForRole(role: UserRole): string[] {
    const permissionsMap: Record<UserRole, string[]> = {
      [UserRole.ADMIN]: [
        'read_all',
        'write_all',
        'delete_all',
        'manage_users'
      ],
      [UserRole.TEAM_LEAD]: [
        'read_team',
        'write_team',
        'read_own',
        'write_own'
      ],
      [UserRole.AGENT]: [
        'read_own',
        'write_own'
      ]
    };

    return permissionsMap[role] || [];
  }

  canAccessData(userProfile: UserProfile, dataOwner: string, dataTeam?: string): boolean {
    if (userProfile.role === UserRole.ADMIN) {
      return true;
    }

    if (userProfile.role === UserRole.TEAM_LEAD) {
      // Team leads can access their own data and their team's data
      return !!(
        dataOwner === userProfile.email ||
        (dataTeam && dataTeam === userProfile.team_name)
      );
    }

    if (userProfile.role === UserRole.AGENT) {
      // Agents can only access their own data
      return dataOwner === userProfile.email;
    }

    return false;
  }

  getDataFiltersForUser(userProfile: UserProfile): Record<string, any> {
    if (userProfile.role === UserRole.ADMIN) {
      return {}; // No filters for admin
    }

    if (userProfile.role === UserRole.TEAM_LEAD) {
      return {
        team_name: userProfile.team_name
      };
    }

    if (userProfile.role === UserRole.AGENT) {
      return {
        created_by: userProfile.email
      };
    }

    return { created_by: userProfile.email }; // Default to own data only
  }
}
