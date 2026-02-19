'use client';

import React, { useState, useEffect } from 'react';
import { formatDateTimeSafely } from '@/utils/dateUtils';
import { convexAPI } from '../lib/convex-api';
import { useAuth } from '../contexts/AuthContext';

interface CallAttempt {
  attempt_number: number;
  timestamp: string;
  notes?: string;
}

interface FollowUpRecord {
  rid: string;
  follow_up_number: number;
  status: 'PENDING' | 'DONE';
  call_attempts: CallAttempt[];
  is_completed: boolean;
  completed_at?: string;
  next_follow_up_date?: string;
  created_at: string;
  updated_at: string;
}

interface FollowUpStatus {
  is_active: boolean;
  reason: string;
  follow_up?: FollowUpRecord;
  pending_follow_ups: FollowUpRecord[];
  done_follow_ups: FollowUpRecord[];
}

interface FollowUpPanelProps {
  rid: string;
  churnReason?: string;
  onClose?: () => void;
}

export const FollowUpPanel: React.FC<FollowUpPanelProps> = ({
  rid,
  churnReason,
  onClose
}) => {
  const { userProfile } = useAuth();
  const [followUpStatus, setFollowUpStatus] = useState<FollowUpStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [addingAttempt, setAddingAttempt] = useState(false);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  const fetchFollowUpStatus = async () => {
    try {
      setLoading(true);
      
      // Only fetch if user is authenticated
      if (!userProfile?.email) {
        setError('User not authenticated');
        return;
      }
      
      // Get follow-up status from Convex with user email for role-based filtering
      const result = await convexAPI.getFollowUpStatus(rid, churnReason, userProfile.email);
      
      if (result.success && result.data) {
        // Transform Convex data to match the expected format
        const convexData = result.data;
        
        const transformedStatus: FollowUpStatus = {
          is_active: convexData.is_active,
          reason: convexData.is_active 
            ? `Follow-up activated for reason: ${churnReason || 'Unknown'}` 
            : `Follow-up not active for reason: ${churnReason || 'Unknown'}`,
          pending_follow_ups: convexData.is_active ? [{
            rid: convexData.rid,
            follow_up_number: convexData.current_call || 1,
            status: 'PENDING' as const,
            call_attempts: (convexData.call_attempts || []).map((attempt: any, index: number) => ({
              attempt_number: index + 1,
              timestamp: attempt.timestamp || new Date().toISOString(),
              notes: attempt.notes
            })),
            is_completed: false,
            created_at: convexData.created_at || new Date().toISOString(),
            updated_at: convexData.updated_at || new Date().toISOString()
          }] : [],
          done_follow_ups: []
        };
        
        setFollowUpStatus(transformedStatus);
        setError(null);
      } else {
        setError('Failed to fetch follow-up status');
      }
    } catch (err: any) {
      if (err.message && err.message.includes('Access denied')) {
        setError('You do not have permission to view this follow-up');
      } else {
        setError('Error fetching follow-up status');
      }
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const addFollowUpAttempt = async () => {
    try {
      setAddingAttempt(true);
      
      // Only proceed if user is authenticated
      if (!userProfile?.email) {
        setError('User not authenticated');
        return;
      }
      
      // Record call attempt using Convex with user email for role-based filtering
      const result = await convexAPI.recordCallAttempt({
        rid, 
        call_response: 'No Response', // Default call response
        notes: notes.trim() || undefined,
        churn_reason: churnReason || '',
        email: userProfile.email
      });
      
      if (result.success) {
        setNotes('');
        await fetchFollowUpStatus(); // Refresh status
      } else {
        setError(result.message || 'Failed to add follow-up attempt');
      }
    } catch (err: any) {
      if (err.message && err.message.includes('Access denied')) {
        setError('You do not have permission to record call attempts for this RID');
      } else {
        setError('Error adding follow-up attempt');
      }
      console.error('Error:', err);
    } finally {
      setAddingAttempt(false);
    }
  };

  useEffect(() => {
    fetchFollowUpStatus();
  }, [rid, churnReason]);

  const formatDateTime = (dateString: string) => {
    return formatDateTimeSafely(dateString, 'Invalid date');
  };

  const getNextAttemptTime = (lastAttemptTime: string) => {
    const lastAttempt = new Date(lastAttemptTime);
    const nextAllowed = new Date(lastAttempt.getTime() + 2 * 60 * 60 * 1000); // +2 hours
    return nextAllowed;
  };

  const canAddSecondAttempt = (attempts: CallAttempt[]) => {
    if (attempts.length !== 1) return false;
    const nextAllowed = getNextAttemptTime(attempts[0].timestamp);
    return new Date() >= nextAllowed;
  };

  const getTimeUntilNextAttempt = (attempts: CallAttempt[]) => {
    if (attempts.length !== 1) return null;
    const nextAllowed = getNextAttemptTime(attempts[0].timestamp);
    const now = new Date();
    if (now >= nextAllowed) return null;
    
    const diff = nextAllowed.getTime() - now.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  if (loading) {
    return (
      <div className="p-6 bg-white rounded-lg shadow">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-300 rounded w-3/4 mb-4"></div>
          <div className="h-4 bg-gray-300 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  if (!followUpStatus) {
    return (
      <div className="p-6 bg-white rounded-lg shadow">
        <div className="text-red-600">Failed to load follow-up status</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="p-4 bg-white rounded-lg shadow">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold">Follow-Up System</h3>
          {onClose && (
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          )}
        </div>
        <div className="mt-2 text-sm text-gray-600">
          RID: {rid} | Churn Reason: {churnReason || 'Not specified'}
        </div>
      </div>

      {/* Activation Status */}
      <div className="p-4 bg-white rounded-lg shadow">
        <div className="flex items-center space-x-2">
          <div className={`w-3 h-3 rounded-full ${followUpStatus.is_active ? 'bg-green-500' : 'bg-red-500'}`}></div>
          <span className="font-medium">
            {followUpStatus.is_active ? 'Follow-Up Active' : 'Follow-Up Inactive'}
          </span>
        </div>
        <div className="mt-2 text-sm text-gray-600">
          {followUpStatus.reason}
        </div>
      </div>

      {/* Follow-Up Content */}
      {followUpStatus.is_active ? (
        <>
          {/* Pending Follow-Ups */}
          {followUpStatus.pending_follow_ups.length > 0 && (
            <div className="p-4 bg-white rounded-lg shadow">
              <h4 className="font-semibold text-green-700 mb-3">📋 Follow-Up Pending</h4>
              {followUpStatus.pending_follow_ups.map((followUp, index) => (
                <div key={index} className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Follow-Up #{followUp.follow_up_number}</span>
                    <span className="text-sm text-gray-500">
                      Created: {formatDateTime(followUp.created_at)}
                    </span>
                  </div>
                  
                  {/* Call Attempts */}
                  <div className="space-y-2">
                    {followUp.call_attempts.map((attempt, attemptIndex) => (
                      <div key={attemptIndex} className="bg-gray-50 p-3 rounded">
                        <div className="flex justify-between items-center">
                          <span className="font-medium">Attempt #{attempt.attempt_number}</span>
                          <span className="text-sm text-gray-500">
                            {formatDateTime(attempt.timestamp)}
                          </span>
                        </div>
                        {attempt.notes && (
                          <div className="mt-1 text-sm text-gray-600">
                            Notes: {attempt.notes}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Add Attempt Section */}
                  {followUp.call_attempts.length < 2 && (
                    <div className="border-t pt-3">
                      <div className="space-y-3">
                        <textarea
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          placeholder="Add notes for this follow-up attempt (optional)"
                          className="w-full p-2 border rounded-md resize-none"
                          rows={2}
                        />
                        
                        {followUp.call_attempts.length === 0 ? (
                          <button
                            onClick={addFollowUpAttempt}
                            disabled={addingAttempt}
                            className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                          >
                            {addingAttempt ? 'Adding...' : 'Add First Attempt'}
                          </button>
                        ) : followUp.call_attempts.length === 1 ? (
                          canAddSecondAttempt(followUp.call_attempts) ? (
                            <button
                              onClick={addFollowUpAttempt}
                              disabled={addingAttempt}
                              className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                            >
                              {addingAttempt ? 'Adding...' : 'Add Second Attempt'}
                            </button>
                          ) : (
                            <div className="text-center">
                              <div className="text-sm text-orange-600 font-medium">
                                ⏱️ Must wait 2 hours between attempts
                              </div>
                              <div className="text-xs text-gray-500">
                                Time remaining: {getTimeUntilNextAttempt(followUp.call_attempts)}
                              </div>
                            </div>
                          )
                        ) : null}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Done Follow-Ups */}
          {followUpStatus.done_follow_ups.length > 0 && (
            <div className="p-4 bg-white rounded-lg shadow">
              <h4 className="font-semibold text-blue-700 mb-3">✅ Follow-Up Done</h4>
              {followUpStatus.done_follow_ups.map((followUp, index) => (
                <div key={index} className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Follow-Up #{followUp.follow_up_number}</span>
                    <span className="text-sm text-gray-500">
                      Completed: {followUp.completed_at ? formatDateTime(followUp.completed_at) : 'N/A'}
                    </span>
                  </div>
                  
                  <div className="bg-blue-50 p-3 rounded">
                    <div className="text-sm">
                      <div className="font-medium text-blue-800">48-Hour Cooldown Active</div>
                      {followUp.next_follow_up_date && (
                        <div className="text-blue-600">
                          Next cycle starts: {formatDateTime(followUp.next_follow_up_date)}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Completed Attempts */}
                  <div className="space-y-2">
                    {followUp.call_attempts.map((attempt, attemptIndex) => (
                      <div key={attemptIndex} className="bg-gray-50 p-3 rounded opacity-75">
                        <div className="flex justify-between items-center">
                          <span className="font-medium">Attempt #{attempt.attempt_number}</span>
                          <span className="text-sm text-gray-500">
                            {formatDateTime(attempt.timestamp)}
                          </span>
                        </div>
                        {attempt.notes && (
                          <div className="mt-1 text-sm text-gray-600">
                            Notes: {attempt.notes}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* No Follow-Ups Yet */}
          {followUpStatus.pending_follow_ups.length === 0 && followUpStatus.done_follow_ups.length === 0 && (
            <div className="p-4 bg-white rounded-lg shadow">
              <div className="text-center text-gray-500">
                <div className="text-lg mb-2">📞</div>
                <div>No follow-ups yet</div>
                <div className="text-sm">Click "Add First Attempt" to start</div>
              </div>
              
              <div className="mt-4 space-y-3">
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add notes for this follow-up attempt (optional)"
                  className="w-full p-2 border rounded-md resize-none"
                  rows={2}
                />
                <button
                  onClick={addFollowUpAttempt}
                  disabled={addingAttempt}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {addingAttempt ? 'Adding...' : 'Add First Attempt'}
                </button>
              </div>
            </div>
          )}
        </>
      ) : (
        /* Inactive State */
        <div className="p-4 bg-white rounded-lg shadow">
          <div className="text-center text-gray-500">
            <div className="text-lg mb-2">🚫</div>
            <div className="font-medium">Follow-Up Disabled</div>
            <div className="text-sm mt-2">
              Follow-up is only active when churn reason is:
            </div>
            <ul className="text-sm mt-2 space-y-1">
              <li>• Blank/Empty</li>
              <li>• "I don't know"</li>
              <li>• "KAM needs to respond"</li>
            </ul>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="text-red-600 text-sm">
            ⚠️ {error}
          </div>
        </div>
      )}
    </div>
  );
};