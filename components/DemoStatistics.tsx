"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { Presentation, TrendingUp, Clock, CheckCircle, RefreshCw } from "lucide-react";

interface DemoStats {
  total: number;
  byStatus: Record<string, number>;
  byProduct: Record<string, number>;
  converted: number;
  notConverted: number;
  pending: number;
}

export default function DemoStatistics() {
  const { userProfile } = useAuth();
  const [stats, setStats] = useState<DemoStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (userProfile) {
      loadStats();
    }
  }, [userProfile]);

  const loadStats = async (forceRefresh = false) => {
    try {
      if (forceRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      const response = await api.getDemoStatistics();
      // console.log('📊 Demo statistics response:', response);
      // Extract data from response if it's wrapped
      const statsData = response.data || response;
      // console.log('📊 Demo statistics data:', statsData);
      setStats(statsData);
    } catch (error) {
      console.error("Error loading demo statistics:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    loadStats(true);
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20 animate-pulse">
            <div className="h-4 bg-white/20 rounded mb-2"></div>
            <div className="h-8 bg-white/20 rounded mb-2"></div>
            <div className="h-3 bg-white/20 rounded"></div>
          </div>
        ))}
      </div>
    );
  }

  if (!stats) {
    // console.log('⚠️ No stats available');
    return (
      <div className="text-center py-8">
        <p className="text-white/60">No demo statistics available</p>
      </div>
    );
  }

  // console.log('📊 Rendering stats:', stats);
  const conversionRate = stats.total > 0 ? Math.round((stats.converted / stats.total) * 100) : 0;
  const completionRate = stats.total > 0 ? Math.round(((stats.converted + stats.notConverted) / stats.total) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Refresh Button */}
      <div className="flex justify-end">
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center space-x-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          <span>{refreshing ? 'Refreshing...' : 'Refresh Stats'}</span>
        </button>
      </div>

      {/* Main Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/80 text-sm">Total Demos</p>
              <p className="text-3xl font-bold text-white">{stats.total}</p>
            </div>
            <Presentation className="w-8 h-8 text-purple-400" />
          </div>
          <p className="text-sm mt-2 text-white/60">
            Across all products
          </p>
        </div>

        <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/80 text-sm">Converted</p>
              <p className="text-3xl font-bold text-green-400">{stats.converted}</p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-400" />
          </div>
          <p className="text-sm mt-2 text-green-400">
            {conversionRate}% conversion rate
          </p>
        </div>

        <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/80 text-sm">Pending</p>
              <p className="text-3xl font-bold text-orange-400">{stats.pending}</p>
            </div>
            <Clock className="w-8 h-8 text-orange-400" />
          </div>
          <p className="text-sm mt-2 text-orange-400">
            In progress
          </p>
        </div>

        <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/80 text-sm">Completion Rate</p>
              <p className="text-3xl font-bold text-blue-400">{completionRate}%</p>
            </div>
            <TrendingUp className="w-8 h-8 text-blue-400" />
          </div>
          <p className="text-sm mt-2 text-blue-400">
            Workflow completed
          </p>
        </div>
      </div>

      {/* Status Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
          <h3 className="text-lg font-semibold text-white mb-4">Status Breakdown</h3>
          <div className="space-y-3">
            {stats.byStatus && Object.entries(stats.byStatus).map(([status, count]) => {
              const percentage = stats.total > 0 ? Math.round((count / stats.total) * 100) : 0;
              const getStatusColor = (status: string) => {
                const colors: Record<string, string> = {
                  "Step 1 Pending": "bg-yellow-500",
                  "Step 2 Pending": "bg-blue-500",
                  "Demo Pending": "bg-orange-500",
                  "Demo Scheduled": "bg-purple-500",
                  "Feedback Awaited": "bg-indigo-500",
                  "Converted": "bg-green-500",
                  "Not Converted": "bg-red-500",
                  "Not Applicable": "bg-gray-500",
                  "Already Using": "bg-teal-500",
                };
                return colors[status] || "bg-gray-500";
              };

              return (
                <div key={status} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full ${getStatusColor(status)}`}></div>
                    <span className="text-white/80 text-sm">{status}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-white font-medium">{count}</span>
                    <span className="text-white/60 text-sm">({percentage}%)</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
          <h3 className="text-lg font-semibold text-white mb-4">Product Breakdown</h3>
          <div className="space-y-3">
            {stats.byProduct && Object.entries(stats.byProduct).map(([product, count]) => {
              const percentage = stats.total > 0 ? Math.round((count / stats.total) * 100) : 0;
              
              return (
                <div key={product} className="flex items-center justify-between">
                  <span className="text-white/80 text-sm">{product}</span>
                  <div className="flex items-center space-x-2">
                    <span className="text-white font-medium">{count}</span>
                    <span className="text-white/60 text-sm">({percentage}%)</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}