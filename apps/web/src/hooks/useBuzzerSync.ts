import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { getSessionSocket } from '../lib/socket';
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

  useEffect(() => {
    if (!sessionId || engagementType !== 'BUZZER') {
      return;
    }

    let mounted = true;
    let socketInstance: Awaited<ReturnType<typeof getSessionSocket>> | null = null;

    getSessionSocket()
      .then((socket) => {
        if (!mounted) return;
        socketInstance = socket;

        socket.onBuzzerOpened(sessionId, (event) => {
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
          dispatch(
            buzzerClosed({
              sessionId: event.sessionId,
              lockedForParticipantId: event.buzzerState.lockedForParticipantId,
            })
          );
        });

        socket.onBuzzerReset(sessionId, (event) => {
          dispatch(
            buzzerReset({
              sessionId: event.sessionId,
            })
          );
        });

        socket.onBuzzerOverride(sessionId, (event) => {
          dispatch(
            buzzerOverride({
              sessionId: event.sessionId,
              lockedForParticipantId: event.buzzerState.lockedForParticipantId,
            })
          );
        });
      })
      .catch((error) => {
        console.error('[useBuzzerSync] Failed to initialize buzzer socket listeners', error);
      });

    return () => {
      mounted = false;
      if (socketInstance) {
        socketInstance.offBuzzerOpened(sessionId);
        socketInstance.offBuzzerPressed(sessionId);
        socketInstance.offBuzzerClosed(sessionId);
        socketInstance.offBuzzerReset(sessionId);
        socketInstance.offBuzzerOverride(sessionId);
      }
    };
  }, [dispatch, sessionId, engagementType]);
}
