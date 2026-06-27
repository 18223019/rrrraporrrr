type Env = {
  RAPOR_CACHE?: KVNamespace;
};

const SUPPORTED_METRICS = new Set(['TTFB', 'LCP']);
const SUPPORTED_COHORTS = new Set(['canary', 'control', 'unknown']);
const METRIC_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

export const onRequest: PagesFunction<Env> = async ({ request, env }) => {
  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', {
      status: 405,
      headers: basicHeaders('text/plain'),
    });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch (error) {
    console.warn('⚠️ Failed to parse vitals payload:', error);
    return jsonResponse({ error: 'InvalidJSON', message: 'Request body must be valid JSON.' }, 400);
  }

  const parsed = parsePayload(payload);
  if (!parsed.success) {
    return jsonResponse({ error: 'BadRequest', message: parsed.error }, 400);
  }

  if (!env.RAPOR_CACHE) {
    console.warn('⚠️ RAPOR_CACHE binding missing; dropping vitals sample.');
    return jsonResponse({ status: 'ignored' }, 202);
  }

  await recordSample(env.RAPOR_CACHE, parsed.metric, parsed.value, parsed.route ?? 'unknown', parsed.cohort);

  return jsonResponse({ status: 'ok' }, 202);
};

function parsePayload(candidate: unknown):
  | { success: true; metric: string; value: number; route?: string; cohort: string }
  | { success: false; error: string } {
  if (typeof candidate !== 'object' || candidate === null) {
    return { success: false, error: 'Payload must be an object.' };
  }

  const metricRaw = Reflect.get(candidate, 'metric');
  const valueRaw = Reflect.get(candidate, 'value');
  const routeRaw = Reflect.get(candidate, 'route');
  const cohortRaw = Reflect.get(candidate, 'cohort');

  if (typeof metricRaw !== 'string') {
    return { success: false, error: '"metric" must be a string.' };
  }

  const metric = metricRaw.trim().toUpperCase();
  if (!SUPPORTED_METRICS.has(metric)) {
    return { success: false, error: `Metric ${metric} is not supported.` };
  }

  const value = typeof valueRaw === 'number' ? valueRaw : Number(valueRaw);
  if (!Number.isFinite(value) || value <= 0) {
    return { success: false, error: '"value" must be a positive number.' };
  }

  const route = typeof routeRaw === 'string' && routeRaw.trim().length > 0 ? sanitiseRoute(routeRaw) : undefined;

  let cohort = 'unknown';
  if (typeof cohortRaw === 'string') {
    const normalised = cohortRaw.trim().toLowerCase();
    if (SUPPORTED_COHORTS.has(normalised)) {
      cohort = normalised;
    }
  }

  return { success: true, metric, value, route, cohort };
}

async function recordSample(store: KVNamespace, metric: string, value: number, route: string, cohort: string) {
  const dateKey = new Date().toISOString().slice(0, 10);
  const base = `webvitals:${dateKey}:${metric}`;

  await Promise.all([
    incrementFloat(store, `${base}:count`, 1, METRIC_TTL_SECONDS),
    incrementFloat(store, `${base}:sum`, value, METRIC_TTL_SECONDS),
    updateMax(store, `${base}:max`, value, METRIC_TTL_SECONDS),
    incrementFloat(store, `${base}:route:${route}:count`, 1, METRIC_TTL_SECONDS),
    incrementFloat(store, `${base}:route:${route}:sum`, value, METRIC_TTL_SECONDS),
    incrementFloat(store, `${base}:cohort:${cohort}:count`, 1, METRIC_TTL_SECONDS),
    incrementFloat(store, `${base}:cohort:${cohort}:sum`, value, METRIC_TTL_SECONDS),
  ]);
}

async function incrementFloat(store: KVNamespace, key: string, delta: number, ttlSeconds: number) {
  const currentRaw = await store.get(key);
  const current = currentRaw ? Number(currentRaw) : 0;
  const next = Number.isFinite(current) ? current + delta : delta;
  await store.put(key, String(next), { expirationTtl: ttlSeconds });
}

async function updateMax(store: KVNamespace, key: string, value: number, ttlSeconds: number) {
  const currentRaw = await store.get(key);
  const current = currentRaw ? Number(currentRaw) : Number.NEGATIVE_INFINITY;
  const next = Number.isFinite(current) ? Math.max(current, value) : value;
  await store.put(key, String(next), { expirationTtl: ttlSeconds });
}

function sanitiseRoute(route: string) {
  return route.replace(/[\s?#]/g, '-').slice(0, 100);
}

function jsonResponse(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: basicHeaders('application/json; charset=utf-8'),
  });
}

function basicHeaders(contentType: string) {
  return {
    'Content-Type': contentType,
  };
}
