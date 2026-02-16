'use client'

import { useState, useEffect } from 'react';
import { authHandler } from '../lib/auth-error-handler';
import { apiClient } from '../lib/robust-api-client';
import { useTeamStatistics } from '../hooks/useRobustApi';
import { useAuth } from '../contexts/AuthContext';

export default function AuthTest() {
  const [testResults, setTestResults] = useState<string[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const { user, signIn } = useAuth();

  // Test the robust API hook
  const {
    data: teamData,
    loading: teamLoading,
    error: teamError,
    retry: teamRetry
  } = useTeamStatistics(user?.email, {
    autoLoad: false, // Don't auto-load for testing
    onError: (error) => addResult(`❌ Hook Error: ${error}`),
    onSuccess: (data) => addResult(`✅ Hook Success: Data loaded`)
  });

  const addResult = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setTestResults(prev => [...prev, `[${timestamp}] ${message}`]);
  };

  const runAuthTests = async () => {
    setIsRunning(true);
    setTestResults([]);
    
    addResult('🚀 Starting authentication system tests...');

    // Test 1: Check authentication status
    try {
      const isAuth = authHandler.isAuthenticated();
      addResult(`🔍 Authentication Status: ${isAuth ? 'Authenticated' : 'Not Authenticated'}`);
    } catch (error: any) {
      addResult(`❌ Auth Status Check Failed: ${error.message}`);
    }

    // Test 2: Check token retrieval
    try {
      const token = authHandler.getAuthToken();
      addResult(`🔑 Token Status: ${token ? 'Token Found' : 'No Token'}`);
      if (token) {
        addResult(`🔑 Token Preview: ${token.substring(0, 20)}...`);
      }
    } catch (error: any) {
      addResult(`❌ Token Retrieval Failed: ${error.message}`);
    }

    // Test 3: Test API client health check
    try {
      addResult('🏥 Testing API health check...');
      const healthResponse = await apiClient.checkHealth();
      if (healthResponse.success) {
        addResult('✅ API Health Check: Passed');
      } else {
        addResult(`⚠️ API Health Check: ${healthResponse.error}`);
      }
    } catch (error: any) {
      addResult(`❌ API Health Check Failed: ${error.message}`);
    }

    // Test 4: Test team statistics endpoint
    if (authHandler.isAuthenticated()) {
      try {
        addResult('📊 Testing team statistics endpoint...');
        const statsResponse = await apiClient.getTeamVisitStatistics();
        if (statsResponse.success) {
          addResult('✅ Team Statistics: Success');
          addResult(`📊 Data Keys: ${Object.keys(statsResponse.data || {}).join(', ')}`);
        } else {
          addResult(`⚠️ Team Statistics: ${statsResponse.error}`);
        }
      } catch (error: any) {
        addResult(`❌ Team Statistics Failed: ${error.message}`);
      }
    } else {
      addResult('⏭️ Skipping team statistics test (not authenticated)');
    }

    // Test 5: Test error handling
    try {
      addResult('🧪 Testing error handling...');
      const errorResponse = await authHandler.get('/api/nonexistent-endpoint');
      if (!errorResponse.success) {
        addResult(`✅ Error Handling: Correctly handled error - ${errorResponse.error}`);
      } else {
        addResult('⚠️ Error Handling: Unexpected success on invalid endpoint');
      }
    } catch (error: any) {
      addResult(`✅ Error Handling: Exception caught - ${error.message}`);
    }

    addResult('🏁 Authentication system tests completed!');
    setIsRunning(false);
  };

  const testLogin = async () => {
    addResult('🔐 Testing login with demo credentials...');
    try {
      // Store demo tokens for testing
      authHandler.storeAuthTokens({
        jwt_token: 'demo_jwt_token_' + Date.now(),
        user_data: {
          email: 'demo@example.com',
          role: 'Team Lead',
          team_name: 'Demo Team',
          full_name: 'Demo User',
          permissions: ['read_team', 'write_team']
        }
      });
      addResult('✅ Demo login successful');
      
      // Trigger a refresh to update auth status
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error: any) {
      addResult(`❌ Demo login failed: ${error.message}`);
    }
  };

  const clearAuth = () => {
    authHandler.clearAuthTokens();
    addResult('🧹 Authentication data cleared');
    setTimeout(() => {
      window.location.reload();
    }, 500);
  };

  const testHookLoad = async () => {
    addResult('🪝 Testing React hook data loading...');
    try {
      // This will trigger the useTeamStatistics hook
      teamRetry();
    } catch (error: any) {
      addResult(`❌ Hook test failed: ${error.message}`);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">🔒 Authentication System Test</h1>
      
      {/* Current Status */}
      <div className="bg-gray-100 p-4 rounded-lg mb-6">
        <h2 className="text-lg font-semibold mb-2">Current Status</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <strong>User:</strong> {user ? user.email : 'Not logged in'}
          </div>
          <div>
            <strong>Role:</strong> {user ? user.role : 'N/A'}
          </div>
          <div>
            <strong>Team:</strong> {user ? user.team_name : 'N/A'}
          </div>
          <div>
            <strong>Auth Status:</strong> {authHandler.isAuthenticated() ? '✅ Authenticated' : '❌ Not Authenticated'}
          </div>
        </div>
      </div>

      {/* Hook Status */}
      <div className="bg-blue-50 p-4 rounded-lg mb-6">
        <h2 className="text-lg font-semibold mb-2">React Hook Status</h2>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <strong>Loading:</strong> {teamLoading ? '🔄 Yes' : '✅ No'}
          </div>
          <div>
            <strong>Error:</strong> {teamError ? `❌ ${teamError}` : '✅ None'}
          </div>
          <div>
            <strong>Data:</strong> {teamData ? '✅ Loaded' : '❌ None'}
          </div>
        </div>
      </div>

      {/* Test Controls */}
      <div className="flex flex-wrap gap-3 mb-6">
        <button
          onClick={runAuthTests}
          disabled={isRunning}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:bg-gray-400"
        >
          {isRunning ? '🔄 Running Tests...' : '🧪 Run Auth Tests'}
        </button>
        
        <button
          onClick={testLogin}
          className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
        >
          🔐 Test Demo Login
        </button>
        
        <button
          onClick={clearAuth}
          className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
        >
          🧹 Clear Auth
        </button>
        
        <button
          onClick={testHookLoad}
          disabled={!authHandler.isAuthenticated()}
          className="bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600 disabled:bg-gray-400"
        >
          🪝 Test Hook Load
        </button>
      </div>

      {/* Test Results */}
      <div className="bg-black text-green-400 p-4 rounded-lg font-mono text-sm">
        <h2 className="text-white text-lg font-semibold mb-2">Test Results</h2>
        <div className="h-96 overflow-y-auto">
          {testResults.length === 0 ? (
            <div className="text-gray-500">Click "Run Auth Tests" to start testing...</div>
          ) : (
            testResults.map((result, index) => (
              <div key={index} className="mb-1">
                {result}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Usage Instructions */}
      <div className="mt-6 bg-yellow-50 p-4 rounded-lg">
        <h2 className="text-lg font-semibold mb-2">📋 Instructions</h2>
        <ol className="list-decimal list-inside space-y-1 text-sm">
          <li>Click "Run Auth Tests" to test the authentication system</li>
          <li>Use "Test Demo Login" to simulate a successful login</li>
          <li>Try "Test Hook Load" to test the React hook integration</li>
          <li>Use "Clear Auth" to reset and test unauthenticated state</li>
          <li>Check the console for detailed logs</li>
        </ol>
      </div>
    </div>
  );
}