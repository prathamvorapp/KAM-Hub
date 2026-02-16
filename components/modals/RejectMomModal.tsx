'use client'

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, AlertTriangle } from 'lucide-react';

interface RejectMomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onReject: (remarks: string) => void;
  visitDetails: {
    brand_name: string;
    agent_name: string;
    visit_id: string;
  };
  loading?: boolean;
}

export default function RejectMomModal({ 
  isOpen, 
  onClose, 
  onReject, 
  visitDetails,
  loading = false
}: RejectMomModalProps) {
  const [remarks, setRemarks] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!remarks.trim()) {
      setError('Rejection remarks are required');
      return;
    }

    if (remarks.trim().length < 10) {
      setError('Please provide detailed remarks (minimum 10 characters)');
      return;
    }

    onReject(remarks.trim());
  };

  const handleClose = () => {
    if (!loading) {
      setRemarks('');
      setError('');
      onClose();
    }
  };

  return createPortal(
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Reject MOM</h2>
              <p className="text-sm text-gray-500">Provide feedback for improvement</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={loading}
            className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6">
          {/* Visit Details */}
          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
            <div className="text-sm text-gray-600">
              <div><strong>Brand:</strong> {visitDetails.brand_name}</div>
              <div><strong>Agent:</strong> {visitDetails.agent_name}</div>
              <div><strong>Visit ID:</strong> {visitDetails.visit_id}</div>
            </div>
          </div>

          {/* Remarks Input */}
          <div className="mb-4">
            <label htmlFor="remarks" className="block text-sm font-medium text-gray-700 mb-2">
              Rejection Remarks <span className="text-red-500">*</span>
            </label>
            <textarea
              id="remarks"
              value={remarks}
              onChange={(e) => {
                setRemarks(e.target.value);
                setError('');
              }}
              placeholder="Please provide specific feedback on what needs to be improved in the MOM. The agent will see these remarks and can resubmit after making corrections."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 resize-none"
              rows={4}
              disabled={loading}
              required
            />
            <div className="mt-1 text-xs text-gray-500">
              Minimum 10 characters. Be specific about what needs improvement.
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Info Box */}
          <div className="mb-6 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-700">
              <strong>Note:</strong> After rejection, the agent will be notified and can make corrections 
              before resubmitting the MOM for your review.
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !remarks.trim()}
              className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Rejecting...' : 'Reject MOM'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}