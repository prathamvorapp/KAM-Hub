'use client'

import React, { useMemo, useState } from 'react'
import { useDataContext } from '@/lib/di-data-context'
import { TimelineSkeleton } from '@/components/di/TimelineSkeleton'
import { calculateOutletMatrix, OutletMatrixScore, MATRIX, FEEDBACK_SERVICES } from '@/lib/di-outlet-product-matrix-calculator'

function scoreColor(pct: number) {
  if (pct >= 80) return 'bg-green-500'
  if (pct >= 60) return 'bg-yellow-400'
  if (pct >= 40) return 'bg-orange-400'
  return 'bg-red-500'
}

function barColor(pct: number) {
  if (pct >= 80) return 'bg-green-400'
  if (pct >= 60) return 'bg-yellow-400'
  if (pct >= 40) return 'bg-orange-400'
  return 'bg-red-400'
}

function scoreBadge(pct: number, _gatePassed: boolean) {
  if (pct >= 80) return { label: 'High', cls: 'bg-green-100 text-green-800' }
  if (pct >= 60) return { label: 'Medium', cls: 'bg-yellow-100 text-yellow-800' }
  if (pct >= 40) return { label: 'Low', cls: 'bg-orange-100 text-orange-800' }
  return { label: 'Very Low', cls: 'bg-red-100 text-red-800' }
}

function outletRank(count: number): string {
  if (count >= 501) return 'A'
  if (count >= 201) return 'B'
  if (count >= 101) return 'C'
  if (count >= 51)  return 'D'
  if (count >= 26)  return 'E'
  if (count >= 6)   return 'F'
  if (count >= 2)   return 'G'
  return 'H'
}

function fmt(name: string) {
  return name.replace(/_status$/, '').replace(/_/g, ' ')
}

// ─── Low Hanging Fruit Rules ──────────────────────────────────────────────────
// A brand is "low hanging" if it matches its outlet type's rule:
// at least one outlet is missing the key service(s) for that type.

interface LHFRule {
  label: string        // short display name for the missing service
  services: string[]   // field names — brand qualifies if ANY outlet is missing ALL of these
  description: string  // human-readable rule shown in tooltip
}

const LOW_HANGING_RULES: Partial<Record<string, LHFRule>> = {
  'Cloud Kitchen': { label: 'Swiggy / Zomato',  services: ['Swiggy_integration', 'Zomato_integration'], description: 'Cloud Kitchen with any outlet missing both Swiggy and Zomato' },
  'Cafe':          { label: 'Captain App',       services: ['Captain_Application_status'],               description: 'Cafe with any outlet missing Captain Application' },
  'Dine In':       { label: 'Captain App',       services: ['Captain_Application_status'],               description: 'Dine In with any outlet missing Captain Application' },
}

function isLowHanging(brand: BrandMatrixScore): boolean {
  const rule = LOW_HANGING_RULES[brand.outletType]
  if (!rule) return false

  if (brand.outletType === 'Cloud Kitchen') {
    // Flag if any outlet has neither Swiggy nor Zomato active
    // i.e. both services have activeOutlets < applicableOutlets and combined they don't cover all outlets
    const swiggy = brand.serviceAggregates.find(a => a.name === 'Swiggy_integration')
    const zomato = brand.serviceAggregates.find(a => a.name === 'Zomato_integration')
    if (!swiggy && !zomato) return true
    // If either service is missing from all applicable outlets, flag it
    const swiggyMissing = swiggy ? swiggy.activeOutlets < swiggy.applicableOutlets : false
    const zomatoMissing = zomato ? zomato.activeOutlets < zomato.applicableOutlets : false
    return swiggyMissing || zomatoMissing
  }

  // For others: flag if any outlet is missing the key service
  return brand.serviceAggregates.some(agg =>
    rule.services.includes(agg.name) && agg.activeOutlets < agg.applicableOutlets
  )
}

interface ServiceAggregate {
  name: string
  category: 'Critical' | 'Nice to Have' | 'Feedback'
  pointsPerOutlet: number   // 10 or 5 (or 1 for feedback display)
  applicableOutlets: number // how many outlets this service applies to
  activeOutlets: number     // how many have it active
  earnedPoints: number      // activeOutlets * pointsPerOutlet
  maxPoints: number         // applicableOutlets * pointsPerOutlet
}

interface BrandMatrixScore {
  brandName: string
  kamName: string
  outletType: string
  outletCount: number
  feedbackPassCount: number
  earnedPoints: number
  totalApplicable: number
  percentage: number
  criticalEarned: number
  criticalTotal: number
  niceToHaveEarned: number
  niceToHaveTotal: number
  feedbackEarned: number
  feedbackTotal: number
  serviceAggregates: ServiceAggregate[]
  outlets: (OutletMatrixScore & { kamName: string })[]
}

export default function BrandProductMatrixPage() {
  const { isLoading, error, brandRecords, kamRecords } = useDataContext()

  const [selectedKAM, setSelectedKAM] = useState('all')
  const [selectedType, setSelectedType] = useState('all')
  const [selectedTier, setSelectedTier] = useState<'all' | 'high' | 'medium' | 'low' | 'gate-fail'>('all')
  const [sortBy, setSortBy] = useState<'percentage' | 'outlets' | 'brand'>('percentage')
  const [sortDir, setSortDir] = useState<'desc' | 'asc'>('desc')
  const [expandedBrand, setExpandedBrand] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [showLowHanging, setShowLowHanging] = useState(false)
  const [selectedRank, setSelectedRank] = useState<'all' | 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H'>('all')

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

  const brandScores = useMemo(() => {
    const seen = new Set<string>()
    const byBrand = new Map<string, BrandMatrixScore>()

    for (const record of brandRecords) {
      const rid = (record.restaurant_id || '').trim()
      if (!rid || seen.has(rid)) continue
      seen.add(rid)

      const email = (record.email || '').toLowerCase()
      const brandName = brandNameByEmail.get(email) || record.email || 'Unknown'
      const kamName = kamByEmail.get(email) || ''
      if (kamName.trim().toLowerCase() === 'apurv patel') continue

      const score = calculateOutletMatrix(record as any, brandName)
      if (!score) continue

      if (!byBrand.has(brandName)) {
        byBrand.set(brandName, {
          brandName, kamName,
          outletType: score.outletType,
          outletCount: 0, feedbackPassCount: 0,
          earnedPoints: 0, totalApplicable: 0, percentage: 0,
          criticalEarned: 0, criticalTotal: 0,
          niceToHaveEarned: 0, niceToHaveTotal: 0,
          feedbackEarned: 0, feedbackTotal: 0,
          serviceAggregates: [],
          outlets: [],
        })
      }

      const b = byBrand.get(brandName)!
      b.outletCount++
      if (score.feedbackGatePassed) b.feedbackPassCount++
      b.earnedPoints += score.earnedPoints
      b.totalApplicable += score.totalApplicable
      b.criticalEarned += score.criticalEarned
      b.criticalTotal += score.criticalTotal
      b.niceToHaveEarned += score.niceToHaveEarned
      b.niceToHaveTotal += score.niceToHaveTotal
      b.feedbackEarned += score.feedbackEarned
      b.feedbackTotal += score.feedbackTotal
      b.outlets.push({ ...score, kamName })

      // Accumulate per-service aggregates
      for (const svc of score.services) {
        let agg = b.serviceAggregates.find(a => a.name === svc.name)
        if (!agg) {
          agg = {
            name: svc.name,
            category: svc.category,
            // For feedback services pointsPerOutlet is irrelevant — use 0
            pointsPerOutlet: svc.category === 'Feedback' ? 0 : svc.points,
            applicableOutlets: 0,
            activeOutlets: 0,
            earnedPoints: 0,
            maxPoints: 0,
          }
          b.serviceAggregates.push(agg)
        }
        agg.applicableOutlets++
        if (svc.active) agg.activeOutlets++
      }
    }

    for (const b of byBrand.values()) {
      b.percentage = b.totalApplicable > 0
        ? Math.round((b.earnedPoints / b.totalApplicable) * 100)
        : 0

      // Compute earned/max for each service aggregate
      for (const agg of b.serviceAggregates) {
        if (agg.category === 'Feedback') {
          // Feedback: no individual point math — just outlet counts for the bar
          agg.earnedPoints = 0
          agg.maxPoints = 0
        } else {
          agg.earnedPoints = agg.activeOutlets * agg.pointsPerOutlet
          agg.maxPoints = agg.applicableOutlets * agg.pointsPerOutlet
        }
      }
    }

    return Array.from(byBrand.values())
  }, [brandRecords, kamByEmail, brandNameByEmail])

  const uniqueKAMs = useMemo(() => {
    const set = new Set<string>()
    for (const b of brandScores) if (b.kamName) set.add(b.kamName)
    return Array.from(set).sort()
  }, [brandScores])

  const typeSummary = useMemo(() => {
    const map = new Map<string, { count: number; totalPct: number }>()
    for (const b of brandScores) {
      if (!b.outletType) continue
      const cur = map.get(b.outletType) || { count: 0, totalPct: 0 }
      cur.count++
      cur.totalPct += b.percentage
      map.set(b.outletType, cur)
    }
    return map
  }, [brandScores])

  const lowHangingCount = useMemo(
    () => brandScores.filter(isLowHanging).length,
    [brandScores]
  )

  const filtered = useMemo(() => {
    setExpandedBrand(null)
    let list = brandScores.filter(b => {
      if (selectedKAM !== 'all' && b.kamName !== selectedKAM) return false
      if (selectedType !== 'all' && b.outletType !== selectedType) return false
      if (showLowHanging && !isLowHanging(b)) return false
      if (selectedTier === 'high' && b.percentage < 80) return false
      if (selectedTier === 'medium' && (b.percentage < 60 || b.percentage >= 80)) return false
      if (selectedTier === 'low' && b.percentage >= 60) return false
      if (selectedRank !== 'all' && outletRank(b.outletCount) !== selectedRank) return false
      if (search && !b.brandName.toLowerCase().includes(search.toLowerCase())) return false
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
  }, [brandScores, selectedKAM, selectedType, selectedTier, selectedRank, search, sortBy, sortDir, showLowHanging])

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
      ['Brand', 'KAM', 'Outlets', 'Rank', 'Feedback Pass', 'Earned Points', 'Max Points', 'Percentage'],
      ...filtered.map(b => [b.brandName, b.kamName, b.outletCount, outletRank(b.outletCount), b.feedbackPassCount, b.earnedPoints, b.totalApplicable, `${b.percentage}%`])
    ]
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'brand-product-matrix.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  if (isLoading) return <TimelineSkeleton />
  if (error) return <div className="p-8 text-red-600">{error}</div>

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">

        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Brand Product Matrix</h1>
          <p className="text-gray-500 mt-1 text-sm">
            Aggregated weighted product score per brand. Critical = 10 pts · Nice to Have = 5 pts · Feedback group = 10 pts per outlet.
          </p>
        </div>

        <div className="flex gap-3 mb-6 flex-wrap">
          {[
            { label: 'Critical', pts: '10 pts × outlets', cls: 'bg-blue-100 text-blue-800 border-blue-200' },
            { label: 'Nice to Have', pts: '5 pts × outlets', cls: 'bg-purple-100 text-purple-800 border-purple-200' },
            { label: 'Feedback group', pts: '10 pts per outlet if any one active', cls: 'bg-amber-100 text-amber-800 border-amber-200' },
          ].map(l => (
            <span key={l.label} className={`px-3 py-1 rounded-full text-xs font-medium border ${l.cls}`}>
              {l.label} — {l.pts}
            </span>
          ))}
        </div>

        {/* Low Hanging Fruit card + Rules */}
        <div className="mb-6 flex flex-wrap gap-3 items-start">
          {/* The card */}
          <button
            onClick={() => setShowLowHanging(v => !v)}
            className={`rounded-xl border-2 p-4 text-left transition-all min-w-[200px] ${
              showLowHanging
                ? 'border-lime-500 bg-lime-50 ring-2 ring-lime-300'
                : 'border-lime-300 bg-white hover:border-lime-500 hover:bg-lime-50'
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">🍋</span>
              <span className="text-xs font-semibold text-lime-800 uppercase tracking-wide">Low Hanging Fruit</span>
            </div>
            <div className="text-3xl font-bold text-lime-700">{lowHangingCount}</div>
            <div className="text-xs text-lime-600 mt-1">brands missing a key service</div>
            {showLowHanging && <div className="text-xs text-lime-500 mt-1 font-medium">click to clear filter</div>}
          </button>

          {/* Rules reference — always visible */}
          <div className="flex-1 min-w-[260px]">
            <div className="text-xs font-semibold text-gray-500 mb-2">Low Hanging Fruit Rules</div>
            <div className="bg-white border border-gray-200 rounded-lg p-3 grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {Object.entries(LOW_HANGING_RULES).map(([type, rule]) => (
                <div key={type} className="flex items-start gap-2 text-xs">
                  <span className="shrink-0 px-1.5 py-0.5 rounded bg-gray-100 text-gray-700 font-medium">{type}</span>
                  <span className="text-gray-500">→ <span className="text-gray-800 font-medium">{rule!.label}</span> must be active</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Outlet type cards */}
        {typeSummary.size > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
            {Array.from(typeSummary.entries())
              .sort((a, b) => b[1].count - a[1].count)
              .map(([type, stat]) => {
                const avg = Math.round(stat.totalPct / stat.count)
                const isSelected = selectedType === type
                return (
                  <button
                    key={type}
                    onClick={() => setSelectedType(isSelected ? 'all' : type)}
                    className={`rounded-lg p-3 text-left border transition-all ${
                      isSelected
                        ? 'border-blue-400 bg-blue-50 text-blue-800'
                        : 'border-gray-200 bg-white hover:border-gray-400'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-medium truncate">{type}</div>
                      {isSelected && <span className="text-xs opacity-60">✕</span>}
                    </div>
                    <div className="text-lg font-bold mt-1">{avg}%</div>
                    <div className="text-xs opacity-70">{stat.count} brand{stat.count !== 1 ? 's' : ''}</div>
                    <div className="mt-2 h-1.5 rounded-full bg-gray-200 overflow-hidden">
                      <div className={`h-full rounded-full ${scoreColor(avg)}`} style={{ width: `${avg}%` }} />
                    </div>
                  </button>
                )
              })}
          </div>
        )}

        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="text-xs text-gray-500">Avg Score</div>
              <div className="text-2xl font-bold mt-1 text-gray-900">{stats.avg}%</div>
              <div className="text-xs text-gray-400 mt-1">{stats.total} brands · {stats.totalOutlets} outlets</div>
            </div>
            {([
              { key: 'high' as const,      label: 'High (≥80%)',     value: stats.high,     cls: 'text-green-700',  ab: 'border-green-500 bg-green-50',   ring: 'ring-green-300' },
              { key: 'medium' as const,    label: 'Medium (60–79%)', value: stats.medium,   cls: 'text-yellow-700', ab: 'border-yellow-500 bg-yellow-50',  ring: 'ring-yellow-300' },
              { key: 'low' as const,       label: 'Low (<60%)',      value: stats.low,      cls: 'text-orange-700', ab: 'border-orange-500 bg-orange-50',  ring: 'ring-orange-300' },
            ]).map(tier => (
              <button key={tier.key}
                onClick={() => setSelectedTier(selectedTier === tier.key ? 'all' : tier.key)}
                className={`rounded-lg border p-4 text-left transition-all w-full ${selectedTier === tier.key ? `${tier.ab} ring-2 ${tier.ring}` : 'bg-white border-gray-200 hover:border-gray-400'}`}
              >
                <div className="text-xs text-gray-500">{tier.label}</div>
                <div className={`text-2xl font-bold mt-1 ${tier.cls}`}>{tier.value}</div>
                {selectedTier === tier.key && <div className="text-xs text-gray-400 mt-1">click to clear</div>}
              </button>
            ))}
          </div>
        )}

        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4 flex flex-wrap gap-3 items-center">
          <input type="text" placeholder="Search brand..." value={search}
            onChange={e => setSearch(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-1.5 text-sm w-56 focus:outline-none focus:ring-2 focus:ring-gray-400"
          />
          <select value={selectedKAM} onChange={e => setSelectedKAM(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
          >
            <option value="all">All KAMs</option>
            {uniqueKAMs.map(k => <option key={k} value={k}>{k}</option>)}
          </select>
          <select value={selectedRank} onChange={e => setSelectedRank(e.target.value as typeof selectedRank)}
            className="border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
          >
            <option value="all">All Ranks</option>
            <option value="A">A — 501+ outlets</option>
            <option value="B">B — 201–500 outlets</option>
            <option value="C">C — 101–200 outlets</option>
            <option value="D">D — 51–100 outlets</option>
            <option value="E">E — 26–50 outlets</option>
            <option value="F">F — 6–25 outlets</option>
            <option value="G">G — 2–5 outlets</option>
            <option value="H">H — 1 outlet</option>
          </select>
          {(selectedKAM !== 'all' || selectedType !== 'all' || selectedTier !== 'all' || selectedRank !== 'all' || search || showLowHanging) && (
            <button onClick={() => { setSelectedKAM('all'); setSelectedType('all'); setSelectedTier('all'); setSelectedRank('all'); setSearch(''); setShowLowHanging(false) }}
              className="px-3 py-1.5 text-sm text-red-600 border border-red-300 rounded-md hover:bg-red-50"
            >✕ Clear</button>
          )}
          <span className="text-sm text-gray-500 ml-auto">{filtered.length} brands</span>
          <button onClick={downloadCSV} className="ml-2 px-3 py-1.5 bg-white text-gray-700 text-sm rounded-md border border-gray-300 hover:bg-gray-50">
            Export CSV
          </button>
        </div>

        {/* Rank Legend */}
        <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 mb-4">
          <p className="text-xs font-semibold text-indigo-700 uppercase tracking-wide mb-2">Brand Rank — based on number of outlets</p>
          <div className="flex flex-wrap gap-2">
            {([
              { rank: 'A', range: '501+',     desc: 'Enterprise',   bg: 'bg-violet-100 text-violet-800 border-violet-300' },
              { rank: 'B', range: '201–500',  desc: 'Large',        bg: 'bg-blue-100 text-blue-800 border-blue-300' },
              { rank: 'C', range: '101–200',  desc: 'Mid-Large',    bg: 'bg-cyan-100 text-cyan-800 border-cyan-300' },
              { rank: 'D', range: '51–100',   desc: 'Mid',          bg: 'bg-teal-100 text-teal-800 border-teal-300' },
              { rank: 'E', range: '26–50',    desc: 'Growing',      bg: 'bg-green-100 text-green-800 border-green-300' },
              { rank: 'F', range: '6–25',     desc: 'Small',        bg: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
              { rank: 'G', range: '2–5',      desc: 'Micro',        bg: 'bg-orange-100 text-orange-800 border-orange-300' },
              { rank: 'H', range: '1',        desc: 'Single',       bg: 'bg-red-100 text-red-800 border-red-300' },
            ]).map(r => (
              <button
                key={r.rank}
                onClick={() => setSelectedRank(selectedRank === r.rank ? 'all' : r.rank as typeof selectedRank)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium transition-all ${r.bg} ${selectedRank === r.rank ? 'ring-2 ring-offset-1 ring-indigo-400 scale-105' : 'opacity-80 hover:opacity-100'}`}
              >
                <span className="font-bold text-sm">{r.rank}</span>
                <span className="text-gray-600">·</span>
                <span>{r.range} outlets</span>
                <span className="text-gray-500">({r.desc})</span>
              </button>
            ))}
          </div>
          <p className="text-xs text-indigo-500 mt-2">Click a rank to filter · Click again to clear</p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide cursor-pointer hover:text-gray-900 select-none" onClick={() => toggleSort('brand')}>
                    Brand {sortBy === 'brand' ? (sortDir === 'desc' ? '↓' : '↑') : ''}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">KAM</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide cursor-pointer hover:text-gray-900 select-none" onClick={() => toggleSort('outlets')}>
                    Outlets {sortBy === 'outlets' ? (sortDir === 'desc' ? '↓' : '↑') : ''}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Rank</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Feedback Pass</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Points</th>
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
                  <tr><td colSpan={11} className="px-4 py-8 text-center text-gray-400">No brands found</td></tr>
                )}
                {filtered.map(b => {
                  const allFail = b.feedbackPassCount === 0
                  const badge = scoreBadge(b.percentage, !allFail)
                  const isExpanded = expandedBrand === b.brandName
                  return (
                    <React.Fragment key={b.brandName}>
                      <tr className={`hover:bg-gray-50 transition-colors ${allFail ? 'bg-red-50' : ''}`}>
                        <td className="px-4 py-3 font-medium text-gray-900">{b.brandName}</td>
                        <td className="px-4 py-3 text-gray-600 text-xs">{b.kamName || '—'}</td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-700">{b.outletType || '—'}</span>
                        </td>
                        <td className="px-4 py-3 text-gray-700">{b.outletCount}</td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-indigo-100 text-indigo-800">{outletRank(b.outletCount)}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-sm font-semibold ${b.feedbackPassCount === 0 ? 'text-red-600' : 'text-green-700'}`}>
                            {b.feedbackPassCount} / {b.outletCount}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-semibold text-gray-900">{b.earnedPoints} / {b.totalApplicable}</td>
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
                            {isExpanded ? 'Hide' : 'View'}
                          </button>
                        </td>
                      </tr>

                      {isExpanded && (
                        <tr>
                          <td colSpan={11} className="bg-slate-50 border-b border-gray-200 px-6 py-5">
                            <BrandServiceBreakdown brand={b} />
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

// ─── Brand Service Breakdown Panel ───────────────────────────────────────────

interface BrandServiceBreakdownProps {
  brand: {
    brandName: string
    outletCount: number
    feedbackPassCount: number
    earnedPoints: number
    totalApplicable: number
    percentage: number
    criticalEarned: number
    criticalTotal: number
    niceToHaveEarned: number
    niceToHaveTotal: number
    feedbackEarned: number
    feedbackTotal: number
    serviceAggregates: ServiceAggregate[]
  }
}

function ServiceRow({ agg }: { agg: ServiceAggregate }) {
  const pct = agg.applicableOutlets > 0 ? Math.round((agg.activeOutlets / agg.applicableOutlets) * 100) : 0
  const isActive = agg.activeOutlets > 0
  const allActive = agg.activeOutlets === agg.applicableOutlets
  const isFeedback = agg.category === 'Feedback'

  const rowBg = allActive ? 'bg-green-50 border-green-200' : isActive ? 'bg-yellow-50 border-yellow-200' : 'bg-white border-gray-200'
  const iconCls = allActive ? 'text-green-600' : isActive ? 'text-yellow-500' : 'text-gray-300'
  const nameCls = allActive ? 'text-green-800' : isActive ? 'text-yellow-800' : 'text-gray-500'
  const ptsCls  = allActive ? 'text-green-700' : isActive ? 'text-yellow-700' : 'text-gray-400'

  return (
    <div className={`flex items-center gap-1.5 px-2 py-1.5 rounded border text-xs ${rowBg}`}>
      {/* icon */}
      <span className={`shrink-0 font-bold ${iconCls}`} style={{ width: 10 }}>
        {allActive ? '✓' : isActive ? '~' : '✗'}
      </span>

      {/* name */}
      <span className={`shrink-0 truncate font-medium ${nameCls}`} style={{ width: 130 }} title={fmt(agg.name)}>
        {fmt(agg.name)}
      </span>

      {/* bar */}
      <div className="shrink-0 h-2 rounded-full bg-gray-200 overflow-hidden" style={{ width: 64 }}>
        <div className={`h-full rounded-full transition-all ${barColor(pct)}`} style={{ width: `${pct}%` }} />
      </div>

      {/* outlets */}
      <span className="shrink-0 text-gray-500 text-right" style={{ width: 52 }}>
        {agg.activeOutlets}/{agg.applicableOutlets}
      </span>

      {/* points — only for non-feedback */}
      {!isFeedback && (
        <span className={`shrink-0 text-right font-semibold ${ptsCls}`} style={{ width: 60 }}>
          {agg.earnedPoints}/{agg.maxPoints}
        </span>
      )}
      {isFeedback && (
        <span className="shrink-0 text-gray-400 italic text-right" style={{ width: 60, fontSize: 10 }}>
          group
        </span>
      )}
    </div>
  )
}

function BrandServiceBreakdown({ brand }: BrandServiceBreakdownProps) {
  const critical = brand.serviceAggregates.filter(a => a.category === 'Critical')
  const niceToHave = brand.serviceAggregates.filter(a => a.category === 'Nice to Have')
  const feedback = brand.serviceAggregates.filter(a => a.category === 'Feedback')

  const criticalPct = brand.criticalTotal > 0 ? Math.round((brand.criticalEarned / brand.criticalTotal) * 100) : 0
  const nthPct = brand.niceToHaveTotal > 0 ? Math.round((brand.niceToHaveEarned / brand.niceToHaveTotal) * 100) : 0
  const fbPct = brand.feedbackTotal > 0 ? Math.round((brand.feedbackEarned / brand.feedbackTotal) * 100) : 0

  return (
    <div>
      {/* Summary chips */}
      <div className="flex gap-3 mb-4 flex-wrap">
        <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-50 border border-blue-200 text-blue-800 text-xs font-semibold">
          <span>Critical</span>
          <span className="font-bold">{brand.criticalEarned} / {brand.criticalTotal} pts</span>
          <div className="w-20 h-1.5 rounded-full bg-blue-200 overflow-hidden">
            <div className="h-full rounded-full bg-blue-500" style={{ width: `${criticalPct}%` }} />
          </div>
          <span>{criticalPct}%</span>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-50 border border-purple-200 text-purple-800 text-xs font-semibold">
          <span>Nice to Have</span>
          <span className="font-bold">{brand.niceToHaveEarned} / {brand.niceToHaveTotal} pts</span>
          <div className="w-20 h-1.5 rounded-full bg-purple-200 overflow-hidden">
            <div className="h-full rounded-full bg-purple-500" style={{ width: `${nthPct}%` }} />
          </div>
          <span>{nthPct}%</span>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold">
          <span>Feedback group</span>
          <span className="font-bold">{brand.feedbackEarned} / {brand.feedbackTotal} pts</span>
          <div className="w-20 h-1.5 rounded-full bg-amber-200 overflow-hidden">
            <div className="h-full rounded-full bg-amber-500" style={{ width: `${fbPct}%` }} />
          </div>
          <span>{brand.feedbackPassCount}/{brand.outletCount} outlets</span>
        </div>
      </div>

      {/* Service columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Critical */}
        <div>
          <div className="text-xs font-semibold text-blue-700 mb-2">
            Critical ({critical.filter(a => a.activeOutlets === a.applicableOutlets).length}/{critical.length} fully active)
          </div>
          <div className="flex items-center gap-1.5 px-2 py-1 text-xs text-gray-400 mb-1">
            <span style={{ width: 10 }} />
            <span style={{ width: 130 }}>Service</span>
            <span style={{ width: 64 }}>Bar</span>
            <span style={{ width: 52, textAlign: 'right' }}>Out.</span>
            <span style={{ width: 60, textAlign: 'right' }}>Pts</span>
          </div>
          <div className="flex flex-col gap-1">
            {critical.map(agg => <ServiceRow key={agg.name} agg={agg} />)}
          </div>
        </div>

        {/* Nice to Have */}
        <div>
          <div className="text-xs font-semibold text-purple-700 mb-2">
            Nice to Have ({niceToHave.filter(a => a.activeOutlets === a.applicableOutlets).length}/{niceToHave.length} fully active)
          </div>
          <div className="flex items-center gap-1.5 px-2 py-1 text-xs text-gray-400 mb-1">
            <span style={{ width: 10 }} />
            <span style={{ width: 130 }}>Service</span>
            <span style={{ width: 64 }}>Bar</span>
            <span style={{ width: 52, textAlign: 'right' }}>Out.</span>
            <span style={{ width: 60, textAlign: 'right' }}>Pts</span>
          </div>
          <div className="flex flex-col gap-1">
            {niceToHave.map(agg => <ServiceRow key={agg.name} agg={agg} />)}
          </div>
        </div>

        {/* Feedback */}
        <div>
          <div className="text-xs font-semibold text-amber-700 mb-2 flex items-center gap-2">
            Feedback group — {brand.feedbackEarned}/{brand.feedbackTotal} pts
            <span className={`px-1.5 py-0.5 rounded text-xs ${brand.feedbackPassCount > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
              {brand.feedbackPassCount > 0 ? `✓ ${brand.feedbackPassCount} outlets active` : '✗ none active'}
            </span>
          </div>
          <div className="flex items-center gap-1.5 px-2 py-1 text-xs text-gray-400 mb-1">
            <span style={{ width: 10 }} />
            <span style={{ width: 130 }}>Service</span>
            <span style={{ width: 64 }}>Bar</span>
            <span style={{ width: 52, textAlign: 'right' }}>Out.</span>
            <span style={{ width: 60 }} />
          </div>
          <div className="flex flex-col gap-1">
            {feedback.map(agg => <ServiceRow key={agg.name} agg={agg} />)}
          </div>
          <div className="mt-3 text-xs text-gray-400 italic">
            Any one feedback service active per outlet = 10 pts for that outlet
          </div>
        </div>

      </div>
    </div>
  )
}
