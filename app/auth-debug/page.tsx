'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@/lib/supabase-client'

export default function AuthDebugPage() {
  const [authState, setAuthState] = useState<any>(null)
  const [profileState, setProfileState] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const supabase = createBrowserClient()

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Get session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        
        if (sessionError) {
          setError(`Session error: ${sessionError.message}`)
          return
        }

        setAuthState({
          hasSession: !!session,
          userId: session?.user?.id,
          email: session?.user?.email,
          role: session?.user?.role
        })

        if (session?.user) {
          // Try to get profile
          console.log('Fetching profile for auth_id:', session.user.id)
          
          const { data: profile, error: profileError } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('auth_id', session.user.id)
            .single()

          if (profileError) {
            setError(`Profile error: ${profileError.message} (${profileError.code})`)
            console.error('Profile error details:', profileError)
          } else {
            setProfileState(profile)
          }
        }
      } catch (err: any) {
        setError(`Exception: ${err.message}`)
        console.error('Auth debug error:', err)
      }
    }

    checkAuth()
  }, [supabase])

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Authentication Debug</h1>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            <strong>Error:</strong> {error}
          </div>
        )}

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Auth State</h2>
          <pre className="bg-gray-100 p-4 rounded overflow-auto">
            {JSON.stringify(authState, null, 2)}
          </pre>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Profile State</h2>
          <pre className="bg-gray-100 p-4 rounded overflow-auto">
            {JSON.stringify(profileState, null, 2)}
          </pre>
        </div>

        <div className="mt-6">
          <a href="/dashboard" className="text-blue-600 hover:underline">
            ← Back to Dashboard
          </a>
        </div>
      </div>
    </div>
  )
}
