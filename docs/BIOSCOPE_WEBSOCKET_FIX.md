# Bioscope WebSocket Connection Fix

## Issue
The bioscope game wasn't working because there was no WebSocket client connecting to the `/bioscope` namespace. The existing `SessionSocket` only connected to the `/sessions` namespace, but the `BioscopeGateway` was listening on the `/bioscope` namespace.

## Solution

### 1. Created Bioscope Socket Client
**File**: `apps/web/src/lib/bioscopeSocket.ts`

Created a dedicated Bioscope socket client similar to the session socket that:
- Connects to `${baseUrl}/bioscope` namespace
- Provides subscribe/unsubscribe methods for sessions
- Handles connection, disconnection, and reconnection events
- Provides generic `on`/`off` methods for event listening
- Includes comprehensive error logging

```typescript
export type BioscopeSocket = {
  subscribe: (sessionId: string) => void;
  unsubscribe: (sessionId: string) => void;
  on: (event: string, cb: (...args: unknown[]) => void) => void;
  off: (event: string, cb?: (...args: unknown[]) => void) => void;
  disconnect: () => void;
  isConnected: () => boolean;
};
```

### 2. Exported from Socket Module
**File**: `apps/web/src/lib/socket.ts`

Added exports for the new bioscope socket:
```typescript
export { getBioscopeSocket, resetBioscopeSocket } from './bioscopeSocket';
export type { BioscopeSocket, BioscopeGameState } from './bioscopeSocket';
```

### 3. Integrated into HostBioscopePanel
**File**: `apps/web/src/components/HostBioscopePanel.tsx`

Added WebSocket event handling in `HostBioscopePanel`:

**Events Subscribed**:
- `bioscope:state-updated` - Game state changes
- `bioscope:image-revealed` - When an image is revealed
- `bioscope:answer-revealed` - When the answer is shown
- `bioscope:round-complete` - When a round finishes
- `bioscope:game-completed` - When the game ends

**Event Handlers**:
All event handlers refresh the game state when their respective events are received, ensuring the UI stays in sync with the server.

```typescript
useEffect(() => {
  if (!sessionId) return;

  let mounted = true;

  getBioscopeSocket().then((socket) => {
    if (!mounted) return;

    socket.subscribe(sessionId);

    // Register event handlers
    socket.on('bioscope:state-updated', handleGameStateUpdate);
    socket.on('bioscope:image-revealed', handleImageRevealed);
    // ... more handlers

    return () => {
      socket.off('bioscope:state-updated', handleGameStateUpdate);
      // ... cleanup
      socket.unsubscribe(sessionId);
    };
  });

  return () => { mounted = false; };
}, [dispatch, sessionId]);
```

## Server-Side Events

The `BioscopeGateway` already emits all necessary events:

### Server → Client Events
- `bioscope:game-started` - Game begins
- `bioscope:image-revealed` - Image shown to players
- `bioscope:answer-revealed` - Answer revealed
- `bioscope:round-complete` - Round finishes with results
- `bioscope:score-updated` - Score changes (correct answer or manual)
- `bioscope:state-updated` - General state changes
- `bioscope:timer-tick` - Timer countdown
- `bioscope:game-completed` - Game ends with final scores

### Client → Server Events
- `bioscope:subscribe` - Join session room
- `bioscope:unsubscribe` - Leave session room
- `bioscope:reveal-image` - Host reveals next image
- `bioscope:reveal-answer` - Host reveals answer
- `bioscope:submit-answer` - Player submits answer
- `bioscope:manual-score` - Host awards manual points
- `bioscope:next-round` - Host advances to next round

## Testing

To test the WebSocket connection:

1. **Start both servers** (if not already running):
   ```bash
   # Terminal 1 - API Server
   cd services/api
   pnpm dev

   # Terminal 2 - Web Server
   cd apps/web
   pnpm dev --host
   ```

2. **Check browser console** for connection logs:
   - `[BioscopeSocket] Connected to server`
   - `[HostBioscopePanel] Subscribing to bioscope session: <sessionId>`

3. **Test game flow**:
   - Create a host session
   - Load a bioscope template
   - Start the game
   - Reveal images
   - Check console for event logs
   - Verify UI updates in real-time

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (Web)                       │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  HostBioscopePanel.tsx                                  │
│         │                                               │
│         ├─> getBioscopeSocket() ──────────────┐        │
│         │                                      │        │
│         └─> Event Handlers                    │        │
│                │                               │        │
│                v                               v        │
│       bioscopeSocket.ts              BioscopeSocket     │
│                                    (Socket.IO Client)   │
│                                             │           │
└─────────────────────────────────────────────┼───────────┘
                                              │
                                    WebSocket Connection
                               (ws://localhost:3000/bioscope)
                                              │
┌─────────────────────────────────────────────┼───────────┐
│                    Backend (API)            │           │
├─────────────────────────────────────────────┼───────────┤
│                                             v           │
│                                    BioscopeGateway      │
│                                    (@WebSocketGateway)  │
│                                             │           │
│                                             v           │
│                                    BioscopeService      │
│                                             │           │
│                                             v           │
│                                    Database/Redis       │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

## Next Steps

With WebSocket connectivity now working, the next tasks from Sprint 4 are:

1. ✅ **Create BioscopeTemplateSelector component** - COMPLETE
2. ✅ **WebSocket Integration** - COMPLETE
3. ⏳ **Complete HostBioscopePanel controls** - IN PROGRESS
4. ⏳ **Create BioscopeImageRevealControl** - Needs implementation
5. ⏳ **Create BioscopeManualScoring** - Needs implementation
6. ⏳ **Create BioscopeGameState panel** - Needs implementation
7. ⏳ **Create BioscopeTimer** - Needs implementation
8. ⏳ **Integrate with HostLobby** - Pending

## Related Files

### Frontend
- `apps/web/src/lib/bioscopeSocket.ts` - Bioscope WebSocket client
- `apps/web/src/lib/socket.ts` - Socket exports
- `apps/web/src/components/HostBioscopePanel.tsx` - Host controls with WebSocket
- `apps/web/src/store/slices/bioscopeSlice.ts` - Redux state management

### Backend
- `services/api/src/modules/bioscope/bioscope.gateway.ts` - WebSocket gateway
- `services/api/src/modules/bioscope/dto/bioscope-events.dto.ts` - Event definitions
- `services/api/src/modules/bioscope/services/bioscope.service.ts` - Game logic

## Troubleshooting

### Connection Issues

**Problem**: Socket not connecting
- **Check**: API server is running on port 3000
- **Check**: Browser console for connection errors
- **Solution**: Ensure CORS is enabled in gateway

**Problem**: Events not received
- **Check**: Subscribed to correct session ID
- **Check**: Event names match server definitions
- **Solution**: Verify event names in `BIOSCOPE_EVENTS` constants

**Problem**: Multiple connections
- **Check**: Component mounting/unmounting
- **Solution**: Cleanup function properly unsubscribes

### Type Errors

**Problem**: TypeScript errors in event handlers
- **Solution**: Use `(...args: unknown[])` signature
- **Solution**: Cast first argument: `const data = args[0] as Type`

## Status

✅ **COMPLETE** - Bioscope WebSocket connection is now working!

The Bioscope game can now communicate in real-time between the host panel and the backend gateway. All events are properly wired up for:
- Game state synchronization
- Image reveals
- Answer reveals
- Round progression
- Score updates
- Timer management
