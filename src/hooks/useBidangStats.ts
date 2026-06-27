/**
 * useBidangStats Hook - Fetch specific bidang statistics for a user
 */

import { useState, useEffect } from 'react';
import { getScoreByName } from '../services/api';
import type { ApiMeta } from '../services/api';
import { useApiRoute } from './useApiRoute';
import {
  computeBidangScore,
  getBidangParameterConfig,
  type BidangParameterBreakdown,
  type BidangType,
} from '../data/bidangConfig';

export type { BidangType } from '../data/bidangConfig';

interface Parameter {
  id: string;
  label: string;
  value: number | null;
  originalWeight: number;
  normalizedWeight: number;
  isActive: boolean;
}

interface UseBidangStatsOptions {
  username: string;
  bidang: BidangType;
  month?: string;
}

interface UseBidangStatsReturn {
  parameters: Parameter[];
  kumulatif: number;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

/**
 * Get current month name (e.g., "Oktober25")
 */
function getCurrentMonth(): string {
  const now = new Date();
  const monthNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];
  const month = monthNames[now.getMonth()];
  const year = now.getFullYear().toString().slice(-2);
  return `${month}${year}`;
}

export const useBidangStats = ({
  username,
  bidang,
  month,
}: UseBidangStatsOptions): UseBidangStatsReturn => {
  const apiRoute = useApiRoute();
  const [parameters, setParameters] = useState<Parameter[]>([]);
  const [kumulatif, setKumulatif] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchStats = async () => {
    if (!username || !bidang) {
      setParameters([]);
      setKumulatif(0);
      setLoading(false);
      return;
    }

    // ⏱️ START TIMING
    const startTime = performance.now();

    const currentMonth = month || getCurrentMonth();

    try {
      setLoading(true);
      setError(null);

      const response = await getScoreByName(currentMonth, username);
      const responseMeta = (response as unknown as { __meta?: ApiMeta }).__meta ?? null;
      if (responseMeta) {
        console.log(
          `[BIDANG-${bidang.toUpperCase()}] Source: ${responseMeta.source} (stale=${responseMeta.stale ?? false}) target=${apiRoute.target}`,
          responseMeta,
        );
      }

      if (response.success && response.data) {
        const data = response.data;
        const computation = computeBidangScore(bidang, (column) => data[column], currentMonth);
        const params: Parameter[] = computation.breakdown.map((item: BidangParameterBreakdown) => ({
          id: item.column.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
          label: item.column,
          value: item.isActive ? item.value : null,
          originalWeight: item.originalWeight,
          normalizedWeight: item.normalizedWeight,
          isActive: item.isActive,
        }));



        setParameters(params);
        setKumulatif(Math.round(computation.score * 10) / 10); // Round to 1 decimal

      } else {
    // No data found - set defaults with 0 values
    const config = getBidangParameterConfig(bidang, currentMonth);
        const params: Parameter[] = config.map(({ column, weight }) => ({
          id: column.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
          label: column,
          value: null,
          originalWeight: weight,
          normalizedWeight: 0,
          isActive: false,
        }));
        
        setParameters(params);
        setKumulatif(0);
        
        const totalTime = performance.now() - startTime;
        console.log(`[BIDANG-${bidang.toUpperCase()}] TOTAL loading time (no data): ${(totalTime / 1000).toFixed(3)} seconds`);
      }
    } catch (err) {
      console.error('Error fetching bidang stats:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch bidang stats'));
      
    // Set default empty parameters on error
    const config = getBidangParameterConfig(bidang, currentMonth);
      const params: Parameter[] = config.map(({ column, weight }) => ({
        id: column.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        label: column,
        value: null,
        originalWeight: weight,
        normalizedWeight: 0,
        isActive: false,
      }));
      
      setParameters(params);
      setKumulatif(0);
      
      const totalTime = performance.now() - startTime;
      console.log(`❌ [BIDANG-${bidang.toUpperCase()}] Failed after ${(totalTime / 1000).toFixed(3)} seconds`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [username, bidang, month, apiRoute.revision]);

  return {
    parameters,
    kumulatif,
    loading,
    error,
    refetch: fetchStats,
  };
};
