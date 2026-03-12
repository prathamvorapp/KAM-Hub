'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { Download } from 'lucide-react'
import { PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LabelList } from 'recharts'

interface DemoAnalytics {
  monthlyTrend: Array<{ month: string; count: number }>
  currentMonthDistribution: {
    overall: number
    byProduct: Record<string, number>
  }
  conversionByProduct: Record<string, { converted: number; notConverted: number }>
  applicabilityByProduct: Record<string, { applicable: number; notApplicable: number }>
  kamSummary: Array<{
    kamName: string
    kamEmail: string
    teamName: string | null
    totalBrands: number
    initiated: number
    yetToInitiate: number
    scheduledDemo: number
    demoDone: number
    pendingDemo: number
    converted: number
    notConverted: number
    lastDemoDate: string | null
  }>
  kamProductSummary: Array<{
    kamName: string
    kamEmail: string
    products: Record<string, {
      notApplicable: number
      demoPending: number
      demoDone: number
      converted: number
      notConverted: number
    }>
  }>
  productSummary: Array<{
    productName: string
    notApplicable: number
    demoDone: number
    converted: number
    notConverted: number
  }>
}

const COLORS = ['#10b981', '#ef4444', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316']

export default function DemoGiveTab() {
  const [analytics, setAnalytics] = useState<DemoAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [startDateFilter, setStartDateFilter] = useState('')
  const [endDateFilter, setEndDateFilter] = useState('')
  const [kamFilter, setKamFilter] = useState<string[]>([])
  const [teamFilter, setTeamFilter] = useState<string[]>([])

  const uniqueKAMs = useMemo(() => {
    if (!analytics) return []
    // If team filter is active, only show KAMs from selected teams
    if (teamFilter.length > 0) {
      const kams = new Set(
        analytics.kamSummary
          .filter(k => teamFilter.includes(k.teamName || ''))
          .map(k => k.kamName)
      )
      return Array.from(kams).sort()
    }
    // Otherwise show all KAMs
    const kams = new Set(analytics.kamSummary.map(k => k.kamName))
    return Array.from(kams).sort()
  }, [analytics, teamFilter])

  const uniqueTeams = useMemo(() => {
    if (!analytics) return []
    const teams = new Set(analytics.kamSummary.map(k => k.teamName).filter((t): t is string => Boolean(t)))
    return Array.from(teams).sort()
  }, [analytics])

  const filteredKamSummary = useMemo(() => {
    if (!analytics) return []
    return analytics.kamSummary
  }, [analytics])

  // Define products list
  const products = useMemo(() => {
    if (!analytics) return []
    return Object.keys(analytics.conversionByProduct).length > 0 
      ? Object.keys(analytics.conversionByProduct)
      : Object.keys(analytics.applicabilityByProduct)
  }, [analytics])

  // Calculate totals for KAM Demo Summary
  const kamDemoSummaryTotals = useMemo(() => {
    if (!analytics) return { totalBrands: 0, initiated: 0, yetToInitiate: 0, scheduledDemo: 0, demoDone: 0, pendingDemo: 0, converted: 0, notConverted: 0 }
    return analytics.kamSummary.reduce(
      (acc, kam) => ({
        totalBrands: acc.totalBrands + kam.totalBrands,
        initiated: acc.initiated + kam.initiated,
        yetToInitiate: acc.yetToInitiate + kam.yetToInitiate,
        scheduledDemo: acc.scheduledDemo + kam.scheduledDemo,
        demoDone: acc.demoDone + kam.demoDone,
        pendingDemo: acc.pendingDemo + kam.pendingDemo,
        converted: acc.converted + kam.converted,
        notConverted: acc.notConverted + kam.notConverted
      }),
      { totalBrands: 0, initiated: 0, yetToInitiate: 0, scheduledDemo: 0, demoDone: 0, pendingDemo: 0, converted: 0, notConverted: 0 }
    )
  }, [analytics])

  // Calculate totals for KAM Product Summary
  const kamProductSummaryTotals = useMemo(() => {
    if (!analytics) return {}
    const totals: Record<string, { notApplicable: number; demoPending: number; demoDone: number; converted: number; notConverted: number }> = {}
    
    products.forEach(product => {
      totals[product] = { notApplicable: 0, demoPending: 0, demoDone: 0, converted: 0, notConverted: 0 }
    })
    
    analytics.kamProductSummary.forEach(kam => {
      products.forEach(product => {
        const productData = kam.products[product] || { notApplicable: 0, demoPending: 0, demoDone: 0, converted: 0, notConverted: 0 }
        totals[product].notApplicable += productData.notApplicable
        totals[product].demoPending += productData.demoPending
        totals[product].demoDone += productData.demoDone
        totals[product].converted += productData.converted
        totals[product].notConverted += productData.notConverted
      })
    })
    
    return totals
  }, [analytics, products])

  // Calculate totals for Product Summary
  const productSummaryTotals = useMemo(() => {
    if (!analytics) return { notApplicable: 0, demoDone: 0, converted: 0, notConverted: 0 }
    return analytics.productSummary.reduce(
      (acc, product) => ({
        notApplicable: acc.notApplicable + product.notApplicable,
        demoDone: acc.demoDone + product.demoDone,
        converted: acc.converted + product.converted,
        notConverted: acc.notConverted + product.notConverted
      }),
      { notApplicable: 0, demoDone: 0, converted: 0, notConverted: 0 }
    )
  }, [analytics])

  useEffect(() => {
    fetchAnalytics()
  }, [startDateFilter, endDateFilter, kamFilter, teamFilter])

  // Clear KAM filter when team filter changes
  useEffect(() => {
    setKamFilter([])
  }, [teamFilter])

  const fetchAnalytics = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Build query params for filtering
      const params = new URLSearchParams()
      if (startDateFilter) params.append('startDate', startDateFilter)
      if (endDateFilter) params.append('endDate', endDateFilter)
      if (kamFilter.length > 0) params.append('kam', kamFilter.join(','))
      if (teamFilter.length > 0) params.append('team', teamFilter.join(','))
      
      const url = `/api/data/demos/crm-analytics${params.toString() ? `?${params.toString()}` : ''}`
      const response = await fetch(url)
      const result = await response.json()
      
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to fetch demo analytics')
      }
      
      setAnalytics(result.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const exportToCSV = (data: any[], filename: string) => {
    if (data.length === 0) return
    
    const headers = Object.keys(data[0])
    const csvContent = [
      headers.join(','),
      ...data.map(row => headers.map(header => {
        const value = row[header]
        return typeof value === 'string' && value.includes(',') ? `"${value}"` : value
      }).join(','))
    ].join('\n')
    
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    window.URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">Error: {error}</p>
      </div>
    )
  }

  if (!analytics) {
    return (
      <div className="text-center py-12 text-secondary-600">
        No demo data available
      </div>
    )
  }

  const clearFilters = () => {
    setStartDateFilter('')
    setEndDateFilter('')
    setKamFilter([])
    setTeamFilter([])
  }

  return (
    <div className="space-y-8">
      {/* Filters Section */}
      <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-secondary-800">Filters</h2>
          <button onClick={clearFilters} className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-secondary-800 rounded-lg transition-colors text-sm">
            Clear Filters
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-secondary-700 text-sm mb-2">Start Date</label>
            <input type="date" value={startDateFilter} onChange={(e) => setStartDateFilter(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-secondary-800 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-200" />
          </div>
          <div>
            <label className="block text-secondary-700 text-sm mb-2">End Date</label>
            <input type="date" value={endDateFilter} onChange={(e) => setEndDateFilter(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-secondary-800 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-200" />
          </div>
          <div>
            <label className="block text-secondary-700 text-sm mb-2">KAM Name</label>
            <select
              value={kamFilter.length > 0 ? kamFilter[0] : ''}
              onChange={(e) => setKamFilter(e.target.value ? [e.target.value] : [])}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-secondary-800 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-200"
            >
              <option value="">Select KAM</option>
              {uniqueKAMs.map(kam => (
                <option key={kam} value={kam}>{kam}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-secondary-700 text-sm mb-2">Team</label>
            <select
              value={teamFilter.length > 0 ? teamFilter[0] : ''}
              onChange={(e) => setTeamFilter(e.target.value ? [e.target.value] : [])}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-secondary-800 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-200"
            >
              <option value="">All Teams</option>
              {uniqueTeams.map(team => (
                <option key={team} value={team}>{team}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Legend/Info Section */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="text-sm font-semibold text-blue-900 mb-2">📖 Metrics Guide</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-xs text-blue-800">
          <div><span className="font-semibold">Total Brands:</span> All brands assigned to KAM in master data</div>
          <div><span className="font-semibold">Initiated:</span> Brands with demo records created</div>
          <div><span className="font-semibold">Yet to Initiate:</span> Brands without any demo records</div>
          <div><span className="font-semibold">Not Applicable:</span> Product not suitable for the brand</div>
          <div><span className="font-semibold">Demo Pending:</span> Demo not yet scheduled or completed</div>
          <div><span className="font-semibold">Demo Done:</span> Demo completed (regardless of conversion)</div>
          <div><span className="font-semibold">Converted:</span> Brand adopted the product after demo</div>
          <div><span className="font-semibold">Not Converted:</span> Brand did not adopt after demo</div>
          <div><span className="font-semibold">Scheduled Demo:</span> Demo date is set but not completed</div>
        </div>
      </div>

      {/* Monthly Demo Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <h3 className="text-lg font-bold text-secondary-800 mb-4">📈 Monthly Demo Trend (Completed)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={analytics.monthlyTrend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="month" 
                tick={{ fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis />
              <Tooltip />
              <Line 
                type="monotone" 
                dataKey="count" 
                stroke="#3b82f6" 
                strokeWidth={2}
                dot={{ fill: '#3b82f6', r: 4 }}
                activeDot={{ r: 6 }}
                name="Completed Demos"
              >
                <LabelList 
                  dataKey="count" 
                  position="top" 
                  style={{ fontSize: '12px', fontWeight: 'bold', fill: '#1e40af' }}
                />
              </Line>
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Current Month Distribution */}
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <h3 className="text-lg font-bold text-secondary-800 mb-4">📊 Current Month Distribution</h3>
          <div className="mb-4">
            <p className="text-lg text-secondary-700">
              Overall Completed: <span className="font-bold text-primary-600">{analytics.currentMonthDistribution.overall}</span>
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(analytics.currentMonthDistribution.byProduct).map(([product, count]) => (
              <div key={product} className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
                <p className="text-xs text-secondary-600 mb-1">{product}</p>
                <p className="text-2xl font-bold text-primary-600">{count as number}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Conversion Charts by Product */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-xl font-semibold text-secondary-800 mb-4">🎯 Conversion Status by Product</h3>
        {products.length === 0 ? (
          <p className="text-center text-secondary-600 py-8">No product data available</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((product, index) => {
              const convData = analytics.conversionByProduct[product] || { converted: 0, notConverted: 0 };
              const data = [
                { name: 'Converted', value: convData.converted },
                { name: 'Not Converted', value: convData.notConverted }
              ];
              const total = convData.converted + convData.notConverted;
              
              return (
                <div key={product} className="border border-gray-200 rounded-lg p-4">
                  <h4 className="text-center font-semibold text-secondary-700 mb-2">{product}</h4>
                  {total === 0 ? (
                    <p className="text-center text-secondary-500 py-8 text-sm">No completed demos</p>
                  ) : (
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie
                          data={data}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, value }) => `${name}: ${value}`}
                          outerRadius={60}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {data.map((entry, i) => (
                            <Cell key={`cell-${i}`} fill={i === 0 ? '#10b981' : '#ef4444'} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Applicability Charts by Product */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-xl font-semibold text-secondary-800 mb-4">✅ Applicability Status by Product</h3>
        {products.length === 0 ? (
          <p className="text-center text-secondary-600 py-8">No product data available</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((product, index) => {
              const appData = analytics.applicabilityByProduct[product] || { applicable: 0, notApplicable: 0 };
              const data = [
                { name: 'Applicable', value: appData.applicable },
                { name: 'Not Applicable', value: appData.notApplicable }
              ];
              const total = appData.applicable + appData.notApplicable;
              
              return (
                <div key={product} className="border border-gray-200 rounded-lg p-4">
                  <h4 className="text-center font-semibold text-secondary-700 mb-2">{product}</h4>
                  {total === 0 ? (
                    <p className="text-center text-secondary-500 py-8 text-sm">No applicability data</p>
                  ) : (
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie
                          data={data}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, value }) => `${name}: ${value}`}
                          outerRadius={60}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {data.map((entry, i) => (
                            <Cell key={`cell-${i}`} fill={i === 0 ? '#3b82f6' : '#f59e0b'} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* KAM Demo Summary Table */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-secondary-800">👤 KAM Demo Summary</h3>
          <button
            onClick={() => exportToCSV(analytics.kamSummary, 'kam-demo-summary.csv')}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            <Download size={16} />
            Export CSV
          </button>
        </div>
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-secondary-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-secondary-700 uppercase tracking-wider">KAM Name</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-secondary-700 uppercase tracking-wider">Total Brands</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-secondary-700 uppercase tracking-wider">Initiated</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-secondary-700 uppercase tracking-wider">Yet to Initiate</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-secondary-700 uppercase tracking-wider">Scheduled Demo</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-secondary-700 uppercase tracking-wider">Demo Done</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-secondary-700 uppercase tracking-wider">Pending Demo</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-secondary-700 uppercase tracking-wider">Converted</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-secondary-700 uppercase tracking-wider">Not Converted</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-secondary-700 uppercase tracking-wider">Last Demo Date</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-secondary-100">
                {filteredKamSummary.map((kam, index) => (
                  <tr key={index} className="hover:bg-secondary-50 transition-colors">
                    <td className="px-4 py-3 text-sm text-secondary-900">{kam.kamName}</td>
                    <td className="px-4 py-3 text-sm text-center text-secondary-700 font-medium">{kam.totalBrands}</td>
                    <td className="px-4 py-3 text-sm text-center text-green-600 font-medium">{kam.initiated}</td>
                    <td className="px-4 py-3 text-sm text-center text-orange-600 font-medium">{kam.yetToInitiate}</td>
                    <td className="px-4 py-3 text-sm text-center text-blue-600 font-medium">{kam.scheduledDemo}</td>
                    <td className="px-4 py-3 text-sm text-center text-green-600 font-medium">{kam.demoDone}</td>
                    <td className="px-4 py-3 text-sm text-center text-orange-600 font-medium">{kam.pendingDemo}</td>
                    <td className="px-4 py-3 text-sm text-center text-green-600 font-semibold">{kam.converted}</td>
                    <td className="px-4 py-3 text-sm text-center text-red-600 font-semibold">{kam.notConverted}</td>
                    <td className="px-4 py-3 text-sm text-center text-secondary-600">
                      {kam.lastDemoDate ? new Date(kam.lastDemoDate).toLocaleDateString() : 'N/A'}
                    </td>
                  </tr>
                ))}
                {/* Totals Row */}
                <tr className="bg-blue-100 border-t-2 border-blue-300 font-bold">
                  <td className="px-4 py-3 text-sm font-bold text-secondary-900">Total</td>
                  <td className="px-4 py-3 text-sm text-center text-secondary-700 font-bold">{kamDemoSummaryTotals.totalBrands}</td>
                  <td className="px-4 py-3 text-sm text-center text-green-700 font-bold">{kamDemoSummaryTotals.initiated}</td>
                  <td className="px-4 py-3 text-sm text-center text-orange-700 font-bold">{kamDemoSummaryTotals.yetToInitiate}</td>
                  <td className="px-4 py-3 text-sm text-center text-blue-700 font-bold">{kamDemoSummaryTotals.scheduledDemo}</td>
                  <td className="px-4 py-3 text-sm text-center text-green-700 font-bold">{kamDemoSummaryTotals.demoDone}</td>
                  <td className="px-4 py-3 text-sm text-center text-orange-700 font-bold">{kamDemoSummaryTotals.pendingDemo}</td>
                  <td className="px-4 py-3 text-sm text-center text-green-700 font-bold">{kamDemoSummaryTotals.converted}</td>
                  <td className="px-4 py-3 text-sm text-center text-red-700 font-bold">{kamDemoSummaryTotals.notConverted}</td>
                  <td className="px-4 py-3 text-sm text-center text-secondary-600">-</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* KAM Product Summary Table */}
      <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-6 border border-purple-200">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-secondary-800">👤📦 KAM - Product Summary</h3>
          <button
            onClick={() => {
              // Flatten the data for CSV export
              const flatData = analytics.kamProductSummary.flatMap(kam => 
                Object.entries(kam.products).map(([product, data]: [string, any]) => ({
                  kamName: kam.kamName,
                  kamEmail: kam.kamEmail,
                  product,
                  notApplicable: data.notApplicable,
                  demoPending: data.demoPending,
                  demoDone: data.demoDone,
                  converted: data.converted,
                  notConverted: data.notConverted
                }))
              )
              exportToCSV(flatData, 'kam-product-summary.csv')
            }}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            <Download size={16} />
            Export CSV
          </button>
        </div>
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-secondary-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-secondary-700 uppercase tracking-wider">KAM Name</th>
                  {products.map(product => (
                    <th key={product} colSpan={5} className="px-4 py-3 text-center text-xs font-semibold text-secondary-700 uppercase tracking-wider border-l border-gray-300">
                      {product}
                    </th>
                  ))}
                </tr>
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-secondary-700 uppercase tracking-wider"></th>
                  {products.map(product => (
                    <React.Fragment key={product}>
                      <th className="px-2 py-2 text-center text-xs font-medium text-secondary-600 uppercase tracking-wider border-l border-gray-300" title="Not Applicable">Not Appl</th>
                      <th className="px-2 py-2 text-center text-xs font-medium text-secondary-600 uppercase tracking-wider" title="Demo Pending">Pending</th>
                      <th className="px-2 py-2 text-center text-xs font-medium text-secondary-600 uppercase tracking-wider" title="Demo Done">Done</th>
                      <th className="px-2 py-2 text-center text-xs font-medium text-secondary-600 uppercase tracking-wider" title="Converted">Conv</th>
                      <th className="px-2 py-2 text-center text-xs font-medium text-secondary-600 uppercase tracking-wider" title="Not Converted">Not Conv</th>
                    </React.Fragment>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-secondary-100">
                {analytics.kamProductSummary.map((kam, index) => (
                  <tr key={index} className="hover:bg-secondary-50 transition-colors">
                    <td className="px-4 py-3 text-sm text-secondary-900 font-medium">{kam.kamName}</td>
                    {products.map(product => {
                      const productData = kam.products[product] || {
                        notApplicable: 0,
                        demoPending: 0,
                        demoDone: 0,
                        converted: 0,
                        notConverted: 0
                      }
                      return (
                        <React.Fragment key={product}>
                          <td className="px-2 py-3 text-sm text-center text-secondary-900 border-l border-gray-300">{productData.notApplicable}</td>
                          <td className="px-2 py-3 text-sm text-center text-orange-600 font-medium">{productData.demoPending}</td>
                          <td className="px-2 py-3 text-sm text-center text-blue-600 font-medium">{productData.demoDone}</td>
                          <td className="px-2 py-3 text-sm text-center text-green-600 font-semibold">{productData.converted}</td>
                          <td className="px-2 py-3 text-sm text-center text-red-600 font-semibold">{productData.notConverted}</td>
                        </React.Fragment>
                      )
                    })}
                  </tr>
                ))}
                {/* Totals Row */}
                <tr className="bg-purple-100 border-t-2 border-purple-300 font-bold">
                  <td className="px-4 py-3 text-sm font-bold text-secondary-900">Total</td>
                  {products.map(product => {
                    const totals = kamProductSummaryTotals[product] || { notApplicable: 0, demoPending: 0, demoDone: 0, converted: 0, notConverted: 0 }
                    return (
                      <React.Fragment key={product}>
                        <td className="px-2 py-3 text-sm text-center text-secondary-900 font-bold border-l border-gray-300">{totals.notApplicable}</td>
                        <td className="px-2 py-3 text-sm text-center text-orange-700 font-bold">{totals.demoPending}</td>
                        <td className="px-2 py-3 text-sm text-center text-blue-700 font-bold">{totals.demoDone}</td>
                        <td className="px-2 py-3 text-sm text-center text-green-700 font-bold">{totals.converted}</td>
                        <td className="px-2 py-3 text-sm text-center text-red-700 font-bold">{totals.notConverted}</td>
                      </React.Fragment>
                    )
                  })}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Product Summary Table */}
      <div className="bg-gradient-to-br from-green-50 to-teal-50 rounded-xl p-6 border border-green-200">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-secondary-800">📦 Product Summary</h3>
          <button
            onClick={() => exportToCSV(analytics.productSummary, 'product-summary.csv')}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            <Download size={16} />
            Export CSV
          </button>
        </div>
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-secondary-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-secondary-700 uppercase tracking-wider">Product Name</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-secondary-700 uppercase tracking-wider">Not Applicable</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-secondary-700 uppercase tracking-wider">Demo Done</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-secondary-700 uppercase tracking-wider">Converted</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-secondary-700 uppercase tracking-wider">Not Converted</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-secondary-100">
                {analytics.productSummary.map((product, index) => (
                  <tr key={index} className="hover:bg-secondary-50 transition-colors">
                    <td className="px-4 py-3 text-sm font-medium text-secondary-900">{product.productName}</td>
                    <td className="px-4 py-3 text-sm text-center text-secondary-700">{product.notApplicable}</td>
                    <td className="px-4 py-3 text-sm text-center text-blue-600 font-medium">{product.demoDone}</td>
                    <td className="px-4 py-3 text-sm text-center text-green-600 font-semibold">{product.converted}</td>
                    <td className="px-4 py-3 text-sm text-center text-red-600 font-semibold">{product.notConverted}</td>
                  </tr>
                ))}
                {/* Totals Row */}
                <tr className="bg-green-100 border-t-2 border-green-300 font-bold">
                  <td className="px-4 py-3 text-sm font-bold text-secondary-900">Total</td>
                  <td className="px-4 py-3 text-sm text-center text-secondary-700 font-bold">{productSummaryTotals.notApplicable}</td>
                  <td className="px-4 py-3 text-sm text-center text-blue-700 font-bold">{productSummaryTotals.demoDone}</td>
                  <td className="px-4 py-3 text-sm text-center text-green-700 font-bold">{productSummaryTotals.converted}</td>
                  <td className="px-4 py-3 text-sm text-center text-red-700 font-bold">{productSummaryTotals.notConverted}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
