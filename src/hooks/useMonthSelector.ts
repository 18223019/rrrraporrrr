/**
 * useMonthSelector Hook - Manage month/period selection
 */

import { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { getAvailableMonths, type MonthOption, type ApiMeta } from '../services/api';
import { useApiRoute } from './useApiRoute';

const ENV_DEFAULT_MONTH = import.meta.env.VITE_DEFAULT_MONTH ?? '';
const DEFAULT_ACADEMIC_MONTH = 'Agustus26';
const MONTH_QUERY_KEYS = ['month', 'period'];

type MonthSource = 'query' | 'storage' | 'environment' | 'default';

interface InitialMonthInfo {
  value: string;
  source: MonthSource;
}

interface UseMonthSelectorReturn {
  months: MonthOption[];
  selectedMonth: string;
  setSelectedMonth: (month: string) => void;
  currentMonth: MonthOption | null;
  loading: boolean;
  error: Error | null;
}

/**
 * Generate the report periods for the current academic year.
 */
function generateAcademicYearMonths(): MonthOption[] {
  return [
    { value: 'Agustus26', label: 'Agustus 2026', available: false },
    { value: 'September26', label: 'September 2026', available: false },
  ];
}

const MONTH_BLUEPRINT = generateAcademicYearMonths();

const MONTH_CANONICAL_LOOKUP = (() => {
  const map = new Map<string, string>();
  MONTH_BLUEPRINT.forEach(({ value }) => {
    const canonical = value;
    const lower = canonical.toLowerCase();
    const collapsed = lower.replace(/\s+/g, '');
    map.set(canonical, canonical);
    map.set(lower, canonical);
    map.set(collapsed, canonical);
  });
  return map;
})();

function cloneMonthBlueprint(): MonthOption[] {
  return MONTH_BLUEPRINT.map((month) => ({ ...month }));
}

/**
 * Get selected month from localStorage or default to current month
 */
function normaliseMonthValue(value: string | null | undefined): string {
  if (!value) {
    return '';
  }

  const collapsed = value.replace(/\s+/g, '').toLowerCase();
  if (!collapsed) {
    return '';
  }

  return MONTH_CANONICAL_LOOKUP.get(collapsed) ?? '';
}

function resolveInitialMonth(): InitialMonthInfo {
  if (typeof window === 'undefined') {
    const envValue = normaliseMonthValue(ENV_DEFAULT_MONTH);
    if (envValue) {
      return { value: envValue, source: 'environment' };
    }
    return { value: DEFAULT_ACADEMIC_MONTH, source: 'default' };
  }

  try {
    const searchParams = new URLSearchParams(window.location.search);
    for (const key of MONTH_QUERY_KEYS) {
      const fromQuery = normaliseMonthValue(searchParams.get(key));
      if (fromQuery) {
        try {
          window.localStorage.setItem('selectedMonth', fromQuery);
        } catch (err) {
          console.warn('⚠️ [MONTH SELECTOR] Failed to persist query month selection:', err);
        }
        return { value: fromQuery, source: 'query' };
      }
    }
  } catch (err) {
    console.warn('⚠️ [MONTH SELECTOR] Failed to read query params for initial month:', err);
  }

  try {
    const stored = normaliseMonthValue(window.localStorage.getItem('selectedMonth'));
    if (stored) {
      return { value: stored, source: 'storage' };
    }
  } catch (err) {
    console.warn('⚠️ [MONTH SELECTOR] Failed to read localStorage:', err);
  }

  const envValue = normaliseMonthValue(ENV_DEFAULT_MONTH);
  if (envValue) {
    return { value: envValue, source: 'environment' };
  }

  return { value: DEFAULT_ACADEMIC_MONTH, source: 'default' };
}

export const useMonthSelector = (username?: string): UseMonthSelectorReturn => {
  const initialMonthInfoRef = useRef<InitialMonthInfo | null>(null);
  const clientHydratedRef = useRef(false);

  if (initialMonthInfoRef.current === null) {
    initialMonthInfoRef.current = resolveInitialMonth();
  }

  if (typeof window !== 'undefined' && !clientHydratedRef.current) {
    const clientResolved = resolveInitialMonth();
    // Only update if we resolved to a different source/value to avoid needless state churn
    if (
      initialMonthInfoRef.current.value !== clientResolved.value ||
      initialMonthInfoRef.current.source !== clientResolved.source
    ) {
      initialMonthInfoRef.current = clientResolved;
    }
    clientHydratedRef.current = true;
  }

  const [months, setMonths] = useState<MonthOption[]>(() => cloneMonthBlueprint());
  const initialMonth = username?.toLowerCase() === 'malikah' ? 'September26' : initialMonthInfoRef.current!.value;
  const [selectedMonth, setSelectedMonthState] = useState<string>(() => initialMonth);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const apiRoute = useApiRoute();
  const fallbackDefaultMonth = username?.toLowerCase() === 'malikah'
    ? 'September26'
    : normaliseMonthValue(ENV_DEFAULT_MONTH) || DEFAULT_ACADEMIC_MONTH;
  
  // Wrapper to persist to localStorage when month changes
  const setSelectedMonth = (month: string, options: { persist?: boolean } = {}) => {
    const { persist = true } = options;
    setSelectedMonthState(month);

    if (!persist) {
      return;
    }

    if (typeof window === 'undefined') {
      return;
    }

    try {
      window.localStorage.setItem('selectedMonth', month);
    } catch (err) {
      console.warn('⚠️ [MONTH SELECTOR] Failed to persist selected month:', err);
    }
  };

  useLayoutEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const info = initialMonthInfoRef.current ?? resolveInitialMonth();

    if (info.value && info.value !== selectedMonth) {
      // During hydration make sure we follow the real client preference (typically from ?month=)
      setSelectedMonth(info.value, { persist: info.source !== 'query' });
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      const stored = window.localStorage.getItem('selectedMonth');
      if (stored && stored !== selectedMonth) {
        setSelectedMonth(stored, { persist: false });
      }
    } catch (err) {
      console.warn('⚠️ [MONTH SELECTOR] Failed to sync initial month from storage:', err);
    }
  }, []);

  useEffect(() => {
    const fetchMonths = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await getAvailableMonths();
        const responseMeta = (response as unknown as { __meta?: ApiMeta }).__meta ?? null;
        if (responseMeta) {
          console.log(
            `[MONTH SELECTOR] Available months source=${responseMeta.source} stale=${responseMeta.stale ?? false} target=${apiRoute.target}`,
            responseMeta,
          );
        }

        if (response.success && response.data) {
          const allowedMonths = new Set(['Agustus26', 'September26']);
          const isMalikah = username?.toLowerCase() === 'malikah';
          const hasCurrentPeriodData = response.data.some(
            (month) => allowedMonths.has(month.value),
          );
          const availableValuesFromApi = response.data
            .filter((month) => allowedMonths.has(month.value))
            .filter((month) => month.available && (!isMalikah || month.value === 'September26'))
            .map((month) => month.value);
          const availableValues = hasCurrentPeriodData
            ? availableValuesFromApi
            : (isMalikah ? ['September26'] : ['Agustus26', 'September26']);
          const availabilityMap = new Map(
            MONTH_BLUEPRINT.map((month) => [
              month.value,
              hasCurrentPeriodData
                ? allowedMonths.has(month.value) && Boolean(
                    response.data.find((item) => item.value === month.value)?.available,
                  ) && (!isMalikah || month.value === 'September26')
                : allowedMonths.has(month.value) && (!isMalikah || month.value === 'September26'),
            ]),
          );

          let storedMonth: string | null = null;
          try {
            storedMonth = window.localStorage.getItem('selectedMonth');
          } catch (err) {
            console.warn('⚠️ [MONTH SELECTOR] Unable to read stored month during availability check:', err);
          }

          let resolvedSelection = selectedMonth || storedMonth || '';

          setMonths((prevMonths) => {
            const updatedMonths = prevMonths.map((month) => {
              const available = availabilityMap.get(month.value) ?? false;
              return {
                ...month,
                available,
              };
            });

            return updatedMonths;
          });

          const resolvedAvailable = resolvedSelection
            ? availabilityMap.get(resolvedSelection) ?? false
            : false;

          const initialSource = initialMonthInfoRef.current?.source ?? 'default';

          if (resolvedSelection && resolvedAvailable) {
            if (resolvedSelection !== selectedMonth) {
              setSelectedMonth(resolvedSelection, { persist: false });
            }
          } else if (resolvedSelection && initialSource === 'query') {
            console.log('[MONTH SELECTOR] Preserving query month despite availability flag');
            if (resolvedSelection !== selectedMonth) {
              setSelectedMonth(resolvedSelection, { persist: false });
            }
          } else if (availableValues.length > 0) {
            const fallback = availableValues[availableValues.length - 1];
            const shouldPersist = Boolean(resolvedSelection || storedMonth);
            console.log(`[MONTH SELECTOR] Switching to available month: ${fallback}`);
            setSelectedMonth(fallback, { persist: shouldPersist });
          } else if (!selectedMonth) {
            console.log('[MONTH SELECTOR] No available months found, using default academic month');
            setSelectedMonth(fallbackDefaultMonth, { persist: false });
          }
        } else {
          console.warn('⚠️ API response invalid, using fallback');
          // API failed, mark default month as available by default
          setMonths((prevMonths) => prevMonths.map(month => ({
            ...month,
            available: month.value === fallbackDefaultMonth,
          })));
        }
      } catch (err) {
        console.error('❌ Error fetching available months:', err);
        setError(err instanceof Error ? err : new Error('Failed to fetch months'));
        
        // Fallback: mark default month as available
        setMonths((prevMonths) => prevMonths.map(month => ({
          ...month,
          available: month.value === fallbackDefaultMonth,
        })));
      } finally {
        setLoading(false);
      }
    };

    fetchMonths();
  }, [apiRoute.revision, username]); // Refetch when API routing or member changes
  
  // Listen for localStorage changes from other tabs/windows
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'selectedMonth' && e.newValue) {
        console.log(`🔄 [MONTH SELECTOR] Syncing from other tab: ${e.newValue}`);
        setSelectedMonthState(e.newValue);
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const currentMonth = months.find(m => m.value === selectedMonth) || null;

  return {
    months,
    selectedMonth,
    setSelectedMonth,
    currentMonth,
    loading,
    error,
  };
};
