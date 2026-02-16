'use client';

import React, { useState, useEffect } from 'react';
import { Bell, Clock, Phone, AlertCircle, X } from 'lucide-react';
import { convexAPI } from '../lib/convex-api';
import { useAuth } from '../contexts/AuthContext';

interface FollowUpReminder {
  rid: string;
  restaurant_name: string;
  kam: string;
  call_number: number;
  reminder_time: string;
  is_overdue: boolean;
  hours_overdue?: number;
  churn_reason: string;
}

interface FollowUpNotificationsProps {
  onReminderClick?: (rid: string) => void;
}

export const FollowUpNotifications: React.FC<FollowUpNotificationsProps> = ({
  onReminderClick
}) => {
  const { user } = useAuth();
  const [reminders, setReminders] = useState<FollowUpReminder[]>([]);
  const [showPanel, setShowPanel] = useState(false);
  const [loading, setLoading] = useState(false);

  const loadReminders = async () => {
    try {
      setLoading(true);
      
      // Only load reminders if user is authenticated
      if (!user?.email) {
        setReminders([]);
        return;
      }
      
      // Get overdue and active follow-ups from Convex with user email for role-based filtering
      const overdueResult = await convexAPI.getOverdueFollowUps(undefined, user.email);
      const activeResult = await convexAPI.getActiveFollowUps(undefined, user.email);
      
      // Combine and format the data
      const overdueReminders = (overdueResult.data || []).map((record: any) => ({
        rid: record.rid,
        restaurant_name: record.restaurant_name || 'Unknown Restaurant',
        kam: record.kam || 'Unknown KAM',
        call_number: record.current_call || 1,
        reminder_time: record.next_reminder_time || new Date().toISOString(),
        is_overdue: true,
        churn_reason: record.churn_reason || 'Unknown'
      }));

      const activeReminders = (activeResult.data || [])
        .filter((record: any) => {
          // Include all active reminders (they are truly active now)
          return true;
        })
        .map((record: any) => ({
          rid: record.rid,
          restaurant_name: record.restaurant_name || 'Unknown Restaurant',
          kam: record.kam || 'Unknown KAM',
          call_number: record.current_call || 1,
          reminder_time: record.next_reminder_time || new Date().toISOString(),
          is_overdue: false,
          churn_reason: record.churn_reason || 'Unknown'
        }));

      // Combine and sort by reminder time
      const allReminders = [...overdueReminders, ...activeReminders]
        .sort((a, b) => {
          // Overdue first, then by reminder time
          if (a.is_overdue && !b.is_overdue) return -1;
          if (!a.is_overdue && b.is_overdue) return 1;
          return new Date(a.reminder_time).getTime() - new Date(b.reminder_time).getTime();
        });

      setReminders(allReminders);
    } catch (error) {
      console.error('Error loading reminders:', error);
      setReminders([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Only load reminders if user is authenticated
    if (user?.email) {
      loadReminders();
      
      // Refresh reminders every 5 minutes
      const interval = setInterval(loadReminders, 5 * 60 * 1000);
      return () => clearInterval(interval);
    } else {
      setReminders([]);
    }
  }, [user?.email]);

  const overdueCount = reminders.filter(r => r.is_overdue).length;
  const totalCount = reminders.length;

  const formatTimeAgo = (reminderTime: string) => {
    const now = new Date();
    const reminder = new Date(reminderTime);
    const diff = now.getTime() - reminder.getTime();
    
    if (diff < 0) {
      // Future reminder
      const absDiff = Math.abs(diff);
      const hours = Math.floor(absDiff / (1000 * 60 * 60));
      const minutes = Math.floor((absDiff % (1000 * 60 * 60)) / (1000 * 60));
      
      if (hours > 0) {
        return `Due in ${hours}h ${minutes}m`;
      } else {
        return `Due in ${minutes}m`;
      }
    } else {
      // Overdue reminder
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      
      if (hours > 0) {
        return `${hours}h ${minutes}m overdue`;
      } else {
        return `${minutes}m overdue`;
      }
    }
  };

  const handleReminderClick = (rid: string) => {
    if (onReminderClick) {
      onReminderClick(rid);
    }
    setShowPanel(false);
  };

  return (
    <div className="relative">
      {/* Notification Bell */}
      <button
        onClick={() => setShowPanel(!showPanel)}
        className={`relative p-2 rounded-full transition-colors ${
          overdueCount > 0 
            ? 'bg-red-100 text-red-600 hover:bg-red-200' 
            : totalCount > 0 
            ? 'bg-orange-100 text-orange-600 hover:bg-orange-200'
            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
        }`}
      >
        <Bell className="w-5 h-5" />
        
        {/* Notification Badge */}
        {totalCount > 0 && (
          <span className={`absolute -top-1 -right-1 min-w-[18px] h-[18px] text-xs font-bold text-white rounded-full flex items-center justify-center ${
            overdueCount > 0 ? 'bg-red-500' : 'bg-orange-500'
          }`}>
            {totalCount > 99 ? '99+' : totalCount}
          </span>
        )}
      </button>

      {/* Notification Panel */}
      {showPanel && (
        <div className="absolute right-0 top-full mt-2 w-96 bg-white rounded-lg shadow-xl border z-50 max-h-96 overflow-hidden">
          {/* Header */}
          <div className="p-4 border-b bg-gray-50">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Follow-Up Reminders</h3>
              <button
                onClick={() => setShowPanel(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            {totalCount > 0 && (
              <p className="text-sm text-gray-600 mt-1">
                {overdueCount > 0 && (
                  <span className="text-red-600 font-medium">
                    {overdueCount} overdue
                  </span>
                )}
                {overdueCount > 0 && totalCount > overdueCount && ', '}
                {totalCount > overdueCount && (
                  <span className="text-orange-600">
                    {totalCount - overdueCount} upcoming
                  </span>
                )}
              </p>
            )}
          </div>

          {/* Reminders List */}
          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                <p className="text-sm text-gray-600 mt-2">Loading reminders...</p>
              </div>
            ) : reminders.length === 0 ? (
              <div className="p-6 text-center">
                <Bell className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-600">No follow-up reminders</p>
                <p className="text-sm text-gray-500">All caught up!</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {reminders.map((reminder, index) => (
                  <div
                    key={index}
                    onClick={() => handleReminderClick(reminder.rid)}
                    className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                      reminder.is_overdue ? 'bg-red-50 border-l-4 border-red-500' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-1">
                          <Phone className={`w-4 h-4 ${reminder.is_overdue ? 'text-red-600' : 'text-orange-600'}`} />
                          <span className="font-medium text-gray-900 truncate">
                            {reminder.restaurant_name}
                          </span>
                        </div>
                        
                        <div className="text-sm text-gray-600 space-y-1">
                          <div>RID: {reminder.rid} • KAM: {reminder.kam}</div>
                          <div>Call #{reminder.call_number} • {reminder.churn_reason}</div>
                        </div>
                        
                        <div className={`text-xs font-medium mt-2 ${
                          reminder.is_overdue ? 'text-red-600' : 'text-orange-600'
                        }`}>
                          {reminder.is_overdue && <AlertCircle className="w-3 h-3 inline mr-1" />}
                          {formatTimeAgo(reminder.reminder_time)}
                        </div>
                      </div>
                      
                      <div className={`ml-2 px-2 py-1 text-xs font-medium rounded-full ${
                        reminder.is_overdue 
                          ? 'bg-red-100 text-red-800' 
                          : 'bg-orange-100 text-orange-800'
                      }`}>
                        {reminder.is_overdue ? 'Overdue' : 'Due'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {reminders.length > 0 && (
            <div className="p-3 border-t bg-gray-50">
              <button
                onClick={loadReminders}
                disabled={loading}
                className="w-full text-sm text-blue-600 hover:text-blue-800 font-medium disabled:opacity-50"
              >
                {loading ? 'Refreshing...' : 'Refresh Reminders'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};