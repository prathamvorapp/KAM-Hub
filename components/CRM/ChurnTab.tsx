'use client'

import { useState, useMemo, useEffect } from 'react'
import SearchableMultiSelect from './SearchableMultiSelect'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LabelList } from 'recharts'

interface ChurnRecord {
  rid: string
  restaurant_name: string
  kam: string
  churn_reason: string
  remarks: string
  date: string
  mail_sent_confirmation?: boolean
  controlled_status?: string
  zone?: string
  sync_days?: string
  team_name?: string
  [key: string]: any
}

interface Props {
  records: ChurnRecord[]
  loading: boolean
  error: string | null
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316']

export default function ChurnTab({ records, loading, error }: Props) {
  const [startDateFilter, setStartDateFilter] = useState('')
  const [endDateFilter, setEndDateFilter] = useState('')
  const [ridFilter, setRidFilter] = useState<string[]>([])
  const [kamFilter, setKamFilter] = useState<string[]>([])
  const [churnReasonFilter, setChurnReasonFilter] = useState<string[]>([])
  const [callsFilter, setCallsFilter] = useState<string[]>([])
  const [teamFilter, setTeamFilter] = useState<string[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const recordsPerPage = 20
  const [teamKamMapping, setTeamKamMapping] = useState<Record<string, string[]>>({})
  const [teamsLoading, setTeamsLoading] = useState(true)

  // Fetch team-to-KAM mapping from user_profiles
  useEffect(() => {
    const fetchTeamKamMapping = async () => {
      try {
        setTeamsLoading(true)
        const response = await fetch('/api/user/agents')
        if (response.ok) {
          const result = await response.json()
          if (result.success && result.data) {
            // Build team -> KAMs mapping
            const mapping: Record<string, string[]> = {}
            result.data.forEach((user: any) => {
              const team = user.team_name
              const email = user.email
              const fullName = user.full_name
              
              if (team) {
                if (!mapping[team]) {
                  mapping[team] = []
                }
                // Store both email and full_name as KAM identifiers
                if (email && !mapping[team].includes(email)) {
                  mapping[team].push(email)
                }
                if (fullName && !mapping[team].includes(fullName)) {
                  mapping[team].push(fullName)
                }
              }
            })
            setTeamKamMapping(mapping)
          }
        }
      } catch (err) {
        console.error('Error fetching team-KAM mapping:', err)
      } finally {
        setTeamsLoading(false)
      }
    }
    fetchTeamKamMapping()
  }, [])

  const uniqueRIDs = useMemo(() => {
    const rids = new Set(records.map(r => r.rid).filter(Boolean))
    return Array.from(rids).sort()
  }, [records])

  const uniqueKAMs = useMemo(() => {
    const kams = new Set(records.map(r => r.kam).filter(Boolean))
    return Array.from(kams).sort()
  }, [records])

  const uniqueChurnReasons = useMemo(() => {
    const reasons = new Set(records.map(r => r.churn_reason).filter(Boolean))
    const reasonsArray = Array.from(reasons).sort()
    // Add "Blank" option at the beginning
    return ['Blank', ...reasonsArray]
  }, [records])

  const uniqueCallCounts = useMemo(() => {
    // Since no_of_calls_done doesn't exist, we'll use a placeholder
    // You may need to add this field to your database
    return ['0', '1', '2', '3', '4', '5+']
  }, [records])

  const uniqueTeams = useMemo(() => {
    return Object.keys(teamKamMapping).sort()
  }, [teamKamMapping])

  // Get KAMs for selected teams
  const kamsFromSelectedTeams = useMemo(() => {
    if (teamFilter.length === 0) return []
    const kams: string[] = []
    teamFilter.forEach(team => {
      if (teamKamMapping[team]) {
        kams.push(...teamKamMapping[team])
      }
    })
    return [...new Set(kams)]
  }, [teamFilter, teamKamMapping, records])

  const parseDate = (dateStr: string) => {
    if (!dateStr) return null
    // Handle DD-MM-YYYY format from database
    const parts = dateStr.split('-')
    if (parts.length === 3) {
      const day = parts[0]
      const month = parts[1]
      const year = parts[2]
      // Create date in YYYY-MM-DD format for proper parsing
      return new Date(`${year}-${month}-${day}`)
    }
    return new Date(dateStr)
  }

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-'
    const date = parseDate(dateStr)
    if (!date || isNaN(date.getTime())) return dateStr
    return date.toLocaleDateString()
  }

  const filteredRecords = useMemo(() => {
    return records.filter(record => {
      if (startDateFilter || endDateFilter) {
        const recordDate = parseDate(record.date)
        if (!recordDate) return false
        
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
      if (ridFilter.length > 0 && !ridFilter.includes(record.rid)) return false
      
      // Team filter: check if KAM belongs to selected teams
      if (teamFilter.length > 0) {
        const recordKam = record.kam?.trim() || ''
        const recordKamLower = recordKam.toLowerCase()
        
        const kamMatches = kamsFromSelectedTeams.some(kam => {
          const teamKam = kam?.trim() || ''
          const teamKamLower = teamKam.toLowerCase()
          
          // Try exact match first (case-insensitive)
          if (teamKamLower === recordKamLower) return true
          
          // Try exact match with email format (if team KAM is email)
          if (teamKam.includes('@') && teamKamLower === recordKamLower) return true
          
          // For name matching, require full name match or last name match
          // Split names into parts
          const teamKamParts = teamKamLower.split(/\s+/).filter(p => p.length > 0)
          const recordKamParts = recordKamLower.split(/\s+/).filter(p => p.length > 0)
          
          // If both have at least 2 parts (first + last name), compare last names
          if (teamKamParts.length >= 2 && recordKamParts.length >= 2) {
            const teamLastName = teamKamParts[teamKamParts.length - 1]
            const recordLastName = recordKamParts[recordKamParts.length - 1]
            // Match if last names are the same AND first names match
            if (teamLastName === recordLastName && teamKamParts[0] === recordKamParts[0]) {
              return true
            }
          }
          
          return false
        })
        
        if (!kamMatches) return false
      }
      
      // KAM filter: direct KAM selection
      if (kamFilter.length > 0 && !kamFilter.includes(record.kam)) return false
      
      if (churnReasonFilter.length > 0) {
        const hasBlankFilter = churnReasonFilter.includes('Blank')
        const isRecordBlank = !record.churn_reason || record.churn_reason.trim() === ''
        
        if (hasBlankFilter && isRecordBlank) {
          // Record is blank and blank filter is selected
        } else if (!churnReasonFilter.includes(record.churn_reason)) {
          return false
        }
      }
      return true
    })
  }, [records, startDateFilter, endDateFilter, ridFilter, kamFilter, churnReasonFilter, callsFilter, teamFilter, kamsFromSelectedTeams])

  // Pagination
  const totalPages = Math.ceil(filteredRecords.length / recordsPerPage)
  const paginatedRecords = useMemo(() => {
    const startIndex = (currentPage - 1) * recordsPerPage
    return filteredRecords.slice(startIndex, startIndex + recordsPerPage)
  }, [filteredRecords, currentPage])

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [startDateFilter, endDateFilter, ridFilter, kamFilter, churnReasonFilter, teamFilter])

  const downloadCSV = () => {
    const headers = ['Date', 'RID', 'Restaurant Name', 'KAM', 'Churn Reason', 'Remarks', 'Mail Sent']
    const csvData = filteredRecords.map(record => [
      record.date,
      record.rid,
      `"${(record.restaurant_name || '').replace(/"/g, '""')}"`,
      record.kam,
      record.churn_reason || '',
      `"${(record.remarks || '').replace(/"/g, '""')}"`,
      record.mail_sent_confirmation ? 'Yes' : 'No'
    ])
    const csvContent = [headers.join(','), ...csvData.map(row => row.join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `churn_data_${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const downloadKAMSummaryCSV = () => {
    const headers = ['KAM Name', 'Total Churn Count', 'Yet to Respond', 'Completed Count']
    const csvData = kamSummary.map(kam => [
      `"${kam.kamName.replace(/"/g, '""')}"`,
      kam.totalChurn,
      kam.yetToRespond,
      kam.completed
    ])
    // Add totals row
    csvData.push([
      'Total',
      kamSummaryTotals.totalChurn,
      kamSummaryTotals.yetToRespond,
      kamSummaryTotals.completed
    ])
    const csvContent = [headers.join(','), ...csvData.map(row => row.join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `kam_churn_summary_${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const clearFilters = () => {
    setStartDateFilter('')
    setEndDateFilter('')
    setRidFilter([])
    setKamFilter([])
    setChurnReasonFilter([])
    setCallsFilter([])
    setTeamFilter([])
  }

  const uniqueFilteredKAMs = useMemo(() => {
    const kams = new Set(filteredRecords.map(r => r.kam).filter(Boolean))
    return kams.size
  }, [filteredRecords])

  const uniqueFilteredRIDs = useMemo(() => {
    const rids = new Set(filteredRecords.map(r => r.rid).filter(Boolean))
    return rids.size
  }, [filteredRecords])

  // KAM Summary calculations
  const kamSummary = useMemo(() => {
    const kamMap = new Map<string, { totalChurn: number; yetToRespond: number; completed: number }>()
    
    filteredRecords.forEach(record => {
      const kamName = record.kam
      if (!kamName) return
      
      if (!kamMap.has(kamName)) {
        kamMap.set(kamName, { totalChurn: 0, yetToRespond: 0, completed: 0 })
      }
      
      const kamData = kamMap.get(kamName)!
      kamData.totalChurn++
      
      if (!record.churn_reason || record.churn_reason.trim() === '') {
        kamData.yetToRespond++
      } else {
        kamData.completed++
      }
    })
    
    return Array.from(kamMap.entries())
      .map(([kamName, data]) => ({ kamName, ...data }))
      .sort((a, b) => b.totalChurn - a.totalChurn)
  }, [filteredRecords])

  // Calculate totals for KAM Summary
  const kamSummaryTotals = useMemo(() => {
    return kamSummary.reduce(
      (acc, kam) => ({
        totalChurn: acc.totalChurn + kam.totalChurn,
        yetToRespond: acc.yetToRespond + kam.yetToRespond,
        completed: acc.completed + kam.completed
      }),
      { totalChurn: 0, yetToRespond: 0, completed: 0 }
    )
  }, [kamSummary])

  // Monthly trend data (5-day intervals for current month)
  const monthlyTrendData = useMemo(() => {
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
      const recordDate = parseDate(record.date)
      if (recordDate && recordDate.getMonth() === currentMonth && recordDate.getFullYear() === currentYear) {
        const day = recordDate.getDate()
        const intervalIndex = intervals.findIndex(int => day >= int.start && day <= int.end)
        if (intervalIndex !== -1) {
          intervalCounts[intervalIndex].count++
        }
      }
    })
    
    return intervalCounts
  }, [filteredRecords])

  // Churn reason pie chart data
  const churnReasonData = useMemo(() => {
    const reasonMap = new Map<string, number>()
    
    filteredRecords.forEach(record => {
      const reason = record.churn_reason && record.churn_reason.trim() !== '' 
        ? record.churn_reason 
        : 'Not Filled'
      
      reasonMap.set(reason, (reasonMap.get(reason) || 0) + 1)
    })
    
    return Array.from(reasonMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
  }, [filteredRecords])

  // Controlled/Uncontrolled pie chart data with specific logic
  const controlledStatusData = useMemo(() => {
    const uncontrolledReasons = [
      'Outlet once out of Sync – now Active',
      'Permanently Closed (Outlet / brand)',
      'Event Account / Demo Account'
    ]
    
    let controlled = 0
    let uncontrolled = 0
    
    filteredRecords.forEach(record => {
      const reason = record.churn_reason?.trim() || ''
      
      // Check if reason matches uncontrolled criteria
      if (uncontrolledReasons.some(ur => reason.toLowerCase().includes(ur.toLowerCase()))) {
        uncontrolled++
      } else {
        // Everything else is controlled (including blank/not filled)
        controlled++
      }
    })
    
    return [
      { name: 'Controlled', value: controlled },
      { name: 'Uncontrolled', value: uncontrolled }
    ].filter(item => item.value > 0)
  }, [filteredRecords])

  // Team-wise bar chart data - fetch from KAM's team via team mapping
  const teamWiseData = useMemo(() => {
    const teamMap = new Map<string, number>()
    
    filteredRecords.forEach(record => {
      const kamName = record.kam
      if (!kamName) {
        const unassignedCount = teamMap.get('Unassigned') || 0
        teamMap.set('Unassigned', unassignedCount + 1)
        return
      }
      
      // Find team for this KAM from teamKamMapping
      let kamTeam = 'Unassigned'
      for (const [team, kams] of Object.entries(teamKamMapping)) {
        if (kams.some(k => {
          const kamLower = k.toLowerCase()
          const recordKamLower = kamName.toLowerCase()
          return kamLower === recordKamLower || 
                 kamLower.includes(recordKamLower) || 
                 recordKamLower.includes(kamLower)
        })) {
          kamTeam = team
          break
        }
      }
      
      teamMap.set(kamTeam, (teamMap.get(kamTeam) || 0) + 1)
    })
    
    return Array.from(teamMap.entries())
      .map(([team, count]) => ({ team, count }))
      .sort((a, b) => b.count - a.count)
  }, [filteredRecords, teamKamMapping])

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

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-6 border border-purple-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-600 text-sm font-medium">Reason Not Filled</p>
              <p className="text-3xl font-bold text-purple-800 mt-2">{filteredRecords.filter(r => !r.churn_reason || r.churn_reason.trim() === '').length}</p>
              <p className="text-xs text-purple-600 mt-1">in filtered data</p>
            </div>
            <div className="w-12 h-12 bg-purple-200 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-6 border border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-600 text-sm font-medium">Mail Sent</p>
              <p className="text-3xl font-bold text-green-800 mt-2">
                {filteredRecords.filter(r => r.mail_sent_confirmation).length}
              </p>
              <p className="text-xs text-green-600 mt-1">
                {filteredRecords.length > 0 ? Math.round((filteredRecords.filter(r => r.mail_sent_confirmation).length / filteredRecords.length) * 100) : 0}% of filtered
              </p>
            </div>
            <div className="w-12 h-12 bg-green-200 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-6 border border-orange-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-600 text-sm font-medium">Complete Records</p>
              <p className="text-3xl font-bold text-orange-800 mt-2">{filteredRecords.filter(r => r.churn_reason && r.churn_reason.trim() !== '').length}</p>
              <p className="text-xs text-orange-600 mt-1">with reason filled</p>
            </div>
            <div className="w-12 h-12 bg-orange-200 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
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

        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
          <div>
            <label className="block text-secondary-700 text-sm mb-2">Start Date</label>
            <input type="date" value={startDateFilter} onChange={(e) => setStartDateFilter(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-secondary-800 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-200" />
          </div>
          <div>
            <label className="block text-secondary-700 text-sm mb-2">End Date</label>
            <input type="date" value={endDateFilter} onChange={(e) => setEndDateFilter(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-secondary-800 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-200" />
          </div>
          <SearchableMultiSelect label="Team" options={uniqueTeams} selected={teamFilter} onChange={setTeamFilter} />
          <SearchableMultiSelect label="RID" options={uniqueRIDs} selected={ridFilter} onChange={setRidFilter} />
          <SearchableMultiSelect label="KAM" options={uniqueKAMs} selected={kamFilter} onChange={setKamFilter} />
          <SearchableMultiSelect label="Churn Reason" options={uniqueChurnReasons} selected={churnReasonFilter} onChange={setChurnReasonFilter} />
        </div>

        <div className="mt-4 text-sm text-secondary-600">
          Showing {filteredRecords.length === 0 ? 0 : (currentPage - 1) * recordsPerPage + 1} to {Math.min(currentPage * recordsPerPage, filteredRecords.length)} of {filteredRecords.length} records
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Monthly Trend Chart */}
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <h3 className="text-lg font-bold text-secondary-800 mb-4">📊 Current Month Churn Trend</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={monthlyTrendData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="interval" tick={{ fontSize: 12 }} />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#3b82f6" name="Churn Count">
                <LabelList dataKey="count" position="top" style={{ fontSize: '12px', fontWeight: 'bold' }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Churn Reason Pie Chart */}
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <h3 className="text-lg font-bold text-secondary-800 mb-4">📋 Churn Reasons Distribution</h3>
          <div className="flex items-center justify-between">
            <ResponsiveContainer width="60%" height={300}>
              <PieChart>
                <Pie
                  data={churnReasonData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={false}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {churnReasonData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: any, name: any, props: any) => [`${value} (${((value / filteredRecords.length) * 100).toFixed(1)}%)`, props.payload.name]}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="w-[38%] max-h-[300px] overflow-y-auto pr-2">
              <div className="space-y-2">
                {churnReasonData.map((entry, index) => (
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

        {/* Controlled/Uncontrolled Pie Chart */}
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <h3 className="text-lg font-bold text-secondary-800 mb-4">🎯 Controlled vs Uncontrolled</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={controlledStatusData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {controlledStatusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Team-wise Bar Chart */}
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <h3 className="text-lg font-bold text-secondary-800 mb-4">👥 Team-wise Churn Count</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={teamWiseData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="team" 
                angle={-45} 
                textAnchor="end" 
                height={100}
                interval={0}
                tick={{ fontSize: 11 }}
                label={{ value: 'Team Name', position: 'insideBottom', offset: -5 }}
              />
              <YAxis 
                label={{ value: 'Churn Count', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip />
              <Bar dataKey="count" fill="#10b981" name="Churn Count">
                <LabelList dataKey="count" position="top" style={{ fontSize: '12px', fontWeight: 'bold' }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* KAM Summary Table */}
      <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-6 border border-indigo-200 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-secondary-800">👤 KAM Churn Summary</h3>
          <button
            onClick={downloadKAMSummaryCSV}
            disabled={kamSummary.length === 0}
            className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export KAM Summary
          </button>
        </div>
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-secondary-50 border-b border-secondary-200">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-secondary-700">KAM Name</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-secondary-700">Total Churn Count</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-secondary-700">Yet to Respond</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-secondary-700">Completed Count</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-secondary-100">
                {kamSummary.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-secondary-500">
                      No KAM data available for the selected filters
                    </td>
                  </tr>
                ) : (
                  <>
                    {kamSummary.map((kam, index) => (
                      <tr key={index} className="hover:bg-secondary-50 transition-colors">
                        <td className="px-4 py-3 text-sm font-medium text-secondary-900">{kam.kamName}</td>
                        <td className="px-4 py-3 text-sm text-center text-blue-600 font-semibold">{kam.totalChurn}</td>
                        <td className="px-4 py-3 text-sm text-center text-orange-600 font-semibold">{kam.yetToRespond}</td>
                        <td className="px-4 py-3 text-sm text-center text-green-600 font-semibold">{kam.completed}</td>
                      </tr>
                    ))}
                    {/* Totals Row */}
                    <tr className="bg-indigo-100 border-t-2 border-indigo-300 font-bold">
                      <td className="px-4 py-3 text-sm font-bold text-secondary-900">Total</td>
                      <td className="px-4 py-3 text-sm text-center text-blue-700 font-bold">{kamSummaryTotals.totalChurn}</td>
                      <td className="px-4 py-3 text-sm text-center text-orange-700 font-bold">{kamSummaryTotals.yetToRespond}</td>
                      <td className="px-4 py-3 text-sm text-center text-green-700 font-bold">{kamSummaryTotals.completed}</td>
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
          <p className="mt-4 text-secondary-600">Loading churn data...</p>
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
                <th className="text-left py-3 px-4 text-secondary-700 font-semibold">RID</th>
                <th className="text-left py-3 px-4 text-secondary-700 font-semibold">Restaurant Name</th>
                <th className="text-left py-3 px-4 text-secondary-700 font-semibold">KAM</th>
                <th className="text-left py-3 px-4 text-secondary-700 font-semibold">Churn Reason</th>
                <th className="text-left py-3 px-4 text-secondary-700 font-semibold">Remarks</th>
                <th className="text-center py-3 px-4 text-secondary-700 font-semibold">Mail Sent</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-8 text-secondary-600">No records found matching the selected filters</td></tr>
              ) : (
                paginatedRecords.map((record, index) => (
                  <tr key={`${record.rid}-${index}`} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="py-3 px-4 text-secondary-800">{formatDate(record.date)}</td>
                    <td className="py-3 px-4 text-secondary-800 font-medium">{record.rid}</td>
                    <td className="py-3 px-4 text-secondary-800">{record.restaurant_name}</td>
                    <td className="py-3 px-4 text-secondary-800">{record.kam}</td>
                    <td className="py-3 px-4 text-secondary-800">{record.churn_reason || '-'}</td>
                    <td className="py-3 px-4 text-secondary-600 text-sm max-w-xs truncate">{record.remarks || '-'}</td>
                    <td className="py-3 px-4 text-center"><span className={`px-3 py-1 rounded-full text-sm font-medium ${record.mail_sent_confirmation ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>{record.mail_sent_confirmation ? 'Yes' : 'No'}</span></td>
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
