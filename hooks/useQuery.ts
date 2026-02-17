
import { useSyncExternalStore, useEffect, useCallback ,useRef } from 'react';

// Global cache store
export const queryCache = new Map<string, any>();
export const listeners = new Map<string, Set<() => void>>();

// Notify all listeners for a query key
export function notifyListeners(queryKey: any[]) {
  const keyStr = JSON.stringify(queryKey);
  const queryListeners = listeners.get(keyStr) || new Set();
  queryListeners.forEach(listener => listener());
}

// Subscribe to query changes
function subscribe(queryKey: any[], callback: () => void) {
  const keyStr = JSON.stringify(queryKey);
  if (!listeners.has(keyStr)) {
    listeners.set(keyStr, new Set());
  }
  listeners.get(keyStr)!.add(callback);
  
  return () => {
    listeners.get(keyStr)?.delete(callback);
    if (listeners.get(keyStr)?.size === 0) {
      listeners.delete(keyStr);
    }
  };
}

// Get snapshot of cache
function getSnapshot(queryKey: any[]) {
  const keyStr = JSON.stringify(queryKey);
  if (!queryCache.has(keyStr)) {
    queryCache.set(keyStr, {
      data: undefined,
      error: undefined,
      status: 'idle',
      fetchedAt: 0,
      dataUpdatedAt: 0,
      errorUpdatedAt: 0,
      fetchFailureCount: 0,
      isFetching: false,
      isStale: true,
    });
  }
  return queryCache.get(keyStr);
}

// Global invalidation helper
export function invalidateQueries(queryKey: any[]) {
  const keyStr = JSON.stringify(queryKey);
  const prefix = keyStr.substring(0, keyStr.length - 1);
  
  for (const cacheKey of queryCache.keys()) {
    if (cacheKey.startsWith(prefix)) {
      const entry = queryCache.get(cacheKey);
      if (entry) {
        // Immutable update for invalidation
        queryCache.set(cacheKey, { ...entry, isStale: true });
        try {
          const originalKey = JSON.parse(cacheKey);
          notifyListeners(originalKey);
        } catch (e) {}
      }
    }
  }
}

async function fetchQuery(queryKey: any[], queryFn: () => Promise<any>) {
  const keyStr = JSON.stringify(queryKey);
  const entry = getSnapshot(queryKey);
  
  // Start fetching: Update cache immutably
  queryCache.set(keyStr, {
    ...entry,
    isFetching: true,
    status: entry.data ? 'success' : 'loading',
    fetchedAt: Date.now(),
  });
  notifyListeners(queryKey);
  
  try {
    const data = await queryFn();
    
    // Success: Update cache immutably with new data
    queryCache.set(keyStr, {
      ...queryCache.get(keyStr), // Get latest in case of concurrent changes
      data,
      error: undefined,
      status: 'success',
      dataUpdatedAt: Date.now(),
      isStale: false,
      fetchFailureCount: 0,
      isFetching: false,
    });
    
    notifyListeners(queryKey);
    return data;
  } catch (error) {
    // Error: Update cache immutably with error info
    queryCache.set(keyStr, {
      ...queryCache.get(keyStr),
      error,
      status: 'error',
      errorUpdatedAt: Date.now(),
      fetchFailureCount: (entry.fetchFailureCount || 0) + 1,
      isFetching: false,
    });
    
    notifyListeners(queryKey);
    throw error;
  }
}

export function useQuery<T>(options: {
  queryKey: any[];
  queryFn: () => Promise<T>;
  staleTime?: number;
  cacheTime?: number;
  enabled?: boolean;
  refetchInterval?: number | false;
  refetchOnMount?: boolean;
  refetchOnWindowFocus?: boolean;
  retry?: number;
  retryDelay?: number;
  onSuccess?: (data: T) => void;
  onError?: (error: any) => void;
  onSettled?: (data?: T, error?: any) => void;
  select?: (data: T) => any;
}) {
  const {
    queryKey,
    queryFn,
    staleTime = 0,
    enabled = true,
    refetchInterval = false,
    refetchOnMount = false,
    refetchOnWindowFocus = false,
    retry = 3,
    retryDelay = 1000,
    onSuccess,
    onError,
    onSettled,
    select,
  } = options;

  const keyStr = JSON.stringify(queryKey);

  const snapshot = useSyncExternalStore(
    useCallback((callback) => subscribe(queryKey, callback), [keyStr]),
    useCallback(() => getSnapshot(queryKey), [keyStr]),
    useCallback(() => getSnapshot(queryKey), [keyStr])
  );

  const refetch = useCallback(async () => {
    if (!queryFn) return;
    return fetchQuery(queryKey, queryFn);
  }, [keyStr, queryFn]);

  const isStale = useCallback(() => {
    const entry = getSnapshot(queryKey);
    if (entry.dataUpdatedAt === 0) return true;
    return entry.isStale || (Date.now() - entry.dataUpdatedAt > staleTime);
  }, [keyStr, staleTime]);

 useEffect(() => {
  if (!enabled || !queryFn) return;

  const entry = getSnapshot(queryKey);
  const shouldFetch =
  entry.status === 'idle' ||
  (refetchOnMount && isStale() && !entry.isFetching);


  if (!shouldFetch) return;

  let retryCount = 0;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let cancelled = false;

  const attemptFetch = async () => {
    if (cancelled) return;

    try {
      const data = await fetchQuery(queryKey, queryFn);
      if (onSuccess) onSuccess(data);
      if (onSettled) onSettled(data, null);
    } catch (error) {
      if (retryCount < retry && !cancelled) {
        retryCount++;
        timeoutId = setTimeout(
          attemptFetch,
          retryDelay * retryCount
        );
      } else {
        if (onError) onError(error);
        if (onSettled) onSettled(undefined, error);
      }
    }
  };

  attemptFetch();

  return () => {
    cancelled = true;
    if (timeoutId) clearTimeout(timeoutId);
  };

}, [keyStr, enabled, refetchOnMount, isStale, retry, retryDelay]);


  useEffect(() => {
    if (!enabled || !refetchInterval || !queryFn) return;
    const interval = setInterval(() => refetch(), refetchInterval);
    return () => clearInterval(interval);
  }, [enabled, refetchInterval, refetch, queryFn]);

  useEffect(() => {
    if (!enabled || !refetchOnWindowFocus || !queryFn) return;
    const handleFocus = () => { if (isStale()) refetch(); };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [enabled, refetchOnWindowFocus, refetch, isStale, queryFn]);

  const data = select && snapshot.data ? select(snapshot.data) : snapshot.data;

  return {
    data: data as T,
    error: snapshot.error,
    isLoading: snapshot.status === 'loading' && !snapshot.data,
    isError: snapshot.status === 'error',
    isSuccess: snapshot.status === 'success',
    isIdle: snapshot.status === 'idle',
    isFetching: snapshot.isFetching,
    status: snapshot.status,
    refetch,
    isStale: snapshot.isStale || isStale(),
  };
}
