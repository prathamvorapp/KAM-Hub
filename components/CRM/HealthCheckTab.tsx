'use client'

import { useState, useMemo, useEffect } from 'react'
import SearchableMultiSelect from './SearchableMultiSelect'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList } from 'recharts'

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

interface Props {
  records: HealthCheckRecord[]
  loading: boolean
  error: string | null
}

interface KAMSummary {
  kam_name: string
  kam_email: string
  total_brands: number
  this_month_done: number
  this_month_pending: number
  last_month_done: number
  last_month_pending: number
  last_health_check_date: string | null
}

const COLORS = ['#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316']

export default function HealthCheckTab({ records, loading, error }: Props) {
  const [startDateFilter, setStartDateFilter] = useState('')
  const [endDateFilter, setEndDateFilter] = useState('')
  const [kamFilter, setKamFilter] = useState<string[]>([])
  const [zoneFilter, setZoneFilter] = useState<string[]>([])
  const [healthStatusFilter, setHealthStatusFilter] = useState<string[]>([])
  const [natureFilter, setNatureFilter] = useState<string[]>([])
  const [teamFilter, setTeamFilter] = useState<string[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const recordsPerPage = 20
  
  // KAM Summary state
  const [kamSummaryData, setKamSummaryData] = useState<KAMSummary[]>([])
  const [kamSummaryLoading, setKamSummaryLoading] = useState(true)

  const uniqueKAMs = useMemo(() => {
    // If team filter is active, only show KAMs from selected teams
    if (teamFilter.length > 0) {
      const kams = new Set(
        records
          .filter(r => teamFilter.includes(r.team_name || ''))
          .map(r => r.kam_name)
      )
      return Array.from(kams).sort()
    }
    // Otherwise show all KAMs
    const kams = new Set(records.map(r => r.kam_name))
    return Array.from(kams).sort()
  }, [records, teamFilter])

  const uniqueZones = useMemo(() => {
    const zones = new Set(records.map(r => r.zone))
    return Array.from(zones).sort()
  }, [records])

  const uniqueHealthStatuses = useMemo(() => {
    const statuses = new Set(records.map(r => r.health_status))
    return Array.from(statuses).sort()
  }, [records])

  const uniqueNatures = useMemo(() => {
    const natures = new Set(records.map(r => r.brand_nature))
    return Array.from(natures).sort()
  }, [records])

  const uniqueTeams = useMemo(() => {
    const teams = new Set(records.map(r => r.team_name).filter((t): t is string => Boolean(t)))
    return Array.from(teams).sort()
  }, [records])

  // Fetch KAM Summary from API with filters
  useEffect(() => {
    const fetchKAMSummary = async () => {
      try {
        setKamSummaryLoading(true)
        
        // Build query parameters
        const params = new URLSearchParams()
        if (startDateFilter) params.append('startDate', startDateFilter)
        if (endDateFilter) params.append('endDate', endDateFilter)
        if (kamFilter.length > 0) params.append('kamNames', kamFilter.join(','))
        if (zoneFilter.length > 0) params.append('zones', zoneFilter.join(','))
        if (healthStatusFilter.length > 0) params.append('healthStatuses', healthStatusFilter.join(','))
        if (natureFilter.length > 0) params.append('natures', natureFilter.join(','))
        if (teamFilter.length > 0) params.append('teams', teamFilter.join(','))
        
        const url = `/api/data/health-checks/kam-summary${params.toString() ? '?' + params.toString() : ''}`
        const response = await fetch(url)
        const result = await response.json()
        
        if (result.success && result.data) {
          setKamSummaryData(result.data)
        } else {
          console.error('Failed to fetch KAM summary:', result.error)
        }
      } catch (err) {
        console.error('Error fetching KAM summary:', err)
      } finally {
        setKamSummaryLoading(false)
      }
    }

    fetchKAMSummary()
  }, [startDateFilter, endDateFilter, kamFilter, zoneFilter, healthStatusFilter, natureFilter, teamFilter]) // Refetch when filters change

  const filteredRecords = useMemo(() => {
    return records.filter(record => {
      if (startDateFilter || endDateFilter) {
        const recordDate = new Date(record.assessment_date)
        if (startDateFilter) {
          const startDate = new Date(startDateFilter)
          if (recordDate < startDate) return false
        }
        if (endDateFilter) {
          const endDate = new Date(endDateFilter)
          endDate.setHours(23, 59, 59, 999)
          if (recordDate > endDate) return false
        }
      }
      if (kamFilter.length > 0 && !kamFilter.includes(record.kam_name)) return false
      if (zoneFilter.length > 0 && !zoneFilter.includes(record.zone)) return false
      if (healthStatusFilter.length > 0 && !healthStatusFilter.includes(record.health_status)) return false
      if (natureFilter.length > 0 && !natureFilter.includes(record.brand_nature)) return false
      if (teamFilter.length > 0 && !teamFilter.includes(record.team_name || '')) return false
      return true
    })
  }, [records, startDateFilter, endDateFilter, kamFilter, zoneFilter, healthStatusFilter, natureFilter, teamFilter])

  // Pagination
  const totalPages = Math.ceil(filteredRecords.length / recordsPerPage)
  const paginatedRecords = useMemo(() => {
    const startIndex = (currentPage - 1) * recordsPerPage
    return filteredRecords.slice(startIndex, startIndex + recordsPerPage)
  }, [filteredRecords, currentPage])

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [startDateFilter, endDateFilter, kamFilter, zoneFilter, healthStatusFilter, natureFilter, teamFilter])

  // Clear KAM filter when team filter changes
  useEffect(() => {
    setKamFilter([])
  }, [teamFilter])

  // Export to CSV function
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

  // KAM Summary - show all KAMs, not filtered by health check records
  const kamSummary = useMemo(() => {
    // Show all KAMs from master data, sorted by total brands
    return kamSummaryData.sort((a, b) => b.total_brands - a.total_brands)
  }, [kamSummaryData])

  // Calculate totals for KAM Health Check Summary
  const kamSummaryTotals = useMemo(() => {
    return kamSummary.reduce(
      (acc, kam) => ({
        total_brands: acc.total_brands + kam.total_brands,
        this_month_done: acc.this_month_done + kam.this_month_done,
        this_month_pending: acc.this_month_pending + kam.this_month_pending,
        last_month_done: acc.last_month_done + kam.last_month_done,
        last_month_pending: acc.last_month_pending + kam.last_month_pending
      }),
      { total_brands: 0, this_month_done: 0, this_month_pending: 0, last_month_done: 0, last_month_pending: 0 }
    )
  }, [kamSummary])

  // This month trend data (5-day intervals)
  const thisMonthTrendData = useMemo(() => {
    const now = new Date()
    const currentMonth = now.getMonth()
    const currentYear = now.getFullYear()
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate()

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

    filteredRecords.forEach(record => {
      const recordDate = new Date(record.assessment_date)
      if (recordDate.getMonth() === currentMonth && recordDate.getFullYear() === currentYear) {
        const day = recordDate.getDate()
        const intervalIndex = intervals.findIndex(int => day >= int.start && day <= int.end)
        if (intervalIndex !== -1) {
          intervalCounts[intervalIndex].count++
        }
      }
    })

    return intervalCounts
  }, [filteredRecords])

  // Health Status pie chart data
  const healthStatusData = useMemo(() => {
    const statusMap = new Map<string, number>()

    filteredRecords.forEach(record => {
      const status = record.health_status
      statusMap.set(status, (statusMap.get(status) || 0) + 1)
    })

    return Array.from(statusMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
  }, [filteredRecords])

  // Nature pie chart data
  const natureData = useMemo(() => {
    const natureMap = new Map<string, number>()

    filteredRecords.forEach(record => {
      const nature = record.brand_nature
      natureMap.set(nature, (natureMap.get(nature) || 0) + 1)
    })

    return Array.from(natureMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
  }, [filteredRecords])

  const downloadCSV = () => {
    const headers = ['Date', 'Brand Name', 'KAM Name', 'Zone', 'Health Status', 'Nature', 'Remarks']
    const csvData = filteredRecords.map(record => [
      record.assessment_date,
      `"${(record.brand_name || '-').replace(/"/g, '""')}"`,
      record.kam_name,
      record.zone,
      record.health_status,
      record.brand_nature,
      `"${(record.remarks || '').replace(/"/g, '""')}"`
    ])
    const csvContent = [headers.join(','), ...csvData.map(row => row.join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `health_checks_${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const clearFilters = () => {
    setStartDateFilter('')
    setEndDateFilter('')
    setKamFilter([])
    setZoneFilter([])
    setHealthStatusFilter([])
    setNatureFilter([])
    setTeamFilter([])
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
    <div>
      {/* Summary Cards - Interactive with Filters */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-6 border border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-600 text-sm font-medium">Filtered Records</p>
              <p className="text-3xl font-bold text-blue-800 mt-2">{filteredRecords.length}</p>
              <p className="text-xs text-blue-600 mt-1">of {records.length} total</p>
            </div>
            <div className="w-12 h-12 bg-blue-200 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-6 border border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-600 text-sm font-medium">Healthy (Green + Amber)</p>
              <p className="text-3xl font-bold text-green-800 mt-2">
                {filteredRecords.filter(r => r.health_status === 'Green' || r.health_status === 'Amber').length}
              </p>
              <p className="text-xs text-green-600 mt-1">
                {filteredRecords.length > 0 ? Math.round((filteredRecords.filter(r => r.health_status === 'Green' || r.health_status === 'Amber').length / filteredRecords.length) * 100) : 0}% of filtered
              </p>
            </div>
            <div className="w-12 h-12 bg-green-200 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-6 border border-orange-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-600 text-sm font-medium">Critical (Orange + Red)</p>
              <p className="text-3xl font-bold text-orange-800 mt-2">
                {filteredRecords.filter(r => r.health_status === 'Orange' || r.health_status === 'Red').length}
              </p>
              <p className="text-xs text-orange-600 mt-1">
                {filteredRecords.length > 0 ? Math.round((filteredRecords.filter(r => r.health_status === 'Orange' || r.health_status === 'Red').length / filteredRecords.length) * 100) : 0}% of filtered
              </p>
            </div>
            <div className="w-12 h-12 bg-orange-200 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">Not Connected</p>
              <p className="text-3xl font-bold text-gray-800 mt-2">
                {filteredRecords.filter(r => r.health_status === 'Not Connected').length}
              </p>
              <p className="text-xs text-gray-600 mt-1">
                {filteredRecords.length > 0 ? Math.round((filteredRecords.filter(r => r.health_status === 'Not Connected').length / filteredRecords.length) * 100) : 0}% of filtered
              </p>
            </div>
            <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-gray-50 rounded-lg p-6 mb-6 border border-gray-200">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-secondary-800">Filters</h2>
          <div className="flex gap-2">
            <button onClick={clearFilters} className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-secondary-800 rounded-lg transition-colors text-sm">
              Clear Filters
            </button>
            <button onClick={downloadCSV} disabled={filteredRecords.length === 0} className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm">
              📥 Download CSV
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
          <div>
            <label className="block text-secondary-700 text-sm mb-2">Start Date</label>
            <input type="date" value={startDateFilter} onChange={(e) => setStartDateFilter(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-secondary-800 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-200" />
          </div>
          <div>
            <label className="block text-secondary-700 text-sm mb-2">End Date</label>
            <input type="date" value={endDateFilter} onChange={(e) => setEndDateFilter(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-secondary-800 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-200" />
          </div>
          <SearchableMultiSelect label="Team" options={uniqueTeams} selected={teamFilter} onChange={setTeamFilter} />
          <SearchableMultiSelect label="KAM Name" options={uniqueKAMs} selected={kamFilter} onChange={setKamFilter} />
          <SearchableMultiSelect label="Zone" options={uniqueZones} selected={zoneFilter} onChange={setZoneFilter} />
          <SearchableMultiSelect label="Health Status" options={uniqueHealthStatuses} selected={healthStatusFilter} onChange={setHealthStatusFilter} />
          <SearchableMultiSelect label="Nature" options={uniqueNatures} selected={natureFilter} onChange={setNatureFilter} />
        </div>

        <div className="mt-4 text-sm text-secondary-600">
          Showing {filteredRecords.length === 0 ? 0 : (currentPage - 1) * recordsPerPage + 1} to {Math.min(currentPage * recordsPerPage, filteredRecords.length)} of {filteredRecords.length} records
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* This Month Trend Chart */}
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <h3 className="text-lg font-bold text-secondary-800 mb-4">📊 This Month Trend</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={thisMonthTrendData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="interval" tick={{ fontSize: 12 }} />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#3b82f6" name="Health Check Count">
                <LabelList dataKey="count" position="top" style={{ fontSize: '12px', fontWeight: 'bold' }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Health Status Pie Chart */}
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <h3 className="text-lg font-bold text-secondary-800 mb-4">🏥 Health Status Distribution</h3>
          <div className="flex items-center justify-between">
            <ResponsiveContainer width="60%" height={300}>
              <PieChart>
                <Pie
                  data={healthStatusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={false}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {healthStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="w-[38%] max-h-[300px] overflow-y-auto pr-2">
              <div className="space-y-2">
                {healthStatusData.map((entry, index) => (
                  <div key={index} className="flex items-start gap-2 text-xs">
                    <div 
                      className="w-4 h-4 rounded flex-shrink-0 mt-0.5" 
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <div className="flex-1">
                      <div className="font-medium text-secondary-800">{entry.name}</div>
                      <div className="text-secondary-600">
                        {entry.value} ({((entry.value / filteredRecords.length) * 100).toFixed(1)}%)
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Nature Pie Chart */}
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <h3 className="text-lg font-bold text-secondary-800 mb-4">🏢 Nature Distribution</h3>
          <div className="flex items-center justify-between">
            <ResponsiveContainer width="60%" height={300}>
              <PieChart>
                <Pie
                  data={natureData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={false}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {natureData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="w-[38%] max-h-[300px] overflow-y-auto pr-2">
              <div className="space-y-2">
                {natureData.map((entry, index) => (
                  <div key={index} className="flex items-start gap-2 text-xs">
                    <div 
                      className="w-4 h-4 rounded flex-shrink-0 mt-0.5" 
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <div className="flex-1">
                      <div className="font-medium text-secondary-800">{entry.name}</div>
                      <div className="text-secondary-600">
                        {entry.value} ({((entry.value / filteredRecords.length) * 100).toFixed(1)}%)
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* KAM Summary Table */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-secondary-800">👤 KAM Health Check Summary</h3>
          <button
            onClick={() => exportToCSV(kamSummary, 'kam-health-check-summary.csv')}
            disabled={kamSummary.length === 0}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export CSV
          </button>
        </div>
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-secondary-50 border-b border-secondary-200">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-secondary-700">KAM Name</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-secondary-700">Total Brands</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-secondary-700">This Month Done</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-secondary-700">This Month Pending</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-secondary-700">Last Month Done</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-secondary-700">Last Month Pending</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-secondary-700">Last Health Check Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-secondary-100">
                {kamSummaryLoading ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-secondary-500">
                      <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                      <p className="mt-2">Loading KAM summary...</p>
                    </td>
                  </tr>
                ) : kamSummary.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-secondary-500">
                      No KAM data available for the selected filters
                    </td>
                  </tr>
                ) : (
                  <>
                    {kamSummary.map((kam, index) => (
                      <tr key={index} className="hover:bg-secondary-50 transition-colors">
                        <td className="px-4 py-3 text-sm font-medium text-secondary-900">{kam.kam_name}</td>
                        <td className="px-4 py-3 text-sm text-center text-blue-600 font-semibold">{kam.total_brands}</td>
                        <td className="px-4 py-3 text-sm text-center text-green-600 font-semibold">{kam.this_month_done}</td>
                        <td className="px-4 py-3 text-sm text-center text-orange-600 font-semibold">{kam.this_month_pending}</td>
                        <td className="px-4 py-3 text-sm text-center text-green-600 font-semibold">{kam.last_month_done}</td>
                        <td className="px-4 py-3 text-sm text-center text-orange-600 font-semibold">{kam.last_month_pending}</td>
                        <td className="px-4 py-3 text-sm text-center text-secondary-600">
                          {kam.last_health_check_date ? new Date(kam.last_health_check_date).toLocaleDateString() : 'N/A'}
                        </td>
                      </tr>
                    ))}
                    {/* Totals Row */}
                    <tr className="bg-blue-100 border-t-2 border-blue-300 font-bold">
                      <td className="px-4 py-3 text-sm font-bold text-secondary-900">Total</td>
                      <td className="px-4 py-3 text-sm text-center text-blue-700 font-bold">{kamSummaryTotals.total_brands}</td>
                      <td className="px-4 py-3 text-sm text-center text-green-700 font-bold">{kamSummaryTotals.this_month_done}</td>
                      <td className="px-4 py-3 text-sm text-center text-orange-700 font-bold">{kamSummaryTotals.this_month_pending}</td>
                      <td className="px-4 py-3 text-sm text-center text-green-700 font-bold">{kamSummaryTotals.last_month_done}</td>
                      <td className="px-4 py-3 text-sm text-center text-orange-700 font-bold">{kamSummaryTotals.last_month_pending}</td>
                      <td className="px-4 py-3 text-sm text-center text-secondary-600">-</td>
                    </tr>
                  </>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {loading && (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          <p className="mt-4 text-secondary-600">Loading health check data...</p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-800">❌ {error}</p>
        </div>
      )}

      {!loading && !error && (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-gray-300 bg-gray-50">
                <th className="text-left py-3 px-4 text-secondary-700 font-semibold">Date</th>
                <th className="text-left py-3 px-4 text-secondary-700 font-semibold">Brand Name</th>
                <th className="text-left py-3 px-4 text-secondary-700 font-semibold">KAM Name</th>
                <th className="text-left py-3 px-4 text-secondary-700 font-semibold">Zone</th>
                <th className="text-left py-3 px-4 text-secondary-700 font-semibold">Health Status</th>
                <th className="text-left py-3 px-4 text-secondary-700 font-semibold">Nature</th>
                <th className="text-left py-3 px-4 text-secondary-700 font-semibold" style={{ minWidth: '200px' }}>Remarks</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-8 text-secondary-600">No records found matching the selected filters</td></tr>
              ) : (
                paginatedRecords.map((record, index) => (
                  <tr key={record.check_id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="py-3 px-4 text-secondary-800">{new Date(record.assessment_date).toLocaleDateString()}</td>
                    <td className="py-3 px-4 text-secondary-800">{record.brand_name || '-'}</td>
                    <td className="py-3 px-4 text-secondary-800">{record.kam_name}</td>
                    <td className="py-3 px-4 text-secondary-800">{record.zone}</td>
                    <td className="py-3 px-4"><span className={`px-3 py-1 rounded-full text-sm font-medium ${getHealthStatusColor(record.health_status)}`}>{record.health_status}</span></td>
                    <td className="py-3 px-4 text-secondary-800">{record.brand_nature}</td>
                    <td className="py-3 px-4 text-secondary-600 text-sm" style={{ minWidth: '200px', maxWidth: '400px', whiteSpace: 'normal', wordWrap: 'break-word' }}>{record.remarks || '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {!loading && !error && filteredRecords.length > 0 && (
        <div className="flex items-center justify-between mt-6">
          <div className="text-sm text-secondary-600">
            Page {currentPage} of {totalPages}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 border border-gray-300 rounded-lg text-secondary-800 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Previous
            </button>
            <div className="flex gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum
                if (totalPages <= 5) {
                  pageNum = i + 1
                } else if (currentPage <= 3) {
                  pageNum = i + 1
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i
                } else {
                  pageNum = currentPage - 2 + i
                }
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`px-4 py-2 border rounded-lg transition-colors ${
                      currentPage === pageNum
                        ? 'bg-primary-600 text-white border-primary-600'
                        : 'border-gray-300 text-secondary-800 hover:bg-gray-50'
                    }`}
                  >
                    {pageNum}
                  </button>
                )
              })}
            </div>
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="px-4 py-2 border border-gray-300 rounded-lg text-secondary-800 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
