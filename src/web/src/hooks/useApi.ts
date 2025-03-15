import { useState, useCallback, useEffect, useMemo } from 'react'; // react ^18.2.0
import { useDispatch } from 'react-redux'; // react-redux ^8.0.5
import { AxiosRequestConfig } from 'axios'; // axios ^1.4.0
import {
  get,
  post,
  put,
  patch,
  delete as deleteRequest,
  createApiClient
} from '../api/client';
import { handleError, ERROR_TYPES } from '../utils/errorHandler';
import { ApiResponse, ErrorResponse, PaginatedResponse } from '../types/api';
import { addNotification } from '../state/notifications/notificationsSlice';

/**
 * Hook for making API GET requests with loading state and error handling
 * @param endpoint - API endpoint to call
 * @param params - URL parameters for the request
 * @param config - Additional axios request configuration
 * @param options - Options for controlling behavior such as automatic error notifications
 * @returns Query result with data, loading state, error, and refetch function
 */
export function useApiQuery<T>(
  endpoint: string,
  params?: object,
  config?: AxiosRequestConfig,
  options: {
    autoNotifyError?: boolean;
  } = {}
) {
  // LD1: Initialize state for data, loading, and error
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ErrorResponse | null>(null);

  // LD1: Get dispatch function from Redux
  const dispatch = useDispatch();

  // LD1: Create memoized fetch function that calls the API endpoint
  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await get<T>(endpoint, params, config);
      setData(result);
    } catch (e: any) {
      const err = handleError(e);
      setError(err);
      if (options.autoNotifyError) {
        dispatch(addNotification({
          id: Date.now().toString(),
          type: 'error',
          title: 'API Error',
          message: err.message,
          timestamp: new Date().toISOString(),
          isRead: false,
          priority: 'high',
          link: null,
          relatedEntityType: null,
          relatedEntityId: null
        }));
      }
    } finally {
      setLoading(false);
    }
  }, [endpoint, params, config, dispatch, options.autoNotifyError]);

  // LD1: Create refetch function that resets state and calls fetch
  const refetch = useCallback(() => {
    setData(null);
    fetch();
  }, [fetch]);

  // LD1: Handle automatic error notifications based on options
  useEffect(() => {
    if (error && options.autoNotifyError) {
      dispatch(addNotification({
        id: Date.now().toString(),
        type: 'error',
        title: 'API Error',
        message: error.message,
        timestamp: new Date().toISOString(),
        isRead: false,
        priority: 'high',
        link: null,
        relatedEntityType: null,
        relatedEntityId: null
      }));
    }
  }, [error, dispatch, options.autoNotifyError]);

  // LD1: Execute fetch on mount and when dependencies change
  useEffect(() => {
    fetch();
  }, [fetch]);

  // LD1: Return data, loading state, error, and refetch function
  return useMemo(() => ({
    data,
    loading,
    error,
    refetch
  }), [data, loading, error, refetch]);
}

/**
 * Hook for making API mutation requests (POST, PUT, PATCH, DELETE) with loading state and error handling
 * @param method - HTTP method to use (post, put, patch, delete)
 * @param endpoint - API endpoint to call
 * @param config - Additional axios request configuration
 * @param options - Options for controlling behavior such as automatic error notifications
 * @returns Mutation result with mutate function, data, loading state, and error
 */
export function useApiMutation<T>(
  method: 'post' | 'put' | 'patch' | 'delete',
  endpoint: string,
  config?: AxiosRequestConfig,
  options: {
    autoNotifyError?: boolean;
  } = {}
) {
  // LD1: Initialize state for data, loading, and error
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ErrorResponse | null>(null);

  // LD1: Get dispatch function from Redux
  const dispatch = useDispatch();

  // LD1: Create mutate function that calls the appropriate API method
  const mutate = useCallback(async (payload?: any) => {
    setLoading(true);
    setError(null);
    try {
      let result: T;
      switch (method) {
        case 'post':
          result = await post<T>(endpoint, payload, config);
          break;
        case 'put':
          result = await put<T>(endpoint, payload, config);
          break;
        case 'patch':
          result = await patch<T>(endpoint, payload, config);
          break;
        case 'delete':
          result = await deleteRequest<T>(endpoint, config);
          break;
        default:
          throw new Error(`Unsupported HTTP method: ${method}`);
      }
      setData(result);
      return result;
    } catch (e: any) {
      const err = handleError(e);
      setError(err);
      if (options.autoNotifyError) {
        dispatch(addNotification({
          id: Date.now().toString(),
          type: 'error',
          title: 'API Error',
          message: err.message,
          timestamp: new Date().toISOString(),
          isRead: false,
          priority: 'high',
          link: null,
          relatedEntityType: null,
          relatedEntityId: null
        }));
      }
      throw err; // Re-throw the error for the component to handle
    } finally {
      setLoading(false);
    }
  }, [method, endpoint, config, dispatch, options.autoNotifyError]);

  // LD1: Return mutate function, data, loading state, and error
  return useMemo(() => ({
    mutate,
    data,
    loading,
    error
  }), [mutate, data, loading, error]);
}

/**
 * Hook for making paginated API requests with pagination state management
 * @param endpoint - API endpoint to call
 * @param params - URL parameters for the request
 * @param config - Additional axios request configuration
 * @param options - Options for controlling behavior such as automatic error notifications
 * @returns Paginated query result with data, pagination state, loading state, error, and page navigation functions
 */
export function usePaginatedQuery<T>(
  endpoint: string,
  params?: object,
  config?: AxiosRequestConfig,
  options: {
    autoNotifyError?: boolean;
  } = {}
) {
  // LD1: Initialize state for pagination (page, size, totalPages)
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(20);
  const [totalPages, setTotalPages] = useState(0);

  // LD1: Merge pagination parameters with other query parameters
  const mergedParams = useMemo(() => ({
    ...params,
    page,
    size
  }), [params, page, size]);

  // LD1: Use useApiQuery to fetch paginated data
  const { data, loading, error, refetch } = useApiQuery<PaginatedResponse<T>>(
    endpoint,
    mergedParams,
    config,
    options
  );

  // LD1: Extract pagination metadata from response
  useEffect(() => {
    if (data) {
      setTotalPages(data.totalPages);
    }
  }, [data]);

  // LD1: Create page navigation functions (nextPage, prevPage, goToPage)
  const nextPage = useCallback(() => {
    if (page < totalPages - 1) {
      setPage(page + 1);
    }
  }, [page, totalPages]);

  const prevPage = useCallback(() => {
    if (page > 0) {
      setPage(page - 1);
    }
  }, [page]);

  const goToPage = useCallback((pageNumber: number) => {
    if (pageNumber >= 0 && pageNumber < totalPages) {
      setPage(pageNumber);
    }
  }, [totalPages]);

  // LD1: Return data, pagination state, loading state, error, and page navigation functions
  return useMemo(() => ({
    data: data ? data.content : [],
    page,
    size,
    totalPages,
    loading,
    error,
    nextPage,
    prevPage,
    goToPage,
    refetch
  }), [data, page, size, totalPages, loading, error, nextPage, prevPage, goToPage, refetch]);
}

/**
 * Hook for implementing infinite scrolling with API requests
 * @param endpoint - API endpoint to call
 * @param params - URL parameters for the request
 * @param config - Additional axios request configuration
 * @param options - Options for controlling behavior such as automatic error notifications
 * @returns Infinite query result with accumulated data, loading state, error, hasMore flag, and loadMore function
 */
export function useInfiniteQuery<T>(
  endpoint: string,
  params?: object,
  config?: AxiosRequestConfig,
  options: {
    autoNotifyError?: boolean;
  } = {}
) {
  // LD1: Initialize state for accumulated data and current page
  const [data, setData] = useState<T[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  // LD1: Use useApiQuery to fetch data for current page
  const { data: pageData, loading, error, refetch } = useApiQuery<PaginatedResponse<T>>(
    endpoint,
    { ...params, page, size: 20 },
    config,
    options
  );

  // LD1: Accumulate data from each page load
  useEffect(() => {
    if (pageData) {
      setData(prevData => [...prevData, ...pageData.content]);
      // LD1: Determine if more data is available based on pagination metadata
      setHasMore(!pageData.last);
    }
  }, [pageData]);

  // LD1: Create loadMore function that increments page and fetches more data
  const loadMore = useCallback(() => {
    if (hasMore && !loading) {
      setPage(prevPage => prevPage + 1);
    }
  }, [hasMore, loading]);

  // LD1: Return accumulated data, loading state, error, hasMore flag, and loadMore function
  return useMemo(() => ({
    data,
    loading,
    error,
    hasMore,
    loadMore,
    refetch
  }), [data, loading, error, hasMore, loadMore, refetch]);
}

/**
 * Hook for making API requests that automatically refresh at specified intervals
 * @param endpoint - API endpoint to call
 * @param params - URL parameters for the request
 * @param interval - Polling interval in milliseconds
 * @param config - Additional axios request configuration
 * @param options - Options for controlling behavior such as automatic error notifications
 * @returns Query result with data, loading state, error, and polling control functions
 */
export function usePollingQuery<T>(
  endpoint: string,
  params?: object,
  interval: number = 5000,
  config?: AxiosRequestConfig,
  options: {
    autoNotifyError?: boolean;
  } = {}
) {
  // LD1: Use useApiQuery to fetch data
  const { data, loading, error, refetch } = useApiQuery<T>(
    endpoint,
    params,
    config,
    options
  );
  const [polling, setPolling] = useState(false);

  // LD1: Set up polling interval using useEffect
  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;

    if (polling) {
      intervalId = setInterval(refetch, interval);
    }

    // LD1: Clean up interval on unmount
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [refetch, interval, polling]);

  // LD1: Create functions to start, stop, and reset polling
  const startPolling = useCallback(() => {
    setPolling(true);
  }, []);

  const stopPolling = useCallback(() => {
    setPolling(false);
  }, []);

  const resetPolling = useCallback(() => {
    stopPolling();
    refetch();
    startPolling();
  }, [startPolling, stopPolling, refetch]);

  // LD1: Return data, loading state, error, and polling control functions
  return useMemo(() => ({
    data,
    loading,
    error,
    startPolling,
    stopPolling,
    resetPolling,
    refetch
  }), [data, loading, error, startPolling, stopPolling, resetPolling, refetch]);
}

/**
 * Hook for making API requests with client-side caching
 * @param endpoint - API endpoint to call
 * @param params - URL parameters for the request
 * @param config - Additional axios request configuration
 * @param options - Options for controlling behavior such as automatic error notifications
 * @returns Query result with data, loading state, error, and cache control functions
 */
export function useCachedQuery<T>(
  endpoint: string,
  params?: object,
  config?: AxiosRequestConfig,
  options: {
    autoNotifyError?: boolean;
    cacheTtl?: number;
  } = {}
) {
  // LD1: Check if data for this query is in cache
  const [cachedData, setCachedData] = useState<T | null>(null);
  const cacheTtl = options.cacheTtl || 60000; // Default 60 seconds

  // LD1: Return cached data immediately if available and not expired
  useEffect(() => {
    const cacheKey = `${endpoint}${params ? JSON.stringify(params) : ''}`;
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      const { data, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp < cacheTtl) {
        setCachedData(data);
      } else {
        localStorage.removeItem(cacheKey); // Remove expired cache
      }
    }
  }, [endpoint, params, cacheTtl]);

  // LD1: Use useApiQuery to fetch fresh data if needed
  const { data, loading, error, refetch } = useApiQuery<T>(
    endpoint,
    params,
    config,
    options
  );

  // LD1: Update cache with new data when received
  useEffect(() => {
    if (data) {
      const cacheKey = `${endpoint}${params ? JSON.stringify(params) : ''}`;
      localStorage.setItem(cacheKey, JSON.stringify({ data, timestamp: Date.now() }));
      setCachedData(data);
    }
  }, [data, endpoint, params]);

  // LD1: Create functions to invalidate cache and force refresh
  const invalidateCache = useCallback(() => {
    const cacheKey = `${endpoint}${params ? JSON.stringify(params) : ''}`;
    localStorage.removeItem(cacheKey);
    setCachedData(null);
  }, [endpoint, params]);

  const forceRefresh = useCallback(() => {
    invalidateCache();
    refetch();
  }, [invalidateCache, refetch]);

  // LD1: Return data, loading state, error, and cache control functions
  return useMemo(() => ({
    data: cachedData || data,
    loading,
    error,
    invalidateCache,
    forceRefresh,
    refetch
  }), [cachedData, data, loading, error, invalidateCache, forceRefresh, refetch]);
}