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
  getBidangGroup,
  getBidangColumnAliases,
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
  bonus: number;
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

function normalizeColumnName(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function readParameterValue(record: Record<string, unknown>, column: string): unknown {
  if (record[column] !== undefined) return record[column];

  const configuredAliases = getBidangColumnAliases(column);
  const configuredValue = configuredAliases.map((alias) => record[alias]).find((value) => value !== undefined);
  if (configuredValue !== undefined) return configuredValue;

  const aliases: Record<string, string[]> = {
    'Feedback (AHA)': ['Feedback AHA', 'Feedback'],
    'Pemulsaran Jenazah': ['Pemulasaran Jenazah', 'Pemulsaran jenazah'],
    'Temu Bidang II': ['Temu Bidang Il', 'Remu Bidang II'],
  };
  const candidates = [column, ...(aliases[column] ?? [])];
  const normalizedEntries = Object.entries(record).map(([key, value]) => [
    normalizeColumnName(key),
    value,
  ] as const);

  for (const candidate of candidates) {
    const match = normalizedEntries.find(([key]) => key === normalizeColumnName(candidate));
    if (match) return match[1];
  }

  return undefined;
}

export const useBidangStats = ({
  username,
  bidang,
  month,
}: UseBidangStatsOptions): UseBidangStatsReturn => {
  const apiRoute = useApiRoute();
  const [parameters, setParameters] = useState<Parameter[]>([]);
  const [bonus, setBonus] = useState(0);
  const [kumulatif, setKumulatif] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchStats = async () => {
    if (!username || !bidang) {
      setParameters([]);
      setBonus(0);
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
        const computation = computeBidangScore(
          bidang,
          (column) => readParameterValue(data, column),
          currentMonth,
          getBidangGroup(username),
        );
        const params: Parameter[] = computation.breakdown.map((item: BidangParameterBreakdown) => ({
          id: item.column.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
          label: item.column,
          value: item.isActive ? item.value : null,
          originalWeight: item.originalWeight,
          normalizedWeight: item.normalizedWeight,
          isActive: item.isActive,
        }));



        setParameters(params);
        setBonus(computation.bonus);
        const finalScore = Number(data['Final Score'] ?? data['Final score'] ?? data['FinalScore']);
        setKumulatif(
          bidang === 'osram' && Number.isFinite(finalScore)
            ? Math.round(finalScore * 10) / 10
            : Math.round(computation.score * 10) / 10,
        );

      } else {
    // No data found - set defaults with 0 values
    const config = getBidangParameterConfig(bidang, currentMonth, getBidangGroup(username));
        const params: Parameter[] = config.map(({ column, weight }) => ({
          id: column.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
          label: column,
          value: null,
          originalWeight: weight,
          normalizedWeight: 0,
          isActive: false,
        }));
        
        setParameters(params);
        setBonus(0);
        setKumulatif(0);
        
        const totalTime = performance.now() - startTime;
        console.log(`[BIDANG-${bidang.toUpperCase()}] TOTAL loading time (no data): ${(totalTime / 1000).toFixed(3)} seconds`);
      }
    } catch (err) {
      console.error('Error fetching bidang stats:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch bidang stats'));
      
    // Set default empty parameters on error
    const config = getBidangParameterConfig(bidang, currentMonth, getBidangGroup(username));
      const params: Parameter[] = config.map(({ column, weight }) => ({
        id: column.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        label: column,
        value: null,
        originalWeight: weight,
        normalizedWeight: 0,
        isActive: false,
      }));
      
      setParameters(params);
      setBonus(0);
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
    bonus,
    kumulatif,
    loading,
    error,
    refetch: fetchStats,
  };
};
