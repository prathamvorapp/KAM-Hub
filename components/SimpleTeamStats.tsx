'use client'

import { useTeamStatistics } from '../hooks/useRobustApi';
import { useAuth } from '../contexts/AuthContext';
import { 
  Building2, 
  CheckCircle, 
  Clock, 
  Calendar, 
  XCircle,
  Users,
  Target,
  TrendingUp
} from 'lucide-react';

export default function SimpleTeamStats() {
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
      console.error('❌ Simple stats error:', error);
    },
    onSuccess: (data) => {
      // console.log('✅ Simple stats loaded:', data);
    }
  });

  // Show loading state
  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          <span className="ml-3 text-gray-600">Loading team statistics...</span>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
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
        </div>
      </div>
    );
  }

  // Show no data state
  if (!statisticsData) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center">
            <div className="text-yellow-500 mr-3">⚠️</div>
            <div>
              <h3 className="text-yellow-800 font-medium">No data available</h3>
              <p className="text-yellow-600 text-sm mt-1">Team statistics are not available at the moment.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Calculate simple totals
  const teamStats = statisticsData.team_statistics || [];
  const teamSummary = statisticsData.team_summary;
  
  // Use team summary if available, otherwise calculate from individual stats
  let totals;
  if (teamSummary) {
    totals = {
      total_brands: teamSummary.total_brands || 0,
      total_visits_done: teamSummary.total_visits_done || 0,
      total_visits_pending: teamSummary.total_visits_pending || 0,
      total_scheduled_visits: teamSummary.total_scheduled_visits || 0,
      total_cancelled_visits: teamSummary.total_cancelled_visits || 0,
      current_month_total: teamSummary.current_month_total || 0,
      mom_pending: teamSummary.mom_pending || 0
    };
  } else {
    // Calculate from individual stats
    totals = teamStats.reduce((acc: any, agent: any) => {
      if (!agent.error) {
        acc.total_brands += agent.total_brands || 0;
        acc.total_visits_done += agent.total_visits_done || 0;
        acc.total_visits_pending += agent.total_visits_pending || 0;
        acc.total_scheduled_visits += agent.total_scheduled_visits || 0;
        acc.total_cancelled_visits += agent.total_cancelled_visits || 0;
        acc.current_month_total += agent.current_month_total || 0;
        acc.mom_pending += agent.mom_pending || 0;
      }
      return acc;
    }, {
      total_brands: 0,
      total_visits_done: 0,
      total_visits_pending: 0,
      total_scheduled_visits: 0,
      total_cancelled_visits: 0,
      current_month_total: 0,
      mom_pending: 0
    });
  }

  // console.log('📊 Calculated totals:', totals);

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Visit Statistics</h2>
          <p className="text-sm text-gray-600">
            Team: {statisticsData.team_name || 'Unknown'} • 
            Lead: {statisticsData.team_lead || 'Unknown'} • 
            Members: {teamStats.length}
          </p>
        </div>
        <button
          onClick={refresh}
          className="text-sm text-blue-600 hover:text-blue-800 underline"
        >
          Refresh
        </button>
      </div>

      {/* Main Statistics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
        <div className="bg-blue-50 rounded-lg p-4 text-center border border-blue-100">
          <Building2 className="w-8 h-8 text-blue-600 mx-auto mb-2" />
          <div className="text-2xl font-bold text-blue-600">{totals.total_brands}</div>
          <div className="text-sm text-gray-600">Total Brands</div>
          <div className="text-xs text-gray-500 mt-1">Total brands assigned</div>
        </div>
        
        <div className="bg-green-50 rounded-lg p-4 text-center border border-green-100">
          <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
          <div className="text-2xl font-bold text-green-600">{totals.total_visits_done}</div>
          <div className="text-sm text-gray-600">Visits Done</div>
          <div className="text-xs text-gray-500 mt-1">Completed visits</div>
        </div>
        
        <div className="bg-yellow-50 rounded-lg p-4 text-center border border-yellow-100">
          <Clock className="w-8 h-8 text-yellow-600 mx-auto mb-2" />
          <div className="text-2xl font-bold text-yellow-600">{totals.total_visits_pending}</div>
          <div className="text-sm text-gray-600">Visits Pending</div>
          <div className="text-xs text-gray-500 mt-1">Brands not visited yet</div>
        </div>
        
        <div className="bg-purple-50 rounded-lg p-4 text-center border border-purple-100">
          <Calendar className="w-8 h-8 text-purple-600 mx-auto mb-2" />
          <div className="text-2xl font-bold text-purple-600">{totals.total_scheduled_visits}</div>
          <div className="text-sm text-gray-600">Visits Scheduled</div>
          <div className="text-xs text-gray-500 mt-1">Upcoming visits</div>
        </div>
        
        <div className="bg-red-50 rounded-lg p-4 text-center border border-red-100">
          <XCircle className="w-8 h-8 text-red-600 mx-auto mb-2" />
          <div className="text-2xl font-bold text-red-600">{totals.total_cancelled_visits}</div>
          <div className="text-sm text-gray-600">Visits Cancelled</div>
          <div className="text-xs text-gray-500 mt-1">Cancelled visits</div>
        </div>
      </div>

      {/* Secondary Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-pink-50 rounded-lg p-4 text-center border border-pink-100">
          <Users className="w-6 h-6 text-pink-600 mx-auto mb-2" />
          <div className="text-xl font-bold text-pink-600">{totals.mom_pending}</div>
          <div className="text-sm text-gray-600">MOM Pending</div>
        </div>
        
        <div className="bg-orange-50 rounded-lg p-4 text-center border border-orange-100">
          <Target className="w-6 h-6 text-orange-600 mx-auto mb-2" />
          <div className="text-xl font-bold text-orange-600">{totals.current_month_total}</div>
          <div className="text-sm text-gray-600">This Month</div>
        </div>
        
        <div className="bg-indigo-50 rounded-lg p-4 text-center border border-indigo-100">
          <TrendingUp className="w-6 h-6 text-indigo-600 mx-auto mb-2" />
          <div className="text-xl font-bold text-indigo-600">
            {totals.total_brands > 0 ? Math.round((totals.total_visits_done / totals.total_brands) * 100) : 0}%
          </div>
          <div className="text-sm text-gray-600">Completion Rate</div>
        </div>

        <div className="bg-teal-50 rounded-lg p-4 text-center border border-teal-100">
          <Users className="w-6 h-6 text-teal-600 mx-auto mb-2" />
          <div className="text-xl font-bold text-teal-600">{teamStats.filter((agent: any) => !agent.error).length}</div>
          <div className="text-sm text-gray-600">Active Agents</div>
        </div>
      </div>

      {/* Team Members List */}
      {teamStats.length > 0 && (
        <div className="border-t pt-4">
          <h3 className="text-md font-medium text-gray-900 mb-3">Team Members</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {teamStats.map((agent: any, index: number) => (
              <div key={index} className="bg-gray-50 rounded-lg p-3 border">
                <div className="font-medium text-gray-900">{agent.agent_name}</div>
                <div className="text-sm text-gray-600 mt-1">
                  <div>Brands: {agent.total_brands || 0}</div>
                  <div>Done: {agent.total_visits_done || 0} | Pending: {agent.total_visits_pending || 0}</div>
                  <div>Progress: {agent.current_month_progress || 0}%</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Debug Info */}
      <div className="mt-4 text-xs text-gray-500">
        Last updated: {new Date().toLocaleTimeString()} | 
        Data source: {teamSummary ? 'Team Summary' : 'Calculated'} | 
        Members: {teamStats.length}
      </div>
    </div>
  );
}