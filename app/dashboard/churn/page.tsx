'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { api } from '@/lib/api'
import { convexAPI } from '@/lib/convex-api'
import DashboardLayout from '@/components/Layout/DashboardLayout'
import Pagination from '@/components/Pagination'
import SimpleChurnReasonModal from '@/components/SimpleChurnReasonModal'
import ChurnReasonModal from '@/components/ChurnReasonModal'
import ChurnCSVUploadModal from '@/components/ChurnCSVUploadModal'
import ChurnAnalyticsDashboard from '@/components/ChurnAnalyticsDashboard'
import { formatDDMMYYYYToMMMFormat } from '@/utils/dateUtils'
import { TrendingDown, Search, Filter, Upload, BarChart3 } from 'lucide-react'
import { 
  COMPLETED_CHURN_REASONS, 
  ACTIVE_FOLLOW_UP_REASONS,
  isNoAgentResponse,
  isCompletedReason 
} from '@/lib/constants/churnReasons'
import { Suspense } from 'react'

interface User {
  email: string;
  full_name: string;
  role: string;
  team_name?: string;
  permissions: string[];
}

interface ChurnRecord {
  id?: string
  _id?: string // Legacy Convex field
  _creationTime?: number
  date: string
  rid: string
  restaurant_name: string
  owner_email: string
  kam: string
  sync_days: string
  zone: string
  controlled_status: string
  churn_reason?: string
  remarks?: string
  mail_sent_confirmation?: boolean
  date_time_filled?: string
  // Follow-up fields
  follow_up_status?: string
  is_follow_up_active?: boolean
  next_reminder_time?: string
  current_call?: number
  call_attempts?: Array<{
    call_number: number
    call_response: string
    churn_reason: string
    notes?: string
    timestamp: string
  }>
}

interface Categorization {
  newCount: number
  overdue: number
  followUps: number
  completed: number
}

interface PaginationInfo {
  page: number
  limit: number
  total: number
  total_pages: number
  has_next: boolean
  has_prev: boolean
  missing_churn_reasons?: number
  categorization?: Categorization
}

export default function ChurnDataPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-secondary-600">Loading churn page...</p>
        </div>
      </div>
    }>
      <ChurnDataContent />
    </Suspense>
  )
}

function ChurnDataContent() {
  const { user, userProfile, loading: authLoading } = useAuth()
  const [records, setRecords] = useState<ChurnRecord[]>([])
  const [allRecords, setAllRecords] = useState<ChurnRecord[]>([]) // Store all records for filtering
  const [activeFilter, setActiveFilter] = useState<string>('overdue') // Track active filter
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 1000, // Increased to show all records
    total: 0,
    total_pages: 0,
    has_next: false,
    has_prev: false,
    missing_churn_reasons: 0,
    categorization: {
      newCount: 0,
      overdue: 0,
      followUps: 0,
      completed: 0
    }
  })
  const [completedFollowUpsCount, setCompletedFollowUpsCount] = useState(0)
  const [activeFollowUpsCount, setActiveFollowUpsCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [allCategoryStats, setAllCategoryStats] = useState<Categorization | null>(null) // Stats across all categories for search
  const [selectedRecord, setSelectedRecord] = useState<ChurnRecord | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false)
  const [showAnalytics, setShowAnalytics] = useState(false) // DISABLED: Keep analytics hidden for now
  const router = useRouter()
  const searchParams = useSearchParams()

  // Handle filter change - now passes filter to backend
  const handleFilterChange = (filterType: string) => {
    setActiveFilter(filterType);
    // Load data with the new filter from backend
    loadData(1, searchTerm.trim() === '' ? undefined : searchTerm.trim(), filterType);
  };

  // Add search handler - removed debouncing, now manual trigger only
  const handleSearchSubmit = async () => {
    // Keep the current filter when searching
    const trimmedSearch = searchTerm.trim()
    
    // If there's a search term, fetch stats for each category separately
    if (trimmedSearch !== '' && user && userProfile) {
      try {
        console.log('🔍 Fetching stats for search:', trimmedSearch);
        
        // Fetch counts for each category in parallel
        const [newResponse, overdueResponse, followUpsResponse, completedResponse] = await Promise.all([
          convexAPI.getChurnData({
            page: 1,
            limit: 1,
            email: user.email,
            filter: 'newCount',
            search: trimmedSearch
          }),
          convexAPI.getChurnData({
            page: 1,
            limit: 1,
            email: user.email,
            filter: 'overdue',
            search: trimmedSearch
          }),
          convexAPI.getChurnData({
            page: 1,
            limit: 1,
            email: user.email,
            filter: 'followUps',
            search: trimmedSearch
          }),
          convexAPI.getChurnData({
            page: 1,
            limit: 1,
            email: user.email,
            filter: 'completed',
            search: trimmedSearch
          })
        ]);
        
        const calculatedStats = {
          newCount: newResponse.data.total || 0,
          overdue: overdueResponse.data.total || 0,
          followUps: followUpsResponse.data.total || 0,
          completed: completedResponse.data.total || 0
        };
        
        console.log('📊 Calculated Stats from separate calls:', calculatedStats);
        setAllCategoryStats(calculatedStats)
      } catch (error) {
        console.error('Failed to fetch all category stats:', error)
      }
    } else {
      setAllCategoryStats(null)
    }
    
    loadData(1, trimmedSearch === '' ? undefined : trimmedSearch, activeFilter)
  }
  
  // Helper function to calculate stats from records
  const calculateStatsFromRecords = (recordsList: ChurnRecord[]) => {
    const now = new Date();
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);

    let newCount = 0;
    let overdue = 0;
    let followUps = 0;
    let completed = 0;

    recordsList.forEach(record => {
      const churnReason = record.churn_reason || '';
      const recordDate = new Date(record.date);
      
      // Use centralized helper functions
      const noResponse = isNoAgentResponse(churnReason);
      const isCompleted = isCompletedReason(churnReason);

      // Debug logging
      console.log('🔍 Record:', record.rid, 'Churn Reason:', `"${churnReason}"`, 'Is Completed:', isCompleted, 'No Agent Response:', noResponse);

      // Completed
      if (isCompleted) {
        completed++;
      }
      // New Count (last 3 days, no agent response)
      else if (recordDate >= threeDaysAgo && noResponse) {
        newCount++;
      }
      // Overdue (more than 3 days, no agent response)
      else if (recordDate < threeDaysAgo && noResponse) {
        overdue++;
      }
      // Follow Ups (has real churn reason but not completed)
      else if (!noResponse && !isCompleted) {
        followUps++;
      }
    });

    console.log('📊 Calculated Stats:', { newCount, overdue, followUps, completed });
    return { newCount, overdue, followUps, completed };
  }
  
  const handleClearFilters = () => {
    // Clear search term but keep the current filter
    setSearchTerm('')
    setAllCategoryStats(null) // Clear the all category stats
    loadData(1, undefined, activeFilter)
  }
  
  const handleSearchKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearchSubmit()
    }
  }

  const loadData = async (page: number = 1, searchQuery?: string, filterType: string = 'all') => {
    if (!user || !userProfile) {
      console.log('❌ No user or userProfile, cannot load data')
      return
    }

    setLoading(true)
    
    // Add timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      console.error('❌ Loading timeout - forcing completion')
      setLoading(false)
      alert('Loading is taking too long. Please refresh the page or check your connection.')
    }, 10000) // Reduced to 10 seconds
    
    try {
      // Use the provided searchQuery if available, otherwise don't search
      const finalSearchParam = searchQuery !== undefined ? searchQuery : null
      
      const convexParams: any = {
        page, 
        limit: 1000, // Increased to show all records
        email: user.email,
        filter: filterType // Pass filter to backend
      }
      
      // Only add search parameter if we have a non-empty search term
      if (finalSearchParam && finalSearchParam.trim() !== '') {
        convexParams.search = finalSearchParam.trim()
      }
      
      console.log('🔄 Loading churn data from Convex for:', user.email, 'with filter:', filterType)
      
      // Load data from Convex instead of Google Sheets API
      const churnResponse = await convexAPI.getChurnData(convexParams).catch(err => {
        console.error('❌ Convex Churn failed:', err)
        throw err
      })
      
      console.log('🔍 Churn Response Structure:', churnResponse);
      console.log('🔍 Actual Data:', churnResponse.data);
      console.log('🔍 Categorization:', churnResponse.data?.categorization);
      
      console.log('✅ Convex responses received:', {
        churn: churnResponse.data?.data?.length || 0
      })
      
      // Load completed follow-ups count (calculate from records)
      try {
        // Calculate completed count from current records using centralized helper
        const completedCount = (churnResponse.data.data || []).filter((record: any) => {
          return isCompletedReason(record.churn_reason);
        }).length;
        
        setCompletedFollowUpsCount(completedCount);
      } catch (error) {
        console.error('❌ Failed to calculate completed follow-ups count:', error);
        setCompletedFollowUpsCount(0);
      }
      
      // Load active follow-ups count (calculate from records since API might not be updated)
      try {
        // Calculate active count from current records using centralized helpers
        const activeCount = (churnResponse.data.data || []).filter((record: any) => {
          const churnReason = record.churn_reason || '';
          
          // If it's a completed reason, it's not active
          if (isCompletedReason(churnReason)) {
            return false;
          }
          
          // If it's an active follow-up reason, check if it's actually active (not waiting for reminder)
          if (ACTIVE_FOLLOW_UP_REASONS.includes(churnReason as any)) {
            // If it has a next_reminder_time, check if it has passed
            if (record.next_reminder_time) {
              const reminderTime = new Date(record.next_reminder_time);
              const now = new Date();
              return reminderTime <= now; // Only active if reminder time has passed
            }
            // If no reminder time set, consider it active (new record)
            return !record.call_attempts || record.call_attempts.length === 0;
          }
          
          // For records without churn reason, only active if no reminder pending
          if (isNoAgentResponse(churnReason)) {
            if (record.next_reminder_time) {
              const reminderTime = new Date(record.next_reminder_time);
              const now = new Date();
              return reminderTime <= now;
            }
            return true;
          }
          
          return false;
        }).length;
        
        setActiveFollowUpsCount(activeCount);
      } catch (error) {
        console.error('❌ Failed to calculate active follow-ups count:', error);
        setActiveFollowUpsCount(0);
      }
      
      // Use backend categorization directly - don't recalculate on frontend
      console.log('📊 Using backend categorization:', churnResponse.data.categorization);
      
      // Backend now returns pre-filtered data, so just use it directly
      setRecords(churnResponse.data.data || [])
      setAllRecords(churnResponse.data.data || []) // Store all records for filtering
      
      // The Convex response is wrapped in { data: result }, so we need to access the actual result
      const actualResult = churnResponse.data;
      
      setPagination({
        page: actualResult.page || 1,
        limit: actualResult.limit || 1000, // Increased to show all records
        total: actualResult.total || 0,
        total_pages: actualResult.total_pages || 0,
        has_next: actualResult.has_next || false,
        has_prev: actualResult.has_prev || false,
        missing_churn_reasons: actualResult.missing_churn_reasons || 0,
        // Use backend categorization directly
        categorization: actualResult.categorization || {
          newCount: 0,
          overdue: 0,
          followUps: 0,
          completed: 0
        }
      })
      
    } catch (error: any) {
      console.error('❌ Failed to load data from Convex:', error)
      // Show error state instead of infinite loading
      alert(`Failed to load churn data: ${error?.message || error}`)
    } finally {
      clearTimeout(timeoutId) // Clear the timeout
      console.log('✅ Setting loading to false')
      setLoading(false)
    }
  }

  useEffect(() => {
    const checkAuth = async () => {
      try {
        console.log('🔍 Checking authentication...')
        
        if (authLoading) {
          console.log('⏳ Auth still loading...')
          return
        }

        if (!user || !userProfile) {
          console.log('❌ No user found, redirecting to login')
          router.push('/login')
          return
        }

        console.log('✅ User found:', user.email)
        
        await loadData(1, undefined, activeFilter)
        
        // Check if there's a RID parameter to open specific modal
        const ridParam = searchParams.get('rid')
        if (ridParam) {
          // Find the record with matching RID and open modal
          const targetRecord = records.find(record => record.rid === ridParam)
          if (targetRecord) {
            setSelectedRecord(targetRecord)
            setIsModalOpen(true)
          } else {
            // If record not found in current page, search for it
            console.log(`Looking for RID ${ridParam} in all records...`)
          }
        }
      } catch (error) {
        console.error('❌ Auth check failed:', error)
        setLoading(false)
      }
    }

    checkAuth()
  }, [user, userProfile, authLoading, router])

  // Handle RID parameter from notifications - simplified
  useEffect(() => {
    const ridParam = searchParams.get('rid')
    if (ridParam && records.length > 0) {
      const targetRecord = records.find(record => record.rid === ridParam)
      if (targetRecord) {
        setSelectedRecord(targetRecord)
        setIsModalOpen(true)
        // Clear the RID parameter from URL after opening modal
        const newUrl = new URL(window.location.href)
        newUrl.searchParams.delete('rid')
        window.history.replaceState({}, '', newUrl.toString())
      }
    }
  }, [records]) // Only depend on records, not searchParams

  const handlePageChange = (newPage: number) => {
    // Preserve current search and filter when changing pages
    const currentSearch = searchTerm.trim() === '' ? undefined : searchTerm.trim()
    loadData(newPage, currentSearch, activeFilter)
  }

  const handleRidClick = (record: ChurnRecord) => {
    console.log('🔍 RID clicked:', record.rid, record.restaurant_name)
    console.log('📋 Record data:', record)
    
    // Show immediate feedback
    
    try {
      setSelectedRecord(record)
      setIsModalOpen(true)
      console.log('✅ Modal should be opening...')
    } catch (error: any) {
      console.error('❌ Error in handleRidClick:', error)
      alert(`Error opening modal for RID ${record.rid}: ${error?.message || 'Unknown error'}`)
    }
  }

  const handleChurnReasonSelect = async (reason: string, remarks: string, mailSentConfirmation?: boolean) => {
    if (!selectedRecord || !user) return

    try {
      // Update via Convex instead of API
      await convexAPI.updateChurnReason(selectedRecord.rid, reason, remarks, mailSentConfirmation, user.email)
      
      // Show success message (you can add a toast notification here)
      console.log(`✅ Updated churn reason for RID ${selectedRecord.rid} via Convex`)
      
      // Close the modal immediately to prevent showing stale data
      setIsModalOpen(false)
      
      // Add a longer delay to ensure the mutation is fully processed and propagated
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Force a complete page refresh to bypass all caching
      window.location.reload()
      
    } catch (error) {
      console.error('Failed to update churn reason:', error)
      alert('Failed to update churn reason. Please try again.')
    }
  }

  const getChurnReasonColor = (reason: string) => {
    if (!reason) return 'bg-gray-100 text-gray-800'
    
    // Use centralized constants for checking
    const reasonLower = reason.toLowerCase();
    
    // Check completed reasons
    if (isCompletedReason(reason)) {
      switch (reasonLower) {
        case 'permanently closed (outlet/brand)': return 'bg-red-100 text-red-800'
        case 'outlet once out of sync- now active': return 'bg-blue-100 text-blue-800'
        case 'temporarily closed (renovation / relocation/internet issue)': return 'bg-yellow-100 text-yellow-800'
        case 'renewal payment overdue': return 'bg-yellow-100 text-yellow-800'
        case 'switched to another pos': return 'bg-pink-100 text-pink-800'
        case 'ownership transferred': return 'bg-purple-100 text-purple-800'
        case 'event account / demo account': return 'bg-green-100 text-green-800'
        default: return 'bg-blue-100 text-blue-800'
      }
    }
    
    // Check active follow-up reasons
    if (ACTIVE_FOLLOW_UP_REASONS.includes(reason as any)) {
      return reason === "I don't know" ? 'bg-gray-100 text-gray-800' : 'bg-orange-100 text-orange-800'
    }
    
    return 'bg-purple-100 text-purple-800'
  }

  const handleUploadComplete = () => {
    // Reload data after successful upload with current filter
    loadData(pagination.page, searchTerm.trim() === '' ? undefined : searchTerm.trim(), activeFilter)
    setIsUploadModalOpen(false)
  }

  const getFollowUpStatus = (record: ChurnRecord) => {
    const churnReason = record.churn_reason || '';
    
    // Debug logging for specific RIDs
    if (record.rid === '343861' || record.rid === '343097') {
      console.log(`🔍 DEBUG RID ${record.rid}:`, {
        churn_reason: churnReason,
        next_reminder_time: record.next_reminder_time,
        follow_up_status: record.follow_up_status,
        is_follow_up_active: record.is_follow_up_active,
        call_attempts: record.call_attempts?.length || 0,
        current_time: new Date().toISOString()
      });
    }
    
    // First check if churn reason indicates completed status using centralized helper
    if (isCompletedReason(churnReason)) {
      return { active: false, label: 'Completed', color: 'bg-blue-100 text-blue-800' }
    }
    
    // Then check for active reasons with 24-hour waiting period logic
    if (ACTIVE_FOLLOW_UP_REASONS.includes(churnReason as any)) {
      // Check if there's a reminder time set (indicating waiting period)
      if (record.next_reminder_time) {
        const reminderTime = new Date(record.next_reminder_time);
        const now = new Date();
        
        if (reminderTime > now) {
          // Still waiting for reminder time - should be INACTIVE
          if (record.rid === '343861' || record.rid === '343097') {
            console.log(`🔍 RID ${record.rid} should be INACTIVE - waiting for reminder`);
          }
          return { active: false, label: 'Inactive', color: 'bg-gray-100 text-gray-800' }
        } else {
          // Reminder time has passed - should be ACTIVE
          if (record.rid === '343861' || record.rid === '343097') {
            console.log(`🔍 RID ${record.rid} should be ACTIVE - reminder time passed`);
          }
          return { active: true, label: 'Active', color: 'bg-green-100 text-green-800' }
        }
      }
      
      // No reminder time set - check if it's a new record or has call attempts
      if (!record.call_attempts || record.call_attempts.length === 0) {
        // New record without calls - should be ACTIVE
        if (record.rid === '343861' || record.rid === '343097') {
          console.log(`🔍 RID ${record.rid} should be ACTIVE - new record without calls`);
        }
        return { active: true, label: 'Active', color: 'bg-green-100 text-green-800' }
      } else {
        // Has call attempts but no reminder time - might be an old record, default to ACTIVE
        if (record.rid === '343861' || record.rid === '343097') {
          console.log(`🔍 RID ${record.rid} should be ACTIVE - has calls but no reminder time`);
        }
        return { active: true, label: 'Active', color: 'bg-green-100 text-green-800' }
      }
    }
    
    // For records without churn reason (using centralized helper)
    if (isNoAgentResponse(churnReason)) {
      // Check reminder time if available
      if (record.next_reminder_time) {
        const reminderTime = new Date(record.next_reminder_time);
        const now = new Date();
        
        if (reminderTime > now) {
          return { active: false, label: 'Inactive', color: 'bg-gray-100 text-gray-800' }
        }
      }
      return { active: true, label: 'Active', color: 'bg-green-100 text-green-800' }
    }
    
    // Default fallback
    return { active: false, label: 'Inactive', color: 'bg-gray-100 text-gray-800' }
  }

  // Check if user can upload CSV (BO Team or Admin)
  const canUploadCSV = userProfile?.role === 'admin' || 
                      userProfile?.team_name?.toLowerCase() === 'bo' ||
                      userProfile?.team_name?.toLowerCase() === 'bo team'

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-secondary-600">Checking authentication...</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-secondary-600">Loading churn data...</p>
        </div>
      </div>
    )
  }

  if (!userProfile) return null

  return (
    <>
      <DashboardLayout userProfile={userProfile}>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <TrendingDown className="w-8 h-8 text-red-600" />
              <div>
                <h1 className="text-2xl font-bold text-secondary-800">Customer Churn</h1>
                <p className="text-secondary-600">Track and analyze customer churn patterns</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              {/* DISABLED: Analytics button temporarily hidden
              <button
                onClick={() => setShowAnalytics(!showAnalytics)}
                className={`inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors ${
                  showAnalytics 
                    ? 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 focus:ring-gray-500'
                }`}
              >
                <BarChart3 className="w-4 h-4 mr-2" />
                {showAnalytics ? 'Hide Analytics' : 'Show Analytics'}
              </button>
              */}
              {canUploadCSV && (
                <button
                  onClick={() => setIsUploadModalOpen(true)}
                  className="inline-flex items-center px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Upload CSV
                </button>
              )}
              <div className="flex items-center space-x-2 text-sm text-secondary-600">
                <span>Page {pagination.page} of {pagination.total_pages}</span>
                <span>•</span>
                <span>{pagination.total} total records</span>
              </div>
            </div>
          </div>

          {/* DISABLED: Analytics Dashboard - Temporarily hidden
          {showAnalytics && <ChurnAnalyticsDashboard />}
          */}

          {/* Summary Boxes - 4 Section Categorization (Clickable) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* New Count Box (Last 3 Days, No Agent Response) */}
            <div 
              className={`card p-6 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 cursor-pointer transition-all duration-200 hover:shadow-lg ${activeFilter === 'newCount' ? 'ring-2 ring-blue-500 shadow-lg' : ''}`}
              onClick={() => handleFilterChange('newCount')}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-600 uppercase tracking-wide">New Count</p>
                  <p className="mt-2 text-4xl font-bold text-blue-900">
                    {allCategoryStats ? allCategoryStats.newCount : (pagination.categorization?.newCount || 0)}
                  </p>
                  <p className="mt-1 text-sm text-blue-700">Last 3 days, no agent response</p>
                  {activeFilter === 'newCount' && (
                    <p className="mt-1 text-xs text-blue-600 font-medium">📋 Showing filtered records</p>
                  )}
                </div>
                <div className="p-3 bg-blue-500 rounded-full">
                  <span className="text-white text-2xl">🆕</span>
                </div>
              </div>
            </div>

            {/* Overdue Box (>3 Days, No Agent Action) */}
            <div 
              className={`card p-6 bg-gradient-to-br from-red-50 to-red-100 border-red-200 cursor-pointer transition-all duration-200 hover:shadow-lg ${activeFilter === 'overdue' ? 'ring-2 ring-red-500 shadow-lg' : ''}`}
              onClick={() => handleFilterChange('overdue')}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-red-600 uppercase tracking-wide">Overdue</p>
                  <p className="mt-2 text-4xl font-bold text-red-900">
                    {allCategoryStats ? allCategoryStats.overdue : (pagination.categorization?.overdue || 0)}
                  </p>
                  <p className="mt-1 text-sm text-red-700">More than 3 days, no action</p>
                  {activeFilter === 'overdue' && (
                    <p className="mt-1 text-xs text-red-600 font-medium">📋 Showing filtered records</p>
                  )}
                </div>
                <div className="p-3 bg-red-500 rounded-full">
                  <span className="text-white text-2xl">⚠️</span>
                </div>
              </div>
            </div>

            {/* Follow Ups Box (In Progress) */}
            <div 
              className={`card p-6 bg-gradient-to-br from-green-50 to-green-100 border-green-200 cursor-pointer transition-all duration-200 hover:shadow-lg ${activeFilter === 'followUps' ? 'ring-2 ring-green-500 shadow-lg' : ''}`}
              onClick={() => handleFilterChange('followUps')}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-600 uppercase tracking-wide">Follow Ups</p>
                  <p className="mt-2 text-4xl font-bold text-green-900">
                    {allCategoryStats ? allCategoryStats.followUps : (pagination.categorization?.followUps || 0)}
                  </p>
                  <p className="mt-1 text-sm text-green-700">Records in progress</p>
                  {activeFilter === 'followUps' && (
                    <p className="mt-1 text-xs text-green-600 font-medium">📋 Showing filtered records</p>
                  )}
                </div>
                <div className="p-3 bg-green-500 rounded-full">
                  <span className="text-white text-2xl">📞</span>
                </div>
              </div>
            </div>

            {/* Completed Box */}
            <div 
              className={`card p-6 bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200 cursor-pointer transition-all duration-200 hover:shadow-lg ${activeFilter === 'completed' ? 'ring-2 ring-purple-500 shadow-lg' : ''}`}
              onClick={() => handleFilterChange('completed')}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-purple-600 uppercase tracking-wide">Completed</p>
                  <p className="mt-2 text-4xl font-bold text-purple-900">
                    {allCategoryStats ? allCategoryStats.completed : (pagination.categorization?.completed || 0)}
                  </p>
                  <p className="mt-1 text-sm text-purple-700">Completed records</p>
                  {activeFilter === 'completed' && (
                    <p className="mt-1 text-xs text-purple-600 font-medium">📋 Showing filtered records</p>
                  )}
                </div>
                <div className="p-3 bg-purple-500 rounded-full">
                  <span className="text-white text-2xl">✅</span>
                </div>
              </div>
            </div>
          </div>

          {/* Filter Controls */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <span className="text-sm font-semibold text-gray-700">Filter Records:</span>
                <div className="flex items-center space-x-1 bg-gray-50 p-1 rounded-lg border border-gray-200">
                  <button
                    onClick={() => handleFilterChange('overdue')}
                    className={`px-4 py-2.5 text-sm font-medium rounded-md transition-all duration-200 flex items-center space-x-2 ${
                      activeFilter === 'overdue' 
                        ? 'bg-red-500 text-white shadow-md' 
                        : 'text-red-600 hover:bg-red-50'
                    }`}
                  >
                    <div className={`w-2 h-2 rounded-full ${activeFilter === 'overdue' ? 'bg-red-200' : 'bg-red-400'}`}></div>
                    <span>Overdue ({pagination.categorization?.overdue || 0})</span>
                  </button>
                  <button
                    onClick={() => handleFilterChange('newCount')}
                    className={`px-4 py-2.5 text-sm font-medium rounded-md transition-all duration-200 flex items-center space-x-2 ${
                      activeFilter === 'newCount' 
                        ? 'bg-blue-500 text-white shadow-md' 
                        : 'text-blue-600 hover:bg-blue-50'
                    }`}
                  >
                    <div className={`w-2 h-2 rounded-full ${activeFilter === 'newCount' ? 'bg-blue-200' : 'bg-blue-400'}`}></div>
                    <span>New ({pagination.categorization?.newCount || 0})</span>
                  </button>
                  <button
                    onClick={() => handleFilterChange('followUps')}
                    className={`px-4 py-2.5 text-sm font-medium rounded-md transition-all duration-200 flex items-center space-x-2 ${
                      activeFilter === 'followUps' 
                        ? 'bg-green-500 text-white shadow-md' 
                        : 'text-green-600 hover:bg-green-50'
                    }`}
                  >
                    <div className={`w-2 h-2 rounded-full ${activeFilter === 'followUps' ? 'bg-green-200' : 'bg-green-400'}`}></div>
                    <span>Follow Ups ({pagination.categorization?.followUps || 0})</span>
                  </button>
                  <button
                    onClick={() => handleFilterChange('completed')}
                    className={`px-4 py-2.5 text-sm font-medium rounded-md transition-all duration-200 flex items-center space-x-2 ${
                      activeFilter === 'completed' 
                        ? 'bg-purple-500 text-white shadow-md' 
                        : 'text-purple-600 hover:bg-purple-50'
                    }`}
                  >
                    <div className={`w-2 h-2 rounded-full ${activeFilter === 'completed' ? 'bg-purple-200' : 'bg-purple-400'}`}></div>
                    <span>Completed ({pagination.categorization?.completed || 0})</span>
                  </button>
                  <button
                    onClick={() => handleFilterChange('all')}
                    className={`px-4 py-2.5 text-sm font-medium rounded-md transition-all duration-200 ${
                      activeFilter === 'all' 
                        ? 'bg-white text-gray-900 shadow-sm border border-gray-300' 
                        : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
                    }`}
                  >
                    📋 All ({(pagination.categorization?.newCount || 0) + (pagination.categorization?.overdue || 0) + (pagination.categorization?.followUps || 0) + (pagination.categorization?.completed || 0)})
                  </button>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <div className="text-sm text-gray-600">
                  Showing <span className="font-medium text-gray-900">{records.length}</span> of <span className="font-medium text-gray-900">{pagination.total}</span> records
                </div>
                {activeFilter !== 'all' && (
                  <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium flex items-center space-x-1">
                    <span>Filtered by:</span>
                    <span className="font-semibold">
                      {activeFilter === 'newCount' ? 'New' : 
                       activeFilter === 'overdue' ? 'Overdue' :
                       activeFilter === 'followUps' ? 'Follow Ups' : 'Completed'}
                    </span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Search */}
          <div className="card p-4">
            <div className="flex items-center space-x-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  id="churn-search"
                  name="churn-search"
                  type="text"
                  placeholder="Search restaurants, KAM, zone, churn reason, RID, or owner email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyPress={handleSearchKeyPress}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  autoComplete="off"
                />
              </div>
              <button
                onClick={handleSearchSubmit}
                className="px-6 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors whitespace-nowrap"
              >
                Go
              </button>
              <button
                onClick={handleClearFilters}
                className="px-6 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 transition-colors whitespace-nowrap"
              >
                Clear
              </button>
            </div>
          </div>

          {/* Data Table */}
          <div className="card overflow-hidden" style={{ backgroundColor: 'rgba(255, 255, 255, 0.95)' }}>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <div className="flex items-center space-x-1">
                        <span>Date</span>
                        <span className="text-blue-500 text-xs">↓ Newest First</span>
                      </div>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      RID (Click to Update)
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Restaurant Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      KAM
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Sync Days
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Zone
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Churn Reason
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Follow-Up
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {records.map((record) => (
                    <tr key={record.id || record.rid} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDDMMYYYYToMMMFormat(record.date, 'N/A')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          onClick={() => handleRidClick(record)}
                          className="font-medium cursor-pointer hover:underline"
                          style={{ 
                            color: '#2563eb',
                            textDecoration: 'underline',
                            cursor: 'pointer',
                            fontSize: 'inherit',
                            fontFamily: 'inherit',
                            fontWeight: '500'
                          }}
                          onMouseEnter={(e) => {
                            (e.target as HTMLElement).style.color = '#1d4ed8';
                          }}
                          onMouseLeave={(e) => {
                            (e.target as HTMLElement).style.color = '#2563eb';
                          }}
                        >
                          {record.rid || 'N/A'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-medium text-gray-900">{record.restaurant_name || 'N/A'}</div>
                        <div className="text-sm text-gray-500">{record.owner_email || 'No email'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {record.kam || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {record.sync_days || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {record.zone || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getChurnReasonColor(record.churn_reason || '')}`}>
                          {record.churn_reason || 'KAM needs to respond'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {(() => {
                          const followUpStatus = getFollowUpStatus(record)
                          return (
                            <div className="flex items-center space-x-2">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${followUpStatus.color}`}>
                                {followUpStatus.label}
                              </span>
                              {followUpStatus.active && (
                                <span className="text-green-600 text-sm" title="Follow-up system is active for this record">
                                  📞
                                </span>
                              )}
                            </div>
                          )
                        })()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          record.controlled_status === 'Controlled' 
                            ? 'bg-yellow-100 text-yellow-800' 
                            : record.controlled_status === 'Uncontrolled'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {record.controlled_status || 'Unknown'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {records.length === 0 && (
              <div className="text-center py-12">
                <TrendingDown className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No churn records found</h3>
                <p className="mt-1 text-sm text-gray-500">Try adjusting your search criteria.</p>
              </div>
            )}
          </div>

          {/* Pagination - Only show if more than one page */}
          {pagination.total_pages > 1 && (
            <Pagination
              currentPage={pagination.page}
              totalPages={pagination.total_pages}
              totalRecords={pagination.total}
              recordsPerPage={pagination.limit}
              onPageChange={handlePageChange}
              hasNext={pagination.has_next}
              hasPrev={pagination.has_prev}
            />
          )}
        </div>
      </DashboardLayout>

      {/* Churn Reason Modal - Rendered outside DashboardLayout to avoid z-index issues */}
      {selectedRecord && (
        <ChurnReasonModal
          isOpen={isModalOpen}
          onClose={() => {
            console.log('🔄 Closing modal for RID:', selectedRecord.rid)
            setIsModalOpen(false)
            setSelectedRecord(null)
          }}
          onSelect={handleChurnReasonSelect}
          currentReason={selectedRecord.churn_reason}
          currentRemarks={selectedRecord.remarks}
          rid={selectedRecord.rid}
          restaurantName={selectedRecord.restaurant_name}
        />
      )}
      
      {/* CSV Upload Modal */}
      {canUploadCSV && (
        <ChurnCSVUploadModal
          isOpen={isUploadModalOpen}
          onClose={() => setIsUploadModalOpen(false)}
          onUploadComplete={handleUploadComplete}
        />
      )}
      
      {/* Debug Info */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed bottom-4 right-4 bg-black bg-opacity-75 text-white p-2 rounded text-xs z-[10001]">
          <div>Modal Open: {isModalOpen ? 'Yes' : 'No'}</div>
          <div>Selected RID: {selectedRecord?.rid || 'None'}</div>
          <div>Records Count: {records.length}</div>
        </div>
      )}
    </>
  )
}