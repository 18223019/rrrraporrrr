import { useEffect, useMemo, useState } from 'react';
import { CANARY_STORAGE_KEY, getActiveApiRouting } from '../services/api';

type ApiRouting = ReturnType<typeof getActiveApiRouting>;

interface ApiRouteState extends ApiRouting {
  revision: number;
  signature: string;
}

const CHECK_INTERVAL_MS = 5000;
function computeSignature(route: ApiRouting): string {
  const cookieState = typeof document !== 'undefined' ? document.cookie : '';
  return `${route.target}|${route.canary}|${route.renderMode}|${cookieState}`;
}

export const useApiRoute = (): ApiRouting & { revision: number } => {
  const initialRoute = useMemo(() => getActiveApiRouting(), []);
  const [state, setState] = useState<ApiRouteState>(() => ({
    ...initialRoute,
    revision: 0,
    signature: computeSignature(initialRoute),
  }));

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const updateState = () => {
      const nextRoute = getActiveApiRouting();
      const nextSignature = computeSignature(nextRoute);

      setState((prev) => {
        if (prev.signature === nextSignature) {
          return prev;
        }
        return {
          ...nextRoute,
          revision: prev.revision + 1,
          signature: nextSignature,
        };
      });
    };

    const interval = window.setInterval(updateState, CHECK_INTERVAL_MS);

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        updateState();
      }
    };

    const handleStorage = (event: StorageEvent) => {
      if (!event.key || event.key === CANARY_STORAGE_KEY) {
        updateState();
      }
    };

    window.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('storage', handleStorage);
    window.addEventListener('rapor-canary-change', updateState);

    updateState();

    return () => {
      window.clearInterval(interval);
      window.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('rapor-canary-change', updateState);
    };
  }, []);

  return useMemo(() => {
    const { signature, ...publicState } = state;
    return publicState;
  }, [state]);
};
