'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { 
  Building2, 
  CheckCircle, 
  Clock, 
  Calendar, 
  XCircle, 
  TrendingUp, 
  Target,
  BarChart3,
  Users,
  AlertCircle,
  Award,
  Star,
  TrendingDown,
  Activity,
  Eye,
  Filter,
  Download,
  Search,
  UserCheck,
  Crown
} from 'lucide-react'

interface AgentStatistics {
  agent_name: string
  agent_email: string
  team_name: string
  total_brands: number
  total_visits_done: number
  total_visits_pending: number
  total_scheduled_visits: number
  total_cancelled_visits: number
  last_month_visits: number
  current_month_scheduled: number
  current_month_completed: number
  current_month_total: number
  current_month_total_visits: number
  mom_pending: number
  monthly_target: number
  current_month_progress: number
  overall_progress: number
  error?: boolean
}

interface AgentWiseBreakdown {
  agent_name: string
  agent_email: string
  team_name: string
  role: string
  brands_assigned: number
  visits_completed: number
  visits_pending: number
  visits_scheduled: number
  visits_cancelled: number
  mom_pending: number
  current_month_completed: number
  current_month_scheduled: number
  current_month_total: number
  current_month_total_visits: number
  monthly_target: number
  current_month_progress: number
  overall_progress: number
  last_month_visits: number
  performance_rating: string
  completion_rate: number
  error?: boolean
}

interface AdminAgentStatisticsProps {
  userEmail: string
  onRefresh?: () => void
}

type SortField = 'name' | 'team' | 'progress' | 'completed' | 'pending' | 'brands'
type SortOrder = 'asc' | 'desc'

export default function AdminAgentStatistics({ userEmail, onRefresh }: AdminAgentStatisticsProps) {
  const [allAgentStatistics, setAllAgentStatistics] = useState<AgentStatistics[]>([])
  const [agentWiseBreakdown, setAgentWiseBreakdown] = useState<AgentWiseBreakdown[]>([])
  const [organizationSummary, setOrganizationSummary] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sortField, setSortField] = useState<SortField>('progress')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedTeam, setSelectedTeam] = useState<string>('all')
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('table')
  const [showOnlyActive, setShowOnlyActive] = useState(false)
  const [showAgentWiseBreakdown, setShowAgentWiseBreakdown] = useState(true)

  const loadOrganizationStatistics = async () => {
    try {
      setLoading(true)
      setError(null)
      
      console.log('📊 Loading organization-wide agent statistics for admin:', userEmail)
      
      // Use the dedicated admin endpoint for organization statistics
      const apiUrl = '';  // Use relative paths for same-origin requests
      const response = await fetch(`${apiUrl}/api/data/visits/admin-statistics`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include' // Include cookies for session
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.success) {
        setAllAgentStatistics(result.agent_statistics || [])
        setAgentWiseBreakdown(result.agent_wise_breakdown || [])
        setOrganizationSummary(result.organization_summary)
        console.log('✅ Organization statistics loaded:', result.agent_statistics)
        console.log('✅ Agent-wise breakdown loaded:', result.agent_wise_breakdown)
      } else {
        setError('Failed to load organization statistics')
      }
    } catch (err: any) {
      console.error('❌ Error loading organization statistics:', err)
      setError(err.message || 'Failed to load organization statistics')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (userEmail) {
      loadOrganizationStatistics()
    }
  }, [userEmail])

  useEffect(() => {
    if (onRefresh) {
      loadOrganizationStatistics()
    }
  }, [onRefresh])

  // Get unique teams
  const teams = Array.from(new Set(allAgentStatistics.map(agent => agent.team_name || 'Unknown').filter(Boolean)))

  // Filter and sort agents
  const filteredAndSortedAgents = allAgentStatistics
    .filter(agent => {
      if (agent.error) return !showOnlyActive
      
      const matchesSearch = agent.agent_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (agent.agent_email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (agent.team_name || '').toLowerCase().includes(searchTerm.toLowerCase())
      
      const matchesTeam = selectedTeam === 'all' || agent.team_name === selectedTeam
      const isActive = !showOnlyActive || (agent.current_month_scheduled + agent.total_scheduled_visits) >= 3
      
      return matchesSearch && matchesTeam && isActive
    })
    .sort((a, b) => {
      if (a.error && !b.error) return 1
      if (!a.error && b.error) return -1
      if (a.error && b.error) return 0

      let aValue: number | string = 0
      let bValue: number | string = 0

      switch (sortField) {
        case 'name':
          aValue = a.agent_name.toLowerCase()
          bValue = b.agent_name.toLowerCase()
          break
        case 'team':
          aValue = (a.team_name || '').toLowerCase()
          bValue = (b.team_name || '').toLowerCase()
          break
        case 'progress':
          aValue = a.current_month_progress
          bValue = b.current_month_progress
          break
        case 'completed':
          aValue = a.current_month_completed
          bValue = b.current_month_completed
          break
        case 'pending':
          aValue = a.total_visits_pending
          bValue = b.total_visits_pending
          break
        case 'brands':
          aValue = a.total_brands
          bValue = b.total_brands
          break
      }

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortOrder === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue)
      }

      return sortOrder === 'asc' ? (aValue as number) - (bValue as number) : (bValue as number) - (aValue as number)
    })

  // Calculate organization-wide metrics
  const organizationMetrics = allAgentStatistics.reduce((metrics, agent) => {
    if (!agent.error) {
      metrics.totalAgents += 1
      metrics.totalBrands += agent.total_brands
      metrics.totalVisitsDone += agent.total_visits_done
      metrics.totalVisitsPending += agent.total_visits_pending
      metrics.totalCurrentMonthCompleted += agent.current_month_completed
      metrics.totalMonthlyTarget += agent.monthly_target
      metrics.totalMomPending += agent.mom_pending || 0
      
      if (agent.current_month_progress >= 100) metrics.agentsAtTarget += 1
      if (agent.current_month_progress >= 80) metrics.agentsAbove80 += 1
      if (agent.current_month_progress < 40) metrics.agentsNeedingAttention += 1
    }
    return metrics
  }, {
    totalAgents: 0,
    totalBrands: 0,
    totalVisitsDone: 0,
    totalVisitsPending: 0,
    totalCurrentMonthCompleted: 0,
    totalMonthlyTarget: 0,
    totalMomPending: 0,
    agentsAtTarget: 0,
    agentsAbove80: 0,
    agentsNeedingAttention: 0
  })

  const organizationProgress = organizationMetrics.totalMonthlyTarget > 0 
    ? (organizationMetrics.totalCurrentMonthCompleted / organizationMetrics.totalMonthlyTarget) * 100 
    : 0

  // Performance rankings
  const getGlobalRank = (agent: AgentStatistics) => {
    const activeAgents = allAgentStatistics.filter(a => !a.error)
    const sortedByProgress = activeAgents.sort((a, b) => b.current_month_progress - a.current_month_progress)
    return sortedByProgress.findIndex(a => a.agent_name === agent.agent_name) + 1
  }

  const getPerformanceBadge = (progress: number) => {
    if (progress >= 100) return { icon: Crown, color: 'text-yellow-600', bg: 'bg-yellow-100', label: 'Champion' }
    if (progress >= 90) return { icon: Award, color: 'text-yellow-500', bg: 'bg-yellow-50', label: 'Excellent' }
    if (progress >= 80) return { icon: Star, color: 'text-green-500', bg: 'bg-green-50', label: 'Great' }
    if (progress >= 60) return { icon: TrendingUp, color: 'text-blue-500', bg: 'bg-blue-50', label: 'Good' }
    if (progress >= 40) return { icon: Activity, color: 'text-orange-500', bg: 'bg-orange-50', label: 'Average' }
    return { icon: TrendingDown, color: 'text-red-500', bg: 'bg-red-50', label: 'Needs Focus' }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-64 mb-4"></div>
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
        <div className="flex items-center">
          <XCircle className="h-5 w-5 text-red-500 mr-2" />
          <span className="text-red-700">{error}</span>
          <button 
            onClick={loadOrganizationStatistics}
            className="ml-auto text-red-600 hover:text-red-800 underline"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center">
            <Crown className="w-6 h-6 mr-2 text-yellow-600" />
            Organization-wide Agent Analytics
          </h2>
          <p className="text-sm text-gray-600">
            Complete performance overview across all teams and agents
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setViewMode(viewMode === 'cards' ? 'table' : 'cards')}
            className="text-sm text-gray-600 hover:text-gray-800 px-3 py-1 border rounded-md"
          >
            <Eye className="w-4 h-4 inline mr-1" />
            {viewMode === 'cards' ? 'Table View' : 'Card View'}
          </button>
          <button
            onClick={loadOrganizationStatistics}
            className="text-sm text-blue-600 hover:text-blue-800 underline"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Organization Summary */}
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-6 mb-6 border border-purple-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <BarChart3 className="w-5 h-5 mr-2 text-purple-600" />
          Organization Performance Dashboard
        </h3>
        
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4 mb-4">
          <div className="text-center p-3 bg-white rounded-lg shadow-sm">
            <div className="text-2xl font-bold text-purple-600">{organizationMetrics.totalAgents}</div>
            <div className="text-xs text-gray-600">Total Agents</div>
          </div>
          <div className="text-center p-3 bg-white rounded-lg shadow-sm">
            <div className="text-2xl font-bold text-blue-600">{organizationMetrics.totalBrands}</div>
            <div className="text-xs text-gray-600">Total Brands</div>
          </div>
          <div className="text-center p-3 bg-white rounded-lg shadow-sm">
            <div className="text-2xl font-bold text-green-600">{organizationMetrics.totalVisitsDone}</div>
            <div className="text-xs text-gray-600">Visits Done</div>
          </div>
          <div className="text-center p-3 bg-white rounded-lg shadow-sm">
            <div className="text-2xl font-bold text-yellow-600">{organizationMetrics.totalVisitsPending}</div>
            <div className="text-xs text-gray-600">Pending</div>
          </div>
          <div className="text-center p-3 bg-white rounded-lg shadow-sm">
            <div className="text-2xl font-bold text-orange-600">{organizationMetrics.totalCurrentMonthCompleted}/{organizationMetrics.totalMonthlyTarget}</div>
            <div className="text-xs text-gray-600">This Month</div>
          </div>
          <div className="text-center p-3 bg-white rounded-lg shadow-sm">
            <div className="text-2xl font-bold text-indigo-600">{Math.round(organizationProgress)}%</div>
            <div className="text-xs text-gray-600">Org Progress</div>
          </div>
          <div className="text-center p-3 bg-white rounded-lg shadow-sm">
            <div className="text-2xl font-bold text-green-500">{organizationMetrics.agentsAtTarget}</div>
            <div className="text-xs text-gray-600">At Target</div>
          </div>
          <div className="text-center p-3 bg-white rounded-lg shadow-sm">
            <div className="text-2xl font-bold text-red-500">{organizationMetrics.agentsNeedingAttention}</div>
            <div className="text-xs text-gray-600">Need Focus</div>
          </div>
        </div>

        {/* Organization Progress Bar */}
        <div className="mb-2">
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-700 font-medium">Organization Monthly Progress</span>
            <span className="font-semibold">{organizationMetrics.totalCurrentMonthCompleted} / {organizationMetrics.totalMonthlyTarget} visits</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-4">
            <div
              className="h-4 rounded-full bg-gradient-to-r from-purple-500 to-blue-600 transition-all duration-500"
              style={{ width: `${Math.min(organizationProgress, 100)}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-wrap items-center justify-between mb-6 gap-4">
        <div className="flex items-center space-x-4">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              id="agent-search"
              name="agent-search"
              type="text"
              placeholder="Search agents, emails, teams..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border rounded-md text-sm w-64"
              autoComplete="off"
            />
          </div>
          
          <select
            value={selectedTeam}
            onChange={(e) => setSelectedTeam(e.target.value)}
            className="text-sm border rounded-md px-3 py-2"
          >
            <option value="all">All Teams</option>
            {teams.map(team => (
              <option key={team} value={team}>{team}</option>
            ))}
          </select>

          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <select
              value={sortField}
              onChange={(e) => setSortField(e.target.value as SortField)}
              className="text-sm border rounded-md px-2 py-1"
            >
              <option value="progress">Sort by Progress</option>
              <option value="name">Sort by Name</option>
              <option value="team">Sort by Team</option>
              <option value="completed">Sort by Completed</option>
              <option value="pending">Sort by Pending</option>
              <option value="brands">Sort by Brands</option>
            </select>
            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="text-sm text-gray-600 hover:text-gray-800 px-2 py-1 border rounded-md"
            >
              {sortOrder === 'asc' ? '↑' : '↓'}
            </button>
          </div>

          <label className="flex items-center text-sm">
            <input
              id="show-active-agents"
              name="show-active-agents"
              type="checkbox"
              checked={showOnlyActive}
              onChange={(e) => setShowOnlyActive(e.target.checked)}
              className="mr-2"
            />
            Active agents only (3+ scheduled visits)
          </label>
        </div>
        
        <div className="text-sm text-gray-600">
          Showing {filteredAndSortedAgents.length} of {allAgentStatistics.length} agents
        </div>
      </div>

      {/* Agent Statistics Display */}
      {viewMode === 'table' ? (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Agent</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Team</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Global Rank</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Progress</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Brands</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Completed</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pending</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">MOM Pending</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Performance</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredAndSortedAgents.map((agent, index) => {
                const badge = getPerformanceBadge(agent.current_month_progress)
                const globalRank = getGlobalRank(agent)
                
                return (
                  <tr key={index} className={agent.error ? 'bg-red-50' : 'hover:bg-gray-50'}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mr-3">
                          <span className="text-xs font-bold text-white">
                            {agent.agent_name.split(' ').map(n => n[0]).join('').toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">{agent.agent_name}</div>
                          <div className="text-xs text-gray-500">{agent.agent_email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {agent.team_name || 'Unknown'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {!agent.error && (
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          globalRank === 1 ? 'bg-yellow-100 text-yellow-800' :
                          globalRank <= 5 ? 'bg-green-100 text-green-800' :
                          globalRank <= 10 ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          #{globalRank} {globalRank === 1 ? '👑' : globalRank <= 3 ? '🏆' : ''}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {!agent.error && (
                        <div className="flex items-center">
                          <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                            <div
                              className={`h-2 rounded-full ${
                                agent.current_month_progress >= 100 ? 'bg-green-500' :
                                agent.current_month_progress >= 80 ? 'bg-yellow-500' : 
                                agent.current_month_progress >= 60 ? 'bg-blue-500' : 'bg-red-500'
                              }`}
                              style={{ width: `${Math.min(agent.current_month_progress, 100)}%` }}
                            ></div>
                          </div>
                          <span className="text-sm font-medium text-gray-900">
                            {Math.round(agent.current_month_progress)}%
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                      {!agent.error && agent.total_brands}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-medium">
                      {!agent.error && agent.current_month_completed}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-yellow-600 font-medium">
                      {!agent.error && agent.total_visits_pending}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-pink-600 font-medium">
                      {!agent.error && (agent.mom_pending || 0)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {!agent.error && (
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${badge.bg} ${badge.color}`}>
                          <badge.icon className="w-3 h-3 mr-1" />
                          {badge.label}
                        </span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredAndSortedAgents.map((agent, index) => {
            const badge = getPerformanceBadge(agent.current_month_progress)
            const globalRank = getGlobalRank(agent)
            
            return (
              <div
                key={index}
                className={`border rounded-lg p-4 transition-all hover:shadow-md ${
                  agent.error ? 'border-red-200 bg-red-50' : 
                  agent.current_month_progress >= 100 ? 'border-green-200 bg-green-50' :
                  agent.current_month_progress >= 80 ? 'border-blue-200 bg-blue-50' :
                  'border-gray-200 bg-white'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center">
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-600 rounded-full flex items-center justify-center mr-4">
                      <span className="text-sm font-bold text-white">
                        {agent.agent_name.split(' ').map(n => n[0]).join('').toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 flex items-center">
                        {agent.agent_name}
                        {!agent.error && globalRank <= 5 && (
                          <span className={`ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            globalRank === 1 ? 'bg-yellow-100 text-yellow-800' :
                            'bg-green-100 text-green-800'
                          }`}>
                            #{globalRank} {globalRank === 1 ? '👑' : globalRank <= 3 ? '🏆' : '⭐'}
                          </span>
                        )}
                      </h4>
                      <div className="text-sm text-gray-600">{agent.agent_email}</div>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {agent.team_name || 'Unknown Team'}
                        </span>
                        {!agent.error && (
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${badge.bg} ${badge.color}`}>
                            <badge.icon className="w-3 h-3 mr-1" />
                            {badge.label}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  {!agent.error && (
                    <div className="text-right">
                      <div className="text-xl font-bold text-gray-900">
                        {agent.current_month_completed}/{agent.monthly_target}
                      </div>
                      <div className="text-sm text-gray-600">
                        {Math.round(agent.current_month_progress)}% complete
                      </div>
                    </div>
                  )}
                </div>

                {!agent.error && (
                  <>
                    {/* Compact metrics */}
                    <div className="grid grid-cols-6 gap-2 mb-3">
                      <div className="text-center p-2 bg-blue-50 rounded text-xs">
                        <div className="font-semibold text-blue-600">{agent.total_brands}</div>
                        <div className="text-gray-600">Brands</div>
                      </div>
                      <div className="text-center p-2 bg-green-50 rounded text-xs">
                        <div className="font-semibold text-green-600">{agent.total_visits_done}</div>
                        <div className="text-gray-600">Done</div>
                      </div>
                      <div className="text-center p-2 bg-yellow-50 rounded text-xs">
                        <div className="font-semibold text-yellow-600">{agent.total_visits_pending}</div>
                        <div className="text-gray-600">Pending</div>
                      </div>
                      <div className="text-center p-2 bg-purple-50 rounded text-xs">
                        <div className="font-semibold text-purple-600">{agent.total_scheduled_visits}</div>
                        <div className="text-gray-600">Scheduled</div>
                      </div>
                      <div className="text-center p-2 bg-pink-50 rounded text-xs">
                        <div className="font-semibold text-pink-600">{agent.mom_pending || 0}</div>
                        <div className="text-gray-600">MOM</div>
                      </div>
                      <div className="text-center p-2 bg-indigo-50 rounded text-xs">
                        <div className="font-semibold text-indigo-600">{agent.last_month_visits}</div>
                        <div className="text-gray-600">Last Mo.</div>
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
                      <div
                        className={`h-3 rounded-full transition-all duration-500 ${
                          agent.current_month_progress >= 100 
                            ? 'bg-gradient-to-r from-green-500 to-green-600' 
                            : agent.current_month_progress >= 80 
                            ? 'bg-gradient-to-r from-yellow-500 to-orange-500' 
                            : agent.current_month_progress >= 60
                            ? 'bg-gradient-to-r from-blue-500 to-blue-600'
                            : 'bg-gradient-to-r from-red-500 to-red-600'
                        }`}
                        style={{ width: `${Math.min(agent.current_month_progress, 100)}%` }}
                      ></div>
                    </div>
                  </>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Agent-wise Breakdown Section */}
      {showAgentWiseBreakdown && agentWiseBreakdown.length > 0 && (
        <div className="mt-8 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg p-6 border border-indigo-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <Users className="w-5 h-5 mr-2 text-indigo-600" />
              Agent-wise Performance Breakdown
            </h3>
            <button
              onClick={() => setShowAgentWiseBreakdown(!showAgentWiseBreakdown)}
              className="text-sm text-indigo-600 hover:text-indigo-800 underline"
            >
              {showAgentWiseBreakdown ? 'Hide' : 'Show'} Breakdown
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-white">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Agent</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Team</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Brands</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Completed</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pending</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Scheduled</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cancelled</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">MOM Pending</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Monthly Progress</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Completion Rate</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rating</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {agentWiseBreakdown
                  .filter(agent => {
                    const matchesSearch = agent.agent_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                         agent.agent_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                         agent.team_name.toLowerCase().includes(searchTerm.toLowerCase())
                    const matchesTeam = selectedTeam === 'all' || agent.team_name === selectedTeam
                    return matchesSearch && matchesTeam
                  })
                  .sort((a, b) => b.current_month_progress - a.current_month_progress)
                  .map((agent, index) => (
                    <tr key={index} className={agent.error ? 'bg-red-50' : 'hover:bg-gray-50'}>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-6 h-6 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center mr-2">
                            <span className="text-xs font-bold text-white">
                              {agent.agent_name.split(' ').map(n => n[0]).join('').toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900">{agent.agent_name}</div>
                            <div className="text-xs text-gray-500">{agent.agent_email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                          {agent.team_name}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                        {agent.brands_assigned}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-green-600">
                        {agent.visits_completed}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-yellow-600">
                        {agent.visits_pending}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-blue-600">
                        {agent.visits_scheduled}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-red-600">
                        {agent.visits_cancelled}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-pink-600">
                        {agent.mom_pending}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-12 bg-gray-200 rounded-full h-2 mr-2">
                            <div
                              className={`h-2 rounded-full ${
                                agent.current_month_progress >= 100 ? 'bg-green-500' :
                                agent.current_month_progress >= 80 ? 'bg-yellow-500' : 
                                agent.current_month_progress >= 60 ? 'bg-blue-500' : 'bg-red-500'
                              }`}
                              style={{ width: `${Math.min(agent.current_month_progress, 100)}%` }}
                            ></div>
                          </div>
                          <span className="text-sm font-medium text-gray-900">
                            {Math.round(agent.current_month_progress)}%
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                        {agent.completion_rate}%
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          agent.performance_rating === 'Excellent' ? 'bg-green-100 text-green-800' :
                          agent.performance_rating === 'Good' ? 'bg-blue-100 text-blue-800' :
                          agent.performance_rating === 'Average' ? 'bg-yellow-100 text-yellow-800' :
                          agent.performance_rating === 'Needs Improvement' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {agent.performance_rating}
                        </span>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}