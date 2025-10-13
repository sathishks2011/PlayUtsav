import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { getSessionSocket } from '../lib/socket';
import { setQuizState, clearQuiz } from '../store/slices/quizSlice';
import { fetchQuiz } from '../lib/api';

export function useQuizSync() {
  const sessionId = useAppSelector((s) => s.session.current?.id);
  const dispatch = useAppDispatch();

  useEffect(() => {
    let active = true;
    if (!sessionId) {
      dispatch(clearQuiz());
      return () => {};
    }

    console.log('[useQuizSync] Setting up quiz sync for session:', sessionId);
    
    getSessionSocket()
      .then((socket) => {
        if (!active) return;
        console.log('[useQuizSync] Socket obtained, subscribing to quiz updates');
        socket.onQuiz(sessionId, (state) => {
          console.log('[useQuizSync] Received quiz:update event:', state);
          dispatch(setQuizState(state));
        });
      })
      .catch((err) => {
        console.error('Quiz socket subscription failed', err);
      });

    fetchQuiz(sessionId)
      .then((state) => {
        if (!active) return;
        dispatch(setQuizState(state));
      })
      .catch((err) => {
        console.warn('Unable to fetch quiz state', err);
      });

    return () => {
      active = false;
      getSessionSocket()
        .then((socket) => socket.offQuiz(sessionId))
        .catch(() => {});
    };
  }, [dispatch, sessionId]);
}
