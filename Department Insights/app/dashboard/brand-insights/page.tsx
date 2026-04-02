'use client'

import { useBrands, usePrices, useRevenueRecords, useDataContext, useChurnRecords, usePriceData, useExpenseRecords } from '@/lib/data-context'
import { TimelineSkeleton } from '@/components/TimelineSkeleton'
import { BrandWithKAM, RevenueRecord } from '@/lib/types'
import { calculateSwitchingCostIndex, BrandSCI } from '@/lib/switching-cost-calculator'
import { ChurnAnalysis } from '@/components/ChurnAnalysis'
import { ExpenseAnalysis } from '@/components/ExpenseAnalysis'
import Link from 'next/link'
import { useMemo, useState } from 'react'

// POS Core Business Products
const POS_CORE_PRODUCTS = [
  'Android POS',
  'Android POS - Renewal income',
  'Pos subscription',
  'POS Subscription - Renewal',
  'POS+'
]

/**
 * Get the latest KAM name from a brand's KAM assignment
 * Checks kam_name_6, kam_name_5, kam_name_4, kam_name_3, kam_name_2, kam_name_1 in order
 */
function getLatestKAM(brand: BrandWithKAM): string | null {
  if (!brand.kam_assignment) return null
  
  const kam = brand.kam_assignment
  
  // Check from latest to earliest
  if (kam.kam_name_6 && kam.kam_name_6.trim()) return kam.kam_name_6.trim()
  if (kam.kam_name_5 && kam.kam_name_5.trim()) return kam.kam_name_5.trim()
  if (kam.kam_name_4 && kam.kam_name_4.trim()) return kam.kam_name_4.trim()
  if (kam.kam_name_3 && kam.kam_name_3.trim()) return kam.kam_name_3.trim()
  if (kam.kam_name_2 && kam.kam_name_2.trim()) return kam.kam_name_2.trim()
  if (kam.kam_name_1 && kam.kam_name_1.trim()) return kam.kam_name_1.trim()
  
  return null
}

interface BrandRevenue {
  brand: BrandWithKAM
  posRevenue: number
  totalRevenue: number
  posRank: number
  totalRank: number
}

function calculateBrandRevenues(
  brands: BrandWithKAM[],
  revenueRecords: RevenueRecord[]
): BrandRevenue[] {
  const brandRevenueMap = new Map<string, { pos: number; total: number }>()
  
  // Initialize all brands
  brands.forEach(brand => {
    const outletIds = brand.outlets.map(o => o.restaurant_id)
    outletIds.forEach(id => {
      if (!brandRevenueMap.has(brand.restaurant_id)) {
        brandRevenueMap.set(brand.restaurant_id, { pos: 0, total: 0 })
      }
    })
  })
  
  // Calculate revenue from records
  revenueRecords.forEach(record => {
    // Find which brand this outlet belongs to
    const brand = brands.find(b => 
      b.outlets.some(o => o.restaurant_id === record.restaurant_id)
    )
    
    if (brand) {
      const current = brandRevenueMap.get(brand.restaurant_id) || { pos: 0, total: 0 }
      
      // Check if it's a POS core product
      const isPosCore = POS_CORE_PRODUCTS.some(product => 
        record.product_or_service_name.trim().toLowerCase() === product.toLowerCase()
      )
      
      if (isPosCore) {
        current.pos += record.amount
      }
      current.total += record.amount
      
      brandRevenueMap.set(brand.restaurant_id, current)
    }
  })
  
  // Create array with revenue data
  const brandRevenues: BrandRevenue[] = brands.map(brand => ({
    brand,
    posRevenue: brandRevenueMap.get(brand.restaurant_id)?.pos || 0,
    totalRevenue: brandRevenueMap.get(brand.restaurant_id)?.total || 0,
    posRank: 0,
    totalRank: 0
  }))
  
  // Sort and assign ranks for POS revenue
  const sortedByPos = [...brandRevenues].sort((a, b) => b.posRevenue - a.posRevenue)
  sortedByPos.forEach((item, index) => {
    const original = brandRevenues.find(br => br.brand.restaurant_id === item.brand.restaurant_id)
    if (original) original.posRank = index + 1
  })
  
  // Sort and assign ranks for total revenue
  const sortedByTotal = [...brandRevenues].sort((a, b) => b.totalRevenue - a.totalRevenue)
  sortedByTotal.forEach((item, index) => {
    const original = brandRevenues.find(br => br.brand.restaurant_id === item.brand.restaurant_id)
    if (original) original.totalRank = index + 1
  })
  
  return brandRevenues
}

export default function BrandInsightsPage() {
  const brands = useBrands()
  const prices = usePrices()
  const priceData = usePriceData()
  const revenueRecords = useRevenueRecords()
  const churnRecords = useChurnRecords()
  const expenseRecords = useExpenseRecords()
  const { isLoading, error, brandRecords, kamRecords } = useDataContext()
  
  // View mode state
  const [viewMode, setViewMode] = useState<'revenue' | 'switching-cost' | 'churn-analysis' | 'expense-analysis'>('revenue')
  
  // Filter states
  const [selectedKAM, setSelectedKAM] = useState<string>('all')
  const [minOutlets, setMinOutlets] = useState<number>(0)
  const [maxOutlets, setMaxOutlets] = useState<number>(1000)
  
  const brandRevenues = useMemo(() => 
    calculateBrandRevenues(brands, revenueRecords),
    [brands, revenueRecords]
  )
  
  // Calculate SCI for all brands
  const brandSCIData = useMemo(() => 
    calculateSwitchingCostIndex(brandRecords, kamRecords),
    [brandRecords, kamRecords]
  )
  
  // Get unique KAMs for dropdown (using latest KAM from all kam_name fields)
  const uniqueKAMs = useMemo(() => {
    const kams = new Set<string>()
    let hasUnassigned = false
    
    brands.forEach(brand => {
      const latestKAM = getLatestKAM(brand)
      
      if (latestKAM) {
        kams.add(latestKAM)
      } else {
        hasUnassigned = true
      }
    })
    
    const kamList = Array.from(kams).sort()
    
    // Add "Unassigned" option if there are brands without KAM
    if (hasUnassigned) {
      kamList.push('Unassigned')
    }
    
    return kamList
  }, [brands])
  
  // Get outlet count range
  const outletRange = useMemo(() => {
    const counts = brands.map(b => b.outlets.length)
    return {
      min: Math.min(...counts, 0),
      max: Math.max(...counts, 100)
    }
  }, [brands])
  
  // Apply filters
  const filteredBrandRevenues = useMemo(() => {
    return brandRevenues.filter(br => {
      // KAM filter - use latest KAM from all kam_name fields
      if (selectedKAM !== 'all') {
        const latestKAM = getLatestKAM(br.brand)
        
        if (selectedKAM === 'Unassigned') {
          // Show only brands without any KAM assignment
          if (latestKAM) return false
        } else {
          // Show only brands with matching KAM
          if (latestKAM !== selectedKAM) return false
        }
      }
      
      // Outlet count filter
      const outletCount = br.brand.outlets.length
      if (outletCount < minOutlets || outletCount > maxOutlets) {
        return false
      }
      
      return true
    })
  }, [brandRevenues, selectedKAM, minOutlets, maxOutlets])
  
  // Apply filters to SCI data
  const filteredBrandSCI = useMemo(() => {
    return brandSCIData.filter(sci => {
      // KAM filter
      if (selectedKAM !== 'all') {
        if (selectedKAM === 'Unassigned') {
          if (sci.kamName !== 'Unassigned') return false
        } else {
          if (sci.kamName !== selectedKAM) return false
        }
      }
      
      // Outlet count filter
      if (sci.totalOutlets < minOutlets || sci.totalOutlets > maxOutlets) {
        return false
      }
      
      return true
    })
  }, [brandSCIData, selectedKAM, minOutlets, maxOutlets])

  if (isLoading) {
    return (
      <main className="min-h-screen bg-gray-50 py-12 px-4">
        <TimelineSkeleton />
      </main>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-red-600">Error: {error}</div>
      </div>
    )
  }

  if (brands.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-600">No data available. Please ensure CSV files are loaded.</div>
      </div>
    )
  }

  // Calculate insights based on filtered data
  const totalBrands = filteredBrandRevenues.length
  const totalOutlets = filteredBrandRevenues.reduce((sum, br) => sum + br.brand.outlets.length, 0)
  
  // Calculate total revenues from filtered brands
  const totalPosRevenue = filteredBrandRevenues.reduce((sum, br) => sum + br.posRevenue, 0)
  const totalServiceRevenue = filteredBrandRevenues.reduce((sum, br) => sum + br.totalRevenue, 0)
  const servicesOnlyRevenue = totalServiceRevenue - totalPosRevenue // Services excluding POS
  
  // Sort brands by POS revenue for display
  const sortedBrands = [...filteredBrandRevenues].sort((a, b) => b.posRevenue - a.posRevenue)
  
  // Reset outlet range when filters change
  const handleResetFilters = () => {
    setSelectedKAM('all')
    setMinOutlets(outletRange.min)
    setMaxOutlets(outletRange.max)
  }
  
  // Download CSV function
  const handleDownloadCSV = () => {
    // Prepare CSV headers
    const headers = [
      'POS Rank',
      'Total Rank',
      'Brand Name',
      'Email',
      'KAM',
      'Outlets',
      'POS Revenue',
      'Total Revenue'
    ]
    
    // Prepare CSV rows
    const rows = sortedBrands.map(br => [
      br.posRank,
      br.totalRank,
      br.brand.kam_assignment?.brand_name || br.brand.email,
      br.brand.email,
      getLatestKAM(br.brand) || 'Unassigned',
      br.brand.outlets.length,
      br.posRevenue,
      br.totalRevenue
    ])
    
    // Create CSV content
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => {
        // Escape cells that contain commas or quotes
        const cellStr = String(cell)
        if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
          return `"${cellStr.replace(/"/g, '""')}"`
        }
        return cellStr
      }).join(','))
    ].join('\n')
    
    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    
    link.setAttribute('href', url)
    link.setAttribute('download', `brand-insights-${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <main className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Brand Insights</h1>
          <button
            onClick={handleDownloadCSV}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors font-medium"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Download CSV
          </button>
        </div>
        
        {/* View Mode Tabs */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              <button
                onClick={() => setViewMode('revenue')}
                className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  viewMode === 'revenue'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Revenue Based
              </button>
              <button
                onClick={() => setViewMode('switching-cost')}
                className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  viewMode === 'switching-cost'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Switching Cost Index
              </button>
              <button
                onClick={() => setViewMode('churn-analysis')}
                className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  viewMode === 'churn-analysis'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Churn Analysis
              </button>
              <button
                onClick={() => setViewMode('expense-analysis')}
                className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  viewMode === 'expense-analysis'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Expense Analysis
              </button>
            </nav>
          </div>
        </div>
        
        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Filters</h2>
            <button
              onClick={handleResetFilters}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              Reset Filters
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* KAM Filter */}
            <div>
              <label htmlFor="kam-filter" className="block text-sm font-medium text-gray-700 mb-2">
                Filter by KAM
              </label>
              <select
                id="kam-filter"
                value={selectedKAM}
                onChange={(e) => setSelectedKAM(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All KAMs</option>
                {uniqueKAMs.map(kam => (
                  <option key={kam} value={kam}>{kam}</option>
                ))}
              </select>
            </div>
            
            {/* Outlet Count Range Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Filter by Outlet Count
              </label>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="min-outlets" className="text-xs text-gray-600 block mb-1">Min Outlets</label>
                  <input
                    id="min-outlets"
                    type="number"
                    min={outletRange.min}
                    max={maxOutlets}
                    value={minOutlets}
                    onChange={(e) => {
                      const val = Number(e.target.value)
                      if (val <= maxOutlets) setMinOutlets(val)
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label htmlFor="max-outlets" className="text-xs text-gray-600 block mb-1">Max Outlets</label>
                  <input
                    id="max-outlets"
                    type="number"
                    min={minOutlets}
                    max={outletRange.max}
                    value={maxOutlets}
                    onChange={(e) => {
                      const val = Number(e.target.value)
                      if (val >= minOutlets) setMaxOutlets(val)
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>
          </div>
          
          {/* Active Filters Display */}
          {(selectedKAM !== 'all' || minOutlets !== outletRange.min || maxOutlets !== outletRange.max) && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex flex-wrap gap-2">
                <span className="text-sm text-gray-600">Active filters:</span>
                {selectedKAM !== 'all' && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800">
                    KAM: {selectedKAM}
                    <button
                      onClick={() => setSelectedKAM('all')}
                      className="ml-2 hover:text-blue-900"
                    >
                      ×
                    </button>
                  </span>
                )}
                {(minOutlets !== outletRange.min || maxOutlets !== outletRange.max) && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-green-100 text-green-800">
                    Outlets: {minOutlets}-{maxOutlets}
                    <button
                      onClick={() => {
                        setMinOutlets(outletRange.min)
                        setMaxOutlets(outletRange.max)
                      }}
                      className="ml-2 hover:text-green-900"
                    >
                      ×
                    </button>
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
        
        {/* Summary Cards */}
        {viewMode === 'revenue' && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-xs font-medium text-gray-500 mb-1">
              {filteredBrandRevenues.length < brandRevenues.length ? 'Filtered Brands' : 'Total Brands'}
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {totalBrands}
              {filteredBrandRevenues.length < brandRevenues.length && (
                <span className="text-sm text-gray-500 ml-1">/ {brandRevenues.length}</span>
              )}
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-xs font-medium text-gray-500 mb-1">Total Outlets</div>
            <div className="text-2xl font-bold text-gray-900">{totalOutlets.toLocaleString()}</div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-xs font-medium text-gray-500 mb-1">POS Revenue (Core)</div>
            <div className="text-2xl font-bold text-blue-600">₹{(totalPosRevenue / 10000000).toFixed(2)}Cr</div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-xs font-medium text-gray-500 mb-1">Services Revenue</div>
            <div className="text-2xl font-bold text-purple-600">₹{(servicesOnlyRevenue / 10000000).toFixed(2)}Cr</div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-xs font-medium text-gray-500 mb-1">Total Revenue</div>
            <div className="text-2xl font-bold text-green-600">₹{(totalServiceRevenue / 10000000).toFixed(2)}Cr</div>
          </div>
        </div>

        {/* KAM Summary Table */}
        <div className="bg-white rounded-lg shadow mb-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">KAM Summary</h2>
            <p className="text-sm text-gray-500 mt-1">Total brands, outlets and revenue per KAM</p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">KAM</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total Brand</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total Outlet</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total Revenue</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {(() => {
                  const kamMap = new Map<string, { brands: number; outlets: number; revenue: number }>()
                  filteredBrandRevenues.forEach(br => {
                    const kam = getLatestKAM(br.brand) || 'Unassigned'
                    const existing = kamMap.get(kam) || { brands: 0, outlets: 0, revenue: 0 }
                    kamMap.set(kam, {
                      brands: existing.brands + 1,
                      outlets: existing.outlets + br.brand.outlets.length,
                      revenue: existing.revenue + br.totalRevenue
                    })
                  })
                  return Array.from(kamMap.entries())
                    .sort((a, b) => b[1].revenue - a[1].revenue)
                    .map(([kam, data]) => (
                      <tr key={kam} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{kam}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-700">{data.brands}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-700">{data.outlets.toLocaleString()}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-semibold text-green-600">₹{data.revenue.toLocaleString()}</td>
                      </tr>
                    ))
                })()}
              </tbody>
            </table>
          </div>
        </div>

        {/* Brand List */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Brand Rankings</h2>
            <p className="text-sm text-gray-500 mt-1">
              Ranked by POS Revenue (Core Business) • Showing {sortedBrands.length} brands
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    POS Rank
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Brand Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    KAM
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Outlets
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    POS Revenue
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Revenue
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Rank
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sortedBrands.map((brandRevenue) => {
                  const brand = brandRevenue.brand
                  return (
                    <tr key={brand.restaurant_id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <span className={`text-sm font-bold ${
                            brandRevenue.posRank <= 3 ? 'text-yellow-600' : 
                            brandRevenue.posRank <= 10 ? 'text-blue-600' : 
                            'text-gray-900'
                          }`}>
                            #{brandRevenue.posRank}
                          </span>
                          {brandRevenue.posRank === 1 && <span className="ml-2">🥇</span>}
                          {brandRevenue.posRank === 2 && <span className="ml-2">🥈</span>}
                          {brandRevenue.posRank === 3 && <span className="ml-2">🥉</span>}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {brand.kam_assignment?.brand_name || brand.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {getLatestKAM(brand) || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {brand.outlets.length}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-semibold text-blue-600">
                        ₹{brandRevenue.posRevenue.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-semibold text-green-600">
                        ₹{brandRevenue.totalRevenue.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-500">
                        #{brandRevenue.totalRank}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <Link
                          href={`/dashboard/brand-journey/${brand.restaurant_id}`}
                          className="text-blue-600 hover:text-blue-800 font-medium"
                        >
                          View Journey
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
          </>
        )}
        
        {/* Switching Cost Index View */}
        {viewMode === 'switching-cost' && (
          <>
            {/* Summary Cards for SCI */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-white rounded-lg shadow p-4">
                <div className="text-xs font-medium text-gray-500 mb-1">
                  {filteredBrandSCI.length < brandSCIData.length ? 'Filtered Brands' : 'Total Brands'}
                </div>
                <div className="text-2xl font-bold text-gray-900">
                  {filteredBrandSCI.length}
                  {filteredBrandSCI.length < brandSCIData.length && (
                    <span className="text-sm text-gray-500 ml-1">/ {brandSCIData.length}</span>
                  )}
                </div>
              </div>
              
              <div className="bg-white rounded-lg shadow p-4">
                <div className="text-xs font-medium text-gray-500 mb-1">High Switching Cost</div>
                <div className="text-2xl font-bold text-green-600">
                  {filteredBrandSCI.filter(b => b.switchingCostCategory === 'High').length}
                </div>
                <div className="text-xs text-gray-500 mt-1">Sticky Customers</div>
              </div>
              
              <div className="bg-white rounded-lg shadow p-4">
                <div className="text-xs font-medium text-gray-500 mb-1">Medium Switching Cost</div>
                <div className="text-2xl font-bold text-yellow-600">
                  {filteredBrandSCI.filter(b => b.switchingCostCategory === 'Medium').length}
                </div>
                <div className="text-xs text-gray-500 mt-1">Moderate Risk</div>
              </div>
              
              <div className="bg-white rounded-lg shadow p-4">
                <div className="text-xs font-medium text-gray-500 mb-1">Low Switching Cost</div>
                <div className="text-2xl font-bold text-red-600">
                  {filteredBrandSCI.filter(b => b.switchingCostCategory === 'Low').length}
                </div>
                <div className="text-xs text-gray-500 mt-1">Churn Risk</div>
              </div>
            </div>

            {/* SCI Table */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">Switching Cost Index Rankings</h2>
                <p className="text-sm text-gray-500 mt-1">
                  Brands ranked by their switching cost index • Higher SCI = More difficult to switch
                </p>
              </div>
              
              {/* SCI Explanation Section */}
              <details className="px-6 py-4 border-b border-gray-200 bg-blue-50">
                <summary className="cursor-pointer text-sm font-semibold text-blue-900 hover:text-blue-700 flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  How is SCI Calculated? (Click to expand)
                </summary>
                
                <div className="mt-4 space-y-4 text-sm text-gray-700">
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">What is SCI?</h3>
                    <p>
                      The Switching Cost Index (SCI) measures how difficult it would be for a brand to switch away from our platform. 
                      Higher SCI means the brand is more "locked in" and less likely to churn.
                    </p>
                  </div>
                  
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Calculation Formula</h3>
                    <div className="bg-white p-4 rounded border border-blue-200 space-y-2 font-mono text-xs">
                      <div><strong>1. Density Score:</strong> density = total_active_modules / total_outlets</div>
                      <div><strong>2. Spread Score:</strong> For each product: spread = outlets_with_product / total_outlets</div>
                      <div className="ml-4">spreadScore = average of all product spreads</div>
                      <div><strong>3. SCI Embedded:</strong> SCI_embedded = Σ(spread × weight) / total_weight</div>
                      <div><strong>4. Scale Score:</strong> scale_score = log(total_outlets) / log(max_outlets)</div>
                      <div><strong>5. Final SCI:</strong> SCI = SCI_embedded × (0.5 + 0.5 × scale_score)</div>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Example Calculation</h3>
                    <div className="bg-white p-4 rounded border border-blue-200 space-y-2">
                      <p className="font-semibold">Brand "Pizza Co" with 10 outlets:</p>
                      <ul className="list-disc list-inside space-y-1 ml-2">
                        <li>Captain_Application: active in 7 outlets → spread = 0.7</li>
                        <li>Inventory_Application: active in 5 outlets → spread = 0.5</li>
                        <li>Petpooja_Payroll: active in 3 outlets → spread = 0.3</li>
                        <li>All other 37 products: active in 0 outlets → spread = 0.0</li>
                      </ul>
                      <div className="mt-2 pt-2 border-t border-gray-200">
                        <p><strong>spreadScore</strong> = (0.7 + 0.5 + 0.3 + 0 + ... + 0) / 40 = 0.0375</p>
                        <p><strong>SCI_embedded</strong> = (0.7×3 + 0.5×3 + 0.3×2) / total_weight</p>
                        <p className="text-xs text-gray-600 mt-1">
                          (Captain & Inventory have weight 3, Payroll has weight 2)
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Product Weights (Importance)</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-green-50 p-3 rounded border border-green-200">
                        <h4 className="font-semibold text-green-900 mb-1">High Weight (3) - Deeply Embedded</h4>
                        <ul className="text-xs space-y-0.5">
                          <li>• Captain Application</li>
                          <li>• Kitchen Display System</li>
                          <li>• Inventory Application</li>
                          <li>• Petpooja Loyalty</li>
                          <li>• Self Order Kiosk</li>
                          <li>• Waiter Calling Device</li>
                          <li>• Dynamic Reports</li>
                          <li>• Reservation Manager App</li>
                        </ul>
                      </div>
                      <div className="bg-yellow-50 p-3 rounded border border-yellow-200">
                        <h4 className="font-semibold text-yellow-900 mb-1">Medium Weight (2) - Important</h4>
                        <ul className="text-xs space-y-0.5">
                          <li>• Petpooja Payroll</li>
                          <li>• Petpooja Growth Plan</li>
                          <li>• Petpooja Scale Plan</li>
                          <li>• Petpooja Scan Order</li>
                          <li>• POS Scale/Growth Plans</li>
                        </ul>
                        <p className="text-xs text-gray-600 mt-2">All other products have weight 1</p>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">SCI Categories</h3>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">High</span>
                        <span>SCI ≥ 0.6 - Sticky customers, low churn risk</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">Medium</span>
                        <span>0.3 ≤ SCI &lt; 0.6 - Moderate risk</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">Low</span>
                        <span>SCI &lt; 0.3 - High churn risk</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-blue-100 p-3 rounded border border-blue-300">
                    <h3 className="font-semibold text-blue-900 mb-1">Key Insight</h3>
                    <p className="text-xs">
                      Brands using multiple high-weight products (like Kitchen Display System, Captain Application, Inventory) 
                      across many outlets will have the highest SCI and lowest churn risk. Focus on increasing adoption of 
                      high-weight products to improve customer retention.
                    </p>
                  </div>
                </div>
              </details>
         
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Rank
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Brand Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        KAM
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Outlets
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Density
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Spread Score
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        SCI
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Category
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredBrandSCI.map((sci, index) => (
                      <tr key={`${sci.brandName}-${index}`} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <span className={`text-sm font-bold ${
                              index < 3 ? 'text-yellow-600' : 
                              index < 10 ? 'text-blue-600' : 
                              'text-gray-900'
                            }`}>
                              #{index + 1}
                            </span>
                            {index === 0 && <span className="ml-2">🥇</span>}
                            {index === 1 && <span className="ml-2">🥈</span>}
                            {index === 2 && <span className="ml-2">🥉</span>}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {sci.brandName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {sci.kamName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-500">
                          {sci.totalOutlets}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-900">
                          {sci.density.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-900">
                          {sci.spreadScore.toFixed(3)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                          <span className={`font-bold ${
                            sci.sci >= 0.6 ? 'text-green-600' :
                            sci.sci >= 0.3 ? 'text-yellow-600' :
                            'text-red-600'
                          }`}>
                            {sci.sci.toFixed(3)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            sci.switchingCostCategory === 'High' 
                              ? 'bg-green-100 text-green-800' 
                              : sci.switchingCostCategory === 'Medium'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {sci.switchingCostCategory}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
        
        {/* Churn Analysis View */}
        {viewMode === 'churn-analysis' && (
          <ChurnAnalysis
            churnRecords={churnRecords}
            brands={brands}
            priceData={priceData}
            revenueRecords={revenueRecords}
            selectedKAM={selectedKAM}
            minOutlets={minOutlets}
            maxOutlets={maxOutlets}
          />
        )}
        
        {/* Expense Analysis View */}
        {viewMode === 'expense-analysis' && (
          <ExpenseAnalysis
            expenseRecords={expenseRecords}
            brands={brands}
            selectedKAM={selectedKAM}
            minOutlets={minOutlets}
            maxOutlets={maxOutlets}
          />
        )}
      </div>
    </main>
  )
}
