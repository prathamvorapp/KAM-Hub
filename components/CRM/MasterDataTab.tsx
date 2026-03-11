'use client'

import { useState, useEffect, useMemo } from 'react'

// Zone colors for pie chart
const ZONE_COLORS = [
  '#3b82f6', // blue
  '#ef4444', // red
  '#10b981', // green
  '#f59e0b', // amber
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#f97316', // orange
]

// Simple Pie Chart Component
function PieChart({ data }: { data: Record<string, number> }) {
  const total = Object.values(data).reduce((sum, val) => sum + val, 0)
  
  if (total === 0) {
    return (
      <div className="w-64 h-64 flex items-center justify-center text-secondary-500">
        No data available
      </div>
    )
  }

  const entries = Object.entries(data).sort(([, a], [, b]) => b - a)
  let currentAngle = -90 // Start from top

  return (
    <svg width="256" height="256" viewBox="0 0 256 256" className="transform">
      {entries.map(([zone, count], index) => {
        const percentage = count / total
        const angle = percentage * 360
        const startAngle = currentAngle
        const endAngle = currentAngle + angle
        
        // Calculate path for pie slice
        const startRad = (startAngle * Math.PI) / 180
        const endRad = (endAngle * Math.PI) / 180
        const x1 = 128 + 100 * Math.cos(startRad)
        const y1 = 128 + 100 * Math.sin(startRad)
        const x2 = 128 + 100 * Math.cos(endRad)
        const y2 = 128 + 100 * Math.sin(endRad)
        const largeArc = angle > 180 ? 1 : 0
        
        const path = `M 128 128 L ${x1} ${y1} A 100 100 0 ${largeArc} 1 ${x2} ${y2} Z`
        
        currentAngle = endAngle
        
        return (
          <g key={zone}>
            <path
              d={path}
              fill={ZONE_COLORS[index % ZONE_COLORS.length]}
              stroke="white"
              strokeWidth="2"
              className="hover:opacity-80 transition-opacity cursor-pointer"
            >
              <title>{`${zone}: ${count} (${(percentage * 100).toFixed(1)}%)`}</title>
            </path>
          </g>
        )
      })}
      {/* Center circle for donut effect */}
      <circle cx="128" cy="128" r="50" fill="white" />
      <text
        x="128"
        y="128"
        textAnchor="middle"
        dominantBaseline="middle"
        className="text-2xl font-bold fill-secondary-800"
      >
        {total}
      </text>
      <text
        x="128"
        y="148"
        textAnchor="middle"
        dominantBaseline="middle"
        className="text-xs fill-secondary-600"
      >
        Unassigned
      </text>
    </svg>
  )
}

interface MasterDataRecord {
  brand_name: string
  brand_email_id: string
  kam_name: string
  kam_email_id: string
  brand_state: string
  zone: string
  team_name: string
  outlet_count: number
  last_health_status: string
  last_brand_nature: string
  health_check_count: number
  last_health_check_date: string | null
  visit_count: number
  last_visit_date: string | null
  churn_count: number
  last_rid_in_churn: string
  demo_done_count: number
  last_demo_date: string | null
  brand_id: string
}

interface MasterDataTabProps {
  userProfile: any
}

export default function MasterDataTab({ userProfile }: MasterDataTabProps) {
  const [records, setRecords] = useState<MasterDataRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filter states
  const [searchTerm, setSearchTerm] = useState('')
  const [kamFilter, setKamFilter] = useState<string[]>([])
  const [teamFilter, setTeamFilter] = useState<string[]>([])
  const [zoneFilter, setZoneFilter] = useState<string[]>([])
  const [stateFilter, setStateFilter] = useState<string[]>([])
  const [healthStatusFilter, setHealthStatusFilter] = useState<string[]>([])
  const [brandNatureFilter, setBrandNatureFilter] = useState<string[]>([])
  const [churnCountMin, setChurnCountMin] = useState<string>('')
  const [churnCountMax, setChurnCountMax] = useState<string>('')

  // Get max churn count for slider
  const maxChurnCount = useMemo(() => {
    if (records.length === 0) return 100
    return Math.max(...records.map(r => r.churn_count || 0))
  }, [records])

  // Calculate statistics
  const statistics = useMemo(() => {
    const totalBrands = records.length
    const unassignedBrands = records.filter(r => r.kam_name === 'Unassigned')
    const unassignedCount = unassignedBrands.length

    // Group unassigned brands by zone
    const unassignedByZone: Record<string, number> = {}
    unassignedBrands.forEach(brand => {
      const zone = brand.zone || 'Unknown'
      unassignedByZone[zone] = (unassignedByZone[zone] || 0) + 1
    })

    return {
      totalBrands,
      unassignedCount,
      unassignedByZone
    }
  }, [records])

  useEffect(() => {
    fetchMasterData()
  }, [])

  const fetchMasterData = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/data/master-data/comprehensive')
      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to fetch master data')
      }

      setRecords(result.data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  // Get unique values for filters
  const uniqueKams = useMemo(() => {
    const kams = new Set(records.map(r => r.kam_name).filter(Boolean))
    return Array.from(kams).sort()
  }, [records])

  const uniqueTeams = useMemo(() => {
    const teams = new Set(records.map(r => r.team_name).filter(Boolean))
    return Array.from(teams).sort()
  }, [records])

  const uniqueZones = useMemo(() => {
    const zones = new Set(records.map(r => r.zone).filter(Boolean))
    return Array.from(zones).sort()
  }, [records])

  const uniqueStates = useMemo(() => {
    const states = new Set(records.map(r => r.brand_state).filter(Boolean))
    return Array.from(states).sort()
  }, [records])

  const uniqueHealthStatuses = useMemo(() => {
    const statuses = new Set(records.map(r => r.last_health_status).filter(s => s !== 'N/A'))
    return Array.from(statuses).sort()
  }, [records])

  const uniqueBrandNatures = useMemo(() => {
    const natures = new Set(records.map(r => r.last_brand_nature).filter(n => n !== 'N/A'))
    return Array.from(natures).sort()
  }, [records])

  // Filtered records
  const filteredRecords = useMemo(() => {
    return records.filter(record => {
      // Search filter
      if (searchTerm) {
        const search = searchTerm.toLowerCase()
        const matchesSearch = 
          record.brand_name?.toLowerCase().includes(search) ||
          record.brand_email_id?.toLowerCase().includes(search) ||
          record.kam_name?.toLowerCase().includes(search) ||
          record.kam_email_id?.toLowerCase().includes(search)
        
        if (!matchesSearch) return false
      }

      // KAM filter
      if (kamFilter.length > 0 && !kamFilter.includes(record.kam_name)) return false

      // Team filter
      if (teamFilter.length > 0 && !teamFilter.includes(record.team_name)) return false

      // Zone filter
      if (zoneFilter.length > 0 && !zoneFilter.includes(record.zone)) return false

      // State filter
      if (stateFilter.length > 0 && !stateFilter.includes(record.brand_state)) return false

      // Health Status filter
      if (healthStatusFilter.length > 0 && !healthStatusFilter.includes(record.last_health_status)) return false

      // Brand Nature filter
      if (brandNatureFilter.length > 0 && !brandNatureFilter.includes(record.last_brand_nature)) return false

      // Churn Count Range filter
      const churnCount = record.churn_count || 0
      const minChurn = churnCountMin ? parseInt(churnCountMin) : null
      const maxChurn = churnCountMax ? parseInt(churnCountMax) : null

      if (minChurn !== null && churnCount < minChurn) return false
      if (maxChurn !== null && churnCount > maxChurn) return false

      return true
    })
  }, [records, searchTerm, kamFilter, teamFilter, zoneFilter, stateFilter, healthStatusFilter, brandNatureFilter, churnCountMin, churnCountMax])

  const handleMultiSelectChange = (
    value: string,
    currentFilters: string[],
    setFilter: (filters: string[]) => void
  ) => {
    if (currentFilters.includes(value)) {
      setFilter(currentFilters.filter(f => f !== value))
    } else {
      setFilter([...currentFilters, value])
    }
  }

  const clearAllFilters = () => {
    setSearchTerm('')
    setKamFilter([])
    setTeamFilter([])
    setZoneFilter([])
    setStateFilter([])
    setHealthStatusFilter([])
    setBrandNatureFilter([])
    setChurnCountMin('')
    setChurnCountMax('')
  }

  const exportToCSV = () => {
    const headers = [
      'Brand Name', 'Brand Email ID', 'KAM Name', 'KAM Email ID', 
      'Brand State', 'Zone', 'Team Name', 'Outlet Count',
      'Last Health Status', 'Last Brand Nature', 'Health Check Count', 'Last Health Check Date',
      'Visit Count', 'Last Visit Date', 'Churn Count', 'Last RID in Churn',
      'Demo Done Count', 'Last Demo Date'
    ]

    const csvContent = [
      headers.join(','),
      ...filteredRecords.map(record => [
        `"${record.brand_name || ''}"`,
        `"${record.brand_email_id || ''}"`,
        `"${record.kam_name || ''}"`,
        `"${record.kam_email_id || ''}"`,
        `"${record.brand_state || ''}"`,
        `"${record.zone || ''}"`,
        `"${record.team_name || ''}"`,
        record.outlet_count || 0,
        `"${record.last_health_status || ''}"`,
        `"${record.last_brand_nature || ''}"`,
        record.health_check_count || 0,
        `"${record.last_health_check_date || ''}"`,
        record.visit_count || 0,
        `"${record.last_visit_date || ''}"`,
        record.churn_count || 0,
        `"${record.last_rid_in_churn || ''}"`,
        record.demo_done_count || 0,
        `"${record.last_demo_date || ''}"`
      ].join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `master_data_${new Date().toISOString().split('T')[0]}.csv`
    link.click()
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
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
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Total Brands Card */}
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-600 mb-1">Total Brands</p>
              <p className="text-3xl font-bold text-blue-900">{statistics.totalBrands.toLocaleString()}</p>
            </div>
            <div className="bg-blue-500 rounded-full p-3">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
          </div>
        </div>

        {/* Unassigned Brands Card */}
        <div className="bg-gradient-to-br from-orange-50 to-orange-100 border border-orange-200 rounded-lg p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-orange-600 mb-1">Unassigned Brands</p>
              <p className="text-3xl font-bold text-orange-900">{statistics.unassignedCount.toLocaleString()}</p>
              <p className="text-xs text-orange-600 mt-1">
                {statistics.totalBrands > 0 
                  ? `${((statistics.unassignedCount / statistics.totalBrands) * 100).toFixed(1)}% of total`
                  : '0% of total'}
              </p>
            </div>
            <div className="bg-orange-500 rounded-full p-3">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Pie Chart for Unassigned Brands by Zone */}
      {statistics.unassignedCount > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-secondary-800 mb-4">Unassigned Brands by Zone</h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Pie Chart */}
            <div className="flex items-center justify-center">
              <PieChart data={statistics.unassignedByZone} />
            </div>

            {/* Legend */}
            <div className="flex flex-col justify-center space-y-2">
              {Object.entries(statistics.unassignedByZone)
                .sort(([, a], [, b]) => b - a)
                .map(([zone, count], index) => {
                  const percentage = ((count / statistics.unassignedCount) * 100).toFixed(1)
                  const color = ZONE_COLORS[index % ZONE_COLORS.length]
                  return (
                    <div key={zone} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded">
                      <div className="flex items-center space-x-3">
                        <div 
                          className="w-4 h-4 rounded-full" 
                          style={{ backgroundColor: color }}
                        />
                        <span className="text-sm font-medium text-secondary-700">{zone}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-bold text-secondary-900">{count}</span>
                        <span className="text-xs text-secondary-500 ml-2">({percentage}%)</span>
                      </div>
                    </div>
                  )
                })}
            </div>
          </div>
        </div>
      )}

      {/* Header with Export */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-secondary-800">Master Data Overview</h2>
          <p className="text-sm text-secondary-600 mt-1">
            Showing {filteredRecords.length} of {records.length} brands
          </p>
        </div>
        <button
          onClick={exportToCSV}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          📥 Export to CSV
        </button>
      </div>

      {/* Search Bar */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <input
          type="text"
          placeholder="Search by Brand Name, Email, KAM Name, or KAM Email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        />
      </div>

      {/* Filters */}
      <div className="bg-gray-50 p-4 rounded-lg space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="font-medium text-secondary-800">Filters</h3>
          <button
            onClick={clearAllFilters}
            className="text-sm text-primary-600 hover:text-primary-700"
          >
            Clear All
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* KAM Filter */}
          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-2">KAM Name</label>
            <div className="max-h-40 overflow-y-auto border border-gray-300 rounded-lg p-2 bg-white">
              {uniqueKams.map(kam => (
                <label key={kam} className="flex items-center space-x-2 py-1 hover:bg-gray-50 px-2 rounded">
                  <input
                    type="checkbox"
                    checked={kamFilter.includes(kam)}
                    onChange={() => handleMultiSelectChange(kam, kamFilter, setKamFilter)}
                    className="rounded text-primary-600"
                  />
                  <span className="text-sm">{kam}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Team Filter */}
          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-2">Team Name</label>
            <div className="max-h-40 overflow-y-auto border border-gray-300 rounded-lg p-2 bg-white">
              {uniqueTeams.map(team => (
                <label key={team} className="flex items-center space-x-2 py-1 hover:bg-gray-50 px-2 rounded">
                  <input
                    type="checkbox"
                    checked={teamFilter.includes(team)}
                    onChange={() => handleMultiSelectChange(team, teamFilter, setTeamFilter)}
                    className="rounded text-primary-600"
                  />
                  <span className="text-sm">{team}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Zone Filter */}
          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-2">Zone</label>
            <div className="max-h-40 overflow-y-auto border border-gray-300 rounded-lg p-2 bg-white">
              {uniqueZones.map(zone => (
                <label key={zone} className="flex items-center space-x-2 py-1 hover:bg-gray-50 px-2 rounded">
                  <input
                    type="checkbox"
                    checked={zoneFilter.includes(zone)}
                    onChange={() => handleMultiSelectChange(zone, zoneFilter, setZoneFilter)}
                    className="rounded text-primary-600"
                  />
                  <span className="text-sm">{zone}</span>
                </label>
              ))}
            </div>
          </div>

          {/* State Filter */}
          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-2">Brand State</label>
            <div className="max-h-40 overflow-y-auto border border-gray-300 rounded-lg p-2 bg-white">
              {uniqueStates.map(state => (
                <label key={state} className="flex items-center space-x-2 py-1 hover:bg-gray-50 px-2 rounded">
                  <input
                    type="checkbox"
                    checked={stateFilter.includes(state)}
                    onChange={() => handleMultiSelectChange(state, stateFilter, setStateFilter)}
                    className="rounded text-primary-600"
                  />
                  <span className="text-sm">{state}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Health Status Filter */}
          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-2">Health Status</label>
            <div className="max-h-40 overflow-y-auto border border-gray-300 rounded-lg p-2 bg-white">
              {uniqueHealthStatuses.map(status => (
                <label key={status} className="flex items-center space-x-2 py-1 hover:bg-gray-50 px-2 rounded">
                  <input
                    type="checkbox"
                    checked={healthStatusFilter.includes(status)}
                    onChange={() => handleMultiSelectChange(status, healthStatusFilter, setHealthStatusFilter)}
                    className="rounded text-primary-600"
                  />
                  <span className="text-sm">{status}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Brand Nature Filter */}
          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-2">Brand Nature</label>
            <div className="max-h-40 overflow-y-auto border border-gray-300 rounded-lg p-2 bg-white">
              {uniqueBrandNatures.map(nature => (
                <label key={nature} className="flex items-center space-x-2 py-1 hover:bg-gray-50 px-2 rounded">
                  <input
                    type="checkbox"
                    checked={brandNatureFilter.includes(nature)}
                    onChange={() => handleMultiSelectChange(nature, brandNatureFilter, setBrandNatureFilter)}
                    className="rounded text-primary-600"
                  />
                  <span className="text-sm">{nature}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Churn Count Range Filter */}
          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-2">Churn Count Range</label>
            <div className="space-y-3">
              {/* Range Slider */}
              <div className="px-2">
                <div className="relative pt-1">
                  <div className="flex justify-between text-xs text-secondary-600 mb-2">
                    <span>{churnCountMin || '0'}</span>
                    <span>{churnCountMax || maxChurnCount}</span>
                  </div>
                  <div className="relative h-2">
                    {/* Background track */}
                    <div className="absolute w-full h-2 bg-gray-200 rounded-full" />
                    
                    {/* Active range */}
                    <div
                      className="absolute h-2 bg-primary-500 rounded-full"
                      style={{
                        left: `${((parseInt(churnCountMin) || 0) / maxChurnCount) * 100}%`,
                        right: `${100 - ((parseInt(churnCountMax) || maxChurnCount) / maxChurnCount) * 100}%`,
                      }}
                    />
                    
                    {/* Min slider */}
                    <input
                      type="range"
                      min="0"
                      max={maxChurnCount}
                      value={churnCountMin || '0'}
                      onChange={(e) => {
                        const value = e.target.value
                        const maxVal = parseInt(churnCountMax) || maxChurnCount
                        if (parseInt(value) <= maxVal) {
                          setChurnCountMin(value === '0' ? '' : value)
                        }
                      }}
                      className="absolute w-full appearance-none bg-transparent pointer-events-auto cursor-pointer"
                      style={{
                        zIndex: churnCountMin ? 25 : 20,
                      }}
                    />
                    
                    {/* Max slider */}
                    <input
                      type="range"
                      min="0"
                      max={maxChurnCount}
                      value={churnCountMax || maxChurnCount}
                      onChange={(e) => {
                        const value = e.target.value
                        const minVal = parseInt(churnCountMin) || 0
                        if (parseInt(value) >= minVal) {
                          setChurnCountMax(value === String(maxChurnCount) ? '' : value)
                        }
                      }}
                      className="absolute w-full appearance-none bg-transparent pointer-events-auto cursor-pointer"
                      style={{
                        zIndex: churnCountMax ? 25 : 20,
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Input Boxes */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-secondary-600 mb-1">Min</label>
                  <input
                    type="number"
                    placeholder="0"
                    value={churnCountMin}
                    onChange={(e) => {
                      const value = e.target.value
                      const maxVal = parseInt(churnCountMax) || maxChurnCount
                      if (value === '' || parseInt(value) <= maxVal) {
                        setChurnCountMin(value)
                      }
                    }}
                    min="0"
                    max={maxChurnCount}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs text-secondary-600 mb-1">Max</label>
                  <input
                    type="number"
                    placeholder={String(maxChurnCount)}
                    value={churnCountMax}
                    onChange={(e) => {
                      const value = e.target.value
                      const minVal = parseInt(churnCountMin) || 0
                      if (value === '' || parseInt(value) >= minVal) {
                        setChurnCountMax(value)
                      }
                    }}
                    min="0"
                    max={maxChurnCount}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Helper Text */}
              {(churnCountMin || churnCountMax) && (
                <p className="text-xs text-secondary-600 text-center">
                  {churnCountMin && churnCountMax 
                    ? `Showing: ${churnCountMin} - ${churnCountMax} churns`
                    : churnCountMin 
                    ? `Showing: ≥ ${churnCountMin} churns`
                    : `Showing: ≤ ${churnCountMax} churns`}
                </p>
              )}
            </div>
            
            <style jsx>{`
              input[type="range"] {
                -webkit-appearance: none;
                height: 8px;
              }
              
              input[type="range"]::-webkit-slider-thumb {
                -webkit-appearance: none;
                appearance: none;
                width: 18px;
                height: 18px;
                border-radius: 50%;
                background: #3b82f6;
                cursor: pointer;
                border: 2px solid white;
                box-shadow: 0 2px 4px rgba(0,0,0,0.2);
              }
              
              input[type="range"]::-moz-range-thumb {
                width: 18px;
                height: 18px;
                border-radius: 50%;
                background: #3b82f6;
                cursor: pointer;
                border: 2px solid white;
                box-shadow: 0 2px 4px rgba(0,0,0,0.2);
              }
              
              input[type="range"]::-webkit-slider-thumb:hover {
                background: #2563eb;
              }
              
              input[type="range"]::-moz-range-thumb:hover {
                background: #2563eb;
              }
            `}</style>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto border border-gray-200 rounded-lg">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-secondary-700 uppercase tracking-wider sticky left-0 bg-gray-50 z-10">Brand Name</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-secondary-700 uppercase tracking-wider">Brand Email</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-secondary-700 uppercase tracking-wider">KAM Name</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-secondary-700 uppercase tracking-wider">KAM Email</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-secondary-700 uppercase tracking-wider">State</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-secondary-700 uppercase tracking-wider">Zone</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-secondary-700 uppercase tracking-wider">Team</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-secondary-700 uppercase tracking-wider">Outlets</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-secondary-700 uppercase tracking-wider">Health Status</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-secondary-700 uppercase tracking-wider">Brand Nature</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-secondary-700 uppercase tracking-wider">Health Checks</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-secondary-700 uppercase tracking-wider">Last Health Check</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-secondary-700 uppercase tracking-wider">Visits</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-secondary-700 uppercase tracking-wider">Last Visit</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-secondary-700 uppercase tracking-wider">Churns</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-secondary-700 uppercase tracking-wider">Last RID</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-secondary-700 uppercase tracking-wider">Demos</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-secondary-700 uppercase tracking-wider">Last Demo</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredRecords.length === 0 ? (
              <tr>
                <td colSpan={18} className="px-4 py-8 text-center text-secondary-500">
                  No records found
                </td>
              </tr>
            ) : (
              filteredRecords.map((record, index) => (
                <tr key={record.brand_id || index} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-secondary-900 sticky left-0 bg-white">{record.brand_name}</td>
                  <td className="px-4 py-3 text-sm text-secondary-600">{record.brand_email_id}</td>
                  <td className="px-4 py-3 text-sm text-secondary-900">{record.kam_name}</td>
                  <td className="px-4 py-3 text-sm text-secondary-600">{record.kam_email_id}</td>
                  <td className="px-4 py-3 text-sm text-secondary-600">{record.brand_state}</td>
                  <td className="px-4 py-3 text-sm text-secondary-600">{record.zone}</td>
                  <td className="px-4 py-3 text-sm text-secondary-600">{record.team_name}</td>
                  <td className="px-4 py-3 text-sm text-secondary-600">{record.outlet_count}</td>
                  <td className="px-4 py-3 text-sm">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      record.last_health_status === 'Healthy' ? 'bg-green-100 text-green-800' :
                      record.last_health_status === 'At Risk' ? 'bg-yellow-100 text-yellow-800' :
                      record.last_health_status === 'Critical' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {record.last_health_status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-secondary-600">{record.last_brand_nature}</td>
                  <td className="px-4 py-3 text-sm text-center text-secondary-900">{record.health_check_count}</td>
                  <td className="px-4 py-3 text-sm text-secondary-600">
                    {record.last_health_check_date ? new Date(record.last_health_check_date).toLocaleDateString() : '-'}
                  </td>
                  <td className="px-4 py-3 text-sm text-center text-secondary-900">{record.visit_count}</td>
                  <td className="px-4 py-3 text-sm text-secondary-600">
                    {record.last_visit_date ? new Date(record.last_visit_date).toLocaleDateString() : '-'}
                  </td>
                  <td className="px-4 py-3 text-sm text-center text-secondary-900">{record.churn_count}</td>
                  <td className="px-4 py-3 text-sm text-secondary-600">{record.last_rid_in_churn}</td>
                  <td className="px-4 py-3 text-sm text-center text-secondary-900">{record.demo_done_count}</td>
                  <td className="px-4 py-3 text-sm text-secondary-600">
                    {record.last_demo_date ? new Date(record.last_demo_date).toLocaleDateString() : '-'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
