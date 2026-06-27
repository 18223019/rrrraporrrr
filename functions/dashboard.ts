import type {
  KVNamespace,
  PagesFunction,
  Request as CfRequest,
  Response as CfResponse,
} from '@cloudflare/workers-types';
import { renderToReadableStream } from 'react-dom/server.edge';
import { DashboardApp } from '../src/ssr/DashboardApp';
import {
  resolveClientAssets,
  shouldServeSSR,
  type AssetsEnv,
} from '../src/ssr/utils';
import {
  DASHBOARD_CACHE_CONTROL,
  DASHBOARD_CONTENT_TYPE,
  createDashboardCacheKey,
  readDashboardSnapshot,
  writeDashboardSnapshot,
  type DashboardCacheEnv,
  type DashboardSnapshot,
} from '../src/ssr/cache';
import type {
  DashboardStats,
  DashboardBidangBreakdown,
} from '../src/types/user';
import { calculateStats, calculateBidangBreakdown } from '../src/utils/dashboardStats';

type Env = AssetsEnv & DashboardCacheEnv & {
  RENDER_MODE?: string;
  GAS_BASE_URL: string;
};

const DEFAULT_STATS: DashboardStats = {
  averageScore: 0,
  ketakmiran: 0,
  pembinaan: 0,
  aktualisasi: 0,
  internal: 0,
  trend: 0,
  bidangBreakdown: calculateBidangBreakdown(null) as DashboardBidangBreakdown,
};

async function fetchJson<T = any>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
    },
    ...init,
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const data = (await response.json()) as T;
  return data;
}

async function getDashboardPayload(env: Env, slug: string, month: string) {
  const gasBase = env.GAS_BASE_URL;
  if (!gasBase) {
    throw new Error('GAS_BASE_URL not configured');
  }

  const memberUrl = new URL(gasBase);
  memberUrl.searchParams.set('path', 'members');

  const monthsUrl = new URL(gasBase);
  monthsUrl.searchParams.set('path', 'months');

  const scoresUrl = new URL(gasBase);
  scoresUrl.searchParams.set('path', 'scores');
  scoresUrl.searchParams.set('month', month);
  scoresUrl.searchParams.set('name', slug);

  const historyUrl = new URL(gasBase);
  historyUrl.searchParams.set('path', 'history');
  historyUrl.searchParams.set('name', slug);
  historyUrl.searchParams.set('months', '3');

  const [members, monthsResponse, scoreResponse, historyResponse] = await Promise.all([
    fetchJson<any>(memberUrl.toString()),
    fetchJson<any>(monthsUrl.toString()),
    fetchJson<any>(scoresUrl.toString()),
    fetchJson<any>(historyUrl.toString()),
  ]);

  const member = Array.isArray(members.data)
    ? members.data.find((item: any) => item.slug === slug || item.username === slug)
    : undefined;

  const months: any[] = Array.isArray(monthsResponse.data) ? monthsResponse.data : [];
  const monthMatch = months.find((item) => item.value === month) ?? months[0] ?? {
    value: month,
    label: month,
  };

  const stats = scoreResponse?.success && scoreResponse.data
    ? calculateStats(scoreResponse.data, historyResponse?.success ? historyResponse.data : undefined)
    : DEFAULT_STATS;

  return {
    member,
    stats,
    months,
    monthLabel: monthMatch.label ?? month,
  };
}

type RenderDashboardOptions = {
  captureHtml: boolean;
  renderMode: string;
};

async function renderDashboard(
  env: Env,
  request: CfRequest,
  slug: string,
  month: string,
  options: RenderDashboardOptions,
) {
  const [payload, clientAssets] = await Promise.all([
    getDashboardPayload(env, slug, month),
    resolveClientAssets(env, request.url),
  ]);

  const stream = await renderToReadableStream(
    DashboardApp({
      slug,
      memberName: payload.member?.name,
      month,
      monthLabel: payload.monthLabel,
      stats: payload.stats,
      months: payload.months,
      clientModuleHref: clientAssets.moduleHref,
      clientStyleHrefs: clientAssets.styleHrefs,
    }),
  );

  const baseStream = stream as unknown as ReadableStream;
  let responseStream: ReadableStream = baseStream;
  let html: string | undefined;

  if (options.captureHtml && typeof baseStream.tee === 'function') {
    const [responseBranch, cacheBranch] = baseStream.tee();
    responseStream = responseBranch;
    html = await new Response(cacheBranch).text();
  } else if (options.captureHtml) {
    console.warn('ReadableStream.tee() unavailable; skipping dashboard snapshot capture.');
  }

  const headers: Record<string, string> = {
    'content-type': DASHBOARD_CONTENT_TYPE,
    'x-render-mode': options.renderMode,
  };

  if (options.renderMode.startsWith('isr')) {
    headers['cache-control'] = DASHBOARD_CACHE_CONTROL;
  } else {
    headers['cache-control'] = 'private, no-store, must-revalidate';
  }

  const cfResponse = new Response(responseStream, {
    status: 200,
    headers,
  }) as unknown as CfResponse;

  return {
    response: cfResponse,
    html,
  };
}

function normalizeRenderMode(env: Env) {
  return env.RENDER_MODE ? env.RENDER_MODE.toLowerCase() : 'csr';
}

function buildCachedResponse(snapshot: DashboardSnapshot): CfResponse {
  return new Response(snapshot.html, {
    status: 200,
    headers: {
      ...snapshot.headers,
      'content-type': snapshot.headers['content-type'] ?? DASHBOARD_CONTENT_TYPE,
      'cache-control': snapshot.headers['cache-control'] ?? DASHBOARD_CACHE_CONTROL,
      'x-render-mode': snapshot.headers['x-render-mode'] ?? 'isr-cache',
      'x-isr-cached-at': snapshot.cachedAt,
    },
  }) as unknown as CfResponse;
}

export const onRequest: PagesFunction<Env> = async ({ request, env, waitUntil }) => {
  if (!shouldServeSSR(request, env)) {
    return env.ASSETS.fetch(request);
  }

  try {
    const url = new URL(request.url);
    const slug = url.searchParams.get('slug');
    const month = url.searchParams.get('month');

    if (!slug || !month) {
      return new Response('Missing slug or month', { status: 400 }) as unknown as CfResponse;
    }

    const renderMode = normalizeRenderMode(env);
    const isISR = renderMode === 'isr';
    const cacheKey = isISR ? createDashboardCacheKey({ slug, month }) : undefined;

    if (isISR && cacheKey) {
      const snapshot = await readDashboardSnapshot(env, cacheKey);
      if (snapshot) {
        return buildCachedResponse(snapshot);
      }
    }

    const { response, html } = await renderDashboard(env, request, slug, month, {
      captureHtml: Boolean(isISR && cacheKey),
      renderMode: isISR ? 'isr-fresh' : 'ssr-canary',
    });

    if (isISR && cacheKey && html) {
      const snapshot: DashboardSnapshot = {
        version: 'v1',
        cachedAt: new Date().toISOString(),
        slug,
        month,
        html,
        headers: {
          'content-type': DASHBOARD_CONTENT_TYPE,
          'cache-control': DASHBOARD_CACHE_CONTROL,
          'x-render-mode': 'isr-cache',
        },
      };
      waitUntil(writeDashboardSnapshot(env, cacheKey, snapshot));
    }

    return response;
  } catch (error) {
    console.error('Failed to render SSR dashboard:', error);
    return env.ASSETS.fetch(request);
  }
};
