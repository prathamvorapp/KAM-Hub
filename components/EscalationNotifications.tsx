'use client'

import { useState, useEffect, useCallback } from 'react'
import { AlertTriangle, X } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'

interface EscalationNotification {
  id: string
  escalation_id: string
  type: 'raised' | 'closed' | 'remark_updated'
  message: string
  is_read: boolean
  created_at: string
}

const typeLabel: Record<string, string> = {
  raised: '🟠 New Escalation',
  closed: '✅ Escalation Closed',
  remark_updated: '💬 TL Remark Added',
}

export function EscalationNotifications() {
  const { userProfile } = useAuth()
  const router = useRouter()
  const [notifications, setNotifications] = useState<EscalationNotification[]>([])
  const [showPanel, setShowPanel] = useState(false)
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    if (!userProfile?.email) return
    setLoading(true)
    try {
      const res = await fetch('/api/data/escalations/notifications?unread=true')
      const json = await res.json()
      if (json.success) setNotifications(json.data)
    } catch {
      // silently fail — non-critical
    } finally {
      setLoading(false)
    }
  }, [userProfile?.email])

  useEffect(() => {
    load()
    const interval = setInterval(load, 60 * 1000) // refresh every minute
    return () => clearInterval(interval)
  }, [load])

  const unread = notifications

  const markRead = async () => {
    if (!notifications.length) return
    await fetch('/api/data/escalations/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: notifications.map(n => n.id) }),
    })
    // Clear them from the panel immediately after marking read
    setNotifications([])
  }

  const handleOpen = () => {
    const opening = !showPanel
    setShowPanel(opening)
    // Mark as read and clear when opening the panel
    if (opening && notifications.length) markRead()
  }

  const goToEscalations = () => {
    setShowPanel(false)
    router.push('/dashboard/escalations')
  }

  if (!userProfile) return null

  return (
    <div className="relative">
      {/* Bell button */}
      <button
        onClick={handleOpen}
        className={`relative p-2 rounded-full transition-colors ${
          unread.length > 0
            ? 'bg-orange-100 text-orange-600 hover:bg-orange-200'
            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
        }`}
        title="Escalation notifications"
      >
        <AlertTriangle className="w-5 h-5" />
        {unread.length > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] text-[10px] font-bold text-white bg-red-500 rounded-full flex items-center justify-center">
            {unread.length > 99 ? '99+' : unread.length}
          </span>
        )}
      </button>

      {/* Panel */}
      <AnimatePresence>
        {showPanel && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 w-96 bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50">
              <div>
                <p className="font-semibold text-gray-900 text-sm">Escalation Alerts</p>
                {unread.length > 0 && (
                  <p className="text-xs text-orange-600 mt-0.5">{unread.length} unread</p>
                )}
              </div>
              <button onClick={() => setShowPanel(false)} className="p-1 rounded-lg hover:bg-gray-200 transition-colors">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            {/* List */}
            <div className="max-h-80 overflow-y-auto divide-y divide-gray-50">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-5 h-5 border-2 border-orange-400 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                  <AlertTriangle className="w-8 h-8 mb-2 opacity-30" />
                  <p className="text-sm">No escalation alerts</p>
                </div>
              ) : (
                notifications.map(n => (
                  <div
                    key={n.id}
                    className={`px-4 py-3 transition-colors ${!n.is_read ? 'bg-orange-50/60' : 'hover:bg-gray-50'}`}
                  >
                    <p className="text-xs font-semibold text-gray-500 mb-0.5">{typeLabel[n.type] || n.type}</p>
                    <p className="text-sm text-gray-700 leading-snug">{n.message}</p>
                    <p className="text-[10px] text-gray-400 mt-1">{new Date(n.created_at).toLocaleString()}</p>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="px-4 py-3 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
              <button onClick={load} disabled={loading}
                className="text-xs text-gray-500 hover:text-gray-700 disabled:opacity-50 transition-colors">
                {loading ? 'Refreshing...' : 'Refresh'}
              </button>
              <button onClick={goToEscalations}
                className="text-xs font-medium text-orange-600 hover:text-orange-700 transition-colors">
                View all escalations →
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
