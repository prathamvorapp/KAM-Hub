'use client'

import { useState } from 'react';
import { X, Calendar, Clock } from 'lucide-react';

interface RescheduleVisitModalProps {
  isOpen: boolean;
  onClose: () => void;
  onReschedule: (newDate: string, reason: string) => void;
  visit: {
    visit_id: string;
    brand_name: string;
    scheduled_date: string;
    agent_name: string;
  };
  userRole: string;
}

export default function RescheduleVisitModal({ 
  isOpen, 
  onClose, 
  onReschedule, 
  visit, 
  userRole 
}: RescheduleVisitModalProps) {
  const [newDate, setNewDate] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newDate) {
      alert('Please select a new date.');
      return;
    }
    
    if (!reason.trim()) {
      alert('Please provide a reason for rescheduling.');
      return;
    }

    setLoading(true);
    try {
      await onReschedule(newDate, reason.trim());
      setNewDate('');
      setReason('');
      onClose();
    } catch (error) {
      console.error('Error rescheduling visit:', error);
      alert('Failed to reschedule visit. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-600" />
            Reschedule Visit
          </h2>
          <button 
            onClick={onClose} 
            className="p-1 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600"
            disabled={loading}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Visit Details */}
        <div className="bg-gray-50 rounded-lg p-4 mb-4">
          <h3 className="font-semibold text-gray-800 mb-2">Visit Details</h3>
          <div className="space-y-1 text-sm text-gray-600">
            <p><span className="font-medium">Brand:</span> {visit.brand_name}</p>
            <p><span className="font-medium">Agent:</span> {visit.agent_name}</p>
            <p><span className="font-medium">Current Date:</span> {formatDate(visit.scheduled_date)}</p>
            <p><span className="font-medium">Visit ID:</span> {visit.visit_id}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            {/* New Date */}
            <div>
              <label htmlFor="newDate" className="block text-sm font-medium text-gray-700 mb-1">
                New Visit Date *
              </label>
              <input
                id="newDate"
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-800 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                min={new Date().toISOString().split('T')[0]} // Today's date
                disabled={loading}
                required
              />
            </div>

            {/* Reason */}
            <div>
              <label htmlFor="reason" className="block text-sm font-medium text-gray-700 mb-1">
                Reason for Rescheduling *
              </label>
              <textarea
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-800 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 resize-none"
                rows={3}
                placeholder="Please provide a reason for rescheduling this visit..."
                disabled={loading}
                required
                maxLength={500}
              />
              <div className="text-xs text-gray-500 mt-1">
                {reason.length}/500 characters
              </div>
            </div>

            {/* Permission Notice */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <Clock className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium">Reschedule Permission</p>
                  <p>As a {userRole}, you can reschedule visits {userRole === 'Team Lead' ? 'within your team' : 'across the organization'}.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading}
            >
              {loading ? 'Rescheduling...' : 'Reschedule Visit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}