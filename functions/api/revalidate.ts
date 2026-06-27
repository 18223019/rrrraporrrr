import type {
  KVNamespace,
  PagesFunction,
  Request as CfRequest,
  Response as CfResponse,
} from '@cloudflare/workers-types';
import { z } from 'zod';
import {
  DASHBOARD_CACHE_CONTROL,
  DASHBOARD_CACHE_PREFIX,
  DASHBOARD_CONTENT_TYPE,
  createDashboardCacheKey,
  deleteDashboardSnapshot,
  describeDashboardCacheKey,
} from '../../src/ssr/cache';

const REQUEST_SCHEMA = z.object({
  month: z.string().min(1),
  slug: z.string().min(1).optional(),
  reason: z.string().optional(),
  issuedAt: z.number().int(),
  signature: z.string().min(1),
  prewarm: z.boolean().optional().default(true),
});

const MAX_TIMESTAMP_DRIFT_MS = 5 * 60 * 1000; // 5 minutes
const RATE_LIMIT_WINDOW_SECONDS = 60 * 60; // 1 hour
const RATE_LIMIT_MAX_CALLS = 12; // per month per window
const PREWARM_HEADER = 'x-rapor-canary';
const HMAC_ALGORITHM = { name: 'HMAC', hash: 'SHA-256' } as const;

function jsonResponse(body: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(body), {
    status: init?.status ?? 200,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      ...(init?.headers ?? {}),
    },
  }) as unknown as CfResponse;
}

async function importKey(secret: string) {
  const encoder = new TextEncoder();
  const rawKey = encoder.encode(secret);
  return crypto.subtle.importKey('raw', rawKey, HMAC_ALGORITHM, false, ['sign', 'verify']);
}

function hexToUint8Array(hex: string) {
  if (hex.length % 2 !== 0) {
    throw new Error('Invalid signature length');
  }
  const array = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    array[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  }
  return array;
}

async function verifySignature(secret: string, payload: string, signature: string) {
  const key = await importKey(secret);
  const encoder = new TextEncoder();
  const payloadBytes = encoder.encode(payload);
  const signatureBytes = hexToUint8Array(signature.toLowerCase());
  return crypto.subtle.verify(HMAC_ALGORITHM, key, signatureBytes, payloadBytes);
}

function buildPayload({ month, slug, issuedAt }: { month: string; slug?: string; issuedAt: number }) {
  return `${month}:${slug ?? ''}:${issuedAt}`;
}

function withinAcceptableWindow(issuedAt: number) {
  const now = Date.now();
  const issued = issuedAt * 1000;
  return Math.abs(now - issued) <= MAX_TIMESTAMP_DRIFT_MS;
}

function getDailyRateLimitKey(month: string) {
  const today = new Date().toISOString().slice(0, 10);
  const safeMonth = encodeURIComponent(month.trim().toLowerCase());
  return `revalidate:count:${safeMonth}:${today}`;
}

async function incrementRateLimit(env: Env, month: string) {
  if (!env.RAPOR_CACHE) {
    return { allowed: true, remaining: RATE_LIMIT_MAX_CALLS };
  }

  const key = getDailyRateLimitKey(month);
  const currentRaw = await env.RAPOR_CACHE.get(key);
  const current = currentRaw ? Number.parseInt(currentRaw, 10) || 0 : 0;

  if (current >= RATE_LIMIT_MAX_CALLS) {
    return { allowed: false, remaining: 0 };
  }

  await env.RAPOR_CACHE.put(key, String(current + 1), {
    expirationTtl: RATE_LIMIT_WINDOW_SECONDS,
  });

  return { allowed: true, remaining: RATE_LIMIT_MAX_CALLS - current - 1 };
}

async function listCacheKeysForMonth(env: Env, month: string) {
  if (!env.RAPOR_CACHE) {
    return [] as string[];
  }

  const safeMonth = encodeURIComponent(month.trim().toLowerCase());
  const keys: string[] = [];

  let cursor: string | undefined;
  do {
    const result = await env.RAPOR_CACHE.list({ prefix: `${DASHBOARD_CACHE_PREFIX}:`, cursor });
    for (const entry of result.keys) {
      if (entry.name.endsWith(`:${safeMonth}`)) {
        keys.push(entry.name);
      }
    }
    cursor = result.list_complete ? undefined : result.cursor;
  } while (cursor && keys.length < 200);

  return keys;
}

async function prewarmDashboard(originUrl: URL, target: { slug: string; month: string }, prewarm: boolean) {
  if (!prewarm) {
    return null;
  }

  const prewarmUrl = new URL(originUrl.toString());
  prewarmUrl.pathname = '/dashboard';
  prewarmUrl.searchParams.set('slug', target.slug);
  prewarmUrl.searchParams.set('month', target.month);
  prewarmUrl.searchParams.set('prewarm', 'true');

  try {
    const response = await fetch(prewarmUrl.toString(), {
      headers: {
        [PREWARM_HEADER]: 'true',
      },
    });
    return { ok: response.ok, status: response.status };
  } catch (error) {
    console.error('Failed to prewarm dashboard snapshot:', error);
    return { ok: false, status: 599 };
  }
}

type Env = {
  RAPOR_CACHE?: KVNamespace;
  REVALIDATE_SECRET?: string;
};

export const onRequest: PagesFunction<Env> = async ({ request, env }) => {
  if (request.method !== 'POST') {
    return jsonResponse({ error: 'MethodNotAllowed' }, { status: 405 });
  }

  if (!env.REVALIDATE_SECRET) {
    return jsonResponse({ error: 'SecretNotConfigured' }, { status: 500 });
  }

  let payload: z.infer<typeof REQUEST_SCHEMA>;
  try {
    const body = await request.json();
    payload = REQUEST_SCHEMA.parse(body);
  } catch (error) {
    console.error('Invalid revalidate request payload:', error);
    return jsonResponse({ error: 'InvalidPayload' }, { status: 400 });
  }

  if (!withinAcceptableWindow(payload.issuedAt)) {
    return jsonResponse({ error: 'ExpiredSignature' }, { status: 401 });
  }

  const expectedPayload = buildPayload(payload);
  const signatureValid = await verifySignature(env.REVALIDATE_SECRET, expectedPayload, payload.signature);
  if (!signatureValid) {
    return jsonResponse({ error: 'InvalidSignature' }, { status: 403 });
  }

  const rate = await incrementRateLimit(env, payload.month);
  if (!rate.allowed) {
    return jsonResponse({ error: 'RateLimited' }, { status: 429 });
  }

  const invalidated: string[] = [];

  if (!env.RAPOR_CACHE) {
    console.warn('RAPOR_CACHE binding missing; skipping snapshot invalidation');
  } else {
    const targets = new Set<string>();
    if (payload.slug) {
      targets.add(createDashboardCacheKey({ slug: payload.slug, month: payload.month }));
    } else {
      const keys = await listCacheKeysForMonth(env, payload.month);
      keys.forEach((key) => targets.add(key));
    }

    await Promise.allSettled(
      Array.from(targets).map(async (cacheKey) => {
        await deleteDashboardSnapshot(env, cacheKey);
        invalidated.push(cacheKey);
      }),
    );
  }

  const prewarmResults: Array<{ slug: string; month: string; status: number; ok: boolean }> = [];

  if (payload.prewarm) {
    const targets: Array<{ slug: string; month: string }> = [];
    if (payload.slug) {
      targets.push({ slug: payload.slug, month: payload.month });
    } else {
      invalidated.forEach((cacheKey) => {
        const meta = describeDashboardCacheKey(cacheKey);
        if (meta) {
          targets.push(meta);
        }
      });
    }

    const results = await Promise.allSettled(
      targets.map(async (target) => {
        const result = await prewarmDashboard(new URL(request.url), target, true);
        if (result) {
          prewarmResults.push({ ...target, status: result.status, ok: result.ok });
        }
      }),
    );

    results.forEach((result) => {
      if (result.status === 'rejected') {
        console.error('Prewarm request failed:', result.reason);
      }
    });
  }

  return jsonResponse({
    status: 'ok',
    invalidated,
    prewarm: prewarmResults,
    rateLimitRemaining: env.RAPOR_CACHE ? rate.remaining : null,
    cacheControl: payload.prewarm ? DASHBOARD_CACHE_CONTROL : undefined,
    contentType: DASHBOARD_CONTENT_TYPE,
  });
};
