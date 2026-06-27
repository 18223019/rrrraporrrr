type Env = {
  RAPOR_CACHE?: KVNamespace;
};

const MAX_DAYS = 7;

export const onRequest: PagesFunction<Env> = async ({ env, request }) => {
  if (!env.RAPOR_CACHE) {
    return new Response(
      JSON.stringify({ error: 'MetricsUnavailable', message: 'RAPOR_CACHE binding is not configured.' }),
      {
        status: 500,
        headers: jsonHeaders(),
      },
    );
  }

  const url = new URL(request.url);
  const resourceFilter = url.searchParams.get('resource')?.trim() || null;
  const daysParam = url.searchParams.get('days');
  const dateParam = url.searchParams.get('date');

  const days = clampDays(daysParam ? Number(daysParam) : 1);
  const baseDate = parseDate(dateParam) ?? new Date();

  const dates = collectDates(baseDate, days);

  const data: Record<string, Record<string, MetricsBreakdown>> = {};

  for (const date of dates) {
    const prefix = resourceFilter
      ? `metrics:${date}:resource:${resourceFilter}:`
      : `metrics:${date}:resource:`;
    const list = await env.RAPOR_CACHE.list({ prefix });

    const daily: Record<string, MetricsBreakdown> = {};

    for (const key of list.keys) {
      const { resource, bucket } = parseMetricKey(date, key.name);
      if (!resource) continue;

      const valueRaw = await env.RAPOR_CACHE.get(key.name);
      const value = valueRaw ? Number(valueRaw) : 0;

      if (!daily[resource]) {
        daily[resource] = createEmptyMetrics();
      }

      if (bucket in daily[resource]) {
        daily[resource][bucket as MetricBucket] = value;
      }
    }

    data[date] = daily;
  }

  return new Response(
    JSON.stringify({
      dates,
      metrics: data,
    }),
    {
      status: 200,
      headers: jsonHeaders(),
    },
  );
};

type MetricBucket = 'total' | 'live' | 'snapshot' | 'canary' | 'error';

type MetricsBreakdown = Record<MetricBucket, number>;

function createEmptyMetrics(): MetricsBreakdown {
  return {
    total: 0,
    live: 0,
    snapshot: 0,
    canary: 0,
    error: 0,
  };
}

function clampDays(value: number): number {
  if (!Number.isFinite(value) || value <= 0) {
    return 1;
  }
  return Math.min(Math.floor(value), MAX_DAYS);
}

function parseDate(candidate: string | null): Date | null {
  if (!candidate) return null;
  const parsed = new Date(candidate);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed;
}

function collectDates(base: Date, days: number): string[] {
  const result: string[] = [];
  for (let offset = 0; offset < days; offset += 1) {
    const next = new Date(base);
    next.setUTCDate(base.getUTCDate() - offset);
    result.push(next.toISOString().slice(0, 10));
  }
  return result;
}

function parseMetricKey(date: string, key: string): { resource: string | null; bucket: string } {
  const suffix = key.slice(`metrics:${date}:resource:`.length);
  const parts = suffix.split(':');
  if (parts.length !== 2) {
    return { resource: null, bucket: '' };
  }
  const [resource, bucket] = parts;
  return { resource, bucket };
}

function jsonHeaders() {
  return {
    'Content-Type': 'application/json; charset=utf-8',
  };
}
