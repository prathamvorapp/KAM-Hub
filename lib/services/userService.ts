import { UserProfile, UserRole } from '../models/user';
import { normalizeRole } from '../utils/roleUtils';

export const userService = {
  async authenticateUser(email: string, password: string): Promise<{ success: boolean; user?: UserProfile; error?: string }> {
    try {
      console.log(`🔍 [AUTH] Authenticating user: ${email}`);

      // Use Supabase SERVICE ROLE key to bypass RLS for authentication
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL || '',
        process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
      );

      console.log(`🔍 [AUTH] Querying database for: ${email}`);

      // Query user_profiles table
      const { data: profile, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('email', email)
        .eq('is_active', true)
        .single();

      if (error) {
        console.log(`❌ [AUTH] Database error:`, error);
        return { success: false, error: 'Invalid email or password' };
      }

      if (!profile) {
        console.log(`❌ [AUTH] User not found or inactive: ${email}`);
        return { success: false, error: 'Invalid email or password' };
      }

      console.log(`✅ [AUTH] User found: ${email} (${profile.role})`);

      // Verify password using bcrypt
      const bcrypt = await import('bcryptjs');
      const passwordHash = profile.password;
      
      if (!passwordHash) {
        console.log(`❌ [AUTH] No password set for user: ${email}`);
        return { success: false, error: 'Invalid email or password' };
      }
      
      const isValidPassword = await bcrypt.compare(password, passwordHash);

      if (!isValidPassword) {
        console.log(`❌ [AUTH] Invalid password for: ${email}`);
        return { success: false, error: 'Invalid email or password' };
      }

      console.log(`✅ [AUTH] Authentication successful for: ${email}`);
      
      // Return user profile without password
      const { password: _, ...userProfile } = profile;
      return { 
        success: true, 
        user: userProfile as UserProfile 
      };

    } catch (error) {
      console.log(`❌ [AUTH] Authentication error:`, error);
      return { success: false, error: 'Authentication failed' };
    }
  },

  async getUserProfileByEmail(email: string): Promise<UserProfile | null> {
    try {
      console.log(`🔍 Getting user profile for email: ${email}`);

      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL || '',
        process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
      );

      const { data: profile, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('email', email)
        .single();

      if (error || !profile) {
        console.log(`❌ No profile found for email: ${email}`);
        return null;
      }

      console.log(`✅ Profile found for: ${email}`);
      
      const { password, ...userProfile } = profile;
      return userProfile as UserProfile;

    } catch (error) {
      console.log(`❌ Error getting user profile: ${error}`);
      return null;
    }
  },

  async setUserPassword(email: string, password: string): Promise<{ success: boolean; error?: string }> {
    try {
      const bcrypt = await import('bcryptjs');
      const passwordHash = await bcrypt.hash(password, 10);

      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL || '',
        process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
      );

      const { error } = await supabase
        .from('user_profiles')
        .update({ password: passwordHash })
        .eq('email', email);

      if (error) return { success: false, error: error.message };
      return { success: true };

    } catch (error) {
      return { success: false, error: String(error) };
    }
  },

  async getTeamMembers(teamName: string): Promise<UserProfile[]> {
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL || '',
        process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
      );

      const { data: members, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('team_name', teamName)
        .eq('is_active', true);

      if (error) return [];
      return (members || []).map(({ password, ...profile }) => profile as UserProfile);
    } catch (error) {
      return [];
    }
  },

  async getAllActiveAgents(): Promise<UserProfile[]> {
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL || '',
        process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
      );

      const { data: agents, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('is_active', true)
        .in('role', ['Agent', 'Team Lead', 'agent', 'team_lead']);

      if (error) return [];
      return (agents || []).map(({ password, ...profile }) => profile as UserProfile);
    } catch (error) {
      return [];
    }
  },

  getPermissionsForRole(role: string): string[] {
    const normalizedRole = normalizeRole(role);
    const permissionsMap: Record<string, string[]> = {
      'admin': ['read_all', 'write_all', 'delete_all', 'manage_users'],
      'team_lead': ['read_team', 'write_team', 'read_own', 'write_own'],
      'agent': ['read_own', 'write_own'],
      'unknown': []
    };

    return permissionsMap[normalizedRole] || [];
  },

  canAccessData(userProfile: UserProfile, dataOwner: string, dataTeam?: string): boolean {
    const normalizedRole = normalizeRole(userProfile.role);
    if (normalizedRole === 'admin') return true;

    if (normalizedRole === 'team_lead') {
      return !!(
        dataOwner === userProfile.email ||
        (dataTeam && dataTeam === userProfile.team_name)
      );
    }

    if (normalizedRole === 'agent') {
      return dataOwner === userProfile.email;
    }

    return false;
  },

  getDataFiltersForUser(userProfile: UserProfile): Record<string, any> {
    const normalizedRole = normalizeRole(userProfile.role);
    if (normalizedRole === 'admin') return {};
    if (normalizedRole === 'team_lead') return { team_name: userProfile.team_name };
    if (normalizedRole === 'agent') return { created_by: userProfile.email };
    return { created_by: userProfile.email };
  }
};
