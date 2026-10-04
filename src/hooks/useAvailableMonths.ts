/**
 * useAvailableMonths Hook
 * Fetch available months/sheets for coach to select
 */

import { useState, useEffect } from 'react';
import { getAvailableMonths } from '../services/api';
import type { ApiMeta } from '../services/api';
import { useApiRoute } from './useApiRoute';

export interface MonthOption {
  value: string;
  label: string;
  isDefault?: boolean;
}

export const useAvailableMonths = () => {
  const apiRoute = useApiRoute();
  const [months, setMonths] = useState<MonthOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [defaultMonth, setDefaultMonth] = useState<string>('');
  const [meta, setMeta] = useState<ApiMeta | null>(null);

  useEffect(() => {
    const fetchMonths = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await getAvailableMonths();
        const responseMeta = (response as unknown as { __meta?: ApiMeta }).__meta ?? null;
        if (responseMeta) {
          console.log(
            `📅 [useAvailableMonths] Source: ${responseMeta.source}, stale=${responseMeta.stale ?? false}`,
            responseMeta,
          );
        }
        setMeta(responseMeta);

        if (!response.success) {
          throw new Error('Failed to fetch available months');
        }

        console.log('[useAvailableMonths] Response:', response);

        // Use data from API response (already in MonthOption format)
        const currentPeriodData = response.data.filter(
          (month) => month.value === 'Agustus26' || month.value === 'September26',
        );
        const monthOptions: MonthOption[] = (currentPeriodData.length > 0
          ? currentPeriodData
          : [
              { value: 'Agustus26', label: 'Agustus 2026', available: true },
              { value: 'September26', label: 'September 2026', available: true },
            ]
        )
          .filter((month) => month.value === 'Agustus26' || month.value === 'September26')
          .map((month, index) => ({
          value: month.value,
          label: month.label,
          isDefault: index === 0, // First month is default
          }));

        setMonths(monthOptions);
        setDefaultMonth(monthOptions[0]?.value || '');

        console.log('[useAvailableMonths] Loaded months:', monthOptions.length);

      } catch (err) {
        console.error('❌ [useAvailableMonths] Error:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
        setMeta(null);
        
        // Fallback to hardcoded months if API fails
        const fallbackMonths: MonthOption[] = [
          { value: 'Agustus26', label: 'Agustus 2026', isDefault: true },
          { value: 'September26', label: 'September 2026' },
          { value: 'Oktober26', label: 'Oktober 2026' },
        ];
        
        setMonths(fallbackMonths);
        setDefaultMonth('Agustus26');
        
        console.warn('⚠️ [useAvailableMonths] Using fallback months');
      } finally {
        setLoading(false);
      }
    };

    fetchMonths();
  }, [apiRoute.revision]);

  return { months, loading, error, defaultMonth, meta };
};
