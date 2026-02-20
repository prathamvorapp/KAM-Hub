'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
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
  ChevronUp,
  ChevronDown
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

interface AllVisitStatsProps {
  userEmail: string
  refreshKey?: number
}

type SortField = 'name' | 'progress' | 'completed' | 'pending' | 'brands' | 'team'
type SortOrder = 'asc' | 'desc'

export default function AllVisitStats({ userEmail, refreshKey }: AllVisitStatsProps) {
  const { userProfile } = useAuth();
  const [sortField, setSortField] = useState<SortField>('progress')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards')
  const [showOnlyActive, setShowOnlyActive] = useState(false)
  const [showAgentWiseData, setShowAgentWiseData] = useState(false)
  const [selectedTeam, setSelectedTeam] = useState<string>('all')

  const [allAgentStatistics, setAllAgentStatistics] = useState<AgentStatistics[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAllAgentStatistics = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const email = userEmail || userProfile?.email;
      if (!email) {
        throw new Error('User email is required');
      }

      // console.log('📊 Loading all agent statistics for Admin:', email);
      
      // Use the admin statistics endpoint which returns all agents' stats in one call
      const response = await fetch('/api/data/visits/admin-statistics', {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch admin statistics: ${response.status}`);
      }
      
      const data = await response.json();
      // console.log('📊 Admin statistics response:', data);

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch statistics');
      }

      const agentStats = data.agent_statistics || [];
      
      if (!Array.isArray(agentStats) || agentStats.length === 0) {
        throw new Error('No agent statistics found');
      }

      // console.log('✅ Loaded statistics for', agentStats.length, 'agents');

      // Map the data to ensure all fields are present with defaults
      const mappedStats = agentStats.map((agent: any) => ({
        agent_name: agent.agent_name || 'Unknown',
        agent_email: agent.agent_email || '',
        team_name: agent.team_name || 'Unknown',
        total_brands: agent.total_brands || 0,
        total_visits_done: agent.total_visits_done || 0,
        total_visits_pending: agent.total_visits_pending || 0,
        total_scheduled_visits: agent.total_scheduled_visits || 0,
        total_cancelled_visits: agent.total_cancelled_visits || 0,
        last_month_visits: agent.last_month_visits || 0,
        current_month_scheduled: agent.current_month_scheduled || 0,
        current_month_completed: agent.current_month_completed || 0,
        current_month_total: agent.current_month_total || 0,
        current_month_total_visits: agent.current_month_total_visits || 0,
        mom_pending: agent.mom_pending || 0,
        monthly_target: agent.monthly_target || 10,
        current_month_progress: agent.current_month_progress || 0,
        overall_progress: agent.overall_progress || 0,
        error: agent.error || false
      }));

      setAllAgentStatistics(mappedStats);
      // console.log('✅ All agent statistics loaded successfully');
    } catch (err: any) {
      console.error('❌ Error loading all agent statistics:', err);
      setError(err.message || 'Failed to load agent statistics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllAgentStatistics();
  }, [userEmail, userProfile?.email, refreshKey]);

  const refresh = () => {
    loadAllAgentStatistics();
  };

  // Get unique teams for filter
  const uniqueTeams = Array.from(new Set(allAgentStatistics.map(agent => agent.team_name).filter(Boolean)));

  // Filter by team if selected
  const teamFilteredAgents = selectedTeam === 'all' 
    ? allAgentStatistics 
    : allAgentStatistics.filter(agent => agent.team_name === selectedTeam);

  // Sort agents based on selected criteria
  const sortedAgents = [...teamFilteredAgents].sort((a, b) => {
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
        aValue = a.team_name.toLowerCase()
        bValue = b.team_name.toLowerCase()
        break
      case 'progress':
        aValue = a.current_month_progress || 0
        bValue = b.current_month_progress || 0
        break
      case 'completed':
        aValue = a.current_month_completed || 0
        bValue = b.current_month_completed || 0
        break
      case 'pending':
        aValue = a.total_visits_pending || 0
        bValue = b.total_visits_pending || 0
        break
      case 'brands':
        aValue = a.total_brands || 0
        bValue = b.total_brands || 0
        break
    }

    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return sortOrder === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue)
    }

    return sortOrder === 'asc' ? (aValue as number) - (bValue as number) : (bValue as number) - (aValue as number)
  })

  // Filter agents if showing only active ones
  const filteredAgents = showOnlyActive 
    ? sortedAgents.filter(agent => !agent.error && ((agent.current_month_scheduled || 0) + (agent.total_scheduled_visits || 0)) >= 3)
    : sortedAgents

  // Calculate performance rankings
  const getPerformanceRank = (agent: AgentStatistics) => {
    const activeAgents = allAgentStatistics.filter((a: any) => !a.error)
    const sortedByProgress = activeAgents.sort((a: any, b: any) => (b.current_month_progress || 0) - (a.current_month_progress || 0))
    return sortedByProgress.findIndex((a: any) => a.agent_email === agent.agent_email) + 1
  }

  const getPerformanceBadge = (progress: number) => {
    const safeProgress = progress || 0
    if (safeProgress >= 100) return { icon: Award, color: 'text-yellow-500', bg: 'bg-yellow-50', label: 'Target Achieved' }
    if (safeProgress >= 80) return { icon: Star, color: 'text-green-500', bg: 'bg-green-50', label: 'Excellent' }
    if (safeProgress >= 60) return { icon: TrendingUp, color: 'text-blue-500', bg: 'bg-blue-50', label: 'Good' }
    if (safeProgress >= 40) return { icon: Activity, color: 'text-orange-500', bg: 'bg-orange-50', label: 'Average' }
    return { icon: TrendingDown, color: 'text-red-500', bg: 'bg-red-50', label: 'Needs Attention' }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-48 mb-4"></div>
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
        <div className="mt-4 text-sm text-gray-500">
          Loading organization-wide statistics...
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
        <div className="text-center py-8">
          <div className="text-red-600 mb-4">
            <AlertCircle className="h-8 w-8 mx-auto mb-2" />
            <p className="font-medium">Error loading statistics</p>
            <p className="text-sm text-gray-600 mt-1">{error}</p>
          </div>
          <button 
            onClick={refresh}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  // Calculate organization totals
  const orgTotals = allAgentStatistics.reduce((totals: any, agent: any) => {
    if (!agent.error) {
      totals.total_brands += agent.total_brands || 0
      totals.total_visits_done += agent.total_visits_done || 0
      totals.total_visits_pending += agent.total_visits_pending || 0
      totals.total_scheduled_visits += agent.total_scheduled_visits || 0
      totals.total_cancelled_visits += agent.total_cancelled_visits || 0
      totals.current_month_total += agent.current_month_total || 0
      totals.current_month_total_visits += agent.current_month_total_visits || 0
      totals.mom_pending += agent.mom_pending || 0
    }
    return totals
  }, {
    total_brands: 0,
    total_visits_done: 0,
    total_visits_pending: 0,
    total_scheduled_visits: 0,
    total_cancelled_visits: 0,
    current_month_total: 0,
    current_month_total_visits: 0,
    mom_pending: 0
  });

  const orgMonthlyTarget = allAgentStatistics.filter((a: any) => !a.error).length * 10
  const orgProgress = orgMonthlyTarget > 0 ? ((orgTotals.current_month_total_visits || orgTotals.current_month_total || 0) / orgMonthlyTarget) * 100 : 0

  const activeAgentsCount = allAgentStatistics.filter((a: any) => !a.error && ((a.current_month_scheduled || 0) + (a.total_scheduled_visits || 0)) >= 3).length
  const targetAchievedCount = allAgentStatistics.filter((a: any) => !a.error && (a.current_month_progress || 0) >= 100).length

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Organization-wide Visit Statistics</h2>
          <p className="text-sm text-gray-600">
            All Agents • {allAgentStatistics.filter(a => !a.error).length} Total Agents • {activeAgentsCount} Active Agents
          </p>
        </div>
        <div className="flex items-center space-x-3">
          {allAgentStatistics.length > 0 && (
            <button
              onClick={() => setShowAgentWiseData(!showAgentWiseData)}
              className="inline-flex items-center gap-2 px-3 py-2 bg-slate-50 hover:bg-white text-gray-800 border border-gray-300 rounded-lg font-medium transition-all duration-200 shadow-sm hover:shadow"
            >
              <Users className="w-4 h-4 text-gray-800" />
              <span>{showAgentWiseData ? 'Hide' : 'Show'} Agent Wise Data</span>
              {showAgentWiseData ? (
                <ChevronUp className="w-4 h-4 text-gray-800" />
              ) : (
                <ChevronDown className="w-4 h-4 text-gray-800" />
              )}
            </button>
          )}
          <button
            onClick={refresh}
            className="text-sm text-blue-600 hover:text-blue-800 underline"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Main Statistics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
        <div className="bg-blue-50 rounded-lg p-4 text-center border border-blue-100">
          <Building2 className="w-8 h-8 text-blue-600 mx-auto mb-2" />
          <div className="text-2xl font-bold text-blue-600">{orgTotals.total_brands || 0}</div>
          <div className="text-sm text-gray-600">Total Brands</div>
          <div className="text-xs text-gray-500 mt-1">Total brands assigned</div>
        </div>
        
        <div className="bg-green-50 rounded-lg p-4 text-center border border-green-100">
          <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
          <div className="text-2xl font-bold text-green-600">{orgTotals.total_visits_done || 0}</div>
          <div className="text-sm text-gray-600">Visits Done (MOM Approved)</div>
          <div className="text-xs text-gray-500 mt-1">Completed with MOM approved</div>
        </div>
        
        <div className="bg-yellow-50 rounded-lg p-4 text-center border border-yellow-100">
          <Clock className="w-8 h-8 text-yellow-600 mx-auto mb-2" />
          <div className="text-2xl font-bold text-yellow-600">{orgTotals.total_visits_pending || 0}</div>
          <div className="text-sm text-gray-600">Visits Pending</div>
          <div className="text-xs text-gray-500 mt-1">Brands not visited yet</div>
        </div>
        
        <div className="bg-purple-50 rounded-lg p-4 text-center border border-purple-100">
          <Calendar className="w-8 h-8 text-purple-600 mx-auto mb-2" />
          <div className="text-2xl font-bold text-purple-600">{orgTotals.total_scheduled_visits || 0}</div>
          <div className="text-sm text-gray-600">Visits Scheduled</div>
          <div className="text-xs text-gray-500 mt-1">Upcoming scheduled visits</div>
        </div>
        
        <div className="bg-red-50 rounded-lg p-4 text-center border border-red-100">
          <XCircle className="w-8 h-8 text-red-600 mx-auto mb-2" />
          <div className="text-2xl font-bold text-red-600">{orgTotals.total_cancelled_visits || 0}</div>
          <div className="text-sm text-gray-600">Visits Cancelled</div>
          <div className="text-xs text-gray-500 mt-1">Cancelled visits</div>
        </div>
      </div>

      {/* Secondary Statistics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        <div className="bg-pink-50 rounded-lg p-4 text-center border border-pink-100">
          <AlertCircle className="w-6 h-6 text-pink-600 mx-auto mb-2" />
          <div className="text-xl font-bold text-pink-600">{orgTotals.mom_pending || 0}</div>
          <div className="text-sm text-gray-600">MOM Pending</div>
        </div>
        
        <div className="bg-orange-50 rounded-lg p-4 text-center border border-orange-100">
          <Target className="w-6 h-6 text-orange-600 mx-auto mb-2" />
          <div className="text-xl font-bold text-orange-600">{orgTotals.current_month_total_visits || orgTotals.current_month_total || 0}/{orgMonthlyTarget || 0}</div>
          <div className="text-sm text-gray-600">This Month</div>
        </div>
        
        <div className="bg-indigo-50 rounded-lg p-4 text-center border border-indigo-100">
          <TrendingUp className="w-6 h-6 text-indigo-600 mx-auto mb-2" />
          <div className="text-xl font-bold text-indigo-600">{Math.round(orgProgress || 0)}%</div>
          <div className="text-sm text-gray-600">Org Progress</div>
        </div>

        <div className="bg-teal-50 rounded-lg p-4 text-center border border-teal-100">
          <Activity className="w-6 h-6 text-teal-600 mx-auto mb-2" />
          <div className="text-xl font-bold text-teal-600">{activeAgentsCount || 0}</div>
          <div className="text-sm text-gray-600">Active Agents</div>
          <div className="text-xs text-gray-500 mt-1">3+ visits scheduled</div>
        </div>

        <div className="bg-cyan-50 rounded-lg p-4 text-center border border-cyan-100">
          <Award className="w-6 h-6 text-cyan-600 mx-auto mb-2" />
          <div className="text-xl font-bold text-cyan-600">{targetAchievedCount || 0}</div>
          <div className="text-sm text-gray-600">Target Achieved</div>
        </div>

        <div className="bg-emerald-50 rounded-lg p-4 text-center border border-emerald-100">
          <Star className="w-6 h-6 text-emerald-600 mx-auto mb-2" />
          <div className="text-xl font-bold text-emerald-600">{Math.round(((orgTotals.total_visits_done || 0) / Math.max(orgTotals.total_brands || 1, 1)) * 100)}%</div>
          <div className="text-sm text-gray-600">Overall Progress</div>
        </div>
      </div>

      {/* Organization Monthly Target Progress */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 mb-4 border border-blue-100">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-700">Organization Monthly Target Progress</span>
          <span className="text-sm font-medium text-gray-900">{orgTotals.current_month_total_visits || orgTotals.current_month_total || 0} / {orgMonthlyTarget || 0} visits ({Math.round(orgProgress || 0)}% complete)</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div
            className={`h-3 rounded-full transition-all duration-500 ${
              orgProgress >= 100 
                ? 'bg-gradient-to-r from-green-500 to-green-600' 
                : orgProgress >= 80 
                ? 'bg-gradient-to-r from-yellow-500 to-orange-500' 
                : 'bg-gradient-to-r from-blue-500 to-blue-600'
            }`}
            style={{ width: `${Math.min(orgProgress || 0, 100)}%` }}
          ></div>
        </div>
        <div className="text-xs text-gray-500 mt-1">
          {orgProgress >= 100 
            ? '🎉 Monthly target achieved! Excellent organization performance!' 
            : `${Math.round(100 - (orgProgress || 0))}% remaining • ${(orgMonthlyTarget || 0) - (orgTotals.current_month_total_visits || orgTotals.current_month_total || 0)} visits needed`
          }
        </div>
      </div>

      {/* Agent Statistics - Only show when expanded */}
      {showAgentWiseData && allAgentStatistics.length > 0 && (
        <div className="mt-6 space-y-4">
          {/* Controls */}
          <div className="flex flex-wrap items-center justify-between mb-4 gap-4">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setViewMode(viewMode === 'cards' ? 'table' : 'cards')}
                  className="text-sm text-gray-600 hover:text-gray-800 px-3 py-1 border rounded-md"
                >
                  <Eye className="w-4 h-4 inline mr-1" />
                  {viewMode === 'cards' ? 'Table View' : 'Card View'}
                </button>
                <Filter className="w-4 h-4 text-gray-500" />
                <select
                  value={selectedTeam}
                  onChange={(e) => setSelectedTeam(e.target.value)}
                  className="text-sm border rounded-md px-2 py-1"
                >
                  <option value="all">All Teams</option>
                  {uniqueTeams.map(team => (
                    <option key={team} value={team}>{team}</option>
                  ))}
                </select>
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
                Show only active agents (3+ scheduled visits)
              </label>
            </div>
            <div className="text-sm text-gray-600">
              Showing {filteredAgents.length} of {allAgentStatistics.length} agents
            </div>
          </div>

          {/* Individual Agent Statistics */}
          <div className="space-y-4">
            <h3 className="text-md font-medium text-gray-900 flex items-center">
              <Users className="w-5 h-5 mr-2 text-gray-600" />
              Agent-wise Performance Analytics
            </h3>

            {viewMode === 'table' ? (
              /* Table View */
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Agent</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Team</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rank</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Progress</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Brands</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Completed</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pending</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">MOM Pending</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredAgents.map((agent, index) => {
                      const badge = getPerformanceBadge(agent.current_month_progress)
                      const rank = getPerformanceRank(agent)
                      
                      return (
                        <tr key={index} className={agent.error ? 'bg-red-50' : 'hover:bg-gray-50'}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                                <span className="text-sm font-medium text-blue-600">
                                  {agent.agent_name.split(' ').map((n: any) => n[0]).join('').toUpperCase()}
                                </span>
                              </div>
                              <div>
                                <div className="text-sm font-medium text-gray-900">{agent.agent_name}</div>
                                <div className="text-xs text-gray-500">{agent.agent_email}</div>
                                {agent.error && (
                                  <div className="flex items-center text-red-600 text-xs">
                                    <AlertCircle className="w-3 h-3 mr-1" />
                                    Data unavailable
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {agent.team_name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {!agent.error && (
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                rank <= 3 ? 'bg-green-100 text-green-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                #{rank}
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {!agent.error && (
                              <div className="flex items-center">
                                <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                                  <div
                                    className={`h-2 rounded-full ${
                                      (agent.current_month_progress || 0) >= 100 ? 'bg-green-500' :
                                      (agent.current_month_progress || 0) >= 70 ? 'bg-yellow-500' : 'bg-blue-500'
                                    }`}
                                    style={{ width: `${Math.min(agent.current_month_progress || 0, 100)}%` }}
                                  ></div>
                                </div>
                                <span className="text-sm font-medium text-gray-900">
                                  {Math.round(agent.current_month_progress || 0)}%
                                </span>
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {!agent.error && (agent.total_brands || 0)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-medium">
                            {!agent.error && (agent.current_month_completed || 0)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-yellow-600 font-medium">
                            {!agent.error && (agent.total_visits_pending || 0)}
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
              /* Card View */
              <div className="grid gap-4">
                {filteredAgents.map((agent, index) => {
                  const badge = getPerformanceBadge(agent.current_month_progress)
                  const rank = getPerformanceRank(agent)
                  
                  return (
                    <div
                      key={index}
                      className={`border rounded-lg p-4 transition-all hover:shadow-md ${
                        agent.error ? 'border-red-200 bg-red-50' : 
                        (agent.current_month_progress || 0) >= 100 ? 'border-green-200 bg-green-50' :
                        (agent.current_month_progress || 0) >= 80 ? 'border-blue-200 bg-blue-50' :
                        'border-gray-200 bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mr-3">
                            <span className="text-sm font-bold text-white">
                              {agent.agent_name.split(' ').map((n: any) => n[0]).join('').toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <h4 className="font-semibold text-gray-900 flex items-center">
                              {agent.agent_name}
                              {!agent.error && rank <= 3 && (
                                <span className={`ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                  rank === 1 ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-green-100 text-green-800'
                                }`}>
                                  #{rank} {rank === 1 ? '🏆' : rank === 2 ? '🥈' : '🥉'}
                                </span>
                              )}
                            </h4>
                            <div className="text-xs text-gray-500">{agent.team_name}</div>
                            {agent.error ? (
                              <div className="flex items-center text-red-600 text-sm">
                                <AlertCircle className="w-4 h-4 mr-1" />
                                Failed to load data
                              </div>
                            ) : (
                              <div className="flex items-center space-x-2">
                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${badge.bg} ${badge.color}`}>
                                  <badge.icon className="w-3 h-3 mr-1" />
                                  {badge.label}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                        {!agent.error && (
                          <div className="text-right">
                            <div className="text-xl font-bold text-gray-900">
                              {agent.current_month_completed || 0}/{agent.monthly_target || 10}
                            </div>
                            <div className="text-sm text-gray-600">
                              {Math.round(agent.current_month_progress || 0)}% complete
                            </div>
                          </div>
                        )}
                      </div>

                      {!agent.error && (
                        <>
                          {/* Key Metrics Grid */}
                          <div className="grid grid-cols-5 md:grid-cols-10 gap-2 mb-4">
                            <div className="text-center p-2 bg-blue-50 rounded">
                              <div className="text-lg font-semibold text-blue-600">{agent.total_brands || 0}</div>
                              <div className="text-xs text-gray-600">Brands</div>
                            </div>
                            <div className="text-center p-2 bg-green-50 rounded">
                              <div className="text-lg font-semibold text-green-600">{agent.total_visits_done || 0}</div>
                              <div className="text-xs text-gray-600">Done</div>
                            </div>
                            <div className="text-center p-2 bg-yellow-50 rounded">
                              <div className="text-lg font-semibold text-yellow-600">{agent.total_visits_pending || 0}</div>
                              <div className="text-xs text-gray-600">Pending</div>
                            </div>
                            <div className="text-center p-2 bg-purple-50 rounded">
                              <div className="text-lg font-semibold text-purple-600">{agent.total_scheduled_visits || 0}</div>
                              <div className="text-xs text-gray-600">Scheduled</div>
                            </div>
                            <div className="text-center p-2 bg-red-50 rounded">
                              <div className="text-lg font-semibold text-red-600">{agent.total_cancelled_visits || 0}</div>
                              <div className="text-xs text-gray-600">Cancelled</div>
                            </div>
                            <div className="text-center p-2 bg-pink-50 rounded">
                              <div className="text-lg font-semibold text-pink-600">{agent.mom_pending || 0}</div>
                              <div className="text-xs text-gray-600">MOM Pending</div>
                            </div>
                            <div className="text-center p-2 bg-indigo-50 rounded">
                              <div className="text-lg font-semibold text-indigo-600">{agent.last_month_visits || 0}</div>
                              <div className="text-xs text-gray-600">Last Month</div>
                            </div>
                            <div className="text-center p-2 bg-orange-50 rounded">
                              <div className="text-lg font-semibold text-orange-600">{agent.current_month_completed || 0}</div>
                              <div className="text-xs text-gray-600">Completed</div>
                            </div>
                            <div className="text-center p-2 bg-teal-50 rounded">
                              <div className="text-lg font-semibold text-teal-600">{agent.current_month_scheduled || 0}</div>
                              <div className="text-xs text-gray-600">Scheduled</div>
                            </div>
                            <div className="text-center p-2 bg-gray-50 rounded">
                              <div className="text-lg font-semibold text-gray-600">{Math.round(agent.overall_progress || 0)}%</div>
                              <div className="text-xs text-gray-600">Overall</div>
                            </div>
                          </div>

                          {/* Progress Bar */}
                          <div className="mb-3">
                            <div className="flex justify-between text-sm mb-1">
                              <span className="text-gray-600">Monthly Progress</span>
                              <span className="font-medium">{agent.current_month_completed || 0} / {agent.monthly_target || 10} visits</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-3">
                              <div
                                className={`h-3 rounded-full transition-all duration-500 ${
                                  (agent.current_month_progress || 0) >= 100 
                                    ? 'bg-gradient-to-r from-green-500 to-green-600' 
                                    : (agent.current_month_progress || 0) >= 70 
                                    ? 'bg-gradient-to-r from-yellow-500 to-orange-500' 
                                    : 'bg-gradient-to-r from-blue-500 to-blue-600'
                                }`}
                                style={{ width: `${Math.min(agent.current_month_progress || 0, 100)}%` }}
                              ></div>
                            </div>
                          </div>

                          {/* Status Message */}
                          <div className="text-center">
                            <p className={`text-sm font-medium ${
                              (agent.current_month_progress || 0) >= 100 
                                ? 'text-green-600' 
                                : (agent.current_month_progress || 0) >= 70 
                                ? 'text-yellow-600' 
                                : (agent.current_month_progress || 0) >= 40
                                ? 'text-blue-600'
                                : 'text-red-600'
                            }`}>
                              {(agent.current_month_progress || 0) >= 100 
                                ? '🎉 Monthly target achieved! Excellent work!' 
                                : (agent.current_month_progress || 0) >= 70
                                ? '⭐ Great progress! Almost there!'
                                : (agent.current_month_progress || 0) >= 40
                                ? '📈 Good progress, keep it up!'
                                : '⚠️ Needs attention - behind target'
                              }
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              {(agent.current_month_progress || 0) < 100 && 
                                `${Math.round(100 - (agent.current_month_progress || 0))}% remaining • ${(agent.monthly_target || 10) - (agent.current_month_completed || 0)} visits needed`
                              }
                            </p>
                          </div>
                        </>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
