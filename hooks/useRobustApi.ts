import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../lib/api-client';

interface UseApiOptions {
  autoLoad?: boolean;
  retryOnMount?: boolean;
  onError?: (error: any) => void;
  onSuccess?: (data: any) => void;
}

interface UseApiResult<T> {
  data: T | null;
  loading: boolean;
  error: any;
  retry: () => void;
  refresh: () => void;
}

export function useTeamStatistics(
  email?: string,
  options: UseApiOptions = {}
): UseApiResult<any> {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<any>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiClient.getTeamVisitStatistics();
      
      if (response.success) {
        setData(response.data);
        options.onSuccess?.(response.data);
      } else {
        const err = new Error(response.error || 'Failed to fetch team statistics');
        setError(err);
        options.onError?.(err);
      }
    } catch (err) {
      setError(err);
      options.onError?.(err);
    } finally {
      setLoading(false);
    }
  }, [email, options.onSuccess, options.onError]);

  useEffect(() => {
    if (options.autoLoad) {
      fetchData();
    }
  }, [options.autoLoad, fetchData]);

  return {
    data,
    loading,
    error,
    retry: fetchData,
    refresh: fetchData
  };
}
