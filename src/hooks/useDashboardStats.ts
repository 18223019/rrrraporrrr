/**
 * useDashboardStats Hook - Fetch dashboard statistics for a user
 */

import { useState, useEffect } from 'react';
import type { DashboardStats } from '../types/user';
import type { ApiMeta } from '../services/api';
import { useApiRoute } from './useApiRoute';
import {
  calculateStats,
  calculateBidangBreakdown,
} from '../utils/dashboardStats';
import { getBidangGroup } from '../data/bidangConfig';
import { dashboardCache } from '../utils/dashboardCache';


interface UseDashboardStatsOptions {
  username: string;
  month?: string; // Current month to display (e.g., "Oktober25")
  historyMonths?: number; // How many months for trend
}

interface UseDashboardStatsReturn {
  stats: DashboardStats | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  meta: ApiMeta | null;
}

/**
 * Calculate dashboard statistics from score data
 * Maps actual Google Sheets columns to 4 main categories
 */
const DEFAULT_STATS: DashboardStats = {
  averageScore: 0,
  ketakmiran: 0,
  pembinaan: 0,
  aktualisasi: 0,
  internal: 0,
  trend: 0,
  bidangBreakdown: calculateBidangBreakdown(null),
};

export const useDashboardStats = ({
  username,
  month,
  historyMonths = 3,
}: UseDashboardStatsOptions): UseDashboardStatsReturn => {
  const apiRoute = useApiRoute();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [meta, setMeta] = useState<ApiMeta | null>(null);

  const fetchStats = async () => {
    if (!username || !month) {
      setStats(null);
      setLoading(false);
      return;
    }

    // Check cache first
    const cachedStats = dashboardCache.get(username, month);
    if (cachedStats) {
      setStats(cachedStats);
      setLoading(false);
      console.log(`[DASHBOARD] Loaded from cache for ${month}`);
      return;
    }

    // ⏱️ START TIMING
    const startTime = performance.now();

    let historyPromise: Promise<{ data: Array<Record<string, unknown>> | undefined; meta: ApiMeta | null }> | null = null;

    try {
      setLoading(true);
      setError(null);
      setMeta(null);
      
      // Fetch current month data
      const apiModule = await import('../services/api');

      historyPromise = apiModule
        .getHistory(username, historyMonths)
        .then((historyResponse) => {
          const historyMeta = (historyResponse as unknown as { __meta?: ApiMeta }).__meta ?? null;
          if (historyMeta) {
            console.log(
              `History source ${historyMeta.source} (stale=${historyMeta.stale ?? false})`,
              historyMeta,
            );
          }
          return {
            data: historyResponse.success ? historyResponse.data : undefined,
            meta: historyMeta,
          };
        })
        .catch((historyError) => {
          console.warn('History fetch failed, continuing without trend', historyError);
          return {
            data: undefined,
            meta: null,
          };
        });

      const currentResponse = await apiModule.getScoreByName(month, username);
      const currentMeta = (currentResponse as unknown as { __meta?: ApiMeta }).__meta ?? null;
      if (currentMeta) {
        console.log(
          `[DASHBOARD] Current score via ${currentMeta.source} (stale=${currentMeta.stale ?? false}) target=${apiRoute.target}`,
          currentMeta,
        );
      } else {

      }
      setMeta(currentMeta);

      if (currentResponse.success && currentResponse.data) {
        const historyResult = historyPromise ? await historyPromise : { data: undefined, meta: null };
        const historyData = historyResult.data;

        const calcStartTime = performance.now();
        const calculatedStats = calculateStats(
          currentResponse.data,
          month,
          historyData,
          getBidangGroup(username),
        );
        const calcEndTime = performance.now();
        console.log(`Stats calculation took ${(calcEndTime - calcStartTime).toFixed(2)}ms`);
        ;
        setStats(calculatedStats);
        
        // Store in cache
        dashboardCache.set(username, month, calculatedStats);
        
        // ⏱️ TOTAL TIME
        const totalTime = performance.now() - startTime;
        console.log(`Dashboard total loading time ${(totalTime / 1000).toFixed(3)} seconds`);
      } else if (historyPromise) {
        await historyPromise;
      }
    } catch (err) {
      console.error('❌ Error fetching dashboard stats:', err);
      if (historyPromise) {
        await historyPromise;
      }
      setError(err instanceof Error ? err : new Error('Failed to fetch stats'));
      setMeta(null);
      
      const totalTime = performance.now() - startTime;
      console.log(`❌ [DASHBOARD] Failed after ${(totalTime / 1000).toFixed(3)} seconds`);
      // Set zero stats on error
      setStats(DEFAULT_STATS);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [username, month, historyMonths, apiRoute.revision]);

  return {
    stats,
    loading,
    error,
    refetch: fetchStats,
    meta,
  };
};
