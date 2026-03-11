'use client'

import { useState, useEffect, useMemo } from 'react'
import { Download, Filter, Search, Calendar, RefreshCw } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Label, LabelList } from 'recharts'

interface KAMSummary {
  kam_name: string
  kam_email: string
  team_name: string
  total_brands: number
  scheduled_visits: number
  completed_visits: number
  pending_visits: number
  avg_per_month: number
  last_visit_date: string | null
}

interface BrandDetail {
  visit_id: string
  brand_name: string
  kam_name: string
  kam_email: string
  team_name: string
  visit_status: string
  scheduled_date: string
  completed_date: string | null
  approval_status: string
}

interface VisitTabProps {
  userProfile: any
}

export default function VisitTab({ userProfile }: VisitTabProps) {
  const [kamSummary, setKamSummary] = useState<KAMSummary[]>([])
  const [brandDetails, setBrandDetails] = useState<BrandDetail[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedKAM, setSelectedKAM] = useState<string>('all')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [selectedTeam, setSelectedTeam] = useState<string>('all')
  const [topTeamFilter, setTopTeamFilter] = useState<string>('all') // New filter for graphs and KAM summary
  const [scheduledStartDate, setScheduledStartDate] = useState('')
  const [scheduledEndDate, setScheduledEndDate] = useState('')
  const [completedStartDate, setCompletedStartDate] = useState('')
  const [completedEndDate, setCompletedEndDate] = useState('')

  useEffect(() => {
    fetchData()
  }, [selectedKAM, selectedStatus, selectedTeam, scheduledStartDate, scheduledEndDate, completedStartDate, completedEndDate])

  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Build query params for brand details
      const params = new URLSearchParams()
      if (selectedKAM !== 'all') params.append('kam', selectedKAM)
      if (selectedStatus !== 'all') params.append('status', selectedStatus)
      if (selectedTeam !== 'all') params.append('team', selectedTeam)
      if (scheduledStartDate) params.append('scheduledStartDate', scheduledStartDate)
      if (scheduledEndDate) params.append('scheduledEndDate', scheduledEndDate)
      if (completedStartDate) params.append('completedStartDate', completedStartDate)
      if (completedEndDate) params.append('completedEndDate', completedEndDate)
      
      const [kamResponse, brandResponse] = await Promise.all([
        fetch('/api/data/visits/kam-summary'),
        fetch(`/api/data/visits/brand-details?${params.toString()}`)
      ])
      
      const kamResult = await kamResponse.json()
      const brandResult = await brandResponse.json()
      
      if (!kamResult.success) {
        console.error('KAM Summary Error:', kamResult)
        throw new Error(kamResult.error || 'Failed to fetch KAM summary')
      }
      if (!brandResult.success) {
        console.error('Brand Details Error:', brandResult)
        throw new Error(brandResult.error || 'Failed to fetch brand details')
      }
      
      setKamSummary(kamResult.data || [])
      setBrandDetails(brandResult.data || [])
    } catch (err) {
      console.error('Fetch Error:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch data')
    } finally {
      setLoading(false)
    }
  }

  const uniqueTeams = useMemo(() => {
    // Get teams from both brandDetails and kamSummary to ensure all teams are included
    const teamsFromBrands = brandDetails.map(b => b.team_name).filter(Boolean)
    const teamsFromKAMs = kamSummary.map(k => k.team_name).filter(Boolean)
    const allTeams = new Set([...teamsFromBrands, ...teamsFromKAMs])
    return Array.from(allTeams).sort()
  }, [brandDetails, kamSummary])

  // Filter KAM Summary by top team filter
  const filteredKamSummary = useMemo(() => {
    if (topTeamFilter === 'all') return kamSummary
    return kamSummary.filter(kam => kam.team_name === topTeamFilter)
  }, [kamSummary, topTeamFilter])

  // Calculate totals for KAM Visit Summary
  const kamVisitSummaryTotals = useMemo(() => {
    return filteredKamSummary.reduce(
      (acc, kam) => ({
        total_brands: acc.total_brands + kam.total_brands,
        scheduled_visits: acc.scheduled_visits + kam.scheduled_visits,
        completed_visits: acc.completed_visits + kam.completed_visits,
        pending_visits: acc.pending_visits + kam.pending_visits
      }),
      { total_brands: 0, scheduled_visits: 0, completed_visits: 0, pending_visits: 0 }
    )
  }, [filteredKamSummary])

  // Filter brand details for graphs by top team filter
  const graphBrandDetails = useMemo(() => {
    if (topTeamFilter === 'all') return brandDetails
    return brandDetails.filter(brand => brand.team_name === topTeamFilter)
  }, [brandDetails, topTeamFilter])

  const filteredBrandDetails = useMemo(() => {
    return brandDetails.filter(brand => {
      const matchesSearch = searchTerm === '' || 
        brand.brand_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        brand.kam_name.toLowerCase().includes(searchTerm.toLowerCase())
      
      const matchesKAM = selectedKAM === 'all' || brand.kam_email === selectedKAM
      const matchesStatus = selectedStatus === 'all' || brand.visit_status === selectedStatus
      const matchesTeam = selectedTeam === 'all' || brand.team_name === selectedTeam
      
      return matchesSearch && matchesKAM && matchesStatus && matchesTeam
    })
  }, [brandDetails, searchTerm, selectedKAM, selectedStatus, selectedTeam])

  // Prepare monthly visit data for the first chart
  const monthlyVisitData = useMemo(() => {
    const monthCounts: { [key: string]: number } = {}
    
    graphBrandDetails.forEach(visit => {
      if (visit.scheduled_date) {
        const date = new Date(visit.scheduled_date)
        const monthKey = date.toLocaleString('default', { month: 'short', year: 'numeric' })
        monthCounts[monthKey] = (monthCounts[monthKey] || 0) + 1
      }
    })
    
    // Sort by date
    return Object.entries(monthCounts)
      .map(([month, count]) => ({ month, count }))
      .sort((a, b) => {
        const dateA = new Date(a.month)
        const dateB = new Date(b.month)
        return dateA.getTime() - dateB.getTime()
      })
  }, [graphBrandDetails])

  // Prepare current month 5-day interval data for the second chart
  const currentMonthIntervalData = useMemo(() => {
    const currentDate = new Date()
    const currentMonth = currentDate.getMonth()
    const currentYear = currentDate.getFullYear()
    
    // Get days in current month
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate()
    
    // Create intervals: 1-5, 6-10, 11-15, 16-20, 21-25, 26-end
    const intervals = [
      { label: '1-5', start: 1, end: 5 },
      { label: '6-10', start: 6, end: 10 },
      { label: '11-15', start: 11, end: 15 },
      { label: '16-20', start: 16, end: 20 },
      { label: '21-25', start: 21, end: 25 },
      { label: `26-${daysInMonth}`, start: 26, end: daysInMonth }
    ]
    
    const intervalCounts = intervals.map(interval => ({
      interval: interval.label,
      count: 0
    }))
    
    graphBrandDetails.forEach(visit => {
      if (visit.scheduled_date) {
        const date = new Date(visit.scheduled_date)
        if (date.getMonth() === currentMonth && date.getFullYear() === currentYear) {
          const day = date.getDate()
          const intervalIndex = intervals.findIndex(int => day >= int.start && day <= int.end)
          if (intervalIndex !== -1) {
            intervalCounts[intervalIndex].count++
          }
        }
      }
    })
    
    return intervalCounts
  }, [graphBrandDetails])

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

  return (
    <div className="space-y-8">
      {/* Top Team Filter */}
      <div className="bg-gradient-to-r from-primary-50 to-secondary-50 rounded-xl p-4 border border-primary-200">
        <div className="flex items-center gap-4">
          <label className="text-sm font-semibold text-secondary-700">Filter by Team:</label>
          <select
            value={topTeamFilter}
            onChange={(e) => setTopTeamFilter(e.target.value)}
            className="px-4 py-2 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white"
          >
            <option value="all">All Teams</option>
            {uniqueTeams.map(team => (
              <option key={team} value={team}>{team}</option>
            ))}
          </select>
          {topTeamFilter !== 'all' && (
            <button
              onClick={() => setTopTeamFilter('all')}
              className="px-3 py-1 text-sm bg-secondary-200 text-secondary-700 rounded-lg hover:bg-secondary-300 transition-colors"
            >
              Clear Filter
            </button>
          )}
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Visit Trend Chart */}
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <h3 className="text-lg font-bold text-secondary-800 mb-4">📊 Monthly Visit Trend</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={monthlyVisitData}>
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
                name="Visit Count"
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

        {/* Current Month 5-Day Intervals Chart */}
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <h3 className="text-lg font-bold text-secondary-800 mb-4">
            📅 Current Month Distribution ({new Date().toLocaleString('default', { month: 'long', year: 'numeric' })})
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={currentMonthIntervalData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="interval" 
                tick={{ fontSize: 12 }}
              />
              <YAxis />
              <Tooltip />
              <Line 
                type="monotone" 
                dataKey="count" 
                stroke="#10b981" 
                strokeWidth={2}
                dot={{ fill: '#10b981', r: 4 }}
                activeDot={{ r: 6 }}
                name="Visit Count"
              >
                <LabelList 
                  dataKey="count" 
                  position="top" 
                  style={{ fontSize: '12px', fontWeight: 'bold', fill: '#047857' }}
                />
              </Line>
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* KAM Summary Table */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-secondary-800">📊 KAM Visit Summary</h2>
          <div className="flex gap-2">
            <button
              onClick={fetchData}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-secondary-600 text-white rounded-lg hover:bg-secondary-700 transition-colors disabled:opacity-50"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
              Refresh
            </button>
            <button
              onClick={() => exportToCSV(kamSummary, 'kam-visit-summary.csv')}
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              <Download size={16} />
              Export
            </button>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-secondary-50 border-b border-secondary-200">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-secondary-700">KAM Name</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-secondary-700">Team</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-secondary-700">Total Brands</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-secondary-700">Scheduled Visits</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-secondary-700">Visits Done</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-secondary-700">Pending Visits</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-secondary-700">Avg/Month Target</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-secondary-700">Last Visit Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-secondary-100">
                {filteredKamSummary.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-secondary-500">
                      {topTeamFilter !== 'all' 
                        ? `No KAM data available for ${topTeamFilter} team.`
                        : 'No KAM data available. Please check if master data and visits are configured.'}
                    </td>
                  </tr>
                ) : (
                  <>
                    {filteredKamSummary.map((kam, index) => (
                      <tr key={index} className="hover:bg-secondary-50 transition-colors">
                        <td className="px-4 py-3 text-sm text-secondary-900">{kam.kam_name}</td>
                        <td className="px-4 py-3 text-sm text-secondary-600">{kam.team_name || '-'}</td>
                        <td className="px-4 py-3 text-sm text-center text-secondary-700">{kam.total_brands}</td>
                        <td className="px-4 py-3 text-sm text-center text-blue-600 font-medium">{kam.scheduled_visits}</td>
                        <td className="px-4 py-3 text-sm text-center text-green-600 font-medium">{kam.completed_visits}</td>
                        <td className="px-4 py-3 text-sm text-center text-orange-600 font-medium">{kam.pending_visits}</td>
                        <td className="px-4 py-3 text-sm text-center">
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                            kam.avg_per_month > 10 ? 'bg-red-100 text-red-700' :
                            kam.avg_per_month > 5 ? 'bg-yellow-100 text-yellow-700' :
                            'bg-green-100 text-green-700'
                          }`}>
                            {kam.avg_per_month} visits/month
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-center text-secondary-600">
                          {kam.last_visit_date ? new Date(kam.last_visit_date).toLocaleDateString() : '-'}
                        </td>
                      </tr>
                    ))}
                    {/* Totals Row */}
                    <tr className="bg-blue-100 border-t-2 border-blue-300 font-bold">
                      <td className="px-4 py-3 text-sm font-bold text-secondary-900">Total</td>
                      <td className="px-4 py-3 text-sm text-secondary-600">-</td>
                      <td className="px-4 py-3 text-sm text-center text-secondary-700 font-bold">{kamVisitSummaryTotals.total_brands}</td>
                      <td className="px-4 py-3 text-sm text-center text-blue-700 font-bold">{kamVisitSummaryTotals.scheduled_visits}</td>
                      <td className="px-4 py-3 text-sm text-center text-green-700 font-bold">{kamVisitSummaryTotals.completed_visits}</td>
                      <td className="px-4 py-3 text-sm text-center text-orange-700 font-bold">{kamVisitSummaryTotals.pending_visits}</td>
                      <td className="px-4 py-3 text-sm text-center">-</td>
                      <td className="px-4 py-3 text-sm text-center text-secondary-600">-</td>
                    </tr>
                  </>
                )}
              </tbody>
            </table>
          </div>
        </div>
        
        <div className="mt-4 text-sm text-secondary-600">
          <p>📅 Target Period: March 2026 - February 2027 (2 visits per brand)</p>
        </div>
      </div>

      {/* Brand Details Table */}
      <div className="bg-white rounded-xl p-6 border border-gray-200">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-secondary-800">🏢 Brand Visit Details</h2>
          <button
            onClick={() => exportToCSV(filteredBrandDetails, 'brand-visit-details.csv')}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            <Download size={16} />
            Export
          </button>
        </div>

        {/* Filters */}
        <div className="space-y-4 mb-6">
          {/* First Row: Search, Team, KAM, Status */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-secondary-400" size={18} />
              <input
                type="text"
                placeholder="Search brand or KAM..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            <select
              value={selectedTeam}
              onChange={(e) => setSelectedTeam(e.target.value)}
              className="px-4 py-2 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="all">All Teams</option>
              {uniqueTeams.map(team => (
                <option key={team} value={team}>{team}</option>
              ))}
            </select>

            <select
              value={selectedKAM}
              onChange={(e) => setSelectedKAM(e.target.value)}
              className="px-4 py-2 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="all">All KAMs</option>
              {kamSummary.map(kam => (
                <option key={kam.kam_email} value={kam.kam_email}>{kam.kam_name}</option>
              ))}
            </select>

            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-4 py-2 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="all">All Statuses</option>
              <option value="Scheduled">Scheduled</option>
              <option value="Completed">Completed</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>

          {/* Second Row: Scheduled Date Range */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-2">📅 Scheduled Date Range</label>
              <div className="grid grid-cols-2 gap-4">
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-secondary-400" size={18} />
                  <input
                    type="date"
                    placeholder="Start Date"
                    value={scheduledStartDate}
                    onChange={(e) => setScheduledStartDate(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-secondary-400" size={18} />
                  <input
                    type="date"
                    placeholder="End Date"
                    value={scheduledEndDate}
                    onChange={(e) => setScheduledEndDate(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-2">✅ Completed Date Range</label>
              <div className="grid grid-cols-2 gap-4">
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-secondary-400" size={18} />
                  <input
                    type="date"
                    placeholder="Start Date"
                    value={completedStartDate}
                    onChange={(e) => setCompletedStartDate(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-secondary-400" size={18} />
                  <input
                    type="date"
                    placeholder="End Date"
                    value={completedEndDate}
                    onChange={(e) => setCompletedEndDate(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mb-4">
          <button
            onClick={() => {
              setSearchTerm('')
              setSelectedKAM('all')
              setSelectedStatus('all')
              setSelectedTeam('all')
              setScheduledStartDate('')
              setScheduledEndDate('')
              setCompletedStartDate('')
              setCompletedEndDate('')
            }}
            className="px-4 py-2 bg-secondary-100 text-secondary-700 rounded-lg hover:bg-secondary-200 transition-colors"
          >
            Clear Filters
          </button>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-secondary-50 border-b border-secondary-200">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-secondary-700">Brand Name</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-secondary-700">KAM Name</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-secondary-700">Team</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-secondary-700">Visit Status</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-secondary-700">Scheduled Date</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-secondary-700">Completed Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-secondary-100">
                {filteredBrandDetails.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-secondary-500">
                      {brandDetails.length === 0 
                        ? 'No visit records available. Please check if visits are configured.'
                        : 'No visits match the selected filters.'}
                    </td>
                  </tr>
                ) : (
                  filteredBrandDetails.map((visit, index) => (
                    <tr key={index} className="hover:bg-secondary-50 transition-colors">
                      <td className="px-4 py-3 text-sm font-medium text-secondary-900">{visit.brand_name}</td>
                      <td className="px-4 py-3 text-sm text-secondary-700">{visit.kam_name}</td>
                      <td className="px-4 py-3 text-sm text-secondary-600">{visit.team_name || '-'}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          visit.visit_status === 'Completed' ? 'bg-green-100 text-green-700' :
                          visit.visit_status === 'Scheduled' ? 'bg-blue-100 text-blue-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {visit.visit_status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-center text-secondary-600">
                        {visit.scheduled_date ? new Date(visit.scheduled_date).toLocaleDateString() : '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-center text-secondary-600">
                        {visit.completed_date ? new Date(visit.completed_date).toLocaleDateString() : '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-4 text-sm text-secondary-600">
          Showing {filteredBrandDetails.length} of {brandDetails.length} visit records
        </div>
      </div>
    </div>
  )
}
