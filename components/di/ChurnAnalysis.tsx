'use client'

import React, { useMemo, useState } from 'react'
import { BrandWithKAM, ChurnRecord, PriceData, RevenueRecord } from '@/lib/di-types'
import { calculateChurnAnalysis, ChurnAnalysis as ChurnAnalysisType, ChurnReasonData } from '@/lib/di-churn-calculator'

interface ChurnAnalysisProps {
  churnRecords: ChurnRecord[]
  brands: BrandWithKAM[]
  priceData: PriceData[]
  revenueRecords: RevenueRecord[]
  selectedKAM?: string
  minOutlets?: number
  maxOutlets?: number
}

export function ChurnAnalysis({ 
  churnRecords, 
  brands, 
  priceData, 
  revenueRecords,
  selectedKAM = 'all',
  minOutlets = 0,
  maxOutlets = 1000
}: ChurnAnalysisProps) {
  const [currentPage, setCurrentPage] = useState(1)
  const [kamCurrentPage, setKamCurrentPage] = useState(1)
  const [showOtherPopover, setShowOtherPopover] = useState(false)
  const itemsPerPage = 10

  // Filter brands based on KAM and outlet count
  const filteredBrands = useMemo(() => {
    return brands.filter(brand => {
      // KAM filter
      if (selectedKAM !== 'all') {
        const latestKAM = getLatestKAM(brand)
        if (selectedKAM === 'Unassigned') {
          if (latestKAM) return false
        } else {
          if (latestKAM !== selectedKAM) return false
        }
      }
      
      // Outlet count filter
      const outletCount = brand.outlets.length
      if (outletCount < minOutlets || outletCount > maxOutlets) {
        return false
      }
      
      return true
    })
  }, [brands, selectedKAM, minOutlets, maxOutlets])

  // Filter churn records to only include outlets from filtered brands
  const filteredChurnRecords = useMemo(() => {
    const filteredBrandIds = new Set<string>()
    filteredBrands.forEach(brand => {
      filteredBrandIds.add(brand.restaurant_id)
      brand.outlets.forEach(outlet => {
        filteredBrandIds.add(outlet.restaurant_id)
      })
    })
    
    return churnRecords.filter(churn => 
      filteredBrandIds.has(churn.restaurant_id)
    )
  }, [churnRecords, filteredBrands])

  const analysis = useMemo(() => 
    calculateChurnAnalysis(filteredChurnRecords, filteredBrands, priceData, revenueRecords),
    [filteredChurnRecords, filteredBrands, priceData, revenueRecords]
  )

  // Reset pagination when filters change
  React.useEffect(() => {
    setCurrentPage(1)
    setKamCurrentPage(1)
  }, [selectedKAM, minOutlets, maxOutlets])

  // Helper function to get latest KAM
  function getLatestKAM(brand: BrandWithKAM): string | null {
    if (!brand.kam_assignment) return null
    
    const kam = brand.kam_assignment
    
    if (kam.kam_name_6 && kam.kam_name_6.trim()) return kam.kam_name_6.trim()
    if (kam.kam_name_5 && kam.kam_name_5.trim()) return kam.kam_name_5.trim()
    if (kam.kam_name_4 && kam.kam_name_4.trim()) return kam.kam_name_4.trim()
    if (kam.kam_name_3 && kam.kam_name_3.trim()) return kam.kam_name_3.trim()
    if (kam.kam_name_2 && kam.kam_name_2.trim()) return kam.kam_name_2.trim()
    if (kam.kam_name_1 && kam.kam_name_1.trim()) return kam.kam_name_1.trim()
    
    return null
  }

  // Pagination calculations
  const totalPages = Math.ceil(analysis.brandChurnData.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentBrands = analysis.brandChurnData.slice(startIndex, endIndex)

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)))
  }

  // KAM pagination calculations
  const kamTotalPages = Math.ceil(analysis.kamChurnData.length / itemsPerPage)
  const kamStartIndex = (kamCurrentPage - 1) * itemsPerPage
  const kamEndIndex = kamStartIndex + itemsPerPage
  const currentKAMs = analysis.kamChurnData.slice(kamStartIndex, kamEndIndex)

  const goToKamPage = (page: number) => {
    setKamCurrentPage(Math.max(1, Math.min(page, kamTotalPages)))
  }

  if (!analysis || analysis.monthlyData.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-8 text-center">
        <p className="text-gray-500">No churn data available for analysis.</p>
      </div>
    )
  }

  // Pie chart helpers
  const PIE_COLORS = [
    '#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6',
    '#8b5cf6', '#ec4899', '#14b8a6', '#f59e0b', '#6366f1'
  ]

  function buildPieSlices(data: ChurnReasonData[]) {
    // Show top 8, group rest as "Other"
    const top = data.slice(0, 8)
    const rest = data.slice(8)
    const items = rest.length > 0
      ? [...top, { reason: 'Other', count: rest.reduce((s, d) => s + d.count, 0), percentage: rest.reduce((s, d) => s + d.percentage, 0) }]
      : top

    let cumAngle = -Math.PI / 2 // start at top
    return items.map((item, i) => {
      const angle = (item.percentage / 100) * 2 * Math.PI
      const startAngle = cumAngle
      cumAngle += angle
      const endAngle = cumAngle
      const cx = 160, cy = 160, r = 130
      const x1 = cx + r * Math.cos(startAngle)
      const y1 = cy + r * Math.sin(startAngle)
      const x2 = cx + r * Math.cos(endAngle)
      const y2 = cy + r * Math.sin(endAngle)
      const largeArc = angle > Math.PI ? 1 : 0
      const midAngle = startAngle + angle / 2
      const labelR = r * 0.65
      const lx = cx + labelR * Math.cos(midAngle)
      const ly = cy + labelR * Math.sin(midAngle)
      return { ...item, path: `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`, lx, ly, color: PIE_COLORS[i % PIE_COLORS.length], angle }
    })
  }

  const otherReasons = analysis.churnReasonData.slice(8)
  const pieSlices = buildPieSlices(analysis.churnReasonData)

  return (
    <div className="space-y-8">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-xs font-medium text-gray-500 mb-1">Total Churned Outlets</div>
          <div className="text-2xl font-bold text-red-600">{analysis.totalChurnCount.toLocaleString()}</div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-xs font-medium text-gray-500 mb-1">Total Revenue Lost</div>
          <div className="text-2xl font-bold text-red-600">₹{(analysis.totalRevenueLost / 10000000).toFixed(2)}Cr</div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-xs font-medium text-gray-500 mb-1">Average Churn Rate</div>
          <div className="text-2xl font-bold text-orange-600">{analysis.averageChurnRate.toFixed(2)}%</div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-xs font-medium text-gray-500 mb-1">Brands Affected</div>
          <div className="text-2xl font-bold text-gray-900">{analysis.brandChurnData.length}</div>
        </div>
      </div>

      {/* Churn Reason Breakdown - Pie Chart */}
      {analysis.churnReasonData.length > 0 && (
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Churn Reason Breakdown</h2>
            <p className="text-sm text-gray-500 mt-1">Distribution of churn reasons across all churned outlets</p>
          </div>
          <div className="p-6 flex flex-col md:flex-row items-center gap-8">
            {/* Pie Chart */}
            <div className="flex-shrink-0">
              <svg width="320" height="320" viewBox="0 0 320 320">
                {pieSlices.map((slice, i) => (
                  <g key={i}>
                    <path d={slice.path} fill={slice.color} stroke="white" strokeWidth="2" />
                    {slice.angle > 0.2 && (
                      <text
                        x={slice.lx}
                        y={slice.ly}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fill="white"
                        fontSize="11"
                        fontWeight="600"
                      >
                        {slice.percentage.toFixed(1)}%
                      </text>
                    )}
                  </g>
                ))}
              </svg>
            </div>
            {/* Legend */}
            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
              {pieSlices.map((slice, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: slice.color }} />
                  <span className="text-sm text-gray-700 truncate" title={slice.reason}>{slice.reason}</span>
                  {slice.reason === 'Other' && otherReasons.length > 0 && (
                    <div className="relative flex-shrink-0">
                      <button
                        onClick={() => setShowOtherPopover(v => !v)}
                        className="w-4 h-4 rounded-full bg-gray-400 hover:bg-gray-600 text-white text-xs flex items-center justify-center leading-none transition-colors"
                        title="See grouped reasons"
                      >
                        i
                      </button>
                      {showOtherPopover && (
                        <div className="absolute z-10 left-6 top-0 w-64 bg-white border border-gray-200 rounded-lg shadow-lg p-3">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-semibold text-gray-700">Grouped reasons</span>
                            <button onClick={() => setShowOtherPopover(false)} className="text-gray-400 hover:text-gray-600 text-sm leading-none">✕</button>
                          </div>
                          <div className="space-y-1 max-h-48 overflow-y-auto">
                            {otherReasons.map((r, j) => (
                              <div key={j} className="flex justify-between text-xs text-gray-600">
                                <span className="truncate pr-2">{r.reason}</span>
                                <span className="flex-shrink-0 font-medium">{r.count} ({r.percentage.toFixed(1)}%)</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  <span className="text-sm font-semibold text-gray-900 ml-auto pl-2 flex-shrink-0">
                    {slice.count} ({slice.percentage.toFixed(1)}%)
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Monthly Churn Trend - Time Series Chart */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Monthly Churn Trend</h2>
          <p className="text-sm text-gray-500 mt-1">
            Time series showing churn count and rate over time
          </p>
        </div>
        
        <div className="p-6">
          {/* Time Series Line Chart */}
          <div className="relative" style={{ height: '350px' }}>
            <svg width="100%" height="100%" className="overflow-visible">
              {/* Calculate chart dimensions */}
              {(() => {
                const padding = { top: 60, right: 60, bottom: 40, left: 60 }
                const chartWidth = 1000 - padding.left - padding.right
                const chartHeight = 350 - padding.top - padding.bottom
                
                const maxChurn = Math.max(...analysis.monthlyData.map(m => m.churnCount))
                const maxRate = Math.max(...analysis.monthlyData.map(m => m.churnRate))
                
                // Scale functions
                const xScale = (index: number) => padding.left + (index / (analysis.monthlyData.length - 1)) * chartWidth
                const yScaleCount = (value: number) => padding.top + chartHeight - (value / maxChurn) * chartHeight
                const yScaleRate = (value: number) => padding.top + chartHeight - (value / maxRate) * chartHeight
                
                // Generate path for churn count line
                const countPath = analysis.monthlyData
                  .map((d, i) => `${i === 0 ? 'M' : 'L'} ${xScale(i)} ${yScaleCount(d.churnCount)}`)
                  .join(' ')
                
                // Generate path for churn rate line
                const ratePath = analysis.monthlyData
                  .map((d, i) => `${i === 0 ? 'M' : 'L'} ${xScale(i)} ${yScaleRate(d.churnRate)}`)
                  .join(' ')
                
                // Generate path for 3-month rolling average
                const rollingAvgPath = analysis.monthlyData
                  .map((d, i) => `${i === 0 ? 'M' : 'L'} ${xScale(i)} ${yScaleRate(analysis.rollingAverageChurnRate[i])}`)
                  .join(' ')
                
                return (
                  <>
                    {/* Grid lines */}
                    {[0, 0.25, 0.5, 0.75, 1].map((ratio) => (
                      <line
                        key={ratio}
                        x1={padding.left}
                        y1={padding.top + chartHeight * (1 - ratio)}
                        x2={padding.left + chartWidth}
                        y2={padding.top + chartHeight * (1 - ratio)}
                        stroke="#e5e7eb"
                        strokeWidth="1"
                      />
                    ))}
                    
                    {/* Y-axis labels (Churn Count - Left) */}
                    {[0, 0.25, 0.5, 0.75, 1].map((ratio) => (
                      <text
                        key={`count-${ratio}`}
                        x={padding.left - 10}
                        y={padding.top + chartHeight * (1 - ratio)}
                        textAnchor="end"
                        alignmentBaseline="middle"
                        className="text-xs fill-gray-600"
                      >
                        {Math.round(maxChurn * ratio)}
                      </text>
                    ))}
                    
                    {/* Y-axis labels (Churn Rate - Right) */}
                    {[0, 0.25, 0.5, 0.75, 1].map((ratio) => (
                      <text
                        key={`rate-${ratio}`}
                        x={padding.left + chartWidth + 10}
                        y={padding.top + chartHeight * (1 - ratio)}
                        textAnchor="start"
                        alignmentBaseline="middle"
                        className="text-xs fill-blue-600"
                      >
                        {(maxRate * ratio).toFixed(1)}%
                      </text>
                    ))}
                    
                    {/* X-axis labels */}
                    {analysis.monthlyData.map((d, i) => (
                      <text
                        key={d.month}
                        x={xScale(i)}
                        y={padding.top + chartHeight + 20}
                        textAnchor="middle"
                        className="text-xs fill-gray-600"
                      >
                        {d.month}
                      </text>
                    ))}
                    
                    {/* Churn Count Line (Red) */}
                    <path
                      d={countPath}
                      fill="none"
                      stroke="#dc2626"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    
                    {/* Churn Rate Line (Blue) */}
                    <path
                      d={ratePath}
                      fill="none"
                      stroke="#2563eb"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeDasharray="5,5"
                    />
                    
                    {/* 3-Month Rolling Average (Orange) */}
                    <path
                      d={rollingAvgPath}
                      fill="none"
                      stroke="#f97316"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    
                    {/* Data points and labels for all months */}
                    {analysis.monthlyData.map((d, i) => {
                      const isSpike = d.churnCount > maxChurn * 0.7 // Spike if > 70% of max
                      return (
                        <g key={`point-${i}`}>
                          {/* Point */}
                          <circle
                            cx={xScale(i)}
                            cy={yScaleCount(d.churnCount)}
                            r={isSpike ? 6 : 4}
                            fill="#dc2626"
                            stroke="white"
                            strokeWidth="2"
                          />
                          
                          {/* Labels for every month */}
                          <text
                            x={xScale(i)}
                            y={yScaleCount(d.churnCount) - 15}
                            textAnchor="middle"
                            className={`text-sm font-bold ${isSpike ? 'fill-red-600' : 'fill-red-500'}`}
                          >
                            {d.churnCount}
                          </text>
                          <text
                            x={xScale(i)}
                            y={yScaleCount(d.churnCount) - 30}
                            textAnchor="middle"
                            className="text-xs fill-gray-600"
                          >
                            {d.churnRate.toFixed(2)}%
                          </text>
                          <text
                            x={xScale(i)}
                            y={yScaleCount(d.churnCount) - 45}
                            textAnchor="middle"
                            className="text-xs fill-gray-500"
                          >
                            ₹{(d.revenueLost / 100000).toFixed(1)}L
                          </text>
                        </g>
                      )
                    })}
                    
                    {/* Axis labels */}
                    <text
                      x={padding.left - 40}
                      y={padding.top + chartHeight / 2}
                      textAnchor="middle"
                      transform={`rotate(-90 ${padding.left - 40} ${padding.top + chartHeight / 2})`}
                      className="text-sm font-medium fill-red-600"
                    >
                      Churn Count
                    </text>
                    
                    <text
                      x={padding.left + chartWidth + 50}
                      y={padding.top + chartHeight / 2}
                      textAnchor="middle"
                      transform={`rotate(90 ${padding.left + chartWidth + 50} ${padding.top + chartHeight / 2})`}
                      className="text-sm font-medium fill-blue-600"
                    >
                      Churn Rate (%)
                    </text>
                    
                    <text
                      x={padding.left + chartWidth / 2}
                      y={padding.top + chartHeight + 35}
                      textAnchor="middle"
                      className="text-sm font-medium fill-gray-700"
                    >
                      Month
                    </text>
                  </>
                )
              })()}
            </svg>
          </div>
          
          {/* Legend */}
          <div className="flex justify-center gap-6 mt-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-8 h-0.5 bg-red-600"></div>
              <span className="text-gray-700">Churn Count</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-0.5 bg-blue-600 border-dashed border-t-2 border-blue-600"></div>
              <span className="text-gray-700">Churn Rate (%)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-0.5 bg-orange-500"></div>
              <span className="text-gray-700">3M Rolling Avg (%)</span>
            </div>
          </div>
        </div>
        
        {/* Monthly Data Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Month
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Churn Count
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Active at Start
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Churn Rate
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Revenue Lost
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  3M Rolling Avg
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {analysis.monthlyData.map((month, index) => (
                <tr key={month.month} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {month.month}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-red-600 font-semibold">
                    {month.churnCount.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-500">
                    {month.activeOutletsAtStart.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                    <span className={`font-semibold ${
                      month.churnRate > 5 ? 'text-red-600' :
                      month.churnRate > 2 ? 'text-orange-600' :
                      'text-green-600'
                    }`}>
                      {month.churnRate.toFixed(2)}%
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-red-600 font-semibold">
                    ₹{month.revenueLost.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-600">
                    {index >= 2 ? `${analysis.rollingAverageChurnRate[index].toFixed(2)}%` : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* KAM-wise Churn Analysis */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">KAM-wise Churn Analysis</h2>
              <p className="text-sm text-gray-500 mt-1">
                Key Account Managers ranked by revenue lost due to churn • Showing {kamStartIndex + 1}-{Math.min(kamEndIndex, analysis.kamChurnData.length)} of {analysis.kamChurnData.length}
              </p>
            </div>
            <div className="text-sm text-gray-600">
              Page {kamCurrentPage} of {kamTotalPages}
            </div>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rank
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  KAM Name
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Brands Affected
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Churned Outlets
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Avg Churn/Brand
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Revenue Lost
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {currentKAMs.map((kam, index) => {
                const globalIndex = kamStartIndex + index
                return (
                  <tr key={`${kam.kamName}-${globalIndex}`} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`text-sm font-bold ${
                        globalIndex < 3 ? 'text-red-600' :
                        globalIndex < 10 ? 'text-orange-600' :
                        'text-gray-900'
                      }`}>
                        #{globalIndex + 1}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {kam.kamName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-700">
                      {kam.brandCount}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-red-600 font-semibold">
                      {kam.churnCount}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-700">
                      {kam.averageChurnPerBrand.toFixed(1)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-red-600 font-semibold">
                      ₹{kam.revenueLost.toLocaleString()}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        
        {/* KAM Pagination Controls */}
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => goToKamPage(1)}
              disabled={kamCurrentPage === 1}
              className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              First
            </button>
            <button
              onClick={() => goToKamPage(kamCurrentPage - 1)}
              disabled={kamCurrentPage === 1}
              className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
          </div>
          
          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(5, kamTotalPages) }, (_, i) => {
              let pageNum
              if (kamTotalPages <= 5) {
                pageNum = i + 1
              } else if (kamCurrentPage <= 3) {
                pageNum = i + 1
              } else if (kamCurrentPage >= kamTotalPages - 2) {
                pageNum = kamTotalPages - 4 + i
              } else {
                pageNum = kamCurrentPage - 2 + i
              }
              
              return (
                <button
                  key={pageNum}
                  onClick={() => goToKamPage(pageNum)}
                  className={`px-3 py-1 text-sm border rounded-md ${
                    kamCurrentPage === pageNum
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {pageNum}
                </button>
              )
            })}
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => goToKamPage(kamCurrentPage + 1)}
              disabled={kamCurrentPage === kamTotalPages}
              className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
            <button
              onClick={() => goToKamPage(kamTotalPages)}
              disabled={kamCurrentPage === kamTotalPages}
              className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Last
            </button>
          </div>
        </div>
      </div>

      {/* Brand-Level Churn Analysis */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Brand-Level Churn Analysis</h2>
              <p className="text-sm text-gray-500 mt-1">
                Brands ranked by revenue lost due to churn • Showing {startIndex + 1}-{Math.min(endIndex, analysis.brandChurnData.length)} of {analysis.brandChurnData.length}
              </p>
            </div>
            <div className="text-sm text-gray-600">
              Page {currentPage} of {totalPages}
            </div>
          </div>
        </div>
        
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
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Churned Outlets
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Revenue Lost
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {currentBrands.map((brand, index) => {
                const globalIndex = startIndex + index
                return (
                  <tr key={`${brand.brandName}-${globalIndex}`} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`text-sm font-bold ${
                        globalIndex < 3 ? 'text-red-600' :
                        globalIndex < 10 ? 'text-orange-600' :
                        'text-gray-900'
                      }`}>
                        #{globalIndex + 1}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {brand.brandName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {brand.kamName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-red-600 font-semibold">
                      {brand.churnCount}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-red-600 font-semibold">
                      ₹{brand.revenueLost.toLocaleString()}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        
        {/* Pagination Controls */}
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => goToPage(1)}
              disabled={currentPage === 1}
              className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              First
            </button>
            <button
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage === 1}
              className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
          </div>
          
          <div className="flex items-center gap-1">
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
                  onClick={() => goToPage(pageNum)}
                  className={`px-3 py-1 text-sm border rounded-md ${
                    currentPage === pageNum
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {pageNum}
                </button>
              )
            })}
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
            <button
              onClick={() => goToPage(totalPages)}
              disabled={currentPage === totalPages}
              className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Last
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
