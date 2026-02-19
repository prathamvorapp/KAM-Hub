'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useAuth } from '@/contexts/AuthContext'

interface ChurnRecord {
  _id?: string
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
}

interface ChurnDataResponse {
  success: boolean
  data: ChurnRecord[]
  pagination: {
    page: number
    limit: number
    total: number
    total_pages: number
    has_next: boolean
    has_prev: boolean
  }
  user_info: {
    role: string
    team?: string
    email: string
  }
  missing_churn_reasons: number
}

interface UseChurnDataOptions {
  page?: number
  limit?: number
  search?: string
  autoFetch?: boolean
}

export function useChurnData(options: UseChurnDataOptions = {}) {
  const { page = 1, limit = 50, search, autoFetch = true } = options
  const { userProfile: authUserProfile, session } = useAuth()
  const [data, setData] = useState<ChurnRecord[]>([])
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 100,
    total: 0,
    total_pages: 0,
    has_next: false,
    has_prev: false
  })
  const [userInfo, setUserInfo] = useState<{ role: string; team?: string; email: string } | null>(null)
  const [missingChurnReasons, setMissingChurnReasons] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Use refs to prevent infinite loops
  const fetchingRef = useRef(false)
  const mountedRef = useRef(true)
  
  // Stable user identifier
  const userId = useMemo(() => authUserProfile?.id, [authUserProfile?.id])
  const userEmail = useMemo(() => authUserProfile?.email, [authUserProfile?.email])

  // PERFORMANCE OPTIMIZATION: Memoize API URL
  const apiUrl = useMemo(() => '', [])  // Use relative paths for same-origin requests

  // PERFORMANCE OPTIMIZATION: Debounced fetch function
  const fetchChurnData = useCallback(async (fetchPage = page, fetchLimit = limit, fetchSearch = search) => {
    // Prevent concurrent fetches
    if (fetchingRef.current) {
      console.log('⏳ [useChurnData] Fetch already in progress, skipping...')
      return
    }
    
    if (!userId || !session) {
      console.log('❌ [useChurnData] User not authenticated', { userId: !!userId, session: !!session });
      setError('User not authenticated')
      setLoading(false)
      return
    }

    fetchingRef.current = true

    try {
      if (!mountedRef.current) return
      
      setLoading(true)
      setError(null)

      // Build query parameters
      const params = new URLSearchParams({
        page: fetchPage.toString(),
        limit: fetchLimit.toString(),
      })
      
      if (fetchSearch) {
        params.append('search', fetchSearch)
      }

      console.log(`🔍 [useChurnData] Fetching: page=${fetchPage}, limit=${fetchLimit}, search=${fetchSearch}`)

      // Add timeout to prevent infinite loading
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

      try {
        // Cookies are sent automatically, no need for Authorization header
        const response = await fetch(`${apiUrl}/api/churn?${params}`, {
          headers: {
            'Content-Type': 'application/json'
          },
          credentials: 'include', // Ensure cookies are sent
          signal: controller.signal
        })

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || `HTTP ${response.status}`)
        }

        const result: ChurnDataResponse = await response.json()
        
        if (!mountedRef.current) return
        
        console.log(`✅ [useChurnData] Fetched: ${result.data.length} records, total: ${result.pagination.total}`)

        setData(result.data)
        setPagination(result.pagination)
        setUserInfo(result.user_info)
        setMissingChurnReasons(result.missing_churn_reasons)
      } catch (fetchError) {
        clearTimeout(timeoutId);
        if (fetchError instanceof Error && fetchError.name === 'AbortError') {
          throw new Error('Request timeout - server took too long to respond')
        }
        throw fetchError;
      }
    } catch (err) {
      if (!mountedRef.current) return
      console.error('❌ [useChurnData] Error:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch churn data')
    } finally {
      if (mountedRef.current) {
        setLoading(false)
      }
      fetchingRef.current = false
    }
  }, [userId, session, apiUrl]) // Stable dependencies only

  const updateChurnReason = useCallback(async (rid: string, churnReason: string, remarks?: string) => {
    if (!userId || !session) {
      throw new Error('User not authenticated')
    }

    try {
      console.log(`📝 [useChurnData] Updating churn reason for RID: ${rid}`)

      // Cookies are sent automatically, no need for Authorization header
      const response = await fetch(`${apiUrl}/api/churn/update-reason`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include', // Ensure cookies are sent
        body: JSON.stringify({
          rid,
          churn_reason: churnReason,
          remarks
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `HTTP ${response.status}`)
      }

      const result = await response.json()
      console.log(`✅ [useChurnData] Churn reason updated for RID: ${rid}`)

      // Refresh data after update
      await fetchChurnData()
      
      return result
    } catch (err) {
      console.error('❌ [useChurnData] Error updating churn reason:', err)
      throw err
    }
  }, [userId, session, apiUrl, fetchChurnData])

  // PERFORMANCE OPTIMIZATION: Memoize refetch function
  const refetch = useCallback(() => fetchChurnData(), [fetchChurnData])

  // Auto-fetch on mount and when dependencies change - ONLY ONCE
  useEffect(() => {
    mountedRef.current = true
    
    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 [useChurnData] useEffect triggered', {
        autoFetch,
        hasUserId: !!userId,
        hasSession: !!session,
        userEmail
      });
    }
    
    if (userId && session) {
      if (process.env.NODE_ENV === 'development') {
        console.log('✅ [useChurnData] Conditions met, fetching data');
      }
      fetchChurnData(page, limit, search)
    }
    
    return () => {
      mountedRef.current = false
    }
  }, [autoFetch, userId, session, page, limit, search, fetchChurnData]) // Stable dependencies

  return {
    data,
    pagination,
    userInfo,
    missingChurnReasons,
    loading,
    error,
    fetchChurnData,
    updateChurnReason,
    refetch
  }
}