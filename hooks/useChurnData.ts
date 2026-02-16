'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
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
  const { page = 1, limit = 100, search, autoFetch = true } = options
  const { user, userProfile } = useAuth()
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

  // PERFORMANCE OPTIMIZATION: Memoize API URL
  const apiUrl = useMemo(() => '', [])  // Use relative paths for same-origin requests

  // PERFORMANCE OPTIMIZATION: Debounced fetch function
  const fetchChurnData = useCallback(async (fetchPage = page, fetchLimit = limit, fetchSearch = search) => {
    if (!user || !userProfile) {
      setError('User not authenticated')
      return
    }

    try {
      setLoading(true)
      setError(null)

      // Get access token from localStorage
      const token = localStorage.getItem('auth_token')
      if (!token) {
        setError('No access token available')
        return
      }

      // Build query parameters
      const params = new URLSearchParams({
        page: fetchPage.toString(),
        limit: fetchLimit.toString(),
      })
      
      if (fetchSearch) {
        params.append('search', fetchSearch)
      }

      console.log(`🔍 Fetching churn data: page=${fetchPage}, limit=${fetchLimit}, search=${fetchSearch}`)

      const response = await fetch(`${apiUrl}/api/churn?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `HTTP ${response.status}`)
      }

      const result: ChurnDataResponse = await response.json()
      
      console.log(`📊 Churn data fetched: ${result.data.length} records, total: ${result.pagination.total}`)

      setData(result.data)
      setPagination(result.pagination)
      setUserInfo(result.user_info)
      setMissingChurnReasons(result.missing_churn_reasons)
    } catch (err) {
      console.error('Error fetching churn data:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch churn data')
    } finally {
      setLoading(false)
    }
  }, [user, userProfile, apiUrl, page, limit, search])

  const updateChurnReason = useCallback(async (rid: string, churnReason: string, remarks?: string) => {
    if (!user) {
      throw new Error('User not authenticated')
    }

    try {
      // Get access token from localStorage
      const token = localStorage.getItem('auth_token')
      if (!token) {
        throw new Error('No access token available')
      }

      console.log(`📝 Updating churn reason for RID: ${rid}`)

      const response = await fetch(`${apiUrl}/api/churn/update-reason`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
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
      console.log(`✅ Churn reason updated successfully for RID: ${rid}`)

      // Refresh data after update
      await fetchChurnData()
      
      return result
    } catch (err) {
      console.error('Error updating churn reason:', err)
      throw err
    }
  }, [user, apiUrl, fetchChurnData])

  // PERFORMANCE OPTIMIZATION: Memoize refetch function
  const refetch = useCallback(() => fetchChurnData(), [fetchChurnData])

  // Auto-fetch on mount and when dependencies change
  useEffect(() => {
    if (autoFetch && user && userProfile) {
      fetchChurnData()
    }
  }, [autoFetch, fetchChurnData])

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