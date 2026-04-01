'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import DashboardLayout from '@/components/Layout/DashboardLayout'
import { Phone, Search, CheckCircle, Clock, Settings, Save, Download, Edit2, History, X, ChevronDown, ChevronUp } from 'lucide-react'
import { ALL_CHURN_REASONS } from '@/lib/constants/churnReasons'

interface Config { month: string; topic: string; topic_description?: string; purpose: 'Upsell' | 'Awareness' }
interface PendingBrand { id: string; brand_name: string; zone?: string }
interface DoneCall {
  id: string; brand_name: string; zone?: string; description?: string
  next_step?: 'yes' | 'no'; next_step_description?: string; called_at?: string; kam_name?: string
}
interface ChurnRecord { rid: string; restaurant_name: string; owner_email: string; churn_reason?: string; zone?: string; kam?: string }
interface HistoryCall { id: string; month: string; description?: string; next_step?: 'yes' | 'no'; next_step_description?: string; called_at?: string }

export default function EngagementCallsPage() {
  const router = useRouter()
  const { userProfile } = useAuth()
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().toISOString().slice(0, 7))
  const [config, setConfig] = useState<Config | null>(null)
  const [pendingBrands, setPendingBrands] = useState<PendingBrand[]>([])
  const [doneCalls, setDoneCalls] = useState<DoneCall[]>([])
  const [totalBrands, setTotalBrands] = useState(0)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState<'pending' | 'done'>('pending')

  // Log call modal
  const [modal, setModal] = useState<{ open: boolean; brand: PendingBrand | null }>({ open: false, brand: null })
  const [description, setDescription] = useState('')
  const [nextStep, setNextStep] = useState<'yes' | 'no' | ''>('')
  const [nextStepDesc, setNextStepDesc] = useState('')
  const [submitting, setSubmitting] = useState(false)
  // Churn records shown inside the log call modal
  const [modalChurn, setModalChurn] = useState<ChurnRecord[]>([])
  const [modalChurnLoading, setModalChurnLoading] = useState(false)
  const [modalChurnReasonMap, setModalChurnReasonMap] = useState<Record<string, string>>({})
  const [modalChurnUpdating, setModalChurnUpdating] = useState<string | null>(null)
  const [modalChurnExpanded, setModalChurnExpanded] = useState<string | null>(null)

  // Edit call modal
  const [editModal, setEditModal] = useState<{ open: boolean; call: DoneCall | null }>({ open: false, call: null })
  const [editDesc, setEditDesc] = useState('')
  const [editNextStep, setEditNextStep] = useState<'yes' | 'no' | ''>('')
  const [editNextStepDesc, setEditNextStepDesc] = useState('')
  const [editSubmitting, setEditSubmitting] = useState(false)

  // History modal
  const [historyModal, setHistoryModal] = useState<{ open: boolean; brandName: string; records: HistoryCall[] }>({ open: false, brandName: '', records: [] })
  const [historyLoading, setHistoryLoading] = useState(false)

  // Churn tab state removed — churn records are shown inside the brand popup modal only

  // Admin config
  const isAdmin = userProfile?.role?.toLowerCase() === 'admin'
  const [showConfigForm, setShowConfigForm] = useState(false)
  const [configTopic, setConfigTopic] = useState('')
  const [configDescription, setConfigDescription] = useState('')
  const [configPurpose, setConfigPurpose] = useState<'Upsell' | 'Awareness'>('Upsell')
  const [savingConfig, setSavingConfig] = useState(false)
  const [configMsg, setConfigMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => { if (!userProfile) router.push('/login') }, [userProfile, router])
  useEffect(() => { if (userProfile) loadData() }, [userProfile, selectedMonth])

  const loadData = async () => {
    setLoading(true)
    try {
      const [configRes, callsRes] = await Promise.all([
        fetch(`/api/data/engagement-calls/config?month=${selectedMonth}`),
        fetch(`/api/data/engagement-calls?month=${selectedMonth}`),
      ])
      const configData = await configRes.json()
      const callsData = await callsRes.json()
      const cfg = configData.success ? configData.data : null
      setConfig(cfg)
      if (cfg) { setConfigTopic(cfg.topic); setConfigDescription(cfg.topic_description || ''); setConfigPurpose(cfg.purpose) }
      else { setConfigTopic(''); setConfigDescription(''); setConfigPurpose('Upsell') }
      if (callsData.success) {
        setPendingBrands(callsData.data.pendingBrands || [])
        setDoneCalls(callsData.data.done || [])
        setTotalBrands(callsData.data.totalBrands || 0)
      }
    } catch (err) { console.error(err) } finally { setLoading(false) }
  }

  const handleSaveConfig = async () => {
    if (!configTopic.trim()) return
    setSavingConfig(true); setConfigMsg(null)
    try {
      const res = await fetch('/api/data/engagement-calls/config', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ month: selectedMonth, topic: configTopic, topic_description: configDescription, purpose: configPurpose }),
      })
      const data = await res.json()
      if (data.success) { setConfig(data.data); setConfigMsg({ type: 'success', text: 'Saved!' }); setShowConfigForm(false) }
      else setConfigMsg({ type: 'error', text: data.error || 'Failed to save' })
    } catch { setConfigMsg({ type: 'error', text: 'Network error' }) } finally { setSavingConfig(false) }
  }

  const openModal = (brand: PendingBrand) => {
    setModal({ open: true, brand }); setDescription(''); setNextStep(''); setNextStepDesc('')
    setModalChurn([]); setModalChurnReasonMap({}); setModalChurnExpanded(null)
    // Fetch churn records for this brand
    setModalChurnLoading(true)
    fetch(`/api/data/engagement-calls/churn-brands?brand_name=${encodeURIComponent(brand.brand_name)}`)
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          setModalChurn(data.data)
          const map: Record<string, string> = {}
          data.data.forEach((r: ChurnRecord) => { map[r.rid] = r.churn_reason || '' })
          setModalChurnReasonMap(map)
        }
      })
      .catch(() => {})
      .finally(() => setModalChurnLoading(false))
  }
  const closeModal = () => setModal({ open: false, brand: null })

  const handleSubmit = async () => {
    if (!modal.brand || !description.trim() || !nextStep) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/data/engagement-calls/complete', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ month: selectedMonth, brand_name: modal.brand.brand_name, brand_id: modal.brand.id, zone: modal.brand.zone, description, next_step: nextStep, next_step_description: nextStep === 'yes' ? nextStepDesc : undefined }),
      })
      const data = await res.json()
      if (data.success) {
        setPendingBrands(prev => prev.filter(b => b.brand_name !== modal.brand!.brand_name))
        setDoneCalls(prev => [data.data, ...prev])
        closeModal()
      } else alert(data.error || 'Failed to submit')
    } catch { alert('Network error') } finally { setSubmitting(false) }
  }

  const openEditModal = (call: DoneCall) => {
    setEditModal({ open: true, call })
    setEditDesc(call.description || '')
    setEditNextStep(call.next_step || '')
    setEditNextStepDesc(call.next_step_description || '')
  }
  const closeEditModal = () => setEditModal({ open: false, call: null })

  const handleEditSubmit = async () => {
    if (!editModal.call || !editDesc.trim() || !editNextStep) return
    setEditSubmitting(true)
    try {
      const res = await fetch(`/api/data/engagement-calls/${editModal.call.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: editDesc, next_step: editNextStep, next_step_description: editNextStep === 'yes' ? editNextStepDesc : undefined }),
      })
      const data = await res.json()
      if (data.success) {
        setDoneCalls(prev => prev.map(c => c.id === editModal.call!.id ? { ...c, description: editDesc, next_step: editNextStep, next_step_description: editNextStep === 'yes' ? editNextStepDesc : undefined } : c))
        closeEditModal()
      } else alert(data.error || 'Failed to update')
    } catch { alert('Network error') } finally { setEditSubmitting(false) }
  }

  const openHistory = async (brandName: string) => {
    setHistoryModal({ open: true, brandName, records: [] }); setHistoryLoading(true)
    try {
      const res = await fetch(`/api/data/engagement-calls/history?brand_name=${encodeURIComponent(brandName)}`)
      const data = await res.json()
      if (data.success) setHistoryModal(prev => ({ ...prev, records: data.data }))
    } catch { console.error('History fetch failed') } finally { setHistoryLoading(false) }
  }

  const handleModalChurnUpdate = async (rid: string) => {
    const reason = modalChurnReasonMap[rid]
    if (!reason) return
    setModalChurnUpdating(rid)
    try {
      const res = await fetch('/api/churn/update-reason', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rid, churn_reason: reason }),
      })
      const data = await res.json()
      if (data.success) {
        setModalChurn(prev => prev.map(r => r.rid === rid ? { ...r, churn_reason: reason } : r))
        setModalChurnExpanded(null)
      } else alert(data.error || 'Failed to update')
    } catch { alert('Network error') } finally { setModalChurnUpdating(null) }
  }

  const handleExport = () => {
    window.open(`/api/data/engagement-calls/export?month=${selectedMonth}`, '_blank')
  }

  if (!userProfile) return null

  const filteredPending = pendingBrands.filter(b => b.brand_name.toLowerCase().includes(searchQuery.toLowerCase()))
  const filteredDone = doneCalls.filter(c => c.brand_name.toLowerCase().includes(searchQuery.toLowerCase()))
  const doneCount = doneCalls.length
  const pendingCount = pendingBrands.length

  return (
    <DashboardLayout userProfile={userProfile}>
      {/* ── Log Call Modal ── */}
      {modal.open && modal.brand && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="p-6 border-b border-gray-100 flex items-start justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900">{modal.brand.brand_name}</h2>
                {modal.brand.zone && <p className="text-sm text-gray-500 mt-1">📍 {modal.brand.zone}</p>}
              </div>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            {config && (
              <div className="mx-6 mt-4 p-4 bg-teal-50 border border-teal-200 rounded-xl">
                <p className="text-sm font-semibold text-teal-800">This month's focus:</p>
                <p className="text-base font-bold text-teal-900 mt-1">{config.topic}</p>
                {config.topic_description && <p className="text-sm text-teal-700 mt-1">{config.topic_description}</p>}
                <span className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-semibold ${config.purpose === 'Upsell' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                  {config.purpose === 'Upsell' ? '📈 Upsell' : '📣 Awareness'}
                </span>
              </div>
            )}

            {/* Churn records for this brand */}
            <div className="mx-6 mt-4">
              {modalChurnLoading ? (
                <p className="text-xs text-gray-400 py-2">Loading churn records...</p>
              ) : modalChurn.length > 0 ? (
                <div className="border border-red-200 rounded-xl overflow-hidden">
                  <div className="bg-red-50 px-4 py-2 flex items-center justify-between">
                    <span className="text-xs font-semibold text-red-700">🔴 Churn Records ({modalChurn.length})</span>
                    <span className="text-xs text-red-500">{modalChurn.filter(r => !r.churn_reason).length} without reason</span>
                  </div>
                  <div className="max-h-48 overflow-y-auto divide-y divide-gray-100">
                    {modalChurn.map(r => (
                      <div key={r.rid} className="bg-white">
                        <div
                          className="flex items-center justify-between px-4 py-2 cursor-pointer hover:bg-gray-50"
                          onClick={() => setModalChurnExpanded(modalChurnExpanded === r.rid ? null : r.rid)}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-xs font-mono text-gray-400 flex-shrink-0">{r.rid}</span>
                            <span className="text-xs text-gray-700 truncate">{r.restaurant_name}</span>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {r.churn_reason ? (
                              <span className="text-xs px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full">{r.churn_reason}</span>
                            ) : (
                              <span className="text-xs px-2 py-0.5 bg-red-100 text-red-600 rounded-full font-medium">No reason</span>
                            )}
                            {modalChurnExpanded === r.rid ? <ChevronUp className="w-3 h-3 text-gray-400" /> : <ChevronDown className="w-3 h-3 text-gray-400" />}
                          </div>
                        </div>
                        {modalChurnExpanded === r.rid && (
                          <div className="px-4 pb-3 bg-gray-50 space-y-2">
                            <select
                              value={modalChurnReasonMap[r.rid] || ''}
                              onChange={e => setModalChurnReasonMap(prev => ({ ...prev, [r.rid]: e.target.value }))}
                              className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                            >
                              <option value="">— Select churn reason —</option>
                              {ALL_CHURN_REASONS.map(reason => (
                                <option key={reason} value={reason}>{reason}</option>
                              ))}
                            </select>
                            <button
                              onClick={() => handleModalChurnUpdate(r.rid)}
                              disabled={modalChurnUpdating === r.rid || !modalChurnReasonMap[r.rid]}
                              className="px-3 py-1.5 bg-teal-500 hover:bg-teal-600 disabled:opacity-50 text-white rounded-lg text-xs font-medium transition-colors"
                            >
                              {modalChurnUpdating === r.rid ? 'Saving...' : 'Save Reason'}
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
                <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} placeholder="What was discussed..." className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Next Step *</label>
                <div className="flex space-x-3">
                  {(['yes', 'no'] as const).map(v => (
                    <button key={v} onClick={() => setNextStep(v)} className={`flex-1 py-2 rounded-lg border-2 font-medium text-sm transition-colors ${nextStep === v ? (v === 'yes' ? 'bg-green-500 border-green-400 text-white' : 'bg-gray-500 border-gray-400 text-white') : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'}`}>
                      {v === 'yes' ? '✅ Yes' : '❌ No'}
                    </button>
                  ))}
                </div>
              </div>
              {nextStep === 'yes' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Next Step Description</label>
                  <textarea value={nextStepDesc} onChange={e => setNextStepDesc(e.target.value)} rows={2} placeholder="Describe the next step..." className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none" />
                </div>
              )}
              <div className="flex space-x-3 pt-2">
                <button onClick={closeModal} className="flex-1 py-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 text-sm font-medium">Cancel</button>
                <button onClick={handleSubmit} disabled={submitting || !description.trim() || !nextStep} className="flex-1 py-2 bg-teal-500 hover:bg-teal-600 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors">
                  {submitting ? 'Saving...' : 'Mark as Done'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Call Modal ── */}
      {editModal.open && editModal.call && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="p-6 border-b border-gray-100 flex items-start justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Edit Call — {editModal.call.brand_name}</h2>
                <p className="text-sm text-gray-500 mt-1">Update the call details</p>
              </div>
              <button onClick={closeEditModal} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
                <textarea value={editDesc} onChange={e => setEditDesc(e.target.value)} rows={3} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Next Step *</label>
                <div className="flex space-x-3">
                  {(['yes', 'no'] as const).map(v => (
                    <button key={v} onClick={() => setEditNextStep(v)} className={`flex-1 py-2 rounded-lg border-2 font-medium text-sm transition-colors ${editNextStep === v ? (v === 'yes' ? 'bg-green-500 border-green-400 text-white' : 'bg-gray-500 border-gray-400 text-white') : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'}`}>
                      {v === 'yes' ? '✅ Yes' : '❌ No'}
                    </button>
                  ))}
                </div>
              </div>
              {editNextStep === 'yes' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Next Step Description</label>
                  <textarea value={editNextStepDesc} onChange={e => setEditNextStepDesc(e.target.value)} rows={2} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none" />
                </div>
              )}
              <div className="flex space-x-3 pt-2">
                <button onClick={closeEditModal} className="flex-1 py-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 text-sm font-medium">Cancel</button>
                <button onClick={handleEditSubmit} disabled={editSubmitting || !editDesc.trim() || !editNextStep} className="flex-1 py-2 bg-teal-500 hover:bg-teal-600 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors">
                  {editSubmitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── History Modal ── */}
      {historyModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col">
            <div className="p-6 border-b border-gray-100 flex items-start justify-between flex-shrink-0">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Call History</h2>
                <p className="text-sm text-gray-500 mt-1">{historyModal.brandName}</p>
              </div>
              <button onClick={() => setHistoryModal({ open: false, brandName: '', records: [] })} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 overflow-y-auto">
              {historyLoading ? (
                <p className="text-center text-gray-500 py-8">Loading...</p>
              ) : historyModal.records.length === 0 ? (
                <p className="text-center text-gray-400 py-8">No previous calls found for this brand.</p>
              ) : (
                <div className="space-y-3">
                  {historyModal.records.map(h => (
                    <div key={h.id} className="border border-gray-200 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-gray-800">{h.month}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${h.next_step === 'yes' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                          Next step: {h.next_step === 'yes' ? 'Yes' : 'No'}
                        </span>
                      </div>
                      {h.description && <p className="text-sm text-gray-600">💬 {h.description}</p>}
                      {h.next_step === 'yes' && h.next_step_description && (
                        <p className="text-sm text-teal-700 mt-1">→ {h.next_step_description}</p>
                      )}
                      {h.called_at && <p className="text-xs text-gray-400 mt-2">📅 {new Date(h.called_at).toLocaleDateString()}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-teal-500 to-cyan-500 rounded-xl flex items-center justify-center">
              <Phone className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Engagement Calls</h1>
              <p className="text-white/70">Monthly brand engagement tracking</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <input type="month" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-teal-500" />
            <button onClick={handleExport} className="flex items-center space-x-2 px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-white text-sm transition-colors">
              <Download className="w-4 h-4" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Config Banner */}
        {config ? (
          <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-4 flex items-start justify-between gap-3">
            <div className="flex items-start space-x-3">
              <div className="text-2xl">📋</div>
              <div>
                <p className="text-white/70 text-sm">This month's focus:</p>
                <p className="text-white font-semibold text-lg">{config.topic}</p>
                {config.topic_description && <p className="text-white/60 text-sm mt-1">{config.topic_description}</p>}
                <span className={`inline-block mt-1 px-3 py-0.5 rounded-full text-xs font-semibold ${config.purpose === 'Upsell' ? 'bg-blue-500/30 text-blue-200' : 'bg-purple-500/30 text-purple-200'}`}>
                  {config.purpose === 'Upsell' ? '📈 Upsell' : '📣 Awareness'}
                </span>
              </div>
            </div>
            {isAdmin && (
              <button onClick={() => { setShowConfigForm(v => !v); setConfigMsg(null) }} className="flex items-center space-x-1 px-3 py-1.5 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-white/70 hover:text-white text-xs transition-colors flex-shrink-0">
                <Settings className="w-3.5 h-3.5" /><span>Edit</span>
              </button>
            )}
          </div>
        ) : isAdmin ? (
          <div className="bg-yellow-500/20 border border-yellow-500/30 rounded-xl p-4 flex items-center justify-between gap-3">
            <p className="text-yellow-200 text-sm">⚠️ No configuration set for this month.</p>
            <button onClick={() => { setShowConfigForm(true); setConfigMsg(null) }} className="flex items-center space-x-1 px-3 py-1.5 bg-teal-500 hover:bg-teal-600 rounded-lg text-white text-xs font-medium transition-colors flex-shrink-0">
              <Settings className="w-3.5 h-3.5" /><span>Set Topic</span>
            </button>
          </div>
        ) : (
          <div className="bg-yellow-500/20 border border-yellow-500/30 rounded-xl p-4 text-yellow-200 text-sm">
            ⚠️ No configuration set for this month. Ask your admin to define the topic and purpose.
          </div>
        )}

        {/* Inline Admin Config Form */}
        {isAdmin && showConfigForm && (
          <div className="bg-white/10 backdrop-blur-md rounded-xl border border-teal-500/40 p-5 space-y-4">
            <h3 className="text-white font-semibold flex items-center space-x-2"><Settings className="w-4 h-4" /><span>Set Topic for {selectedMonth}</span></h3>
            <div>
              <label className="block text-sm text-white/70 mb-1">Topic *</label>
              <input type="text" value={configTopic} onChange={e => setConfigTopic(e.target.value)} placeholder="e.g. Q2 Product Update..." className="w-full px-4 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm" />
            </div>
            <div>
              <label className="block text-sm text-white/70 mb-1">Topic Description</label>
              <textarea value={configDescription} onChange={e => setConfigDescription(e.target.value)} rows={2} placeholder="Additional context for agents about this month's topic..." className="w-full px-4 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm resize-none" />
            </div>
            <div>
              <label className="block text-sm text-white/70 mb-2">Purpose *</label>
              <div className="flex space-x-3">
                {(['Upsell', 'Awareness'] as const).map(p => (
                  <button key={p} onClick={() => setConfigPurpose(p)} className={`px-5 py-2 rounded-lg border-2 font-medium text-sm transition-colors ${configPurpose === p ? 'bg-teal-500 border-teal-400 text-white' : 'bg-white/5 border-white/20 text-white/70 hover:bg-white/10'}`}>
                    {p === 'Upsell' ? '📈 Upsell' : '📣 Awareness'}
                  </button>
                ))}
              </div>
            </div>
            {configMsg && <p className={`text-sm ${configMsg.type === 'success' ? 'text-green-400' : 'text-red-400'}`}>{configMsg.text}</p>}
            <div className="flex space-x-3">
              <button onClick={() => setShowConfigForm(false)} className="px-4 py-2 border border-white/20 rounded-lg text-white/60 hover:text-white text-sm">Cancel</button>
              <button onClick={handleSaveConfig} disabled={savingConfig || !configTopic.trim()} className="flex items-center space-x-2 px-5 py-2 bg-teal-500 hover:bg-teal-600 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors">
                <Save className="w-4 h-4" /><span>{savingConfig ? 'Saving...' : 'Save'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Progress */}
        <div className="grid grid-cols-3 gap-4 text-center">
          {[{ label: 'Total Brands', value: totalBrands, color: 'text-white' }, { label: 'Calls Done', value: doneCount, color: 'text-green-400' }, { label: 'Pending', value: pendingCount, color: 'text-yellow-400' }].map(s => (
            <div key={s.label} className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-4">
              <div className={`text-3xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-sm text-white/60">{s.label}</div>
            </div>
          ))}
        </div>
        {totalBrands > 0 && (
          <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-4">
            <div className="flex justify-between text-sm text-white/60 mb-2"><span>Progress</span><span>{Math.round((doneCount / totalBrands) * 100)}%</span></div>
            <div className="w-full bg-white/10 rounded-full h-3">
              <div className="bg-gradient-to-r from-teal-500 to-cyan-500 h-3 rounded-full transition-all duration-500" style={{ width: `${(doneCount / totalBrands) * 100}%` }} />
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex space-x-2 bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-2">
          {([
            { key: 'pending', label: `Pending (${pendingCount})`, icon: <Clock className="w-4 h-4" />, border: 'border-yellow-400' },
            { key: 'done', label: `Done (${doneCount})`, icon: <CheckCircle className="w-4 h-4" />, border: 'border-green-400' },
          ] as const).map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)} className={`flex-1 px-4 py-2 rounded-lg transition-colors flex items-center justify-center space-x-2 border-2 ${activeTab === tab.key ? `bg-white/20 text-white ${tab.border}` : 'text-white/70 hover:text-white hover:bg-white/5 border-transparent'}`}>
              {tab.icon}<span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/50" />
          <input type="text" placeholder="Search brands..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full pl-12 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-teal-500" />
        </div>

        {/* Brand List — Pending / Done */}
        <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6">
            <h2 className="text-lg font-semibold text-white mb-4">
              {activeTab === 'pending' ? '⏳ Pending Calls' : '✅ Completed Calls'} ({activeTab === 'pending' ? filteredPending.length : filteredDone.length})
            </h2>
            {loading ? (
              <div className="text-center py-12 text-white/70">Loading...</div>
            ) : activeTab === 'pending' ? (
              filteredPending.length === 0 ? (
                <div className="text-center py-12"><CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" /><p className="text-white text-lg">All calls done for this month!</p></div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[600px] overflow-y-auto">
                  {filteredPending.map(brand => (
                    <div key={brand.id} className="bg-white/5 border border-white/10 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="font-semibold text-white">{brand.brand_name}</div>
                        <Clock className="w-5 h-5 text-yellow-400 flex-shrink-0" />
                      </div>
                      {brand.zone && <div className="text-sm text-white/50">📍 {brand.zone}</div>}
                      <div className="flex gap-2 mt-3">
                        <button onClick={() => openModal(brand)} className="flex-1 text-xs text-teal-400 font-medium hover:text-teal-300 text-left">Tap to log call →</button>
                        <button onClick={() => openHistory(brand.brand_name)} className="p-1 text-white/40 hover:text-white/70 transition-colors" title="View call history">
                          <History className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )
            ) : (
              filteredDone.length === 0 ? (
                <div className="text-center py-12"><p className="text-white/60">No completed calls yet.</p></div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[600px] overflow-y-auto">
                  {filteredDone.map(call => (
                    <div key={call.id} className="bg-green-500/5 border border-green-500/20 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="font-semibold text-white">{call.brand_name}</div>
                        <div className="flex items-center gap-1">
                          <button onClick={() => openHistory(call.brand_name)} className="p-1 text-white/40 hover:text-white/70 transition-colors" title="View history"><History className="w-4 h-4" /></button>
                          <button onClick={() => openEditModal(call)} className="p-1 text-white/40 hover:text-teal-400 transition-colors" title="Edit call"><Edit2 className="w-4 h-4" /></button>
                          <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                        </div>
                      </div>
                      {call.zone && <div className="text-sm text-white/50">📍 {call.zone}</div>}
                      {call.description && <p className="text-xs text-white/60 mt-2 line-clamp-2">💬 {call.description}</p>}
                      {call.next_step && (
                        <span className={`inline-block mt-2 text-xs px-2 py-0.5 rounded-full ${call.next_step === 'yes' ? 'bg-green-500/20 text-green-300' : 'bg-gray-500/20 text-gray-300'}`}>
                          Next step: {call.next_step === 'yes' ? 'Yes' : 'No'}
                        </span>
                      )}
                      {call.called_at && <div className="text-xs text-white/40 mt-1">📅 {new Date(call.called_at).toLocaleDateString()}</div>}
                    </div>
                  ))}
                </div>
              )
            )}
          </div>
      </div>
    </DashboardLayout>
  )
}
