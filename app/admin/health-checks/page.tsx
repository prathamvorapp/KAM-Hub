'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface AgentStats {
  kam_email: string
  kam_name: string
  total: number
  totalBrands: number
  pendingAssessments: number
  byHealthStatus: Record<string, number>
  byBrandNature: Record<string, number>
  criticalBrands: number
  healthyBrands: number
  notConnected: number
  connectivityRate: number
}

interface HealthCheckStats {
  total: number
  byHealthStatus: Record<string, number>
  byBrandNature: Record<string, number>
  byZone: Record<string, number>
  byAgent: AgentStats[]
}

export default function AdminHealthChecksPage() {
  const [stats, setStats] = useState<HealthCheckStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })

  useEffect(() => {
    fetchStats()
  }, [selectedMonth])

  const fetchStats = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch(`/api/data/health-checks/agent-statistics?month=${selectedMonth}`)
      const result = await response.json()
      
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to fetch statistics')
      }
      
      setStats(result.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      console.error('Error fetching stats:', err)
    } finally {
      setLoading(false)
    }
  }

  const getHealthStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'Green': 'bg-green-100 text-green-800',
      'Amber': 'bg-yellow-100 text-yellow-800',
      'Orange': 'bg-orange-100 text-orange-800',
      'Red': 'bg-red-100 text-red-800',
      'Not Connected': 'bg-gray-100 text-gray-800',
      'Dead': 'bg-black text-white'
    }
    return colors[status] || 'bg-gray-100 text-gray-800'
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-xl p-8 border border-gray-200 shadow-lg">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-secondary-800">📊 Health Check Statistics</h1>
              <p className="text-secondary-600 mt-2">Agent-wise health check performance</p>
            </div>
            <Link
              href="/admin"
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-secondary-800 rounded-lg transition-colors"
            >
              ← Back to Admin
            </Link>
          </div>

          {/* Month Selector */}
          <div className="mb-6">
            <label className="block text-secondary-700 text-sm mb-2">Select Month</label>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg text-secondary-800 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-200"
            />
          </div>

          {loading && (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
              <p className="mt-4 text-secondary-600">Loading statistics...</p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-red-800">❌ {error}</p>
            </div>
          )}

          {!loading && !error && stats && (
            <>
              {/* Overall Summary */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                  <p className="text-blue-600 text-sm font-medium">Total Assessments</p>
                  <p className="text-3xl font-bold text-blue-800 mt-2">{stats.total}</p>
                </div>
                <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                  <p className="text-green-600 text-sm font-medium">Healthy Brands</p>
                  <p className="text-3xl font-bold text-green-800 mt-2">
                    {(stats.byHealthStatus['Green'] || 0) + (stats.byHealthStatus['Amber'] || 0)}
                  </p>
                </div>
                <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
                  <p className="text-orange-600 text-sm font-medium">Critical Brands</p>
                  <p className="text-3xl font-bold text-orange-800 mt-2">
                    {(stats.byHealthStatus['Orange'] || 0) + (stats.byHealthStatus['Red'] || 0)}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <p className="text-gray-600 text-sm font-medium">Not Connected</p>
                  <p className="text-3xl font-bold text-gray-800 mt-2">
                    {stats.byHealthStatus['Not Connected'] || 0}
                  </p>
                </div>
              </div>

              {/* Agent-wise Statistics Table */}
              <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                <h2 className="text-xl font-semibold text-secondary-800 mb-4">Agent-wise Performance</h2>
                
                {stats.byAgent.length === 0 ? (
                  <p className="text-secondary-600 text-center py-8">No agent data available for this month</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-300">
                          <th className="text-left py-3 px-4 text-secondary-700 font-semibold">Agent</th>
                          <th className="text-center py-3 px-4 text-secondary-700 font-semibold">Total Brands</th>
                          <th className="text-center py-3 px-4 text-secondary-700 font-semibold">Assessed</th>
                          <th className="text-center py-3 px-4 text-secondary-700 font-semibold">Pending</th>
                          <th className="text-center py-3 px-4 text-secondary-700 font-semibold">Connectivity</th>
                          <th className="text-center py-3 px-4 text-secondary-700 font-semibold">Healthy</th>
                          <th className="text-center py-3 px-4 text-secondary-700 font-semibold">Critical</th>
                          <th className="text-left py-3 px-4 text-secondary-700 font-semibold">Status Breakdown</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stats.byAgent.map((agent, index) => (
                          <tr key={agent.kam_email} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                            <td className="py-3 px-4">
                              <div>
                                <p className="font-medium text-secondary-800">{agent.kam_name}</p>
                                <p className="text-sm text-secondary-500">{agent.kam_email}</p>
                              </div>
                            </td>
                            <td className="text-center py-3 px-4 text-secondary-800 font-medium">
                              {agent.totalBrands}
                            </td>
                            <td className="text-center py-3 px-4 text-secondary-800 font-medium">
                              {agent.total}
                            </td>
                            <td className="text-center py-3 px-4">
                              <span className={`px-2 py-1 rounded-full text-sm font-medium ${
                                agent.pendingAssessments > 0 ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'
                              }`}>
                                {agent.pendingAssessments}
                              </span>
                            </td>
                            <td className="text-center py-3 px-4">
                              <span className={`px-2 py-1 rounded-full text-sm font-medium ${
                                agent.connectivityRate >= 80 ? 'bg-green-100 text-green-800' :
                                agent.connectivityRate >= 50 ? 'bg-yellow-100 text-yellow-800' :
                                'bg-red-100 text-red-800'
                              }`}>
                                {agent.connectivityRate}%
                              </span>
                            </td>
                            <td className="text-center py-3 px-4 text-green-700 font-medium">
                              {agent.healthyBrands}
                            </td>
                            <td className="text-center py-3 px-4 text-red-700 font-medium">
                              {agent.criticalBrands}
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex flex-wrap gap-1">
                                {Object.entries(agent.byHealthStatus).map(([status, count]) => (
                                  <span
                                    key={status}
                                    className={`px-2 py-1 rounded text-xs font-medium ${getHealthStatusColor(status)}`}
                                  >
                                    {status}: {count}
                                  </span>
                                ))}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Brand Nature Distribution */}
              <div className="mt-8 bg-gray-50 rounded-lg p-6 border border-gray-200">
                <h2 className="text-xl font-semibold text-secondary-800 mb-4">Brand Nature Distribution</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {Object.entries(stats.byBrandNature).map(([nature, count]) => (
                    <div key={nature} className="bg-white rounded-lg p-4 border border-gray-200">
                      <p className="text-secondary-600 text-sm">{nature}</p>
                      <p className="text-2xl font-bold text-secondary-800 mt-1">{count}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Zone Distribution */}
              <div className="mt-8 bg-gray-50 rounded-lg p-6 border border-gray-200">
                <h2 className="text-xl font-semibold text-secondary-800 mb-4">Zone Distribution</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {Object.entries(stats.byZone).map(([zone, count]) => (
                    <div key={zone} className="bg-white rounded-lg p-4 border border-gray-200">
                      <p className="text-secondary-600 text-sm">{zone}</p>
                      <p className="text-2xl font-bold text-secondary-800 mt-1">{count}</p>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
