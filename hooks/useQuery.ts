
import { useSyncExternalStore, useEffect, useCallback } from 'react';

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
  // Find all keys that start with this key (prefix matching)
  for (const cacheKey of queryCache.keys()) {
    if (cacheKey.startsWith(keyStr.slice(0, -1))) {
      const entry = queryCache.get(cacheKey);
      if (entry) {
        entry.isStale = true;
        // In this simple implementation, we'll just mark as stale. 
        // Active hooks will see the update and refetch based on their useEffects.
        const originalKey = JSON.parse(cacheKey);
        notifyListeners(originalKey);
      }
    }
  }
}

async function fetchQuery(queryKey: any[], queryFn: () => Promise<any>, entry: any) {
  try {
    entry.isFetching = true;
    entry.status = 'loading';
    entry.fetchedAt = Date.now();
    notifyListeners(queryKey);
    
    const data = await queryFn();
    
    entry.data = data;
    entry.error = undefined;
    entry.status = 'success';
    entry.dataUpdatedAt = Date.now();
    entry.isStale = false;
    entry.fetchFailureCount = 0;
    entry.isFetching = false;
    
    notifyListeners(queryKey);
    return data;
  } catch (error) {
    entry.error = error;
    entry.status = 'error';
    entry.errorUpdatedAt = Date.now();
    entry.fetchFailureCount += 1;
    entry.isFetching = false;
    
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
    cacheTime = 5 * 60 * 1000,
    enabled = true,
    refetchInterval = false,
    refetchOnMount = true,
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
    const entry = getSnapshot(queryKey);
    return fetchQuery(queryKey, queryFn, entry);
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
      refetchOnMount && 
      (entry.status === 'idle' || (isStale() && !entry.isFetching));

    if (shouldFetch) {
      let retryCount = 0;
      const attemptFetch = async () => {
        try {
          const data = await fetchQuery(queryKey, queryFn, entry);
          if (onSuccess) onSuccess(data);
          if (onSettled) onSettled(data, null);
        } catch (error) {
          if (retryCount < retry) {
            retryCount++;
            setTimeout(attemptFetch, retryDelay * retryCount);
          } else {
            if (onError) onError(error);
            if (onSettled) onSettled(undefined, error);
          }
        }
      };
      attemptFetch();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keyStr, enabled, refetchOnMount]);

  useEffect(() => {
    if (!enabled || !refetchInterval || !queryFn) return;
    const interval = setInterval(() => refetch(), refetchInterval);
    return () => clearInterval(interval);
  }, [enabled, refetchInterval, refetch]);

  useEffect(() => {
    if (!enabled || !refetchOnWindowFocus || !queryFn) return;
    const handleFocus = () => { if (isStale()) refetch(); };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [enabled, refetchOnWindowFocus, refetch, isStale]);

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
