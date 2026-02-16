
import { useMemo } from 'react';

interface VisitStatsData {
  total_visits: number;
  completed_visits: number;
  pending_visits: number;
  mom_shared: number;
  approved_visits: number;
  mom_pending_approval: number;
  completion_rate: number;
  mom_share_rate: number;
  approval_rate: number;
}

interface VisitStatsProps {
  visitStats: VisitStatsData | null | undefined;
}

const VisitStats = ({ visitStats }: VisitStatsProps) => {
  console.log('VisitStats component rendered with:', visitStats);

  // Always show the stats container, even if data is missing
  const stats = useMemo(() => {
    if (!visitStats) {
      console.log('No visitStats provided, using default values');
      return {
        total_visits: 0,
        completed_visits: 0,
        mom_pending_approval: 0,
        pending_visits: 0,
        approved_visits: 0,
      };
    }
    
    console.log('Using provided visitStats:', visitStats);
    return {
      total_visits: visitStats.total_visits || 0,
      completed_visits: visitStats.completed_visits || 0,
      mom_pending_approval: visitStats.mom_pending_approval || 0,
      pending_visits: visitStats.pending_visits || 0,
      approved_visits: visitStats.approved_visits || 0,
    };
  }, [visitStats]);

  return (
    <div className="glass-morphism p-6 rounded-xl">
      <h2 className="text-xl font-semibold text-white mb-4">Visit Statistics</h2>
      {!visitStats && (
        <div className="text-center p-2 mb-4 text-yellow-400 text-sm">
          No statistics data available. Showing default values.
        </div>
      )}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 text-white">
        <div className="stat-card">
          <p className="stat-value">{stats.total_visits}</p>
          <p className="stat-label">Total Visits</p>
        </div>
        <div className="stat-card">
          <p className="stat-value">{stats.completed_visits}</p>
          <p className="stat-label">Visits Done</p>
        </div>
        <div className="stat-card">
          <p className="stat-value">{stats.mom_pending_approval}</p>
          <p className="stat-label">MOM Pending</p>
        </div>
        <div className="stat-card">
          <p className="stat-value">{stats.pending_visits}</p>
          <p className="stat-label">Visits Scheduled</p>
        </div>
        <div className="stat-card">
          <p className="stat-value">{stats.approved_visits}</p>
          <p className="stat-label">Approved Visits</p>
        </div>
      </div>
    </div>
  );
};

export default VisitStats;
