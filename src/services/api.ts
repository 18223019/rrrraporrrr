/**
 * API Service for fetching data from Google Apps Script or Worker
 * WITH IN-MEMORY CACHING (5 minute TTL)
 */

// ========================================
// CACHE CONFIGURATION
// ========================================

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

class ApiCache {
  private cache = new Map<string, CacheEntry<any>>();
  private readonly TTL = 10 * 60 * 1000; // 10 minutes in milliseconds

  set<T>(key: string, data: T): void {
    const now = Date.now();
    const entry: CacheEntry<T> = {
      data,
      timestamp: now,
      expiresAt: now + this.TTL,
    };
    this.cache.set(key, entry);
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      console.log(`${key}`);
      return null;
    }

    const now = Date.now();
    if (now > entry.expiresAt) {
      console.log(`Cache Expired: ${key} (${Math.round((now - entry.expiresAt) / 1000)}s ago)`);
      this.cache.delete(key);
      return null;
    }

    const age = Math.round((now - entry.timestamp) / 1000);
    const remaining = Math.round((entry.expiresAt - now) / 1000);
    console.log(`Cache Hit: ${key} (age: ${age}s, expires in: ${remaining}s)`);
    return entry.data as T;
  }

  clear(): void {
    console.log(`Cache Cleared ${this.cache.size} entries`);
    this.cache.clear();
  }

  getStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }
}

// Global cache instance
const apiCache = new ApiCache();

type FetchResource = 'scores' | 'history' | 'members' | 'months';

// ========================================
// API CONFIGURATION
// ========================================

type ApiTarget = 'gas' | 'worker' | 'pages';

const API_BASE = import.meta.env.VITE_API_BASE || '/api';
const GAS_URL = import.meta.env.VITE_GAS_URL || '';
const DEFAULT_TARGET: ApiTarget = import.meta.env.VITE_USE_WORKER === 'true' ? 'worker' : 'gas';
const RENDER_MODE = (import.meta.env.VITE_RENDER_MODE || 'csr').toLowerCase();
const CANARY_COOKIE = import.meta.env.VITE_CANARY_COOKIE || 'rapor_canary';
const CANARY_VALUE = import.meta.env.VITE_CANARY_VALUE || 'v1';
const CANARY_QUERY_KEY = import.meta.env.VITE_CANARY_QUERY_KEY || 'use';
const CANARY_HEADER = 'x-rapor-canary';

const CANARY_MAX_AGE_INPUT = Number(import.meta.env.VITE_CANARY_MAX_AGE ?? '7200');
const CANARY_MAX_AGE_SECONDS = Number.isFinite(CANARY_MAX_AGE_INPUT) && CANARY_MAX_AGE_INPUT > 0
  ? Math.floor(CANARY_MAX_AGE_INPUT)
  : 7200;

export const CANARY_COOKIE_NAME = CANARY_COOKIE;
export const CANARY_COOKIE_VALUE = CANARY_VALUE;
export const CANARY_QUERY_PARAM = CANARY_QUERY_KEY;
export const CANARY_HEADER_NAME = CANARY_HEADER;
export const CANARY_STORAGE_KEY = `${CANARY_COOKIE}-sync`;
export const CANARY_AUTO_STORAGE_KEY = `${CANARY_COOKIE}-auto`;
const DEFAULT_ORIGIN = typeof window !== 'undefined' && window.location?.origin
  ? window.location.origin
  : 'https://localhost';

const RESOURCE_MAP: Record<string, FetchResource> = {
  '/scores': 'scores',
  '/history': 'history',
  '/members': 'members',
  '/months': 'months',
};

interface RequestConfig {
  url: string;
  target: ApiTarget;
  headers: Record<string, string>;
  credentials: RequestCredentials;
}

function getQueryOverride(): ApiTarget | null {
  const value = getSearchParam(CANARY_QUERY_KEY)?.toLowerCase();
  if (!value) return null;
  if (value === 'pages' || value === 'proxy') return 'pages';
  if (value === 'worker') return 'worker';
  if (value === 'gas' || value === 'direct') return 'gas';
  return null;
}

function getSearchParam(name: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const params = new URLSearchParams(window.location.search);
    return params.get(name);
  } catch (error) {
    console.warn('Failed to read search params:', error);
    return null;
  }
}

function hasCanaryCookie(): boolean {
  if (typeof document === 'undefined') return false;
  const value = getCookie(CANARY_COOKIE);
  return value === CANARY_VALUE;
}

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const pattern = `(?:^|; )${name.replace(/([.$?*|{}()\[\]\\\/\+^])/g, '\\$1')}=([^;]*)`;
  const match = document.cookie.match(new RegExp(pattern));
  return match ? decodeURIComponent(match[1]) : null;
}

function isCanaryActive(): boolean {
  const override = getQueryOverride();
  if (override) {
    return override === 'pages';
  }
  return hasCanaryCookie();
}

function broadcastCanaryChange(status: 'on' | 'off') {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(
      CANARY_STORAGE_KEY,
      JSON.stringify({ status, ts: Date.now() }),
    );
  } catch {
    // ignore localStorage failures (Safari private mode, etc.)
  }
  try {
    window.dispatchEvent(new Event('rapor-canary-change'));
  } catch {
    // ignore dispatch failures
  }
}

export function enableCanaryCookie(maxAgeSeconds: number = CANARY_MAX_AGE_SECONDS) {
  if (typeof document === 'undefined') return;
  const seconds = Number.isFinite(maxAgeSeconds) && maxAgeSeconds > 0
    ? Math.floor(maxAgeSeconds)
    : CANARY_MAX_AGE_SECONDS;
  const secure = typeof window !== 'undefined' && window.location?.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${CANARY_COOKIE}=${CANARY_VALUE}; path=/; max-age=${seconds}; SameSite=Lax${secure}`;
  broadcastCanaryChange('on');
}

export function disableCanaryCookie() {
  if (typeof document === 'undefined') return;
  const secure = typeof window !== 'undefined' && window.location?.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${CANARY_COOKIE}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax${secure}`;
  broadcastCanaryChange('off');
}

function getCurrentTarget(): ApiTarget {
  const override = getQueryOverride();
  if (override) {
    return override;
  }

  if (RENDER_MODE === 'proxy' || RENDER_MODE === 'ssr' || RENDER_MODE === 'isr') {
    return 'pages';
  }

  if (RENDER_MODE === 'worker') {
    return 'worker';
  }

  if (isCanaryActive()) {
    return 'pages';
  }

  return DEFAULT_TARGET;
}

function resolveResource(path: string): FetchResource {
  const resource = RESOURCE_MAP[path as keyof typeof RESOURCE_MAP];
  if (!resource) {
    throw new Error(`Unsupported API path: ${path}`);
  }
  return resource;
}

function createRequest(path: string, params?: Record<string, string>): RequestConfig {
  const target = getCurrentTarget();
  const resource = resolveResource(path);
  const searchParams = new URLSearchParams();

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (typeof value === 'string') {
        searchParams.set(key, value);
      }
    });
  }

  let url: URL;
  if (target === 'pages') {
    url = buildUrl(API_BASE, 'rapor');
    url.searchParams.set('resource', resource);
    searchParams.forEach((value, key) => {
      url.searchParams.set(key, value);
    });
  } else if (target === 'worker') {
    url = buildUrl(API_BASE, resource);
    searchParams.forEach((value, key) => {
      url.searchParams.set(key, value);
    });
  } else {
    if (!GAS_URL) {
      console.error('GAS URL not configured. Set VITE_GAS_URL in .env');
      throw new Error('GAS URL not configured');
    }
    url = new URL(GAS_URL);
    url.searchParams.set('path', resource);
    searchParams.forEach((value, key) => {
      url.searchParams.set(key, value);
    });
  }

  const headers: Record<string, string> = {
    Accept: 'application/json',
  };

  if (target === 'pages' && isCanaryActive()) {
    headers[CANARY_HEADER] = 'true';
  }

  return {
    url: url.toString(),
    target,
    headers,
    credentials: target === 'gas' ? 'omit' : 'same-origin',
  };
}

function buildUrl(base: string, segment?: string): URL {
  if (/^https?:\/\//i.test(base)) {
    const absolute = new URL(base);
    if (segment) {
      absolute.pathname = joinPaths(absolute.pathname, segment);
    }
    return absolute;
  }

  const resolved = new URL(DEFAULT_ORIGIN);
  const path = segment ? joinPaths(base || '/', segment) : base;
  resolved.pathname = normalisePath(path || '/');
  return resolved;
}

function joinPaths(base: string, segment: string): string {
  const basePart = normalisePath(base);
  const segmentPart = normalisePath(segment);
  if (!basePart || basePart === '/') {
    return segmentPart.startsWith('/') ? segmentPart : `/${segmentPart}`;
  }
  if (!segmentPart || segmentPart === '/') {
    return basePart;
  }
  return `${basePart.replace(/\/$/, '')}/${segmentPart.replace(/^\//, '')}`;
}

function normalisePath(path: string): string {
  if (!path) return '/';
  if (path === '/') return '/';
  return path.startsWith('/') ? path : `/${path}`;
}

export interface ApiMeta {
  resource: string;
  cacheKey: string;
  fetchedAt: string;
  source: string;
  stale?: boolean;
}

type ApiEnvelope<T> = {
  meta: ApiMeta;
  payload: T;
};

function unwrapPayload<T>(raw: T | ApiEnvelope<T>): T {
  if (raw && typeof raw === 'object' && raw !== null) {
    const maybeEnvelope = raw as Partial<ApiEnvelope<T>>;
    if (maybeEnvelope.meta && maybeEnvelope.payload !== undefined) {
      attachMeta(maybeEnvelope.payload, maybeEnvelope.meta);
      return maybeEnvelope.payload;
    }
  }
  return raw as T;
}

function attachMeta(target: unknown, meta: ApiMeta) {
  if (!target || (typeof target !== 'object' && !Array.isArray(target))) {
    return;
  }

  try {
    Object.defineProperty(target, '__meta', {
      value: meta,
      enumerable: false,
      configurable: true,
    });
  } catch (error) {
    console.warn('Failed to attach meta to payload', error);
  }
}

/**
 * Fetch with error handling and caching
 */
async function fetchApi<T>(request: RequestConfig, cacheKey?: string): Promise<T> {
  const { url, headers, credentials, target } = request;
  const effectiveCacheKey = cacheKey ? `${target}:${cacheKey}` : undefined;

  if (effectiveCacheKey) {
    const cached = apiCache.get<T>(effectiveCacheKey);
    if (cached) {
      return cached;
    }
  }

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers,
      credentials,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const raw = await response.json();

    if (raw && typeof raw === 'object' && 'error' in raw && (raw as any).error) {
      throw new Error((raw as any).message || (raw as any).error);
    }

    const payload = unwrapPayload(raw) as T;

    if (payload && typeof payload === 'object' && 'error' in (payload as any)) {
      const errorPayload = payload as any;
      throw new Error(errorPayload.message || errorPayload.error);
    }

    if (effectiveCacheKey) {
      apiCache.set(effectiveCacheKey, payload);
    }

    return payload;
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
}

// ========================================
// TYPES
// ========================================

export interface ScoreRecord {
  Panggilan: string;
  'Skor Total': number;
  Kehadiran: number;
  Tahfidz: number;
  Kebersihan: number;
  Ketertiban: number;
  Muamalah: number;
  [key: string]: any;
}

export interface ScoresResponse {
  success: boolean;
  month: string;
  count: number;
  data: ScoreRecord[];
  timestamp: string;
  cache: number;
}

export interface ScoreByNameResponse {
  success: boolean;
  month: string;
  name: string;
  data: ScoreRecord;
  timestamp: string;
  cache: number;
}

export interface HistoryResponse {
  success: boolean;
  name: string;
  months: number;
  count: number;
  data: (ScoreRecord & { month: string })[];
  timestamp: string;
  cache: number;
}

export interface Member {
  name: string;
  username: string;
  slug: string;
  panggilan: string;
  email: string;
  uid: string;
  role: string;
  nim?: string;
  jurusan?: string;
}

export interface MembersResponse {
  success: boolean;
  count: number;
  data: Member[];
  timestamp: string;
  cache: number;
}

// ========================================
// API FUNCTIONS
// ========================================

/**
 * Get all scores for a specific month
 * @param month - Month sheet name (e.g., "Oktober25")
 */
export async function getScores(month: string): Promise<ScoresResponse> {
  const request = createRequest('/scores', { month });
  const cacheKey = `scores:${month}`;
  return fetchApi<ScoresResponse>(request, cacheKey);
}

/**
 * Get score for a specific member in a month
 * @param month - Month sheet name
 * @param name - Member's name (Panggilan)
 */
export async function getScoreByName(
  month: string,
  name: string
): Promise<ScoreByNameResponse> {
  const request = createRequest('/scores', { month, name });
  const cacheKey = `score:${month}:${name}`;
  return fetchApi<ScoreByNameResponse>(request, cacheKey);
}

/**
 * Get historical data for a member
 * @param name - Member's name (Panggilan)
 * @param months - Number of months to fetch (default: 3)
 */
export async function getHistory(
  name: string,
  months: number = 3
): Promise<HistoryResponse> {
  const request = createRequest('/history', { name, months: months.toString() });
  const cacheKey = `history:${name}:${months}`;
  return fetchApi<HistoryResponse>(request, cacheKey);
}

/**
 * Get all members
 */
export async function getMembers(): Promise<MembersResponse> {
  const request = createRequest('/members');
  const cacheKey = 'members:all';
  return fetchApi<MembersResponse>(request, cacheKey);
}

/**
 * Get available months/periods
 */
export interface MonthOption {
  value: string;      // Sheet name (e.g., "September25")
  label: string;      // Display name (e.g., "September 2025")
  available: boolean; // Whether data exists
}

export interface MonthsResponse {
  success: boolean;
  data: MonthOption[];
  timestamp: string;
  cache: number;
}

export async function getAvailableMonths(): Promise<MonthsResponse> {
  const request = createRequest('/months');
  const cacheKey = 'months:available';
  return fetchApi<MonthsResponse>(request, cacheKey);
}

// ========================================
// METRICS
// ========================================

export type MetricsBucketKey = 'total' | 'live' | 'snapshot' | 'canary' | 'error';

export interface MetricsBucketSummary {
  total: number;
  live: number;
  snapshot: number;
  canary: number;
  error: number;
}

export interface MetricsSummaryResponse {
  dates: string[];
  metrics: Record<string, Record<string, MetricsBucketSummary>>;
}

export interface MetricsSummaryQuery {
  resource?: string;
  days?: number;
  date?: string;
}

export async function fetchMetricsSummary(
  params: MetricsSummaryQuery = {},
): Promise<MetricsSummaryResponse> {
  const url = buildUrl(API_BASE, 'metrics');

  if (params.resource) {
    url.searchParams.set('resource', params.resource);
  }

  if (Number.isFinite(params.days) && params.days) {
    url.searchParams.set('days', String(Math.max(1, Math.min(7, Math.floor(params.days)))));
  }

  if (params.date) {
    url.searchParams.set('date', params.date);
  }

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
    credentials: 'same-origin',
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const payload = (await response.json()) as MetricsSummaryResponse;
  return payload;
}

/**
 * Get PDF URL for a member's rapor
 * @param month - Month name
 * @param slug - Member's slug
 */
export function getPDFUrl(month: string, slug: string): string {
  const target = getCurrentTarget();
  if (target === 'gas') {
    return '';
  }

  const url = buildUrl(API_BASE, 'pdf');
  url.searchParams.set('month', month);
  url.searchParams.set('name', slug);
  return url.toString();
}

// ========================================
// HELPER FUNCTIONS
// ========================================

/**
 * Check if API is configured
 */
export function isApiConfigured(): boolean {
  if (GAS_URL) {
    return true;
  }
  return Boolean(API_BASE);
}

/**
 * Get API status
 */
export async function getApiStatus(): Promise<{
  configured: boolean;
  target: ApiTarget;
  canary: boolean;
  renderMode: string;
  baseUrl: string;
}> {
  const target = getCurrentTarget();
  return {
    configured: isApiConfigured(),
    target,
    canary: isCanaryActive(),
    renderMode: RENDER_MODE,
    baseUrl: target === 'gas' ? GAS_URL : API_BASE,
  };
}

export function getActiveApiRouting(): {
  target: ApiTarget;
  canary: boolean;
  renderMode: string;
} {
  return {
    target: getCurrentTarget(),
    canary: isCanaryActive(),
    renderMode: RENDER_MODE,
  };
}

// ========================================
// CACHE MANAGEMENT
// ========================================

/**
 * Clear all cached API data
 */
export function clearCache(): void {
  apiCache.clear();
}

/**
 * Get cache statistics
 */
export function getCacheStats(): { size: number; keys: string[] } {
  return apiCache.getStats();
}
