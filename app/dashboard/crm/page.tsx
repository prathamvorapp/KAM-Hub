'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import DashboardLayout from '@/components/Layout/DashboardLayout'
import HealthCheckTab from '@/components/CRM/HealthCheckTab'
import ChurnTab from '@/components/CRM/ChurnTab'

interface HealthCheckRecord {
  check_id: string
  assessment_date: string
  kam_name: string
  kam_email: string
  zone: string
  health_status: string
  brand_nature: string
  remarks: string
  brand_name: string
  team_name?: string
}

interface ChurnRecord {
  rid: string
  restaurant_name: string
  kam: string
  churn_reason: string
  remarks: string
  date: string
  no_of_calls_done: number
  mail_sent: string
  [key: string]: any
}

export default function CRMPage() {
  const { userProfile } = useAuth()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'health' | 'churn'>('health')
  
  // Health Check States
  const [healthRecords, setHealthRecords] = useState<HealthCheckRecord[]>([])
  const [healthLoading, setHealthLoading] = useState(true)
  const [healthError, setHealthError] = useState<string | null>(null)
  
  // Churn States
  const [churnRecords, setChurnRecords] = useState<ChurnRecord[]>([])
  const [churnLoading, setChurnLoading] = useState(true)
  const [churnError, setChurnError] = useState<string | null>(null)

  useEffect(() => {
    if (!userProfile) {
      router.push('/login')
    }
  }, [userProfile, router])

  useEffect(() => {
    if (userProfile) {
      fetchHealthChecks()
      fetchChurnData()
    }
  }, [userProfile])

  const fetchHealthChecks = async () => {
    try {
      setHealthLoading(true)
      setHealthError(null)
      const response = await fetch('/api/data/health-checks?limit=10000')
      const result = await response.json()
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to fetch health checks')
      }
      setHealthRecords(result.data.data || [])
    } catch (err) {
      setHealthError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setHealthLoading(false)
    }
  }

  const fetchChurnData = async () => {
    try {
      setChurnLoading(true)
      setChurnError(null)
      const response = await fetch('/api/churn?limit=10000')
      const result = await response.json()
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to fetch churn data')
      }
      setChurnRecords(result.data || [])
    } catch (err) {
      setChurnError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setChurnLoading(false)
    }
  }

  if (!userProfile) {
    return null
  }

  return (
    <DashboardLayout userProfile={userProfile}>
      <div className="p-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-xl p-8 border border-gray-200 shadow-lg">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-secondary-800">📊 CRM Dashboard</h1>
              <p className="text-secondary-600 mt-2">Comprehensive data management and reporting</p>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-200 mb-6">
              <button
                onClick={() => setActiveTab('health')}
                className={`px-6 py-3 font-medium transition-colors ${
                  activeTab === 'health'
                    ? 'border-b-2 border-primary-600 text-primary-600'
                    : 'text-secondary-600 hover:text-secondary-800'
                }`}
              >
                🏥 Health Check Data
              </button>
              <button
                onClick={() => setActiveTab('churn')}
                className={`px-6 py-3 font-medium transition-colors ${
                  activeTab === 'churn'
                    ? 'border-b-2 border-primary-600 text-primary-600'
                    : 'text-secondary-600 hover:text-secondary-800'
                }`}
              >
                📉 Churn Data
              </button>
            </div>

            {activeTab === 'health' && (
              <HealthCheckTab
                records={healthRecords}
                loading={healthLoading}
                error={healthError}
              />
            )}

            {activeTab === 'churn' && (
              <ChurnTab
                records={churnRecords}
                loading={churnLoading}
                error={churnError}
              />
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
