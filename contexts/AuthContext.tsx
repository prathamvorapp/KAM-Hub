'use client'

import React, { createContext, useContext, useState, useMemo, useCallback } from 'react'
import { createBrowserClient } from '@/lib/supabase-client' // Still need client for signIn
import type { User as SupabaseUser, Session } from '@supabase/supabase-js'
import { signOutServerAction } from '@/app/auth/actions' // Import the server action
import { UserProfile } from '@/app/layout' // Import UserProfile from layout

interface AuthContextType {
  userProfile: UserProfile | null // Renamed 'user' to 'userProfile'
  session: Session | null
  signIn: (email: string, password: string) => Promise<{ error?: string; success?: boolean }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Create a single Supabase client instance outside the component
// This is still needed for client-side signIn functionality
let supabaseInstance: ReturnType<typeof createBrowserClient> | null = null;

function getSupabaseClient() {
  if (!supabaseInstance) {
    supabaseInstance = createBrowserClient();
  }
  return supabaseInstance;
}

export function AuthProvider({ 
  children, 
  initialSession, 
  initialUserProfile 
}: { 
  children: React.ReactNode;
  initialSession: Session | null;
  initialUserProfile: UserProfile | null;
}) {
  const [session, setSession] = useState<Session | null>(initialSession)
  const [userProfileState, setUserProfileState] = useState<UserProfile | null>(initialUserProfile)



  const supabase = getSupabaseClient(); // Client instance for sign in

  // Client-side sign in logic remains
  const signIn = useCallback(async (email: string, password: string) => {
    try {
      // Supabase client only for signInWithPassword
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password
      })

      if (error) {
        console.error('❌ Client Sign in failed:', error.message)
        return { error: error.message, success: false }
      }

      // After successful client-side sign-in, update both session and user profile
      if (data.session && data.user) {
        setSession(data.session);
        
        // Fetch user profile from user_profiles table
        const { data: profileData } = await supabase
          .from('user_profiles')
          .select('full_name, role, team_name')
          .eq('auth_id', data.user.id)
          .single();

        const getRolePermissions = (role: string): string[] => {
          switch (role) {
            case 'admin':
              return ['read_all', 'write_all', 'delete_all', 'manage_users'];
            case 'team_lead':
              return ['read_team', 'write_team', 'read_own', 'write_own', 'approve_mom'];
            case 'agent':
              return ['read_own', 'write_own'];
            default:
              return ['read_own'];
          }
        };

        // Update user profile state
        const newUserProfile: UserProfile = {
          id: data.user.id,
          email: data.user.email!,
          fullName: (profileData as any)?.full_name || (data.user.user_metadata as any)?.full_name || 'User',
          role: (profileData as any)?.role || 'agent',
          teamName: (profileData as any)?.team_name || undefined,
          permissions: getRolePermissions((profileData as any)?.role || 'agent'),
        };
        
        setUserProfileState(newUserProfile);
        // console.log('✅ Client Sign in - User profile updated:', newUserProfile);
      }
      
      return { success: true }

    } catch (error: any) {
      console.error('❌ Client Sign in exception:', error.message)
      return { error: 'Network error. Please try again.', success: false }
    }
  }, [supabase])

  // Server-driven signOut
  const signOut = useCallback(async () => {
    // The server action handles Supabase signOut, cookie clearing, and redirect.
    // Client-side state update is not strictly necessary here as redirect will happen.
    // But for immediate UI feedback in a SPA context before redirect,
    // you might clear client state first. However, to fully embrace server-first,
    // we let the server action handle it.
    await signOutServerAction();
    // After server action, a redirect happens, so client state is implicitly reset.
  }, [])

  // Memoize context value to prevent unnecessary re-renders
  const value = useMemo(() => ({
    userProfile: userProfileState, // Expose as userProfile
    session,
    signIn,
    signOut,
  }), [userProfileState, session, signIn, signOut])

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}