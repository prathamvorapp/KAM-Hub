'use client'

import { useState, useMemo, useEffect } from 'react'
import SearchableMultiSelect from './SearchableMultiSelect'

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
    return Array.from(reasons).sort()
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
      
      if (churnReasonFilter.length > 0 && !churnReasonFilter.includes(record.churn_reason)) return false
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
      record.restaurant_name,
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
              <p className="text-purple-600 text-sm font-medium">Unique KAMs</p>
              <p className="text-3xl font-bold text-purple-800 mt-2">{uniqueFilteredKAMs}</p>
              <p className="text-xs text-purple-600 mt-1">in filtered data</p>
            </div>
            <div className="w-12 h-12 bg-purple-200 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
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
              <p className="text-orange-600 text-sm font-medium">Unique Restaurants</p>
              <p className="text-3xl font-bold text-orange-800 mt-2">{uniqueFilteredRIDs}</p>
              <p className="text-xs text-orange-600 mt-1">in filtered data</p>
            </div>
            <div className="w-12 h-12 bg-orange-200 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
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
