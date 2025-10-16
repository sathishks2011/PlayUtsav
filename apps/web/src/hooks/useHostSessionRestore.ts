import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { setHostSession } from '../store/slices/sessionSlice';
import { getSessionById } from '../lib/api';
import type { Session } from '@pkg/core';

/**
 * Restores host session from localStorage on app load.
 * This allows hosts to refresh the page without losing their session.
 */
export function useHostSessionRestore() {
  const dispatch = useAppDispatch();
  const role = useAppSelector((s) => s.session.role);
  const authStatus = useAppSelector((s) => s.auth.status);
  const isAuthenticated = authStatus === 'authenticated';

  useEffect(() => {
    // If user is not authenticated, clear any stored host session
    // if (!isAuthenticated) {
    //   const stored = localStorage.getItem('hostSession');
    //   if (stored) {
    //     console.info('[useHostSessionRestore] User not authenticated, clearing stored session');
    //     localStorage.removeItem('hostSession');
    //   }
    //   return;
    // }

    // Only attempt restore if no session is currently loaded
    if (role !== null) {
      return;
    }

    const stored = localStorage.getItem('hostSession');
    if (!stored) return;

    try {
      const data = JSON.parse(stored);
      const { sessionId: storedSessionId, timestamp } = data;

      // Validate stored data
      if (!storedSessionId || typeof storedSessionId !== 'string') {
        console.warn('[useHostSessionRestore] Invalid stored session data');
        localStorage.removeItem('hostSession');
        return;
      }

      // Check if session is stale (older than 24 hours)
      const age = Date.now() - timestamp;
      if (age > 24 * 60 * 60 * 1000) {
        console.info('[useHostSessionRestore] Session expired (>24h), clearing');
        localStorage.removeItem('hostSession');
        return;
      }

      // Fetch fresh session data from server
      console.info('[useHostSessionRestore] Restoring host session:', storedSessionId);
      getSessionById(storedSessionId)
        .then((session: Session) => {
          if (!session) {
            console.warn('[useHostSessionRestore] Session not found on server, clearing localStorage');
            localStorage.removeItem('hostSession');
            return;
          }

          console.info('[useHostSessionRestore] ✅ Host session restored successfully');
          dispatch(setHostSession(session));
        })
        .catch((err: unknown) => {
          console.error('[useHostSessionRestore] Failed to fetch session:', err);
          localStorage.removeItem('hostSession');
        });
    } catch (err) {
      console.error('[useHostSessionRestore] Failed to parse stored session:', err);
      localStorage.removeItem('hostSession');
    }
  }, [dispatch, role, isAuthenticated, authStatus]);
}
