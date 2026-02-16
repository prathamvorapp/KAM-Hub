'use client'

import { useTeamStatistics } from '../hooks/useRobustApi';
import { useAuth } from '../contexts/AuthContext';

interface RobustStatsLoaderProps {
  onDataLoaded?: (data: any) => void;
  onError?: (error: string) => void;
  showDebugInfo?: boolean;
}

export default function RobustStatsLoader({ 
  onDataLoaded, 
  onError, 
  showDebugInfo = false 
}: RobustStatsLoaderProps) {
  const { user } = useAuth();
  
  const {
    data: statisticsData,
    loading,
    error,
    retry,
    refresh
  } = useTeamStatistics(user?.email, {
    autoLoad: true,
    retryOnMount: true,
    refreshInterval: 300000, // 5 minutes
    onError: (error) => {
      console.error('❌ Team statistics error:', error);
      onError?.(error);
    },
    onSuccess: (data) => {
      console.log('✅ Team statistics loaded successfully');
      onDataLoaded?.(data);
    }
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        <span className="ml-3 text-gray-600">Loading team statistics...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="text-red-500 mr-3">❌</div>
            <div>
              <h3 className="text-red-800 font-medium">Failed to load team statistics</h3>
              <p className="text-red-600 text-sm mt-1">{error}</p>
            </div>
          </div>
          <button
            onClick={retry}
            className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 text-sm"
          >
            Retry
          </button>
        </div>
        
        {showDebugInfo && (
          <div className="mt-4 p-3 bg-red-100 rounded text-xs">
            <strong>Debug Info:</strong>
            <br />User: {user?.email || 'Not logged in'}
            <br />Role: {user?.role || 'N/A'}
            <br />Team: {user?.team_name || 'N/A'}
          </div>
        )}
      </div>
    );
  }

  if (!statisticsData) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-center">
          <div className="text-yellow-500 mr-3">⚠️</div>
          <div>
            <h3 className="text-yellow-800 font-medium">No data available</h3>
            <p className="text-yellow-600 text-sm mt-1">Team statistics are not available at the moment.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <div className="text-green-500 mr-3">✅</div>
          <div>
            <h3 className="text-green-800 font-medium">Team statistics loaded successfully</h3>
            <p className="text-green-600 text-sm mt-1">
              {statisticsData.team_statistics?.length || 0} team members, 
              Team: {statisticsData.team_name || 'Unknown'}
            </p>
          </div>
        </div>
        <button
          onClick={refresh}
          className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 text-sm"
        >
          Refresh
        </button>
      </div>
      
      {showDebugInfo && (
        <div className="mt-4 p-3 bg-green-100 rounded text-xs">
          <strong>Debug Info:</strong>
          <br />Team Lead: {statisticsData.team_lead}
          <br />Team Members: {statisticsData.team_statistics?.length || 0}
          <br />Has Breakdown: {statisticsData.team_wise_breakdown ? 'Yes' : 'No'}
          <br />Last Updated: {new Date().toLocaleTimeString()}
        </div>
      )}
    </div>
  );
}