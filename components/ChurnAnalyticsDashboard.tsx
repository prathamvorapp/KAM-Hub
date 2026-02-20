'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { api } from '@/lib/api'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { Clock, TrendingUp, Users, AlertCircle } from 'lucide-react'

interface OverallStats {
  totalRecords: number
  recordsWithResponse: number
  avgResponseTime: number
  responseRate: number
}

interface AgentAnalytics {
  agent: string
  avgResponseTime: number
  totalRecords: number
  minResponseTime: number
  maxResponseTime: number
}

interface ChurnReasonAnalytics {
  reason: string
  count: number
}

interface TeamAnalytics {
  team: string
  count: number
  avgResponseTime: number
}

interface ChurnAnalyticsData {
  userRole: string
  overallStats: OverallStats
  agentAnalytics: AgentAnalytics[]
  churnReasonAnalytics: ChurnReasonAnalytics[]
  teamAnalytics: TeamAnalytics[]
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FFC658', '#FF7C7C']

export default function ChurnAnalyticsDashboard() {
  const { userProfile } = useAuth()
  const [analyticsData, setAnalyticsData] = useState<ChurnAnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (userProfile?.email) {
      fetchAnalytics()
    }
  }, [userProfile?.email])

  const fetchAnalytics = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Use API endpoint for better caching
      const response = await fetch('/api/churn/analytics', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const result = await response.json()
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch analytics')
      }
      
      setAnalyticsData(result.data)
    } catch (err) {
      console.error('Error fetching churn analytics:', err)
      setError('Failed to load analytics data')
    } finally {
      setLoading(false)
    }
  }

  const formatResponseTime = (hours: number): string => {
    if (hours < 1) {
      return `${Math.round(hours * 60)}m`
    } else if (hours < 24) {
      return `${hours.toFixed(1)}h`
    } else {
      const days = Math.floor(hours / 24)
      const remainingHours = Math.round(hours % 24)
      return `${days}d ${remainingHours}h`
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="text-center text-red-600">
          <AlertCircle className="mx-auto h-12 w-12 mb-2" />
          <p>{error}</p>
          <button 
            onClick={fetchAnalytics}
            className="mt-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  if (!analyticsData) return null

  const { userRole, overallStats, agentAnalytics, churnReasonAnalytics, teamAnalytics } = analyticsData

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
        <TrendingUp className="mr-2 h-5 w-5" />
        Churn Analytics Dashboard
      </h2>

      {/* Overall Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Users className="h-5 w-5 text-blue-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Total Records</p>
              <p className="text-2xl font-bold text-gray-900">{overallStats.totalRecords}</p>
            </div>
          </div>
        </div>

        <div className="bg-green-50 p-4 rounded-lg">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <TrendingUp className="h-5 w-5 text-green-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Response Rate</p>
              <p className="text-2xl font-bold text-gray-900">{overallStats.responseRate.toFixed(1)}%</p>
            </div>
          </div>
        </div>

        <div className="bg-yellow-50 p-4 rounded-lg">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Clock className="h-5 w-5 text-yellow-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Avg Response Time</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatResponseTime(overallStats.avgResponseTime)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-purple-50 p-4 rounded-lg">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <AlertCircle className="h-5 w-5 text-purple-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">With Response</p>
              <p className="text-2xl font-bold text-gray-900">{overallStats.recordsWithResponse}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Churn Reason Analytics - Available for all roles */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Churn Reasons Distribution</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={churnReasonAnalytics.slice(0, 8)} // Show top 8 reasons
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ reason, percent }) => `${reason.substring(0, 15)}... (${(percent * 100).toFixed(0)}%)`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {churnReasonAnalytics.slice(0, 8).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value, name) => [value, 'Count']} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Agent Analytics - Available for Team Lead and Admin */}
        {userRole !== 'Agent' && agentAnalytics.length > 0 && (
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Agent Average Response Time
              {userRole === 'Team Lead' && ' (Your Team)'}
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={agentAnalytics.slice(0, 10)} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="agent" 
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    fontSize={12}
                  />
                  <YAxis 
                    tickFormatter={(value) => formatResponseTime(value)}
                    fontSize={12}
                  />
                  <Tooltip 
                    formatter={(value: number) => [formatResponseTime(value), 'Avg Response Time']}
                    labelFormatter={(label) => `Agent: ${label}`}
                  />
                  <Bar dataKey="avgResponseTime" fill="#0088FE" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Team Analytics - Available for Admin only */}
        {userRole === 'Admin' && teamAnalytics.length > 0 && (
          <div className="lg:col-span-2">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Team Performance Overview</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={teamAnalytics} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="team" 
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    fontSize={12}
                  />
                  <YAxis 
                    yAxisId="left"
                    tickFormatter={(value) => formatResponseTime(value)}
                    fontSize={12}
                  />
                  <YAxis 
                    yAxisId="right" 
                    orientation="right"
                    fontSize={12}
                  />
                  <Tooltip 
                    formatter={(value: number, name: string) => {
                      if (name === 'avgResponseTime') {
                        return [formatResponseTime(value), 'Avg Response Time']
                      }
                      return [value, 'Total Records']
                    }}
                    labelFormatter={(label) => `Team: ${label}`}
                  />
                  <Bar yAxisId="left" dataKey="avgResponseTime" fill="#00C49F" name="avgResponseTime" />
                  <Bar yAxisId="right" dataKey="count" fill="#FFBB28" name="count" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>

      {/* Agent Performance Table - For Team Lead and Admin */}
      {userRole !== 'Agent' && agentAnalytics.length > 0 && (
        <div className="mt-8">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Detailed Agent Performance
            {userRole === 'Team Lead' && ' (Your Team)'}
          </h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Agent
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Records
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Avg Response Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Min Response Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Max Response Time
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {agentAnalytics.map((agent, index) => (
                  <tr key={agent.agent} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {agent.agent}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {agent.totalRecords}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatResponseTime(agent.avgResponseTime)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatResponseTime(agent.minResponseTime)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatResponseTime(agent.maxResponseTime)}
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