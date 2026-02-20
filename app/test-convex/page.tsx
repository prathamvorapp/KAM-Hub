'use client'

import { api } from '@/lib/api'
import { useEffect, useState } from 'react'

export default function TestConvexPage() {
  const [churnStats, setChurnStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const testConvex = async () => {
      try {
        setLoading(true)
        const result = await api.getChurnStatistics()
        setChurnStats(result.data)
      } catch (err: any) {
        setError(err.message || 'Failed to connect to Convex')
      } finally {
        setLoading(false)
      }
    }

    testConvex()
  }, [])

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">🧪 Convex Connection Test</h1>
      
      <div className="bg-gray-100 p-4 rounded-lg">
        <h2 className="text-lg font-semibold mb-2">Churn Statistics from Convex:</h2>
        
        {loading ? (
          <p className="text-blue-600">⏳ Loading from Convex...</p>
        ) : error ? (
          <p className="text-red-600">❌ Error: {error}</p>
        ) : churnStats ? (
          <div className="space-y-2">
            <p className="text-green-600">✅ Convex Connected Successfully!</p>
            <p><strong>Total Records:</strong> {churnStats.total_records}</p>
            <p><strong>Missing Churn Reasons:</strong> {churnStats.missing_churn_reasons}</p>
            <p><strong>Completion Rate:</strong> {churnStats.completion_percentage}%</p>
            <p><strong>Active Follow-ups:</strong> {churnStats.active_follow_ups || 0}</p>
          </div>
        ) : (
          <p className="text-red-600">❌ No data received</p>
        )}
      </div>
      
      <div className="mt-6 space-x-4">
        <a 
          href="/dashboard" 
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          Go to Dashboard
        </a>
        <a 
          href="/" 
          className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
        >
          Home
        </a>
      </div>
    </div>
  )
}