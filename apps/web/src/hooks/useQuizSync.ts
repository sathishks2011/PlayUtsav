import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { useWebSocket } from '../contexts/WebSocketContext';
import { setQuizState, clearQuiz } from '../store/slices/quizSlice';
import { fetchQuiz } from '../lib/api';

export function useQuizSync() {
  const session = useAppSelector((s) => s.session.current);
  const sessionId = session?.id;
  const hasQuizTemplate = Boolean(session?.quizTemplateId);
  const dispatch = useAppDispatch();
  const { socket, isConnected } = useWebSocket();

  useEffect(() => {
    if (!sessionId) {
      dispatch(clearQuiz());
      return;
    }

    // Only sync quiz if session has a quiz template
    if (!hasQuizTemplate) {
      console.log('[useQuizSync] Session does not have a quiz template, skipping sync');
      dispatch(clearQuiz());
      return;
    }

    if (!socket || !isConnected) {
      console.log('[useQuizSync] Waiting for socket connection...');
      return;
    }

    console.log('[useQuizSync] Setting up quiz sync for session:', sessionId);
    
    // Subscribe to quiz updates
    socket.onQuiz(sessionId, (state) => {
      console.log('[useQuizSync] Received quiz:update event:', state);
      dispatch(setQuizState(state));
    });

    // Fetch initial quiz state
    fetchQuiz(sessionId)
      .then((state) => {
        console.log('[useQuizSync] Fetched initial quiz state');
        dispatch(setQuizState(state));
      })
      .catch((err) => {
        console.warn('[useQuizSync] Unable to fetch quiz state:', err);
      });

    // Cleanup
    return () => {
      console.log('[useQuizSync] Cleaning up quiz sync');
      socket.offQuiz(sessionId);
    };
  }, [dispatch, sessionId, hasQuizTemplate, socket, isConnected]);
}
