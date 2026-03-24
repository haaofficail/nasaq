import { useState, useEffect, useCallback } from "react";
import { toast } from "./useToast";

type ApiState<T> = {
  data: T | null;
  loading: boolean;
  error: string | null;
};

/**
 * Hook for fetching data from API
 * Usage: const { data, loading, error, refetch } = useApi(() => servicesApi.list())
 */
export function useApi<T>(fetcher: () => Promise<T>, deps: any[] = []) {
  const [state, setState] = useState<ApiState<T>>({ data: null, loading: true, error: null });

  const fetchData = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const result = await fetcher();
      setState({ data: result, loading: false, error: null });
    } catch (err: any) {
      setState({ data: null, loading: false, error: err.message || "حدث خطأ" });
    }
  }, deps);

  useEffect(() => { fetchData(); }, [fetchData]);

  return { ...state, refetch: fetchData };
}

/**
 * Hook for mutations (create, update, delete)
 * Usage: const { mutate, loading } = useMutation((data) => servicesApi.create(data))
 * Automatically shows toast.error on failure unless silent: true is passed.
 */
export function useMutation<TInput, TOutput>(
  mutationFn: (input: TInput) => Promise<TOutput>,
  options?: { silent?: boolean }
) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mutate = async (input: TInput): Promise<TOutput | null> => {
    setLoading(true);
    setError(null);
    try {
      const result = await mutationFn(input);
      setLoading(false);
      return result;
    } catch (err: any) {
      const msg = err.message || "حدث خطأ";
      setError(msg);
      setLoading(false);
      if (!options?.silent) toast.error(msg);
      return null;
    }
  };

  return { mutate, loading, error };
}
