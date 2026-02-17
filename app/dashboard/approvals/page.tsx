'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { convexAPI } from '@/lib/convex-api'
import DashboardLayout from '@/components/Layout/DashboardLayout'
import RejectMomModal from '@/components/modals/RejectMomModal'
import { ThumbsUp, ThumbsDown, Clock, AlertTriangle } from 'lucide-react'

// Define Id type locally to avoid import issues
type Id<T> = string

interface User {
  email: string;
  full_name: string;
  role: string;
  team_name?: string;
  permissions: string[];
}

interface Visit {
  _id: Id<"visits">;
  visit_id: string;
  brand_name: string;
  agent_name: string;
  scheduled_date: string;
  visit_date?: string; // When the visit was completed
  visit_status: string;
  approval_status?: string;
  mom_shared_date?: string; // When MOM was submitted
  outcome?: string;
  next_steps?: string;
  notes?: string;
  // Add MOM details
  mom_open_points_count?: number;
  mom_total_points_count?: number;
  // Add rejection details
  rejection_remarks?: string;
  rejected_by?: string;
  rejected_at?: string;
  resubmission_count?: number;
}

export default function ApprovalsPage() {
  const { user, userProfile, loading: authLoading } = useAuth()
  const [loading, setLoading] = useState(true);
  const [pendingVisits, setPendingVisits] = useState<Visit[]>([]);
  const [filteredVisits, setFilteredVisits] = useState<Visit[]>([]);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [selectedVisit, setSelectedVisit] = useState<Visit | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [submissionFilter, setSubmissionFilter] = useState<'all' | 'first' | 'resubmission'>('all');
  const router = useRouter();

  // Calculate days between visit completion and MOM submission
  const calculateDaysBetween = (visitDate?: string, momDate?: string) => {
    if (!visitDate || !momDate) return null;
    
    const visit = new Date(visitDate);
    const mom = new Date(momDate);
    const diffTime = Math.abs(mom.getTime() - visit.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
  };

  // Get styling for days indicator
  const getDaysIndicatorStyle = (days: number | null) => {
    if (days === null) return "bg-gray-100 text-gray-600";
    if (days > 5) return "bg-red-100 text-red-800 border-red-300";
    if (days > 3) return "bg-yellow-100 text-yellow-800 border-yellow-300";
    return "bg-green-100 text-green-800 border-green-300";
  };

  const loadPendingVisits = useCallback(async () => {
    if (!user || !userProfile) {
      console.log('❌ No user or userProfile, redirecting to login')
      router.push('/login');
      return;
    }

    try {
      setLoading(true);

      if (userProfile.role === 'Team Lead' || userProfile.role === 'team_lead') {
        console.log('👥 [APPROVALS] Team Lead loading pending visits for:', user.email, 'Team:', userProfile.team_name);
        
        const visitsResponse = await convexAPI.getVisits({
          email: user.email,
          // Don't filter by search - we'll filter by approval_status instead
        });
        
        console.log('📋 [APPROVALS] Visits response structure:', visitsResponse);
        
        // Fix: API returns { success: true, page: [], isDone, ... }
        const allVisits = visitsResponse.page || [];
        
        console.log('📋 [APPROVALS] Total visits received:', allVisits.length);
        console.log('📋 [APPROVALS] All visits:', allVisits.map((v: any) => ({
          brand: v.brand_name,
          status: v.visit_status,
          approval: v.approval_status,
          agent: v.agent_name,
          team: v.team_name
        })));
        
        // Filter to show only visits with pending approval (MOM submitted but not yet approved/rejected)
        const pendingVisits = allVisits.filter((v: any) => 
          v.approval_status === 'Pending' || v.approval_status === 'pending'
        );
        
        console.log('📋 [APPROVALS] Filtered pending visits:', pendingVisits.length);
        
        // Enhance visits with MOM details
        const enhancedVisits = await Promise.all(
          pendingVisits.map(async (visit: any) => {
            try {
              console.log('🔍 Loading MOM for visit:', visit.visit_id);
              const momResponse = await convexAPI.getMOM({
                email: user.email,
                search: visit.visit_id // Search by visit_id to find related MOM
              });
              
              console.log('📋 MOM Response for', visit.visit_id, ':', momResponse);
              
              const visitMOM: any = momResponse.data?.data?.find((mom: any) => mom.visit_id === visit.visit_id);
              if (visitMOM && visitMOM.open_points) {
                const openPointsCount = visitMOM.open_points.filter((point: any) => point.status === 'Open').length;
                const totalPointsCount = visitMOM.open_points.length;
                
                console.log('✅ Found MOM with open points:', {
                  visit_id: visit.visit_id,
                  openPointsCount,
                  totalPointsCount,
                  open_points: visitMOM.open_points
                });
                
                return {
                  ...visit,
                  mom_open_points_count: openPointsCount,
                  mom_total_points_count: totalPointsCount
                };
              }
              
              console.log('⚠️ No MOM or open points found for visit:', visit.visit_id);
              return {
                ...visit,
                mom_open_points_count: 0,
                mom_total_points_count: 0
              };
            } catch (error) {
              console.error('❌ Error fetching MOM for visit:', visit.visit_id, error);
              return {
                ...visit,
                mom_open_points_count: 0,
                mom_total_points_count: 0
              };
            }
          })
        );
        
        setPendingVisits(enhancedVisits);
        setFilteredVisits(enhancedVisits); // Initialize filtered visits
      } else if (userProfile.role !== 'Team Lead' && userProfile.role !== 'team_lead') {
        // If not a team lead, redirect or show an error
        alert("You do not have permission to view this page.");
        router.push('/dashboard');
      }
    } catch (error) {
      console.error("Failed to load pending visits:", error);
    } finally {
      setLoading(false);
    }
  }, [user, userProfile, router]);

  useEffect(() => {
    if (!authLoading) {
      loadPendingVisits();
    }
  }, [loadPendingVisits, authLoading]);

  // Filter visits based on submission type
  useEffect(() => {
    let filtered = pendingVisits;
    
    switch (submissionFilter) {
      case 'first':
        filtered = pendingVisits.filter(visit => !visit.resubmission_count || visit.resubmission_count === 0);
        break;
      case 'resubmission':
        filtered = pendingVisits.filter(visit => visit.resubmission_count && visit.resubmission_count > 0);
        break;
      default:
        filtered = pendingVisits;
    }
    
    setFilteredVisits(filtered);
  }, [pendingVisits, submissionFilter]);

  const handleApproval = async (visitId: string, status: 'Approved' | 'Rejected') => {
    if (!userProfile) return;
    
    if (status === 'Rejected') {
      // Find the visit and open rejection modal
      const visit = pendingVisits.find(v => v.visit_id === visitId);
      if (visit) {
        setSelectedVisit(visit);
        setRejectModalOpen(true);
      }
      return;
    }

    // Handle approval directly
    try {
      setActionLoading(true);
      await convexAPI.approveVisit(visitId, userProfile.email, status);
      await loadPendingVisits(); // Refresh the list
    } catch (error: any) {
      console.error(`Failed to set visit status to ${status}:`, error);
      alert(`Error: ${error?.message || 'Unknown error'}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectWithRemarks = async (remarks: string) => {
    if (!userProfile || !selectedVisit) return;
    
    try {
      setActionLoading(true);
      await convexAPI.approveVisit(selectedVisit.visit_id, userProfile.email, 'Rejected', remarks);
      setRejectModalOpen(false);
      setSelectedVisit(null);
      await loadPendingVisits(); // Refresh the list
    } catch (error: any) {
      console.error('Failed to reject MOM:', error);
      alert(`Error: ${error?.message || 'Unknown error'}`);
    } finally {
      setActionLoading(false);
    }
  };

  if (authLoading || loading || !userProfile) {
    return (
      <DashboardLayout userProfile={userProfile}>
        <div className="text-center p-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading Approvals...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout userProfile={userProfile}>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-white">MOM Approvals</h1>
          
          {/* Summary Stats */}
          {pendingVisits.length > 0 && (
            <div className="flex gap-4">
              <div className="bg-blue-500/20 border border-blue-500/30 rounded-lg px-4 py-2">
                <div className="text-blue-300 text-sm">First Submissions</div>
                <div className="text-white text-xl font-bold">
                  {pendingVisits.filter(visit => !visit.resubmission_count || visit.resubmission_count === 0).length}
                </div>
              </div>
              <div className="bg-orange-500/20 border border-orange-500/30 rounded-lg px-4 py-2">
                <div className="text-orange-300 text-sm">Resubmissions</div>
                <div className="text-white text-xl font-bold">
                  {pendingVisits.filter(visit => visit.resubmission_count && visit.resubmission_count > 0).length}
                </div>
              </div>
              <div className="bg-yellow-500/20 border border-yellow-500/30 rounded-lg px-4 py-2">
                <div className="text-yellow-300 text-sm">Total Open Points</div>
                <div className="text-white text-xl font-bold">
                  {pendingVisits.reduce((sum, visit) => sum + (visit.mom_open_points_count || 0), 0)}
                </div>
              </div>
            </div>
          )}
        </div>
        
        <div className="glass-morphism p-6 rounded-xl">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-white">Pending Submissions</h2>
            
            {/* Filter Buttons */}
            <div className="flex gap-2">
              <button
                onClick={() => setSubmissionFilter('all')}
                className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                  submissionFilter === 'all'
                    ? 'bg-white/20 text-white border border-white/30'
                    : 'bg-white/5 text-gray-300 hover:bg-white/10'
                }`}
              >
                All ({pendingVisits.length})
              </button>
              <button
                onClick={() => setSubmissionFilter('first')}
                className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                  submissionFilter === 'first'
                    ? 'bg-blue-500/30 text-blue-200 border border-blue-400/50'
                    : 'bg-white/5 text-gray-300 hover:bg-white/10'
                }`}
              >
                First Submissions ({pendingVisits.filter(visit => !visit.resubmission_count || visit.resubmission_count === 0).length})
              </button>
              <button
                onClick={() => setSubmissionFilter('resubmission')}
                className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                  submissionFilter === 'resubmission'
                    ? 'bg-orange-500/30 text-orange-200 border border-orange-400/50'
                    : 'bg-white/5 text-gray-300 hover:bg-white/10'
                }`}
              >
                Resubmissions ({pendingVisits.filter(visit => visit.resubmission_count && visit.resubmission_count > 0).length})
              </button>
            </div>
          </div>
          
          {filteredVisits.length > 0 ? (
            <div className="space-y-4">
              {filteredVisits.map(visit => {
                const daysBetween = calculateDaysBetween(visit.visit_date, visit.mom_shared_date);
                const daysStyle = getDaysIndicatorStyle(daysBetween);
                
                return (
                  <div key={visit.visit_id} className="bg-white/5 p-4 rounded-lg border border-white/10">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-bold text-lg text-white">{visit.brand_name}</h3>
                          
                          {/* Resubmission Indicator */}
                          {visit.resubmission_count && visit.resubmission_count > 0 ? (
                            <div className="flex items-center gap-2">
                              <div className="chip bg-orange-100 text-orange-800 border border-orange-300 flex items-center gap-1">
                                🔄 Resubmission #{visit.resubmission_count + 1}
                              </div>
                              <div className="chip bg-red-100 text-red-800 border border-red-300 text-xs">
                                Previously Rejected
                              </div>
                            </div>
                          ) : (
                            <div className="chip bg-blue-100 text-blue-800 border border-blue-300 text-xs">
                              ✨ First Submission
                            </div>
                          )}
                        </div>
                        
                        <p className="text-sm text-gray-300">Agent: {visit.agent_name}</p>
                        <p className="text-sm text-gray-400">Scheduled: {new Date(visit.scheduled_date).toLocaleDateString()}</p>

                        {/* Show previous rejection details if this is a resubmission */}
                        {visit.resubmission_count && visit.resubmission_count > 0 && visit.rejection_remarks && (
                          <div className="mt-3 p-3 bg-red-900/20 border border-red-500/30 rounded-lg">
                            <div className="flex items-start gap-2">
                              <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                              <div>
                                <p className="text-red-300 text-sm font-medium mb-1">Previous Rejection Reason:</p>
                                <p className="text-red-200 text-sm">{visit.rejection_remarks}</p>
                                <div className="text-red-400 text-xs mt-1">
                                  Rejected by: {visit.rejected_by} • {visit.rejected_at ? new Date(visit.rejected_at).toLocaleDateString() : 'Unknown date'}
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {/* Visit and MOM dates with days calculation */}
                        <div className="flex flex-wrap gap-2 mt-2">
                          <div className="chip bg-orange-100 text-orange-800">
                            <Clock className="w-4 h-4" />Pending Approval
                          </div>
                          
                          {visit.visit_date && (
                            <div className="chip bg-blue-100 text-blue-800">
                              Visit Completed: {new Date(visit.visit_date).toLocaleDateString()}
                            </div>
                          )}
                          
                          {visit.mom_shared_date && (
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                console.log('🎯 Clicking MOM Submitted button for visit:', visit.visit_id);
                                router.push(`/dashboard/mom-tracker?visit_id=${visit.visit_id}`);
                              }}
                              className="chip bg-purple-100 text-purple-800 cursor-pointer hover:bg-purple-200 transition-all duration-200"
                              title="Click to view MOM details and open points"
                              style={{ 
                                pointerEvents: 'auto',
                                zIndex: 10,
                                position: 'relative'
                              }}
                            >
                              MOM Submitted: {new Date(visit.mom_shared_date).toLocaleDateString()}
                            </button>
                          )}
                          
                          {/* Open Points Count - Clickable */}
                          {visit.mom_total_points_count !== undefined && visit.mom_total_points_count > 0 && (
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                console.log('🎯 Clicking open points button for visit:', visit.visit_id);
                                router.push(`/dashboard/mom-tracker?visit_id=${visit.visit_id}`);
                              }}
                              className={`chip border cursor-pointer hover:opacity-80 transition-all duration-200 ${
                                visit.mom_open_points_count === 0 
                                  ? 'bg-green-100 text-green-800 border-green-300 hover:bg-green-200' 
                                  : visit.mom_open_points_count! > 5
                                  ? 'bg-red-100 text-red-800 border-red-300 hover:bg-red-200'
                                  : 'bg-yellow-100 text-yellow-800 border-yellow-300 hover:bg-yellow-200'
                              }`}
                              title="Click to view MOM details and open points"
                              style={{ 
                                pointerEvents: 'auto',
                                zIndex: 10,
                                position: 'relative'
                              }}
                            >
                              📋 {visit.mom_open_points_count}/{visit.mom_total_points_count} Open Points
                              {visit.mom_open_points_count! > 5 && ' ⚠️'}
                            </button>
                          )}
                          
                          {/* Fallback: Always show View MOM button if no open points data */}
                          {(visit.mom_total_points_count === undefined || visit.mom_total_points_count === 0) && visit.mom_shared_date && (
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                console.log('🎯 Clicking View MOM Details button for visit:', visit.visit_id);
                                router.push(`/dashboard/mom-tracker?visit_id=${visit.visit_id}`);
                              }}
                              className="chip bg-blue-100 text-blue-800 border-2 border-blue-400 cursor-pointer hover:bg-blue-200 hover:border-blue-500 transition-all duration-200 shadow-sm hover:shadow-md"
                              title="Click to view MOM details"
                              style={{ 
                                pointerEvents: 'auto',
                                zIndex: 10,
                                position: 'relative',
                                borderStyle: 'solid',
                                borderWidth: '2px'
                              }}
                            >
                              📋 View MOM Details
                            </button>
                          )}
                          
                          {daysBetween !== null && (
                            <div className={`chip border ${daysStyle}`}>
                              {daysBetween === 0 ? 'Same Day' : 
                               daysBetween === 1 ? '1 Day' : 
                               `${daysBetween} Days`}
                              {daysBetween > 5 && ' ⚠️'}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2 ml-4">
                          <button 
                              className="btn btn-sm btn-success"
                              onClick={() => handleApproval(visit.visit_id, 'Approved')}
                              disabled={actionLoading}
                          ><ThumbsUp className="w-4 h-4" /> Approve</button>
                          <button 
                              className="btn btn-sm btn-danger"
                              onClick={() => handleApproval(visit.visit_id, 'Rejected')}
                              disabled={actionLoading}
                          ><ThumbsDown className="w-4 h-4" /> Reject</button>
                      </div>
                    </div>
                    <div className="mt-4 border-t border-white/10 pt-4">
                      {/* Warning for delayed submissions */}
                      {daysBetween !== null && daysBetween > 5 && (
                        <div className="mt-3 p-3 bg-red-900/20 border border-red-500/30 rounded-lg">
                          <p className="text-red-300 text-sm font-medium">
                            ⚠️ Delayed Submission: MOM was submitted {daysBetween} days after visit completion. 
                            Please review for timeliness.
                          </p>
                        </div>
                      )}
                      
                      {/* Warning for high number of open points */}
                      {visit.mom_open_points_count !== undefined && visit.mom_open_points_count > 5 && (
                        <div className="mt-3 p-3 bg-yellow-900/20 border border-yellow-500/30 rounded-lg">
                          <p className="text-yellow-300 text-sm font-medium">
                            📋 High Priority: This MOM contains {visit.mom_open_points_count} open action points. 
                            Please ensure proper follow-up is planned.
                          </p>
                        </div>
                      )}
                      
                      {/* Info for MOMs with no open points */}
                      {visit.mom_open_points_count === 0 && visit.mom_total_points_count! > 0 && (
                        <div className="mt-3 p-3 bg-green-900/20 border border-green-500/30 rounded-lg">
                          <p className="text-green-300 text-sm font-medium">
                            ✅ All Action Items Completed: All {visit.mom_total_points_count} points have been resolved.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400">
              <Clock className="w-12 h-12 mx-auto mb-3 text-gray-500" />
              <p className="text-lg font-medium">
                {submissionFilter === 'all' 
                  ? 'No pending MOM submissions' 
                  : submissionFilter === 'first'
                  ? 'No first-time submissions pending'
                  : 'No resubmissions pending'
                }
              </p>
              <p className="text-sm">
                {submissionFilter === 'all' 
                  ? 'All MOMs have been reviewed' 
                  : `Switch to "${submissionFilter === 'first' ? 'Resubmissions' : 'First Submissions'}" or "All" to see other pending items`
                }
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Rejection Modal */}
      <RejectMomModal
        isOpen={rejectModalOpen}
        onClose={() => {
          setRejectModalOpen(false);
          setSelectedVisit(null);
        }}
        onReject={handleRejectWithRemarks}
        visitDetails={selectedVisit ? {
          brand_name: selectedVisit.brand_name,
          agent_name: selectedVisit.agent_name,
          visit_id: selectedVisit.visit_id
        } : { brand_name: '', agent_name: '', visit_id: '' }}
        loading={actionLoading}
      />
    </DashboardLayout>
  );
}
