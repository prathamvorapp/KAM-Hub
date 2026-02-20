'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import DashboardLayout from '@/components/Layout/DashboardLayout'
import HealthCheckModal from '@/components/HealthCheckModal'
import { Heart, Search, TrendingUp, Users, Calendar, CheckCircle, XCircle, AlertCircle } from 'lucide-react'

interface Brand {
  brand_name: string
  kam_email_id: string
  zone?: string
  brand_nature?: string
  brand_state?: string
  id?: string
  _id?: string
  brand_id?: string
  [key: string]: any
}

interface HealthCheck {
  check_id: string
  brand_name: string
  health_status: string
  assessment_date: string
  assessment_month: string
  kam_email: string
  team_name?: string
  zone?: string
  brand_nature?: string
  notes?: string
  [key: string]: any
}

interface AssessmentProgress {
  total_brands: number
  assessed_brands: number
  pending_brands: number
  progress_percentage: number
}

interface AgentStats {
  kam_email: string
  kam_name: string
  team_name?: string
  total: number
  totalBrands: number
  pendingAssessments: number
  byHealthStatus: Record<string, number>
  byBrandNature: Record<string, number>
  criticalBrands: number
  healthyBrands: number
  connectivityRate: number
}

interface HealthCheckStats {
  total: number
  byHealthStatus: Record<string, number>
  byBrandNature: Record<string, number>
  byZone: Record<string, number>
  byAgent?: AgentStats[]
}

export default function HealthChecksPage() {
  const router = useRouter()
  const { userProfile, session } = useAuth() // Removed 'user' and 'loading: authLoading'
  const [activeTab, setActiveTab] = useState<'assessment' | 'history' | 'statistics'>('assessment')
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  
  // Assessment tab data
  const [brandsForAssessment, setBrandsForAssessment] = useState<Brand[]>([])
  const [filteredBrands, setFilteredBrands] = useState<Brand[]>([])
  const [progress, setProgress] = useState<AssessmentProgress | null>(null)
  const [selectedBrand, setSelectedBrand] = useState<Brand | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // History tab data
  const [healthChecks, setHealthChecks] = useState<HealthCheck[]>([])
  const [filteredHealthChecks, setFilteredHealthChecks] = useState<HealthCheck[]>([])
  
  // Statistics tab data
  const [stats, setStats] = useState<HealthCheckStats | null>(null)
  
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7))
  const [clearingCache, setClearingCache] = useState(false)

  useEffect(() => {
    // Simplified auth check: only check userProfile
    if (!userProfile) {
      router.push('/login');
    }
  }, [userProfile, router]); // Dependency array updated

  useEffect(() => {
    if (userProfile) { // Changed from 'user && userProfile' to 'userProfile'
      loadData()
    }
  }, [userProfile, selectedMonth, activeTab]) // Dependency array updated

  useEffect(() => {
    // Filter brands based on search
    if (activeTab === 'assessment') {
      const filtered = brandsForAssessment.filter(brand =>
        brand.brand_name.toLowerCase().includes(searchQuery.toLowerCase())
      )
      setFilteredBrands(filtered)
    } else if (activeTab === 'history') {
      const filtered = healthChecks.filter(check =>
        check.brand_name.toLowerCase().includes(searchQuery.toLowerCase())
      )
      setFilteredHealthChecks(filtered)
    }
  }, [searchQuery, brandsForAssessment, healthChecks, activeTab])

  const loadData = async () => {
    try {
      setLoading(true)
      
      // Add cache-busting timestamp
      const timestamp = Date.now()
      
      if (activeTab === 'assessment') {
        // Load brands for assessment and progress
        const [brandsRes, progressRes] = await Promise.all([
          fetch(`/api/data/health-checks/brands-for-assessment?month=${selectedMonth}&_t=${timestamp}`),
          fetch(`/api/data/health-checks/progress?month=${selectedMonth}&_t=${timestamp}`)
        ])
        
        const brandsData = await brandsRes.json()
        const progressData = await progressRes.json()
        
        console.log('🔍 [Health Check] Brands API Response:', {
          success: brandsData.success,
          dataLength: brandsData.data?.length,
          error: brandsData.error,
          statusCode: brandsRes.status
        })
        
        if (brandsData.success) {
          console.log('📊 Brands for assessment sample:', brandsData.data.slice(0, 2))
          console.log('📊 Total brands received:', brandsData.data.length)
          setBrandsForAssessment(brandsData.data)
          setFilteredBrands(brandsData.data)
        } else {
          console.error('❌ Failed to load brands:', brandsData.error)
        }
        
        if (progressData.success) {
          setProgress(progressData.data)
        } else {
          console.error('❌ Failed to load progress:', progressData.error)
        }
      } else if (activeTab === 'history') {
        // Load health check history
        const res = await fetch(`/api/data/health-checks?month=${selectedMonth}&limit=1000&_t=${timestamp}`)
        const data = await res.json()
        
        if (data.success) {
          setHealthChecks(data.data.data || [])
          setFilteredHealthChecks(data.data.data || [])
        }
      } else if (activeTab === 'statistics') {
        // Load statistics
        const res = await fetch(`/api/data/health-checks/statistics?month=${selectedMonth}&_t=${timestamp}`)
        const data = await res.json()
        
        if (data.success) {
          setStats(data.data)
        }
      }
    } catch (error) {
      console.error('Error loading health check data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleClearCache = async () => {
    try {
      setClearingCache(true)
      console.log('🗑️ Clearing cache...')
      
      const response = await fetch('/api/data/health-checks/clear-cache', {
        method: 'POST'
      })
      
      const data = await response.json()
      
      if (data.success) {
        console.log('✅ Cache cleared successfully')
        // Reload data immediately
        await loadData()
      } else {
        console.error('❌ Failed to clear cache:', data.error)
      }
    } catch (error) {
      console.error('❌ Error clearing cache:', error)
    } finally {
      setClearingCache(false)
    }
  }

  const handleBrandClick = (brand: Brand) => {
    setSelectedBrand(brand)
    setIsModalOpen(true)
  }

  const handleAssessmentSubmit = async (assessmentData: any) => {
    try {
      setIsSubmitting(true)
      
      // Get KAM name from user profile
      const kamName = userProfile?.fullName || 'Unknown';
      
      // Get brand_id from the selected brand object
      const brandId = selectedBrand?.id || selectedBrand?._id || selectedBrand?.brand_id || null;
      
      const response = await fetch('/api/data/health-checks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          brand_name: assessmentData.brand_name,
          brand_id: brandId,
          kam_name: kamName,
          kam_email: selectedBrand?.kam_email_id || userProfile?.email, // Changed from user?.email
          zone: selectedBrand?.zone || 'Unknown',
          team_name: userProfile?.teamName || null, // Changed from user?.team_name
          health_status: assessmentData.health_status,
          brand_nature: assessmentData.brand_nature,
          remarks: assessmentData.remarks || null,
          assessment_date: new Date().toISOString().split('T')[0],
          assessment_month: selectedMonth,
        }),
      })

      const data = await response.json()

      if (data.success) {
        // Remove the assessed brand from the pending list immediately
        setBrandsForAssessment(prev => prev.filter(b => b.brand_name !== assessmentData.brand_name))
        setFilteredBrands(prev => prev.filter(b => b.brand_name !== assessmentData.brand_name))
        
        // Update progress
        if (progress) {
          setProgress({
            ...progress,
            assessed_brands: progress.assessed_brands + 1,
            pending_brands: progress.pending_brands - 1,
            progress_percentage: Math.round(((progress.assessed_brands + 1) / progress.total_brands) * 100)
          })
        }
        
        // Reload all data to ensure consistency
        await loadData()
        
        alert('Health assessment submitted successfully!')
      } else {
        throw new Error(data.error || 'Failed to submit assessment')
      }
    } catch (error) {
      console.error('Error submitting assessment:', error)
      alert('Failed to submit assessment. Please try again.')
      throw error
    } finally {
      setIsSubmitting(false)
    }
  }

  // Removed if (authLoading) block

  if (!userProfile) { // Changed from '!user || !userProfile'
    return null
  }

  const getHealthStatusColor = (status: string) => {
    const statusLower = status?.toLowerCase() || ''
    if (statusLower.includes('healthy') || statusLower.includes('good')) return 'bg-green-100 text-green-800'
    if (statusLower.includes('warning') || statusLower.includes('moderate')) return 'bg-yellow-100 text-yellow-800'
    if (statusLower.includes('critical') || statusLower.includes('poor')) return 'bg-red-100 text-red-800'
    return 'bg-gray-100 text-gray-800'
  }

  return (
    <DashboardLayout userProfile={userProfile}>
      {selectedBrand && (
        <HealthCheckModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false)
            setSelectedBrand(null)
          }}
          brand={{
            brandName: selectedBrand.brand_name,
            kamName: userProfile?.fullName || '',
            zone: selectedBrand.zone || 'N/A',
          }}
          onSubmit={handleAssessmentSubmit}
          isSubmitting={isSubmitting}
        />
      )}
      
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-rose-500 to-red-500 rounded-xl flex items-center justify-center">
              <Heart className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Health Check-ups</h1>
              <p className="text-white/70">Monthly brand health assessment for {selectedMonth}</p>
            </div>
          </div>

          {/* Month Selector */}
          <div className="flex items-center space-x-2">
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
            />
            <button
              onClick={handleClearCache}
              disabled={clearingCache}
              className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-rose-500 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Clear cache and reload data"
            >
              {clearingCache ? '🔄' : '🗑️'} {clearingCache ? 'Clearing...' : 'Clear Cache'}
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex space-x-2 bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-2">
          <button
            onClick={() => setActiveTab('assessment')}
            className={`flex-1 px-4 py-2 rounded-lg transition-colors ${
              activeTab === 'assessment'
                ? 'bg-white/20 text-white border-2 border-rose-300'
                : 'text-white/70 hover:text-white hover:bg-white/5 border-2 border-transparent'
            }`}
          >
            📋 Assessment
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 px-4 py-2 rounded-lg transition-colors ${
              activeTab === 'history'
                ? 'bg-white/20 text-white border-2 border-rose-300'
                : 'text-white/70 hover:text-white hover:bg-white/5 border-2 border-transparent'
            }`}
          >
            📜 History
          </button>
          <button
            onClick={() => setActiveTab('statistics')}
            className={`flex-1 px-4 py-2 rounded-lg transition-colors ${
              activeTab === 'statistics'
                ? 'bg-white/20 text-white border-2 border-rose-300'
                : 'text-white/70 hover:text-white hover:bg-white/5 border-2 border-transparent'
            }`}
          >
            📊 Statistics
          </button>
        </div>

        {/* Assessment Tab */}
        {activeTab === 'assessment' && (
          <>
            {/* Progress Card */}
            {progress && (
              <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6">
                <h2 className="text-lg font-semibold text-white mb-4">Assessment Progress</h2>
                <div className="grid grid-cols-3 gap-4 text-center mb-4">
                  <div>
                    <div className="text-3xl font-bold text-white">{progress.total_brands}</div>
                    <div className="text-sm text-white/70">Total Brands</div>
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-green-400">{progress.assessed_brands}</div>
                    <div className="text-sm text-white/70">Completed</div>
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-yellow-400">{progress.pending_brands}</div>
                    <div className="text-sm text-white/70">Remaining</div>
                  </div>
                </div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-white/70">Complete</span>
                  <span className="text-2xl font-bold text-white">{progress.progress_percentage}%</span>
                </div>
                <div className="w-full bg-white/10 rounded-full h-3">
                  <div
                    className="bg-gradient-to-r from-rose-500 to-red-500 h-3 rounded-full transition-all duration-500"
                    style={{ width: `${progress.progress_percentage}%` }}
                  />
                </div>
              </div>
            )}

            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/50" />
              <input
                type="text"
                placeholder="Search brands..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>

            {/* Brands List */}
            <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-white">
                  Brands Pending Assessment ({filteredBrands.length})
                </h2>
                <p className="text-sm text-white/60">Click on a brand to start the health assessment</p>
              </div>

              {loading ? (
                <div className="text-center py-12 text-white/70">Loading brands...</div>
              ) : filteredBrands.length === 0 ? (
                <div className="text-center py-12">
                  <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
                  <p className="text-white text-lg">All brands assessed for this month!</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[600px] overflow-y-auto">
                  {filteredBrands.map((brand, index) => (
                    <div
                      key={index}
                      onClick={() => handleBrandClick(brand)}
                      className="bg-white/5 border border-white/10 rounded-lg p-4 hover:bg-white/10 hover:border-rose-500/50 transition-all cursor-pointer"
                    >
                      <div className="font-semibold text-white mb-2">{brand.brand_name}</div>
                      <div className="text-sm text-white/60 space-y-1">
                        {brand.zone && <div>📍 {brand.zone}</div>}
                        {brand.brand_nature && <div>🏢 {brand.brand_nature}</div>}
                        {brand.brand_state && <div>🗺️ {brand.brand_state}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <>
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/50" />
              <input
                type="text"
                placeholder="Search assessments..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>

            {/* History List */}
            <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6">
              <h2 className="text-lg font-semibold text-white mb-4">
                Assessment History ({filteredHealthChecks.length})
              </h2>

              {loading ? (
                <div className="text-center py-12 text-white/70">Loading history...</div>
              ) : filteredHealthChecks.length === 0 ? (
                <div className="text-center py-12">
                  <XCircle className="w-16 h-16 text-white/30 mx-auto mb-4" />
                  <p className="text-white/70">No assessments found for this month</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[600px] overflow-y-auto">
                  {filteredHealthChecks.map((check) => (
                    <div
                      key={check.check_id}
                      className="bg-white/5 border border-white/10 rounded-lg p-4 hover:bg-white/10 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="font-semibold text-white mb-1">{check.brand_name}</div>
                          <div className="text-sm text-white/60 space-y-1">
                            <div>📅 {new Date(check.assessment_date).toLocaleDateString()}</div>
                            {check.zone && <div>📍 {check.zone}</div>}
                            {check.notes && <div className="mt-2 text-white/50">💬 {check.notes}</div>}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getHealthStatusColor(check.health_status)}`}>
                            {check.health_status}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* Statistics Tab */}
        {activeTab === 'statistics' && (
          <>
            {loading ? (
              <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                <div className="text-gray-600">Loading statistics...</div>
              </div>
            ) : stats ? (
              <div className="space-y-8">
                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Total Assessments */}
                  <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-600">Total Assessments</span>
                      <div className="w-8 h-8 bg-rose-100 rounded-lg flex items-center justify-center">
                        <svg className="w-5 h-5 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                      </div>
                    </div>
                    <div className="text-4xl font-bold text-gray-900 mb-1">{stats.total}</div>
                    <div className="text-xs text-gray-500">For {selectedMonth}</div>
                  </div>

                  {/* Healthy Brands */}
                  <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-600">Healthy Brands</span>
                      <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      </div>
                    </div>
                    <div className="text-4xl font-bold text-gray-900 mb-1">
                      {(stats.byHealthStatus['Green'] || 0) + (stats.byHealthStatus['Amber'] || 0)}
                    </div>
                    <div className="text-xs text-gray-500">Green & Amber status</div>
                  </div>

                  {/* Critical Brands */}
                  <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-600">Critical Brands</span>
                      <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                        <AlertCircle className="w-5 h-5 text-red-500" />
                      </div>
                    </div>
                    <div className="text-4xl font-bold text-gray-900 mb-1">
                      {(stats.byHealthStatus['Orange'] || 0) + (stats.byHealthStatus['Red'] || 0)}
                    </div>
                    <div className="text-xs text-gray-500">Orange & Red status</div>
                  </div>
                </div>

                {/* Health Status Distribution */}
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <h3 className="text-base font-semibold text-gray-900 mb-6">Health Status Distribution</h3>
                  <div className="grid grid-cols-2 md:grid-cols-6 gap-6">
                    {/* Amber */}
                    <div className="text-center">
                      <div className="w-16 h-16 bg-amber-500 rounded-full mx-auto mb-3"></div>
                      <div className="text-2xl font-bold text-gray-900 mb-1">
                        {stats.byHealthStatus['Amber'] || 0}
                      </div>
                      <div className="text-xs text-gray-500">Amber</div>
                    </div>

                    {/* Dead */}
                    <div className="text-center">
                      <div className="w-16 h-16 bg-gray-900 rounded-full mx-auto mb-3"></div>
                      <div className="text-2xl font-bold text-gray-900 mb-1">
                        {stats.byHealthStatus['Dead'] || 0}
                      </div>
                      <div className="text-xs text-gray-500">Dead</div>
                    </div>

                    {/* Green */}
                    <div className="text-center">
                      <div className="w-16 h-16 bg-green-500 rounded-full mx-auto mb-3"></div>
                      <div className="text-2xl font-bold text-gray-900 mb-1">
                        {stats.byHealthStatus['Green'] || 0}
                      </div>
                      <div className="text-xs text-gray-500">Green</div>
                    </div>

                    {/* Not Connected */}
                    <div className="text-center">
                      <div className="w-16 h-16 bg-gray-500 rounded-full mx-auto mb-3"></div>
                      <div className="text-2xl font-bold text-gray-900 mb-1">
                        {stats.byHealthStatus['Not Connected'] || 0}
                      </div>
                      <div className="text-xs text-gray-500">Not Connected</div>
                    </div>

                    {/* Orange */}
                    <div className="text-center">
                      <div className="w-16 h-16 bg-orange-500 rounded-full mx-auto mb-3"></div>
                      <div className="text-2xl font-bold text-gray-900 mb-1">
                        {stats.byHealthStatus['Orange'] || 0}
                      </div>
                      <div className="text-xs text-gray-500">Orange</div>
                    </div>

                    {/* Red */}
                    <div className="text-center">
                      <div className="w-16 h-16 bg-red-500 rounded-full mx-auto mb-3"></div>
                      <div className="text-2xl font-bold text-gray-900 mb-1">
                        {stats.byHealthStatus['Red'] || 0}
                      </div>
                      <div className="text-xs text-gray-500">Red</div>
                    </div>
                  </div>
                </div>

                {/* Brand Nature Distribution */}
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <h3 className="text-base font-semibold text-gray-900 mb-6">Brand Nature Distribution</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* Active */}
                    <div className="text-center">
                      <div className="text-4xl font-bold text-gray-900 mb-2">
                        {stats.byBrandNature['Active'] || 0}
                      </div>
                      <div className="text-sm text-gray-600 mb-1">Active</div>
                      <div className="text-xs text-gray-400">
                        {stats.total > 0 ? Math.round(((stats.byBrandNature['Active'] || 0) / stats.total) * 100) : 0}%
                      </div>
                    </div>

                    {/* Hyper Active */}
                    <div className="text-center">
                      <div className="text-4xl font-bold text-gray-900 mb-2">
                        {stats.byBrandNature['Hyper Active'] || 0}
                      </div>
                      <div className="text-sm text-gray-600 mb-1">Hyper Active</div>
                      <div className="text-xs text-gray-400">
                        {stats.total > 0 ? Math.round(((stats.byBrandNature['Hyper Active'] || 0) / stats.total) * 100) : 0}%
                      </div>
                    </div>

                    {/* Inactive */}
                    <div className="text-center">
                      <div className="text-4xl font-bold text-gray-900 mb-2">
                        {stats.byBrandNature['Inactive'] || 0}
                      </div>
                      <div className="text-sm text-gray-600 mb-1">Inactive</div>
                      <div className="text-xs text-gray-400">
                        {stats.total > 0 ? Math.round(((stats.byBrandNature['Inactive'] || 0) / stats.total) * 100) : 0}%
                      </div>
                    </div>
                  </div>
                </div>

                {/* Agent-wise Statistics (Team Lead & Admin only) */}
                {stats.byAgent && stats.byAgent.length > 0 && (
                  <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <h3 className="text-base font-semibold text-gray-900 mb-6">Agent-wise Performance</h3>
                    <div className="space-y-6 max-h-[600px] overflow-y-auto">
                      {(() => {
                        // Group agents by team for Admin view
                        const agentsByTeam = stats.byAgent.reduce((acc, agent) => {
                          const team = agent.team_name || 'No Team';
                          if (!acc[team]) acc[team] = [];
                          acc[team].push(agent);
                          return acc;
                        }, {} as Record<string, typeof stats.byAgent>);

                        return Object.entries(agentsByTeam).map(([teamName, teamAgents]) => (
                          <div key={teamName} className="space-y-4">
                            {/* Team Header (only show for Admin with multiple teams) */}
                            {Object.keys(agentsByTeam).length > 1 && (
                              <div className="flex items-center space-x-2 mb-3">
                                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>
                                <h4 className="text-sm font-semibold text-gray-700 px-3 py-1 bg-gray-100 rounded-full">
                                  {teamName}
                                </h4>
                                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>
                              </div>
                            )}
                            
                            {/* Agents in this team */}
                            {teamAgents.map((agent, index) => (
                              <div
                                key={agent.kam_email}
                                className="bg-gray-50 rounded-lg p-4 border border-gray-200 hover:border-rose-300 transition-colors"
                              >
                                {/* Agent Header */}
                                <div className="flex items-center justify-between mb-4">
                                  <div>
                                    <div className="font-semibold text-gray-900">{agent.kam_name}</div>
                                    <div className="text-sm text-gray-500">{agent.kam_email}</div>
                                    <div className="flex items-center space-x-2 mt-1">
                                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                        Agent
                                      </span>
                                      {agent.team_name && (
                                        <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">
                                          {agent.team_name}
                                        </span>
                                      )}
                                      <span className="text-xs text-gray-600">
                                        {agent.total} Assessments
                                      </span>
                                      <span className="text-xs text-yellow-600 bg-yellow-50 px-2 py-1 rounded">
                                        {agent.pendingAssessments} Pending
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                {/* Agent Metrics Grid */}
                                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
                                  {/* Total Brands */}
                                  <div className="text-center p-3 bg-white rounded-lg border border-gray-100">
                                    <div className="text-xs text-gray-500 mb-1">📊 Total Brands</div>
                                    <div className="text-2xl font-bold text-gray-900 mb-1">
                                      {agent.totalBrands}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                      Assigned
                                    </div>
                                  </div>

                                  {/* Health Status */}
                                  <div className="text-center p-3 bg-white rounded-lg border border-gray-100">
                                    <div className="text-xs text-gray-500 mb-1">🟢 Health Status</div>
                                    <div className="space-y-1">
                                      {Object.entries(agent.byHealthStatus).map(([status, count]) => (
                                        <div key={status} className="flex justify-between text-xs">
                                          <span className="text-gray-600">{status}:</span>
                                          <span className="font-semibold text-gray-900">{count}</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>

                                  {/* Brand Nature */}
                                  <div className="text-center p-3 bg-white rounded-lg border border-gray-100">
                                    <div className="text-xs text-gray-500 mb-1">🏢 Brand Nature</div>
                                    <div className="space-y-1">
                                      {Object.entries(agent.byBrandNature).map(([nature, count]) => (
                                        <div key={nature} className="flex justify-between text-xs">
                                          <span className="text-gray-600">{nature}:</span>
                                          <span className="font-semibold text-gray-900">{count}</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>

                                  {/* Key Metrics */}
                                  <div className="text-center p-3 bg-white rounded-lg border border-gray-100">
                                    <div className="text-xs text-gray-500 mb-1">📊 Key Metrics</div>
                                    <div className="space-y-1">
                                      <div className="flex justify-between text-xs">
                                        <span className="text-red-600">Critical Brands:</span>
                                        <span className="font-semibold text-red-900">{agent.criticalBrands}</span>
                                      </div>
                                      <div className="flex justify-between text-xs">
                                        <span className="text-green-600">Healthy Brands:</span>
                                        <span className="font-semibold text-green-900">{agent.healthyBrands}</span>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Connectivity Rate */}
                                  <div className="text-center p-3 bg-white rounded-lg border border-gray-100">
                                    <div className="text-xs text-gray-500 mb-1">📡 Connectivity Rate</div>
                                    <div className="text-2xl font-bold text-gray-900 mb-1">
                                      {agent.connectivityRate}%
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-2">
                                      <div
                                        className="bg-gradient-to-r from-rose-500 to-red-500 h-2 rounded-full transition-all"
                                        style={{ width: `${agent.connectivityRate}%` }}
                                      />
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ));
                      })()}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                <XCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600">No statistics available for this month</p>
              </div>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  )
}
