'use client'

import { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Plus, Trash2, Upload, FileText, Download, Filter, Calendar } from 'lucide-react';

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

interface CSVTopic {
  sno: string;
  topic: string;
  description: string;
  status: string;
  assignedTo: string;
  nextSteps: string;
}

interface EnhancedSubmitMomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (formData: { 
    open_points: OpenPoint[];
    csv_topics?: CSVTopic[];
    meeting_summary?: string;
  }) => void;
  visitId: Id<"visits">;
  brandName?: string;
  agentName?: string;
  visitCompletionDate?: string;
}

export default function EnhancedSubmitMomModal({ 
  isOpen, 
  onClose, 
  onSubmit, 
  visitId, 
  brandName = '',
  agentName = '',
  visitCompletionDate
}: EnhancedSubmitMomModalProps) {
  const [openPoints, setOpenPoints] = useState<OpenPoint[]>([]);
  const [csvTopics, setCsvTopics] = useState<CSVTopic[]>([]);
  const [meetingSummary, setMeetingSummary] = useState('');
  const [activeTab, setActiveTab] = useState<'manual' | 'csv' | 'summary'>('manual');
  const [csvStats, setCsvStats] = useState({ total: 0, open: 0, closed: 0 });
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'closed'>('all');
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Helper functions
  const getDefaultTimeline = () => {
    if (!visitCompletionDate) {
      const defaultDate = new Date();
      defaultDate.setDate(defaultDate.getDate() + 10);
      return defaultDate.toISOString().split('T')[0];
    }
    
    const completionDate = new Date(visitCompletionDate);
    completionDate.setDate(completionDate.getDate() + 10);
    return completionDate.toISOString().split('T')[0];
  };

  const addOpenPoint = () => {
    const defaultTimeline = getDefaultTimeline();
    
    const newPoint: OpenPoint = {
      topic: '',
      description: '',
      next_steps: '',
      ownership: 'Me',
      owner_name: agentName,
      status: 'Open',
      timeline: defaultTimeline
    };
    setOpenPoints([...openPoints, newPoint]);
  };

  const removeOpenPoint = (index: number) => {
    setOpenPoints(openPoints.filter((_, i) => i !== index));
  };

  const updateOpenPoint = (index: number, field: keyof OpenPoint, value: string) => {
    const updatedPoints = [...openPoints];
    updatedPoints[index] = { ...updatedPoints[index], [field]: value };
    
    if (field === 'ownership') {
      updatedPoints[index].owner_name = value === 'Brand' ? brandName : agentName;
    }
    
    setOpenPoints(updatedPoints);
  };

  // CSV Upload Functions
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      alert('Please select a CSV file');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      parseCSV(text);
    };
    reader.readAsText(file);
  };

  const parseCSV = (csvText: string) => {
    const parseCSVLine = (line: string): string[] => {
      const result: string[] = [];
      let current = '';
      let inQuotes = false;
      
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        const nextChar = line[i + 1];
        
        if (char === '"') {
          if (inQuotes && nextChar === '"') {
            current += '"';
            i++;
          } else {
            inQuotes = !inQuotes;
          }
        } else if (char === ',' && !inQuotes) {
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current.trim());
      return result;
    };

    const lines = csvText.split('\n').filter(line => line.trim());
    if (lines.length < 2) return;

    const headers = parseCSVLine(lines[0]).map(h => h.toLowerCase().replace(/['"]/g, ''));
    const topics: CSVTopic[] = [];

    const findColumnIndex = (searchTerms: string[]) => {
      for (const term of searchTerms) {
        const index = headers.findIndex(h => h.includes(term.toLowerCase()));
        if (index !== -1) return index;
      }
      return -1;
    };

    const snoIndex = findColumnIndex(['s.', 'serial', 'no', 'number']);
    const topicIndex = findColumnIndex(['topic', 'subject', 'title']);
    const descriptionIndex = findColumnIndex(['description', 'details', 'desc']);
    const statusIndex = findColumnIndex(['status', 'state']);
    const assignedIndex = findColumnIndex(['assigned', 'responded', 'owner', 'responsible']);
    const nextStepsIndex = findColumnIndex(['next', 'steps', 'action', 'follow']);

    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);
      if (values.length === 0 || !values[0]?.trim()) continue;

      const topic: CSVTopic = {
        sno: snoIndex >= 0 ? (values[snoIndex] || `${i}`) : `${i}`,
        topic: topicIndex >= 0 ? (values[topicIndex] || 'Untitled Topic') : 'Untitled Topic',
        description: descriptionIndex >= 0 ? (values[descriptionIndex] || 'No description provided') : 'No description provided',
        status: statusIndex >= 0 ? (values[statusIndex] || 'Open') : 'Open',
        assignedTo: assignedIndex >= 0 ? (values[assignedIndex] || brandName) : brandName,
        nextSteps: nextStepsIndex >= 0 ? (values[nextStepsIndex] || 'To be determined') : 'To be determined'
      };

      topic.topic = topic.topic.replace(/['"]/g, '').trim();
      topic.description = topic.description.replace(/['"]/g, '').trim();
      topic.status = topic.status.replace(/['"]/g, '').trim();
      topic.assignedTo = topic.assignedTo.replace(/['"]/g, '').trim();
      topic.nextSteps = topic.nextSteps.replace(/['"]/g, '').trim();

      topics.push(topic);
    }

    setCsvTopics(topics);
    updateCsvStats(topics);
  };

  const updateCsvStats = (topics: CSVTopic[]) => {
    const stats = {
      total: topics.length,
      open: topics.filter(t => t.status.toLowerCase() === 'open').length,
      closed: topics.filter(t => t.status.toLowerCase() === 'closed').length
    };
    setCsvStats(stats);
  };

  const getFilteredCsvTopics = () => {
    if (statusFilter === 'all') return csvTopics;
    return csvTopics.filter(topic => 
      topic.status.toLowerCase() === statusFilter
    );
  };

  const convertCsvToOpenPoints = () => {
    const openCsvTopics = csvTopics.filter(topic => 
      topic.status.toLowerCase() === 'open'
    );

    const defaultTimeline = getDefaultTimeline();

    const convertedPoints: OpenPoint[] = openCsvTopics.map(topic => {
      const isAssignedToAgent = topic.assignedTo.toLowerCase().includes(agentName.toLowerCase()) ||
                               topic.assignedTo.toLowerCase().includes('agent') ||
                               topic.assignedTo.toLowerCase().includes('me') ||
                               topic.assignedTo.toLowerCase().includes('kam');
      
      return {
        topic: topic.topic,
        description: topic.description,
        next_steps: topic.nextSteps || '',
        ownership: isAssignedToAgent ? 'Me' : 'Brand',
        owner_name: isAssignedToAgent ? agentName : (topic.assignedTo || brandName),
        status: 'Open',
        timeline: defaultTimeline
      };
    });

    setOpenPoints([...openPoints, ...convertedPoints]);
    setActiveTab('manual');
  };

  const downloadSampleCSV = () => {
    const sampleData = [
      ['S. No', 'Topic', 'Description', 'Status', 'To be responded by', 'Next Steps'],
      ['1', 'Dynamic Reports', 'We discussed how Dynamic Reports can be integrated with existing systems', 'Open', 'Brand\'s End', 'The reports are already active with 8 standard reports. Please share your requirements for additional reports'],
      ['2', 'Purchase by Petpooja', 'We discussed about the Purchase Module integration', 'Open', 'Mahima Sali', 'We will activate the service for 15 days. We would like to hear your feedback once you start using it'],
      ['3', 'Reputation by Petpooja', 'We discussed about the Reputation Management features', 'Closed', 'Mahima Sali', 'Feature has been successfully implemented and is working as expected']
    ];

    const csvContent = sampleData.map(row => 
      row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(',')
    ).join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mom_template_sample.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation: Check if there are any open points
    const totalOpenPoints = openPoints.length;
    const csvOpenPoints = csvTopics.filter(topic => 
      topic.status.toLowerCase() === 'open'
    ).length;
    
    if (totalOpenPoints === 0 && csvOpenPoints === 0) {
      alert('❌ No Open Points Found!\n\nPlease add at least one open point to submit the MOM:\n\n• Use "Manual Entry" tab to add action items manually\n• Use "CSV Upload" tab to upload a CSV file with open points\n• Ensure your CSV has at least one row with status "Open"\n\nA MOM without open points cannot be submitted.');
      return;
    }
    
    // If CSV has topics but no open points, show specific message
    if (totalOpenPoints === 0 && csvTopics.length > 0 && csvOpenPoints === 0) {
      alert('❌ CSV Missing Open Points!\n\nYour CSV file was uploaded successfully but contains no open points:\n\n• Total topics in CSV: ' + csvTopics.length + '\n• Open topics: ' + csvOpenPoints + '\n• Closed topics: ' + (csvTopics.length - csvOpenPoints) + '\n\nPlease:\n1. Update your CSV to include at least one row with status "Open"\n2. Or add manual open points using the "Manual Entry" tab\n\nA MOM must have at least one open point to be submitted.');
      return;
    }
    
    onSubmit({ 
      open_points: openPoints,
      csv_topics: csvTopics,
      meeting_summary: meetingSummary
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
        className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden modal-content" 
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

        {/* Tab Navigation */}
        <div className="bg-gray-50 border-b border-gray-200 px-6">
          <div className="flex space-x-1">
            <button
              onClick={() => setActiveTab('manual')}
              className={`flex items-center space-x-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'manual' 
                  ? 'border-blue-500 text-blue-600 bg-white' 
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Plus className="w-4 h-4" />
              <span>Manual Entry</span>
              {openPoints.length > 0 && (
                <span className="bg-blue-100 text-blue-600 px-2 py-1 rounded-full text-xs">
                  {openPoints.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('csv')}
              className={`flex items-center space-x-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'csv' 
                  ? 'border-blue-500 text-blue-600 bg-white' 
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Upload className="w-4 h-4" />
              <span>CSV Upload</span>
              {csvTopics.length > 0 && (
                <span className="bg-green-100 text-green-600 px-2 py-1 rounded-full text-xs">
                  {csvTopics.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('summary')}
              className={`flex items-center space-x-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'summary' 
                  ? 'border-blue-500 text-blue-600 bg-white' 
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Meeting Summary</span>
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="p-6 max-h-[calc(90vh-200px)] overflow-y-auto">
          <form onSubmit={handleSubmit}>
            {/* Manual Entry Tab */}
            {activeTab === 'manual' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
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
                          <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Topic / Subject <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="text"
                              value={point.topic}
                              onChange={(e) => updateOpenPoint(index, 'topic', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                              placeholder="Enter the main topic or subject"
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
            )}

            {/* CSV Upload Tab */}
            {activeTab === 'csv' && (
              <div className="space-y-6">
                {/* Upload Section */}
                <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center bg-gray-50">
                  <div className="w-16 h-16 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                    <Upload className="w-8 h-8 text-blue-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Upload MOM CSV File</h3>
                  <p className="text-gray-600 mb-6 max-w-md mx-auto">
                    Upload a CSV file with meeting topics and their status. Supports Excel CSV exports and custom formats.
                  </p>
                  
                  {/* CSV Format Guide */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-left max-w-2xl mx-auto">
                    <h4 className="text-sm font-semibold text-blue-900 mb-3 flex items-center">
                      <FileText className="w-4 h-4 mr-2" />
                      Expected CSV Format
                    </h4>
                    <div className="grid grid-cols-2 gap-4 text-xs text-blue-800">
                      <div>
                        <div className="font-medium mb-1">Required Columns:</div>
                        <ul className="space-y-1">
                          <li>• <strong>S. No</strong> - Serial number</li>
                          <li>• <strong>Topic</strong> - Discussion subject</li>
                          <li>• <strong>Description</strong> - Details</li>
                        </ul>
                      </div>
                      <div>
                        <div className="font-medium mb-1">Optional Columns:</div>
                        <ul className="space-y-1">
                          <li>• <strong>Status</strong> - Open/Closed</li>
                          <li>• <strong>Assigned To</strong> - Responsible person</li>
                          <li>• <strong>Next Steps</strong> - Action items</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex justify-center gap-4">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                    >
                      <Upload className="w-4 h-4" />
                      Choose CSV File
                    </button>
                    <button
                      type="button"
                      onClick={downloadSampleCSV}
                      className="flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      Download Sample
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-4">
                    💡 Tip: Export your Excel file as CSV and upload it here for best results
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </div>

                {/* CSV Statistics */}
                {csvTopics.length > 0 && (
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold">{csvStats.total}</div>
                      <div className="text-sm opacity-90">Total Topics</div>
                    </div>
                    <div className="bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold">{csvStats.open}</div>
                      <div className="text-sm opacity-90">Open Topics</div>
                    </div>
                    <div className="bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold">{csvStats.closed}</div>
                      <div className="text-sm opacity-90">Closed Topics</div>
                    </div>
                  </div>
                )}

                {/* Warning for no open points */}
                {csvTopics.length > 0 && csvStats.open === 0 && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-red-600 text-sm font-bold">!</span>
                      </div>
                      <div className="flex-1">
                        <h4 className="text-red-800 font-semibold text-sm mb-1">No Open Points Found</h4>
                        <p className="text-red-700 text-sm mb-3">
                          Your CSV contains {csvStats.total} topics but none are marked as "Open". 
                          A MOM must have at least one open point to be submitted.
                        </p>
                        <div className="text-red-600 text-xs">
                          <strong>Solutions:</strong>
                          <ul className="list-disc list-inside mt-1 space-y-1">
                            <li>Update your CSV file to mark some topics as "Open" in the status column</li>
                            <li>Add manual open points using the "Manual Entry" tab</li>
                            <li>Use the "Convert to Action Items" button if these topics should be open</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Filter and Actions */}
                {csvTopics.length > 0 && (
                  <div className="flex justify-between items-center bg-white border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center gap-3">
                      <Filter className="w-4 h-4 text-gray-500" />
                      <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value as 'all' | 'open' | 'closed')}
                        className="px-3 py-2 border border-gray-300 rounded-lg text-gray-900 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="all">All Topics ({csvTopics.length})</option>
                        <option value="open">Open Only ({csvStats.open})</option>
                        <option value="closed">Closed Only ({csvStats.closed})</option>
                      </select>
                    </div>
                    <button
                      type="button"
                      onClick={convertCsvToOpenPoints}
                      className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors"
                      title={`Converts open topics to action items with default timeline: ${new Date(getDefaultTimeline()).toLocaleDateString()}`}
                    >
                      <Plus className="w-4 h-4" />
                      Convert to Action Items
                    </button>
                  </div>
                )}

                {/* CSV Topics Display */}
                {csvTopics.length > 0 && (
                  <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              S. No
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Topic
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Description
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Status
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Assigned To
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Next Steps
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {getFilteredCsvTopics().map((topic, index) => (
                            <tr key={index} className="hover:bg-gray-50 transition-colors">
                              <td className="px-4 py-3 text-sm text-gray-900 font-medium">
                                {topic.sno}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-900">
                                <div className="font-medium">{topic.topic}</div>
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-600">
                                <div className="max-w-xs">
                                  {topic.description}
                                </div>
                              </td>
                              <td className="px-4 py-3 text-sm">
                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                  topic.status.toLowerCase() === 'open' 
                                    ? 'bg-green-100 text-green-800' 
                                    : topic.status.toLowerCase() === 'closed'
                                    ? 'bg-red-100 text-red-800'
                                    : 'bg-yellow-100 text-yellow-800'
                                }`}>
                                  {topic.status}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-600">
                                <div className="flex items-center">
                                  <div className="flex-shrink-0 w-2 h-2 rounded-full mr-2 bg-blue-400"></div>
                                  {topic.assignedTo}
                                </div>
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-600">
                                <div className="max-w-xs">
                                  {topic.nextSteps || 'N/A'}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    
                    {/* Summary Row */}
                    <div className="bg-gray-50 px-4 py-3 border-t border-gray-200">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-600">
                          Showing {getFilteredCsvTopics().length} of {csvTopics.length} topics
                        </span>
                        <div className="flex gap-4">
                          <span className="text-green-600 font-medium">
                            Open: {getFilteredCsvTopics().filter(t => t.status.toLowerCase() === 'open').length}
                          </span>
                          <span className="text-red-600 font-medium">
                            Closed: {getFilteredCsvTopics().filter(t => t.status.toLowerCase() === 'closed').length}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Meeting Summary Tab */}
            {activeTab === 'summary' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Meeting Summary</h3>
                    <p className="text-sm text-gray-600">Provide a comprehensive overview of the meeting</p>
                  </div>
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <FileText className="w-5 h-5 text-blue-600" />
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-blue-900 mb-2">Summary Guidelines</h4>
                  <div className="text-sm text-blue-800 space-y-1">
                    <p>• <strong>Key Discussions:</strong> Main topics and points covered</p>
                    <p>• <strong>Decisions Made:</strong> Important conclusions and agreements</p>
                    <p>• <strong>Action Items:</strong> Reference to follow-up tasks (added in other tabs)</p>
                    <p>• <strong>Next Steps:</strong> Overall direction and future plans</p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Meeting Summary <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={meetingSummary}
                    onChange={(e) => setMeetingSummary(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 resize-none"
                    rows={12}
                    placeholder="Enter a comprehensive summary of the meeting...

Example:
• Meeting held with [Brand Name] team to discuss [main purpose]
• Key attendees: [list participants]
• Main topics covered: [list key discussion points]
• Decisions made: [important conclusions]
• Overall outcome: [meeting results and next steps]"
                  />
                  <div className="mt-2 flex justify-between items-center text-xs text-gray-500">
                    <span>Provide detailed context for future reference</span>
                    <span>{meetingSummary.length} characters</span>
                  </div>
                </div>
              </div>
            )}
          </form>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 border-t border-gray-200 px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600">
              {activeTab === 'manual' && openPoints.length > 0 && (
                <span>{openPoints.length} action item{openPoints.length !== 1 ? 's' : ''} added</span>
              )}
              {activeTab === 'csv' && csvTopics.length > 0 && (
                <span>{csvStats.open} open topics from CSV</span>
              )}
              {activeTab === 'summary' && meetingSummary.length > 0 && (
                <span>Summary: {meetingSummary.length} characters</span>
              )}
              {/* Warning when no open points */}
              {openPoints.length === 0 && csvStats.open === 0 && (
                <span className="text-red-600 font-medium">
                  ⚠️ No open points - MOM cannot be submitted
                </span>
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
                disabled={openPoints.length === 0 && csvStats.open === 0}
                className={`px-6 py-2 rounded-lg font-medium transition-all transform shadow-lg ${
                  openPoints.length === 0 && csvStats.open === 0
                    ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                    : 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 hover:scale-105'
                }`}
                title={openPoints.length === 0 && csvStats.open === 0 ? 'Add at least one open point to submit MOM' : ''}
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