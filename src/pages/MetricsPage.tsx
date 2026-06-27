import { type ReactNode, useMemo, useState } from 'react';
import { Activity, BarChart3, CloudOff, Database, RefreshCcw } from 'lucide-react';
import clsx from 'clsx';
import { PasswordGate } from '../components/auth/PasswordGate';
import MainLayout from '../layouts/MainLayout';
import KPICard from '../components/KPICard';
import {
  type MetricsBucketKey,
  type MetricsBucketSummary,
} from '../services/api';
import { useMetricsSummary } from '../hooks/useMetricsSummary';

const RESOURCE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'all', label: 'Semua resource' },
  { value: 'months', label: 'Resource: months' },
  { value: 'scores', label: 'Resource: scores' },
  { value: 'members', label: 'Resource: members' },
  { value: 'history', label: 'Resource: history' },
];

const DAY_OPTIONS = [1, 3, 5, 7];

const BUCKET_LABELS: Record<MetricsBucketKey, string> = {
  total: 'Total Hits',
  live: 'Live (Apps Script)',
  snapshot: 'Snapshot Fallback',
  canary: 'Canary Traffic',
  error: 'Error Count',
};

const BUCKET_KEYS: MetricsBucketKey[] = ['total', 'live', 'snapshot', 'canary', 'error'];

const BUCKET_ICONS: Record<MetricsBucketKey, ReactNode> = {
  total: <BarChart3 className="h-6 w-6" />,
  live: <Activity className="h-6 w-6" />,
  snapshot: <Database className="h-6 w-6" />, 
  canary: <RefreshCcw className="h-6 w-6" />, 
  error: <CloudOff className="h-6 w-6" />,
};

const BUCKET_COLORS: Record<MetricsBucketKey, 'blue' | 'green' | 'purple' | 'orange' | 'red'> = {
  total: 'blue',
  live: 'green',
  snapshot: 'purple',
  canary: 'orange',
  error: 'red',
};

interface MetricsRow {
  id: string;
  date: string;
  resource: string;
  buckets: MetricsBucketSummary;
}

function formatNumber(value: number): string {
  if (!Number.isFinite(value)) {
    return '0';
  }
  return value.toLocaleString('id-ID');
}

function buildRows(
  dates: string[],
  metrics: Record<string, Record<string, MetricsBucketSummary>>,
): MetricsRow[] {
  return dates.flatMap((date) => {
    const daily = metrics[date] ?? {};
    const entries = Object.entries(daily).sort(([a], [b]) => a.localeCompare(b));
    return entries.map(([resource, buckets]) => ({
      id: `${date}-${resource}`,
      date,
      resource,
      buckets,
    }));
  });
}

function sumBuckets(source: Record<string, MetricsBucketSummary> | undefined | null): MetricsBucketSummary {
  const initial: MetricsBucketSummary = {
    total: 0,
    live: 0,
    snapshot: 0,
    canary: 0,
    error: 0,
  };

  if (!source) {
    return initial;
  }

  return Object.values(source).reduce((acc, bucket) => ({
    total: acc.total + (bucket.total ?? 0),
    live: acc.live + (bucket.live ?? 0),
    snapshot: acc.snapshot + (bucket.snapshot ?? 0),
    canary: acc.canary + (bucket.canary ?? 0),
    error: acc.error + (bucket.error ?? 0),
  }), initial);
}

export function MetricsPage() {
  const [selectedResource, setSelectedResource] = useState<string>('all');
  const [selectedDays, setSelectedDays] = useState<number>(3);

  const { data, loading, error, lastUpdated, refetch } = useMetricsSummary({
    resource: selectedResource === 'all' ? undefined : selectedResource,
    days: selectedDays,
    autoRefreshMs: 60_000,
  });

  const rows = useMemo(() => (
    data ? buildRows(data.dates, data.metrics) : []
  ), [data]);

  const latestDate = data?.dates?.[0] ?? null;
  const latestSummary = useMemo(() => sumBuckets(latestDate ? data?.metrics?.[latestDate] : undefined), [data, latestDate]);
  const previousDate = data?.dates?.[1] ?? null;
  const previousSummary = useMemo(() => sumBuckets(previousDate ? data?.metrics?.[previousDate] : undefined), [data, previousDate]);

  const totalTrend = useMemo(() => {
    if (!previousDate) {
      return null;
    }
    const diff = latestSummary.total - previousSummary.total;
    if (previousSummary.total === 0) {
      return null;
    }
    const percent = (diff / previousSummary.total) * 100;
    return {
      value: Number(percent.toFixed(1)),
      isPositive: diff >= 0,
    };
  }, [latestSummary.total, previousSummary.total, previousDate]);

  return (
    <PasswordGate correctPassword="ciecoachcak">
      <MainLayout>
        <section className="py-8">
          <div className="mx-auto w-full max-w-6xl px-4">
            <header className="mb-8 rounded-2xl bg-slate-900 px-6 py-8 text-white shadow-lg">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-sm uppercase tracking-[0.2em] text-slate-400">Monitoring</p>
                  <h1 className="mt-2 text-3xl font-semibold">Cloudflare Proxy Metrics</h1>
                  <p className="mt-2 max-w-2xl text-sm text-slate-300">
                    Pantau distribusi traffic antara Apps Script (live), snapshot fallback, cohort canary, dan error yang ditangkap oleh Pages Functions. Data direfresh otomatis setiap 60 detik.
                  </p>
                </div>
                <div className="flex flex-col gap-2 text-sm text-slate-200">
                  <span className="rounded-full bg-slate-800/70 px-3 py-1 text-xs font-semibold uppercase tracking-wide">Resource {selectedResource === 'all' ? 'semua' : selectedResource}</span>
                  {lastUpdated && (
                    <span className="text-xs text-slate-400">Terakhir diperbarui: {lastUpdated.toLocaleString('id-ID')}</span>
                  )}
                </div>
              </div>
            </header>

            <div className="mb-6 grid gap-4 md:grid-cols-3">
              <div className="rounded-xl border border-slate-200 bg-white/80 p-4 shadow-sm">
                <label htmlFor="resource-filter" className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Pilih resource
                </label>
                <select
                  id="resource-filter"
                  value={selectedResource}
                  onChange={(event) => setSelectedResource(event.target.value)}
                  className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 shadow-sm focus:border-emerald-400 focus:outline-none focus:ring focus:ring-emerald-200"
                >
                  {RESOURCE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white/80 p-4 shadow-sm">
                <label htmlFor="days-filter" className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Rentang hari
                </label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {DAY_OPTIONS.map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setSelectedDays(option)}
                      className={clsx(
                        'rounded-lg border px-3 py-2 text-sm font-semibold transition',
                        selectedDays === option
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-700 shadow-sm'
                          : 'border-slate-200 bg-white text-slate-700 hover:border-emerald-300 hover:text-emerald-700'
                      )}
                      aria-pressed={selectedDays === option}
                    >
                      {option} hari
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-stretch justify-between gap-2 rounded-xl border border-slate-200 bg-white/80 p-4 shadow-sm">
                <div className="flex flex-col">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Kontrol</span>
                  <span className="mt-2 text-sm text-slate-600">Kamu bisa refresh manual kapan saja untuk mengambil snapshot terbaru.</span>
                </div>
                <button
                  type="button"
                  onClick={refetch}
                  className="self-end rounded-lg border border-emerald-500 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100"
                >
                  <RefreshCcw className="mr-2 inline h-4 w-4" /> Refresh
                </button>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {BUCKET_KEYS.map((key) => (
                <KPICard
                  key={key}
                  title={BUCKET_LABELS[key]}
                  value={formatNumber(latestSummary[key])}
                  icon={BUCKET_ICONS[key]}
                  color={BUCKET_COLORS[key]}
                  subtitle={latestDate ? `Tanggal ${latestDate}` : 'Belum ada data'}
                  trend={key === 'total' && totalTrend ? totalTrend : undefined}
                />
              ))}
            </div>

            <section className="mt-8 rounded-2xl border border-slate-200 bg-white/90 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Rincian harian</h2>
                  <p className="text-sm text-slate-500">Menampilkan hitungan per resource untuk {selectedDays} hari terakhir.</p>
                </div>
                {loading && (
                  <span className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                    <RefreshCcw className="h-3.5 w-3.5 animate-spin" /> Memuat data…
                  </span>
                )}
              </div>

              {error && (
                <div className="px-6 py-4 text-sm text-red-600">
                  Terjadi kesalahan saat mengambil data: {error.message}
                </div>
              )}

              {!error && rows.length === 0 && !loading && (
                <div className="px-6 py-12 text-center text-sm text-slate-500">
                  Belum ada data metrics untuk kombinasi filter ini.
                </div>
              )}

              {!error && rows.length > 0 && (
                <div className="overflow-x-auto px-6 py-4">
                  <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                      <tr>
                        <th scope="col" className="whitespace-nowrap px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Tanggal
                        </th>
                        <th scope="col" className="whitespace-nowrap px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Resource
                        </th>
                        {BUCKET_KEYS.map((key) => (
                          <th
                            key={key}
                            scope="col"
                            className="whitespace-nowrap px-4 py-2 text-right text-xs font-semibold uppercase tracking-wide text-slate-500"
                          >
                            {BUCKET_LABELS[key]}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {rows.map((row) => (
                        <tr key={row.id} className="hover:bg-slate-50">
                          <td className="whitespace-nowrap px-4 py-2 text-sm font-medium text-slate-800">{row.date}</td>
                          <td className="whitespace-nowrap px-4 py-2 text-sm text-slate-600">{row.resource}</td>
                          {BUCKET_KEYS.map((key) => (
                            <td key={key} className="whitespace-nowrap px-4 py-2 text-right text-sm font-semibold text-slate-800">
                              {formatNumber(row.buckets[key])}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>
        </section>
      </MainLayout>
    </PasswordGate>
  );
}

export default MetricsPage;
