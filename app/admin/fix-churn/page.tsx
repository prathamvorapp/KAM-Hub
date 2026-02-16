'use client'

import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import DashboardLayout from '@/components/Layout/DashboardLayout'
import { AlertTriangle, CheckCircle, RefreshCw } from 'lucide-react'

export default function FixChurnStatusesPage() {
  const { userProfile } = useAuth()
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const handleFix = async () => {
    if (!confirm('This will update ALL churn records in the database. Are you sure?')) {
      return
    }

    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch('/api/admin/fix-churn-statuses', {
        method: 'POST',
        credentials: 'include'
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fix statuses')
      }

      setResult(data)
    } catch (err) {
      setError(String(err))
    } finally {
      setLoading(false)
    }
  }

  if (userProfile?.role?.toLowerCase() !== 'admin') {
    return (
      <DashboardLayout>
        <div className="p-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h2 className="text-xl font-bold text-red-800 mb-2">Access Denied</h2>
            <p className="text-red-600">Only administrators can access this page.</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="p-8 max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="flex items-center gap-3 mb-6">
            <RefreshCw className="w-8 h-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">Fix All Churn Statuses</h1>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-semibold text-yellow-900 mb-2">What This Does</h3>
                <p className="text-yellow-800 mb-3">
                  This will update ALL churn records in the database to have correct follow_up_status based on:
                </p>
                <ul className="list-disc list-inside text-yellow-800 space-y-1 ml-4">
                  <li>Records with completed churn reasons → COMPLETED</li>
                  <li>Records with 3+ call attempts → COMPLETED</li>
                  <li>Records with active follow-ups → INACTIVE (with reminder)</li>
                  <li>Records with no agent response → INACTIVE</li>
                </ul>
                <p className="text-yellow-800 mt-3 font-semibold">
                  This will fix all 300+ records at once.
                </p>
              </div>
            </div>
          </div>

          <div className="mb-6">
            <h3 className="font-semibold text-gray-900 mb-3">Completed Churn Reasons:</h3>
            <div className="grid grid-cols-1 gap-2 text-sm">
              <div className="bg-blue-50 px-3 py-2 rounded">✓ Outlet once out of Sync- now Active</div>
              <div className="bg-blue-50 px-3 py-2 rounded">✓ Renewal Payment Overdue</div>
              <div className="bg-blue-50 px-3 py-2 rounded">✓ Temporarily Closed (Renovation / Relocation/Internet issue)</div>
              <div className="bg-blue-50 px-3 py-2 rounded">✓ Permanently Closed (Outlet/brand)</div>
              <div className="bg-blue-50 px-3 py-2 rounded">✓ Event Account / Demo Account</div>
              <div className="bg-blue-50 px-3 py-2 rounded">✓ Switched to Another POS</div>
              <div className="bg-blue-50 px-3 py-2 rounded">✓ Ownership Transferred</div>
            </div>
          </div>

          <button
            onClick={handleFix}
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-4 px-6 rounded-lg transition-colors flex items-center justify-center gap-3"
          >
            {loading ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" />
                Fixing All Records...
              </>
            ) : (
              <>
                <CheckCircle className="w-5 h-5" />
                Fix All Churn Statuses Now
              </>
            )}
          </button>

          {error && (
            <div className="mt-6 bg-red-50 border border-red-200 rounded-lg p-4">
              <h3 className="font-semibold text-red-900 mb-2">Error</h3>
              <p className="text-red-700">{error}</p>
            </div>
          )}

          {result && (
            <div className="mt-6 bg-green-50 border border-green-200 rounded-lg p-6">
              <div className="flex items-center gap-3 mb-4">
                <CheckCircle className="w-6 h-6 text-green-600" />
                <h3 className="font-semibold text-green-900 text-lg">Migration Completed!</h3>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div className="bg-white rounded-lg p-4">
                  <div className="text-2xl font-bold text-gray-900">{result.summary.total_records}</div>
                  <div className="text-sm text-gray-600">Total Records</div>
                </div>
                <div className="bg-white rounded-lg p-4">
                  <div className="text-2xl font-bold text-green-600">{result.summary.fixed}</div>
                  <div className="text-sm text-gray-600">Fixed</div>
                </div>
                <div className="bg-white rounded-lg p-4">
                  <div className="text-2xl font-bold text-blue-600">{result.summary.already_correct}</div>
                  <div className="text-sm text-gray-600">Already Correct</div>
                </div>
                <div className="bg-white rounded-lg p-4">
                  <div className="text-2xl font-bold text-red-600">{result.summary.errors}</div>
                  <div className="text-sm text-gray-600">Errors</div>
                </div>
              </div>

              {result.fixed_records && result.fixed_records.length > 0 && (
                <div className="mt-4">
                  <h4 className="font-semibold text-gray-900 mb-2">Sample Fixed Records (first 50):</h4>
                  <div className="bg-white rounded-lg p-4 max-h-96 overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="border-b">
                        <tr>
                          <th className="text-left py-2">RID</th>
                          <th className="text-left py-2">Churn Reason</th>
                          <th className="text-left py-2">Old Status</th>
                          <th className="text-left py-2">New Status</th>
                          <th className="text-left py-2">Attempts</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.fixed_records.map((record: any) => (
                          <tr key={record.rid} className="border-b">
                            <td className="py-2">{record.rid}</td>
                            <td className="py-2 text-xs">{record.churn_reason || 'N/A'}</td>
                            <td className="py-2">
                              <span className="px-2 py-1 bg-gray-100 rounded text-xs">{record.old_status}</span>
                            </td>
                            <td className="py-2">
                              <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">{record.new_status}</span>
                            </td>
                            <td className="py-2">{record.call_attempts}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {result.error_records && result.error_records.length > 0 && (
                <div className="mt-4">
                  <h4 className="font-semibold text-red-900 mb-2">Errors:</h4>
                  <div className="bg-white rounded-lg p-4 max-h-48 overflow-y-auto">
                    {result.error_records.map((record: any, idx: number) => (
                      <div key={idx} className="text-sm text-red-700 mb-1">
                        RID {record.rid}: {record.error}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-4 text-sm text-gray-600">
                <p>Initiated by: {result.summary.initiated_by}</p>
                <p>Timestamp: {new Date(result.summary.timestamp).toLocaleString()}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
