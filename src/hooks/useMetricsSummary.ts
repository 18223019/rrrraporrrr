import { useCallback, useEffect, useRef, useState } from 'react';
import {
  fetchMetricsSummary,
  type MetricsSummaryQuery,
  type MetricsSummaryResponse,
} from '../services/api';

interface UseMetricsSummaryOptions extends MetricsSummaryQuery {
  autoRefreshMs?: number;
}

interface UseMetricsSummaryResult {
  data: MetricsSummaryResponse | null;
  loading: boolean;
  error: Error | null;
  lastUpdated: Date | null;
  refetch: () => void;
}

const DEFAULT_REFRESH_MS = 0;

function normaliseOptions(options: UseMetricsSummaryOptions = {}) {
  return {
    resource: options.resource?.trim() || undefined,
    days: options.days,
    date: options.date,
    autoRefreshMs: options.autoRefreshMs ?? DEFAULT_REFRESH_MS,
  } satisfies UseMetricsSummaryOptions;
}

export function useMetricsSummary(
  options: UseMetricsSummaryOptions = {},
): UseMetricsSummaryResult {
  const { resource, days, date, autoRefreshMs } = normaliseOptions(options);

  const [data, setData] = useState<MetricsSummaryResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const requestIdRef = useRef(0);

  const runFetch = useCallback(async () => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;

    setLoading(true);

    try {
      const payload = await fetchMetricsSummary({ resource, days, date });
      if (requestIdRef.current !== requestId) {
        return;
      }

      setData(payload);
      setError(null);
      setLastUpdated(new Date());
    } catch (err) {
      if (requestIdRef.current !== requestId) {
        return;
      }

      const normalisedError = err instanceof Error ? err : new Error('Failed to fetch metrics');
      setError(normalisedError);
      setData(null);
    } finally {
      if (requestIdRef.current === requestId) {
        setLoading(false);
      }
    }
  }, [resource, days, date]);

  useEffect(() => {
    runFetch();
  }, [runFetch]);

  useEffect(() => {
    if (!autoRefreshMs || autoRefreshMs <= 0) {
      return undefined;
    }

    const handle = window.setInterval(() => {
      runFetch();
    }, autoRefreshMs);

    return () => {
      window.clearInterval(handle);
    };
  }, [autoRefreshMs, runFetch]);

  const refetch = useCallback(() => {
    runFetch();
  }, [runFetch]);

  return {
    data,
    loading,
    error,
    lastUpdated,
    refetch,
  };
}
