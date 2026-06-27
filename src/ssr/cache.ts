import type { KVNamespace } from '@cloudflare/workers-types';

export type DashboardCacheEnv = {
  RAPOR_CACHE?: KVNamespace;
};

export type DashboardSnapshot = {
  version: 'v1';
  cachedAt: string;
  slug: string;
  month: string;
  html: string;
  headers: Record<string, string>;
};

export const DASHBOARD_CACHE_TTL_SECONDS = 60 * 15; // 15 minutes by default
export const DASHBOARD_CACHE_STALE_SECONDS = 60 * 15; // serve stale up to additional 15 minutes
export const DASHBOARD_CACHE_PREFIX = 'dashboard';
export const DASHBOARD_CACHE_CONTROL = 'public, s-maxage=300, stale-while-revalidate=900';
export const DASHBOARD_CONTENT_TYPE = 'text/html; charset=utf-8';

export function createDashboardCacheKey({ slug, month }: { slug: string; month: string }) {
  const safeSlug = encodeURIComponent(slug.trim().toLowerCase());
  const safeMonth = encodeURIComponent(month.trim().toLowerCase());
  return `${DASHBOARD_CACHE_PREFIX}:${safeSlug}:${safeMonth}`;
}

export async function readDashboardSnapshot(env: DashboardCacheEnv, cacheKey: string) {
  if (!env.RAPOR_CACHE) {
    return null;
  }

  const record = await env.RAPOR_CACHE.get(cacheKey, { type: 'json' });
  if (!record) {
    return null;
  }

  try {
    const snapshot = record as DashboardSnapshot;
    if (!snapshot.html || !snapshot.slug || !snapshot.month) {
      return null;
    }
    return snapshot;
  } catch (error) {
    console.warn(`Invalid dashboard snapshot for key ${cacheKey}:`, error);
    return null;
  }
}

export async function writeDashboardSnapshot(
  env: DashboardCacheEnv,
  cacheKey: string,
  snapshot: DashboardSnapshot,
) {
  if (!env.RAPOR_CACHE) {
    return;
  }

  await env.RAPOR_CACHE.put(cacheKey, JSON.stringify(snapshot), {
    expirationTtl: DASHBOARD_CACHE_TTL_SECONDS + DASHBOARD_CACHE_STALE_SECONDS,
  });
}

export async function deleteDashboardSnapshot(env: DashboardCacheEnv, cacheKey: string) {
  if (!env.RAPOR_CACHE) {
    return;
  }

  await env.RAPOR_CACHE.delete(cacheKey);
}

export function describeDashboardCacheKey(cacheKey: string) {
  const [prefix, slug, month] = cacheKey.split(':');
  if (prefix !== DASHBOARD_CACHE_PREFIX || !slug || !month) {
    return null;
  }

  return {
    slug: decodeURIComponent(slug),
    month: decodeURIComponent(month),
  };
}
