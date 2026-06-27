type Env = {
  RAPOR_CACHE?: KVNamespace;
};

const SUPPORTED_METRICS = new Set(['TTFB', 'LCP']);
const SUPPORTED_COHORTS = new Set(['canary', 'control', 'unknown']);

export const onRequest: PagesFunction<Env> = async ({ request, env }) => {
  if (request.method !== 'GET') {
    return new Response('Method Not Allowed', {
      status: 405,
      headers: basicHeaders('text/plain'),
    });
  }

  if (!env.RAPOR_CACHE) {
    return jsonResponse({ error: 'Unavailable', message: 'RAPOR_CACHE binding is not configured.' }, 503);
  }

  const url = new URL(request.url);

  const date = normaliseDate(url.searchParams.get('date'));
  if (!date) {
    return jsonResponse({ error: 'BadRequest', message: '"date" must be in YYYY-MM-DD format.' }, 400);
  }

  const metricFilter = normaliseMetric(url.searchParams.get('metric'));
  if (metricFilter === 'unsupported') {
    return jsonResponse({ error: 'BadRequest', message: 'Unsupported metric requested.' }, 400);
  }

  const cohortFilter = normaliseCohort(url.searchParams.get('cohort'));
  if (cohortFilter === 'unsupported') {
    return jsonResponse({ error: 'BadRequest', message: 'Unsupported cohort requested.' }, 400);
  }

  const rawRouteFilter = url.searchParams.get('route');
  const routeFilter = rawRouteFilter ? sanitiseRoute(rawRouteFilter) : null;

  const metrics = metricFilter ? [metricFilter] : Array.from(SUPPORTED_METRICS);

  const payload = [] as MetricSummary[];

  for (const metric of metrics) {
    const summary = await collectMetricSummary(env.RAPOR_CACHE, date, metric, routeFilter, cohortFilter);
    if (summary) {
      payload.push(summary);
    }
  }

  return jsonResponse({ date, metrics: payload, filters: buildFilters(routeFilter, cohortFilter, metricFilter) }, 200);
};

type MetricSummary = {
  metric: string;
  overall: AggregatedStats;
  cohorts: Record<string, AggregatedStats>;
  routes: Array<AggregatedStats & { route: string }>;
};

type AggregatedStats = {
  count: number;
  sum: number;
  average: number | null;
  max?: number | null;
};

async function collectMetricSummary(
  store: KVNamespace,
  date: string,
  metric: string,
  routeFilter: string | null,
  cohortFilter: CohortFilter,
): Promise<MetricSummary | null> {
  const prefix = `webvitals:${date}:${metric}:`;
  const keys = await listKeys(store, prefix);

  if (keys.length === 0) {
    return null;
  }

  const values = await Promise.all(keys.map((key) => store.get(key)));

  const overall: AggregatedStats = {
    count: 0,
    sum: 0,
    average: null,
    max: null,
  };

  const routes = new Map<string, { count: number; sum: number }>();
  const cohorts = new Map<string, { count: number; sum: number }>();

  for (let index = 0; index < keys.length; index += 1) {
    const key = keys[index];
    const raw = values[index];
    if (!raw) {
      continue;
    }

    const value = Number(raw);
    if (!Number.isFinite(value)) {
      continue;
    }

    const detail = key.slice(prefix.length);
    const [segment, ...rest] = detail.split(':');

    if (!segment) {
      continue;
    }

    if (segment === 'count') {
      overall.count = value;
      continue;
    }

    if (segment === 'sum') {
      overall.sum = value;
      continue;
    }

    if (segment === 'max') {
      overall.max = value;
      continue;
    }

    if (segment === 'route') {
      const [route, kind] = rest;
      if (!route || !kind) {
        continue;
      }
      if (routeFilter && route !== routeFilter) {
        continue;
      }
      const bucket = routes.get(route) ?? { count: 0, sum: 0 };
      if (kind === 'count') {
        bucket.count = value;
      } else if (kind === 'sum') {
        bucket.sum = value;
      }
      routes.set(route, bucket);
      continue;
    }

    if (segment === 'cohort') {
      const [cohort, kind] = rest;
      if (!cohort || !kind) {
        continue;
      }
      if (cohortFilter && cohort !== cohortFilter) {
        continue;
      }
      const bucket = cohorts.get(cohort) ?? { count: 0, sum: 0 };
      if (kind === 'count') {
        bucket.count = value;
      } else if (kind === 'sum') {
        bucket.sum = value;
      }
      cohorts.set(cohort, bucket);
      continue;
    }
  }

  overall.average = overall.count > 0 ? overall.sum / overall.count : null;

  const routeSummaries = Array.from(routes.entries())
    .map(([route, data]) => ({
      route,
      count: data.count,
      sum: data.sum,
      average: data.count > 0 ? data.sum / data.count : null,
    }))
    .filter((entry) => entry.count > 0);

  const cohortSummaries = Array.from(cohorts.entries())
    .filter(([cohort]) => !cohortFilter || cohort === cohortFilter)
    .reduce<Record<string, AggregatedStats>>((acc, [cohort, data]) => {
      acc[cohort] = {
        count: data.count,
        sum: data.sum,
        average: data.count > 0 ? data.sum / data.count : null,
      };
      return acc;
    }, {});

  return {
    metric,
    overall,
    cohorts: cohortSummaries,
    routes: routeSummaries,
  };
}

async function listKeys(store: KVNamespace, prefix: string) {
  const keys: string[] = [];
  let cursor: string | undefined;

  do {
    const page = await store.list({ prefix, cursor });
    page.keys.forEach((entry) => {
      if (entry?.name) {
        keys.push(entry.name);
      }
    });
    cursor = page.list_complete ? undefined : page.cursor;
  } while (cursor);

  return keys;
}

type CohortFilter = string | null | 'unsupported';

function normaliseDate(candidate: string | null) {
  if (!candidate || candidate.trim() === '') {
    return new Date().toISOString().slice(0, 10);
  }
  const trimmed = candidate.trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(trimmed) ? trimmed : null;
}

function normaliseMetric(candidate: string | null): string | null | 'unsupported' {
  if (!candidate || candidate.trim() === '') {
    return null;
  }
  const metric = candidate.trim().toUpperCase();
  if (!SUPPORTED_METRICS.has(metric)) {
    return 'unsupported';
  }
  return metric;
}

function normaliseCohort(candidate: string | null): CohortFilter {
  if (!candidate || candidate.trim() === '') {
    return null;
  }
  const cohort = candidate.trim().toLowerCase();
  if (!SUPPORTED_COHORTS.has(cohort)) {
    return 'unsupported';
  }
  return cohort;
}

function sanitiseRoute(route: string) {
  return route.replace(/[\s?#]/g, '-').slice(0, 100);
}

function buildFilters(route: string | null, cohort: CohortFilter, metric: string | null | 'unsupported') {
  return {
    route,
    cohort: cohort && cohort !== 'unsupported' ? cohort : null,
    metric: metric && metric !== 'unsupported' ? metric : null,
  };
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
