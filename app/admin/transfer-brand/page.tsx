'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/Layout/DashboardLayout';

interface Brand {
  id: string;
  brand_name: string;
  brand_email_id?: string;
  kam_email_id: string;
  kam_name: string;
  team_name?: string;
  current_kam_assigned_date?: string;
  outlet_counts?: number;
}

interface Agent {
  email: string;
  full_name: string;
  team_name?: string;
}

interface TransferPreview {
  demosCount: number;
  completedDemos: number;
  pendingDemos: number;
  visitsCount: number;
  completedVisits: number;
  pendingVisits: number;
}

export default function TransferBrandPage() {
  const router = useRouter();
  const { userProfile } = useAuth();
  const [brands, setBrands] = useState<Brand[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [transferring, setTransferring] = useState(false);
  
  // Form state
  const [selectedBrandId, setSelectedBrandId] = useState('');
  const [selectedBrand, setSelectedBrand] = useState<Brand | null>(null);
  const [toAgentEmail, setToAgentEmail] = useState('');
  const [transferReason, setTransferReason] = useState('');
  const [transferYear, setTransferYear] = useState(new Date().getFullYear().toString());
  
  // Preview state
  const [showPreview, setShowPreview] = useState(false);
  const [preview, setPreview] = useState<TransferPreview | null>(null);
  
  // Result state
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');
  
  // New brand form state
  const [showNewBrandForm, setShowNewBrandForm] = useState(false);
  const [creatingBrand, setCreatingBrand] = useState(false);
  const [newBrand, setNewBrand] = useState({
    brand_name: '',
    brand_email_id: '',
    kam_email_id: '',
    brand_state: '',
    zone: '',
    kam_name_secondary: '',
    outlet_counts: 0
  });

  // Edit brand form state
  const [showEditBrandForm, setShowEditBrandForm] = useState(false);
  const [editingBrand, setEditingBrand] = useState(false);
  const [selectedEditBrandId, setSelectedEditBrandId] = useState('');
  const [editBrand, setEditBrand] = useState({
    brand_name: '',
    brand_email_id: '',
    outlet_counts: 0
  });

  // Fetch brands and agents on mount
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch transferable brands
      const brandsRes = await fetch('/api/admin/transferable-brands');
      const brandsData = await brandsRes.json();
      
      if (brandsData.success) {
        setBrands(brandsData.data);
      } else {
        setError(brandsData.error || 'Failed to fetch brands');
      }
      
      // Fetch agents
      const agentsRes = await fetch('/api/user/agents');
      const agentsData = await agentsRes.json();
      
      if (agentsData.success) {
        setAgents(agentsData.data);
      }
      
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleBrandSelect = (brandId: string) => {
    setSelectedBrandId(brandId);
    const brand = brands.find(b => b.id === brandId);
    setSelectedBrand(brand || null);
    setToAgentEmail('');
    setShowPreview(false);
    setPreview(null);
    setResult(null);
    setError('');
  };

  const handlePreview = () => {
    if (!selectedBrand || !toAgentEmail || !transferReason) {
      setError('Please fill all required fields');
      return;
    }
    
    // For now, show a simple preview
    // In production, you might want to fetch actual counts from API
    setShowPreview(true);
    setPreview({
      demosCount: 8, // Placeholder
      completedDemos: 0,
      pendingDemos: 8,
      visitsCount: 0,
      completedVisits: 0,
      pendingVisits: 0
    });
  };

  const handleTransfer = async () => {
    if (!selectedBrand || !toAgentEmail || !transferReason) {
      setError('Please fill all required fields');
      return;
    }

    if (!confirm(`Are you sure you want to transfer "${selectedBrand.brand_name}" from ${selectedBrand.kam_email_id} to ${toAgentEmail}?`)) {
      return;
    }

    try {
      setTransferring(true);
      setError('');
      
      const response = await fetch('/api/admin/transfer-brand', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brandId: selectedBrandId,
          fromAgentEmail: selectedBrand.kam_email_id,
          toAgentEmail,
          transferReason,
          transferYear
        })
      });

      const data = await response.json();

      if (data.success) {
        setResult(data.data);
        setSelectedBrandId('');
        setSelectedBrand(null);
        setToAgentEmail('');
        setTransferReason('');
        setShowPreview(false);
        setPreview(null);
        
        // Refresh brands list
        fetchData();
      } else {
        setError(data.error || 'Transfer failed');
      }
      
    } catch (err) {
      console.error('Transfer error:', err);
      setError('Transfer failed: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setTransferring(false);
    }
  };

  const handleCreateBrand = async () => {
    if (!newBrand.brand_name || !newBrand.kam_email_id || !newBrand.brand_state || !newBrand.zone) {
      setError('Please fill all required fields for new brand');
      return;
    }

    try {
      setCreatingBrand(true);
      setError('');
      
      // Find the KAM name from agents list
      const selectedAgent = agents.find(a => a.email === newBrand.kam_email_id);
      const kam_name = selectedAgent?.full_name || newBrand.kam_email_id;
      
      const response = await fetch('/api/admin/brands', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newBrand,
          kam_name
        })
      });

      const data = await response.json();

      if (data.success) {
        setResult({ message: `Brand "${newBrand.brand_name}" created successfully!` });
        setNewBrand({
          brand_name: '',
          brand_email_id: '',
          kam_email_id: '',
          brand_state: '',
          zone: '',
          kam_name_secondary: '',
          outlet_counts: 0
        });
        setShowNewBrandForm(false);
        
        // Refresh brands list
        fetchData();
      } else {
        setError(data.error || 'Failed to create brand');
      }
      
    } catch (err) {
      console.error('Create brand error:', err);
      setError('Failed to create brand: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setCreatingBrand(false);
    }
  };

  const handleEditBrandSelect = (brandId: string) => {
    setSelectedEditBrandId(brandId);
    const brand = brands.find(b => b.id === brandId);
    if (brand) {
      setEditBrand({
        brand_name: brand.brand_name,
        brand_email_id: brand.brand_email_id || '',
        outlet_counts: brand.outlet_counts || 0
      });
    }
  };

  const handleUpdateBrand = async () => {
    if (!selectedEditBrandId || !editBrand.brand_name) {
      setError('Please select a brand and provide a brand name');
      return;
    }

    if (!confirm('Are you sure you want to update this brand information?')) {
      return;
    }

    try {
      setEditingBrand(true);
      setError('');
      
      const response = await fetch('/api/admin/brands', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brandId: selectedEditBrandId,
          brand_name: editBrand.brand_name,
          brand_email_id: editBrand.brand_email_id,
          outlet_counts: editBrand.outlet_counts
        })
      });

      const data = await response.json();

      if (data.success) {
        setResult({ message: `Brand information updated successfully!` });
        setSelectedEditBrandId('');
        setEditBrand({
          brand_name: '',
          brand_email_id: '',
          outlet_counts: 0
        });
        
        // Refresh brands list
        fetchData();
      } else {
        setError(data.error || 'Failed to update brand');
      }
      
    } catch (err) {
      console.error('Update brand error:', err);
      setError('Failed to update brand: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setEditingBrand(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout userProfile={userProfile}>
        <div className="min-h-screen bg-gray-50 p-8">
          <div className="max-w-4xl mx-auto">
            <div className="text-center">Loading...</div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout userProfile={userProfile}>
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Brand Management</h1>
          <p className="text-gray-600 mt-2">
            Transfer brands between KAMs or add new brands to the system.
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="mb-6 border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => {
                setShowNewBrandForm(false);
                setShowEditBrandForm(false);
                setError('');
                setResult(null);
              }}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                !showNewBrandForm && !showEditBrandForm
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Transfer Brand
            </button>
            <button
              onClick={() => {
                setShowNewBrandForm(true);
                setShowEditBrandForm(false);
                setError('');
                setResult(null);
              }}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                showNewBrandForm
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Add New Brand
            </button>
            <button
              onClick={() => {
                setShowNewBrandForm(false);
                setShowEditBrandForm(true);
                setError('');
                setResult(null);
              }}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                showEditBrandForm
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Edit Brand Info
            </button>
          </nav>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {/* Success Message */}
        {result && (
          <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
            <h3 className="font-semibold mb-2">✅ Success!</h3>
            <p>{result.message}</p>
            {result.demos && (
              <div className="mt-2 text-sm">
                <p><strong>Demos:</strong></p>
                <p>• Transferred: {result.demos?.transferredCount || 0} pending demos</p>
                <p>• Kept with original KAM: {result.demos?.skippedCount || 0} completed demos</p>
                
                <p className="mt-2"><strong>Visits:</strong></p>
                <p>• Transferred: {result.visits?.transferredCount || 0} pending visits</p>
                <p>• Kept with original KAM: {result.visits?.skippedCount || 0} completed visits</p>
              </div>
            )}
          </div>
        )}

        {/* New Brand Form */}
        {showNewBrandForm && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Add New Brand</h2>
            
            <div className="space-y-4">
              {/* Brand Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Brand Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newBrand.brand_name}
                  onChange={(e) => setNewBrand({ ...newBrand, brand_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter brand name"
                  disabled={creatingBrand}
                />
              </div>

              {/* Brand Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Brand Email
                </label>
                <input
                  type="email"
                  value={newBrand.brand_email_id}
                  onChange={(e) => setNewBrand({ ...newBrand, brand_email_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="brand@example.com"
                  disabled={creatingBrand}
                />
              </div>

              {/* KAM Assignment */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Assign to KAM <span className="text-red-500">*</span>
                </label>
                <select
                  value={newBrand.kam_email_id}
                  onChange={(e) => setNewBrand({ ...newBrand, kam_email_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={creatingBrand}
                >
                  <option value="">-- Select KAM --</option>
                  {agents.map(agent => (
                    <option key={agent.email} value={agent.email}>
                      {agent.full_name} ({agent.email})
                    </option>
                  ))}
                </select>
              </div>

              {/* KAM Email Display (Read-only) */}
              {newBrand.kam_email_id && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    KAM Email ID
                  </label>
                  <input
                    type="text"
                    value={newBrand.kam_email_id}
                    readOnly
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-600"
                  />
                </div>
              )}

              {/* State */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  State <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newBrand.brand_state}
                  onChange={(e) => setNewBrand({ ...newBrand, brand_state: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Maharashtra, Delhi"
                  disabled={creatingBrand}
                />
              </div>

              {/* Zone */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Zone <span className="text-red-500">*</span>
                </label>
                <select
                  value={newBrand.zone}
                  onChange={(e) => setNewBrand({ ...newBrand, zone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={creatingBrand}
                >
                  <option value="">-- Select Zone --</option>
                  <option value="North">North</option>
                  <option value="South">South</option>
                  <option value="East">East</option>
                  <option value="West">West</option>
                  <option value="Central">Central</option>
                </select>
              </div>

              {/* Secondary KAM */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Secondary KAM (Optional)
                </label>
                <input
                  type="text"
                  value={newBrand.kam_name_secondary}
                  onChange={(e) => setNewBrand({ ...newBrand, kam_name_secondary: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Secondary KAM name"
                  disabled={creatingBrand}
                />
              </div>

              {/* Outlet Count */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Number of Outlets
                </label>
                <input
                  type="number"
                  value={newBrand.outlet_counts}
                  onChange={(e) => setNewBrand({ ...newBrand, outlet_counts: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0"
                  min="0"
                  disabled={creatingBrand}
                />
              </div>

              {/* Action Button */}
              <div className="pt-4">
                <button
                  onClick={handleCreateBrand}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-400"
                  disabled={creatingBrand}
                >
                  {creatingBrand ? 'Creating Brand...' : 'Create Brand'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Brand Form */}
        {showEditBrandForm && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Edit Brand Information</h2>
            
            <div className="space-y-4">
              {/* Select Brand to Edit */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Brand <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedEditBrandId}
                  onChange={(e) => handleEditBrandSelect(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={editingBrand}
                >
                  <option value="">-- Select a brand to edit --</option>
                  {brands.map(brand => (
                    <option key={brand.id} value={brand.id}>
                      {brand.brand_name} (KAM: {brand.kam_name})
                    </option>
                  ))}
                </select>
              </div>

              {selectedEditBrandId && (
                <>
                  {/* Brand Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Brand Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={editBrand.brand_name}
                      onChange={(e) => setEditBrand({ ...editBrand, brand_name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter brand name"
                      disabled={editingBrand}
                    />
                  </div>

                  {/* Brand Email */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Brand Email ID
                    </label>
                    <input
                      type="email"
                      value={editBrand.brand_email_id}
                      onChange={(e) => setEditBrand({ ...editBrand, brand_email_id: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="brand@example.com"
                      disabled={editingBrand}
                    />
                  </div>

                  {/* Outlet Count */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Number of Outlets
                    </label>
                    <input
                      type="number"
                      value={editBrand.outlet_counts}
                      onChange={(e) => setEditBrand({ ...editBrand, outlet_counts: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="0"
                      min="0"
                      disabled={editingBrand}
                    />
                  </div>

                  {/* Action Button */}
                  <div className="pt-4">
                    <button
                      onClick={handleUpdateBrand}
                      className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-400"
                      disabled={editingBrand}
                    >
                      {editingBrand ? 'Updating Brand...' : 'Update Brand Information'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Transfer Form */}
        {!showNewBrandForm && !showEditBrandForm && (
          <>
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <h2 className="text-xl font-semibold mb-4">Transfer Details</h2>
          
          {/* Select Brand */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Brand <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedBrandId}
              onChange={(e) => handleBrandSelect(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={transferring}
            >
              <option value="">-- Select a brand --</option>
              {brands.map(brand => (
                <option key={brand.id} value={brand.id}>
                  {brand.brand_name} (Current KAM: {brand.kam_name})
                </option>
              ))}
            </select>
          </div>

          {/* Current KAM (Read-only) */}
          {selectedBrand && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Current KAM
              </label>
              <input
                type="text"
                value={`${selectedBrand.kam_name} (${selectedBrand.kam_email_id})`}
                readOnly
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
              />
            </div>
          )}

          {/* Select New KAM */}
          {selectedBrand && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Transfer To (New KAM) <span className="text-red-500">*</span>
              </label>
              <select
                value={toAgentEmail}
                onChange={(e) => setToAgentEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={transferring}
              >
                <option value="">-- Select new KAM --</option>
                {agents
                  .filter(agent => agent.email !== selectedBrand.kam_email_id)
                  .map(agent => (
                    <option key={agent.email} value={agent.email}>
                      {agent.full_name} ({agent.email})
                    </option>
                  ))}
              </select>
            </div>
          )}

          {/* Transfer Year */}
          {selectedBrand && toAgentEmail && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Transfer Year (for visits)
              </label>
              <input
                type="text"
                value={transferYear}
                onChange={(e) => setTransferYear(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={transferring}
                placeholder="2026"
              />
              <p className="text-sm text-gray-500 mt-1">
                Only visits from this year will be transferred
              </p>
            </div>
          )}

          {/* Transfer Reason */}
          {selectedBrand && toAgentEmail && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Transfer Reason <span className="text-red-500">*</span>
              </label>
              <textarea
                value={transferReason}
                onChange={(e) => setTransferReason(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Territory reassignment, KAM resignation, workload balancing..."
                disabled={transferring}
              />
            </div>
          )}

          {/* Action Buttons */}
          {selectedBrand && toAgentEmail && transferReason && (
            <div className="flex gap-3">
              <button
                onClick={handlePreview}
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:bg-gray-400"
                disabled={transferring}
              >
                Preview Transfer
              </button>
              <button
                onClick={handleTransfer}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-400"
                disabled={transferring}
              >
                {transferring ? 'Transferring...' : 'Confirm Transfer'}
              </button>
            </div>
          )}
        </div>

        {/* Preview Section */}
        {showPreview && preview && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-yellow-900 mb-4">
              ⚠️ Transfer Preview
            </h3>
            <div className="space-y-2 text-sm text-yellow-800">
              <p><strong>Brand:</strong> {selectedBrand?.brand_name}</p>
              <p><strong>From:</strong> {selectedBrand?.kam_email_id}</p>
              <p><strong>To:</strong> {toAgentEmail}</p>
              <p><strong>Reason:</strong> {transferReason}</p>
              
              <div className="mt-4 pt-4 border-t border-yellow-300">
                <p className="font-semibold mb-2">What will be transferred:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Only PENDING demos (completed demos stay with original KAM)</li>
                  <li>Only PENDING visits for year {transferYear} (completed visits stay with original KAM)</li>
                  <li>Brand ownership in master data</li>
                </ul>
              </div>
              
              <div className="mt-4 pt-4 border-t border-yellow-300">
                <p className="font-semibold text-red-700">Important:</p>
                <ul className="list-disc list-inside space-y-1 text-red-700">
                  <li>Completed work stays with original KAM (for accurate metrics)</li>
                  <li>New KAM will be responsible for all pending work</li>
                  <li>This action cannot be undone automatically</li>
                </ul>
              </div>
            </div>
          </div>
        )}
          </>
        )}
      </div>
    </div>
    </DashboardLayout>
  );
}
