import React from 'react';
import type { DashboardStats } from '../types/user';
import type { MonthOption } from '../services/api';

// Expose React on the global scope so the classic JSX runtime can locate it in Workers.
Reflect.set(globalThis, 'React', React);

interface DashboardAppProps {
  slug: string;
  memberName?: string;
  month: string;
  monthLabel: string;
  stats: DashboardStats;
  months: MonthOption[];
  clientModuleHref: string;
  clientStyleHrefs: string[];
}

function formatScore(value: number): string {
  if (!Number.isFinite(value)) {
    return '0.0';
  }
  return value.toFixed(1);
}

function formatTrend(trend: number): string {
  if (!Number.isFinite(trend) || trend === 0) {
    return '0.0%';
  }
  return `${trend > 0 ? '+' : ''}${trend.toFixed(1)}%`;
}

export function DashboardApp({
  slug,
  memberName,
  month,
  monthLabel,
  stats,
  months,
  clientModuleHref,
  clientStyleHrefs,
}: DashboardAppProps) {
  return (
    <html lang="id" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" type="image/jpeg" href="/favico.jpg" />
        <meta name="color-scheme" content="dark" />
        <meta name="supported-color-schemes" content="dark" />
        <title>{`Rapor Asrama · ${memberName ?? slug}`}</title>
        {clientStyleHrefs.map((href) => (
          <link rel="stylesheet" href={href} key={href} />
        ))}
        <style>
          {`
            :root { color-scheme: dark; }
            body { margin: 0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: radial-gradient(circle at top, #0f172a, #020617 65%); color: #e2e8f0; }
            .page { min-height: 100vh; display: flex; align-items: stretch; justify-content: center; padding: 48px 16px; }
            .card { width: min(960px, 100%); background: rgba(15, 23, 42, 0.92); border: 1px solid rgba(148, 163, 184, 0.2); border-radius: 28px; padding: 40px; box-shadow: 0 32px 96px rgba(15, 23, 42, 0.55); backdrop-filter: blur(16px); }
            .heading { display: flex; flex-direction: column; gap: 12px; margin-bottom: 32px; }
            .heading h1 { font-size: clamp(1.75rem, 2.2vw, 2.5rem); margin: 0; color: #f8fafc; }
            .heading p { margin: 0; color: rgba(226, 232, 240, 0.75); font-size: 0.95rem; }
            .pill { display: inline-flex; align-items: center; gap: 8px; padding: 6px 14px; border-radius: 999px; background: rgba(79, 70, 229, 0.15); color: #c7d2fe; font-weight: 600; letter-spacing: 0.04em; text-transform: uppercase; font-size: 0.72rem; }
            .grid { display: grid; gap: 20px; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); margin-bottom: 36px; }
            .tile { border-radius: 18px; background: rgba(30, 41, 59, 0.85); border: 1px solid rgba(148, 163, 184, 0.2); padding: 20px; box-shadow: inset 0 0 0 1px rgba(148, 163, 184, 0.06); }
            .tile h2 { margin: 0; font-size: 0.8rem; letter-spacing: 0.08em; text-transform: uppercase; color: rgba(148, 163, 184, 0.85); }
            .tile .value { margin-top: 12px; font-size: clamp(1.9rem, 3vw, 2.6rem); font-weight: 700; color: #f8fafc; }
            .tile .subtitle { margin-top: 8px; font-size: 0.85rem; color: rgba(203, 213, 225, 0.76); }
            .breakdown { border-radius: 20px; background: rgba(15, 23, 42, 0.66); padding: 28px; border: 1px solid rgba(107, 114, 128, 0.22); }
            .breakdown h3 { margin: 0 0 20px; font-size: 1.1rem; color: #cbd5f5; }
            .breakdown ul { list-style: none; padding: 0; margin: 0; display: grid; gap: 16px; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); }
            .breakdown li { border-radius: 16px; padding: 16px; background: rgba(30, 41, 59, 0.72); border: 1px solid rgba(148, 163, 184, 0.18); }
            .breakdown span { display: block; }
            .label { color: rgba(148, 163, 184, 0.76); font-size: 0.78rem; letter-spacing: 0.06em; text-transform: uppercase; }
            .score { margin-top: 6px; font-size: 1.6rem; font-weight: 700; color: #f8fafc; }
            .footer { margin-top: 36px; font-size: 0.8rem; color: rgba(148, 163, 184, 0.58); text-align: center; }
            .months { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 16px; }
            .month-chip { padding: 6px 12px; border-radius: 999px; font-size: 0.78rem; border: 1px solid rgba(148, 163, 184, 0.25); background: rgba(30, 41, 59, 0.6); color: rgba(203, 213, 225, 0.9); }
            .month-chip.active { border-color: rgba(94, 234, 212, 0.6); color: #5eead4; background: rgba(15, 118, 110, 0.22); }
            @media (max-width: 640px) {
              .card { padding: 28px; border-radius: 22px; }
              .grid { grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); }
            }
          `}
        </style>
      </head>
      <body data-ssr-render="canary">
        <div id="root" data-hydration-state="ssr-pending">
          <main className="page">
            <article className="card" data-hydration="pending">
              <div className="heading">
                <span className="pill">Server Rendered Canary</span>
                <h1>Rapor {memberName ?? slug}</h1>
                <p>
                  Data periode <strong>{monthLabel}</strong>. Statistik ini dirender langsung di server Cloudflare
                  sebelum halaman dikirim ke browser.
                </p>
              </div>

              <section className="grid" aria-label="Ikhtisar skor">
                <div className="tile">
                  <h2>Skor rata-rata</h2>
                  <span className="value">{formatScore(stats.averageScore)}</span>
                  <span className="subtitle">Gabungan 4 pilar utama</span>
                </div>
                <div className="tile">
                  <h2>Perubahan vs bulan lalu</h2>
                  <span className="value">{formatTrend(stats.trend)}</span>
                  <span className="subtitle">Positif berarti ada peningkatan</span>
                </div>
                <div className="tile">
                  <h2>Slug anggota</h2>
                  <span className="value" style={{ fontSize: '1.4rem' }}>{slug}</span>
                  <span className="subtitle">Parameter permintaan saat ini</span>
                </div>
                <div className="tile">
                  <h2>Periode aktif</h2>
                  <span className="value" style={{ fontSize: '1.4rem' }}>{month}</span>
                  <span className="subtitle">Label: {monthLabel}</span>
                </div>
              </section>

              <section className="breakdown" aria-label="Rincian skor per bidang">
                <h3>Rincian per bidang</h3>
                <ul>
                  {Object.entries(stats.bidangBreakdown).map(([key, value]) => (
                    <li key={key}>
                      <span className="label">{key}</span>
                      <span className="score">{formatScore(value.score)}</span>
                      <span className="subtitle">Bobot aktif: {formatScore(value.totalWeight)}</span>
                    </li>
                  ))}
                </ul>
              </section>

              <section className="breakdown" aria-label="Periode tersedia">
                <h3>Periode lain</h3>
                <p style={{ marginBottom: '12px', color: 'rgba(148, 163, 184, 0.8)' }}>
                  Periode lain yang siap dirender. Pembaruan berikutnya akan mendukung permalink untuk
                  masing-masing periode.
                </p>
                <div className="months">
                  {months.map((item) => (
                    <span
                      key={item.value}
                      className={`month-chip${item.value === month ? ' active' : ''}`}
                      aria-current={item.value === month}
                    >
                      {item.label}
                    </span>
                  ))}
                </div>
              </section>

              <footer className="footer">
                Entri ini bagian dari Phase 3 migrasi Cloudflare Pages. Masih beta untuk cohort canary.
              </footer>
            </article>
          </main>
        </div>
        <script type="module" src={clientModuleHref} defer></script>
      </body>
    </html>
  );
}
