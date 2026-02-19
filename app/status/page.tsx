'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@/lib/supabase-client'

export default function StatusPage() {
  const [status, setStatus] = useState<any>({
    loading: true,
    session: null,
    profile: null,
    error: null,
    cookies: []
  })

  useEffect(() => {
    const checkStatus = async () => {
      const supabase = createBrowserClient()
      
      try {
        // Check cookies
        const cookies = document.cookie.split(';').map(c => c.trim())
        
        // Get session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        
        if (sessionError) {
          setStatus({
            loading: false,
            session: null,
            profile: null,
            error: `Session Error: ${sessionError.message}`,
            cookies
          })
          return
        }

        if (!session) {
          setStatus({
            loading: false,
            session: null,
            profile: null,
            error: 'No active session',
            cookies
          })
          return
        }

        // Try to get profile
        const { data: profile, error: profileError } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('auth_id', session.user.id)
          .single()

        setStatus({
          loading: false,
          session: {
            userId: session.user.id,
            email: session.user.email,
            role: session.user.role
          },
          profile: profile || null,
          error: profileError ? `Profile Error: ${profileError.message} (${profileError.code})` : null,
          cookies
        })
      } catch (err: any) {
        setStatus({
          loading: false,
          session: null,
          profile: null,
          error: `Exception: ${err.message}`,
          cookies: []
        })
      }
    }

    checkStatus()
  }, [])

  if (status.loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-xl">Checking status...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Authentication Status</h1>

        {/* Overall Status */}
        <div className={`p-6 rounded-lg mb-6 ${
          status.session && status.profile 
            ? 'bg-green-100 border-2 border-green-500' 
            : 'bg-red-100 border-2 border-red-500'
        }`}>
          <h2 className="text-2xl font-bold mb-2">
            {status.session && status.profile ? '✅ All Good!' : '❌ Issue Detected'}
          </h2>
          <p className="text-lg">
            {status.session && status.profile 
              ? 'Authentication is working correctly. You can go to the dashboard.'
              : 'There is an issue with your authentication. See details below.'}
          </p>
        </div>

        {/* Error */}
        {status.error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            <strong>Error:</strong> {status.error}
          </div>
        )}

        {/* Session Info */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            {status.session ? '✅' : '❌'} Session
          </h2>
          {status.session ? (
            <div className="space-y-2">
              <p><strong>User ID:</strong> {status.session.userId}</p>
              <p><strong>Email:</strong> {status.session.email}</p>
              <p><strong>Role:</strong> {status.session.role || 'N/A'}</p>
            </div>
          ) : (
            <p className="text-red-600">No active session found. Please login.</p>
          )}
        </div>

        {/* Profile Info */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            {status.profile ? '✅' : '❌'} Profile
          </h2>
          {status.profile ? (
            <div className="space-y-2">
              <p><strong>Auth ID:</strong> {status.profile.auth_id}</p>
              <p><strong>Email:</strong> {status.profile.email}</p>
              <p><strong>Full Name:</strong> {status.profile.full_name}</p>
              <p><strong>Role:</strong> {status.profile.role}</p>
              <p><strong>Team:</strong> {status.profile.team_name || 'N/A'}</p>
              <p><strong>Active:</strong> {status.profile.is_active ? 'Yes' : 'No'}</p>
            </div>
          ) : (
            <div>
              <p className="text-red-600 mb-4">Profile not found in database.</p>
              {status.session && (
                <div className="bg-yellow-50 border border-yellow-400 p-4 rounded">
                  <p className="font-semibold mb-2">Action Required:</p>
                  <p className="text-sm mb-2">Run this SQL in Supabase:</p>
                  <pre className="bg-gray-800 text-white p-3 rounded text-xs overflow-auto">
{`INSERT INTO user_profiles (
  auth_id,
  email,
  full_name,
  role,
  is_active
) VALUES (
  '${status.session.userId}',
  '${status.session.email}',
  'Your Name',
  'agent',
  true
)
ON CONFLICT (email) DO UPDATE
SET auth_id = EXCLUDED.auth_id, is_active = true;`}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Cookies */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Cookies</h2>
          {status.cookies.length > 0 ? (
            <div className="space-y-1">
              {status.cookies.map((cookie: string, i: number) => (
                <p key={i} className="text-sm font-mono">{cookie}</p>
              ))}
            </div>
          ) : (
            <p className="text-red-600">No cookies found</p>
          )}
        </div>

        {/* Actions */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Actions</h2>
          <div className="space-x-4">
            <a
              href="/dashboard"
              className="inline-block bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
            >
              Go to Dashboard
            </a>
            <a
              href="/login"
              className="inline-block bg-gray-600 text-white px-6 py-2 rounded hover:bg-gray-700"
            >
              Go to Login
            </a>
            <button
              onClick={() => {
                localStorage.clear()
                sessionStorage.clear()
                window.location.href = '/login'
              }}
              className="inline-block bg-red-600 text-white px-6 py-2 rounded hover:bg-red-700"
            >
              Clear Data & Logout
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
