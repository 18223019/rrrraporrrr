/**
 * Dashboard Cache Manager - In-memory cache for dashboard stats
 * Prefetches all available months in background for instant switching
 */

import type { DashboardStats } from '../types/user';

interface CacheEntry {
  stats: DashboardStats;
  timestamp: number;
  month: string;
  username: string;
}

class DashboardCacheManager {
  private cache = new Map<string, CacheEntry>();
  private prefetchInProgress = new Set<string>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  private getCacheKey(username: string, month: string): string {
    return `${username}:${month}`;
  }

  /**
   * Get cached stats if available and not expired
   */
  get(username: string, month: string): DashboardStats | null {
    const key = this.getCacheKey(username, month);
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    const age = Date.now() - entry.timestamp;
    if (age > this.CACHE_TTL) {
      console.log(`[CACHE] Expired for ${month} (age: ${Math.round(age / 1000)}s)`);
      this.cache.delete(key);
      return null;
    }

    console.log(`[CACHE] Hit for ${month} (age: ${Math.round(age / 1000)}s)`);
    return entry.stats;
  }

  /**
   * Set cached stats
   */
  set(username: string, month: string, stats: DashboardStats): void {
    const key = this.getCacheKey(username, month);
    this.cache.set(key, {
      stats,
      timestamp: Date.now(),
      month,
      username,
    });
    console.log(`[CACHE] Stored ${month}`);
  }

  /**
   * Check if prefetch is in progress
   */
  isPrefetching(username: string, month: string): boolean {
    return this.prefetchInProgress.has(this.getCacheKey(username, month));
  }

  /**
   * Mark prefetch as in progress
   */
  markPrefetching(username: string, month: string): void {
    this.prefetchInProgress.add(this.getCacheKey(username, month));
  }

  /**
   * Mark prefetch as complete
   */
  markPrefetchComplete(username: string, month: string): void {
    this.prefetchInProgress.delete(this.getCacheKey(username, month));
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear();
    this.prefetchInProgress.clear();
    console.log('[CACHE] Cleared all');
  }

  /**
   * Clear cache for specific user
   */
  clearUser(username: string): void {
    const keysToDelete: string[] = [];
    this.cache.forEach((entry, key) => {
      if (entry.username === username) {
        keysToDelete.push(key);
      }
    });
    keysToDelete.forEach(key => this.cache.delete(key));
    console.log(`[CACHE] Cleared ${keysToDelete.length} entries for ${username}`);
  }

  /**
   * Get cache stats for debugging
   */
  getStats(): { size: number; entries: Array<{ key: string; age: number }> } {
    const entries: Array<{ key: string; age: number }> = [];
    this.cache.forEach((entry, key) => {
      entries.push({
        key,
        age: Math.round((Date.now() - entry.timestamp) / 1000),
      });
    });
    return { size: this.cache.size, entries };
  }
}

// Singleton instance
export const dashboardCache = new DashboardCacheManager();
