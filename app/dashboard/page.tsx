'use client'

import { useEffect, memo } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { useChurnData } from '@/hooks/useChurnData'
import DashboardLayout from '@/components/Layout/DashboardLayout'
import { LoadingSkeleton, StatCardSkeleton } from '@/components/LoadingSkeleton'
import { formatDDMMYYYYToMMMFormat } from '@/utils/dateUtils'
import { LogOut, Users, BarChart3, AlertCircle } from 'lucide-react'

// PERFORMANCE OPTIMIZATION: Memoize statistics cards
const StatCard = memo(({ title, value, icon: Icon, trend, color }: {
  title: string
  value: number | string
  icon: any
  trend: string
  color: string
}) => (
  <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-secondary-600 text-sm">{title}</p>
        <p className="text-3xl font-bold text-secondary-800">{value}</p>
      </div>
      <Icon className={`w-8 h-8 ${color}`} />
    </div>
    <p className={`text-sm mt-2 ${trend.startsWith('+') ? 'text-success-600' : 'text-error-600'}`}>
      {trend}
    </p>
  </div>
))

StatCard.displayName = 'StatCard'

// PERFORMANCE OPTIMIZATION: Memoize table row
const ChurnTableRow = memo(({ record, index }: { record: any, index: number }) => (
  <tr key={record._id || index} className="hover:bg-gray-50 transition-colors">
    <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-800">
      {record.rid}
    </td>
    <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-800">
      {record.restaurant_name}
    </td>
    <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-800">
      {record.kam}
    </td>
    <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-800">
      {record.zone}
    </td>
    <td className="px-6 py-4 whitespace-nowrap text-sm">
      {record.churn_reason ? (
        <span className="text-success-600">{record.churn_reason}</span>
      ) : (
        <span className="text-error-600">Missing</span>
      )}
    </td>
    <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-600">
      {formatDDMMYYYYToMMMFormat(record.date, 'N/A')}
    </td>
  </tr>
))

ChurnTableRow.displayName = 'ChurnTableRow'

export default function DashboardPage() {
  const router = useRouter()
  const { user, userProfile, loading: authLoading, signOut } = useAuth()
  const { 
    data: churnData, 
    pagination, 
    userInfo, 
    missingChurnReasons, 
    loading: dataLoading, 
    error
  } = useChurnData()

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [user, authLoading, router])

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-secondary-800 text-xl">Loading...</div>
      </div>
    )
  }

  if (!user || !userProfile) {
    return null // Will redirect to login
  }

  // PERFORMANCE OPTIMIZATION: Calculate completion rate only when needed
  const completionRate = pagination.total > 0 ? Math.round(((pagination.total - missingChurnReasons) / pagination.total) * 100) : 0

  return (
    <DashboardLayout userProfile={userProfile}>
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {dataLoading ? (
          // Show skeleton loading for stats
          <>
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </>
        ) : (
          <>
            <StatCard
              title="Total Records"
              value={pagination.total}
              icon={BarChart3}
              trend="+12%"
              color="text-primary-500"
            />
            <StatCard
              title="Missing Churn Reasons"
              value={missingChurnReasons}
              icon={AlertCircle}
              trend="-5%"
              color="text-error-500"
            />
            <StatCard
              title="Completed Records"
              value={pagination.total - missingChurnReasons}
              icon={BarChart3}
              trend="+23%"
              color="text-success-500"
            />
            <StatCard
              title="Completion Rate"
              value={`${completionRate}%`}
              icon={Users}
              trend="+8%"
              color="text-primary-600"
            />
          </>
        )}
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h2 className="text-xl font-semibold text-secondary-800">Churn Data</h2>
          <p className="text-secondary-600 text-sm">
            {dataLoading ? (
              'Loading...'
            ) : (
              <>
                Showing {churnData.length} of {pagination.total} records
                {userInfo && (
                  <span className="ml-2">
                    (Role: {userInfo.role}
                    {userInfo.team && `, Team: ${userInfo.team}`})
                  </span>
                )}
              </>
            )}
          </p>
        </div>

        {dataLoading ? (
          <div className="p-6">
            <LoadingSkeleton rows={8} />
          </div>
        ) : error ? (
          <div className="p-8 text-center text-error-600">
            Error: {error}
          </div>
        ) : churnData.length === 0 ? (
          <div className="p-8 text-center text-secondary-600">
            No churn data available
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-secondary-600 uppercase tracking-wider">
                    RID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-secondary-600 uppercase tracking-wider">
                    Restaurant
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-secondary-600 uppercase tracking-wider">
                    KAM
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-secondary-600 uppercase tracking-wider">
                    Zone
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-secondary-600 uppercase tracking-wider">
                    Churn Reason
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-secondary-600 uppercase tracking-wider">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {churnData.map((record, index) => (
                  <ChurnTableRow key={record._id || index} record={record} index={index} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {!dataLoading && pagination.total_pages > 1 && (
        <div className="mt-6 flex justify-center">
          <div className="flex items-center space-x-2">
            <button
              disabled={!pagination.has_prev}
              className="px-4 py-2 bg-white border border-gray-300 text-secondary-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
            >
              Previous
            </button>
            <span className="text-secondary-700">
              Page {pagination.page} of {pagination.total_pages}
            </span>
            <button
              disabled={!pagination.has_next}
              className="px-4 py-2 bg-white border border-gray-300 text-secondary-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}