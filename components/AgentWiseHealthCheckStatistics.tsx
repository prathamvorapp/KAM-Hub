'use client'

import { AlertTriangle } from 'lucide-react'

interface AgentWiseHealthCheckStatisticsProps {
  userEmail: string
  monthFilter?: string
}

export default function AgentWiseHealthCheckStatistics({ 
  userEmail, 
  monthFilter 
}: AgentWiseHealthCheckStatisticsProps) {
  return (
    <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-8">
      <div className="text-center">
        <AlertTriangle className="w-12 h-12 text-yellow-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-white mb-2">Statistics Unavailable</h3>
        <p className="text-white/70 text-sm">
          Agent statistics are currently unavailable. Please check back later.
        </p>
      </div>
    </div>
  )
}
