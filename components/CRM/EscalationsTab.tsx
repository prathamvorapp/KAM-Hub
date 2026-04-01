'use client'

import { useState, useEffect, useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LabelList } from 'recharts'
import { Download } from 'lucide-react'
import SearchableMultiSelect from './SearchableMultiSelect'

interface Escalation {
  id: string
  brand_name: string
  kam_name?: string
  team_name?: string
  classification: string
  description: string
  brand_nature?: 'Red' | 'Orange' | 'Amber'
  responsible_party?: string
  status: 'open' | 'closed'
  raised_by: string
  resolution_days?: number
  created_at: string
  updated_at: string
}

interface KAMRow {
  kam: string
  amber: number
  orange: number
  red: number
  total: number
}

interface ChartPoint {
  range: string
  count: number
}

export default function EscalationsTab() {
  const [records, setRecords] = useState<Escalation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filters
  const [kamFilter, setKamFilter] = useState<string[]>([])
  const [teamFilter, setTeamFilter] = useState<string[]>([])
  const [natureFilter, setNatureFilter] = useState<string[]>([])
  const [statusFilter, setStatusFilter] = useState<string[]>([])
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  useEffect(() => { fetchAll() }, [])

  // Clear KAM filter when team changes
  useEffect(() => { setKamFilter([]) }, [teamFilter])

  const fetchAll = async () => {
    try {
      setLoading(true)
      setError(null)
      let all: Escalation[] = []
      let page = 1
      const limit = 500
      let hasMore = true
      while (hasMore) {
        const res = await fetch(`/api/data/escalations?status=all&limit=${limit}&page=${page}`)
        const json = await res.json()
        if (!res.ok || !json.success) throw new Error(json.error || 'Failed to fetch escalations')
        const batch: Escalation[] = json.data.escalations || []
        all = [...all, ...batch]
        hasMore = batch.length === limit
        page++
      }
      setRecords(all)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  // Unique filter options
  const uniqueKAMs = useMemo(() => {
    const base = teamFilter.length > 0
      ? records.filter(r => teamFilter.includes(r.team_name || ''))
      : records
    return [...new Set(base.map(r => r.kam_name).filter(Boolean) as string[])].sort()
  }, [records, teamFilter])

  const uniqueTeams = useMemo(() =>
    [...new Set(records.map(r => r.team_name).filter(Boolean) as string[])].sort()
  , [records])

  // Apply filters
  const filtered = useMemo(() => {
    return records.filter(r => {
      if (kamFilter.length && !kamFilter.includes(r.kam_name || '')) return false
      if (teamFilter.length && !teamFilter.includes(r.team_name || '')) return false
      if (natureFilter.length && !natureFilter.includes(r.brand_nature || '')) return false
      if (statusFilter.length && !statusFilter.includes(r.status)) return false
      if (dateFrom && new Date(r.created_at) < new Date(dateFrom)) return false
      if (dateTo && new Date(r.created_at) > new Date(dateTo + 'T23:59:59')) return false
      return true
    })
  }, [records, kamFilter, teamFilter, natureFilter, statusFilter, dateFrom, dateTo])

  // Summary cards
  const totalEscalations = filtered.length
  const totalOpen = filtered.filter(r => r.status === 'open').length
  const redCount = filtered.filter(r => r.brand_nature === 'Red').length
  const orangeCount = filtered.filter(r => r.brand_nature === 'Orange').length

  // This-month date-range chart (5-day buckets)
  const chartData = useMemo((): ChartPoint[] => {
    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth()
    const daysInMonth = new Date(year, month + 1, 0).getDate()

    const buckets: ChartPoint[] = []
    for (let start = 1; start <= daysInMonth; start += 5) {
      const end = Math.min(start + 4, daysInMonth)
      buckets.push({ range: `${start}-${end}`, count: 0 })
    }

    filtered.forEach(r => {
      const d = new Date(r.created_at)
      if (d.getFullYear() === year && d.getMonth() === month) {
        const day = d.getDate()
        const idx = Math.floor((day - 1) / 5)
        if (idx < buckets.length) buckets[idx].count++
      }
    })
    return buckets
  }, [filtered])

  // KAM summary table
  const kamRows = useMemo((): KAMRow[] => {
    const map: Record<string, KAMRow> = {}
    filtered.forEach(r => {
      const kam = r.kam_name || r.raised_by || 'Unknown'
      if (!map[kam]) map[kam] = { kam, amber: 0, orange: 0, red: 0, total: 0 }
      if (r.brand_nature === 'Amber') map[kam].amber++
      else if (r.brand_nature === 'Orange') map[kam].orange++
      else if (r.brand_nature === 'Red') map[kam].red++
      map[kam].total++
    })
    return Object.values(map).sort((a, b) => b.total - a.total)
  }, [filtered])

  const kamTotals = useMemo(() =>
    kamRows.reduce((acc, r) => ({
      amber: acc.amber + r.amber,
      orange: acc.orange + r.orange,
      red: acc.red + r.red,
      total: acc.total + r.total,
    }), { amber: 0, orange: 0, red: 0, total: 0 })
  , [kamRows])

  const clearFilters = () => {
    setKamFilter([])
    setTeamFilter([])
    setNatureFilter([])
    setStatusFilter([])
    setDateFrom('')
    setDateTo('')
  }

  const exportCSV = (data: any[], filename: string) => {
    if (!data.length) return
    const headers = Object.keys(data[0])
    const csv = [headers.join(','), ...data.map(row =>
      headers.map(h => {
        const v = row[h]
        return typeof v === 'string' && v.includes(',') ? `"${v}"` : (v ?? '')
      }).join(',')
    )].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = filename; a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) return (
    <div className="flex items-center justify-center py-12">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
    </div>
  )

  if (error) return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
      <p className="text-red-800">Error: {error}</p>
    </div>
  )

  return (
    <div className="space-y-8">

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-5 border border-blue-200">
          <p className="text-xs text-secondary-600 mb-1">Total Escalations</p>
          <p className="text-3xl font-bold text-blue-700">{totalEscalations}</p>
        </div>
        <div className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-xl p-5 border border-yellow-200">
          <p className="text-xs text-secondary-600 mb-1">Total Open</p>
          <p className="text-3xl font-bold text-orange-600">{totalOpen}</p>
        </div>
        <div className="bg-gradient-to-br from-red-50 to-rose-50 rounded-xl p-5 border border-red-200">
          <p className="text-xs text-secondary-600 mb-1">Red Escalations</p>
          <p className="text-3xl font-bold text-red-600">{redCount}</p>
        </div>
        <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl p-5 border border-orange-200">
          <p className="text-xs text-secondary-600 mb-1">Orange Escalations</p>
          <p className="text-3xl font-bold text-amber-600">{orangeCount}</p>
        </div>
      </div>

      {/* This Month Chart */}
      <div className="bg-white rounded-xl p-6 border border-gray-200">
        <h3 className="text-lg font-bold text-secondary-800 mb-4">📅 This Month — Escalations by Date Range</h3>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={chartData} margin={{ top: 16, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="range" tick={{ fontSize: 12 }} />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Bar dataKey="count" fill="#6366f1" name="Escalations" radius={[4, 4, 0, 0]}>
              <LabelList dataKey="count" position="top" style={{ fontSize: 12, fontWeight: 600, fill: '#4338ca' }} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Filters */}
      <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-secondary-800">Filters</h2>
          <button onClick={clearFilters} className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-secondary-800 rounded-lg text-sm transition-colors">
            Clear Filters
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <SearchableMultiSelect label="KAM" options={uniqueKAMs} selected={kamFilter} onChange={setKamFilter} />
          <SearchableMultiSelect label="Team" options={uniqueTeams} selected={teamFilter} onChange={setTeamFilter} />
          <SearchableMultiSelect label="Nature" options={['Red', 'Orange', 'Amber']} selected={natureFilter} onChange={setNatureFilter} />
          <SearchableMultiSelect label="Status" options={['open', 'closed']} selected={statusFilter} onChange={setStatusFilter} />
          <div>
            <label className="block text-secondary-700 text-sm mb-2">Date From</label>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-secondary-800 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-200" />
          </div>
          <div>
            <label className="block text-secondary-700 text-sm mb-2">Date To</label>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-secondary-800 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-200" />
          </div>
        </div>
      </div>

      {/* Table 1: KAM Summary */}
      <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-xl p-6 border border-indigo-200">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-secondary-800">👤 KAM Escalation Summary</h3>
          <button onClick={() => exportCSV(kamRows, 'kam-escalation-summary.csv')}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm">
            <Download size={16} /> Export CSV
          </button>
        </div>
        <div className="bg-white rounded-lg overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-secondary-50">
                <tr>
                  {['KAM', 'Amber Count', 'Orange Count', 'Red Count', 'Total Count'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-secondary-700 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-secondary-100">
                {kamRows.map((row, i) => (
                  <tr key={i} className="hover:bg-secondary-50 transition-colors">
                    <td className="px-4 py-3 text-sm text-secondary-900">{row.kam}</td>
                    <td className="px-4 py-3 text-sm text-amber-600 font-medium">{row.amber}</td>
                    <td className="px-4 py-3 text-sm text-orange-600 font-medium">{row.orange}</td>
                    <td className="px-4 py-3 text-sm text-red-600 font-medium">{row.red}</td>
                    <td className="px-4 py-3 text-sm font-bold text-secondary-800">{row.total}</td>
                  </tr>
                ))}
                <tr className="bg-indigo-100 border-t-2 border-indigo-300 font-bold">
                  <td className="px-4 py-3 text-sm font-bold text-secondary-900">Total</td>
                  <td className="px-4 py-3 text-sm text-amber-700 font-bold">{kamTotals.amber}</td>
                  <td className="px-4 py-3 text-sm text-orange-700 font-bold">{kamTotals.orange}</td>
                  <td className="px-4 py-3 text-sm text-red-700 font-bold">{kamTotals.red}</td>
                  <td className="px-4 py-3 text-sm font-bold text-secondary-900">{kamTotals.total}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Table 2: Escalation Details */}
      <div className="bg-white rounded-xl p-6 border border-gray-200">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-secondary-800">📋 Escalation Details</h3>
          <button onClick={() => exportCSV(filtered.map(r => ({
            brand: r.brand_name,
            classification: r.classification,
            description: r.description,
            nature: r.brand_nature || '',
            kam: r.kam_name || '',
            status: r.status,
            raised_on: new Date(r.created_at).toLocaleDateString(),
            resolution_days: r.resolution_days ?? '',
          })), 'escalation-details.csv')}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm">
            <Download size={16} /> Export CSV
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-secondary-50">
              <tr>
                {['Brand', 'Classification', 'Description', 'Nature', 'KAM', 'Status', 'Raised On', 'Resolution (days)'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-secondary-700 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-secondary-100">
              {filtered.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-secondary-500">No escalations found</td></tr>
              ) : filtered.map(r => (
                <tr key={r.id} className="hover:bg-secondary-50 transition-colors">
                  <td className="px-4 py-3 text-sm text-secondary-900 font-medium whitespace-nowrap">{r.brand_name}</td>
                  <td className="px-4 py-3 text-sm text-secondary-700 whitespace-nowrap">{r.classification}</td>
                  <td className="px-4 py-3 text-sm text-secondary-700 max-w-xs truncate" title={r.description}>{r.description}</td>
                  <td className="px-4 py-3 text-sm whitespace-nowrap">
                    {r.brand_nature ? (
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        r.brand_nature === 'Red' ? 'bg-red-100 text-red-700' :
                        r.brand_nature === 'Orange' ? 'bg-orange-100 text-orange-700' :
                        'bg-amber-100 text-amber-700'
                      }`}>{r.brand_nature}</span>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3 text-sm text-secondary-700 whitespace-nowrap">{r.kam_name || '—'}</td>
                  <td className="px-4 py-3 text-sm whitespace-nowrap">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                      r.status === 'open' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                    }`}>{r.status}</span>
                  </td>
                  <td className="px-4 py-3 text-sm text-secondary-600 whitespace-nowrap">{new Date(r.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-sm text-secondary-600 text-center">{r.resolution_days ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-secondary-500 mt-3">{filtered.length} record{filtered.length !== 1 ? 's' : ''}</p>
      </div>

    </div>
  )
}
