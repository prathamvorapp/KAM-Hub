'use client'

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Plus, Trash2, FileText } from 'lucide-react';

// Define Id type locally to avoid import issues
type Id<T> = string

interface OpenPoint {
  topic: string;
  description: string;
  next_steps: string;
  ownership: 'Brand' | 'Me';
  owner_name: string;
  status: 'Open' | 'Closed';
  timeline: string;
}

interface SubmitMomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (formData: { 
    open_points: OpenPoint[];
  }) => void;
  visitId: Id<"visits">;
  brandName?: string;
  agentName?: string;
}

export default function SubmitMomModal({ 
  isOpen, 
  onClose, 
  onSubmit, 
  visitId, 
  brandName = '',
  agentName = ''
}: SubmitMomModalProps) {
  const [openPoints, setOpenPoints] = useState<OpenPoint[]>([]);

  if (!isOpen) return null;

  const addOpenPoint = () => {
    const newPoint: OpenPoint = {
      topic: '',
      description: '',
      next_steps: '',
      ownership: 'Me',
      owner_name: agentName,
      status: 'Open',
      timeline: ''
    };
    setOpenPoints([...openPoints, newPoint]);
  };

  const removeOpenPoint = (index: number) => {
    setOpenPoints(openPoints.filter((_, i) => i !== index));
  };

  const updateOpenPoint = (index: number, field: keyof OpenPoint, value: string) => {
    const updatedPoints = [...openPoints];
    updatedPoints[index] = { ...updatedPoints[index], [field]: value };
    
    // Auto-update owner_name based on ownership selection
    if (field === 'ownership') {
      updatedPoints[index].owner_name = value === 'Brand' ? brandName : agentName;
    }
    
    setOpenPoints(updatedPoints);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation: Check if there are any open points
    if (openPoints.length === 0) {
      alert('❌ No Open Points Found!\n\nPlease add at least one open point to submit the MOM.\n\nA MOM without open points cannot be submitted as it would not have any action items to track.');
      return;
    }
    
    onSubmit({ 
      open_points: openPoints
    });
  };

  const modalContent = (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 modal-overlay" 
      style={{ 
        zIndex: 99999,
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      <div 
        className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden modal-content" 
        style={{ 
          zIndex: 100000,
          maxHeight: '90vh',
          maxWidth: '90vw'
        }}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Submit Minutes of Meeting</h2>
                <p className="text-blue-100 text-sm">
                  {brandName && `Brand: ${brandName}`} {agentName && `• Agent: ${agentName}`}
                </p>
              </div>
            </div>
            <button 
              onClick={onClose} 
              className="w-8 h-8 bg-white/20 hover:bg-white/30 rounded-lg flex items-center justify-center transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[calc(90vh-200px)] overflow-y-auto">
          <form onSubmit={handleSubmit}>
            <div className="space-y-6">
              {/* Open Points Section */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Action Items & Open Points</h3>
                    <p className="text-sm text-gray-600">Add discussion points that require follow-up</p>
                  </div>
                </div>

                {openPoints.length === 0 ? (
                  <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
                    <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                      <FileText className="w-6 h-6 text-gray-400" />
                    </div>
                    <h3 className="text-sm font-medium text-gray-900 mb-2">No action items yet</h3>
                    <p className="text-sm text-gray-500 mb-4">
                      Add discussion points that need follow-up
                    </p>
                    <button
                      type="button"
                      onClick={addOpenPoint}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      Add First Action Item
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {openPoints.map((point, index) => (
                      <div key={index} className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                              <span className="text-sm font-medium text-blue-600">#{index + 1}</span>
                            </div>
                            <h4 className="text-lg font-medium text-gray-900">Action Item #{index + 1}</h4>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeOpenPoint(index)}
                            className="w-8 h-8 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg flex items-center justify-center transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Topic <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="text"
                              value={point.topic}
                              onChange={(e) => updateOpenPoint(index, 'topic', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                              placeholder="Enter the main topic"
                              required
                            />
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Target Date <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="date"
                              value={point.timeline}
                              onChange={(e) => updateOpenPoint(index, 'timeline', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                              min={new Date().toISOString().split('T')[0]}
                              required
                            />
                          </div>
                          
                          <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Description <span className="text-red-500">*</span>
                            </label>
                            <textarea
                              value={point.description}
                              onChange={(e) => updateOpenPoint(index, 'description', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                              rows={3}
                              placeholder="Provide detailed description"
                              required
                            />
                          </div>
                          
                          <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Next Steps
                            </label>
                            <textarea
                              value={point.next_steps}
                              onChange={(e) => updateOpenPoint(index, 'next_steps', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                              rows={2}
                              placeholder="Outline the planned next steps and follow-up actions..."
                            />
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Responsibility <span className="text-red-500">*</span>
                            </label>
                            <select
                              value={point.ownership}
                              onChange={(e) => updateOpenPoint(index, 'ownership', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                              required
                            >
                              <option value="Me">My Responsibility</option>
                              <option value="Brand">Brand's Responsibility</option>
                            </select>
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Assigned To
                            </label>
                            <input
                              type="text"
                              value={point.owner_name}
                              className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-600"
                              readOnly
                            />
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Status <span className="text-red-500">*</span>
                            </label>
                            <select
                              value={point.status}
                              onChange={(e) => updateOpenPoint(index, 'status', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                              required
                            >
                              <option value="Open">Open</option>
                              <option value="Closed">Closed</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    {/* Add Action Item Button - Now at the bottom */}
                    <div className="flex justify-center pt-4">
                      <button
                        type="button"
                        onClick={addOpenPoint}
                        className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors shadow-lg"
                      >
                        <Plus className="w-4 h-4" />
                        Add Another Action Item
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </form>
        </div>
        
        {/* Footer */}
        <div className="bg-gray-50 border-t border-gray-200 px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600">
              {openPoints.length > 0 && (
                <span>{openPoints.length} action item{openPoints.length !== 1 ? 's' : ''} added</span>
              )}
            </div>
            <div className="flex space-x-3">
              <button 
                type="button" 
                onClick={onClose} 
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                onClick={handleSubmit}
                className="px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 font-medium transition-all transform hover:scale-105 shadow-lg"
              >
                Submit MOM for Approval
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Use React Portal to render modal at document root level
  return typeof window !== 'undefined' 
    ? createPortal(modalContent, document.body)
    : null;
}
