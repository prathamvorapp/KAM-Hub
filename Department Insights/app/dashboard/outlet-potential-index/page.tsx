'use client'

import React, { useMemo, useState } from 'react'
import { useDataContext } from '@/lib/data-context'
import { TimelineSkeleton } from '@/components/TimelineSkeleton'
import { calculateOutletPotential, OutletPotentialScore, OutletType } from '@/lib/outlet-potential-calculator'

const OUTLET_TYPES: OutletType[] = [
  'QSR', 'Cafe', 'Dine In', 'Cloud Kitchen',
  'Icecream Parlor', 'Bakery', 'Dine in & QSR',
  'Retail Store', 'Foodcourts', 'Sweet Shop',
]

function getScoreColor(pct: number): string {
  if (pct >= 80) return 'bg-green-500'
  if (pct >= 60) return 'bg-yellow-400'
  if (pct >= 40) return 'bg-orange-400'
  return 'bg-red-500'
}

function getScoreBadge(pct: number): { label: string; cls: string } {
  if (pct >= 80) return { label: 'High', cls: 'bg-green-100 text-green-800' }
  if (pct >= 60) return { label: 'Medium', cls: 'bg-yellow-100 text-yellow-800' }
  if (pct >= 40) return { label: 'Low', cls: 'bg-orange-100 text-orange-800' }
  return { label: 'Very Low', cls: 'bg-red-100 text-red-800' }
}

export default function OutletPotentialIndexPage() {
  const { isLoading, error, brandRecords, kamRecords } = useDataContext()

  const [selectedKAM, setSelectedKAM] = useState('all')
  const [selectedType, setSelectedType] = useState('all')
  const [selectedTier, setSelectedTier] = useState<'all' | 'high' | 'medium' | 'low'>('all')
  const [sortBy, setSortBy] = useState<'percentage' | 'score' | 'brand'>('percentage')
  const [sortDir, setSortDir] = useState<'desc' | 'asc'>('desc')
  const [expandedRow, setExpandedRow] = useState<number | null>(null)
  const [search, setSearch] = useState('')

  // Build email -> KAM name lookup from kamRecords
  const kamByEmail = useMemo(() => {
    const map = new Map<string, string>()
    for (const k of kamRecords) {
      const name = k.kam_name_6?.trim() || k.kam_name_5?.trim() || k.kam_name_4?.trim() ||
        k.kam_name_3?.trim() || k.kam_name_2?.trim() || k.kam_name_1?.trim() || ''
      if (k.email && name) map.set(k.email.toLowerCase(), name)
    }
    return map
  }, [kamRecords])

  // Build email -> brand name lookup
  const brandNameByEmail = useMemo(() => {
    const map = new Map<string, string>()
    for (const k of kamRecords) {
      if (k.email && k.brand_name?.trim()) map.set(k.email.toLowerCase(), k.brand_name.trim())
    }
    return map
  }, [kamRecords])

  // One score per outlet (brandRecord row), deduplicated by restaurant_id
  // Excludes outlets assigned to "Apurv Patel"
  const allScores = useMemo(() => {
    const seen = new Set<string>()
    const results: OutletPotentialScore[] = []
    for (const record of brandRecords) {
      const rid = (record.restaurant_id || '').trim()
      if (!rid || seen.has(rid)) continue
      seen.add(rid)
      const email = (record.email || '').toLowerCase()
      const brandName = brandNameByEmail.get(email) || record.email
      const kamName = kamByEmail.get(email) || ''
      if (kamName.trim().toLowerCase() === 'apurv patel') continue
      const score = calculateOutletPotential(record as any, brandName)
      if (score) {
        ;(score as any).kamName = kamName
        results.push(score)
      }
    }
    return results
  }, [brandRecords, kamByEmail, brandNameByEmail])

  // Unique KAMs
  const uniqueKAMs = useMemo(() => {
    const set = new Set<string>()
    for (const s of allScores) {
      const k = (s as any).kamName
      if (k) set.add(k)
    }
    return Array.from(set).sort()
  }, [allScores])

  // Summary stats per outlet type
  const typeSummary = useMemo(() => {
    const map = new Map<string, { count: number; totalPct: number; totalApplicable: number }>()
    for (const s of allScores) {
      const cur = map.get(s.outletType) || { count: 0, totalPct: 0, totalApplicable: 0 }
      cur.count++
      cur.totalPct += s.percentage
      cur.totalApplicable = s.totalApplicable
      map.set(s.outletType, cur)
    }
    return map
  }, [allScores])

  // Filtered + sorted
  const filtered = useMemo(() => {
    setExpandedRow(null)
    let list = allScores.filter(s => {
      if (selectedType !== 'all' && s.outletType !== selectedType) return false
      if (selectedKAM !== 'all' && (s as any).kamName !== selectedKAM) return false
      if (selectedTier === 'high' && s.percentage < 80) return false
      if (selectedTier === 'medium' && (s.percentage < 60 || s.percentage >= 80)) return false
      if (selectedTier === 'low' && s.percentage >= 60) return false
      if (search) {
        const q = search.toLowerCase()
        if (!s.brandName.toLowerCase().includes(q) && !s.restaurant_id.includes(q)) return false
      }
      return true
    })

    list = [...list].sort((a, b) => {
      let cmp = 0
      if (sortBy === 'percentage') cmp = a.percentage - b.percentage
      else if (sortBy === 'score') cmp = a.score - b.score
      else cmp = a.brandName.localeCompare(b.brandName)
      return sortDir === 'desc' ? -cmp : cmp
    })

    return list
  }, [allScores, selectedType, selectedKAM, selectedTier, search, sortBy, sortDir])

  // Overall stats
  const overallStats = useMemo(() => {
    if (!filtered.length) return null
    const avg = filtered.reduce((s, r) => s + r.percentage, 0) / filtered.length
    const high = filtered.filter(r => r.percentage >= 80).length
    const medium = filtered.filter(r => r.percentage >= 60 && r.percentage < 80).length
    const low = filtered.filter(r => r.percentage < 60).length
    return { avg: Math.round(avg), high, medium, low, total: filtered.length }
  }, [filtered])

  function toggleSort(col: 'percentage' | 'score' | 'brand') {
    if (sortBy === col) setSortDir(d => d === 'desc' ? 'asc' : 'desc')
    else { setSortBy(col); setSortDir('desc') }
  }

  function downloadCSV() {
    const rows = [
      ['Restaurant ID', 'Brand Name', 'KAM', 'Outlet Type', 'Score', 'Total Applicable', 'Percentage', 'Active Services', 'Missing Services'],
      ...filtered.map(s => [
        s.restaurant_id,
        s.brandName,
        (s as any).kamName || '',
        s.outletType,
        s.score,
        s.totalApplicable,
        `${s.percentage}%`,
        s.activeServices.join('; '),
        s.missingServices.join('; '),
      ])
    ]
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'outlet-potential-index.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  if (isLoading) return <TimelineSkeleton />
  if (error) return <div className="p-8 text-red-600">{error}</div>

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Outlet Potential Index</h1>
          <p className="text-gray-500 mt-1 text-sm">
            Score per outlet based on applicable services activated. POS is default (1 pt). Each active applicable service = 1 pt.
          </p>
        </div>

        {/* Type Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
          {OUTLET_TYPES.map(type => {
            const stat = typeSummary.get(type)
            if (!stat) return null
            const avg = Math.round(stat.totalPct / stat.count)
            return (
              <button
                key={type}
                onClick={() => setSelectedType(selectedType === type ? 'all' : type)}
                className={`rounded-lg p-3 text-left border transition-all ${
                  selectedType === type
                    ? 'border-gray-700 bg-gray-800 text-white'
                    : 'border-gray-200 bg-white hover:border-gray-400'
                }`}
              >
                <div className="text-xs font-medium truncate">{type}</div>
                <div className="text-lg font-bold mt-1">{avg}%</div>
                <div className="text-xs opacity-70">{stat.count} outlet{stat.count !== 1 ? 's' : ''} · {stat.totalApplicable} pts max</div>
                <div className="mt-2 h-1.5 rounded-full bg-gray-200 overflow-hidden">
                  <div className={`h-full rounded-full ${getScoreColor(avg)}`} style={{ width: `${avg}%` }} />
                </div>
              </button>
            )
          })}
        </div>

        {/* Overall Stats */}
        {overallStats && (
          <div className="grid grid-cols-4 gap-3 mb-6">
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="text-xs text-gray-500">Avg Score</div>
              <div className="text-2xl font-bold mt-1 text-gray-900">{overallStats.avg}%</div>
            </div>
            {([
              { key: 'high' as const,   label: 'High (≥80%)',    value: overallStats.high,   cls: 'text-green-700',  activeBorder: 'border-green-500 bg-green-50',  ring: 'ring-green-300' },
              { key: 'medium' as const, label: 'Medium (60–79%)', value: overallStats.medium, cls: 'text-yellow-700', activeBorder: 'border-yellow-500 bg-yellow-50', ring: 'ring-yellow-300' },
              { key: 'low' as const,    label: 'Low (<60%)',      value: overallStats.low,    cls: 'text-red-700',    activeBorder: 'border-red-500 bg-red-50',       ring: 'ring-red-300' },
            ]).map(tier => (
              <button
                key={tier.key}
                onClick={() => setSelectedTier(selectedTier === tier.key ? 'all' : tier.key)}
                className={`rounded-lg border p-4 text-left transition-all w-full ${
                  selectedTier === tier.key
                    ? `${tier.activeBorder} ring-2 ${tier.ring}`
                    : 'bg-white border-gray-200 hover:border-gray-400'
                }`}
              >
                <div className="text-xs text-gray-500">{tier.label}</div>
                <div className={`text-2xl font-bold mt-1 ${tier.cls}`}>{tier.value}</div>
                {selectedTier === tier.key && (
                  <div className="text-xs text-gray-400 mt-1">click to clear</div>
                )}
              </button>
            ))}
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4 flex flex-wrap gap-3 items-center">
          <input
            type="text"
            placeholder="Search brand or outlet ID..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-1.5 text-sm w-56 focus:outline-none focus:ring-2 focus:ring-gray-400"
          />
          <select
            value={selectedType}
            onChange={e => setSelectedType(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
          >
            <option value="all">All Outlet Types</option>
            {OUTLET_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <select
            value={selectedKAM}
            onChange={e => setSelectedKAM(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
          >
            <option value="all">All KAMs</option>
            {uniqueKAMs.map(k => <option key={k} value={k}>{k}</option>)}
          </select>
          <span className="text-sm text-gray-500 ml-auto">{filtered.length} outlets</span>
          <button
            onClick={downloadCSV}
            className="ml-2 px-3 py-1.5 bg-gray-800 text-white text-sm rounded-md hover:bg-gray-700 transition-colors"
          >
            Export CSV
          </button>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Outlet ID</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Brand</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">KAM</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Type</th>
                  <th
                    className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide cursor-pointer hover:text-gray-900 select-none"
                    onClick={() => toggleSort('score')}
                  >
                    Score (active/total) {sortBy === 'score' ? (sortDir === 'desc' ? '↓' : '↑') : ''}
                  </th>
                  <th
                    className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide cursor-pointer hover:text-gray-900 select-none"
                    onClick={() => toggleSort('percentage')}
                  >
                    Percentage {sortBy === 'percentage' ? (sortDir === 'desc' ? '↓' : '↑') : ''}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Progress</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Tier</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-gray-400">No outlets found</td>
                  </tr>
                )}
                {filtered.map((s, idx) => {
                  const badge = getScoreBadge(s.percentage)
                  const isExpanded = expandedRow === idx
                  return (
                    <React.Fragment key={`${s.restaurant_id}-${idx}`}>
                      <tr className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 font-mono text-xs text-gray-500">{s.restaurant_id}</td>
                        <td className="px-4 py-3 font-medium text-gray-900 max-w-[160px] truncate">{s.brandName}</td>
                        <td className="px-4 py-3 text-gray-600 text-xs">{(s as any).kamName || '—'}</td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-700">{s.outletType}</span>
                        </td>
                        <td className="px-4 py-3 font-semibold text-gray-900">{s.score} / {s.totalApplicable}</td>
                        <td className="px-4 py-3 font-bold text-gray-900">{s.percentage}%</td>
                        <td className="px-4 py-3 w-32">
                          <div className="h-2 rounded-full bg-gray-200 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${getScoreColor(s.percentage)}`}
                              style={{ width: `${s.percentage}%` }}
                            />
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${badge.cls}`}>{badge.label}</span>
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => setExpandedRow(isExpanded ? null : idx)}
                            className="text-xs text-blue-600 hover:text-blue-800 font-medium underline"
                          >
                            {isExpanded ? 'Hide' : 'View'}
                          </button>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr className="bg-blue-50">
                          <td colSpan={9} className="px-6 py-4">
                            <div className="grid grid-cols-2 gap-6">
                              <div>
                                <div className="text-xs font-semibold text-green-700 mb-2">
                                  ✓ Active Services ({s.activeServices.length})
                                </div>
                                <div className="flex flex-wrap gap-1">
                                  {s.activeServices.map(svc => (
                                    <span key={svc} className="px-2 py-0.5 rounded text-xs bg-green-100 text-green-800 border border-green-200">{svc}</span>
                                  ))}
                                </div>
                              </div>
                              <div>
                                <div className="text-xs font-semibold text-red-600 mb-2">
                                  ✗ Missing Services ({s.missingServices.length})
                                </div>
                                <div className="flex flex-wrap gap-1">
                                  {s.missingServices.map(svc => (
                                    <span key={svc} className="px-2 py-0.5 rounded text-xs bg-red-100 text-red-700 border border-red-200">{svc}</span>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  )
}
