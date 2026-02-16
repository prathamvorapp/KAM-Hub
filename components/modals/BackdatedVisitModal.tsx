'use client'

import { useState, useEffect } from 'react';
import { X, Calendar, AlertTriangle, User } from 'lucide-react';
import { convexAPI } from '@/lib/convex-api';

interface BackdatedVisitModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSchedule: (visitData: {
    brand_id: string;
    brand_name: string;
    agent_id: string;
    agent_name: string;
    team_name?: string;
    scheduled_date: string;
    visit_status: string;
    purpose?: string;
    zone?: string;
    backdate_reason: string;
  }) => void;
  userRole: string;
  userTeam?: string;
  availableBrands: Array<{
    brandId: string;
    brandName: string;
    kamEmailId: string;
    kamName?: string;
    zone?: string;
  }>;
  availableAgents: Array<{
    email: string;
    full_name: string;
    team_name: string;
  }>;
}

export default function BackdatedVisitModal({ 
  isOpen, 
  onClose, 
  onSchedule, 
  userRole,
  userTeam,
  availableBrands,
  availableAgents
}: BackdatedVisitModalProps) {
  const [selectedBrand, setSelectedBrand] = useState('');
  const [selectedAgent, setSelectedAgent] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [visitStatus, setVisitStatus] = useState('Scheduled');
  const [purpose, setPurpose] = useState('');
  const [backdateReason, setBackdateReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingBrands, setLoadingBrands] = useState(false);
  const [agentBrands, setAgentBrands] = useState<Array<{
    id?: string;
    brand_name?: string;
    kam_email_id?: string;
    zone?: string;
  }>>([]);

  // Filter agents based on user role - normalize role comparison
  const normalizedRole = userRole?.toLowerCase().replace(/[_\s]/g, '');
  const filteredAgents = normalizedRole === 'teamlead'
    ? availableAgents.filter(agent => agent.team_name === userTeam)
    : availableAgents;

  // Use dynamically fetched brands if available, otherwise fall back to filtered static brands
  const filteredBrands = agentBrands.length > 0 
    ? agentBrands.map(brand => ({
        brandId: brand.id || '',
        brandName: brand.brand_name || '',
        kamEmailId: brand.kam_email_id || '',
        zone: brand.zone
      }))
    : selectedAgent 
      ? availableBrands.filter(brand => brand.kamEmailId === selectedAgent)
      : availableBrands;

  // Fetch brands for selected agent
  const fetchBrandsForAgent = async (agentEmail: string) => {
    if (!agentEmail) {
      setAgentBrands([]);
      return;
    }

    setLoadingBrands(true);
    try {
      console.log('🔍 Fetching brands for agent:', agentEmail);
      
      // Fetch all brands for the selected agent (no limit)
      const response = await convexAPI.getBrandsByAgentEmail(agentEmail, 1, 1000); // High limit to get all brands
      
      if (response.success && response.data && response.data.data) {
        const brands = response.data.data;
        console.log('✅ Found', brands.length, 'brands for agent:', agentEmail);
        console.log('📦 Sample brand data:', brands[0]); // Debug log
        setAgentBrands(brands);
      } else if (response.data && Array.isArray(response.data)) {
        // Handle direct array response
        console.log('✅ Found', response.data.length, 'brands for agent:', agentEmail);
        console.log('📦 Sample brand data:', response.data[0]); // Debug log
        setAgentBrands(response.data);
      } else {
        console.log('⚠️ No brands found for agent:', agentEmail);
        setAgentBrands([]);
      }
    } catch (error) {
      console.error('❌ Error fetching brands for agent:', agentEmail, error);
      setAgentBrands([]);
    } finally {
      setLoadingBrands(false);
    }
  };

  // Handle agent selection change
  const handleAgentChange = (agentEmail: string) => {
    setSelectedAgent(agentEmail);
    setSelectedBrand(''); // Reset brand when agent changes
    
    if (agentEmail) {
      fetchBrandsForAgent(agentEmail);
    } else {
      setAgentBrands([]);
    }
  };

  // Reset form when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedBrand('');
      setSelectedAgent('');
      setScheduledDate('');
      setVisitStatus('Scheduled');
      setPurpose('');
      setBackdateReason('');
      setAgentBrands([]);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedBrand || !selectedAgent || !scheduledDate || !backdateReason.trim()) {
      alert('Please fill in all required fields.');
      return;
    }

    // Validate that the date is in the past
    const selectedDateObj = new Date(scheduledDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (selectedDateObj >= today) {
      alert('Backdated visits must have a date in the past.');
      return;
    }

    const selectedBrandData = filteredBrands.find(b => b.brandId === selectedBrand);
    const selectedAgentData = filteredAgents.find(a => a.email === selectedAgent);

    if (!selectedBrandData || !selectedAgentData) {
      alert('Invalid brand or agent selection.');
      return;
    }

    setLoading(true);
    try {
      await onSchedule({
        brand_id: selectedBrandData.brandId,
        brand_name: selectedBrandData.brandName,
        agent_id: selectedAgentData.email,
        agent_name: selectedAgentData.full_name,
        team_name: selectedAgentData.team_name,
        scheduled_date: scheduledDate,
        visit_status: visitStatus,
        purpose: purpose.trim() || undefined,
        zone: selectedBrandData.zone,
        backdate_reason: backdateReason.trim(),
      });
      onClose();
    } catch (error) {
      console.error('Error scheduling backdated visit:', error);
      alert('Failed to schedule backdated visit. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Calculate max date (yesterday)
  const maxDate = new Date();
  maxDate.setDate(maxDate.getDate() - 1);
  const maxDateString = maxDate.toISOString().split('T')[0];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg border border-gray-200 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-orange-600" />
            Schedule Backdated Visit
          </h2>
          <button 
            onClick={onClose} 
            className="p-1 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600"
            disabled={loading}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Warning Notice */}
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-4">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-orange-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-orange-800">
              <p className="font-medium">Backdated Visit</p>
              <p>This feature allows {userRole}s to schedule visits with past dates. A reason is required for audit purposes.</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            {/* Agent Selection */}
            <div>
              <label htmlFor="agent" className="block text-sm font-medium text-gray-700 mb-1">
                Select Agent *
              </label>
              <select
                id="agent"
                value={selectedAgent}
                onChange={(e) => handleAgentChange(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-800 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                disabled={loading}
                required
              >
                <option value="">Choose an agent...</option>
                {filteredAgents.map((agent) => (
                  <option key={agent.email} value={agent.email}>
                    {agent.full_name} ({agent.team_name})
                  </option>
                ))}
              </select>
            </div>

            {/* Brand Selection */}
            <div>
              <label htmlFor="brand" className="block text-sm font-medium text-gray-700 mb-1">
                Select Brand * {loadingBrands && <span className="text-blue-600">(Loading brands...)</span>}
              </label>
              <select
                id="brand"
                value={selectedBrand}
                onChange={(e) => setSelectedBrand(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-800 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                disabled={loading || !selectedAgent || loadingBrands}
                required
              >
                <option value="" key="brand-empty">
                  {loadingBrands ? 'Loading brands...' : 'Choose a brand...'}
                </option>
                {filteredBrands.map((brand) => (
                  <option key={`brand-${brand.brandId}`} value={brand.brandId}>
                    {brand.brandName} {brand.zone && `(${brand.zone})`}
                  </option>
                ))}
              </select>
              {selectedAgent && !loadingBrands && filteredBrands.length === 0 && (
                <p className="text-sm text-gray-500 mt-1">No brands found for selected agent</p>
              )}
              {selectedAgent && !loadingBrands && filteredBrands.length > 0 && (
                <p className="text-sm text-green-600 mt-1">
                  {filteredBrands.length} brand{filteredBrands.length !== 1 ? 's' : ''} available
                </p>
              )}
            </div>

            {/* Scheduled Date */}
            <div>
              <label htmlFor="scheduledDate" className="block text-sm font-medium text-gray-700 mb-1">
                Visit Date (Past Date) *
              </label>
              <input
                id="scheduledDate"
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-800 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                max={maxDateString}
                disabled={loading}
                required
              />
              <p className="text-xs text-gray-500 mt-1">Must be a date in the past</p>
            </div>

            {/* Visit Status */}
            <div>
              <label htmlFor="visitStatus" className="block text-sm font-medium text-gray-700 mb-1">
                Visit Status *
              </label>
              <select
                id="visitStatus"
                value={visitStatus}
                onChange={(e) => setVisitStatus(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-800 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                disabled={loading}
                required
              >
                <option value="Scheduled">Scheduled</option>
                <option value="Completed">Completed</option>
                <option value="Visit Done">Visit Done</option>
              </select>
            </div>

            {/* Purpose */}
            <div>
              <label htmlFor="purpose" className="block text-sm font-medium text-gray-700 mb-1">
                Purpose (Optional)
              </label>
              <input
                id="purpose"
                type="text"
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-800 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                placeholder="Visit purpose..."
                disabled={loading}
                maxLength={200}
              />
            </div>

            {/* Backdate Reason */}
            <div>
              <label htmlFor="backdateReason" className="block text-sm font-medium text-gray-700 mb-1">
                Reason for Backdating *
              </label>
              <textarea
                id="backdateReason"
                value={backdateReason}
                onChange={(e) => setBackdateReason(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-800 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 resize-none"
                rows={3}
                placeholder="Please provide a detailed reason for scheduling this backdated visit..."
                disabled={loading}
                required
                maxLength={500}
              />
              <div className="text-xs text-gray-500 mt-1">
                {backdateReason.length}/500 characters
              </div>
            </div>

            {/* Permission Notice */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <User className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium">Permission Level</p>
                  <p>As a {userRole}, you can schedule backdated visits {userRole === 'Team Lead' ? 'for your team members' : 'for any agent'}.</p>
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
              className="flex-1 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading}
            >
              {loading ? 'Scheduling...' : 'Schedule Backdated Visit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}