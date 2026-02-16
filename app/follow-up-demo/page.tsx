'use client';

import React, { useState } from 'react';
import { FollowUpPanel } from '../../components/FollowUpPanel';
import { Card3D } from '../../components/Card3D';
import { Button3D } from '../../components/Button3D';

export default function FollowUpDemo() {
  const [selectedRid, setSelectedRid] = useState('');
  const [selectedChurnReason, setSelectedChurnReason] = useState('');
  const [showPanel, setShowPanel] = useState(false);

  // Demo data for testing
  const demoScenarios = [
    {
      rid: 'DEMO001',
      churnReason: '',
      description: 'Empty churn reason (should be ACTIVE)'
    },
    {
      rid: 'DEMO002', 
      churnReason: 'I don\'t know',
      description: 'I don\'t know churn reason (should be ACTIVE)'
    },
    {
      rid: 'DEMO003',
      churnReason: 'KAM needs to respond',
      description: 'KAM needs to respond (should be ACTIVE)'
    },
    {
      rid: 'DEMO004',
      churnReason: 'Price too high',
      description: 'Finalized churn reason (should be INACTIVE)'
    },
    {
      rid: 'DEMO005',
      churnReason: 'Competitor chosen',
      description: 'Finalized churn reason (should be INACTIVE)'
    }
  ];

  const handleScenarioSelect = (scenario: typeof demoScenarios[0]) => {
    setSelectedRid(scenario.rid);
    setSelectedChurnReason(scenario.churnReason);
    setShowPanel(true);
  };

  const handleCustomTest = () => {
    if (selectedRid.trim()) {
      setShowPanel(true);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            Follow-Up System Demo
          </h1>
          <p className="text-gray-600">
            Test the follow-up activation logic based on churn reasons
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Panel - Controls */}
          <div className="space-y-6">
            {/* Demo Scenarios */}
            <Card3D className="p-6">
              <h2 className="text-xl font-semibold mb-4">Demo Scenarios</h2>
              <div className="space-y-3">
                {demoScenarios.map((scenario, index) => (
                  <div
                    key={index}
                    className="p-3 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => handleScenarioSelect(scenario)}
                  >
                    <div className="font-medium">RID: {scenario.rid}</div>
                    <div className="text-sm text-gray-600">
                      Churn Reason: "{scenario.churnReason || '(empty)'}"
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {scenario.description}
                    </div>
                  </div>
                ))}
              </div>
            </Card3D>

            {/* Custom Test */}
            <Card3D className="p-6">
              <h2 className="text-xl font-semibold mb-4">Custom Test</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    RID
                  </label>
                  <input
                    type="text"
                    value={selectedRid}
                    onChange={(e) => setSelectedRid(e.target.value)}
                    placeholder="Enter RID (e.g., TEST123)"
                    className="w-full p-2 border rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Churn Reason
                  </label>
                  <select
                    value={selectedChurnReason}
                    onChange={(e) => setSelectedChurnReason(e.target.value)}
                    className="w-full p-2 border rounded-md"
                  >
                    <option value="">-- Select or leave empty --</option>
                    <option value="">Empty (blank)</option>
                    <option value="I don't know">I don't know</option>
                    <option value="KAM needs to respond">KAM needs to respond</option>
                    <option value="Price too high">Price too high</option>
                    <option value="Competitor chosen">Competitor chosen</option>
                    <option value="Not interested">Not interested</option>
                    <option value="Technical issues">Technical issues</option>
                  </select>
                </div>
                <Button3D
                  onClick={handleCustomTest}
                  disabled={!selectedRid.trim()}
                  className="w-full"
                >
                  Test Follow-Up System
                </Button3D>
              </div>
            </Card3D>

            {/* Rules Reference */}
            <Card3D className="p-6">
              <h2 className="text-xl font-semibold mb-4">Activation Rules</h2>
              <div className="space-y-3 text-sm">
                <div>
                  <div className="font-medium text-green-700">✅ Follow-Up ACTIVE when:</div>
                  <ul className="ml-4 mt-1 space-y-1 text-gray-600">
                    <li>• Churn reason is blank/empty</li>
                    <li>• Churn reason is "I don't know"</li>
                    <li>• Churn reason is "KAM needs to respond"</li>
                  </ul>
                </div>
                <div>
                  <div className="font-medium text-red-700">❌ Follow-Up INACTIVE when:</div>
                  <ul className="ml-4 mt-1 space-y-1 text-gray-600">
                    <li>• Any other finalized churn reason</li>
                  </ul>
                </div>
              </div>
            </Card3D>

            {/* Flow Summary */}
            <Card3D className="p-6">
              <h2 className="text-xl font-semibold mb-4">Flow Summary</h2>
              <div className="space-y-2 text-sm text-gray-600">
                <div>1. <strong>First Attempt:</strong> Can be added anytime</div>
                <div>2. <strong>Second Attempt:</strong> Must wait 2 hours after first</div>
                <div>3. <strong>Completion:</strong> After 2 attempts, moves to "Done"</div>
                <div>4. <strong>48-Hour Cooldown:</strong> Follow-up locked for 48 hours</div>
                <div>5. <strong>Auto-Reset:</strong> After 48 hours, starts new cycle</div>
                <div>6. <strong>Deactivation:</strong> When churn reason is finalized</div>
              </div>
            </Card3D>
          </div>

          {/* Right Panel - Follow-Up System */}
          <div>
            {showPanel && selectedRid ? (
              <FollowUpPanel
                rid={selectedRid}
                churnReason={selectedChurnReason}
                onClose={() => setShowPanel(false)}
              />
            ) : (
              <Card3D className="p-8">
                <div className="text-center text-gray-500">
                  <div className="text-4xl mb-4">📞</div>
                  <div className="text-lg font-medium">Follow-Up System</div>
                  <div className="text-sm mt-2">
                    Select a demo scenario or enter custom values to test the system
                  </div>
                </div>
              </Card3D>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}