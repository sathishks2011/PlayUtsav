import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { useWebSocket } from '../contexts/WebSocketContext';
import {
  buzzerOpened,
  buzzerPressed,
  buzzerClosed,
  buzzerReset,
  buzzerOverride,
} from '../store/slices/quizSlice';

export function useBuzzerSync() {
  const dispatch = useAppDispatch();
  const sessionId = useAppSelector((s) => s.session.current?.id);
  const engagementType = useAppSelector((s) => s.session.current?.playerEngagementType);
  const { socket, isConnected } = useWebSocket();

  useEffect(() => {
    if (!sessionId || engagementType !== 'BUZZER') {
      return;
    }

    if (!socket || !isConnected) {
      console.log('[useBuzzerSync] Waiting for socket connection...');
      return;
    }

    console.log('[useBuzzerSync] Setting up buzzer sync for session:', sessionId);

    socket.onBuzzerOpened(sessionId, (event) => {
      console.log('[useBuzzerSync] Buzzer opened event received');
      dispatch(
        buzzerOpened({
          sessionId: event.sessionId,
          isOpen: event.buzzerState.isOpen,
          buzzerOpenedAt: event.buzzerState.buzzerOpenedAt ?? null,
          timerDuration: event.buzzerState.timerDuration,
        })
      );
    });

    socket.onBuzzerPressed(sessionId, (event) => {
      console.log('[useBuzzerSync] Buzzer pressed event received');
      dispatch(
        buzzerPressed({
          sessionId: event.sessionId,
          buzzerPress: event.buzzerPress,
          buzzPresses: event.buzzerState.buzzPresses,
          firstBuzzerId: event.buzzerState.firstBuzzerId,
          lockedForParticipantId: event.buzzerState.lockedForParticipantId,
          isOpen: event.buzzerState.isOpen,
        })
      );
    });

    socket.onBuzzerClosed(sessionId, (event) => {
      console.log('[useBuzzerSync] Buzzer closed event received');
      dispatch(
        buzzerClosed({
          sessionId: event.sessionId,
          lockedForParticipantId: event.buzzerState.lockedForParticipantId,
        })
      );
    });

    socket.onBuzzerReset(sessionId, (event) => {
      console.log('[useBuzzerSync] Buzzer reset event received');
      dispatch(
        buzzerReset({
          sessionId: event.sessionId,
        })
      );
    });

    socket.onBuzzerOverride(sessionId, (event) => {
      console.log('[useBuzzerSync] Buzzer override event received');
      dispatch(
        buzzerOverride({
          sessionId: event.sessionId,
          lockedForParticipantId: event.buzzerState.lockedForParticipantId,
        })
      );
    });

    // Cleanup
    return () => {
      console.log('[useBuzzerSync] Cleaning up buzzer sync');
      socket.offBuzzerOpened(sessionId);
      socket.offBuzzerPressed(sessionId);
      socket.offBuzzerClosed(sessionId);
      socket.offBuzzerReset(sessionId);
      socket.offBuzzerOverride(sessionId);
    };
  }, [dispatch, sessionId, engagementType, socket, isConnected]);
}
