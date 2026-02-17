'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { convexAPI } from '@/lib/convex-api'
import { 
  Building2, 
  CheckCircle, 
  Clock, 
  Calendar, 
  XCircle, 
  TrendingUp, 
  Target,
  BarChart3
} from 'lucide-react'

interface VisitStatistics {
  total_brands: number
  total_visits_done: number
  total_visits_pending: number
  total_scheduled_visits: number
  total_cancelled_visits: number
  last_month_visits: number
  current_month_scheduled: number
  current_month_completed: number
  current_month_total: number
  current_month_total_visits: number
  mom_pending: number
  monthly_target: number
  current_month_progress: number
  overall_progress: number
}

interface VisitStatisticsProps {
  userEmail: string
  refreshKey?: number
}

export default function VisitStatistics({ userEmail, refreshKey }: VisitStatisticsProps) {
  const [statistics, setStatistics] = useState<VisitStatistics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)
  const [userRole, setUserRole] = useState<string>('')

  const handleRetry = () => {
    setRetryCount(0)
    loadStatistics()
  }

  const loadStatistics = async (bustCache = false) => {
    try {
      setLoading(true)
      setError(null)
      
      console.log('📊 Loading visit statistics for:', userEmail, 'Attempt:', retryCount + 1)
      
      // Get user profile to determine role
      try {
        const userProfileResponse = await convexAPI.getUserProfile(userEmail);
        if (userProfileResponse?.data) {
          setUserRole(userProfileResponse.data.role || '');
        }
      } catch (profileError) {
        console.log('Could not fetch user profile for role detection:', profileError);
      }
      
      // Try multiple approaches for loading statistics
      let response;
      
      try {
        // First try: Direct Convex API with shorter timeout
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Statistics loading timeout')), 10000)
        );
        
        const statisticsPromise = convexAPI.getVisitStatistics(userEmail, bustCache);
        response = await Promise.race([statisticsPromise, timeoutPromise]);
        
        console.log('📊 Convex visit statistics response:', response)
        console.log('📊 [CLIENT DEBUG] Scheduled visits:', response.scheduled, 'Total scheduled:', response.total_scheduled_visits)
        console.log('📊 [CLIENT DEBUG] All stats:', JSON.stringify(response, null, 2))
      } catch (convexError) {
        console.log('⚠️ Convex API failed, trying backend API...', convexError);
        
        // Fallback: Try backend API
        try {
          const apiUrl = '';  // Use relative paths for same-origin requests
          const backendResponse = await fetch(`${apiUrl}/api/data/visits/statistics`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json'
            },
            credentials: 'include' // Include cookies for session
          });
          
          if (backendResponse.ok) {
            const backendData = await backendResponse.json();
            response = backendData.statistics;
            console.log('📊 Backend API statistics response:', response);
          } else {
            throw new Error('Backend API failed');
          }
        } catch (backendError) {
          console.log('⚠️ Backend API also failed:', backendError);
          throw convexError; // Throw original error
        }
      }
      
      if (response && typeof response === 'object') {
        // Check if it's the new comprehensive format
        if ('total_brands' in response) {
          setStatistics(response)
          setRetryCount(0)
          console.log('✅ Comprehensive statistics loaded:', response)
        } else {
          // Handle old format or error
          console.log('⚠️ Received old format, using fallback')
          setStatistics({
            total_brands: 0,
            total_visits_done: 0,
            total_visits_pending: 0,
            total_scheduled_visits: 0,
            total_cancelled_visits: 0,
            last_month_visits: 0,
            current_month_scheduled: 0,
            current_month_completed: 0,
            current_month_total: 0,
            current_month_total_visits: 0,
            mom_pending: 0,
            monthly_target: 10,
            current_month_progress: 0,
            overall_progress: 0
          })
        }
      } else {
        throw new Error('Invalid response format')
      }
    } catch (err: any) {
      console.error('❌ Error loading visit statistics:', err)
      
      if (err.message?.includes('timeout')) {
        setError('Statistics loading timed out. The system may be processing large amounts of data.')
        if (retryCount < 2) {
          console.log('⏱️ Retrying statistics load in 3 seconds...')
          setTimeout(() => {
            setRetryCount(prev => prev + 1)
            loadStatistics()
          }, 3000)
          return
        }
      } else if (err.code === 'ECONNABORTED') {
        setError('Connection timeout. Please check your internet connection.')
      } else {
        setError(`Failed to load statistics: ${err.message}. Please try refreshing the page.`)
      }
      
      // Set fallback statistics on error
      setStatistics({
        total_brands: 0,
        total_visits_done: 0,
        total_visits_pending: 0,
        total_scheduled_visits: 0,
        total_cancelled_visits: 0,
        last_month_visits: 0,
        current_month_scheduled: 0,
        current_month_completed: 0,
        current_month_total: 0,
        current_month_total_visits: 0,
        mom_pending: 0,
        monthly_target: 10,
        current_month_progress: 0,
        overall_progress: 0
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (userEmail) {
      loadStatistics(true) // Bust cache on mount and when refreshKey changes
    }
  }, [userEmail, refreshKey])

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-48 mb-4"></div>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-error-50 border border-error-200 rounded-lg p-4 mb-6">
        <div className="flex items-center">
          <XCircle className="h-5 w-5 text-error-500 mr-2" />
          <span className="text-error-700">{error}</span>
          <button 
            onClick={handleRetry}
            className="ml-auto text-error-600 hover:text-error-800 underline"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  if (!statistics) {
    return null
  }

  const getStatDescription = (baseDescription: string, isTeamStat: boolean = false) => {
    if (userRole === 'Admin') {
      return isTeamStat ? baseDescription.replace('Agent', 'Organization').replace('agent', 'organization') : baseDescription;
    } else if (userRole === 'Team Lead') {
      return isTeamStat ? baseDescription.replace('Agent', 'Team').replace('agent', 'team') : baseDescription;
    }
    return baseDescription;
  };

  const statCards = [
    {
      title: 'Total Brands',
      value: statistics.total_brands,
      icon: Building2,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      description: getStatDescription('Total brands assigned')
    },
    {
      title: 'Visits Done (MOM Approved)',
      value: statistics.total_visits_done,
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      description: getStatDescription('Completed with MOM approved')
    },
    {
      title: 'Visits Pending',
      value: statistics.total_visits_pending,
      icon: Clock,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
      description: getStatDescription('Brands not visited yet')
    },
    {
      title: 'Visits Scheduled',
      value: statistics.total_scheduled_visits,
      icon: Calendar,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      description: getStatDescription('Upcoming scheduled visits')
    },
    {
      title: 'Visits Cancelled',
      value: statistics.total_cancelled_visits,
      icon: XCircle,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      description: getStatDescription('Cancelled visits')
    },
    {
      title: 'Last Month Visits',
      value: statistics.last_month_visits,
      icon: TrendingUp,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
      description: getStatDescription('Previous month completed')
    },
    {
      title: userRole === 'Admin' ? 'Organization Monthly Total' : userRole === 'Team Lead' ? 'Team Monthly Total' : 'This Month Total',
      value: `${statistics.current_month_total_visits}/${statistics.monthly_target}`,
      icon: Target,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      description: getStatDescription('Scheduled + completed this month')
    },
    {
      title: 'MOM Pending',
      value: statistics.mom_pending,
      icon: BarChart3,
      color: 'text-pink-600',
      bgColor: 'bg-pink-50',
      description: getStatDescription('Visit done but MOM not submitted')
    },
    {
      title: 'Monthly Progress',
      value: `${Math.round(statistics.current_month_progress)}%`,
      icon: Target,
      color: statistics.current_month_progress >= 100 ? 'text-green-600' : 'text-gray-600',
      bgColor: statistics.current_month_progress >= 100 ? 'bg-green-50' : 'bg-gray-50',
      description: getStatDescription(
        userRole === 'Admin' ? 'Organization should visit target brands/month' : 
        userRole === 'Team Lead' ? 'Team should visit target brands/month' : 
        'Agent should visit 10 brands/month', 
        true
      )
    },
    {
      title: 'Overall Progress',
      value: `${Math.round(statistics.overall_progress)}%`,
      icon: BarChart3,
      color: statistics.overall_progress >= 80 ? 'text-green-600' : statistics.overall_progress >= 50 ? 'text-yellow-600' : 'text-red-600',
      bgColor: statistics.overall_progress >= 80 ? 'bg-green-50' : statistics.overall_progress >= 50 ? 'bg-yellow-50' : 'bg-red-50',
      description: getStatDescription('Total brands visited vs assigned')
    }
  ]

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Visit Statistics</h2>
        <button
          onClick={() => loadStatistics(true)}
          className="text-sm px-3 py-1.5 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors"
        >
          Refresh
        </button>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {statCards.map((stat, index) => {
          const IconComponent = stat.icon
          return (
            <div
              key={index}
              className={`${stat.bgColor} rounded-lg p-4 border border-gray-100`}
            >
              <div className="flex items-center justify-between mb-2">
                <IconComponent className={`h-5 w-5 ${stat.color}`} />
              </div>
              <div className="space-y-1">
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                <p className="text-xs font-medium text-gray-600">{stat.title}</p>
                <p className="text-xs text-gray-500">{stat.description}</p>
              </div>
            </div>
          )
        })}
      </div>
      
      {/* Progress bars for monthly target and overall progress */}
      <div className="mt-4 space-y-4">
        {/* Monthly Target Progress */}
        <div className="p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">
              {userRole === 'Admin' ? 'Organization Monthly Target Progress' : 
               userRole === 'Team Lead' ? 'Team Monthly Target Progress' : 
               'Monthly Target Progress'}
            </span>
            <span className="text-sm text-gray-600">
              {statistics.current_month_total_visits} / {statistics.monthly_target} visits 
              ({statistics.current_month_completed} completed + {statistics.current_month_scheduled} scheduled)
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-300 ${
                statistics.current_month_progress >= 100 
                  ? 'bg-green-500' 
                  : statistics.current_month_progress >= 70 
                  ? 'bg-yellow-500' 
                  : 'bg-blue-500'
              }`}
              style={{ width: `${Math.min(statistics.current_month_progress, 100)}%` }}
            ></div>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {statistics.current_month_progress >= 100 
              ? '🎉 Monthly target achieved!' 
              : `${Math.round(100 - statistics.current_month_progress)}% remaining to reach target`
            }
          </p>
        </div>

        {/* Overall Progress */}
        <div className="p-4 bg-blue-50 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Overall Progress</span>
            <span className="text-sm text-gray-600">
              {statistics.total_visits_done} visits done out of {statistics.total_brands} total brands
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-300 ${
                statistics.overall_progress >= 80 
                  ? 'bg-green-500' 
                  : statistics.overall_progress >= 50 
                  ? 'bg-yellow-500' 
                  : 'bg-red-500'
              }`}
              style={{ width: `${Math.min(statistics.overall_progress, 100)}%` }}
            ></div>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {statistics.overall_progress >= 80 
              ? '🎉 Excellent coverage!' 
              : statistics.overall_progress >= 50 
              ? '👍 Good progress, keep going!' 
              : '📈 More visits needed to improve coverage'
            }
          </p>
        </div>
      </div>
    </div>
  )
}