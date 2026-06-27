import { useEffect } from 'react';
import type { User } from 'firebase/auth';
import {
  CANARY_AUTO_STORAGE_KEY,
  CANARY_COOKIE_NAME,
  CANARY_COOKIE_VALUE,
  disableCanaryCookie,
  enableCanaryCookie,
} from '../services/api';
import { CANARY_TESTER_USERNAMES } from '../data/canaryTesters';

interface CanaryAutoEnrollProps {
  user: User | null;
}

export function CanaryAutoEnroll({ user }: CanaryAutoEnrollProps) {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const username = user?.uid?.toLowerCase() ?? null;
    const storageKey = CANARY_AUTO_STORAGE_KEY;

    const setAutoFlag = (value: string | null) => {
      try {
        if (value) {
          window.localStorage.setItem(storageKey, value);
        } else {
          window.localStorage.removeItem(storageKey);
        }
      } catch {
        // Swallow storage errors (e.g., Safari private mode)
      }
    };

    const wasAuto = (() => {
      try {
        return window.localStorage.getItem(storageKey) ?? '';
      } catch {
        return '';
      }
    })();

    const cookieIsSet = typeof document !== 'undefined'
      ? document.cookie.includes(`${CANARY_COOKIE_NAME}=${CANARY_COOKIE_VALUE}`)
      : false;

    if (username && CANARY_TESTER_USERNAMES.has(username)) {
      enableCanaryCookie();
      setAutoFlag(username);
      return;
    }

    if (wasAuto && cookieIsSet) {
      disableCanaryCookie();
    }
    setAutoFlag(null);
  }, [user]);

  return null;
}

export default CanaryAutoEnroll;
