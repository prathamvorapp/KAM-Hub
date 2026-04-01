'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import DashboardLayout from '@/components/Layout/DashboardLayout'
import { RouteGuard } from '@/components/RouteGuard'
import { Phone, Save, BarChart3 } from 'lucide-react'

interface Config {
  id?: string
  month: string
  topic: string
  topic_description?: string
  purpose: 'Upsell' | 'Awareness'
}

interface AgentStat {
  kam_email: string
  kam_name: string
  total: number
  done: number
}

interface Stats {
  total: number
  done: number
  pending: number
  byAgent: AgentStat[]
}

export default function AdminEngagementCallsPage() {
  const { userProfile } = useAuth()
  const [selectedMonth, setSelectedMonth] = useState(() =>
    new Date().toISOString().slice(0, 7)
  )
  const [config, setConfig] = useState<Config>({ month: selectedMonth, topic: '', purpose: 'Upsell' })
  const [stats, setStats] = useState<Stats | null>(null)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    fetchConfig()
    fetchStats()
  }, [selectedMonth])

  const fetchConfig = async () => {
    const res = await fetch(`/api/data/engagement-calls/config?month=${selectedMonth}`)
    const data = await res.json()
    if (data.success && data.data) {
      setConfig(data.data)
    } else {
      setConfig({ month: selectedMonth, topic: '', purpose: 'Upsell' })    }
  }

  const fetchStats = async () => {
    const res = await fetch(`/api/data/engagement-calls/statistics?month=${selectedMonth}`)
    const data = await res.json()
    if (data.success) setStats(data.data)
  }

  const handleSave = async () => {
    if (!config.topic.trim()) {
      setMessage({ type: 'error', text: 'Topic is required' })
      return
    }
    setSaving(true)
    setMessage(null)
    try {
      const res = await fetch('/api/data/engagement-calls/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ month: selectedMonth, topic: config.topic, topic_description: config.topic_description, purpose: config.purpose }),
      })
      const data = await res.json()
      if (data.success) {
        setMessage({ type: 'success', text: 'Configuration saved successfully' })
        setConfig(data.data)
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to save' })
      }
    } catch {
      setMessage({ type: 'error', text: 'Network error' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <RouteGuard requireAuth requireRole={['admin']}>
      <DashboardLayout userProfile={userProfile}>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-teal-500 to-cyan-500 rounded-xl flex items-center justify-center">
              <Phone className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Engagement Call — Admin</h1>
              <p className="text-white/70">Define monthly call topic and purpose for agents</p>
            </div>
          </div>

          {/* Month Selector */}
          <div className="flex items-center space-x-3">
            <label className="text-white/80 text-sm">Month:</label>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          {/* Config Form */}
          <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6 space-y-5">
            <h2 className="text-lg font-semibold text-white">Monthly Call Configuration</h2>

            <div>
              <label className="block text-sm text-white/70 mb-1">Topic *</label>
              <input
                type="text"
                value={config.topic}
                onChange={(e) => setConfig({ ...config, topic: e.target.value })}
                placeholder="e.g. Q2 Product Update, New Feature Walkthrough..."
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div>
              <label className="block text-sm text-white/70 mb-1">Topic Description</label>
              <textarea
                value={config.topic_description || ''}
                onChange={(e) => setConfig({ ...config, topic_description: e.target.value })}
                rows={3}
                placeholder="Additional context or instructions for agents about this month's topic..."
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
              />
            </div>

            <div>
              <label className="block text-sm text-white/70 mb-2">Purpose *</label>
              <div className="flex space-x-4">
                {(['Upsell', 'Awareness'] as const).map((p) => (
                  <button
                    key={p}
                    onClick={() => setConfig({ ...config, purpose: p })}
                    className={`px-6 py-2 rounded-lg border-2 font-medium transition-colors ${
                      config.purpose === p
                        ? 'bg-teal-500 border-teal-400 text-white'
                        : 'bg-white/5 border-white/20 text-white/70 hover:bg-white/10'
                    }`}
                  >
                    {p === 'Upsell' ? '📈 Upsell' : '📣 Awareness'}
                  </button>
                ))}
              </div>
            </div>

            {message && (
              <div className={`px-4 py-3 rounded-lg text-sm ${
                message.type === 'success' ? 'bg-green-500/20 text-green-300 border border-green-500/30' : 'bg-red-500/20 text-red-300 border border-red-500/30'
              }`}>
                {message.text}
              </div>
            )}

            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center space-x-2 px-6 py-3 bg-teal-500 hover:bg-teal-600 disabled:opacity-50 text-white rounded-lg font-medium transition-colors"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Saving...' : 'Save Configuration'}</span>
            </button>
          </div>

          {/* Statistics */}
          {stats && (
            <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6 space-y-4">
              <div className="flex items-center space-x-2">
                <BarChart3 className="w-5 h-5 text-white/70" />
                <h2 className="text-lg font-semibold text-white">Progress for {selectedMonth}</h2>
              </div>

              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="bg-white/5 rounded-lg p-4">
                  <div className="text-3xl font-bold text-white">{stats.total}</div>
                  <div className="text-sm text-white/60">Total Brands</div>
                </div>
                <div className="bg-white/5 rounded-lg p-4">
                  <div className="text-3xl font-bold text-green-400">{stats.done}</div>
                  <div className="text-sm text-white/60">Calls Done</div>
                </div>
                <div className="bg-white/5 rounded-lg p-4">
                  <div className="text-3xl font-bold text-yellow-400">{stats.pending}</div>
                  <div className="text-sm text-white/60">Pending</div>
                </div>
              </div>

              {/* Progress bar */}
              <div>
                <div className="flex justify-between text-sm text-white/60 mb-1">
                  <span>Overall Progress</span>
                  <span>{stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : 0}%</span>
                </div>
                <div className="w-full bg-white/10 rounded-full h-3">
                  <div
                    className="bg-gradient-to-r from-teal-500 to-cyan-500 h-3 rounded-full transition-all duration-500"
                    style={{ width: `${stats.total > 0 ? (stats.done / stats.total) * 100 : 0}%` }}
                  />
                </div>
              </div>

              {/* Agent breakdown */}
              {stats.byAgent.length > 0 && (
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  <h3 className="text-sm font-medium text-white/70">Agent Breakdown</h3>
                  {stats.byAgent.map((a) => (
                    <div key={a.kam_email} className="flex items-center justify-between bg-white/5 rounded-lg px-4 py-2">
                      <div>
                        <div className="text-white text-sm font-medium">{a.kam_name}</div>
                        <div className="text-white/50 text-xs">{a.kam_email}</div>
                      </div>
                      <div className="text-right">
                        <span className="text-green-400 font-semibold">{a.done}</span>
                        <span className="text-white/40"> / </span>
                        <span className="text-white/70">{a.total}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </DashboardLayout>
    </RouteGuard>
  )
}
