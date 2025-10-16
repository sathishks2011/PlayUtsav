import { useState, useEffect } from 'react';
import { useWebSocket } from '../contexts/WebSocketContext';

export function ConnectionStatus() {
  const { connectionState, isConnected, reconnect } = useWebSocket();
  const [isReconnecting, setIsReconnecting] = useState(false);

  // Reset reconnecting state when connection state changes
  useEffect(() => {
    if (connectionState === 'connected' || connectionState === 'connecting' || connectionState === 'reconnecting') {
      setIsReconnecting(false);
    }
  }, [connectionState]);

  // Don't show anything when connected
  if (isConnected) {
    return null;
  }

  const getStatusConfig = () => {
    switch (connectionState) {
      case 'connecting':
        return {
          bgColor: 'bg-yellow-500',
          textColor: 'text-yellow-50',
          icon: '⟳',
          message: 'Connecting...',
          showReconnect: false,
        };
      case 'reconnecting':
        return {
          bgColor: 'bg-orange-500',
          textColor: 'text-orange-50',
          icon: '⟳',
          message: 'Reconnecting...',
          showReconnect: false,
        };
      case 'disconnected':
        return {
          bgColor: 'bg-red-500',
          textColor: 'text-red-50',
          icon: '✕',
          message: 'Disconnected from server',
          showReconnect: true,
        };
      case 'error':
        return {
          bgColor: 'bg-red-600',
          textColor: 'text-red-50',
          icon: '⚠',
          message: 'Connection error',
          showReconnect: true,
        };
      default:
        return {
          bgColor: 'bg-gray-500',
          textColor: 'text-gray-50',
          icon: '?',
          message: 'Unknown status',
          showReconnect: false,
        };
    }
  };

  const config = getStatusConfig();

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-50 ${config.bgColor} ${config.textColor} px-4 py-2 flex items-center justify-between shadow-lg`}
    >
      <div className="flex items-center gap-2">
        <span
          className={`text-lg ${connectionState === 'connecting' || connectionState === 'reconnecting' ? 'animate-spin' : ''}`}
        >
          {config.icon}
        </span>
        <span className="font-medium">{config.message}</span>
      </div>
      {config.showReconnect && (
        <button
          onClick={() => {
            console.log('[ConnectionStatus] Reconnect button clicked');
            setIsReconnecting(true);
            reconnect();
            // Reset after 3 seconds to allow retry if it fails
            setTimeout(() => setIsReconnecting(false), 3000);
          }}
          disabled={isReconnecting}
          className="px-3 py-1 bg-white bg-opacity-20 hover:bg-opacity-30 rounded transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {isReconnecting ? (
            <>
              <span className="animate-spin">⟳</span>
              <span>Reconnecting...</span>
            </>
          ) : (
            'Reconnect'
          )}
        </button>
      )}
    </div>
  );
}
