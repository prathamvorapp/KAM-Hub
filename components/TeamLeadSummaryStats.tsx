'use client'

import { useEffect, useState } from 'react'
import { convexAPI } from '@/lib/convex-api'
import { 
  Users, 
  BarChart3, 
  TrendingUp, 
  Target,
  Award,
  AlertCircle,
  Eye,
  ChevronRight
} from 'lucide-react'

interface TeamLeadSummaryStatsProps {
  userEmail: string
  onViewDetails: () => void
}

interface TeamSummary {
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
  teamProgress: number
  teamName: string
  teamLead: string
}

export default function TeamLeadSummaryStats({ userEmail, onViewDetails }: TeamLeadSummaryStatsProps) {
  const [summary, setSummary] = useState<TeamSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadSummaryData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      console.log('📊 Loading team summary for:', userEmail);
      
      // Use the same logic as AdminSummaryStats - call dedicated team-summary endpoint
      const response = await fetch('/api/data/visits/team-summary', {
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
        console.log('✅ Team summary loaded successfully:', result.summary)
      } else {
        setError('Failed to load team summary')
      }
    } catch (err: any) {
      console.error('❌ Error loading team summary:', err)
      setError(err.message || 'Failed to load team summary')
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
    <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20 mb-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center">
            <Users className="w-6 h-6 mr-2 text-blue-400" />
            Team Overview
          </h2>
          <p className="text-sm text-white/80">
            Performance summary for {summary.teamName} team
          </p>
        </div>
        <button
          onClick={onViewDetails}
          className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
        >
          <Eye className="w-4 h-4 mr-2" />
          View Agent-wise Stats
          <ChevronRight className="w-4 h-4 ml-1" />
        </button>
      </div>

      {/* Summary Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4 mb-4">
        <div className="text-center p-4 bg-white/10 rounded-lg border border-white/10">
          <Users className="w-6 h-6 mx-auto mb-2 text-blue-400" />
          <div className="text-2xl font-bold text-white">{summary.totalAgents}</div>
          <div className="text-xs text-white/70">Team Agents</div>
        </div>
        
        <div className="text-center p-4 bg-white/10 rounded-lg border border-white/10">
          <BarChart3 className="w-6 h-6 mx-auto mb-2 text-purple-400" />
          <div className="text-2xl font-bold text-white">{summary.totalBrands}</div>
          <div className="text-xs text-white/70">Total Brands</div>
        </div>
        
        <div className="text-center p-4 bg-white/10 rounded-lg border border-white/10">
          <TrendingUp className="w-6 h-6 mx-auto mb-2 text-green-400" />
          <div className="text-2xl font-bold text-white">{summary.totalVisitsDone}</div>
          <div className="text-xs text-white/70">Visits Done</div>
        </div>
        
        <div className="text-center p-4 bg-white/10 rounded-lg border border-white/10">
          <AlertCircle className="w-6 h-6 mx-auto mb-2 text-yellow-400" />
          <div className="text-2xl font-bold text-white">{summary.totalVisitsPending}</div>
          <div className="text-xs text-white/70">Pending</div>
        </div>
        
        <div className="text-center p-4 bg-white/10 rounded-lg border border-white/10">
          <Target className="w-6 h-6 mx-auto mb-2 text-orange-400" />
          <div className="text-2xl font-bold text-white">
            {summary.totalCurrentMonthCompleted}/{summary.totalMonthlyTarget}
          </div>
          <div className="text-xs text-white/70">This Month</div>
        </div>
        
        <div className="text-center p-4 bg-white/10 rounded-lg border border-white/10">
          <BarChart3 className="w-6 h-6 mx-auto mb-2 text-indigo-400" />
          <div className="text-2xl font-bold text-white">{Math.round(summary.teamProgress)}%</div>
          <div className="text-xs text-white/70">Team Progress</div>
        </div>
        
        <div className="text-center p-4 bg-white/10 rounded-lg border border-white/10">
          <Award className="w-6 h-6 mx-auto mb-2 text-green-400" />
          <div className="text-2xl font-bold text-white">{summary.agentsAtTarget}</div>
          <div className="text-xs text-white/70">At Target</div>
        </div>
        
        <div className="text-center p-4 bg-white/10 rounded-lg border border-white/10">
          <AlertCircle className="w-6 h-6 mx-auto mb-2 text-red-400" />
          <div className="text-2xl font-bold text-white">{summary.agentsNeedingAttention}</div>
          <div className="text-xs text-white/70">Need Focus</div>
        </div>
      </div>

      {/* Team Progress Bar */}
      <div className="mb-4">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-white/80 font-medium">Team Monthly Progress</span>
          <span className="font-semibold text-white">
            {summary.totalCurrentMonthCompleted} / {summary.totalMonthlyTarget} visits
          </span>
        </div>
        <div className="w-full bg-white/20 rounded-full h-3">
          <div
            className="h-3 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-500"
            style={{ width: `${Math.min(summary.teamProgress, 100)}%` }}
          ></div>
        </div>
      </div>

      {/* Performance Indicators */}
      <div className="grid grid-cols-3 gap-4 text-center">
        <div className="p-3 bg-green-500/20 rounded-lg border border-green-500/30">
          <div className="text-lg font-bold text-green-400">{summary.agentsAtTarget}</div>
          <div className="text-xs text-green-300">Agents at 100% Target</div>
        </div>
        <div className="p-3 bg-blue-500/20 rounded-lg border border-blue-500/30">
          <div className="text-lg font-bold text-blue-400">{summary.agentsAbove80}</div>
          <div className="text-xs text-blue-300">Agents Above 80%</div>
        </div>
        <div className="p-3 bg-red-500/20 rounded-lg border border-red-500/30">
          <div className="text-lg font-bold text-red-400">{summary.agentsNeedingAttention}</div>
          <div className="text-xs text-red-300">Need Attention (&lt;40%)</div>
        </div>
      </div>
    </div>
  )
}