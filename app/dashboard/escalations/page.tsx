'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import DashboardLayout from '@/components/Layout/DashboardLayout'
import { RouteGuard } from '@/components/RouteGuard'
import {
  AlertTriangle, Plus, X, Edit2, CheckCircle, ChevronDown,
  Search, Bell, Clock, ChevronLeft, ChevronRight, History,
  MessageSquare, Eye, Download,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

const CLASSIFICATIONS = [
  'POS Config', 'Menu Management', 'Inventory Management', 'MP Service',
  'Payroll', 'Task', 'Report', 'Purchase', 'Payment/EDC Issue',
  'Renewal & Retention', 'Training & Development', 'Development',
  'Integration', 'Embedded Finance',
]
const BRAND_NATURES = ['Red', 'Orange', 'Amber'] as const
const RESPONSIBLE_PARTIES = ['Brand', 'KAM', 'Another Department'] as const
const PAGE_SIZE = 20

type BrandNature = typeof BRAND_NATURES[number]
type ResponsibleParty = typeof RESPONSIBLE_PARTIES[number]

interface MasterBrand { id: string; brand_name: string; kam_email_id: string; zone?: string }

interface Escalation {
  id: string; brand_name: string; brand_id?: string
  kam_email: string; kam_name?: string; team_name?: string
  classification: string; description: string
  brand_nature?: BrandNature; responsible_party?: ResponsibleParty
  status: 'open' | 'closed'; close_reason?: string
  closed_at?: string; closed_by?: string; resolution_days?: number
  team_lead_remark?: string; team_lead_remark_updated_at?: string; team_lead_remark_updated_by?: string
  raised_by: string; created_at: string; updated_at: string
}

interface EscalationLog {
  id: string; escalation_id: string; action: string
  changed_by: string; changed_by_name?: string
  changed_fields?: Record<string, { from: any; to: any }>
  note?: string; created_at: string
}

interface EscalationNotification {
  id: string; escalation_id: string; type: string
  message: string; is_read: boolean; created_at: string
}

const natureColors: Record<BrandNature, string> = {
  Red: 'bg-red-100 text-red-700 border-red-200',
  Orange: 'bg-orange-100 text-orange-700 border-orange-200',
  Amber: 'bg-amber-100 text-amber-700 border-amber-200',
}
const natureDot: Record<BrandNature, string> = {
  Red: 'bg-red-500', Orange: 'bg-orange-500', Amber: 'bg-amber-400',
}

function resolutionLabel(days?: number): string {
  if (days === undefined || days === null) return '—'
  if (days === 0) return '1D'
  return `${days}D`
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function EscalationsPage() {
  const { userProfile } = useAuth()
  const [escalations, setEscalations] = useState<Escalation[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'closed'>('open')
  const [search, setSearch] = useState('')
  const [selectedKams, setSelectedKams] = useState<string[]>([])
  const [natureFilter, setNatureFilter] = useState<string>('')
  const [showForm, setShowForm] = useState(false)
  const [editTarget, setEditTarget] = useState<Escalation | null>(null)
  const [closeTarget, setCloseTarget] = useState<Escalation | null>(null)
  const [logsTarget, setLogsTarget] = useState<Escalation | null>(null)
  const [viewTarget, setViewTarget] = useState<Escalation | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [notifications, setNotifications] = useState<EscalationNotification[]>([])
  const [showNotifs, setShowNotifs] = useState(false)

  const role = (userProfile?.role || '').toLowerCase().replace(/\s+/g, '_')
  const isTeamLeadOrAdmin = role === 'team_lead' || role === 'admin'
  const totalPages = Math.ceil(total / PAGE_SIZE)

  const fetchEscalations = useCallback(async (p = page) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ status: statusFilter, page: String(p), limit: String(PAGE_SIZE) })
      if (search) params.set('brand_name', search)
      if (natureFilter) params.set('brand_nature', natureFilter)
      const res = await fetch(`/api/data/escalations?${params}`)
      const json = await res.json()
      if (json.success) { setEscalations(json.data.escalations); setTotal(json.data.total) }
    } finally { setLoading(false) }
  }, [statusFilter, search, natureFilter, page])

  const fetchNotifications = useCallback(async () => {
    const res = await fetch('/api/data/escalations/notifications?unread=true')
    const json = await res.json()
    if (json.success) setNotifications(json.data)
  }, [])

  useEffect(() => { fetchEscalations(page) }, [statusFilter, search, natureFilter, page])
  useEffect(() => { fetchNotifications() }, [])

  // Reset to page 1 when filters change
  useEffect(() => { setPage(1) }, [statusFilter, search, natureFilter])

  // Derive unique KAM list from loaded escalations
  const kamOptions = Array.from(
    new Map(escalations.map(e => [e.kam_email, e.kam_name || e.kam_email])).entries()
  ).sort((a, b) => a[1].localeCompare(b[1]))

  // Client-side KAM filter applied on top of server results
  const displayedEscalations = selectedKams.length
    ? escalations.filter(e => selectedKams.includes(e.kam_email))
    : escalations

  const showMsg = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text })
    setTimeout(() => setMessage(null), 3500)
  }

  const markNotifsRead = async () => {
    if (!notifications.length) return
    await fetch('/api/data/escalations/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: notifications.map(n => n.id) }),
    })
    setNotifications([])
  }

  const unreadCount = notifications.filter(n => !n.is_read).length

  const handleExport = async () => {
    // Fetch all matching records (no pagination limit)
    const params = new URLSearchParams({ status: statusFilter, page: '1', limit: '9999' })
    if (search) params.set('brand_name', search)
    if (natureFilter) params.set('brand_nature', natureFilter)
    const res = await fetch(`/api/data/escalations?${params}`)
    const json = await res.json()
    if (!json.success) return showMsg('error', 'Export failed')

    let rows: Escalation[] = json.data.escalations
    // Apply client-side KAM filter for export too
    if (selectedKams.length) rows = rows.filter(r => selectedKams.includes(r.kam_email))
    if (!rows.length) return showMsg('error', 'No data to export')

    const headers = [
      'Brand', 'Classification', 'Description', 'Nature', 'Responsible Party',
      'TL Remark', 'KAM', 'KAM Email', 'Team', 'Status',
      'Closing Remarks', 'Resolution Days', 'Raised By', 'Raised On', 'Closed On',
    ]

    const escape = (v: any) => {
      const s = String(v ?? '')
      return s.includes(',') || s.includes('"') || s.includes('\n')
        ? `"${s.replace(/"/g, '""')}"` : s
    }

    const csvRows = [
      headers.join(','),
      ...rows.map(r => [
        r.brand_name, r.classification, r.description,
        r.brand_nature ?? '', r.responsible_party ?? '',
        r.team_lead_remark ?? '', r.kam_name ?? r.kam_email, r.kam_email,
        r.team_name ?? '', r.status, r.close_reason ?? '',
        r.resolution_days !== undefined && r.resolution_days !== null
          ? (r.resolution_days === 0 ? '1D' : `${r.resolution_days}D`)
          : '',
        r.raised_by, new Date(r.created_at).toLocaleDateString(),
        r.closed_at ? new Date(r.closed_at).toLocaleDateString() : '',
      ].map(escape).join(',')),
    ]

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `escalations_${statusFilter}_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <RouteGuard requireAuth={true}>
      <DashboardLayout userProfile={userProfile}>
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6">
          <div className="max-w-7xl mx-auto">

            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-red-500 to-orange-500 flex items-center justify-center shadow-sm">
                  <AlertTriangle className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Escalation Tracker</h1>
                  <p className="text-sm text-gray-500">{total} escalation{total !== 1 ? 's' : ''} found</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {/* Notification Bell */}
                <div className="relative">
                  <button
                    onClick={() => { setShowNotifs(v => !v); if (!showNotifs) markNotifsRead() }}
                    className="relative p-2 rounded-xl bg-white border border-gray-200 hover:bg-gray-50 transition-colors shadow-sm"
                  >
                    <Bell className="w-4 h-4 text-gray-600" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </button>
                  <AnimatePresence>
                    {showNotifs && (
                      <NotificationPanel
                        notifications={notifications}
                        onClose={() => setShowNotifs(false)}
                      />
                    )}
                  </AnimatePresence>
                </div>
                <button
                  onClick={handleExport}
                  className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl shadow-sm hover:bg-gray-50 hover:shadow transition-all text-sm font-medium"
                  title="Export to CSV"
                >
                  <Download className="w-4 h-4" /> Export
                </button>
                <button
                  onClick={() => { setEditTarget(null); setShowForm(true) }}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-xl shadow hover:shadow-md transition-all text-sm font-medium"
                >
                  <Plus className="w-4 h-4" /> Raise Escalation
                </button>              </div>
            </div>

            {/* Toast */}
            <AnimatePresence>
              {message && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                  className={`mb-4 px-4 py-3 rounded-xl text-sm font-medium ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}
                >
                  {message.text}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Filters */}
            <div className="flex flex-wrap gap-3 mb-6">
              <div className="flex bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                {(['open', 'closed', 'all'] as const).map(s => (
                  <button key={s} onClick={() => setStatusFilter(s)}
                    className={`px-4 py-2 text-sm font-medium capitalize transition-colors ${statusFilter === s ? 'bg-gradient-to-r from-red-500 to-orange-500 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
                    {s}
                  </button>
                ))}
              </div>
              {/* Brand search */}
              <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2 shadow-sm w-44">
                <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <input value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Search brand..." className="text-sm outline-none flex-1 text-gray-700 placeholder-gray-400 min-w-0" />
              </div>
              {/* KAM multi-select */}
              <KamMultiSelect
                options={kamOptions}
                selected={selectedKams}
                onChange={setSelectedKams}
              />
              {/* Nature filter */}
              <div className="relative">
                <select value={natureFilter} onChange={e => setNatureFilter(e.target.value)}
                  className={`bg-white border rounded-xl px-3 py-2 text-sm shadow-sm outline-none appearance-none pr-8 transition-colors ${natureFilter ? 'border-orange-400 text-orange-700' : 'border-gray-200 text-gray-600'}`}>
                  <option value="">All Natures</option>
                  {BRAND_NATURES.map(n => <option key={n} value={n}>{n}</option>)}
                </select>
                <ChevronDown className="absolute right-2.5 top-2.5 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              {loading ? (
                <div className="flex items-center justify-center py-16 text-gray-400 text-sm">Loading...</div>
              ) : displayedEscalations.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                  <AlertTriangle className="w-10 h-10 mb-3 opacity-30" />
                  <p className="text-sm">No escalations found</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-100">
                        <th className="text-left px-4 py-3 font-semibold text-gray-600">Brand</th>
                        <th className="text-left px-4 py-3 font-semibold text-gray-600">Classification</th>
                        <th className="text-left px-4 py-3 font-semibold text-gray-600">Description</th>
                        <th className="text-left px-4 py-3 font-semibold text-gray-600">Nature</th>
                        <th className="text-left px-4 py-3 font-semibold text-gray-600">Responsible</th>
                        <th className="text-left px-4 py-3 font-semibold text-gray-600">TL Remark</th>
                        <th className="text-left px-4 py-3 font-semibold text-gray-600">KAM</th>
                        <th className="text-left px-4 py-3 font-semibold text-gray-600">Status</th>
                        <th className="text-left px-4 py-3 font-semibold text-gray-600">Time</th>
                        <th className="text-left px-4 py-3 font-semibold text-gray-600">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {displayedEscalations.map((esc, i) => (
                        <motion.tr key={esc.id}
                          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.02 }}
                          className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors"
                        >
                          <td className="px-4 py-3">
                            <p className="font-medium text-gray-900">{esc.brand_name}</p>
                            {esc.kam_email !== userProfile?.email && (
                              <p className="text-xs text-amber-600 mt-0.5">↩ transferred brand</p>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded-lg text-xs">{esc.classification}</span>
                          </td>
                          <td className="px-4 py-3 text-gray-600 max-w-xs">
                            <p className="truncate" title={esc.description}>{esc.description}</p>
                            {esc.close_reason && (
                              <p className="text-xs text-gray-400 mt-0.5 truncate" title={esc.close_reason}>
                                ✓ {esc.close_reason}
                              </p>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {esc.brand_nature ? (
                              <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium border ${natureColors[esc.brand_nature]}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${natureDot[esc.brand_nature]}`} />
                                {esc.brand_nature}
                              </span>
                            ) : <span className="text-gray-400 text-xs">—</span>}
                          </td>
                          <td className="px-4 py-3">
                            {esc.responsible_party ? (
                              <span className={`px-2 py-1 rounded-lg text-xs font-medium ${esc.responsible_party === 'Brand' ? 'bg-purple-50 text-purple-700' : esc.responsible_party === 'KAM' ? 'bg-yellow-50 text-yellow-700' : 'bg-teal-50 text-teal-700'}`}>
                                {esc.responsible_party}
                              </span>
                            ) : <span className="text-gray-400 text-xs">Pending</span>}
                          </td>
                          <td className="px-4 py-3 max-w-[140px]">
                            {esc.team_lead_remark ? (
                              <p className="text-xs text-indigo-700 truncate" title={esc.team_lead_remark}>
                                <MessageSquare className="w-3 h-3 inline mr-1 opacity-60" />
                                {esc.team_lead_remark}
                              </p>
                            ) : <span className="text-gray-400 text-xs">—</span>}
                          </td>
                          <td className="px-4 py-3 text-xs">
                            <p className="text-gray-700">{esc.kam_name || esc.kam_email}</p>
                            {esc.raised_by && esc.raised_by !== esc.kam_email && (
                              <p className="text-gray-400 mt-0.5">via {esc.raised_by}</p>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 rounded-lg text-xs font-medium ${esc.status === 'open' ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                              {esc.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs whitespace-nowrap">
                            <p className="text-gray-400">{new Date(esc.created_at).toLocaleDateString()}</p>
                            {esc.status === 'closed' && esc.resolution_days !== undefined && (
                              <p className="text-blue-600 font-medium flex items-center gap-1 mt-0.5">
                                <Clock className="w-3 h-3" />
                                {resolutionLabel(esc.resolution_days)}
                              </p>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1">
                              {/* View — always visible */}
                              <button onClick={() => setViewTarget(esc)}
                                className="p-1.5 rounded-lg hover:bg-purple-50 text-purple-500 transition-colors" title="View details">
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                              {/* Edit: open for KAM/TL, closed only for TL */}
                              {(esc.status === 'open' || isTeamLeadOrAdmin) && (
                                <button onClick={() => { setEditTarget(esc); setShowForm(true) }}
                                  className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-500 transition-colors" title="Edit">
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                              {/* Close */}
                              {esc.status === 'open' && (esc.kam_email === userProfile?.email || esc.raised_by === userProfile?.email || isTeamLeadOrAdmin) && (
                                <button onClick={() => setCloseTarget(esc)}
                                  className="p-1.5 rounded-lg hover:bg-green-50 text-green-500 transition-colors" title="Close escalation">
                                  <CheckCircle className="w-3.5 h-3.5" />
                                </button>
                              )}
                              {/* Logs */}
                              <button onClick={() => setLogsTarget(esc)}
                                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors" title="View change log">
                                <History className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
                  <p className="text-xs text-gray-500">
                    Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}
                  </p>
                  <div className="flex items-center gap-1">
                    <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                      className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-40 transition-colors">
                      <ChevronLeft className="w-4 h-4 text-gray-600" />
                    </button>
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      const start = Math.max(1, Math.min(page - 2, totalPages - 4))
                      const p = start + i
                      return (
                        <button key={p} onClick={() => setPage(p)}
                          className={`w-7 h-7 rounded-lg text-xs font-medium transition-colors ${p === page ? 'bg-gradient-to-r from-red-500 to-orange-500 text-white' : 'hover:bg-gray-100 text-gray-600'}`}>
                          {p}
                        </button>
                      )
                    })}
                    <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                      className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-40 transition-colors">
                      <ChevronRight className="w-4 h-4 text-gray-600" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Modals */}
        <AnimatePresence>
          {showForm && (
            <EscalationForm
              existing={editTarget}
              userProfile={userProfile}
              isTeamLeadOrAdmin={isTeamLeadOrAdmin}
              onClose={() => { setShowForm(false); setEditTarget(null) }}
              onSaved={() => { setShowForm(false); setEditTarget(null); fetchEscalations(page); showMsg('success', editTarget ? 'Escalation updated' : 'Escalation raised') }}
              onError={(msg) => showMsg('error', msg)}
            />
          )}
          {closeTarget && (
            <CloseModal
              escalation={closeTarget}
              onClose={() => setCloseTarget(null)}
              onClosed={() => { setCloseTarget(null); fetchEscalations(page); showMsg('success', 'Escalation closed') }}
              onError={(msg) => showMsg('error', msg)}
            />
          )}
          {logsTarget && (
            <LogsModal escalation={logsTarget} onClose={() => setLogsTarget(null)} />
          )}
          {viewTarget && (
            <ViewModal escalation={viewTarget} onClose={() => setViewTarget(null)} />
          )}
        </AnimatePresence>
      </DashboardLayout>
    </RouteGuard>
  )
}

// ─── KAM Multi-Select Dropdown ───────────────────────────────────────────────

interface KamMultiSelectProps {
  options: [string, string][]   // [email, name]
  selected: string[]
  onChange: (v: string[]) => void
}

function KamMultiSelect({ options, selected, onChange }: KamMultiSelectProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const filtered = options.filter(([, name]) =>
    name.toLowerCase().includes(query.toLowerCase())
  )

  const toggle = (email: string) => {
    onChange(selected.includes(email) ? selected.filter(e => e !== email) : [...selected, email])
  }

  const label = selected.length === 0
    ? 'All KAMs'
    : selected.length === 1
      ? (options.find(([e]) => e === selected[0])?.[1] || selected[0])
      : `${selected.length} KAMs`

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className={`flex items-center gap-2 bg-white border rounded-xl px-3 py-2 text-sm shadow-sm transition-colors min-w-[140px] ${selected.length ? 'border-orange-400 text-orange-700' : 'border-gray-200 text-gray-600'}`}
      >
        <span className="flex-1 text-left truncate">{label}</span>
        {selected.length > 0 && (
          <span
            onClick={e => { e.stopPropagation(); onChange([]) }}
            className="text-gray-400 hover:text-gray-600 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </span>
        )}
        <ChevronDown className={`w-4 h-4 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.12 }}
            className="absolute left-0 top-full mt-1 w-56 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden"
          >
            {/* Search */}
            <div className="px-3 py-2 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Search className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                <input
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Search KAM..."
                  className="text-xs outline-none flex-1 text-gray-700 placeholder-gray-400"
                  autoFocus
                />
              </div>
            </div>

            {/* Select all / clear */}
            <div className="flex items-center justify-between px-3 py-1.5 border-b border-gray-50">
              <button onClick={() => onChange(options.map(([e]) => e))}
                className="text-[11px] text-blue-600 hover:text-blue-700 font-medium">Select all</button>
              <button onClick={() => onChange([])}
                className="text-[11px] text-gray-400 hover:text-gray-600">Clear</button>
            </div>

            {/* Options */}
            <div className="max-h-52 overflow-y-auto">
              {filtered.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-4">No KAMs found</p>
              ) : filtered.map(([email, name]) => (
                <label key={email}
                  className="flex items-center gap-2.5 px-3 py-2 hover:bg-orange-50 cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={selected.includes(email)}
                    onChange={() => toggle(email)}
                    className="w-3.5 h-3.5 accent-orange-500 flex-shrink-0"
                  />
                  <span className="text-sm text-gray-700 truncate">{name}</span>
                </label>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Notification Panel ───────────────────────────────────────────────────────

function NotificationPanel({ notifications, onClose }: { notifications: EscalationNotification[]; onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8, scale: 0.95 }}
      className="absolute right-0 top-10 w-80 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 overflow-hidden"
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <p className="text-sm font-semibold text-gray-800">Notifications</p>
        <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100"><X className="w-3.5 h-3.5 text-gray-500" /></button>
      </div>
      {notifications.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-6">All caught up</p>
      ) : (
        <div className="max-h-72 overflow-y-auto divide-y divide-gray-50">
          {notifications.map(n => (
            <div key={n.id} className="px-4 py-3 hover:bg-gray-50 transition-colors">
              <p className="text-xs text-gray-700 leading-relaxed">{n.message}</p>
              <p className="text-[10px] text-gray-400 mt-1">{new Date(n.created_at).toLocaleString()}</p>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  )
}

// ─── Close Modal ──────────────────────────────────────────────────────────────

function CloseModal({ escalation, onClose, onClosed, onError }: {
  escalation: Escalation; onClose: () => void
  onClosed: () => void; onError: (msg: string) => void
}) {
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)

  const handleClose = async () => {
    if (!reason.trim()) return onError('Please enter a closing remark')
    setSaving(true)
    try {
      const res = await fetch(`/api/data/escalations/${escalation.id}/close`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ close_reason: reason }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error || 'Failed to close')
      onClosed()
    } catch (err: any) {
      onError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white rounded-2xl shadow-xl w-full max-w-md"
      >
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Close Escalation</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100"><X className="w-4 h-4 text-gray-500" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div className="px-3 py-2 bg-gray-50 rounded-xl text-sm text-gray-600">
            <span className="text-gray-400 text-xs">Brand</span>
            <p className="font-medium text-gray-800 mt-0.5">{escalation.brand_name}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Closing Remarks <span className="text-red-500">*</span></label>
            <textarea
              value={reason} onChange={e => setReason(e.target.value)}
              placeholder="Describe how this escalation was resolved..."
              rows={4}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-green-300 focus:border-green-400 resize-none"
            />
          </div>
          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 px-4 py-2 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors">
              Cancel
            </button>
            <button onClick={handleClose} disabled={saving || !reason.trim()}
              className="flex-1 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl text-sm font-medium hover:shadow-md transition-all disabled:opacity-60">
              {saving ? 'Closing...' : 'Mark Resolved'}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ─── Logs Modal ───────────────────────────────────────────────────────────────

function LogsModal({ escalation, onClose }: { escalation: Escalation; onClose: () => void }) {
  const [logs, setLogs] = useState<EscalationLog[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/data/escalations/${escalation.id}/logs`)
      .then(r => r.json())
      .then(json => { if (json.success) setLogs(json.data) })
      .finally(() => setLoading(false))
  }, [escalation.id])

  const actionLabel: Record<string, string> = {
    created: '🟢 Raised', updated: '✏️ Updated', closed: '✅ Closed', remark_updated: '💬 TL Remark',
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col"
      >
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Change Log</h2>
            <p className="text-xs text-gray-400 mt-0.5">{escalation.brand_name}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100"><X className="w-4 h-4 text-gray-500" /></button>
        </div>
        <div className="overflow-y-auto flex-1 p-5">
          {loading ? (
            <p className="text-sm text-gray-400 text-center py-8">Loading...</p>
          ) : logs.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No logs yet</p>
          ) : (
            <div className="space-y-3">
              {logs.map(log => (
                <div key={log.id} className="flex gap-3">
                  <div className="w-1 bg-gray-100 rounded-full flex-shrink-0 mt-1" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-medium text-gray-700">{actionLabel[log.action] || log.action}</span>
                      <span className="text-[10px] text-gray-400 whitespace-nowrap">{new Date(log.created_at).toLocaleString()}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">{log.note}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">by {log.changed_by_name || log.changed_by}</p>
                    {log.changed_fields && Object.keys(log.changed_fields).length > 0 && (
                      <div className="mt-1.5 space-y-1">
                        {Object.entries(log.changed_fields).map(([field, diff]) => (
                          <div key={field} className="text-[10px] bg-gray-50 rounded-lg px-2 py-1">
                            <span className="font-medium text-gray-600">{field}:</span>{' '}
                            <span className="text-red-500 line-through">{String(diff.from ?? '—')}</span>{' → '}
                            <span className="text-green-600">{String(diff.to ?? '—')}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}

// ─── View Detail Modal ────────────────────────────────────────────────────────

function ViewModal({ escalation: esc, onClose }: { escalation: Escalation; onClose: () => void }) {
  const natureColors: Record<string, string> = {
    Red: 'bg-red-100 text-red-700 border-red-200',
    Orange: 'bg-orange-100 text-orange-700 border-orange-200',
    Amber: 'bg-amber-100 text-amber-700 border-amber-200',
  }
  const responsibleColors: Record<string, string> = {
    Brand: 'bg-purple-50 text-purple-700',
    KAM: 'bg-yellow-50 text-yellow-700',
    'Another Department': 'bg-teal-50 text-teal-700',
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white z-10">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{esc.brand_name}</h2>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-lg text-xs">{esc.classification}</span>
              <span className={`px-2 py-0.5 rounded-lg text-xs font-medium ${esc.status === 'open' ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                {esc.status}
              </span>
              {esc.brand_nature && (
                <span className={`px-2 py-0.5 rounded-lg text-xs font-medium border ${natureColors[esc.brand_nature]}`}>
                  {esc.brand_nature}
                </span>
              )}
              {esc.responsible_party && (
                <span className={`px-2 py-0.5 rounded-lg text-xs font-medium ${responsibleColors[esc.responsible_party] || 'bg-gray-50 text-gray-600'}`}>
                  {esc.responsible_party}
                </span>
              )}
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 flex-shrink-0">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Description */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Description</p>
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap bg-gray-50 rounded-xl px-4 py-3">
              {esc.description}
            </p>
          </div>

          {/* Close reason */}
          {esc.close_reason && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Closing Remarks</p>
              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap bg-green-50 border border-green-100 rounded-xl px-4 py-3">
                {esc.close_reason}
              </p>
            </div>
          )}

          {/* TL Remark */}
          {esc.team_lead_remark && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Team Lead Remarks</p>
              <p className="text-sm text-indigo-800 leading-relaxed whitespace-pre-wrap bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-3">
                {esc.team_lead_remark}
              </p>
              {esc.team_lead_remark_updated_by && (
                <p className="text-[10px] text-gray-400 mt-1 px-1">
                  by {esc.team_lead_remark_updated_by}
                  {esc.team_lead_remark_updated_at && ` · ${new Date(esc.team_lead_remark_updated_at).toLocaleString()}`}
                </p>
              )}
            </div>
          )}

          {/* Meta */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="bg-gray-50 rounded-xl px-3 py-2">
              <p className="text-[10px] text-gray-400 uppercase tracking-wide">KAM</p>
              <p className="text-sm text-gray-700 font-medium mt-0.5">{esc.kam_name || esc.kam_email}</p>
            </div>
            <div className="bg-gray-50 rounded-xl px-3 py-2">
              <p className="text-[10px] text-gray-400 uppercase tracking-wide">Raised by</p>
              <p className="text-sm text-gray-700 font-medium mt-0.5">{esc.raised_by}</p>
            </div>
            <div className="bg-gray-50 rounded-xl px-3 py-2">
              <p className="text-[10px] text-gray-400 uppercase tracking-wide">Raised on</p>
              <p className="text-sm text-gray-700 font-medium mt-0.5">{new Date(esc.created_at).toLocaleDateString()}</p>
            </div>
            {esc.status === 'closed' && (
              <div className="bg-gray-50 rounded-xl px-3 py-2">
                <p className="text-[10px] text-gray-400 uppercase tracking-wide">Resolution time</p>
                <p className="text-sm text-blue-600 font-medium mt-0.5">
                  {esc.resolution_days === 0 ? '1D (same day)' : esc.resolution_days !== undefined ? `${esc.resolution_days}D` : '—'}
                </p>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ─── Brand Picker ─────────────────────────────────────────────────────────────

interface BrandPickerProps { userEmail: string; value: MasterBrand | null; onChange: (b: MasterBrand | null) => void }

function BrandPicker({ userEmail, value, onChange }: BrandPickerProps) {
  const [brands, setBrands] = useState<MasterBrand[]>([])
  const [query, setQuery] = useState(value?.brand_name || '')
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!userEmail) return
    setLoading(true)
    fetch('/api/data/master-data?limit=1000').then(r => r.json())
      .then(json => { if (json.success) setBrands(json.data?.data || []) })
      .finally(() => setLoading(false))
  }, [userEmail])

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const filtered = brands.filter(b => b.brand_name.toLowerCase().includes(query.toLowerCase()))

  return (
    <div ref={ref} className="relative">
      <div className="relative">
        <input value={query} onChange={e => { setQuery(e.target.value); onChange(null); setOpen(true) }}
          onFocus={() => setOpen(true)}
          placeholder={loading ? 'Loading brands...' : 'Search brand...'}
          disabled={loading}
          className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-400 pr-8" />
        <Search className="absolute right-3 top-2.5 w-4 h-4 text-gray-400 pointer-events-none" />
      </div>
      {open && filtered.length > 0 && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg max-h-52 overflow-y-auto">
          {filtered.map(brand => (
            <button key={brand.id} type="button" onClick={() => { onChange(brand); setQuery(brand.brand_name); setOpen(false) }}
              className="w-full text-left px-3 py-2 text-sm hover:bg-orange-50 transition-colors flex items-center justify-between">
              <span className="font-medium text-gray-800">{brand.brand_name}</span>
              {brand.zone && <span className="text-xs text-gray-400">{brand.zone}</span>}
            </button>
          ))}
        </div>
      )}
      {open && !loading && query.length > 0 && filtered.length === 0 && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg px-3 py-2 text-sm text-gray-400">
          No brands found
        </div>
      )}
    </div>
  )
}

// ─── Escalation Form Modal ────────────────────────────────────────────────────

interface FormProps {
  existing: Escalation | null; userProfile: any; isTeamLeadOrAdmin: boolean
  onClose: () => void; onSaved: () => void; onError: (msg: string) => void
}

function EscalationForm({ existing, userProfile, isTeamLeadOrAdmin, onClose, onSaved, onError }: FormProps) {
  const isEdit = !!existing
  const [selectedBrand, setSelectedBrand] = useState<MasterBrand | null>(null)
  const [classification, setClassification] = useState(existing?.classification || '')
  const [description, setDescription] = useState(existing?.description || '')
  const [brandNature, setBrandNature] = useState<BrandNature | ''>(existing?.brand_nature || '')
  const [responsibleParty, setResponsibleParty] = useState<ResponsibleParty | ''>(existing?.responsible_party || '')
  const [teamLeadRemark, setTeamLeadRemark] = useState(existing?.team_lead_remark || '')
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isEdit && !selectedBrand) return onError('Please select a brand')
    if (!isEdit && !classification) return onError('Classification is required')
    if (!description.trim()) return onError('Description is required')

    setSaving(true)
    try {
      if (isEdit) {
        const body: any = { description }
        if (brandNature) body.brand_nature = brandNature
        if (isTeamLeadOrAdmin) {
          if (responsibleParty) body.responsible_party = responsibleParty
          body.team_lead_remark = teamLeadRemark
        }
        const res = await fetch(`/api/data/escalations/${existing!.id}`, {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
        })
        const json = await res.json()
        if (!json.success) throw new Error(json.error || 'Failed to update')
      } else {
        const body: any = { brand_name: selectedBrand!.brand_name, brand_id: selectedBrand!.id, classification, description }
        if (brandNature) body.brand_nature = brandNature
        const res = await fetch('/api/data/escalations', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
        })
        const json = await res.json()
        if (!json.success) throw new Error(json.error || 'Failed to create')
      }
      onSaved()
    } catch (err: any) {
      onError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white z-10">
          <h2 className="text-lg font-semibold text-gray-900">{isEdit ? 'Edit Escalation' : 'Raise Escalation'}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100"><X className="w-4 h-4 text-gray-500" /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {isEdit ? (
            <div className="px-3 py-2 bg-gray-50 rounded-xl text-sm text-gray-600">
              <span className="text-gray-400 text-xs">Brand</span>
              <p className="font-medium text-gray-800 mt-0.5">{existing!.brand_name}</p>
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Brand</label>
              <BrandPicker userEmail={userProfile?.email || ''} value={selectedBrand} onChange={setSelectedBrand} />
              {selectedBrand && <p className="text-xs text-green-600 mt-1">✓ {selectedBrand.brand_name} selected</p>}
            </div>
          )}

          {!isEdit && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Classification</label>
              <div className="relative">
                <select value={classification} onChange={e => setClassification(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-400 appearance-none bg-white" required>
                  <option value="">Select classification...</option>
                  {CLASSIFICATIONS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <ChevronDown className="absolute right-3 top-2.5 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)}
              placeholder="Describe the escalation..." rows={4}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-400 resize-none" required />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Brand Nature</label>
            <div className="relative">
              <select value={brandNature} onChange={e => setBrandNature(e.target.value as BrandNature | '')}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-400 appearance-none bg-white">
                <option value="">Select nature...</option>
                {BRAND_NATURES.map(n => <option key={n} value={n}>{n}</option>)}
              </select>
              <ChevronDown className="absolute right-3 top-2.5 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* Responsible Party — visible to all in edit, TL/admin can change */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Responsible Party</label>
            {isTeamLeadOrAdmin ? (
              <div className="relative">
                <select value={responsibleParty} onChange={e => setResponsibleParty(e.target.value as ResponsibleParty | '')}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-400 appearance-none bg-white">
                  <option value="">Not evaluated yet...</option>
                  {RESPONSIBLE_PARTIES.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
                <ChevronDown className="absolute right-3 top-2.5 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            ) : (
              <div className="px-3 py-2 bg-gray-50 rounded-xl text-sm text-gray-500">
                {existing?.responsible_party || 'Pending evaluation'}
              </div>
            )}
          </div>

          {/* Team Lead Remarks — TL/admin can write, everyone sees it */}
          {isTeamLeadOrAdmin && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Team Lead Remarks</label>
              <textarea value={teamLeadRemark} onChange={e => setTeamLeadRemark(e.target.value)}
                placeholder="Add remarks visible to the agent..." rows={3}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 resize-none" />
            </div>
          )}
          {!isTeamLeadOrAdmin && isEdit && existing?.team_lead_remark && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Team Lead Remarks</label>
              <div className="px-3 py-2 bg-indigo-50 border border-indigo-100 rounded-xl text-sm text-indigo-800">
                {existing.team_lead_remark}
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 px-4 py-2 bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-xl text-sm font-medium hover:shadow-md transition-all disabled:opacity-60">
              {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Raise Escalation'}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  )
}
