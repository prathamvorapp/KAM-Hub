'use client';

import { useState, useEffect } from 'react';
import { convexAPI } from '@/lib/convex-api';

interface ApprovalNotificationsProps {
  userEmail: string;
  userRole: string;
}

export default function ApprovalNotifications({ userEmail, userRole }: ApprovalNotificationsProps) {
  const [pendingCount, setPendingCount] = useState(0);
  const [totalOpenPoints, setTotalOpenPoints] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userRole === 'Team Lead') {
      loadPendingApprovals();
      
      // Refresh every 30 seconds
      const interval = setInterval(loadPendingApprovals, 30000);
      return () => clearInterval(interval);
    }
  }, [userEmail, userRole]);

  const loadPendingApprovals = async () => {
    try {
      const visitsResponse = await convexAPI.getVisits({
        email: userEmail,
        limit: 100
      });
      
      console.log('📋 ApprovalNotifications - Visits response:', visitsResponse);
      
      // Fix: getVisits returns { data: { page: [], isDone, continueCursor } }
      const allVisits = visitsResponse.data.page || [];
      
      // Filter to show only truly pending MOMs (exclude rejected ones)
      const pendingVisits = allVisits.filter(v => 
        v.visit_status === 'Pending' && 
        v.approval_status !== 'Rejected'
      );
      
      console.log('📊 ApprovalNotifications - Pending visits:', pendingVisits.length, 'out of', allVisits.length);
      
      // Get MOM details for each pending visit to count open points
      let totalOpenPoints = 0;
      for (const visit of pendingVisits) {
        try {
          const momResponse = await convexAPI.getMOM({
            email: userEmail,
            search: visit.visit_id // Search by visit_id to find related MOM
          });
          
          const visitMOM = momResponse.data.data.find(mom => mom.visit_id === visit.visit_id);
          if (visitMOM && visitMOM.open_points) {
            const openPointsCount = visitMOM.open_points.filter(point => point.status === 'Open').length;
            totalOpenPoints += openPointsCount;
          }
        } catch (error) {
          console.error('Error fetching MOM for visit:', visit.visit_id, error);
        }
      }
      
      setPendingCount(pendingVisits.length);
      setTotalOpenPoints(totalOpenPoints);
    } catch (error) {
      console.error('Failed to load pending approvals:', error);
    } finally {
      setLoading(false);
    }
  };

  if (userRole !== 'Team Lead' || loading) {
    return null;
  }

  if (pendingCount === 0) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50">
      <div className="bg-white border-2 border-blue-200 text-gray-800 px-5 py-3 rounded-lg shadow-md flex items-center space-x-3 hover:shadow-lg transition-shadow">
        <div className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-pulse"></div>
        <div className="flex flex-col">
          <span className="font-semibold text-gray-900">
            {pendingCount} MOM{pendingCount > 1 ? 's' : ''} awaiting approval
          </span>
          {totalOpenPoints > 0 && (
            <span className="text-xs text-gray-600 mt-0.5">
              {totalOpenPoints} open point{totalOpenPoints > 1 ? 's' : ''} total
            </span>
          )}
        </div>
        <a 
          href="/dashboard/approvals" 
          className="bg-blue-500 text-white px-3 py-1.5 rounded-md text-sm font-medium hover:bg-blue-600 transition-colors"
        >
          Review
        </a>
      </div>
    </div>
  );
}