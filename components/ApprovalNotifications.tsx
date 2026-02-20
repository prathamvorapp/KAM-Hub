'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';

interface ApprovalNotificationsProps {
  userEmail: string;
  userRole: string;
}

interface Visit {
  _id: string;
  visit_id: string;
  brand_name: string;
  visit_status: string;
  approval_status?: string;
  agent_id?: string;
  agent_name?: string;
  scheduled_date: string;
  visit_date?: string;
}

interface OpenPoint {
  status: string;
  description?: string;
  responsible?: string;
  deadline?: string;
}

interface MOM {
  visit_id: string;
  open_points?: OpenPoint[];
  meeting_notes?: string;
}

export default function ApprovalNotifications({ userEmail, userRole }: ApprovalNotificationsProps) {
  const [pendingCount, setPendingCount] = useState(0);
  const [totalOpenPoints, setTotalOpenPoints] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for both 'Team Lead' and 'team_lead' role formats
    const isTeamLead = userRole === 'Team Lead' || userRole === 'team_lead';
    
    if (isTeamLead) {
      loadPendingApprovals();
      
      // Refresh every 30 seconds
      const interval = setInterval(loadPendingApprovals, 30000);
      return () => clearInterval(interval);
    }
  }, [userEmail, userRole]);

  const loadPendingApprovals = async () => {
    try {
      const visitsResponse = await api.getVisits({
        limit: 1000 // Increase limit to get all visits
      });
      
      console.log('📋 ApprovalNotifications - Visits response:', visitsResponse);
      
      // Fix: getVisits returns { success: true, page: [], isDone, continueCursor }
      const allVisits = visitsResponse.page || [];
      
      // Filter to show only visits with pending approval (MOM submitted but not yet approved/rejected)
      const pendingVisits = allVisits.filter((v: Visit) => 
        v.approval_status === 'Pending' || v.approval_status === 'pending'
      );
      
      console.log('📊 ApprovalNotifications - Pending visits:', pendingVisits.length, 'out of', allVisits.length);
      
      // Get MOM details for each pending visit to count open points
      let totalOpenPoints = 0;
      for (const visit of pendingVisits) {
        try {
          const momResponse = await api.getMOM({
            search: visit.visit_id // Search by visit_id to find related MOM
          });
          
          console.log('📋 ApprovalNotifications - MOM response for', visit.visit_id, ':', momResponse);
          
          // Fix: getMOM returns { success: true, data: { data: [...] } }
          const moms = momResponse.data?.data || momResponse.data || [];
          const visitMOM = moms.find((mom: MOM) => mom.visit_id === visit.visit_id);
          
          if (visitMOM && visitMOM.open_points) {
            const openPointsCount = visitMOM.open_points.filter((point: OpenPoint) => point.status === 'Open').length;
            totalOpenPoints += openPointsCount;
            console.log('📊 ApprovalNotifications - Open points for', visit.brand_name, ':', openPointsCount);
          }
        } catch (error) {
          console.error('Error fetching MOM for visit:', visit.visit_id, error);
        }
      }
      
      console.log('✅ ApprovalNotifications - Total pending:', pendingVisits.length, 'Total open points:', totalOpenPoints);
      
      setPendingCount(pendingVisits.length);
      setTotalOpenPoints(totalOpenPoints);
    } catch (error) {
      console.error('Failed to load pending approvals:', error);
    } finally {
      setLoading(false);
    }
  };

  // Check for both 'Team Lead' and 'team_lead' role formats
  const isTeamLead = userRole === 'Team Lead' || userRole === 'team_lead';
  
  if (!isTeamLead || loading) {
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