import { UserProfile, UserRole } from '../models/user';

export class UserService {
  private enabled: boolean;

  constructor() {
    // Service is always enabled but uses Supabase instead of Convex
    this.enabled = true;
  }

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
      console.log(`🔍 [AUTH] Has password: ${!!profile.password}`);

      // Verify password using bcrypt
      const bcrypt = await import('bcryptjs');
      // Use 'password' column (password_hash column doesn't exist in schema)
      const passwordHash = profile.password;
      
      if (!passwordHash) {
        console.log(`❌ [AUTH] No password set for user: ${email}`);
        return { success: false, error: 'Invalid email or password' };
      }
      
      console.log(`🔍 [AUTH] Verifying password for: ${email}`);
      console.log(`🔍 [AUTH] Password hash starts with: ${passwordHash.substring(0, 7)}`);
      
      const isValidPassword = await bcrypt.compare(password, passwordHash);

      console.log(`🔍 [AUTH] Password valid: ${isValidPassword}`);

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
  }

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
      
      // Remove password from response
      const { password, ...userProfile } = profile;
      return userProfile as UserProfile;

    } catch (error) {
      console.log(`❌ Error getting user profile: ${error}`);
      return null;
    }
  }

  async setUserPassword(email: string, password: string): Promise<{ success: boolean; error?: string }> {
    try {
      console.log(`🔍 Setting password for user: ${email}`);

      const bcrypt = await import('bcryptjs');
      const passwordHash = await bcrypt.hash(password, 10);

      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL || '',
        process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
      );

      // Update password column
      const { error } = await supabase
        .from('user_profiles')
        .update({ password: passwordHash })
        .eq('email', email);

      if (error) {
        console.log(`❌ Error setting password: ${error.message}`);
        return { success: false, error: error.message };
      }

      console.log(`✅ Password set successfully for: ${email}`);
      return { success: true };

    } catch (error) {
      console.log(`❌ Error setting password: ${error}`);
      return { success: false, error: String(error) };
    }
  }

  async getTeamMembers(teamName: string): Promise<UserProfile[]> {
    try {
      console.log(`👥 Getting team members for team: ${teamName}`);

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

      if (error) {
        console.log(`❌ Error getting team members: ${error.message}`);
        return [];
      }

      // Remove passwords
      const profiles = (members || []).map(({ password, ...profile }) => profile as UserProfile);
      return profiles;

    } catch (error) {
      console.log(`❌ Error getting team members: ${error}`);
      return [];
    }
  }

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
        .in('role', ['Agent', 'Team Lead']);

      if (error) {
        console.error('Error getting all active agents:', error.message);
        return [];
      }

      // Remove passwords
      const profiles = (agents || []).map(({ password, ...profile }) => profile as UserProfile);
      return profiles;

    } catch (error) {
      console.error('Error getting all active agents:', error);
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
