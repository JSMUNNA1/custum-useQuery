
export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar: string;
  status: 'Active' | 'Inactive' | 'Pending';
  createdAt: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export type QueryStatus = 'idle' | 'loading' | 'success' | 'error';

export interface CacheEntry<T = any> {
  data: T | undefined;
  error: any;
  status: QueryStatus;
  fetchedAt: number;
  dataUpdatedAt: number;
  errorUpdatedAt: number;
  fetchFailureCount: number;
  isFetching: boolean;
  isStale: boolean;
}
