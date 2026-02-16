'use client'

import { useState } from 'react';
import { X } from 'lucide-react';

interface ScheduleVisitModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSchedule: (visitDate: string) => void;
  brandName: string;
}

export default function ScheduleVisitModal({ isOpen, onClose, onSchedule, brandName }: ScheduleVisitModalProps) {
  const [visitDate, setVisitDate] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!visitDate) {
      alert('Please select a date.');
      return;
    }
    onSchedule(visitDate);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center modal-overlay">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md border border-gray-200 modal-content">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-secondary-800">Schedule Visit for {brandName}</h2>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-100 text-secondary-400 hover:text-secondary-600">
            <X className="w-6 h-6" />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="visitDate" className="block text-sm font-medium text-secondary-700 mb-1">
                Select Visit Date
              </label>
              <input
                id="visitDate"
                type="date"
                value={visitDate}
                onChange={(e) => setVisitDate(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-secondary-800 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-200"
                min={new Date().toISOString().split('T')[0]} // Today's date
              />
            </div>
          </div>
          <div className="mt-6 flex justify-end space-x-4">
            <button type="button" onClick={onClose} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Schedule Visit
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
