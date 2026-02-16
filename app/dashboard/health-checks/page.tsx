'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import DashboardLayout from '@/components/Layout/DashboardLayout'
import { Heart, Search, CheckCircle, Clock, AlertTriangle, Filter } from 'lucide-react'
import HealthCheckModal from '@/components/HealthCheckModal'
import { motion, AnimatePresence } from 'framer-motion'

export default function HealthChecksPage() {
  const router = useRouter()
  const { user, userProfile, loading: authLoading } = useAuth()
  const [brands, setBrands] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedBrand, setSelectedBrand] = useState<any>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [stats, setStats] = useState<any>(null)

  const loadData = useCallback(async () => {
    if (!user?.email) return

    try {
      setLoading(true)
      const currentMonth = new Date().toISOString().slice(0, 7)

      const [brandsRes, statsRes] = await Promise.all([
        fetch(`/api/data/health-checks/brands-for-assessment?email=${encodeURIComponent(user.email)}&month=${currentMonth}`),
        fetch(`/api/data/health-checks/progress?email=${encodeURIComponent(user.email)}&month=${currentMonth}`)
      ])

      const brandsData = await brandsRes.json()
      const statsData = await statsRes.json()

      if (brandsData.success) {
        setBrands(brandsData.data)
      }

      if (statsData.success) {
        setStats(statsData.data)
      }
    } catch (error) {
      console.error('Error loading health check data:', error)
    } finally {
      setLoading(false)
    }
  }, [user?.email])

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    } else if (!authLoading && user) {
      loadData()
    }
  }, [user, authLoading, router, loadData]);

  const handleOpenModal = (brand: any) => {
    setSelectedBrand({
      brandName: brand.brand_name || brand.brandName,
      kamName: brand.kam_name || brand.kamName,
      zone: brand.zone
    })
    setIsModalOpen(true)
  }

  const handleSubmitAssessment = async (data: any) => {
    try {
      setSubmitting(true)
      const response = await fetch('/api/data/health-checks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          brand_id: brands.find(b => (b.brand_name || b.brandName) === data.brand_name)?.id,
          assessment_month: new Date().toISOString().slice(0, 7),
          assessment_date: new Date().toISOString().slice(0, 10),
          kam_name: userProfile?.full_name,
          kam_email: user?.email,
          zone: selectedBrand?.zone || 'Unknown',
          team_name: userProfile?.team_name
        })
      })

      const result = await response.json()
      if (result.success) {
        await loadData()
        setIsModalOpen(false)
      } else {
        alert('Failed to submit assessment: ' + (result.detail || result.error))
      }
    } catch (error) {
      console.error('Error submitting assessment:', error)
      alert('Error submitting assessment')
    } finally {
      setSubmitting(false)
    }
  }

  const filteredBrands = brands.filter(brand =>
    (brand.brand_name || brand.brandName || '').toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-secondary-800 text-xl">Loading...</div>
      </div>
    )
  }

  if (!user || !userProfile) return null

  return (
    <DashboardLayout userProfile={userProfile}>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-secondary-800 flex items-center gap-3">
              <Heart className="w-8 h-8 text-rose-500 fill-rose-500" />
              Health Check-ups
            </h1>
            <p className="text-secondary-600 mt-1">Monthly brand health assessment for {new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}</p>
          </div>

          {stats && (
            <div className="flex items-center gap-4">
              <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex items-center gap-3">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider">Assessed</p>
                  <p className="text-xl font-bold text-gray-900">{stats.assessed_brands} / {stats.total_brands}</p>
                </div>
              </div>
              <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold">
                  {stats.progress_percentage}%
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider">Progress</p>
                  <div className="w-24 h-2 bg-gray-200 rounded-full mt-1">
                    <div
                      className="h-full bg-blue-500 rounded-full"
                      style={{ width: `${stats.progress_percentage}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Search and Filters */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-col md:flex-row gap-4 items-center">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search brands needing assessment..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div className="flex items-center gap-2 w-full md:w-auto">
            <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors w-full md:w-auto justify-center">
              <Filter className="w-4 h-4" />
              <span>Filters</span>
            </button>
          </div>
        </div>

        {/* Brand Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm animate-pulse">
                <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-1/3 mb-6"></div>
                <div className="h-10 bg-gray-200 rounded w-full"></div>
              </div>
            ))}
          </div>
        ) : filteredBrands.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredBrands.map((brand) => (
              <motion.div
                key={brand.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between mb-4">
                    <h3 className="text-xl font-bold text-gray-900 leading-tight">
                      {brand.brand_name || brand.brandName}
                    </h3>
                    <div className="bg-rose-50 text-rose-600 p-2 rounded-lg">
                      <Clock className="w-5 h-5" />
                    </div>
                  </div>

                  <div className="space-y-2 mb-6">
                    <div className="flex items-center text-sm text-gray-600">
                      <span className="w-20 font-medium">Zone:</span>
                      <span>{brand.zone}</span>
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <span className="w-20 font-medium">Outlets:</span>
                      <span>{brand.outlet_counts || 0}</span>
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <span className="w-20 font-medium">State:</span>
                      <span>{brand.brand_state}</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => handleOpenModal(brand)}
                  className="w-full py-3 bg-gradient-to-r from-primary-600 to-indigo-600 hover:from-primary-700 hover:to-indigo-700 text-white rounded-xl font-semibold transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
                >
                  <Heart className="w-4 h-4" />
                  Assess Health
                </button>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-xl p-12 text-center border border-gray-200 shadow-sm">
            <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-10 h-10 text-green-500" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">All Caught Up!</h2>
            <p className="text-gray-600">
              {searchTerm
                ? `No brands found matching "${searchTerm}"`
                : "All your brands have been assessed for this month."}
            </p>
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="mt-4 text-primary-600 font-medium hover:underline"
              >
                Clear Search
              </button>
            )}
          </div>
        )}
      </div>

      {selectedBrand && (
        <HealthCheckModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          brand={selectedBrand}
          onSubmit={handleSubmitAssessment}
          isSubmitting={submitting}
        />
      )}
    </DashboardLayout>
  )
}
