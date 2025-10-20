import { useEffect, useRef } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { setPlayerSession, setError } from '../store/slices/sessionSlice';
import { getSessionSocket } from '../lib/socket';
import { getSessionById } from '../lib/api';

/**
 * Restores player session from localStorage on app load.
 * Validates the session is still active by checking with the backend.
 */
export function usePlayerSessionRestore() {
  const dispatch = useAppDispatch();
  const role = useAppSelector((s) => s.session.role);
  const hasRestored = useRef(false);

  useEffect(() => {
    // Only restore once and only if no role is set
    if (hasRestored.current || role !== null) return;
    hasRestored.current = true;

    const stored = localStorage.getItem('playerSession');
    if (!stored) return;

    try {
      const data = JSON.parse(stored);
      const { sessionId, participantId, timestamp } = data;

      // Check if session is not too old (24 hours)
      const age = Date.now() - timestamp;
      if (age > 24 * 60 * 60 * 1000) {
        console.log('[usePlayerSessionRestore] Session too old, clearing');
        localStorage.removeItem('playerSession');
        return;
      }

      console.log('[usePlayerSessionRestore] Restoring player session:', sessionId);

      // Validate session is still active by fetching it (with transformation)
      getSessionById(sessionId)
        .then((session) => {
          // Check if participant is still in the session
          const participant = session.participants.find((p: any) => p.id === participantId);
          if (!participant) {
            console.warn('[usePlayerSessionRestore] Participant not found in session, clearing localStorage');
            localStorage.removeItem('playerSession');
            return;
          }

          console.log('[usePlayerSessionRestore] Session validated, restoring state');
          dispatch(setPlayerSession({ session, participantId }));

          // Reconnect to WebSocket
          getSessionSocket().then((socket) => {
            socket.subscribe(sessionId, () => {});
          });
        })
        .catch((err) => {
          console.error('[usePlayerSessionRestore] Failed to restore session:', err);
          localStorage.removeItem('playerSession');
          // Only show error if it's not a "session not found" case (which is expected for old/invalid sessions)
          // Don't dispatch error to avoid showing error message on every page load
        });
    } catch (err) {
      console.error('[usePlayerSessionRestore] Failed to parse stored session:', err);
      localStorage.removeItem('playerSession');
    }
  }, [dispatch, role]);
}
