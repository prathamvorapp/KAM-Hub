'use client'

import { useEffect, useState } from 'react'
import { X, Users, Search, Filter, Eye, Download } from 'lucide-react'
import TeamLeadAgentStatistics from './TeamLeadAgentStatistics'

interface TeamLeadAgentStatsModalProps {
  isOpen: boolean
  onClose: () => void
  userEmail: string
  isAdmin?: boolean // New prop to indicate if this is for admin
}

export default function TeamLeadAgentStatsModal({ isOpen, onClose, userEmail, isAdmin = false }: TeamLeadAgentStatsModalProps) {
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  const handleRefresh = () => {
    setRefreshTrigger(prev => prev + 1)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 overflow-y-auto modal-overlay">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose}></div>
      
      {/* Modal */}
      <div className="relative min-h-screen flex items-center justify-center p-4">
        <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-7xl max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-indigo-600">
            <div className="flex items-center">
              <Users className="w-6 h-6 mr-2 text-blue-200" />
              <h2 className="text-xl font-bold text-white">
                {isAdmin ? 'Organization Agent Statistics' : 'Team Agent Statistics'}
              </h2>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={handleRefresh}
                className="px-3 py-1 bg-white/20 hover:bg-white/30 text-white rounded-md text-sm transition-colors"
              >
                Refresh
              </button>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>
          </div>
          
          {/* Content */}
          <div className="overflow-y-auto max-h-[calc(90vh-80px)]">
            <div className="p-6">
              <TeamLeadAgentStatistics 
                userEmail={userEmail} 
                onRefresh={handleRefresh}
                isAdmin={isAdmin}
                key={refreshTrigger}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}