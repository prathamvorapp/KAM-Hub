'use client'

import React, { useMemo, useState } from 'react'
import { useDataContext } from '@/lib/data-context'
import { TimelineSkeleton } from '@/components/TimelineSkeleton'
import { calculateOutletPotential, OutletPotentialScore } from '@/lib/outlet-potential-calculator'

function scoreColor(pct: number) {
  if (pct >= 80) return 'bg-green-500'
  if (pct >= 60) return 'bg-yellow-400'
  if (pct >= 40) return 'bg-orange-400'
  return 'bg-red-500'
}

function scoreBadge(pct: number) {
  if (pct >= 80) return { label: 'High', cls: 'bg-green-100 text-green-800' }
  if (pct >= 60) return { label: 'Medium', cls: 'bg-yellow-100 text-yellow-800' }
  if (pct >= 40) return { label: 'Low', cls: 'bg-orange-100 text-orange-800' }
  return { label: 'Very Low', cls: 'bg-red-100 text-red-800' }
}

interface BrandScore {
  brandName: string
  kamName: string
  outletCount: number
  totalScore: number
  totalApplicable: number
  percentage: number
  outlets: (OutletPotentialScore & { kamName: string })[]
}

export default function BrandPotentialIndexPage() {
  const { isLoading, error, brandRecords, kamRecords } = useDataContext()

  const [selectedKAM, setSelectedKAM] = useState('all')
  const [selectedTier, setSelectedTier] = useState<'all' | 'high' | 'medium' | 'low'>('all')
  const [sortBy, setSortBy] = useState<'percentage' | 'outlets' | 'brand'>('percentage')
  const [sortDir, setSortDir] = useState<'desc' | 'asc'>('desc')
  const [expandedBrand, setExpandedBrand] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  const kamByEmail = useMemo(() => {
    const map = new Map<string, string>()
    for (const k of kamRecords) {
      const name = k.kam_name_6?.trim() || k.kam_name_5?.trim() || k.kam_name_4?.trim() ||
        k.kam_name_3?.trim() || k.kam_name_2?.trim() || k.kam_name_1?.trim() || ''
      if (k.email && name) map.set(k.email.toLowerCase(), name)
    }
    return map
  }, [kamRecords])

  const brandNameByEmail = useMemo(() => {
    const map = new Map<string, string>()
    for (const k of kamRecords) {
      if (k.email && k.brand_name?.trim()) map.set(k.email.toLowerCase(), k.brand_name.trim())
    }
    return map
  }, [kamRecords])

  // Compute per-outlet scores, then group by brand
  const brandScores = useMemo(() => {
    const seen = new Set<string>()
    const byBrand = new Map<string, BrandScore>()

    for (const record of brandRecords) {
      const rid = (record.restaurant_id || '').trim()
      if (!rid || seen.has(rid)) continue
      seen.add(rid)

      const email = (record.email || '').toLowerCase()
      const brandName = brandNameByEmail.get(email) || record.email || 'Unknown'
      const kamName = kamByEmail.get(email) || ''
      if (kamName.trim().toLowerCase() === 'apurv patel') continue

      const score = calculateOutletPotential(record as any, brandName)
      if (!score) continue

      const existing = byBrand.get(brandName) || {
        brandName,
        kamName,
        outletCount: 0,
        totalScore: 0,
        totalApplicable: 0,
        percentage: 0,
        outlets: [],
      }
      existing.outletCount++
      existing.totalScore += score.score
      existing.totalApplicable += score.totalApplicable
      existing.outlets.push({ ...score, kamName })
      byBrand.set(brandName, existing)
    }

    // Compute brand-level percentage
    for (const b of byBrand.values()) {
      b.percentage = b.totalApplicable > 0
        ? Math.round((b.totalScore / b.totalApplicable) * 100)
        : 0
    }

    return Array.from(byBrand.values())
  }, [brandRecords, kamByEmail, brandNameByEmail])

  const uniqueKAMs = useMemo(() => {
    const set = new Set<string>()
    for (const b of brandScores) if (b.kamName) set.add(b.kamName)
    return Array.from(set).sort()
  }, [brandScores])

  const filtered = useMemo(() => {
    setExpandedBrand(null)
    let list = brandScores.filter(b => {
      if (selectedKAM !== 'all' && b.kamName !== selectedKAM) return false
      if (selectedTier === 'high' && b.percentage < 80) return false
      if (selectedTier === 'medium' && (b.percentage < 60 || b.percentage >= 80)) return false
      if (selectedTier === 'low' && b.percentage >= 60) return false
      if (search) {
        const q = search.toLowerCase()
        if (!b.brandName.toLowerCase().includes(q)) return false
      }
      return true
    })

    list = [...list].sort((a, b) => {
      let cmp = 0
      if (sortBy === 'percentage') cmp = a.percentage - b.percentage
      else if (sortBy === 'outlets') cmp = a.outletCount - b.outletCount
      else cmp = a.brandName.localeCompare(b.brandName)
      return sortDir === 'desc' ? -cmp : cmp
    })
    return list
  }, [brandScores, selectedKAM, selectedTier, search, sortBy, sortDir])

  const stats = useMemo(() => {
    if (!filtered.length) return null
    const avg = Math.round(filtered.reduce((s, b) => s + b.percentage, 0) / filtered.length)
    return {
      avg,
      high: filtered.filter(b => b.percentage >= 80).length,
      medium: filtered.filter(b => b.percentage >= 60 && b.percentage < 80).length,
      low: filtered.filter(b => b.percentage < 60).length,
      total: filtered.length,
      totalOutlets: filtered.reduce((s, b) => s + b.outletCount, 0),
    }
  }, [filtered])

  function toggleSort(col: 'percentage' | 'outlets' | 'brand') {
    if (sortBy === col) setSortDir(d => d === 'desc' ? 'asc' : 'desc')
    else { setSortBy(col); setSortDir('desc') }
  }

  function downloadCSV() {
    const rows = [
      ['Brand', 'KAM', 'Outlets', 'Total Score', 'Total Applicable', 'Percentage'],
      ...filtered.map(b => [b.brandName, b.kamName, b.outletCount, b.totalScore, b.totalApplicable, `${b.percentage}%`])
    ]
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'brand-potential-index.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  if (isLoading) return <TimelineSkeleton />
  if (error) return <div className="p-8 text-red-600">{error}</div>

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">

        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Brand Potential Index</h1>
          <p className="text-gray-500 mt-1 text-sm">
            Aggregated outlet potential per brand. Score = total active service points / total applicable points across all outlets.
          </p>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="text-xs text-gray-500">Avg Score</div>
              <div className="text-2xl font-bold mt-1 text-gray-900">{stats.avg}%</div>
              <div className="text-xs text-gray-400 mt-1">{stats.total} brands · {stats.totalOutlets} outlets</div>
            </div>
            {([
              { key: 'high' as const,   label: 'High (≥80%)',     value: stats.high,   cls: 'text-green-700',  ab: 'border-green-500 bg-green-50',   ring: 'ring-green-300' },
              { key: 'medium' as const, label: 'Medium (60–79%)', value: stats.medium, cls: 'text-yellow-700', ab: 'border-yellow-500 bg-yellow-50',  ring: 'ring-yellow-300' },
              { key: 'low' as const,    label: 'Low (<60%)',      value: stats.low,    cls: 'text-red-700',    ab: 'border-red-500 bg-red-50',        ring: 'ring-red-300' },
            ]).map(tier => (
              <button
                key={tier.key}
                onClick={() => setSelectedTier(selectedTier === tier.key ? 'all' : tier.key)}
                className={`rounded-lg border p-4 text-left transition-all w-full col-span-1 ${
                  selectedTier === tier.key ? `${tier.ab} ring-2 ${tier.ring}` : 'bg-white border-gray-200 hover:border-gray-400'
                }`}
              >
                <div className="text-xs text-gray-500">{tier.label}</div>
                <div className={`text-2xl font-bold mt-1 ${tier.cls}`}>{tier.value}</div>
                {selectedTier === tier.key && <div className="text-xs text-gray-400 mt-1">click to clear</div>}
              </button>
            ))}
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4 flex flex-wrap gap-3 items-center">
          <input
            type="text"
            placeholder="Search brand..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-1.5 text-sm w-56 focus:outline-none focus:ring-2 focus:ring-gray-400"
          />
          <select
            value={selectedKAM}
            onChange={e => setSelectedKAM(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
          >
            <option value="all">All KAMs</option>
            {uniqueKAMs.map(k => <option key={k} value={k}>{k}</option>)}
          </select>
          {(selectedKAM !== 'all' || selectedTier !== 'all' || search) && (
            <button
              onClick={() => { setSelectedKAM('all'); setSelectedTier('all'); setSearch('') }}
              className="px-3 py-1.5 text-sm text-red-600 border border-red-300 rounded-md hover:bg-red-50"
            >
              ✕ Clear
            </button>
          )}
          <span className="text-sm text-gray-500 ml-auto">{filtered.length} brands</span>
          <button onClick={downloadCSV} className="ml-2 px-3 py-1.5 bg-gray-800 text-white text-sm rounded-md hover:bg-gray-700">
            Export CSV
          </button>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th
                    className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide cursor-pointer hover:text-gray-900 select-none"
                    onClick={() => toggleSort('brand')}
                  >
                    Brand {sortBy === 'brand' ? (sortDir === 'desc' ? '↓' : '↑') : ''}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">KAM</th>
                  <th
                    className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide cursor-pointer hover:text-gray-900 select-none"
                    onClick={() => toggleSort('outlets')}
                  >
                    Outlets {sortBy === 'outlets' ? (sortDir === 'desc' ? '↓' : '↑') : ''}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Score (pts)</th>
                  <th
                    className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide cursor-pointer hover:text-gray-900 select-none"
                    onClick={() => toggleSort('percentage')}
                  >
                    Score % {sortBy === 'percentage' ? (sortDir === 'desc' ? '↓' : '↑') : ''}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Progress</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Tier</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Outlets</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.length === 0 && (
                  <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">No brands found</td></tr>
                )}
                {filtered.map(b => {
                  const badge = scoreBadge(b.percentage)
                  const isExpanded = expandedBrand === b.brandName
                  return (
                    <React.Fragment key={b.brandName}>
                      <tr className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 font-medium text-gray-900">{b.brandName}</td>
                        <td className="px-4 py-3 text-gray-600 text-xs">{b.kamName || '—'}</td>
                        <td className="px-4 py-3 text-gray-700">{b.outletCount}</td>
                        <td className="px-4 py-3 font-semibold text-gray-900">{b.totalScore} / {b.totalApplicable}</td>
                        <td className="px-4 py-3 font-bold text-gray-900">{b.percentage}%</td>
                        <td className="px-4 py-3 w-32">
                          <div className="h-2 rounded-full bg-gray-200 overflow-hidden">
                            <div className={`h-full rounded-full ${scoreColor(b.percentage)}`} style={{ width: `${b.percentage}%` }} />
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${badge.cls}`}>{badge.label}</span>
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => setExpandedBrand(isExpanded ? null : b.brandName)}
                            className="text-xs text-blue-600 hover:text-blue-800 font-medium underline"
                          >
                            {isExpanded ? 'Hide' : `View ${b.outletCount}`}
                          </button>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr className="bg-blue-50">
                          <td colSpan={8} className="px-6 py-4">
                            <div className="text-xs font-semibold text-gray-600 mb-3">
                              Outlets for {b.brandName} ({b.outletCount})
                            </div>
                            <div className="overflow-x-auto">
                              <table className="w-full text-xs border border-gray-200 rounded-lg overflow-hidden">
                                <thead className="bg-gray-100">
                                  <tr>
                                    <th className="px-3 py-2 text-left font-semibold text-gray-600">Outlet ID</th>
                                    <th className="px-3 py-2 text-left font-semibold text-gray-600">Type</th>
                                    <th className="px-3 py-2 text-left font-semibold text-gray-600">Score</th>
                                    <th className="px-3 py-2 text-left font-semibold text-gray-600">%</th>
                                    <th className="px-3 py-2 text-left font-semibold text-gray-600">Tier</th>
                                    <th className="px-3 py-2 text-left font-semibold text-gray-600">Missing Services</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 bg-white">
                                  {b.outlets.map(o => {
                                    const ob = scoreBadge(o.percentage)
                                    return (
                                      <tr key={o.restaurant_id} className="hover:bg-gray-50">
                                        <td className="px-3 py-2 font-mono text-gray-500">{o.restaurant_id}</td>
                                        <td className="px-3 py-2 text-gray-600">{o.outletType}</td>
                                        <td className="px-3 py-2 font-semibold">{o.score} / {o.totalApplicable}</td>
                                        <td className="px-3 py-2 font-bold">{o.percentage}%</td>
                                        <td className="px-3 py-2">
                                          <span className={`px-1.5 py-0.5 rounded-full text-xs font-medium ${ob.cls}`}>{ob.label}</span>
                                        </td>
                                        <td className="px-3 py-2 text-gray-500 max-w-xs truncate">
                                          {o.missingServices.length > 0 ? o.missingServices.join(', ') : '—'}
                                        </td>
                                      </tr>
                                    )
                                  })}
                                </tbody>
                              </table>
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
