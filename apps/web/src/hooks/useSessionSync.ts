import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { getSessionSocket } from '../lib/socket';
import { setSnapshot } from '../store/slices/sessionSlice';

export function useSessionSync() {
  const sessionId = useAppSelector((s) => s.session.current?.id);
  const dispatch = useAppDispatch();

  useEffect(() => {
    let mounted = true;
    let activeSessionId = sessionId;
    let socketRef: Awaited<ReturnType<typeof getSessionSocket>> | null = null;

    if (!sessionId) return () => {};

    getSessionSocket()
      .then((socket) => {
        if (!mounted) return;
        socketRef = socket;
        socket.subscribe(sessionId, (snapshot) => {
          if (snapshot) {
            dispatch(setSnapshot(snapshot));
          }
        });
      })
      .catch((err) => {
        console.error('Session socket connection failed', err);
      });

    return () => {
      mounted = false;
      if (socketRef && activeSessionId) {
        socketRef.unsubscribe(activeSessionId);
      }
    };
  }, [dispatch, sessionId]);
}

