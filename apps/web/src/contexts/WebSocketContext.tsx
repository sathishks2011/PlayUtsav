import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import type { SessionSocket, ConnectionState } from '@pkg/core';
import { getSessionSocket } from '../lib/socket';

interface WebSocketContextValue {
  socket: SessionSocket | null;
  connectionState: ConnectionState;
  isConnected: boolean;
  reconnect: () => void;
}

const WebSocketContext = createContext<WebSocketContextValue>({
  socket: null,
  connectionState: 'disconnected',
  isConnected: false,
  reconnect: () => {},
});

export function useWebSocket() {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within WebSocketProvider');
  }
  return context;
}

interface WebSocketProviderProps {
  children: React.ReactNode;
}

export function WebSocketProvider({ children }: WebSocketProviderProps) {
  const [socket, setSocket] = useState<SessionSocket | null>(null);
  const [connectionState, setConnectionState] = useState<ConnectionState>('connecting');
  const [isConnected, setIsConnected] = useState(false);
  const initializingRef = useRef(false);

  // Initialize socket connection
  useEffect(() => {
    if (initializingRef.current) return;
    initializingRef.current = true;

    console.log('[WebSocketProvider] Initializing socket connection...');
    
    getSessionSocket()
      .then((socketInstance) => {
        console.log('[WebSocketProvider] Socket instance obtained');
        setSocket(socketInstance);
        
        // Set initial connection state
        const initialState = socketInstance.getConnectionState();
        setConnectionState(initialState);
        setIsConnected(socketInstance.isConnected());

        // Listen for connection state changes
        const handleConnectionChange = (state: ConnectionState) => {
          console.log('[WebSocketProvider] Connection state changed:', state);
          setConnectionState(state);
          setIsConnected(state === 'connected');
        };

        socketInstance.onConnectionChange(handleConnectionChange);

        // Cleanup
        return () => {
          console.log('[WebSocketProvider] Cleaning up socket connection');
          socketInstance.offConnectionChange(handleConnectionChange);
        };
      })
      .catch((error) => {
        console.error('[WebSocketProvider] Failed to initialize socket:', error);
        setConnectionState('error');
        setIsConnected(false);
      });
  }, []);

  // Manual reconnection function
  const reconnect = useCallback(() => {
    if (socket) {
      console.log('[WebSocketProvider] Manual reconnect triggered');
      socket.reconnect();
    }
  }, [socket]);

  const value: WebSocketContextValue = {
    socket,
    connectionState,
    isConnected,
    reconnect,
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
}
