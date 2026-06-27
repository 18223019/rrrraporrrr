/**
 * useDashboardPrefetch Hook - Background prefetch all available months
 */

import { useEffect, useRef } from 'react';
import { dashboardCache } from '../utils/dashboardCache';
import { calculateStats } from '../utils/dashboardStats';
import type { MonthOption } from '../services/api';

interface UseDashboardPrefetchOptions {
  username: string;
  availableMonths: MonthOption[];
  currentMonth: string;
  enabled?: boolean;
}

export const useDashboardPrefetch = ({
  username,
  availableMonths,
  currentMonth,
  enabled = true,
}: UseDashboardPrefetchOptions) => {
  const prefetchedRef = useRef(false);

  useEffect(() => {
    // Only prefetch once per session
    if (!enabled || !username || prefetchedRef.current || availableMonths.length === 0) {
      return;
    }

    // Delay prefetch to not interfere with initial load
    const timeoutId = setTimeout(async () => {
      console.log('[PREFETCH] Starting background prefetch for all months...');
      const startTime = performance.now();

      try {
        const apiModule = await import('../services/api');
        
        // Filter months to prefetch (exclude current month, only available ones)
        const monthsToPrefetch = availableMonths
          .filter(m => m.available && m.value !== currentMonth)
          .map(m => m.value);

        console.log(`[PREFETCH] Will prefetch ${monthsToPrefetch.length} months:`, monthsToPrefetch);

        // Prefetch in background (don't await, fire and forget)
        let successCount = 0;
        let failCount = 0;

        const prefetchPromises = monthsToPrefetch.map(async (month) => {
          // Skip if already cached or in progress
          if (dashboardCache.get(username, month) || dashboardCache.isPrefetching(username, month)) {
            console.log(`[PREFETCH] Skipping ${month} (already cached or in progress)`);
            return;
          }

          dashboardCache.markPrefetching(username, month);

          try {
            // Fetch score for this month
            const response = await apiModule.getScoreByName(month, username);
            
            if (response.success && response.data) {
              // Calculate stats (without history for prefetch - faster)
              const stats = calculateStats(response.data, month, undefined);
              
              // Store in cache
              dashboardCache.set(username, month, stats);
              successCount++;
              console.log(`[PREFETCH] ✓ ${month} cached`);
            } else {
              failCount++;
              console.warn(`[PREFETCH] ✗ ${month} failed - no data`);
            }
          } catch (error) {
            failCount++;
            console.warn(`[PREFETCH] ✗ ${month} failed:`, error);
          } finally {
            dashboardCache.markPrefetchComplete(username, month);
          }
        });

        // Wait for all to complete (in background)
        await Promise.allSettled(prefetchPromises);

        const totalTime = performance.now() - startTime;
        console.log(
          `[PREFETCH] Complete! ${successCount} success, ${failCount} failed. ` +
          `Total time: ${(totalTime / 1000).toFixed(2)}s`
        );
        
        // Log cache stats
        const cacheStats = dashboardCache.getStats();
        console.log('[PREFETCH] Cache now contains:', cacheStats);

      } catch (error) {
        console.error('[PREFETCH] Background prefetch error:', error);
      }

      prefetchedRef.current = true;
    }, 1500); // Wait 1.5s after initial load

    return () => clearTimeout(timeoutId);
  }, [username, availableMonths, currentMonth, enabled]);
};
