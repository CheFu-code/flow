import { useCallback, useEffect, useRef, useState } from 'react';

interface AsyncState<T> {
  status: 'idle' | 'pending' | 'success' | 'error';
  data: T | null;
  error: Error | null;
}

export function useAsync<T>(
  asyncFunction: () => Promise<T>,
  immediate = true,
): AsyncState<T> {
  const [state, setState] = useState<AsyncState<T>>({
    status: 'idle',
    data: null,
    error: null,
  });

  const mountedRef = useRef(true);

  const execute = useCallback(async () => {
    if (!mountedRef.current) return;

    setState({ status: 'pending', data: null, error: null });
    try {
      const response = await asyncFunction();
      if (mountedRef.current) {
        setState({ status: 'success', data: response, error: null });
      }
    } catch (error) {
      if (mountedRef.current) {
        setState({
          status: 'error',
          data: null,
          error: error instanceof Error ? error : new Error(String(error)),
        });
      }
    }
  }, [asyncFunction]);

  useEffect(() => {
    let cancelled = false;
    mountedRef.current = true;

    if (immediate) {
      void Promise.resolve().then(() => {
        if (!cancelled) void execute();
      });
    }

    return () => {
      cancelled = true;
      mountedRef.current = false;
    };
  }, [execute, immediate]);

  return state;
}
