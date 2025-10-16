# Robust WebSocket Management System

## Overview

This document describes the comprehensive WebSocket management system implemented to ensure reliable real-time communication between the server and all clients (web and mobile).

## Problem Statement

The previous WebSocket implementation had several issues:
1. **No connection state tracking** - Components couldn't detect if socket was connected
2. **No auto-reconnection** - Lost connections required manual page refresh
3. **No resubscription** - After reconnection, clients weren't resubscribed to session rooms
4. **Mobile network issues** - Network changes on mobile would break connections
5. **Manual refresh required** - Users had to refresh to see updates like buzzer presses, quiz state changes, etc.

## Solution Architecture

### 1. Enhanced Core Socket (`packages/core/src/socket/sessionSocket.ts`)

#### Connection State Management
```typescript
export type ConnectionState = 'connecting' | 'connected' | 'disconnected' | 'reconnecting' | 'error';
```

**Features:**
- Tracks connection state throughout lifecycle
- Emits state change events to all listeners
- Automatically resubscribes to sessions after reconnection

#### Auto-Reconnection
```typescript
const socket = io(`${baseUrl}/sessions`, { 
  transports: ['websocket', 'polling'], // Fallback to polling if websocket fails
  reconnection: true,
  reconnectionAttempts: Infinity, // Never give up
  reconnectionDelay: 1000, // Start with 1 second
  reconnectionDelayMax: 5000, // Max 5 seconds between attempts
  timeout: 20000, // 20 second connection timeout
});
```

**Connection Events Handled:**
- `connect` - Initial connection established
- `disconnect` - Connection lost
- `reconnect` - Successfully reconnected
- `reconnect_attempt` - Attempting to reconnect
- `reconnect_error` - Reconnection failed
- `reconnect_failed` - All reconnection attempts failed
- `connect_error` - Connection error

#### Session Resubscription
```typescript
subscribedSessions.forEach(sessionId => {
  console.log('[SessionSocket] Resubscribing to session:', sessionId);
  socket.emit('session:subscribe', { sessionId });
});
```

After any reconnection, all previously subscribed sessions are automatically resubscribed.

#### New API Methods
- `onConnectionChange(callback)` - Listen for connection state changes
- `offConnectionChange(callback)` - Remove connection listener
- `getConnectionState()` - Get current connection state
- `isConnected()` - Check if currently connected
- `reconnect()` - Manually trigger reconnection

### 2. React WebSocket Context (`apps/web/src/contexts/WebSocketContext.tsx`)

#### Purpose
Provides centralized WebSocket management for all React components.

#### Features
- **Single socket instance** - Shared across all components
- **Connection state** - Available to all components
- **Manual reconnection** - Exposed via context
- **Automatic initialization** - Sets up on app mount

#### Usage
```typescript
const { socket, connectionState, isConnected, reconnect } = useWebSocket();
```

### 3. Connection Status UI (`apps/web/src/components/ConnectionStatus.tsx`)

#### Visual Feedback
Shows a banner at the top of the screen when not connected:

| State | Color | Icon | Message | Actions |
|-------|-------|------|---------|---------|
| `connecting` | Yellow | ⟳ (spinning) | "Connecting..." | None |
| `reconnecting` | Orange | ⟳ (spinning) | "Reconnecting..." | None |
| `disconnected` | Red | ✕ | "Disconnected from server" | Reconnect button |
| `error` | Dark Red | ⚠ | "Connection error" | Reconnect button |
| `connected` | None | None | Hidden | None |

### 4. Updated Hooks

All WebSocket-dependent hooks have been updated to use the WebSocket context:

#### `useSessionSync`
- Waits for socket connection before subscribing
- Subscribes to session updates
- Handles score animations
- Auto-cleanup on unmount

#### `useQuizSync`
- Waits for socket connection
- Subscribes to quiz state updates
- Fetches initial quiz state
- Auto-cleanup on unmount

#### `useBuzzerSync`
- Waits for socket connection
- Subscribes to all buzzer events:
  - `buzzer:opened`
  - `buzzer:pressed`
  - `buzzer:closed`
  - `buzzer:reset`
  - `buzzer:override`
- Auto-cleanup on unmount

## Event Flow

### Initial Connection
```
1. App mounts
2. WebSocketProvider initializes
3. Socket connects to server
4. Connection state: 'connected'
5. Components subscribe to needed events
6. Server emits 'session:subscribe' for each session
7. Client joins session room on server
```

### Disconnection & Reconnection
```
1. Network drops
2. Connection state: 'disconnected'
3. ConnectionStatus banner shows
4. Socket.io starts auto-reconnection
5. Connection state: 'reconnecting'
6. Connection restored
7. Connection state: 'connected'
8. Auto-resubscribe to all sessions
9. ConnectionStatus banner hides
10. All events flowing again
```

### Event Propagation
```
Host Action → API Endpoint → SessionGateway.emit()
              ↓
       All clients in room receive event
              ↓
    SessionSocket listeners triggered
              ↓
       Redux state updated via hooks
              ↓
         Components re-render
              ↓
          UI updates
```

## Supported Events

### Session Events
- `session:update` - Session data changed
- `score:animated` - Score animation trigger
- `participant:removed` - Player kicked

### Quiz Events
- `quiz:update` - Quiz state changed (start, next, reveal, etc.)

### Buzzer Events
- `buzzer:opened` - Buzzer opened for responses
- `buzzer:pressed` - Player pressed buzzer
- `buzzer:closed` - Buzzer closed
- `buzzer:reset` - Buzzer reset
- `buzzer:override` - Host overrode buzzer control

## Mobile Considerations

### Network Changes
- Mobile devices often switch between WiFi and cellular
- Socket.io's auto-reconnection handles this seamlessly
- Polling transport used as fallback if WebSocket fails

### Background/Foreground
- When app goes to background, connection may be suspended
- When returning to foreground, auto-reconnection kicks in
- All subscriptions restored automatically

### Proxy Configuration
- Mobile uses `/api` proxy path (configured in Vite)
- Ensures consistent API URL across devices
- Works with `getApiBaseUrl()` helper

## Testing

### Manual Testing Checklist

#### Connection State
- [ ] Connection banner shows "Connecting..." on initial load
- [ ] Banner disappears when connected
- [ ] Events are received and UI updates

#### Reconnection
- [ ] Disable WiFi → Banner shows "Disconnected"
- [ ] Enable WiFi → Banner shows "Reconnecting..."
- [ ] When reconnected → Banner disappears
- [ ] All events continue to work

#### Cross-Device Sync
- [ ] Host opens buzzer → Mobile sees it open
- [ ] Player presses buzzer → Host sees press
- [ ] Host starts quiz → Mobile shows question
- [ ] Host reveals answer → Mobile shows answer
- [ ] Host moves to next question → Mobile follows

#### Mobile Specific
- [ ] Lock phone (background app) → Wait 10s → Unlock
- [ ] Should reconnect automatically
- [ ] Events should resume

- [ ] Switch WiFi networks while app open
- [ ] Should reconnect to new network
- [ ] Events should resume

### Automated Testing

To be implemented with integration tests covering:
- Connection lifecycle
- Event propagation
- Reconnection scenarios
- Multiple clients in same session

## Debugging

### Enable Detailed Logs

All WebSocket operations are logged to console:
```
[WebSocketProvider] Initializing socket connection...
[SessionSocket] Connected to server
[SessionSocket] Connection state changed: connected
[useSessionSync] Setting up session sync for: abc123
[SessionSocket] Subscribing to session: abc123
[useQuizSync] Setting up quiz sync for session: abc123
[useBuzzerSync] Setting up buzzer sync for session: abc123
```

### Common Issues

#### "Waiting for socket connection..."
**Cause:** Socket not yet initialized or connection lost
**Solution:** Check ConnectionStatus banner, ensure backend is running

#### Events not received
**Cause:** Not subscribed to session room on server
**Solution:** Check logs for `[SessionSocket] Subscribing to session`

#### "Disconnected" banner won't go away
**Cause:** Backend server not reachable
**Solution:** 
1. Check backend is running on correct port
2. Check network connectivity
3. Check CORS configuration
4. Try manual reconnect button

## Performance

### Connection Overhead
- Single WebSocket connection per client
- Minimal bandwidth usage (only changed data sent)
- Automatic batching of events by Socket.io

### Memory Usage
- Event listeners properly cleaned up on unmount
- No memory leaks from abandoned subscriptions
- Connection state tracked efficiently

## Future Enhancements

1. **Offline Queue** - Queue events while offline, send when reconnected
2. **Conflict Resolution** - Handle concurrent updates from multiple hosts
3. **Event Versioning** - Ensure client/server event compatibility
4. **Health Monitoring** - Ping/pong to detect stale connections
5. **Connection Metrics** - Track reconnection frequency, latency

## Related Files

### Core
- `packages/core/src/socket/sessionSocket.ts` - Core socket management
- `packages/core/src/types.ts` - Type definitions

### Web App
- `apps/web/src/contexts/WebSocketContext.tsx` - React context
- `apps/web/src/components/ConnectionStatus.tsx` - Status UI
- `apps/web/src/hooks/useSessionSync.ts` - Session event hook
- `apps/web/src/hooks/useQuizSync.ts` - Quiz event hook
- `apps/web/src/hooks/useBuzzerSync.ts` - Buzzer event hook
- `apps/web/src/lib/socket.ts` - Socket instance factory
- `apps/web/src/App.tsx` - WebSocketProvider setup

### Backend
- `services/api/src/gateways/session.gateway.ts` - WebSocket gateway
- `services/api/src/main.ts` - CORS configuration

## Summary

This robust WebSocket management system ensures:
✅ **Reliable connections** - Auto-reconnection with exponential backoff
✅ **State tracking** - Always know connection status
✅ **Auto-resubscription** - No manual refresh needed
✅ **Visual feedback** - Connection status visible to users
✅ **Mobile friendly** - Handles network changes gracefully
✅ **Developer friendly** - Comprehensive logging and error handling
✅ **Real-time sync** - All events propagate instantly across devices

No more manual refreshes required! 🎉
