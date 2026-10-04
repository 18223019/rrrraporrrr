import { useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';
import { PasswordGate } from '../components/auth/PasswordGate';
import { useAvailableMonths } from '../hooks/useAvailableMonths';
import { useRankings, type RankingMember } from '../hooks/useRankings';
import {
  type ColumnDef,
  type SortingState,
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import {
  AlertCircle,
  ChevronDown,
  ChevronUp,
  CalendarDays,
  ChevronsUpDown,
  Loader2,
  ExternalLink,
} from 'lucide-react';
import { MonthSelector } from '../components/ui/MonthSelector';
import { CoachMemberDetailModal } from '../components/modals/CoachMemberDetailModal';

type MetricKey = 'ketakmiran' | 'pembinaan' | 'aktualisasiDiri' | 'internal';

const METRIC_FIELDS: Array<{ key: MetricKey; label: string }> = [
  { key: 'ketakmiran', label: 'Ketakmiran' },
  { key: 'pembinaan', label: 'Pembinaan' },
  { key: 'aktualisasiDiri', label: 'Aktualisasi Diri' },
  { key: 'internal', label: 'Internal' },
];

// Low / mid / high thresholds per bidang
const METRIC_THRESHOLDS: Record<MetricKey, [number, number]> = {
  ketakmiran: [65, 70],
  pembinaan: [70, 75],
  aktualisasiDiri: [65, 70],
  internal: [65, 70],
};

const getMetricColor = (key: MetricKey, value: number | null | undefined): string => {
  if (typeof value !== 'number' || Number.isNaN(value) || value === 0) return '#664930';
  const [low, high] = METRIC_THRESHOLDS[key];
  if (value < low) return '#664930';
  if (value <= high) return '#664930';
  return '#664930';
};

const columnHelper = createColumnHelper<RankingMember>();

const formatMetric = (value: number | null | undefined) => {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return '-';
  }
  return value.toFixed(1);
};

const toNumeric = (value: number | null | undefined) =>
  typeof value === 'number' && Number.isFinite(value) ? value : 0;


const getTierStyles = (rank: number) => {
  if (rank === 1) {
    return 'bg-[#664930] text-[#ffdbbb] shadow-inner shadow-[#997e67]/40';
  }
  if (rank === 2) {
    return 'bg-[#997e67] text-[#ffdbbb]';
  }
  if (rank === 3) {
    return 'bg-[#ccbeb1] text-[#664930]';
  }
  return 'bg-[#ffdbbb] text-[#664930]';
};

const getRowAccentClass = (rank: number) => {
  if (rank === 1) {
    return 'coach-table-row--champion';
  }
  if (rank === 2) {
    return 'coach-table-row--silver';
  }
  if (rank === 3) {
    return 'coach-table-row--bronze';
  }
  return '';
};

export const CoachPage = () => {
  const [selectedMonth, setSelectedMonth] = useState('');
  const [activeTab, setActiveTab] = useState<'astra' | 'astri'>('astra');
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [selectedMember, setSelectedMember] = useState<RankingMember | null>(null);

  const { months, loading: loadingMonths, defaultMonth } = useAvailableMonths();

  useEffect(() => {
    if (defaultMonth && !selectedMonth) {
      setSelectedMonth(defaultMonth);
    }
  }, [defaultMonth, selectedMonth]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const canonicalHref = `${window.location.origin}/coach/`;
    let link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    const previousHref = link?.href ?? null;
    let created = false;

    if (!link) {
      link = document.createElement('link');
      link.rel = 'canonical';
      document.head.appendChild(link);
      created = true;
    }

    if (link) {
      link.href = canonicalHref;
      link.dataset.coachCanonical = 'true';
    }

    return () => {
      if (!link) {
        return;
      }
      if (created) {
        link.remove();
        return;
      }
      if (previousHref) {
        link.href = previousHref;
      } else {
        link.removeAttribute('href');
      }
      link.removeAttribute('data-coach-canonical');
    };
  }, []);

  useEffect(() => {
    if (!sorting.length) {
      setSorting([{ id: 'rank', desc: false }]);
    }
  }, [sorting.length]);

  const { rankings, loading: loadingRankings, error } = useRankings(selectedMonth);
  const loading = loadingMonths || loadingRankings;

  const currentMembers = useMemo<RankingMember[]>(() => {
    if (!rankings) {
      return [];
    }
    return activeTab === 'astra' ? rankings.astra : rankings.astri;
  }, [rankings, activeTab]);

  const monthLabel = useMemo(
    () => months.find((month) => month.value === selectedMonth)?.label,
    [months, selectedMonth]
  );

  const monthOptions = useMemo(
    () => months.map((month) => ({ ...month, available: true })),
    [months]
  );

  const maxScore = useMemo(
    () => currentMembers.reduce((max, member) => Math.max(max, toNumeric(member.score)), 0),
    [currentMembers]
  );

  const columns = useMemo<ColumnDef<RankingMember, any>[]>(() => {
    const metricColumns = METRIC_FIELDS.map(({ key, label }) =>
      columnHelper.accessor(key, {
        header: () => label,
        size: 140,
        cell: (info) => (
          <div
            className="flex flex-col items-start gap-1 cursor-pointer group"
            onClick={() => setSelectedMember(info.row.original)}
            title="Klik untuk lihat detail parameter"
          >
            <span
              className="text-sm font-semibold group-hover:opacity-80 transition-opacity"
              style={{ color: getMetricColor(key, info.getValue()) }}
            >
              {formatMetric(info.getValue())}
            </span>
          </div>
        ),
      })
    );

    return [
      columnHelper.accessor('rank', {
        header: () => 'Rank',
        size: 90,
        cell: (info) => (
          <div className="flex items-center justify-center">
            <span
              className={clsx(
                'inline-flex h-12 w-12 items-center justify-center rounded-full text-sm font-semibold shadow-sm',
                getTierStyles(info.getValue())
              )}
            >
              {info.getValue()}
            </span>
          </div>
        ),
      }),
      columnHelper.accessor('name', {
        header: () => 'Nama',
        size: 260,
        cell: (info) => {
          const member = info.row.original;
          return (
            <div
              className="flex items-center gap-3 cursor-pointer group"
              onClick={() => setSelectedMember(member)}
              title="Klik untuk lihat detail parameter"
            >
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-[#664930] group-hover:text-[#997e67] transition-colors underline-offset-2 group-hover:underline">
                  {member.name}
                </span>
              </div>
            </div>
          );
        },
      }),
      ...metricColumns,
      columnHelper.accessor('score', {
        header: () => 'Nilai Akhir',
        size: 160,
        cell: (info) => {
          const score = toNumeric(info.getValue());
          return (
            <div className="flex flex-col gap-1.5">
              <span className="text-base font-semibold text-[#664930]">{formatMetric(score)}</span>
            </div>
          );
        },
      }),
    ];
  }, [activeTab, maxScore]);

  const table = useReactTable({
    data: currentMembers,
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  return (
    <PasswordGate correctPassword="kochbaru">
      <div className="min-h-screen bg-[#f3e7d8]">


        <header className="coach-page-header relative z-20 isolate bg-gradient-to-r from-[#42291d] via-[#70452d] to-[#a9744f]">
          <div className="absolute inset-0 opacity-20">
            <div className="h-full w-full bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.25),_transparent_65%)]" />
          </div>
          <div className="coach-header-inner relative z-20 mx-auto max-w-[1440px] px-4 py-12 sm:px-6 lg:px-10">
              <div className="coach-header-content flex flex-col gap-12 md:flex-row md:items-start md:justify-between">
                <div className="coach-header-copy max-w-2xl space-y-6 text-[#664930]">
                <h1 className="text-3xl font-bold leading-tight tracking-tight text-[#664930] sm:text-4xl">Leaderboard Virtue Wisdom</h1>
                <p className="text-sm text-[#664930]">
                  Rank anggota <span className="font-semibold">{activeTab === 'astra' ? 'Astra' : 'Astri'}</span>{' '}
                  {monthLabel ? `untuk periode ${monthLabel}.` : 'untuk periode.'}
                </p>
              </div>
                <div className="coach-header-controls flex w-full flex-col gap-5 md:w-auto md:items-end">
                <div className="flex w-full flex-col gap-4 md:w-auto md:flex-row md:items-center md:gap-5">
                  <div className="flex items-center gap-2 text-[#664930]">
                    <CalendarDays className="h-3 w-3" />
                    <span className="text-xs font-semibold uppercase tracking-wide"> Periode Penilaian</span>
                  </div>
                  <MonthSelector
                    months={monthOptions}
                    selectedMonth={selectedMonth}
                    onMonthChange={setSelectedMonth}
                    loading={loadingMonths}
                    className="coach-month-selector"
                  />
                </div>
                </div>
              </div>

            <div className="coach-tabs mt-14 flex flex-wrap items-center gap-5 pt-2 text-sm font-semibold text-[#664930]">
              <button
                type="button"
                onClick={() => setActiveTab('astra')}
                className={clsx('coach-tab-button', activeTab === 'astra' && 'coach-tab-button--active')}
              >
                Astra ({rankings?.astra?.length ?? 0})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('astri')}
                className={clsx('coach-tab-button', activeTab === 'astri' && 'coach-tab-button--active')}
              >
                Astri ({rankings?.astri?.length ?? 0})
              </button>
            </div>
          </div>
        </header>

        <main className="coach-page-main relative z-10 mx-auto mt-8 max-w-[1440px] px-4 pb-16 sm:px-6 lg:px-10">
          {loading && (
            <div className="flex min-h-[420px] items-center justify-center">
              <Loader2 className="h-10 w-10 animate-spin text-emerald-600" />
            </div>
          )}

          {error && !loading && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 shadow-sm">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-rose-500" />
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-rose-800">Data tidak dapat dimuat</p>
                  <p className="text-sm text-rose-600">{error}</p>
                </div>
              </div>
            </div>
          )}

          {!loading && !error && !selectedMonth && (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center shadow-sm">
              <p className="text-sm font-medium text-slate-600">
                Pilih periode penilaian untuk menampilkan leaderboard.
              </p>
            </div>
          )}

          {!loading && !error && selectedMonth && currentMembers.length === 0 && (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center shadow-sm">
              <p className="text-sm font-medium text-slate-600">
                Belum ada data yang tersedia untuk periode ini.
              </p>
            </div>
          )}

          {!loading && !error && currentMembers.length > 0 && (
            <div className="coach-table-section">
              <div className="coach-table-toolbar">
                <a
                  href="https://docs.google.com/spreadsheets/d/119JaNmuiLaYtmk96ibcV1kiNTaWQoAtWgKlx1nSV6tI/edit?usp=sharing"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="coach-table-link-button"
                  aria-label="Buka Google Spreadsheet"
                >
                  <ExternalLink className="h-4 w-4" />
                  <span>Link Google Spreadsheet</span>
                </a>
              </div>
              <div className="coach-table-container">
                <div className="coach-table-scroll">
                  <table className="coach-table">
                    <thead>
                      {table.getHeaderGroups().map((headerGroup) => (
                        <tr key={headerGroup.id}>
                          {headerGroup.headers.map((header) => (
                            <th
                              key={header.id}
                              className={clsx(
                                'coach-table-header-cell',
                                header.column.id === 'rank' && 'coach-table-header-cell--center',
                                header.column.id === 'score' && 'coach-table-header-cell--score'
                              )}
                            >
                              {header.isPlaceholder ? null : (
                                <div
                                  className={clsx(
                                    'coach-table-header-content',
                                    header.column.id === 'rank'
                                      ? 'justify-center'
                                      : header.column.getCanSort()
                                        ? 'cursor-pointer select-none'
                                        : ''
                                  )}
                                  onClick={header.column.getToggleSortingHandler()}
                                >
                                  {flexRender(header.column.columnDef.header, header.getContext())}
                                  {header.column.getCanSort() && (
                                    <span className="coach-table-sort-icon">
                                      {{
                                        asc: <ChevronUp className="h-3.5 w-3.5" />,
                                        desc: <ChevronDown className="h-3.5 w-3.5" />,
                                      }[header.column.getIsSorted() as string] ?? (
                                          <ChevronsUpDown className="h-3.5 w-3.5" />
                                        )}
                                    </span>
                                  )}
                                </div>
                              )}
                            </th>
                          ))}
                        </tr>
                      ))}
                    </thead>
                    <tbody>
                      {table.getRowModel().rows.map((row) => (
                        <tr
                          key={row.id}
                          className={clsx(
                            'coach-table-row',
                            row.index % 2 === 0 ? 'coach-table-row--even' : 'coach-table-row--odd',
                            getRowAccentClass(Number(row.original.rank))
                          )}
                        >
                          {row.getVisibleCells().map((cell) => (
                            <td
                              key={cell.id}
                              className={clsx(
                                'coach-table-cell',
                                cell.column.id === 'rank' && 'coach-table-cell--center'
                              )}
                            >
                              {flexRender(cell.column.columnDef.cell, cell.getContext())}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="coach-table-footer">
                  <span>
                    Menampilkan{' '}
                    <span className="font-semibold text-slate-900">
                      {table.getRowModel().rows.length}
                    </span>{' '}
                    dari{' '}
                    <span className="font-semibold text-slate-900">{currentMembers.length}</span> anggota.
                  </span>
                  {globalFilter && (
                    <button
                      type="button"
                      onClick={() => setGlobalFilter('')}
                      className="text-sm font-semibold text-emerald-600 transition hover:text-emerald-700"
                    >
                      Reset pencarian
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
      <CoachMemberDetailModal
        member={selectedMember}
        month={selectedMonth}
        onClose={() => setSelectedMember(null)}
      />
    </PasswordGate>
  );
};
