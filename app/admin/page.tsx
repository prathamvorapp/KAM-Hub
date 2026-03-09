'use client'

import { useState } from 'react'
import { RouteGuard } from '@/components/RouteGuard'
import AdminSummaryStats from '@/components/AdminSummaryStats'
import AdminAgentStatistics from '@/components/AdminAgentStatistics'
import { useAuth } from '@/contexts/AuthContext'
import DashboardLayout from '@/components/Layout/DashboardLayout'

export default function AdminPage() {
  const { userProfile } = useAuth()
  const [showAgentDetails, setShowAgentDetails] = useState(false)

  return (
    <RouteGuard requireAuth={true} requireRole={['admin', 'team_lead']}>
      <DashboardLayout userProfile={userProfile}>
        {userProfile && (
          <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-8">
            <div className="max-w-7xl mx-auto">
              <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  {userProfile.role === 'admin' ? 'Admin Dashboard' : 'Team Lead Dashboard'}
                </h1>
                <p className="text-gray-600">Organization-wide performance and agent analytics</p>
              </div>

            {/* Admin Actions */}
            <div className="mb-8 grid grid-cols-1 md:grid-cols-3 gap-4">
              <a
                href="/admin/transfer-brand"
                className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow border-l-4 border-blue-500"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Brand Management</h3>
                    <p className="text-sm text-gray-600">Transfer brands or add new brands</p>
                  </div>
                  <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                  </svg>
                </div>
              </a>

              <a
                href="/admin/fix-churn"
                className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow border-l-4 border-green-500"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Fix Churn</h3>
                    <p className="text-sm text-gray-600">Manage churn record statuses</p>
                  </div>
                  <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </a>

              <a
                href="/admin/health-checks"
                className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow border-l-4 border-purple-500"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Health Checks</h3>
                    <p className="text-sm text-gray-600">View system health status</p>
                  </div>
                  <svg className="w-8 h-8 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                </div>
              </a>
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
      </DashboardLayout>
    </RouteGuard>
  )
}