// React hook for robust API calls with error handling and retry logic
'use client'

import { useState, useEffect, useCallback, useRef } from 'react';
import { apiClient, StatisticsData } from '../lib/robust-api-client';
import { ApiResponse } from '../lib/auth-error-handler';

interface UseRobustApiOptions {
  autoLoad?: boolean;
  retryOnMount?: boolean;
  refreshInterval?: number;
  onError?: (error: string) => void;
  onSuccess?: (data: any) => void;
}

interface UseRobustApiReturn<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  retry: () => Promise<void>;
  refresh: () => Promise<void>;
  clear: () => void;
}

// Generic hook for any API call
export function useRobustApi<T = any>(
  apiCall: () => Promise<ApiResponse<T>>,
  options: UseRobustApiOptions = {}
): UseRobustApiReturn<T> {
  const {
    autoLoad = true,
    retryOnMount = true,
    refreshInterval,
    onError,
    onSuccess
  } = options;

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);
  const executingRef = useRef(false); // Prevent concurrent requests

  const executeApiCall = useCallback(async (isRetry = false) => {
    if (!mountedRef.current) return;
    
    // Prevent concurrent requests
    if (executingRef.current) {
      console.log('⏳ [useRobustApi] Request already in progress, skipping...')
      return
    }

    executingRef.current = true

    try {
      setLoading(true);
      if (!isRetry) {
        setError(null);
      }

      console.log(`🔄 [useRobustApi] Executing API call (attempt ${retryCount + 1})`);
      
      const response = await apiCall();

      if (!mountedRef.current) return;

      if (response.success && response.data) {
        console.log('✅ [useRobustApi] API call successful');
        setData(response.data);
        setError(null);
        setRetryCount(0);
        onSuccess?.(response.data);
      } else {
        const errorMessage = response.error || 'Unknown error occurred';
        setError(errorMessage);
        onError?.(errorMessage);
        console.error('❌ [useRobustApi] API call failed:', errorMessage);
      }
    } catch (err: any) {
      if (!mountedRef.current) return;
      
      const errorMessage = err.message || 'Network error occurred';
      setError(errorMessage);
      onError?.(errorMessage);
      console.error('❌ [useRobustApi] API call exception:', err);
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
      executingRef.current = false
    }
  }, [apiCall, retryCount, onError, onSuccess]); // Include apiCall in dependencies

  const retry = useCallback(async () => {
    setRetryCount(prev => prev + 1);
    await executeApiCall(true);
  }, [executeApiCall]);

  const refresh = useCallback(async () => {
    setRetryCount(0);
    await executeApiCall(false);
  }, [executeApiCall]);

  const clear = useCallback(() => {
    setData(null);
    setError(null);
    setLoading(false);
    setRetryCount(0);
  }, []);

  // Auto-load on mount - ONLY ONCE
  useEffect(() => {
    if (autoLoad) {
      console.log('🚀 [useRobustApi] Auto-loading data...')
      executeApiCall(false);
    }

    return () => {
      mountedRef.current = false;
    };
  }, [autoLoad]); // Only depend on autoLoad, not executeApiCall

  // Set up refresh interval
  useEffect(() => {
    if (refreshInterval && refreshInterval > 0) {
      intervalRef.current = setInterval(() => {
        if (!loading && mountedRef.current) {
          refresh();
        }
      }, refreshInterval);

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    }
  }, [refreshInterval, loading, refresh]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return {
    data,
    loading,
    error,
    retry,
    refresh,
    clear
  };
}

// Specialized hooks for common API calls

export function useTeamStatistics(email?: string, options?: UseRobustApiOptions) {
  const memoizedApiCall = useCallback(
    () => apiClient.getTeamVisitStatistics(email),
    [email]
  );
  
  return useRobustApi<StatisticsData>(
    memoizedApiCall,
    options
  );
}

export function useAgentStatistics(email?: string, options?: UseRobustApiOptions) {
  const memoizedApiCall = useCallback(
    () => apiClient.getAgentVisitStatistics(email),
    [email]
  );
  
  return useRobustApi<StatisticsData>(
    memoizedApiCall,
    options
  );
}

export function useVisitStatistics(email?: string, options?: UseRobustApiOptions) {
  return useRobustApi<StatisticsData>(
    () => apiClient.getVisitStatistics(email),
    options
  );
}

export function useBrandStatistics(email?: string, options?: UseRobustApiOptions) {
  return useRobustApi<StatisticsData>(
    () => apiClient.getBrandStatistics(email),
    options
  );
}

export function useMomStatistics(email?: string, options?: UseRobustApiOptions) {
  return useRobustApi<StatisticsData>(
    () => apiClient.getMomStatistics(email),
    options
  );
}

export function useHealthCheckStatistics(email?: string, options?: UseRobustApiOptions) {
  return useRobustApi<StatisticsData>(
    () => apiClient.getHealthCheckStatistics(email),
    options
  );
}

export function useDemoStatistics(email?: string, options?: UseRobustApiOptions) {
  return useRobustApi<StatisticsData>(
    () => apiClient.getDemoStatistics(email),
    options
  );
}

export function useChurnStatistics(email?: string, options?: UseRobustApiOptions) {
  return useRobustApi<StatisticsData>(
    () => apiClient.getChurnStatistics(email),
    options
  );
}

export function useApprovalStatistics(email?: string, options?: UseRobustApiOptions) {
  return useRobustApi<StatisticsData>(
    () => apiClient.getApprovalStatistics(email),
    options
  );
}

// Hook for paginated data
export function usePaginatedData<T = any>(
  apiCall: (params: any) => Promise<ApiResponse<T>>,
  initialParams: any = {},
  options?: UseRobustApiOptions
) {
  const [params, setParams] = useState(initialParams);
  
  const result = useRobustApi<T>(
    () => apiCall(params),
    { ...options, autoLoad: false }
  );

  const loadData = useCallback((newParams: any) => {
    setParams(newParams);
  }, []);

  // Load data when params change
  useEffect(() => {
    result.refresh();
  }, [params, result]);

  return {
    ...result,
    params,
    loadData,
    setParams
  };
}

// Hook for data with search functionality
export function useSearchableData<T = any>(
  apiCall: (searchParams: any) => Promise<ApiResponse<T>>,
  options?: UseRobustApiOptions
) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<Record<string, any>>({});
  
  const result = useRobustApi<T>(
    () => apiCall({ search: searchTerm, ...filters }),
    { ...options, autoLoad: false }
  );

  const search = useCallback((term: string) => {
    setSearchTerm(term);
  }, []);

  const updateFilters = useCallback((newFilters: Record<string, any>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({});
    setSearchTerm('');
  }, []);

  // Debounced search effect
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      result.refresh();
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchTerm, filters, result]);

  return {
    ...result,
    searchTerm,
    filters,
    search,
    updateFilters,
    clearFilters
  };
}