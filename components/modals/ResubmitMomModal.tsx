'use client'

import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, RefreshCw, AlertTriangle, FileText, Upload, Download, Plus, Trash2, Edit3 } from 'lucide-react';

// Define Id type locally to avoid import issues
type Id<T> = string

interface OpenPoint {
  topic: string;
  description: string;
  next_steps: string;
  ownership: 'Brand' | 'Me';
  owner_name: string;
  status: 'Open' | 'Closed';
  timeline: string; // This will be a date string for deadline
}

interface ResubmitMomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onResubmit: (formData: { 
    open_points: OpenPoint[];
    resubmission_notes?: string;
  }) => void;
  visitDetails: {
    visit_id: string;
    brand_name: string;
    agent_name: string;
    rejection_remarks?: string;
    rejected_by?: string;
    rejected_at?: string;
    resubmission_count?: number;
  };
  previousMomData?: {
    open_points: OpenPoint[];
    meeting_notes?: string;
  };
  loading?: boolean;
}

export default function ResubmitMomModal({ 
  isOpen, 
  onClose, 
  onResubmit, 
  visitDetails,
  previousMomData,
  loading = false
}: ResubmitMomModalProps) {
  const [activeTab, setActiveTab] = useState<'manual' | 'csv' | 'edit' | 'summary'>('manual');
  const [openPoints, setOpenPoints] = useState<OpenPoint[]>([]);
  const [resubmissionNotes, setResubmissionNotes] = useState('');
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvData, setCsvData] = useState<any[]>([]);
  const [editedOpenPoints, setEditedOpenPoints] = useState<OpenPoint[]>([]);

  if (!isOpen) return null;

  // Initialize edited open points when modal opens or previousMomData changes
  React.useEffect(() => {
    console.log('🔄 ResubmitMomModal: previousMomData changed:', previousMomData);
    if (previousMomData?.open_points && previousMomData.open_points.length > 0) {
      console.log('✅ ResubmitMomModal: Setting edited open points:', previousMomData.open_points);
      setEditedOpenPoints([...previousMomData.open_points]);
    } else {
      console.log('⚠️ ResubmitMomModal: No previous open points to load');
      setEditedOpenPoints([]);
    }
  }, [previousMomData]);

  const addOpenPoint = () => {
    const newPoint: OpenPoint = {
      topic: '',
      description: '',
      next_steps: '',
      ownership: 'Me',
      owner_name: visitDetails.agent_name,
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
      updatedPoints[index].owner_name = value === 'Brand' ? visitDetails.brand_name : visitDetails.agent_name;
    }
    
    setOpenPoints(updatedPoints);
  };

  const updateEditedOpenPoint = (index: number, field: keyof OpenPoint, value: string) => {
    const updatedPoints = [...editedOpenPoints];
    updatedPoints[index] = { ...updatedPoints[index], [field]: value };
    
    // Auto-update owner_name based on ownership selection
    if (field === 'ownership') {
      updatedPoints[index].owner_name = value === 'Brand' ? visitDetails.brand_name : visitDetails.agent_name;
    }
    
    setEditedOpenPoints(updatedPoints);
  };

  const addEditedOpenPoint = () => {
    const newPoint: OpenPoint = {
      topic: '',
      description: '',
      next_steps: '',
      ownership: 'Me',
      owner_name: visitDetails.agent_name,
      status: 'Open',
      timeline: ''
    };
    setEditedOpenPoints([...editedOpenPoints, newPoint]);
  };

  const removeEditedOpenPoint = (index: number) => {
    setEditedOpenPoints(editedOpenPoints.filter((_, i) => i !== index));
  };

  const handleCsvUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setCsvFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        const lines = text.split('\n');
        const headers = lines[0].split(',').map(h => h.trim());
        
        const data = lines.slice(1).filter(line => line.trim()).map(line => {
          const values = line.split(',').map(v => v.trim());
          const row: any = {};
          headers.forEach((header, index) => {
            row[header] = values[index] || '';
          });
          return row;
        });
        
        setCsvData(data);
        
        // Convert CSV data to open points
        const points: OpenPoint[] = data.map(row => ({
          topic: row['Topic'] || row['S. No'] || '',
          description: row['Description'] || row['Details'] || '',
          next_steps: row['Next Steps'] || row['Action Items'] || '',
          ownership: (row['Assigned To']?.toLowerCase().includes('brand') ? 'Brand' : 'Me') as 'Brand' | 'Me',
          owner_name: row['Assigned To']?.toLowerCase().includes('brand') ? visitDetails.brand_name : visitDetails.agent_name,
          status: (row['Status'] === 'Closed' ? 'Closed' : 'Open') as 'Open' | 'Closed',
          timeline: row['Timeline'] || row['Target Date'] || row['Deadline'] || ''
        }));
        
        setOpenPoints(points);
      };
      reader.readAsText(file);
    }
  };

  const downloadSampleCsv = () => {
    const csvContent = `S. No,Topic,Description,Next Steps,Assigned To,Status,Deadline
1,Sample Topic,Sample description of the discussion point,Follow up by next week,${visitDetails.agent_name},Open,2026-02-10
2,Brand Requirements,Discuss brand specific requirements,Brand to provide details by Friday,${visitDetails.brand_name},Open,2026-02-07`;
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mom_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const currentOpenPoints = activeTab === 'edit' ? editedOpenPoints : openPoints;
    
    if (currentOpenPoints.length === 0) {
      alert('❌ No Open Points Found!\n\nPlease add at least one open point to resubmit the MOM.\n\nA MOM without open points cannot be resubmitted as it would not have any action items to track.');
      return;
    }

    // For edit mode, use the edited points as-is
    // For new submissions, mark the first entry as rejected if this is the first resubmission
    let updatedOpenPoints = [...currentOpenPoints];
    if (activeTab !== 'edit' && (visitDetails.resubmission_count || 0) === 0 && updatedOpenPoints.length > 0) {
      updatedOpenPoints[0] = {
        ...updatedOpenPoints[0],
        status: 'Closed', // Mark as closed/rejected
        timeline: `Rejected: ${visitDetails.rejection_remarks || 'Previous submission rejected'}`
      };
    }

    onResubmit({ 
      open_points: updatedOpenPoints,
      resubmission_notes: resubmissionNotes.trim() || undefined
    });
  };

  const handleClose = () => {
    if (!loading) {
      setOpenPoints([]);
      setEditedOpenPoints([]);
      setResubmissionNotes('');
      setCsvFile(null);
      setCsvData([]);
      setActiveTab('manual');
      onClose();
    }
  };

  return createPortal(
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-orange-50 to-red-50 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
              <RefreshCw className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Resubmit Minutes of Meeting</h2>
              <p className="text-sm text-gray-600">
                {visitDetails.brand_name} • {visitDetails.agent_name}
              </p>
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

        {/* Rejection Feedback */}
        {visitDetails.rejection_remarks && (
          <div className="p-4 bg-red-50 border-l-4 border-red-400 mx-6 mt-4 rounded-r-lg flex-shrink-0">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h4 className="text-sm font-medium text-red-800">Previous Submission Rejected</h4>
                <p className="text-sm text-red-700 mt-1">{visitDetails.rejection_remarks}</p>
                <div className="text-xs text-red-600 mt-2">
                  Rejected by: {visitDetails.rejected_by} • {visitDetails.rejected_at ? new Date(visitDetails.rejected_at).toLocaleDateString() : 'Unknown date'}
                  {visitDetails.resubmission_count && visitDetails.resubmission_count > 0 && (
                    <span className="ml-2">• Resubmission #{visitDetails.resubmission_count + 1}</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-b border-gray-200 px-6 flex-shrink-0">
          <button
            onClick={() => setActiveTab('manual')}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'manual'
                ? 'border-orange-500 text-orange-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <FileText className="w-4 h-4 inline mr-2" />
            Manual Entry
          </button>
          <button
            onClick={() => setActiveTab('csv')}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'csv'
                ? 'border-orange-500 text-orange-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Upload className="w-4 h-4 inline mr-2" />
            CSV Upload
          </button>
          {previousMomData?.open_points && previousMomData.open_points.length > 0 && (
            <button
              onClick={() => setActiveTab('edit')}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'edit'
                  ? 'border-orange-500 text-orange-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Edit3 className="w-4 h-4 inline mr-2" />
              Edit Previous
            </button>
          )}
          <button
            onClick={() => setActiveTab('summary')}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'summary'
                ? 'border-orange-500 text-orange-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <FileText className="w-4 h-4 inline mr-2" />
            Meeting Summary
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto p-6">
            {activeTab === 'manual' && (
              <div className="space-y-6">
                {/* Resubmission Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Resubmission Notes (Optional)
                  </label>
                  <textarea
                    value={resubmissionNotes}
                    onChange={(e) => setResubmissionNotes(e.target.value)}
                    placeholder="Explain what changes you've made based on the feedback..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    rows={3}
                  />
                </div>

                {/* Action Items */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium text-gray-900">Action Items</h3>
                  </div>

                  {openPoints.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                      <p>No action items added yet</p>
                      <p className="text-sm">Click "Add Item" to get started</p>
                      <div className="mt-4">
                        <button
                          type="button"
                          onClick={addOpenPoint}
                          className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors flex items-center gap-2 mx-auto"
                        >
                          <Plus className="w-4 h-4" />
                          Add First Item
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
                      {openPoints.map((point, index) => (
                        <div key={index} className={`p-4 border rounded-lg ${
                          index === 0 && (visitDetails.resubmission_count || 0) === 0 
                            ? 'border-red-300 bg-red-50' 
                            : 'border-gray-200'
                        }`}>
                          {index === 0 && (visitDetails.resubmission_count || 0) === 0 && (
                            <div className="mb-3 p-2 bg-red-100 border border-red-200 rounded text-sm text-red-700">
                              <AlertTriangle className="w-4 h-4 inline mr-1" />
                              This item will be marked as rejected/closed based on previous feedback
                            </div>
                          )}
                          
                          <div className="flex items-start justify-between mb-3">
                            <h4 className="font-medium text-gray-900">Action Item #{index + 1}</h4>
                            <button
                              type="button"
                              onClick={() => removeOpenPoint(index)}
                              className="text-red-500 hover:text-red-700 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Topic *
                              </label>
                              <input
                                type="text"
                                value={point.topic}
                                onChange={(e) => updateOpenPoint(index, 'topic', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                placeholder="Discussion topic"
                                required
                              />
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Ownership *
                              </label>
                              <select
                                value={point.ownership}
                                onChange={(e) => updateOpenPoint(index, 'ownership', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                required
                              >
                                <option value="Me">{visitDetails.agent_name}</option>
                                <option value="Brand">{visitDetails.brand_name}</option>
                              </select>
                            </div>

                            <div className="md:col-span-2">
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Description *
                              </label>
                              <textarea
                                value={point.description}
                                onChange={(e) => updateOpenPoint(index, 'description', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                placeholder="Detailed description of the discussion point"
                                rows={2}
                                required
                              />
                            </div>

                            <div className="md:col-span-2">
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Next Steps
                              </label>
                              <textarea
                                value={point.next_steps}
                                onChange={(e) => updateOpenPoint(index, 'next_steps', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                placeholder="Outline the planned next steps and follow-up actions..."
                                rows={2}
                              />
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Status
                              </label>
                              <select
                                value={point.status}
                                onChange={(e) => updateOpenPoint(index, 'status', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                disabled={index === 0 && (visitDetails.resubmission_count || 0) === 0}
                              >
                                <option value="Open">Open</option>
                                <option value="Closed">Closed</option>
                              </select>
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Timeline (Deadline) *
                              </label>
                              <input
                                type="date"
                                value={point.timeline}
                                onChange={(e) => updateOpenPoint(index, 'timeline', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                disabled={index === 0 && (visitDetails.resubmission_count || 0) === 0}
                                required
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                      
                      {/* Add Action Item Button - Now at the bottom */}
                      <div className="flex justify-center pt-4">
                        <button
                          type="button"
                          onClick={addOpenPoint}
                          className="flex items-center gap-2 px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm font-medium transition-colors shadow-lg"
                        >
                          <Plus className="w-4 h-4" />
                          Add Another Item
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'csv' && (
              <div className="space-y-6">
                <div className="text-center">
                  <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Upload MOM CSV File</h3>
                  <p className="text-gray-600 mb-4">
                    Upload a CSV file with meeting topics and their status. Supports Excel CSV exports and custom formats.
                  </p>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">Expected CSV Format</h4>
                  <div className="text-sm text-gray-600 space-y-1">
                    <p><strong>Required Columns:</strong></p>
                    <ul className="list-disc list-inside ml-4 space-y-1">
                      <li><strong>S. No</strong> - Serial number</li>
                      <li><strong>Topic</strong> - Discussion subject</li>
                      <li><strong>Description</strong> - Details</li>
                    </ul>
                    <p className="mt-2"><strong>Optional Columns:</strong></p>
                    <ul className="list-disc list-inside ml-4 space-y-1">
                      <li><strong>Next Steps</strong> - Action items and follow-up tasks</li>
                      <li><strong>Status</strong> - Open/Closed</li>
                      <li><strong>Assigned To</strong> - Responsible person</li>
                      <li><strong>Deadline</strong> - Target completion date (YYYY-MM-DD)</li>
                    </ul>
                  </div>
                </div>

                <div className="flex items-center justify-center gap-4">
                  <button
                    type="button"
                    onClick={downloadSampleCsv}
                    className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Download Sample
                  </button>

                  <label className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors cursor-pointer flex items-center gap-2">
                    <Upload className="w-4 h-4" />
                    Choose CSV File
                    <input
                      type="file"
                      accept=".csv"
                      onChange={handleCsvUpload}
                      className="hidden"
                    />
                  </label>
                </div>

                {csvFile && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <p className="text-green-800">
                      <strong>File uploaded:</strong> {csvFile.name}
                    </p>
                    <p className="text-green-700 text-sm">
                      {csvData.length} items imported successfully
                    </p>
                  </div>
                )}

                <div className="text-xs text-gray-500">
                  💡 <strong>Tip:</strong> Export your Excel file as CSV and upload it here for best results.
                </div>
              </div>
            )}

            {activeTab === 'edit' && (
              <div className="space-y-6">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Edit3 className="w-5 h-5 text-blue-600" />
                    <h3 className="font-medium text-blue-900">Edit Previous MOM</h3>
                  </div>
                  <p className="text-sm text-blue-800">
                    You can edit the previous MOM submission and resubmit with your changes. 
                    All existing action items are loaded and can be modified.
                  </p>
                </div>

                {/* Resubmission Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Resubmission Notes (Optional)
                  </label>
                  <textarea
                    value={resubmissionNotes}
                    onChange={(e) => setResubmissionNotes(e.target.value)}
                    placeholder="Explain what changes you've made based on the feedback..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    rows={3}
                  />
                </div>

                {/* Previous Action Items */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium text-gray-900">Previous Action Items</h3>
                    <button
                      type="button"
                      onClick={addEditedOpenPoint}
                      className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      Add New Item
                    </button>
                  </div>

                  {editedOpenPoints.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                      <p>No previous action items found</p>
                      <p className="text-sm">The previous MOM may not have had any action items</p>
                    </div>
                  ) : (
                    <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
                      {editedOpenPoints.map((point, index) => (
                        <div key={index} className="p-4 border border-gray-200 rounded-lg bg-gray-50">
                          <div className="flex items-start justify-between mb-3">
                            <h4 className="font-medium text-gray-900">Action Item #{index + 1}</h4>
                            <button
                              type="button"
                              onClick={() => removeEditedOpenPoint(index)}
                              className="text-red-500 hover:text-red-700 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Topic *
                              </label>
                              <input
                                type="text"
                                value={point.topic}
                                onChange={(e) => updateEditedOpenPoint(index, 'topic', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                placeholder="Discussion topic"
                                required
                              />
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Ownership *
                              </label>
                              <select
                                value={point.ownership}
                                onChange={(e) => updateEditedOpenPoint(index, 'ownership', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                required
                              >
                                <option value="Me">{visitDetails.agent_name}</option>
                                <option value="Brand">{visitDetails.brand_name}</option>
                              </select>
                            </div>

                            <div className="md:col-span-2">
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Description *
                              </label>
                              <textarea
                                value={point.description}
                                onChange={(e) => updateEditedOpenPoint(index, 'description', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                placeholder="Detailed description of the discussion point"
                                rows={2}
                                required
                              />
                            </div>

                            <div className="md:col-span-2">
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Next Steps
                              </label>
                              <textarea
                                value={point.next_steps}
                                onChange={(e) => updateEditedOpenPoint(index, 'next_steps', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                placeholder="Outline the planned next steps and follow-up actions..."
                                rows={2}
                              />
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Status
                              </label>
                              <select
                                value={point.status}
                                onChange={(e) => updateEditedOpenPoint(index, 'status', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                              >
                                <option value="Open">Open</option>
                                <option value="Closed">Closed</option>
                              </select>
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Timeline (Deadline) *
                              </label>
                              <input
                                type="date"
                                value={point.timeline}
                                onChange={(e) => updateEditedOpenPoint(index, 'timeline', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                required
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'summary' && (
              <div className="space-y-6">
                <div className="text-center">
                  <FileText className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Meeting Summary</h3>
                  <p className="text-gray-600">
                    Review the action items that will be resubmitted
                  </p>
                </div>

                {(() => {
                  const currentPoints = openPoints;
                  return currentPoints.length > 0 ? (
                    <div className="space-y-4">
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <h4 className="font-medium text-blue-900 mb-2">Resubmission Summary</h4>
                        <div className="text-sm text-blue-800">
                          <p><strong>Total Action Items:</strong> {currentPoints.length}</p>
                          <p><strong>Open Items:</strong> {currentPoints.filter(p => p.status === 'Open').length}</p>
                          <p><strong>Closed Items:</strong> {currentPoints.filter(p => p.status === 'Closed').length}</p>
                          {(visitDetails.resubmission_count || 0) === 0 && (
                            <p className="text-red-700 mt-2">
                              <AlertTriangle className="w-4 h-4 inline mr-1" />
                              First item will be marked as rejected based on previous feedback
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
                        {currentPoints.map((point, index) => (
                          <div key={index} className={`border rounded-lg p-4 ${
                            index === 0 && (visitDetails.resubmission_count || 0) === 0 
                              ? 'border-red-300 bg-red-50' 
                              : 'border-gray-200'
                          }`}>
                            <div className="flex items-start justify-between mb-2">
                              <h5 className="font-medium text-gray-900">
                                {index + 1}. {point.topic}
                              </h5>
                              <span className={`px-2 py-1 text-xs rounded-full ${
                                point.status === 'Open' 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-gray-100 text-gray-800'
                              }`}>
                                {point.status}
                              </span>
                            </div>
                            <p className="text-gray-600 text-sm mb-2">{point.description}</p>
                            <div className="flex items-center justify-between text-xs text-gray-500">
                              <span>Assigned to: {point.owner_name}</span>
                              {point.timeline && <span>Timeline: {point.timeline}</span>}
                            </div>
                            {index === 0 && (visitDetails.resubmission_count || 0) === 0 && (
                              <div className="mt-2 p-2 bg-red-100 border border-red-200 rounded text-xs text-red-700">
                                This item will be automatically marked as rejected/closed
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <p>No action items to display</p>
                      <p className="text-sm">Add items in the Manual Entry, CSV Upload, or Edit Previous tabs</p>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-gray-200 p-6 bg-gray-50 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                {(() => {
                  const currentPoints = activeTab === 'edit' ? editedOpenPoints : openPoints;
                  return `${currentPoints.length} action item${currentPoints.length !== 1 ? 's' : ''} ready for resubmission`;
                })()}
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={loading}
                  className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || (activeTab === 'edit' ? editedOpenPoints.length === 0 : openPoints.length === 0)}
                  className="px-6 py-2 bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-lg hover:from-orange-700 hover:to-red-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Resubmitting...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4" />
                      Resubmit MOM
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}