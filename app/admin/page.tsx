'use client'

import { useState } from 'react'
import { RouteGuard } from '@/components/RouteGuard'
import AdminSummaryStats from '@/components/AdminSummaryStats'
import AdminAgentStatistics from '@/components/AdminAgentStatistics'
import { useAuth } from '@/contexts/AuthContext'

export default function AdminPage() {
  const { userProfile } = useAuth()
  const [showAgentDetails, setShowAgentDetails] = useState(false)

  return (
    <RouteGuard requireAuth={true} requireRole={['admin']}>
      {userProfile && (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-8">
          <div className="max-w-7xl mx-auto">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Admin Dashboard</h1>
              <p className="text-gray-600">Organization-wide performance and agent analytics</p>
            </div>

            {/* Summary Stats */}
            <AdminSummaryStats 
              userEmail={userProfile.email} 
              onViewDetails={() => setShowAgentDetails(!showAgentDetails)}
            />

            {/* Agent-wise Performance */}
            {showAgentDetails && (
              <AdminAgentStatistics 
                userEmail={userProfile.email}
              />
            )}
          </div>
        </div>
      )}
    </RouteGuard>
  )
}