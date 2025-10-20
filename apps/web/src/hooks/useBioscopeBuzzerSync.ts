import { useEffect } from 'react';
import { useSocket } from '../contexts/WebSocketContext';
import { useAppDispatch } from '../store/hooks';
import { setBioscopeBuzzerState } from '../store/slices/bioscopeSlice';

export function useBioscopeBuzzerSync(sessionId: string) {
  const socket = useSocket();
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (!socket || !sessionId) return;

    const handleBuzzerOpened = (payload: { buzzerState: any }) => {
      dispatch(setBioscopeBuzzerState(payload.buzzerState));
    };

    const handleBuzzerClosed = (payload: { buzzerState: any }) => {
      dispatch(setBioscopeBuzzerState(payload.buzzerState));
    };

    const handleBuzzerPressed = (payload: { buzzerState: any }) => {
      dispatch(setBioscopeBuzzerState(payload.buzzerState));
    };

    const handleBuzzerReset = (payload: { buzzerState: any }) => {
      dispatch(setBioscopeBuzzerState(payload.buzzerState));
    };

    socket.on('bioscope:buzzer:opened', handleBuzzerOpened);
    socket.on('bioscope:buzzer:closed', handleBuzzerClosed);
    socket.on('bioscope:buzzer:pressed', handleBuzzerPressed);
    socket.on('bioscope:buzzer:reset', handleBuzzerReset);

    return () => {
      socket.off('bioscope:buzzer:opened', handleBuzzerOpened);
      socket.off('bioscope:buzzer:closed', handleBuzzerClosed);
      socket.off('bioscope:buzzer:pressed', handleBuzzerPressed);
      socket.off('bioscope:buzzer:reset', handleBuzzerReset);
    };
  }, [socket, sessionId, dispatch]);
}
