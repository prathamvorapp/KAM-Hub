'use client'

import { useEffect, useState } from 'react'
import { 
  Users, 
  BarChart3, 
  TrendingUp, 
  Target,
  Crown,
  Award,
  AlertCircle,
  Eye,
  ChevronRight
} from 'lucide-react'

interface AdminSummaryStatsProps {
  userEmail: string
  onViewDetails: () => void
}

interface OrganizationSummary {
  totalAgents: number
  totalBrands: number
  totalVisitsDone: number
  totalVisitsPending: number
  totalCurrentMonthCompleted: number
  totalMonthlyTarget: number
  totalMomPending: number
  agentsAtTarget: number
  agentsAbove80: number
  agentsNeedingAttention: number
  organizationProgress: number
}

export default function AdminSummaryStats({ userEmail, onViewDetails }: AdminSummaryStatsProps) {
  const [summary, setSummary] = useState<OrganizationSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadSummaryData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch('/api/data/visits/admin-summary', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include' // Include cookies for session
      })
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status} - ${errorText}`)
      }
      
      const result = await response.json()
      
      if (result.success) {
        setSummary(result.summary)
        console.log('✅ Organization summary loaded successfully')
      } else {
        setError('Failed to load organization summary')
      }
    } catch (err: any) {
      console.error('❌ Error loading organization summary:', err)
      setError(err.message || 'Failed to load organization summary')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (userEmail) {
      loadSummaryData()
    }
  }, [userEmail])

  if (loading) {
    return (
      <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20 mb-6">
        <div className="animate-pulse">
          <div className="h-6 bg-white/20 rounded w-64 mb-4"></div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-20 bg-white/20 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50/10 border border-red-200/20 rounded-xl p-4 mb-6">
        <div className="flex items-center">
          <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
          <span className="text-red-300">{error}</span>
          <button 
            onClick={loadSummaryData}
            className="ml-auto text-red-400 hover:text-red-300 underline"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  if (!summary) {
    return null
  }

  return (
    <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm mb-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center">
            <Crown className="w-6 h-6 mr-2 text-yellow-600" />
            Organization Overview
          </h2>
          <p className="text-sm text-gray-600">
            Quick summary of all teams and agents performance
          </p>
        </div>
        <button
          onClick={onViewDetails}
          className="flex items-center gap-2 px-3 py-2 bg-slate-50 hover:bg-white text-gray-800 border border-gray-300 rounded-lg font-medium transition-all duration-200 shadow-sm hover:shadow"
        >
          <Eye className="w-4 h-4 text-gray-800" />
          <span>Show Agent Wise Data</span>
        </button>
      </div>

      {/* Summary Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4 mb-4">
        <div className="text-center p-4 bg-purple-50 rounded-lg border border-purple-100">
          <Users className="w-6 h-6 mx-auto mb-2 text-purple-600" />
          <div className="text-2xl font-bold text-gray-900">{summary.totalAgents}</div>
          <div className="text-xs text-gray-600">Total Agents</div>
        </div>
        
        <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-100">
          <BarChart3 className="w-6 h-6 mx-auto mb-2 text-blue-600" />
          <div className="text-2xl font-bold text-gray-900">{summary.totalBrands}</div>
          <div className="text-xs text-gray-600">Total Brands</div>
        </div>
        
        <div className="text-center p-4 bg-green-50 rounded-lg border border-green-100">
          <TrendingUp className="w-6 h-6 mx-auto mb-2 text-green-600" />
          <div className="text-2xl font-bold text-gray-900">{summary.totalVisitsDone}</div>
          <div className="text-xs text-gray-600">Visits Done</div>
        </div>
        
        <div className="text-center p-4 bg-yellow-50 rounded-lg border border-yellow-100">
          <AlertCircle className="w-6 h-6 mx-auto mb-2 text-yellow-600" />
          <div className="text-2xl font-bold text-gray-900">{summary.totalVisitsPending}</div>
          <div className="text-xs text-gray-600">Pending</div>
        </div>
        
        <div className="text-center p-4 bg-orange-50 rounded-lg border border-orange-100">
          <Target className="w-6 h-6 mx-auto mb-2 text-orange-600" />
          <div className="text-2xl font-bold text-gray-900">
            {summary.totalCurrentMonthCompleted}/{summary.totalMonthlyTarget}
          </div>
          <div className="text-xs text-gray-600">This Month</div>
        </div>
        
        <div className="text-center p-4 bg-indigo-50 rounded-lg border border-indigo-100">
          <BarChart3 className="w-6 h-6 mx-auto mb-2 text-indigo-600" />
          <div className="text-2xl font-bold text-gray-900">{Math.round(summary.organizationProgress)}%</div>
          <div className="text-xs text-gray-600">Org Progress</div>
        </div>
        
        <div className="text-center p-4 bg-green-50 rounded-lg border border-green-100">
          <Award className="w-6 h-6 mx-auto mb-2 text-green-600" />
          <div className="text-2xl font-bold text-gray-900">{summary.agentsAtTarget}</div>
          <div className="text-xs text-gray-600">At Target</div>
        </div>
        
        <div className="text-center p-4 bg-red-50 rounded-lg border border-red-100">
          <AlertCircle className="w-6 h-6 mx-auto mb-2 text-red-600" />
          <div className="text-2xl font-bold text-gray-900">{summary.agentsNeedingAttention}</div>
          <div className="text-xs text-gray-600">Need Focus</div>
        </div>
      </div>

      {/* Organization Progress Bar */}
      <div className="mb-4">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-gray-700 font-medium">Organization Monthly Progress</span>
          <span className="font-semibold text-gray-900">
            {summary.totalCurrentMonthCompleted} / {summary.totalMonthlyTarget} visits
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div
            className="h-3 rounded-full bg-gradient-to-r from-purple-500 to-blue-600 transition-all duration-500"
            style={{ width: `${Math.min(summary.organizationProgress, 100)}%` }}
          ></div>
        </div>
      </div>

      {/* Performance Indicators */}
      <div className="grid grid-cols-3 gap-4 text-center">
        <div className="p-3 bg-green-50 rounded-lg border border-green-200">
          <div className="text-lg font-bold text-green-700">{summary.agentsAtTarget}</div>
          <div className="text-xs text-green-600">Agents at 100% Target</div>
        </div>
        <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
          <div className="text-lg font-bold text-blue-700">{summary.agentsAbove80}</div>
          <div className="text-xs text-blue-600">Agents Above 80%</div>
        </div>
        <div className="p-3 bg-red-50 rounded-lg border border-red-200">
          <div className="text-lg font-bold text-red-700">{summary.agentsNeedingAttention}</div>
          <div className="text-xs text-red-600">Need Attention (&lt;40%)</div>
        </div>
      </div>
    </div>
  )
}