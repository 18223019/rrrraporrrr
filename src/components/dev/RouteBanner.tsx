import { useEffect, useMemo, useState } from 'react';
import { useApiRoute } from '../../hooks/useApiRoute';
import {
  CANARY_COOKIE_NAME,
  CANARY_COOKIE_VALUE,
  disableCanaryCookie,
  enableCanaryCookie,
} from '../../services/api';
const SHOW_KEY = 'rapor_route_banner';

const isDev = import.meta.env.DEV;

function readPref(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const stored = window.localStorage.getItem(SHOW_KEY);
    if (stored === null) {
      return isDev;
    }
    return stored === 'true';
  } catch {
    return isDev;
  }
}

export function RouteBanner() {
  const route = useApiRoute();
  const [visible, setVisible] = useState<boolean>(readPref);
  const [cookieState, setCookieState] = useState<string>('');

  useEffect(() => {
    if (typeof document === 'undefined') return;
    setCookieState(document.cookie || '');
  }, [route.revision]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(SHOW_KEY, visible ? 'true' : 'false');
    } catch {
      // ignore localStorage failures
    }
  }, [visible]);

  const helpers = useMemo(() => ({
    setCanary() {
      if (typeof document === 'undefined') return;
      enableCanaryCookie();
      setCookieState(document.cookie || '');
    },
    clearCanary() {
      if (typeof document === 'undefined') return;
      disableCanaryCookie();
      setCookieState(document.cookie || '');
    },
  }), []);

  if (!visible) {
    return (
      <button
        type="button"
        onClick={() => setVisible(true)}
        className="fixed bottom-4 left-4 z-[10000] rounded-full border border-slate-500/60 bg-slate-900/80 px-4 py-2 text-xs font-medium text-slate-200 shadow-lg backdrop-blur"
      >
        Show API Route
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 left-4 z-[10000] max-w-md rounded-xl border border-slate-600/80 bg-slate-900/90 p-4 text-xs text-slate-100 shadow-xl backdrop-blur">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[0.85rem] font-semibold tracking-wide text-emerald-300">
            API Route Diagnostic
          </p>
          <ul className="mt-2 space-y-1">
            <li>
              <span className="text-slate-400">Target:</span>{' '}
              <code className="rounded bg-slate-800 px-1.5 py-0.5 text-slate-100">{route.target}</code>
            </li>
            <li>
              <span className="text-slate-400">Render mode:</span>{' '}
              <code className="rounded bg-slate-800 px-1.5 py-0.5 text-slate-100">{route.renderMode}</code>
            </li>
            <li>
              <span className="text-slate-400">Canary enabled:</span>{' '}
              <code className="rounded bg-slate-800 px-1.5 py-0.5 text-slate-100">{route.canary ? 'true' : 'false'}</code>
            </li>
            <li>
              <span className="text-slate-400">Cookie:</span>{' '}
              <code className="rounded bg-slate-800 px-1.5 py-0.5 text-slate-100">{`${CANARY_COOKIE_NAME}=${CANARY_COOKIE_VALUE}`}</code>
            </li>
            <li>
              <span className="text-slate-400">Revision:</span>{' '}
              <code className="rounded bg-slate-800 px-1.5 py-0.5 text-slate-100">{route.revision}</code>
            </li>
          </ul>
        </div>
        <button
          type="button"
          onClick={() => setVisible(false)}
          className="rounded-full border border-slate-500/80 px-2 py-1 text-[0.7rem] font-semibold uppercase tracking-wider text-slate-300 transition hover:bg-slate-800"
        >
          Hide
        </button>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={helpers.setCanary}
          className="rounded border border-emerald-400/60 px-2 py-1 text-[0.7rem] font-semibold uppercase tracking-wide text-emerald-200 transition hover:bg-emerald-500/10"
        >
          Set Canary Cookie
        </button>
        <button
          type="button"
          onClick={helpers.clearCanary}
          className="rounded border border-slate-500 px-2 py-1 text-[0.7rem] font-semibold uppercase tracking-wide text-slate-200 transition hover:bg-slate-700/40"
        >
          Clear Canary
        </button>
      </div>

      <details className="mt-3 text-[0.7rem] text-slate-400">
        <summary className="cursor-pointer select-none text-slate-300">Cookies</summary>
        <pre className="mt-1 max-h-32 overflow-auto whitespace-pre-wrap break-all rounded bg-slate-950/60 p-2 text-[0.65rem] text-slate-300">
{cookieState || '(none)'}
        </pre>
      </details>
    </div>
  );
}
