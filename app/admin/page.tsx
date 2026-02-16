'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function AdminPage() {
  const [supabaseUserId, setSupabaseUserId] = useState('')
  const [email, setEmail] = useState('test@example.com')
  const [fullName, setFullName] = useState('Test User')
  const [role, setRole] = useState('admin')
  const [teamName, setTeamName] = useState('Test Team')

  const generateConvexMutation = () => {
    return JSON.stringify({
      supabase_user_id: supabaseUserId,
      email: email,
      full_name: fullName,
      role: role,
      team_name: teamName,
      contact_number: "+1234567890",
      employee_code: "TEST001",
      is_active: true
    }, null, 2)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-xl p-8 border border-gray-200 shadow-lg">
          <h1 className="text-3xl font-bold text-secondary-800 mb-8">🔧 Admin Setup Helper</h1>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Column - Instructions */}
            <div className="space-y-6">
              <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                <h2 className="text-xl font-semibold text-secondary-800 mb-4">📋 Setup Steps</h2>
                <ol className="text-secondary-600 space-y-2 list-decimal list-inside">
                  <li>Create user in Supabase Dashboard</li>
                  <li>Copy the User ID from Supabase</li>
                  <li>Fill the form on the right</li>
                  <li>Copy the generated JSON</li>
                  <li>Run the mutation in Convex Dashboard</li>
                  <li>Test login</li>
                </ol>
              </div>

              <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                <h3 className="text-lg font-semibold text-secondary-800 mb-3">🔗 Quick Links</h3>
                <div className="space-y-2">
                  <a 
                    href="https://dashboard.convex.dev" 
                    target="_blank"
                    className="block text-primary-600 hover:text-primary-700 underline"
                  >
                    → Convex Dashboard
                  </a>
                  <Link 
                    href="/login"
                    className="block text-success-600 hover:text-success-700 underline"
                  >
                    → Test Login
                  </Link>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                <h3 className="text-lg font-semibold text-secondary-800 mb-3">🧪 Test Credentials</h3>
                <div className="text-secondary-600 space-y-1">
                  <p><strong>Email:</strong> test@example.com</p>
                  <p><strong>Password:</strong> test123456</p>
                  <p><strong>Role:</strong> admin (sees all data)</p>
                </div>
              </div>
            </div>

            {/* Right Column - Form */}
            <div className="space-y-6">
              <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                <h2 className="text-xl font-semibold text-secondary-800 mb-4">👤 User Profile Form</h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-secondary-700 text-sm mb-2">Supabase User ID *</label>
                    <input
                      type="text"
                      value={supabaseUserId}
                      onChange={(e) => setSupabaseUserId(e.target.value)}
                      placeholder="Copy from Supabase after creating user"
                      className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-secondary-800 placeholder-secondary-400 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-200"
                    />
                  </div>

                  <div>
                    <label className="block text-white/80 text-sm mb-2">Email</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-blue-400"
                    />
                  </div>

                  <div>
                    <label className="block text-white/80 text-sm mb-2">Full Name</label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-blue-400"
                    />
                  </div>

                  <div>
                    <label className="block text-white/80 text-sm mb-2">Role</label>
                    <select
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-blue-400"
                    >
                      <option value="admin">Admin (sees all data)</option>
                      <option value="team_lead">Team Lead (sees team data)</option>
                      <option value="agent">Agent (sees own data)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-white/80 text-sm mb-2">Team Name</label>
                    <input
                      type="text"
                      value={teamName}
                      onChange={(e) => setTeamName(e.target.value)}
                      className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-blue-400"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-white/5 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-3">📋 Convex Mutation</h3>
                <p className="text-white/80 text-sm mb-3">
                  Copy this JSON and run <code>users:upsertUserProfile</code> in Convex Dashboard:
                </p>
                <textarea
                  value={generateConvexMutation()}
                  readOnly
                  className="w-full h-40 px-4 py-2 bg-black/20 border border-white/20 rounded-lg text-white text-sm font-mono resize-none"
                />
                <button
                  onClick={() => navigator.clipboard.writeText(generateConvexMutation())}
                  className="mt-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors"
                >
                  📋 Copy JSON
                </button>
              </div>
            </div>
          </div>

          <div className="mt-8 text-center">
            <Link
              href="/login"
              className="inline-flex items-center px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-colors"
            >
              🚀 Test Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}