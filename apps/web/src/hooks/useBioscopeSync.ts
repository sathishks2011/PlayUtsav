import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { updateGameState, resetBioscope } from '../store/slices/bioscopeSlice';
import { setActiveGameIndex } from '../store/slices/sessionSlice';
import { getBioscopeSocket } from '../lib/socket';
import { fetchBioscopeGameState } from '../store/slices/bioscopeSlice';

export function useBioscopeSync() {
  const session = useAppSelector((s) => s.session.current);
  const sessionId = session?.id;
  const dispatch = useAppDispatch();

  // Check if any of the games in the session is a bioscope game
  const hasBioscopeGame = session?.games?.some((game) => game.type === 'bioscope');

  useEffect(() => {
    if (!sessionId) {
      dispatch(resetBioscope());
      return;
    }

    // Only sync bioscope if session has a bioscope game
    if (!hasBioscopeGame) {
      console.log('[useBioscopeSync] Session does not have a bioscope game, skipping sync');
      dispatch(resetBioscope());
      return;
    }

    console.log('[useBioscopeSync] Setting up bioscope sync for session:', sessionId);

    let socket: Awaited<ReturnType<typeof getBioscopeSocket>>;

    // Setup WebSocket subscription
    getBioscopeSocket()
      .then((bioscopeSocket) => {
        socket = bioscopeSocket;

        // Subscribe to this session's bioscope updates
        socket.subscribe(sessionId);

        // Listen for all bioscope game state updates
        const handleStateUpdate = (state: any) => {
          console.log('[useBioscopeSync] Received bioscope:state-updated event:', state);
          // Fetch full game state since event only contains partial data
          dispatch(fetchBioscopeGameState({ sessionId }))
            .unwrap()
            .then((fullState: any) => {
              // If bioscope is active, switch client to bioscope game card
              if (fullState?.status === 'active') {
                const bioscopeIndex = session?.games?.findIndex((g: any) => g.type === 'bioscope');
                if (typeof bioscopeIndex === 'number' && bioscopeIndex !== -1) {
                  console.log('[useBioscopeSync] Bioscope active — setting activeGameIndex to', bioscopeIndex);
                  dispatch(setActiveGameIndex(bioscopeIndex));
                }
              }
            })
            .catch(() => {
              // ignore fetch errors here
            });
        };

        const handleGameStarted = (event: any) => {
          console.log('[useBioscopeSync] Received bioscope:game-started event:', event);
          // Fetch full game state after game started
          dispatch(fetchBioscopeGameState({ sessionId }))
            .unwrap()
            .then((fullState: any) => {
              if (fullState?.status === 'active') {
                const bioscopeIndex = session?.games?.findIndex((g: any) => g.type === 'bioscope');
                if (typeof bioscopeIndex === 'number' && bioscopeIndex !== -1) {
                  console.log('[useBioscopeSync] Bioscope started — setting activeGameIndex to', bioscopeIndex);
                  dispatch(setActiveGameIndex(bioscopeIndex));
                }
              }
            })
            .catch(() => {});
        };

        const handleImageRevealed = (event: any) => {
          console.log('[useBioscopeSync] Received bioscope:image-revealed event:', event);
          // Fetch updated game state
          dispatch(fetchBioscopeGameState({ sessionId }));
        };

        const handleAnswerRevealed = (event: any) => {
          console.log('[useBioscopeSync] Received bioscope:answer-revealed event:', event);
          // Fetch updated game state
          dispatch(fetchBioscopeGameState({ sessionId }));
        };

        const handleRoundComplete = (event: any) => {
          console.log('[useBioscopeSync] Received bioscope:round-complete event:', event);
          // Fetch updated game state
          dispatch(fetchBioscopeGameState({ sessionId }));
        };

        const handleGameCompleted = (event: any) => {
          console.log('[useBioscopeSync] Received bioscope:game-completed event:', event);
          // Fetch updated game state
          dispatch(fetchBioscopeGameState({ sessionId }));
        };

        // Subscribe to all bioscope events
        socket.on('bioscope:state-updated', handleStateUpdate);
        socket.on('bioscope:game-started', handleGameStarted);
        socket.on('bioscope:image-revealed', handleImageRevealed);
        socket.on('bioscope:answer-revealed', handleAnswerRevealed);
        socket.on('bioscope:round-complete', handleRoundComplete);
        socket.on('bioscope:game-completed', handleGameCompleted);

        // Fetch initial bioscope state
        dispatch(fetchBioscopeGameState({ sessionId }))
          .unwrap()
          .then((state: any) => {
            console.log('[useBioscopeSync] Fetched initial bioscope state:', state);
            if (state?.status === 'active') {
              const bioscopeIndex = session?.games?.findIndex((g: any) => g.type === 'bioscope');
              if (typeof bioscopeIndex === 'number' && bioscopeIndex !== -1) {
                console.log('[useBioscopeSync] Initial bioscope state active — setting activeGameIndex to', bioscopeIndex);
                dispatch(setActiveGameIndex(bioscopeIndex));
              }
            }
          })
          .catch((err: any) => {
            console.warn('[useBioscopeSync] Unable to fetch bioscope state:', err);
            // Don't clear state on error - might be that game hasn't started yet
          });

        console.log('[useBioscopeSync] Bioscope sync setup complete');
      })
      .catch((err) => {
        console.error('[useBioscopeSync] Failed to setup bioscope socket:', err);
      });

    // Cleanup
    return () => {
      console.log('[useBioscopeSync] Cleaning up bioscope sync');
      if (socket) {
        socket.unsubscribe(sessionId);
        socket.off('bioscope:state-updated');
        socket.off('bioscope:game-started');
        socket.off('bioscope:image-revealed');
        socket.off('bioscope:answer-revealed');
        socket.off('bioscope:round-complete');
        socket.off('bioscope:game-completed');
      }
    };
  }, [dispatch, sessionId, hasBioscopeGame, session]);
}
