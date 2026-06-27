type MetricName = 'TTFB' | 'LCP';

const VITALS_ENDPOINT = import.meta.env.VITE_VITALS_ENDPOINT ?? '/api/vitals';
const CANARY_COOKIE = import.meta.env.VITE_CANARY_COOKIE ?? 'rapor_canary';
const CANARY_VALUE = import.meta.env.VITE_CANARY_VALUE ?? 'v1';
const CANARY_QUERY_KEY = import.meta.env.VITE_CANARY_QUERY_KEY ?? 'use';

export function initWebVitalsLogging() {
  if (typeof window === 'undefined' || typeof performance === 'undefined') {
    return;
  }

  const route = window.location.pathname || '/';
  const cohort = detectCohort();

  queueMicrotask(() => {
    reportNavigationTiming(route, cohort);
    observeLargestContentfulPaint(route, cohort);
  });
}

function reportNavigationTiming(route: string, cohort: Cohort) {
  if (typeof performance.getEntriesByType !== 'function') {
    return;
  }

  const [navigation] = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
  if (!navigation) {
    return;
  }

  const ttfb = navigation.responseStart;
  if (Number.isFinite(ttfb) && ttfb > 0) {
    pushSample('TTFB', ttfb, route, cohort);
  }
}

function observeLargestContentfulPaint(route: string, cohort: Cohort) {
  if (typeof PerformanceObserver === 'undefined') {
    return;
  }

  let latest: number | null = null;

  const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      const paint = entry as LargestContentfulPaint;
      const value = paint.renderTime || paint.loadTime || paint.startTime;
      if (Number.isFinite(value)) {
        latest = value;
      }
    }
  });

  try {
    observer.observe({ type: 'largest-contentful-paint', buffered: true });
  } catch (error) {
    console.warn('[Vitals] Unable to observe LCP:', error);
    return;
  }

  const finalize = () => {
    if (latest !== null) {
      pushSample('LCP', latest, route, cohort);
    }
    observer.disconnect();
    document.removeEventListener('visibilitychange', finalize, true);
    window.removeEventListener('pagehide', finalize, true);
  };

  document.addEventListener('visibilitychange', finalize, true);
  window.addEventListener('pagehide', finalize, true);
}

function pushSample(metric: MetricName, value: number, route: string, cohort: Cohort) {
  const body = JSON.stringify({ metric, value, route, cohort });

  if (typeof navigator.sendBeacon === 'function') {
    const sent = navigator.sendBeacon(VITALS_ENDPOINT, body);
    if (sent) {
      return;
    }
  }

  fetch(VITALS_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body,
    keepalive: true,
  }).catch((error) => {
    console.warn('[Vitals] Failed to send sample:', error);
  });
}

type Cohort = 'canary' | 'control' | 'unknown';

function detectCohort(): Cohort {
  if (typeof window === 'undefined') {
    return 'unknown';
  }

  const override = getQueryOverride();
  if (override === 'canary') {
    return 'canary';
  }
  if (override === 'control') {
    return 'control';
  }

  if (hasCanaryCookie()) {
    return 'canary';
  }

  return 'control';
}

function getQueryOverride(): Cohort | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const params = new URLSearchParams(window.location.search);
    const value = params.get(CANARY_QUERY_KEY)?.toLowerCase();
    if (!value) {
      return null;
    }
    if (value === 'pages' || value === 'proxy') {
      return 'canary';
    }
    if (value === 'gas' || value === 'direct') {
      return 'control';
    }
  } catch (error) {
    console.warn('[Vitals] Failed to inspect canary query override:', error);
  }

  return null;
}

function hasCanaryCookie(): boolean {
  if (typeof document === 'undefined') {
    return false;
  }

  try {
    return document.cookie
      .split(';')
      .map((segment) => segment.trim())
      .some((segment) => segment === `${CANARY_COOKIE}=${CANARY_VALUE}`);
  } catch (error) {
    console.warn('[Vitals] Failed to inspect cookies:', error);
    return false;
  }
}
