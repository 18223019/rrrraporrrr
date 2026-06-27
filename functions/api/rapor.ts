/// <reference types="@cloudflare/workers-types" />

import { z } from 'zod';

type FetchResource = 'scores' | 'history' | 'members' | 'months';

type SnapshotEnvelope<T> = {
  cachedAt: string;
  resource: FetchResource;
  params: Record<string, string>;
  payload: T;
};

type Env = {
  GAS_BASE_URL: string;
  RAPOR_CACHE?: KVNamespace;
};

const CANARY_HEADER_NAME = 'x-rapor-canary';
const CANARY_COOKIE_NAME = 'rapor_canary';
const CANARY_COOKIE_VALUE = 'v1';
const METRICS_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

const AllowedResourceSchema = z.enum(['scores', 'history', 'members', 'months']);
const NumberLike = z
  .union([z.string(), z.number(), z.null(), z.undefined()])
  .transform((value) => coerceNumber(value));

const ScoreRecordSchema = z
  .record(z.string(), z.union([NumberLike, z.string(), z.boolean(), z.null(), z.undefined()]))
  .superRefine((data, ctx) => {
    // Ensure at minimum "Panggilan" exists so downstream UI can function
    if (typeof data.Panggilan !== 'string' || !data.Panggilan) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Score record missing Panggilan field',
      });
    }
  });

const ScoresCollectionResponseSchema = z.object({
  success: z.boolean().optional().default(true),
  month: z.string().optional().nullable(),
  count: z.number().optional(),
  data: z.array(ScoreRecordSchema),
  timestamp: z.string().optional(),
  cache: z.number().optional().nullable(),
});

const ScoreSingleResponseSchema = z.object({
  success: z.boolean().optional().default(true),
  month: z.string().optional().nullable(),
  name: z.string(),
  data: ScoreRecordSchema,
  timestamp: z.string().optional(),
  cache: z.number().optional().nullable(),
});

const MembersResponseSchema = z.object({
  success: z.boolean().optional().default(true),
  count: z.number().optional(),
  data: z.array(
    z.object({
      name: z.string(),
      username: z.string(),
      slug: z.string(),
      panggilan: z.string(),
      email: z.string(),
      password: z.string().optional().nullable(),
      uid: z.string().optional().nullable(),
      role: z.string().optional().nullable(),
      nim: z.string().optional().nullable(),
      jurusan: z.string().optional().nullable(),
    }).passthrough(),
  ),
  timestamp: z.string().optional(),
});

const MonthsResponseSchema = z.object({
  success: z.boolean().optional().default(true),
  count: z.number().optional(),
  data: z.array(
    z.object({
      value: z.string(),
      label: z.string(),
      available: z.boolean().optional().default(false),
    }).transform((month) => ({
      ...month,
      available: Boolean(month.available),
    })),
  ),
  timestamp: z.string().optional(),
});

const HistoryResponseSchema = z.object({
  success: z.boolean().optional().default(true),
  name: z.string().optional().nullable(),
  months: z.number().optional().nullable(),
  count: z.number().optional(),
  data: z.array(
    ScoreRecordSchema.and(
      z.object({
        month: z.string(),
      }),
    ),
  ),
  timestamp: z.string().optional(),
});

const CACHE_CONTROL_HEADER = 'public, s-maxage=60, stale-while-revalidate=300';
const SNAPSHOT_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days
const UPSTREAM_TIMEOUT_MS = 6500;

export const onRequest: PagesFunction<Env> = async (context) => {
  try {
    const { request, env, waitUntil } = context;
    const url = new URL(request.url);

    const resourceParam = url.searchParams.get('resource');
    if (!resourceParam) {
      return badRequest('Missing "resource" query parameter. Expected one of scores|history|members|months.');
    }

    const parsedResource = AllowedResourceSchema.safeParse(resourceParam);
    if (!parsedResource.success) {
      return badRequest('Invalid resource value. Expected one of scores|history|members|months.');
    }

    const resource = parsedResource.data;
    const canaryRequest = isCanaryRequest(request);
    const validationError = validateRequiredParams(resource, url.searchParams);
    if (validationError) {
      return badRequest(validationError);
    }

    const upstreamParams = buildUpstreamParams(resource, url.searchParams);
    const cacheKey = createCacheKey(resource, upstreamParams);

    try {
      const payload = await fetchAndNormalize(resource, upstreamParams, env);
      await writeSnapshot(env, cacheKey, payload);

      const response = respond(resource, cacheKey, payload, false);
      scheduleMetrics(waitUntil, recordMetrics(env, {
        resource,
        cacheKey,
        snapshot: false,
        canary: canaryRequest,
        success: true,
      }));

      return response;
    } catch (error) {
      const fallback = await readSnapshot(env, cacheKey);
      if (fallback) {
        console.warn(`⚠️ Using snapshot for ${resource} due to upstream failure:`, error);
        const response = respond(resource, cacheKey, fallback, true);
        scheduleMetrics(waitUntil, recordMetrics(env, {
          resource,
          cacheKey,
          snapshot: true,
          canary: canaryRequest,
          success: true,
        }));
        return response;
      }

      console.error('❌ Upstream fetch failed with no snapshot fallback:', error);
      const response = new Response(
        JSON.stringify({
          error: 'UpstreamUnavailable',
          message: error instanceof Error ? error.message : 'Unknown upstream error',
        }),
        {
          status: 502,
          headers: jsonHeaders(),
        },
      );
      scheduleMetrics(waitUntil, recordMetrics(env, {
        resource,
        cacheKey,
        snapshot: false,
        canary: canaryRequest,
        success: false,
      }));
      return response;
    }
  } catch (error) {
    console.error('❌ Unexpected error in /api/rapor:', error);
    return new Response(
      JSON.stringify({
        error: 'InternalError',
        message: error instanceof Error ? error.message : 'Unexpected error',
      }),
      {
        status: 500,
        headers: jsonHeaders(),
      },
    );
  }
};

async function fetchAndNormalize(resource: FetchResource, params: URLSearchParams, env: Env) {
  const base = env.GAS_BASE_URL;
  if (!base) {
    throw new Error('GAS_BASE_URL not configured');
  }

  const upstreamUrl = new URL(base);
  params.forEach((value, key) => {
    upstreamUrl.searchParams.set(key, value);
  });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);

  try {
    const response = await fetch(upstreamUrl.toString(), {
      method: 'GET',
      headers: {
        'User-Agent': 'rapor-asrama-pages/1.0',
        Accept: 'application/json',
      },
      redirect: 'follow',
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Upstream returned HTTP ${response.status}`);
    }

    const raw = await response.json();
    return normalisePayload(resource, raw);
  } finally {
    clearTimeout(timeout);
  }
}

function normalisePayload(resource: FetchResource, raw: unknown) {
  switch (resource) {
    case 'scores': {
      const single = ScoreSingleResponseSchema.safeParse(raw);
      if (single.success) {
        return {
          ...single.data,
          count: 1,
          data: normaliseRecord(single.data.data),
        };
      }

      const parsed = ScoresCollectionResponseSchema.parse(raw);
      const data = parsed.data.map((record) => normaliseRecord(record));
      return {
        ...parsed,
        count: parsed.count ?? data.length,
        data,
      };
    }
    case 'history': {
      const parsed = HistoryResponseSchema.parse(raw);
      const data = parsed.data.map((record) => ({
        ...record,
        ...normaliseRecord(record),
      }));
      return {
        ...parsed,
        count: parsed.count ?? data.length,
        data,
      };
    }
    case 'members': {
      const parsed = MembersResponseSchema.parse(raw);
      const data = parsed.data.map((member) => ({
        ...member,
        nim: sanitizeString(member.nim),
        jurusan: sanitizeString(member.jurusan),
      }));
      return {
        ...parsed,
        count: parsed.count ?? data.length,
        data,
      };
    }
    case 'months': {
      const parsed = MonthsResponseSchema.parse(raw);
      const data = parsed.data.map((month) => ({
        ...month,
        available: Boolean(month.available),
      }));
      return {
        ...parsed,
        count: parsed.count ?? data.length,
        data,
      };
    }
    default: {
      const exhaustive: never = resource;
      throw new Error(`Unhandled resource ${exhaustive}`);
    }
  }
}

function respond(resource: FetchResource, cacheKey: string, payload: any, fromSnapshot: boolean) {
  const body = JSON.stringify({
    meta: {
      resource,
      cacheKey,
      fetchedAt: new Date().toISOString(),
      source: fromSnapshot ? 'snapshot' : 'live',
      stale: fromSnapshot,
    },
    payload,
  });

  return new Response(body, {
    status: 200,
    headers: {
      ...jsonHeaders(),
      'Cache-Control': CACHE_CONTROL_HEADER,
      'X-Data-Source': fromSnapshot ? 'snapshot' : 'live',
    },
  });
}

function isCanaryRequest(request: Request): boolean {
  const header = request.headers.get(CANARY_HEADER_NAME);
  if (header && header.toLowerCase() === 'true') {
    return true;
  }

  const cookieHeader = request.headers.get('cookie');
  if (!cookieHeader) {
    return false;
  }

  return cookieHeader
    .split(';')
    .map((segment) => segment.trim())
    .some((segment) => segment === `${CANARY_COOKIE_NAME}=${CANARY_COOKIE_VALUE}`);
}

function createCacheKey(resource: FetchResource, params: URLSearchParams) {
  const entries = [...params.entries()]
    .filter(([key]) => key !== 'path')
    .sort(([a], [b]) => a.localeCompare(b));
  const encoded = entries.map(([key, value]) => `${key}=${value}`).join('&');
  return `rapor:${resource}:${encoded}`;
}

async function writeSnapshot(env: Env, cacheKey: string, payload: unknown) {
  if (!env.RAPOR_CACHE) {
    return;
  }

  const envelope: SnapshotEnvelope<unknown> = {
    cachedAt: new Date().toISOString(),
    resource: cacheKey.split(':')[1]! as FetchResource,
    params: Object.fromEntries(new URLSearchParams(cacheKey.split(':').slice(2).join(':'))),
    payload,
  };

  await env.RAPOR_CACHE.put(cacheKey, JSON.stringify(envelope), {
    expirationTtl: SNAPSHOT_TTL_SECONDS,
  });
}

async function readSnapshot(env: Env, cacheKey: string) {
  if (!env.RAPOR_CACHE) {
    return null;
  }

  const stored = await env.RAPOR_CACHE.get(cacheKey, { type: 'json' });
  if (!stored) {
    return null;
  }

  const envelope = stored as SnapshotEnvelope<unknown>;
  return envelope.payload;
}

function validateRequiredParams(resource: FetchResource, params: URLSearchParams) {
  switch (resource) {
    case 'scores':
      if (!params.get('month')) {
        return 'Parameter "month" is required for resource=scores';
      }
      return null;
    case 'history':
      if (!params.get('name')) {
        return 'Parameter "name" is required for resource=history';
      }
      return null;
    default:
      return null;
  }
}

function buildUpstreamParams(resource: FetchResource, params: URLSearchParams) {
  const upstream = new URLSearchParams();
  upstream.set('path', resource);
  params.forEach((value, key) => {
    if (key === 'resource') return;
    upstream.set(key, value);
  });

  if (resource === 'history' && !upstream.has('months')) {
    upstream.set('months', '3');
  }

  return upstream;
}

function normaliseRecord(record: Record<string, unknown>) {
  const normalised: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(record)) {
    if (isPotentialNumberKey(key)) {
      normalised[key] = coerceNumber(value);
    } else {
      normalised[key] = value;
    }
  }
  return normalised;
}

const NUMERIC_KEY_HINTS = ['Skor', 'Nilai', 'Score', 'Persentase', 'Target', 'Weight'];

function isPotentialNumberKey(key: string) {
  return NUMERIC_KEY_HINTS.some((hint) => key.toLowerCase().includes(hint.toLowerCase()));
}

function coerceNumber(value: unknown) {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const normalized = trimmed.replace(/,/g, '.');
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : value;
  }
  if (typeof value === 'boolean') {
    return value ? 1 : 0;
  }
  return value;
}

function sanitizeString(value: unknown) {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  return String(value);
}

async function recordMetrics(
  env: Env,
  details: {
    resource: FetchResource;
    cacheKey: string;
    snapshot: boolean;
    canary: boolean;
    success: boolean;
  },
) {
  const store = env.RAPOR_CACHE;
  if (!store) {
    return;
  }

  const dateKey = new Date().toISOString().slice(0, 10);
  const base = `metrics:${dateKey}:resource:${details.resource}`;

  const keys: string[] = [`${base}:total`];
  keys.push(`${base}:${details.snapshot ? 'snapshot' : 'live'}`);

  if (details.canary) {
    keys.push(`${base}:canary`);
  }

  if (!details.success) {
    keys.push(`${base}:error`);
  }

  await Promise.all(keys.map((key) => incrementCounter(store, key, METRICS_TTL_SECONDS)));
}

async function incrementCounter(store: NonNullable<Env['RAPOR_CACHE']>, key: string, ttlSeconds: number) {
  const currentRaw = await store.get(key);
  const current = currentRaw ? Number(currentRaw) : 0;
  const next = Number.isFinite(current) && current >= 0 ? current + 1 : 1;
  await store.put(key, String(next), { expirationTtl: ttlSeconds });
}

function scheduleMetrics(waitUntil: ((promise: Promise<unknown>) => void) | undefined, promise: Promise<unknown>) {
  const guarded = promise.catch((error) => {
    console.error('❌ Failed to record metrics:', error);
  });

  if (typeof waitUntil === 'function') {
    waitUntil(guarded);
    return;
  } else {
    // Fall back to eagerly executing the promise.
    return guarded;
  }
}

function jsonHeaders() {
  return {
    'Content-Type': 'application/json; charset=utf-8',
  };
}

function badRequest(message: string) {
  return new Response(JSON.stringify({ error: 'BadRequest', message }), {
    status: 400,
    headers: jsonHeaders(),
  });
}
