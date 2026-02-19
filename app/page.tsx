'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'

export default function HomePage() {
  const router = useRouter()
  const { userProfile, session } = useAuth()

  useEffect(() => {
    // Redirect based on auth state
    if (session && userProfile) {
      router.push('/dashboard/churn') // Redirect to churn page instead of empty dashboard
    } else {
      router.push('/login')
    }
  }, [userProfile, session, router])

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto"></div>
        <p className="mt-4 text-white">Redirecting...</p>
      </div>
    </div>
  )
}