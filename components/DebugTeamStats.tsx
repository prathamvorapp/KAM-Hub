'use client'

import { useTeamStatistics } from '../hooks/useRobustApi';
import { useAuth } from '../contexts/AuthContext';

export default function DebugTeamStats() {
  const { userProfile } = useAuth();
  
  const {
    data: statisticsData,
    loading,
    error,
    retry,
    refresh
  } = useTeamStatistics(userProfile?.email, {
    autoLoad: true,
    retryOnMount: true,
    onError: (error) => {
      console.error('❌ Debug: Team statistics error:', error);
    },
    onSuccess: (data) => {
      console.log('✅ Debug: Team statistics loaded:', data);
    }
  });

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">🔍 Debug Team Statistics</h2>
      
      {/* Loading State */}
      {loading && (
        <div className="bg-blue-50 p-4 rounded-lg mb-4">
          <div className="text-blue-700">🔄 Loading team statistics...</div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 p-4 rounded-lg mb-4">
          <div className="text-red-700">❌ Error: {error}</div>
          <button 
            onClick={retry}
            className="mt-2 bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
          >
            Retry
          </button>
        </div>
      )}

      {/* Data State */}
      {statisticsData && (
        <div className="space-y-4">
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="text-green-700 font-medium">✅ Data Loaded Successfully</div>
          </div>

          {/* Raw Data Display */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-medium mb-2">Raw Data Structure:</h3>
            <pre className="text-xs overflow-auto max-h-40 bg-white p-2 rounded border">
              {JSON.stringify(statisticsData, null, 2)}
            </pre>
          </div>

          {/* Processed Data */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-medium text-blue-800 mb-2">Team Info</h3>
              <div className="text-sm space-y-1">
                <div>Team Name: {statisticsData.team_name || 'N/A'}</div>
                <div>Team Lead: {statisticsData.team_lead || 'N/A'}</div>
                <div>Statistics Count: {statisticsData.team_statistics?.length || 0}</div>
                <div>Breakdown Count: {statisticsData.team_wise_breakdown?.length || 0}</div>
              </div>
            </div>

            <div className="bg-purple-50 p-4 rounded-lg">
              <h3 className="font-medium text-purple-800 mb-2">Team Summary</h3>
              {statisticsData.team_summary ? (
                <div className="text-sm space-y-1">
                  <div>Total Brands: {statisticsData.team_summary.total_brands || 0}</div>
                  <div>Visits Done: {statisticsData.team_summary.total_visits_done || 0}</div>
                  <div>Visits Pending: {statisticsData.team_summary.total_visits_pending || 0}</div>
                  <div>Monthly Target: {statisticsData.team_summary.monthly_target || 0}</div>
                </div>
              ) : (
                <div className="text-sm text-gray-600">No team summary available</div>
              )}
            </div>
          </div>

          {/* Team Statistics */}
          {statisticsData.team_statistics && statisticsData.team_statistics.length > 0 && (
            <div className="bg-yellow-50 p-4 rounded-lg">
              <h3 className="font-medium text-yellow-800 mb-2">Team Members ({statisticsData.team_statistics.length})</h3>
              <div className="space-y-2">
                {statisticsData.team_statistics.map((agent: any, index: number) => (
                  <div key={index} className="bg-white p-2 rounded border text-sm">
                    <div className="font-medium">{agent.agent_name}</div>
                    <div className="text-gray-600">
                      Brands: {agent.total_brands || 0} | 
                      Done: {agent.total_visits_done || 0} | 
                      Pending: {agent.total_visits_pending || 0} | 
                      Progress: {agent.current_month_progress || 0}%
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quick Stats */}
          <div className="bg-indigo-50 p-4 rounded-lg">
            <h3 className="font-medium text-indigo-800 mb-2">Quick Stats</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div className="bg-white p-3 rounded">
                <div className="text-2xl font-bold text-blue-600">
                  {statisticsData.team_statistics?.reduce((sum: number, agent: any) => 
                    sum + (agent.total_brands || 0), 0) || 0}
                </div>
                <div className="text-sm text-gray-600">Total Brands</div>
              </div>
              <div className="bg-white p-3 rounded">
                <div className="text-2xl font-bold text-green-600">
                  {statisticsData.team_statistics?.reduce((sum: number, agent: any) => 
                    sum + (agent.total_visits_done || 0), 0) || 0}
                </div>
                <div className="text-sm text-gray-600">Visits Done</div>
              </div>
              <div className="bg-white p-3 rounded">
                <div className="text-2xl font-bold text-yellow-600">
                  {statisticsData.team_statistics?.reduce((sum: number, agent: any) => 
                    sum + (agent.total_visits_pending || 0), 0) || 0}
                </div>
                <div className="text-sm text-gray-600">Visits Pending</div>
              </div>
              <div className="bg-white p-3 rounded">
                <div className="text-2xl font-bold text-purple-600">
                  {statisticsData.team_statistics?.reduce((sum: number, agent: any) => 
                    sum + (agent.current_month_completed || 0), 0) || 0}
                </div>
                <div className="text-sm text-gray-600">This Month</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* No Data State */}
      {!loading && !error && !statisticsData && (
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="text-gray-700">⚠️ No data available</div>
        </div>
      )}

      {/* Controls */}
      <div className="mt-4 flex space-x-2">
        <button 
          onClick={refresh}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          🔄 Refresh Data
        </button>
        <button 
          onClick={() => console.log('Current data:', statisticsData)}
          className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
        >
          📝 Log to Console
        </button>
      </div>
    </div>
  );
}