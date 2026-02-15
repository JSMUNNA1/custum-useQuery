
import { useState, useCallback, useRef } from 'react';

const mutationCache = new Map<string, any>();
let mutationId = 0;

export function useMutation<TData = any, TVariables = any>(options: {
  mutationFn: (variables: TVariables) => Promise<TData>;
  onMutate?: (variables: TVariables) => Promise<any> | any;
  onSuccess?: (data: TData, variables: TVariables, context: any) => Promise<void> | void;
  onError?: (error: any, variables: TVariables, context: any) => Promise<void> | void;
  onSettled?: (data: TData | undefined, error: any | null, variables: TVariables, context: any) => Promise<void> | void;
  retry?: number;
  retryDelay?: number;
  mutationKey?: string;
  throwOnError?: boolean;
}) {
  const {
    mutationFn,
    onMutate,
    onSuccess,
    onError,
    onSettled,
    retry = 0,
    retryDelay = 1000,
    mutationKey,
    throwOnError = false,
  } = options;

  const [state, setState] = useState({
    data: undefined as TData | undefined,
    error: undefined as any,
    isLoading: false,
    isError: false,
    isSuccess: false,
    isIdle: true,
    status: 'idle' as 'idle' | 'loading' | 'success' | 'error',
  });

  const contextRef = useRef<any>(null);
  const currentMutationIdRef = useRef(0);

  const reset = useCallback(() => {
    setState({
      data: undefined,
      error: undefined,
      isLoading: false,
      isError: false,
      isSuccess: false,
      isIdle: true,
      status: 'idle',
    });
    contextRef.current = null;
  }, []);

  const mutate = useCallback(
    async (variables: TVariables, mutateOptions: any = {}) => {
      const currentMutationId = ++mutationId;
      currentMutationIdRef.current = currentMutationId;

      if (mutationKey) {
        mutationCache.set(mutationKey, { state: 'loading', variables, mutationId: currentMutationId });
      }

      let context;
      if (onMutate) {
        try {
          context = await onMutate(variables);
          contextRef.current = context;
        } catch (err) {
          console.error('onMutate error:', err);
        }
      }

      setState(prev => ({ ...prev, isLoading: true, isIdle: false, isError: false, isSuccess: false, status: 'loading', error: undefined }));

      let retryCount = 0;
      const attemptMutation = async (): Promise<TData> => {
        try {
          if (currentMutationIdRef.current !== currentMutationId) throw new Error('Mutation cancelled');
          const data = await mutationFn(variables);
          if (currentMutationIdRef.current !== currentMutationId) throw new Error('Mutation cancelled');

          setState(prev => ({ ...prev, data, error: undefined, isLoading: false, isError: false, isSuccess: true, status: 'success' }));
          
          if (onSuccess) await onSuccess(data, variables, context);
          if (mutateOptions.onSuccess) await mutateOptions.onSuccess(data, variables, context);
          if (onSettled) await onSettled(data, null, variables, context);
          if (mutateOptions.onSettled) await mutateOptions.onSettled(data, null, variables, context);

          return data;
        } catch (error) {
          if (currentMutationIdRef.current !== currentMutationId) throw error;
          if (retryCount < retry) {
            retryCount++;
            await new Promise(r => setTimeout(r, retryDelay * Math.pow(2, retryCount - 1)));
            return attemptMutation();
          }

          setState(prev => ({ ...prev, data: undefined, error, isLoading: false, isError: true, isSuccess: false, status: 'error' }));
          if (onError) await onError(error, variables, context);
          if (mutateOptions.onError) await mutateOptions.onError(error, variables, context);
          if (onSettled) await onSettled(undefined, error, variables, context);
          if (mutateOptions.onSettled) await mutateOptions.onSettled(undefined, error, variables, context);

          if (throwOnError || mutateOptions.throwOnError) throw error;
          return Promise.reject(error);
        }
      };

      return attemptMutation();
    },
    [mutationFn, onMutate, onSuccess, onError, onSettled, retry, retryDelay, mutationKey, throwOnError]
  );

  return { ...state, mutate, mutateAsync: mutate, reset };
}
