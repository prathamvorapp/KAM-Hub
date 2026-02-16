'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'

interface User {
  email: string;
  full_name: string;
  role: string;
  team_name?: string;
  permissions: string[];
}

interface AuthContextType {
  user: User | null
  userProfile: User | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error?: string }>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [userProfile, setUserProfile] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  // Initialize auth state from localStorage
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const userData = localStorage.getItem('user_data')
        
        if (userData) {
          const parsedUser = JSON.parse(userData)
          
          // Set user immediately from localStorage - trust the stored data
          // The API calls will validate the session when they're made
          setUser(parsedUser)
          setUserProfile(parsedUser)
        }
      } catch (error) {
        console.error('Error initializing auth:', error)
        localStorage.removeItem('user_data')
      } finally {
        setLoading(false)
      }
    }

    initializeAuth()
  }, [])

  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true)
      
      console.log('🔗 Authenticating with backend:', email)
      
      // Make login request to backend
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email: email.trim(), password })
      });
      
      console.log('Backend login response status:', response.status)
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMsg = errorData.error || `HTTP error! status: ${response.status}`
        console.log('Authentication failed:', errorMsg)
        return { error: errorMsg }
      }

      const authResult = await response.json();
      
      if (!authResult.success || !authResult.user) {
        const errorMsg = authResult.error || 'Invalid login response'
        console.log('Authentication failed:', errorMsg)
        return { error: errorMsg }
      }

      // Store user data in localStorage (no tokens needed)
      localStorage.setItem('user_data', JSON.stringify(authResult.user));
      
      setUser(authResult.user)
      setUserProfile(authResult.user)

      console.log('✅ Login successful:', authResult.user.email, 'Role:', authResult.user.role)
      return {}

    } catch (error) {
      console.error('Login error:', error)
      return { error: 'Network error. Please try again.' }
    } finally {
      setLoading(false)
    }
  }

  const signOut = async () => {
    try {
      setLoading(true)
      
      // Clear user data
      localStorage.removeItem('user_data');
      
      setUser(null)
      setUserProfile(null)
      
      console.log('✅ Logout successful')
    } catch (error) {
      console.error('❌ Logout error:', error)
      
      // Force clear even if there's an error
      localStorage.removeItem('user_data');
      setUser(null)
      setUserProfile(null)
    } finally {
      setLoading(false)
    }
  }

  const refreshProfile = async () => {
    try {
      if (!user?.email) return

      const response = await fetch(`/api/user/profile-by-email?email=${encodeURIComponent(user.email)}`)
      if (response.ok) {
        const result = await response.json()
        if (result.success && result.data && result.data.is_active) {
          const updatedUser = {
            ...result.data,
            permissions: getRolePermissions(result.data.role)
          }
          
          // Update stored user data
          localStorage.setItem('user_data', JSON.stringify(updatedUser))
          setUser(updatedUser)
          setUserProfile(updatedUser)
        }
      }
    } catch (error) {
      console.error('Error refreshing profile:', error)
    }
  }

  // Helper function to get permissions based on role
  const getRolePermissions = (role: string): string[] => {
    switch (role) {
      case 'Admin':
        return ['read_all', 'write_all', 'delete_all', 'manage_users'];
      case 'Team Lead':
        return ['read_team', 'write_team', 'read_own', 'write_own'];
      case 'Agent':
        return ['read_own', 'write_own'];
      default:
        return ['read_own'];
    }
  }

  const value = {
    user,
    userProfile,
    loading,
    signIn,
    signOut,
    refreshProfile
  }

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