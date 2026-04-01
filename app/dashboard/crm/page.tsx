'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import DashboardLayout from '@/components/Layout/DashboardLayout'
import ChurnTab from '@/components/CRM/ChurnTab'
import VisitTab from '@/components/CRM/VisitTab'
import DemoGiveTab from '@/components/CRM/DemoGiveTab'
import MasterDataTab from '@/components/CRM/MasterDataTab'
import KAMSummaryTab from '@/components/CRM/KAMSummaryTab'
import EscalationsTab from '@/components/CRM/EscalationsTab'

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
  const [activeTab, setActiveTab] = useState<'churn' | 'visits' | 'demogive' | 'masterdata' | 'kamsummary' | 'escalations'>('kamsummary')
  
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
      fetchChurnData()
    }
  }, [userProfile])

  const fetchChurnData = async () => {
    try {
      setChurnLoading(true)
      setChurnError(null)
      
      let allRecords: ChurnRecord[] = []
      let page = 1
      const limit = 1000
      let hasMore = true

      while (hasMore) {
        const response = await fetch(`/api/churn?limit=${limit}&page=${page}&viewAll=true`)
        const result = await response.json()
        
        if (!response.ok || !result.success) {
          throw new Error(result.error || 'Failed to fetch churn data')
        }

        const records = result.data || []
        allRecords = [...allRecords, ...records]
        
        // Check if there are more records
        hasMore = records.length === limit
        page++
      }

      setChurnRecords(allRecords)
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
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-lg">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-secondary-800">📊 CRM Dashboard</h1>
              <p className="text-secondary-600 mt-2">Comprehensive data management and reporting</p>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-200 mb-6 overflow-x-auto">
              <button
                onClick={() => setActiveTab('kamsummary')}
                className={`px-6 py-3 font-medium transition-colors whitespace-nowrap ${
                  activeTab === 'kamsummary'
                    ? 'border-b-2 border-primary-600 text-primary-600'
                    : 'text-secondary-600 hover:text-secondary-800'
                }`}
              >
                📊 KAM Summary
              </button>
              <button
                onClick={() => setActiveTab('masterdata')}
                className={`px-6 py-3 font-medium transition-colors whitespace-nowrap ${
                  activeTab === 'masterdata'
                    ? 'border-b-2 border-primary-600 text-primary-600'
                    : 'text-secondary-600 hover:text-secondary-800'
                }`}
              >
                📋 Master Data
              </button>
              <button
                onClick={() => setActiveTab('churn')}
                className={`px-6 py-3 font-medium transition-colors whitespace-nowrap ${
                  activeTab === 'churn'
                    ? 'border-b-2 border-primary-600 text-primary-600'
                    : 'text-secondary-600 hover:text-secondary-800'
                }`}
              >
                📉 Churn Data
              </button>
              <button
                onClick={() => setActiveTab('visits')}
                className={`px-6 py-3 font-medium transition-colors whitespace-nowrap ${
                  activeTab === 'visits'
                    ? 'border-b-2 border-primary-600 text-primary-600'
                    : 'text-secondary-600 hover:text-secondary-800'
                }`}
              >
                🚗 Visit Tracking
              </button>
              <button
                onClick={() => setActiveTab('demogive')}
                className={`px-6 py-3 font-medium transition-colors whitespace-nowrap ${
                  activeTab === 'demogive'
                    ? 'border-b-2 border-primary-600 text-primary-600'
                    : 'text-secondary-600 hover:text-secondary-800'
                }`}
              >
                🎯 Demo
              </button>
              <button
                onClick={() => setActiveTab('escalations')}
                className={`px-6 py-3 font-medium transition-colors whitespace-nowrap ${
                  activeTab === 'escalations'
                    ? 'border-b-2 border-primary-600 text-primary-600'
                    : 'text-secondary-600 hover:text-secondary-800'
                }`}
              >
                🚨 Escalations
              </button>
            </div>

            {activeTab === 'kamsummary' && (
              <KAMSummaryTab />
            )}

            {activeTab === 'masterdata' && (
              <MasterDataTab userProfile={userProfile} />
            )}

            {activeTab === 'churn' && (
              <ChurnTab
                records={churnRecords}
                loading={churnLoading}
                error={churnError}
              />
            )}

            {activeTab === 'visits' && (
              <VisitTab userProfile={userProfile} />
            )}

            {activeTab === 'demogive' && (
              <DemoGiveTab />
            )}

            {activeTab === 'escalations' && (
              <EscalationsTab />
            )}
          </div>
        </div>
    </DashboardLayout>
  )
}
