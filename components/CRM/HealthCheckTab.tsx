'use client'

import { useState, useMemo, useEffect } from 'react'
import SearchableMultiSelect from './SearchableMultiSelect'

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

  const uniqueKAMs = useMemo(() => {
    const kams = new Set(records.map(r => r.kam_name))
    return Array.from(kams).sort()
  }, [records])

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

  const downloadCSV = () => {
    const headers = ['Date', 'KAM Name', 'Zone', 'Health Status', 'Nature', 'Remarks']
    const csvData = filteredRecords.map(record => [
      record.assessment_date,
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
                <th className="text-left py-3 px-4 text-secondary-700 font-semibold">KAM Name</th>
                <th className="text-left py-3 px-4 text-secondary-700 font-semibold">Zone</th>
                <th className="text-left py-3 px-4 text-secondary-700 font-semibold">Health Status</th>
                <th className="text-left py-3 px-4 text-secondary-700 font-semibold">Nature</th>
                <th className="text-left py-3 px-4 text-secondary-700 font-semibold">Remarks</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-8 text-secondary-600">No records found matching the selected filters</td></tr>
              ) : (
                paginatedRecords.map((record, index) => (
                  <tr key={record.check_id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="py-3 px-4 text-secondary-800">{new Date(record.assessment_date).toLocaleDateString()}</td>
                    <td className="py-3 px-4 text-secondary-800">{record.kam_name}</td>
                    <td className="py-3 px-4 text-secondary-800">{record.zone}</td>
                    <td className="py-3 px-4"><span className={`px-3 py-1 rounded-full text-sm font-medium ${getHealthStatusColor(record.health_status)}`}>{record.health_status}</span></td>
                    <td className="py-3 px-4 text-secondary-800">{record.brand_nature}</td>
                    <td className="py-3 px-4 text-secondary-600 text-sm max-w-xs truncate">{record.remarks || '-'}</td>
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
