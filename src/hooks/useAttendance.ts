/**
 * useAttendance — ambil data kehadiran Kumsub & Program satu santri per bulan.
 */

import { useEffect, useState } from 'react';
import { getAttendance, type AttendanceResponse } from '../services/api';
import { useApiRoute } from './useApiRoute';

export const useAttendance = (month: string, username?: string) => {
  const apiRoute = useApiRoute();
  const [data, setData] = useState<AttendanceResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!month || !username) {
      setLoading(!username);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    getAttendance(month, username)
      .then((response) => {
        if (!cancelled) setData(response);
      })
      .catch((err) => {
        console.error('❌ [useAttendance] Error:', err);
        if (!cancelled) {
          setData(null);
          setError(err instanceof Error ? err.message : 'Unknown error');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [month, username, apiRoute.revision]);

  return { data, loading, error };
};
