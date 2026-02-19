import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/contexts/AuthContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Session } from '@supabase/supabase-js';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'KAM HUB',
  description: 'Professional Key Account Manager dashboard application',
};

// Define a type for the combined user profile data.
export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  role: string;
  teamName?: string;
  permissions: string[];
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        // The middleware handles setting/removing cookies, so these are no-ops here.
        set(name: string, value: string, options: CookieOptions) {},
        remove(name: string, options: CookieOptions) {},
      },
    }
  );

  // SECURITY: Use getUser() instead of getSession() to validate the session
  // getUser() contacts the Supabase Auth server to authenticate the data
  const { data: { user: validatedUser } } = await supabase.auth.getUser();
  let userProfile: UserProfile | null = null;
  let session: Session | null = null;

  if (validatedUser) {
    // Get the session only after validating the user
    const { data: { session: validatedSession } } = await supabase.auth.getSession();
    session = validatedSession;

    // Fetch profile only if a validated user exists
    const { data: profileData } = await supabase
      .from('user_profiles')
      .select('full_name, role, team_name')
      .eq('auth_id', validatedUser.id)
      .single();

      const getRolePermissions = (role: string): string[] => {
        switch (role) {
          case 'admin':
            return ['read_all', 'write_all', 'delete_all', 'manage_users'];
          case 'team_lead':
            return ['read_team', 'write_team', 'read_own', 'write_own'];
          case 'agent':
            return ['read_own', 'write_own'];
          default:
            return ['read_own']; // Default permissions for unassigned or basic roles
        }
      };

    // Construct userProfile, even if profileData is missing for some reason.
    // This prevents a blank screen by providing at least basic user info.
    userProfile = {
      id: validatedUser.id,
      email: validatedUser.email!,
      fullName: profileData?.full_name || validatedUser.user_metadata.full_name || 'User',
      role: profileData?.role || 'agent', // Default to 'agent' if role not found in profile
      teamName: profileData?.team_name || undefined,
      permissions: getRolePermissions(profileData?.role || 'agent'),
    };
  }
  

  
  return (
    <html lang="en" suppressHydrationWarning={true}>
      <body 
        className={inter.className}
        suppressHydrationWarning={true}
      >
        <ErrorBoundary>
          <AuthProvider initialSession={session} initialUserProfile={userProfile}>
            {children}
          </AuthProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
