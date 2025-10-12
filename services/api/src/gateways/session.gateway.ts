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
    this.server.to(this.room(sessionId)).emit('session:update', snapshot);
  }

  private room(sessionId: string) {
    return `session:${sessionId}`;
  }
}
