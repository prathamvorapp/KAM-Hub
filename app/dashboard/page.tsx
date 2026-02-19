'use client'

import { memo } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useChurnData } from '@/hooks/useChurnData'
import DashboardLayout from '@/components/Layout/DashboardLayout'

import { LoadingSkeleton, StatCardSkeleton } from '@/components/LoadingSkeleton'
import { formatDDMMYYYYToMMMFormat } from '@/utils/dateUtils'
import { LogOut, Users, BarChart3, AlertCircle, TrendingDown, MapPin, Presentation } from 'lucide-react'

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
  const { userProfile } = useAuth()
  const { 
    data: churnData, 
    pagination, 
    userInfo, 
    missingChurnReasons, 
    loading: dataLoading, 
    error
  } = useChurnData({ autoFetch: !!userProfile })

  return (
    <>
      <DashboardLayout userProfile={userProfile}>
        {/* Quick Navigation to Features */}
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center max-w-2xl">
            <div className="mb-6">
              <BarChart3 className="w-20 h-20 mx-auto text-primary-500 opacity-50" />
            </div>
            <h2 className="text-3xl font-bold text-secondary-800 mb-4">
              Welcome to KAM HUB
            </h2>
            <p className="text-secondary-600 text-lg mb-8">
              Select a feature from the sidebar to get started
            </p>
            
            {/* Quick Links */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
              <a href="/dashboard/churn" className="p-6 bg-white rounded-xl border border-gray-200 hover:border-primary-500 hover:shadow-lg transition-all">
                <TrendingDown className="w-8 h-8 mx-auto text-red-500 mb-3" />
                <h3 className="font-semibold text-secondary-800">Churn Data</h3>
                <p className="text-sm text-secondary-600 mt-2">Track and manage customer churn</p>
              </a>
              
              <a href="/dashboard/visits" className="p-6 bg-white rounded-xl border border-gray-200 hover:border-primary-500 hover:shadow-lg transition-all">
                <MapPin className="w-8 h-8 mx-auto text-green-500 mb-3" />
                <h3 className="font-semibold text-secondary-800">Visits</h3>
                <p className="text-sm text-secondary-600 mt-2">Manage brand visits and MOMs</p>
              </a>
              
              <a href="/dashboard/demos" className="p-6 bg-white rounded-xl border border-gray-200 hover:border-primary-500 hover:shadow-lg transition-all">
                <Presentation className="w-8 h-8 mx-auto text-purple-500 mb-3" />
                <h3 className="font-semibold text-secondary-800">Demos</h3>
                <p className="text-sm text-secondary-600 mt-2">Track product demo workflow</p>
              </a>
            </div>
          </div>
        </div>
      </DashboardLayout>
    </>
  )
}