import { useMemo, useState } from 'react';
import { useApiRoute } from '../hooks/useApiRoute';
import {
  CANARY_COOKIE_NAME,
  CANARY_COOKIE_VALUE,
  CANARY_HEADER_NAME,
  CANARY_QUERY_PARAM,
  disableCanaryCookie,
  enableCanaryCookie,
} from '../services/api';

function getOrigin() {
  if (typeof window === 'undefined') return 'https://rapor.example';
  return window.location.origin;
}

export function CanaryOptInPage() {
  const route = useApiRoute();
  const [lastAction, setLastAction] = useState<'joined' | 'left' | null>(null);

  const origin = useMemo(() => getOrigin(), []);
  const queryOptInUrl = `${origin}?${CANARY_QUERY_PARAM}=pages`;
  const headerSnippet = `curl -H "${CANARY_HEADER_NAME}: true" ${origin}/api/rapor?resource=months`;

  const cookieLabel = `${CANARY_COOKIE_NAME}=${CANARY_COOKIE_VALUE}`;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-10 px-4 py-12">
        <header className="space-y-3">
          <p className="text-sm uppercase tracking-[0.35em] text-emerald-400">Cloudflare Canary</p>
          <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            Opt-in to the Cloudflare proxy experience
          </h1>
          <p className="max-w-2xl text-sm text-slate-300 sm:text-base">
            Gunakan halaman ini untuk bergabung (atau keluar) dari percobaan migrasi Cloudflare Pages. Kami memakai cookie
            canary untuk mengarahkan request Anda ke proxy baru &mdash; tidak perlu login ulang.
          </p>
        </header>

        <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-2xl shadow-emerald-900/30">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.25em] text-slate-400">Status sekarang</p>
              <p className="mt-2 text-emerald-300">
                Target: <span className="font-semibold text-white">{route.target}</span>
              </p>
              <p className="text-emerald-300">
                Render mode: <span className="font-semibold text-white">{route.renderMode}</span>
              </p>
              <p className="text-emerald-300">
                Canary cookie aktif: <span className="font-semibold text-white">{route.canary ? 'Ya' : 'Tidak'}</span>
              </p>
            </div>
            <div className="text-xs text-slate-400">
              <p>Cookie</p>
              <code className="mt-1 inline-block rounded bg-slate-800 px-2 py-1 text-slate-200">{cookieLabel}</code>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => {
                enableCanaryCookie();
                setLastAction('joined');
              }}
              className="rounded-lg border border-emerald-400/70 bg-emerald-500/10 px-4 py-2 text-sm font-semibold uppercase tracking-wide text-emerald-200 transition hover:bg-emerald-400/20"
            >
              Join Canary
            </button>
            <button
              type="button"
              onClick={() => {
                disableCanaryCookie();
                setLastAction('left');
              }}
              className="rounded-lg border border-slate-500 px-4 py-2 text-sm font-semibold uppercase tracking-wide text-slate-200 transition hover:bg-slate-700/40"
            >
              Leave Canary
            </button>
            <button
              type="button"
              onClick={() => {
                if (typeof window !== 'undefined') {
                  window.location.reload();
                }
              }}
              className="rounded-lg border border-slate-600 px-4 py-2 text-sm font-semibold uppercase tracking-wide text-slate-200 transition hover:bg-slate-700/40"
            >
              Refresh Page
            </button>
          </div>

          {lastAction && (
            <p className="mt-4 text-xs text-slate-400">
              {lastAction === 'joined'
                ? '✅ Canary cookie diset. Reload halaman dashboard Anda untuk memastikan fetch diarahkan ke proxy Cloudflare.'
                : '👋 Canary cookie dihapus. Anda kembali memakai jalur lama (Firebase/GAS langsung).' }
            </p>
          )}
        </section>

        <section className="grid gap-6 rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl">
          <header>
            <h2 className="text-xl font-semibold text-white">Alternatif lain</h2>
            <p className="text-sm text-slate-300">
              Bila cookie tidak tersedia (mis. testing otomatis), gunakan query param atau header berikut.
            </p>
          </header>
          <div className="space-y-4">
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Query parameter</p>
              <code className="mt-1 block truncate rounded bg-slate-800 px-3 py-2 text-sm text-slate-100">{queryOptInUrl}</code>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-slate-400">HTTP header</p>
              <code className="mt-1 block overflow-x-auto rounded bg-slate-800 px-3 py-2 text-sm text-slate-100">{headerSnippet}</code>
            </div>
          </div>
        </section>

        <footer className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 text-xs text-slate-400">
          <p>
            Catatan: cookie akan kedaluwarsa otomatis setelah beberapa jam. Kalau kamu ingin memaksa mode lama, cukup pilih "Leave Canary" atau hapus cookie {CANARY_COOKIE_NAME} secara manual di DevTools.
          </p>
        </footer>
      </div>
    </div>
  );
}

export default CanaryOptInPage;
