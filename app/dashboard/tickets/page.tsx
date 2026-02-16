'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import DashboardLayout from '@/components/Layout/DashboardLayout'
import { Ticket, MessageSquare, Clock, CheckCircle } from 'lucide-react'

export default function TicketsPage() {
  const router = useRouter()
  const { user, userProfile, loading: authLoading } = useAuth()

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [user, authLoading, router])

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    )
  }

  if (!user || !userProfile) {
    return null // Will redirect to login
  }

  return (
    <DashboardLayout userProfile={userProfile}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-r from-orange-500 to-amber-500 rounded-xl flex items-center justify-center">
            <Ticket className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Tickets</h1>
            <p className="text-white/70">Manage support tickets and issues</p>
          </div>
        </div>

        {/* Coming Soon Card */}
        <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-8 text-center">
          <div className="w-16 h-16 bg-gradient-to-r from-orange-500 to-amber-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <Ticket className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-xl font-semibold text-white mb-2">Tickets Module</h2>
          <p className="text-white/70 mb-6">
            This module will help you manage support tickets and track issue resolution.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-white/5 rounded-lg p-4">
              <MessageSquare className="w-6 h-6 text-orange-400 mx-auto mb-2" />
              <h3 className="font-medium text-white">Create Tickets</h3>
              <p className="text-sm text-white/60">Log support requests</p>
            </div>
            <div className="bg-white/5 rounded-lg p-4">
              <Clock className="w-6 h-6 text-orange-400 mx-auto mb-2" />
              <h3 className="font-medium text-white">Track Progress</h3>
              <p className="text-sm text-white/60">Monitor ticket status</p>
            </div>
            <div className="bg-white/5 rounded-lg p-4">
              <CheckCircle className="w-6 h-6 text-orange-400 mx-auto mb-2" />
              <h3 className="font-medium text-white">Resolution</h3>
              <p className="text-sm text-white/60">Close resolved tickets</p>
            </div>
          </div>
          
          <div className="bg-blue-500/20 border border-blue-400/30 rounded-lg p-4">
            <p className="text-blue-200 text-sm">
              🚧 This module is currently under development and will be available soon.
            </p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}