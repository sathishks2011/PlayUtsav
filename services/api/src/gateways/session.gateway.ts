import { Logger } from '@nestjs/common';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';
import { SessionsService } from '../services/sessions.service';

@WebSocketGateway({ cors: { origin: '*' }, namespace: '/sessions' })
export class SessionGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server!: Server;

  private readonly logger = new Logger(SessionGateway.name);

  constructor(private readonly sessionsService: SessionsService) {}

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('session:subscribe')
  async handleSubscribe(client: Socket, payload: { sessionId: string }) {
    if (!payload?.sessionId) return;
    client.join(this.room(payload.sessionId));
    const snapshot = await this.sessionsService.getSnapshot(payload.sessionId);
    client.emit('session:update', snapshot);
  }

  @SubscribeMessage('session:unsubscribe')
  handleUnsubscribe(client: Socket, payload: { sessionId: string }) {
    if (!payload?.sessionId) return;
    client.leave(this.room(payload.sessionId));
  }

  async emitSessionUpdate(sessionId: string) {
    const snapshot = await this.sessionsService.getSnapshot(sessionId);
    if (!snapshot) return;
    
    const roomName = this.room(sessionId);
    this.logger.log(`[SessionGateway] Emitting session:update to room: ${roomName}`);
    this.logger.log(`[SessionGateway] Snapshot has ${(snapshot as any).scores?.length || 0} score records for ${(snapshot as any).teams?.length || 0} teams`);
    
    this.server.to(roomName).emit('session:update', snapshot);
  }

  async emitQuizUpdate(sessionId: string, state: unknown) {
    const roomName = this.room(sessionId);
    this.logger.log(`[SessionGateway] Emitting quiz:update to room: ${roomName}`);
    this.logger.log(`[SessionGateway] Quiz state:`, JSON.stringify(state, null, 2));
    this.server.to(roomName).emit('quiz:update', state);
  }

  async emitToSession(sessionId: string, event: string, data: unknown) {
    this.server.to(this.room(sessionId)).emit(event, data);
  }

  @SubscribeMessage('session:game-started')
  async handleGameStarted(
    client: Socket,
    payload: { sessionId: string; gameType?: string; activeGameIndex?: number },
  ) {
    if (!payload?.sessionId) return;
    this.logger.log(`[SessionGateway] Received session:game-started from ${client.id}`, payload as any);
    try {
      await this.sessionsService.updateStatus(payload.sessionId, 'ACTIVE');
    } catch (error) {
      this.logger.warn(`[SessionGateway] Unable to update session status to ACTIVE`, error as any);
    }
    this.server.to(this.room(payload.sessionId)).emit('session:game-started', payload);
  }

  @SubscribeMessage('session:game-reset')
  async handleGameReset(client: Socket, payload: { sessionId: string }) {
    if (!payload?.sessionId) return;
    this.logger.log(`[SessionGateway] Received session:game-reset from ${client.id}`, payload as any);
    try {
      await this.sessionsService.updateStatus(payload.sessionId, 'LOBBY');
    } catch (error) {
      this.logger.warn(`[SessionGateway] Unable to update session status to LOBBY`, error as any);
    }
    this.server.to(this.room(payload.sessionId)).emit('session:game-reset', payload);
  }

  // Buzzer Mode Events
  async emitBuzzerOpened(sessionId: string, buzzerState: {
    isOpen: boolean;
    buzzerOpenedAt: string | null;
    timerDuration: number;
  }) {
    const roomName = this.room(sessionId);
    this.logger.log(`[SessionGateway] Emitting buzzer:opened to room: ${roomName}`);
    this.server.to(roomName).emit('buzzer:opened', {
      sessionId,
      buzzerState,
      timestamp: new Date().toISOString(),
    });
  }

  async emitBuzzerPressed(sessionId: string, buzzerPress: {
    participantId: string;
    participantName: string;
    teamId: string | null;
    teamName: string | null;
    teamColor: string | null;
    timestamp: string;
  }, buzzerState: {
    isOpen: boolean;
    buzzPresses: Array<any>;
    firstBuzzerId: string | null;
    lockedForParticipantId: string | null;
  }) {
    const roomName = this.room(sessionId);
    this.logger.log(`[SessionGateway] Emitting buzzer:pressed to room: ${roomName}`);
    this.logger.log(`[SessionGateway] Buzzer press by: ${buzzerPress.participantName} (${buzzerPress.teamName})`);
    this.server.to(roomName).emit('buzzer:pressed', {
      sessionId,
      buzzerPress,
      buzzerState,
      timestamp: new Date().toISOString(),
    });
  }

  async emitBuzzerClosed(sessionId: string, buzzerState: {
    isOpen: boolean;
    lockedForParticipantId: string | null;
  }) {
    const roomName = this.room(sessionId);
    this.logger.log(`[SessionGateway] Emitting buzzer:closed to room: ${roomName}`);
    this.server.to(roomName).emit('buzzer:closed', {
      sessionId,
      buzzerState,
      timestamp: new Date().toISOString(),
    });
  }

  async emitBuzzerReset(sessionId: string) {
    const roomName = this.room(sessionId);
    this.logger.log(`[SessionGateway] Emitting buzzer:reset to room: ${roomName}`);
    this.server.to(roomName).emit('buzzer:reset', {
      sessionId,
      timestamp: new Date().toISOString(),
    });
  }

  async emitBuzzerOverride(sessionId: string, participantId: string, buzzerState: {
    lockedForParticipantId: string | null;
  }) {
    const roomName = this.room(sessionId);
    this.logger.log(`[SessionGateway] Emitting buzzer:override to room: ${roomName}`);
    this.logger.log(`[SessionGateway] Control overridden to participant: ${participantId}`);
    this.server.to(roomName).emit('buzzer:override', {
      sessionId,
      participantId,
      buzzerState,
      timestamp: new Date().toISOString(),
    });
  }

  // Bioscope Buzzer Events
  async emitBioscopeBuzzerOpened(sessionId: string, buzzerState: any) {
    const roomName = this.room(sessionId);
    this.logger.log(`[SessionGateway] Emitting bioscope:buzzer:opened to room: ${roomName}`);
    this.server.to(roomName).emit('bioscope:buzzer:opened', { sessionId, buzzerState, timestamp: new Date().toISOString() });
  }

  async emitBioscopeBuzzerPressed(sessionId: string, pressInfo: any, buzzerState: any) {
    const roomName = this.room(sessionId);
    this.logger.log(`[SessionGateway] Emitting bioscope:buzzer:pressed to room: ${roomName}`);
    this.server.to(roomName).emit('bioscope:buzzer:pressed', { sessionId, pressInfo, buzzerState, timestamp: new Date().toISOString() });
  }

  async emitBioscopeBuzzerClosed(sessionId: string, buzzerState: any) {
    const roomName = this.room(sessionId);
    this.logger.log(`[SessionGateway] Emitting bioscope:buzzer:closed to room: ${roomName}`);
    this.server.to(roomName).emit('bioscope:buzzer:closed', { sessionId, buzzerState, timestamp: new Date().toISOString() });
  }

  async emitBioscopeBuzzerReset(sessionId: string, buzzerState: any) {
    const roomName = this.room(sessionId);
    this.logger.log(`[SessionGateway] Emitting bioscope:buzzer:reset to room: ${roomName}`);
    this.server.to(roomName).emit('bioscope:buzzer:reset', { sessionId, buzzerState, timestamp: new Date().toISOString() });
  }


  async emitScoreAnimated(sessionId: string, payload: {
    teamId: string | null;
    points: number;
    isBonus: boolean;
    reason?: string;
  }) {
    const roomName = this.room(sessionId);
    this.logger.log(`[SessionGateway] Emitting score:animated to room: ${roomName} - points: ${payload.points}, isBonus: ${payload.isBonus}`);
    this.server.to(roomName).emit('score:animated', {
      teamId: payload.teamId,
      points: payload.points,
      isBonus: payload.isBonus,
      timestamp: Date.now(),
      reason: payload.reason,
    });
  }

  private room(sessionId: string) {
    return `session:${sessionId}`;
  }
}
