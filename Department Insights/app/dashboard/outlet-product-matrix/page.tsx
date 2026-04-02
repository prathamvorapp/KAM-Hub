'use client'

import React, { useMemo, useState } from 'react'
import { useDataContext } from '@/lib/data-context'
import { TimelineSkeleton } from '@/components/TimelineSkeleton'
import { calculateOutletMatrix, OutletMatrixScore, OutletType } from '@/lib/outlet-product-matrix-calculator'

const OUTLET_TYPES: OutletType[] = [
  'QSR', 'Cafe', 'Dine In', 'Cloud Kitchen',
  'Icecream Parlor', 'Bakery', 'Dine in & QSR',
  'Retail Store', 'Foodcourts', 'Sweet Shop',
]

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

function fmt(name: string) {
  return name.replace(/_status$/, '').replace(/_/g, ' ')
}

export default function OutletProductMatrixPage() {
  const { isLoading, error, brandRecords, kamRecords } = useDataContext()

  const [selectedKAM, setSelectedKAM] = useState('all')
  const [selectedType, setSelectedType] = useState('all')
  const [selectedTier, setSelectedTier] = useState<'all' | 'high' | 'medium' | 'low' | 'gate-fail'>('all')
  const [sortBy, setSortBy] = useState<'percentage' | 'points' | 'brand'>('percentage')
  const [sortDir, setSortDir] = useState<'desc' | 'asc'>('desc')
  const [expandedRow, setExpandedRow] = useState<number | null>(null)
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

  const allScores = useMemo(() => {
    const seen = new Set<string>()
    const results: (OutletMatrixScore & { kamName: string })[] = []
    for (const record of brandRecords) {
      const rid = (record.restaurant_id || '').trim()
      if (!rid || seen.has(rid)) continue
      seen.add(rid)
      const email = (record.email || '').toLowerCase()
      const brandName = brandNameByEmail.get(email) || record.email
      const kamName = kamByEmail.get(email) || ''
      if (kamName.trim().toLowerCase() === 'apurv patel') continue
      const score = calculateOutletMatrix(record as any, brandName)
      if (score) results.push({ ...score, kamName })
    }
    return results
  }, [brandRecords, kamByEmail, brandNameByEmail])

  const uniqueKAMs = useMemo(() => {
    const set = new Set<string>()
    for (const s of allScores) if (s.kamName) set.add(s.kamName)
    return Array.from(set).sort()
  }, [allScores])

  const typeSummary = useMemo(() => {
    const map = new Map<string, { count: number; totalPct: number; maxPts: number }>()
    for (const s of allScores) {
      const cur = map.get(s.outletType) || { count: 0, totalPct: 0, maxPts: 0 }
      cur.count++
      cur.totalPct += s.percentage
      cur.maxPts = s.totalApplicable
      map.set(s.outletType, cur)
    }
    return map
  }, [allScores])

  const filtered = useMemo(() => {
    setExpandedRow(null)
    let list = allScores.filter(s => {
      if (selectedType !== 'all' && s.outletType !== selectedType) return false
      if (selectedKAM !== 'all' && s.kamName !== selectedKAM) return false
      if (selectedTier === 'gate-fail' && s.feedbackGatePassed) return false
      if (selectedTier === 'high' && (s.percentage < 80 || !s.feedbackGatePassed)) return false
      if (selectedTier === 'medium' && (s.percentage < 60 || s.percentage >= 80 || !s.feedbackGatePassed)) return false
      if (selectedTier === 'low' && (s.percentage >= 60 || !s.feedbackGatePassed)) return false
      if (search) {
        const q = search.toLowerCase()
        if (!s.brandName.toLowerCase().includes(q) && !s.restaurant_id.includes(q)) return false
      }
      return true
    })
    list = [...list].sort((a, b) => {
      let cmp = 0
      if (sortBy === 'percentage') cmp = a.percentage - b.percentage
      else if (sortBy === 'points') cmp = a.earnedPoints - b.earnedPoints
      else cmp = a.brandName.localeCompare(b.brandName)
      return sortDir === 'desc' ? -cmp : cmp
    })
    return list
  }, [allScores, selectedType, selectedKAM, selectedTier, search, sortBy, sortDir])

  const stats = useMemo(() => {
    if (!filtered.length) return null
    const avg = filtered.reduce((s, r) => s + r.percentage, 0) / filtered.length
    return {
      avg: Math.round(avg),
      high: filtered.filter(r => r.percentage >= 80 && r.feedbackGatePassed).length,
      medium: filtered.filter(r => r.percentage >= 60 && r.percentage < 80 && r.feedbackGatePassed).length,
      low: filtered.filter(r => r.percentage < 60 && r.feedbackGatePassed).length,
      gateFail: filtered.filter(r => !r.feedbackGatePassed).length,
      total: filtered.length,
    }
  }, [filtered])

  function toggleSort(col: 'percentage' | 'points' | 'brand') {
    if (sortBy === col) setSortDir(d => d === 'desc' ? 'asc' : 'desc')
    else { setSortBy(col); setSortDir('desc') }
  }

  function downloadCSV() {
    const rows = [
      ['Restaurant ID', 'Brand', 'KAM', 'Outlet Type', 'Feedback Gate', 'Earned Points', 'Max Points', 'Percentage',
       'Critical Earned', 'Critical Max', 'Nice to Have Earned', 'Nice to Have Max', 'Feedback Earned', 'Feedback Max'],
      ...filtered.map(s => [
        s.restaurant_id, s.brandName, s.kamName, s.outletType,
        s.feedbackGatePassed ? 'Pass' : 'FAIL',
        s.earnedPoints, s.totalApplicable, `${s.percentage}%`,
        s.criticalEarned, s.criticalTotal,
        s.niceToHaveEarned, s.niceToHaveTotal,
        s.feedbackEarned, s.feedbackTotal,
      ])
    ]
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'outlet-product-matrix.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  if (isLoading) return <TimelineSkeleton />
  if (error) return <div className="p-8 text-red-600">{error}</div>

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Outlet Product Matrix</h1>
          <p className="text-gray-500 mt-1 text-sm">
            Score per outlet based on applicable services. Critical = 10 pts · Nice to Have = 5 pts · Feedback group = 10 pts if any one feedback service is active, otherwise 0.
          </p>
        </div>

        {/* Scoring legend */}
        <div className="flex gap-3 mb-6 flex-wrap">
          {[
            { label: 'Critical', pts: '10 pts each', cls: 'bg-blue-100 text-blue-800 border-blue-200' },
            { label: 'Nice to Have', pts: '5 pts each', cls: 'bg-purple-100 text-purple-800 border-purple-200' },
            { label: 'Feedback group', pts: '10 pts if any one active, else 0', cls: 'bg-amber-100 text-amber-800 border-amber-200' },
          ].map(l => (
            <span key={l.label} className={`px-3 py-1 rounded-full text-xs font-medium border ${l.cls}`}>
              {l.label} — {l.pts}
            </span>
          ))}
        </div>

        {/* Type summary cards */}
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
                <div className="flex items-center justify-between">
                  <div className="text-xs font-medium truncate">{type}</div>
                  {selectedType === type && <span className="text-xs opacity-60 ml-1">✕</span>}
                </div>
                <div className="text-lg font-bold mt-1">{avg}%</div>
                <div className="text-xs opacity-70">{stat.count} outlet{stat.count !== 1 ? 's' : ''} · {stat.maxPts} pts max</div>
                <div className="mt-2 h-1.5 rounded-full bg-gray-200 overflow-hidden">
                  <div className={`h-full rounded-full ${scoreColor(avg)}`} style={{ width: `${avg}%` }} />
                </div>
                {selectedType === type && <div className="text-xs opacity-50 mt-1">click to clear</div>}
              </button>
            )
          })}
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="text-xs text-gray-500">Avg Score</div>
              <div className="text-2xl font-bold mt-1 text-gray-900">{stats.avg}%</div>
              <div className="text-xs text-gray-400 mt-1">{stats.total} outlets</div>
            </div>
            {([
              { key: 'high' as const,      label: 'High (≥80%)',     value: stats.high,     cls: 'text-green-700',  ab: 'border-green-500 bg-green-50',  ring: 'ring-green-300' },
              { key: 'medium' as const,    label: 'Medium (60–79%)', value: stats.medium,   cls: 'text-yellow-700', ab: 'border-yellow-500 bg-yellow-50', ring: 'ring-yellow-300' },
              { key: 'low' as const,       label: 'Low (<60%)',      value: stats.low,      cls: 'text-orange-700', ab: 'border-orange-500 bg-orange-50', ring: 'ring-orange-300' },
              { key: 'gate-fail' as const, label: 'No Feedback',     value: stats.gateFail, cls: 'text-red-700',    ab: 'border-red-500 bg-red-50',       ring: 'ring-red-300' },
            ]).map(tier => (
              <button
                key={tier.key}
                onClick={() => setSelectedTier(selectedTier === tier.key ? 'all' : tier.key)}
                className={`rounded-lg border p-4 text-left transition-all w-full ${
                  selectedTier === tier.key
                    ? `${tier.ab} ring-2 ${tier.ring}`
                    : 'bg-white border-gray-200 hover:border-gray-400'
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
          {(selectedType !== 'all' || selectedKAM !== 'all' || selectedTier !== 'all' || search) && (
            <button
              onClick={() => { setSelectedType('all'); setSelectedKAM('all'); setSelectedTier('all'); setSearch('') }}
              className="px-3 py-1.5 text-sm text-red-600 border border-red-300 rounded-md hover:bg-red-50 transition-colors"
            >
              ✕ Clear filters
            </button>
          )}
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
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide cursor-pointer hover:text-gray-900 select-none" onClick={() => toggleSort('brand')}>
                    Brand {sortBy === 'brand' ? (sortDir === 'desc' ? '↓' : '↑') : ''}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">KAM</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Feedback Gate</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide cursor-pointer hover:text-gray-900 select-none" onClick={() => toggleSort('points')}>
                    Points {sortBy === 'points' ? (sortDir === 'desc' ? '↓' : '↑') : ''}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide cursor-pointer hover:text-gray-900 select-none" onClick={() => toggleSort('percentage')}>
                    Score % {sortBy === 'percentage' ? (sortDir === 'desc' ? '↓' : '↑') : ''}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Progress</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Tier</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.length === 0 && (
                  <tr><td colSpan={10} className="px-4 py-8 text-center text-gray-400">No outlets found</td></tr>
                )}
                {filtered.map((s, idx) => {
                  const badge = scoreBadge(s.percentage)
                  const isExpanded = expandedRow === idx
                  return (
                    <React.Fragment key={`${s.restaurant_id}-${idx}`}>
                      <tr className={`hover:bg-gray-50 transition-colors ${!s.feedbackGatePassed ? 'bg-red-50' : ''}`}>
                        <td className="px-4 py-3 font-mono text-xs text-gray-500">{s.restaurant_id}</td>
                        <td className="px-4 py-3 font-medium text-gray-900 max-w-[160px] truncate">{s.brandName}</td>
                        <td className="px-4 py-3 text-gray-600 text-xs">{s.kamName || '—'}</td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-700">{s.outletType}</span>
                        </td>
                        <td className="px-4 py-3">
                          {s.feedbackGatePassed
                            ? <span className="px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-700 font-medium">✓ Pass</span>
                            : <span className="px-2 py-0.5 rounded-full text-xs bg-red-100 text-red-700 font-medium">✗ Fail</span>
                          }
                        </td>
                        <td className="px-4 py-3 font-semibold text-gray-900">
                          {s.earnedPoints} / {s.totalApplicable}
                        </td>
                        <td className="px-4 py-3 font-bold text-gray-900">{s.percentage}%</td>
                        <td className="px-4 py-3 w-32">
                          <div className="h-2 rounded-full bg-gray-200 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${scoreColor(s.percentage)}`}
                              style={{ width: `${s.percentage}%` }}
                            />
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {s.feedbackGatePassed
                            ? <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${badge.cls}`}>{badge.label}</span>
                            : <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">No Feedback</span>
                          }
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
                          <td colSpan={10} className="px-6 py-4">
                            {/* Score breakdown */}
                            <div className="flex gap-6 mb-4 flex-wrap">
                              {[
                                { label: 'Critical', earned: s.criticalEarned, total: s.criticalTotal, cls: 'text-blue-700 bg-blue-50 border-blue-200' },
                                { label: 'Nice to Have', earned: s.niceToHaveEarned, total: s.niceToHaveTotal, cls: 'text-purple-700 bg-purple-50 border-purple-200' },
                                { label: 'Feedback group', earned: s.feedbackEarned, total: s.feedbackTotal, cls: 'text-amber-700 bg-amber-50 border-amber-200' },
                              ].map(b => (
                                <div key={b.label} className={`rounded-lg border px-4 py-2 text-sm ${b.cls}`}>
                                  <span className="font-semibold">{b.label}</span>
                                  <span className="ml-2">{b.earned} / {b.total} pts</span>
                                </div>
                              ))}
                            </div>
                            {/* Services grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                              {(['Critical', 'Nice to Have'] as const).map(cat => {
                                const catServices = s.services.filter(sv => sv.category === cat)
                                if (!catServices.length) return null
                                const catColor = cat === 'Critical' ? 'blue' : 'purple'
                                return (
                                  <div key={cat}>
                                    <div className={`text-xs font-semibold text-${catColor}-700 mb-2`}>
                                      {cat} ({catServices.filter(sv => sv.active).length}/{catServices.length} active)
                                    </div>
                                    <div className="flex flex-col gap-1">
                                      {catServices.map(sv => (
                                        <div
                                          key={sv.name}
                                          className={`flex items-center justify-between px-2 py-1 rounded text-xs border ${
                                            sv.active
                                              ? 'bg-green-50 border-green-200 text-green-800'
                                              : 'bg-gray-50 border-gray-200 text-gray-500'
                                          }`}
                                        >
                                          <span>{sv.active ? '✓' : '✗'} {fmt(sv.name)}</span>
                                          <span className="font-semibold ml-2">{sv.active ? `+${sv.points}` : `0/${sv.points}`}</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )
                              })}
                              {/* Feedback group */}
                              {(() => {
                                const fbServices = s.services.filter(sv => sv.category === 'Feedback')
                                if (!fbServices.length) return null
                                return (
                                  <div>
                                    <div className="text-xs font-semibold text-amber-700 mb-2">
                                      Feedback group — {s.feedbackEarned}/10 pts
                                      <span className={`ml-2 px-1.5 py-0.5 rounded text-xs ${s.feedbackGatePassed ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                        {s.feedbackGatePassed ? '✓ active' : '✗ none active'}
                                      </span>
                                    </div>
                                    <div className="flex flex-col gap-1">
                                      {fbServices.map(sv => (
                                        <div
                                          key={sv.name}
                                          className={`flex items-center justify-between px-2 py-1 rounded text-xs border ${
                                            sv.active
                                              ? 'bg-green-50 border-green-200 text-green-800'
                                              : 'bg-gray-50 border-gray-200 text-gray-500'
                                          }`}
                                        >
                                          <span>{sv.active ? '✓' : '✗'} {fmt(sv.name)}</span>
                                          <span className="text-gray-400 ml-2 italic text-xs">contributes to group</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )
                              })()}
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
