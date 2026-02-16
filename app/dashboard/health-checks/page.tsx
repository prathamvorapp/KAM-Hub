'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import DashboardLayout from '@/components/Layout/DashboardLayout'
import { Heart, AlertTriangle } from 'lucide-react'

export default function HealthChecksPage() {
  const router = useRouter()
  const { user, userProfile, loading: authLoading } = useAuth()

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    )
  }

  if (!user || !userProfile) {
    return null
  }

  return (
    <DashboardLayout userProfile={userProfile}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-rose-500 to-red-500 rounded-xl flex items-center justify-center">
              <Heart className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Health Check-ups</h1>
              <p className="text-white/70">Monthly brand health assessment</p>
            </div>
          </div>
        </div>

        <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-12">
          <div className="text-center">
            <AlertTriangle className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">Feature Temporarily Unavailable</h2>
            <p className="text-white/70 mb-4">
              The Health Check-ups feature is currently being updated. Please check back later.
            </p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
