import { Logger } from '@nestjs/common';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';
import { BioscopeService } from './services';
import {
  BIOSCOPE_EVENTS,
  RevealImagePayload,
  RevealAnswerPayload,
  SubmitAnswerPayload,
  ManualScorePayload,
  NextRoundPayload,
  BioscopeGameStartedEvent,
  BioscopeImageRevealedEvent,
  BioscopeAnswerRevealedEvent,
  BioscopeRoundCompleteEvent,
  BioscopeScoreUpdatedEvent,
  BioscopeStateUpdatedEvent,
  BioscopeTimerTickEvent,
  BioscopeGameCompletedEvent,
} from './dto';

@WebSocketGateway({ cors: { origin: '*' }, namespace: '/bioscope' })
export class BioscopeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server!: Server;

  private readonly logger = new Logger(BioscopeGateway.name);
  private timerIntervals = new Map<string, NodeJS.Timeout>();

  constructor(private readonly bioscopeService: BioscopeService) {}

  handleConnection(client: Socket) {
    this.logger.log(`[BioscopeGateway] Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`[BioscopeGateway] Client disconnected: ${client.id}`);
  }

  // ==================== Subscribe/Unsubscribe ====================

  @SubscribeMessage('bioscope:subscribe')
  async handleSubscribe(client: Socket, payload: { sessionId: string }) {
    if (!payload?.sessionId) return;
    
    const room = this.room(payload.sessionId);
    client.join(room);
    this.logger.log(`[BioscopeGateway] Client ${client.id} subscribed to ${room}`);

    try {
      const state = await this.bioscopeService.getGameState(payload.sessionId);
      client.emit(BIOSCOPE_EVENTS.STATE_UPDATED, this.buildStateEvent(state));
    } catch (error) {
      this.logger.error(`[BioscopeGateway] Error sending initial state:`, error);
    }
  }

  @SubscribeMessage('bioscope:unsubscribe')
  handleUnsubscribe(client: Socket, payload: { sessionId: string }) {
    if (!payload?.sessionId) return;
    
    const room = this.room(payload.sessionId);
    client.leave(room);
    this.logger.log(`[BioscopeGateway] Client ${client.id} unsubscribed from ${room}`);
  }

  // ==================== Game Actions (Client -> Server) ====================

  @SubscribeMessage(BIOSCOPE_EVENTS.REVEAL_IMAGE)
  async handleRevealImage(client: Socket, payload: RevealImagePayload) {
    try {
      const state = await this.bioscopeService.revealImage(
        payload.sessionId,
        payload.imageId,
      );

      // Emit image revealed event
      await this.emitImageRevealed(payload.sessionId, state);

      // Start timer if enabled
      if (state.template.configuration.timer_sound_enabled) {
        this.startTimer(payload.sessionId, state.timerDuration);
      }
    } catch (error: any) {
      this.logger.error(`[BioscopeGateway] Error revealing image:`, error);
      client.emit('bioscope:error', { message: error.message });
    }
  }

  @SubscribeMessage(BIOSCOPE_EVENTS.REVEAL_ANSWER)
  async handleRevealAnswer(client: Socket, payload: RevealAnswerPayload) {
    try {
      const state = await this.bioscopeService.revealAnswer(payload.sessionId);

      // Stop timer
      this.stopTimer(payload.sessionId);

      // Emit answer revealed event
      await this.emitAnswerRevealed(payload.sessionId, state);
      
      // Emit round complete event
      await this.emitRoundComplete(payload.sessionId, state);
    } catch (error: any) {
      this.logger.error(`[BioscopeGateway] Error revealing answer:`, error);
      client.emit('bioscope:error', { message: error.message });
    }
  }

  @SubscribeMessage(BIOSCOPE_EVENTS.SUBMIT_ANSWER)
  async handleSubmitAnswer(client: Socket, payload: SubmitAnswerPayload) {
    try {
      const result = await this.bioscopeService.submitAnswer(
        payload.sessionId,
        payload.participantId,
        payload.participantName,
        payload.answer,
      );

      // Confirm submission to client
      client.emit('bioscope:answer-submitted', {
        success: true,
        answerId: result.answerId,
      });

      // Update game state for all clients
      const state = await this.bioscopeService.getGameState(payload.sessionId);
      this.emitStateUpdate(payload.sessionId, state);
    } catch (error: any) {
      this.logger.error(`[BioscopeGateway] Error submitting answer:`, error);
      client.emit('bioscope:error', { message: error.message });
    }
  }

  @SubscribeMessage(BIOSCOPE_EVENTS.MANUAL_SCORE)
  async handleManualScore(client: Socket, payload: ManualScorePayload) {
    try {
      await this.bioscopeService.manualScore(
        payload.sessionId,
        payload.participantId,
        payload.participantName,
        payload.points,
        payload.reason,
      );

      // Emit score update event
      this.emitScoreUpdate(payload.sessionId, {
        participantId: payload.participantId,
        participantName: payload.participantName,
        points: payload.points,
        reason: 'manual_score',
      });

      // Update game state
      const state = await this.bioscopeService.getGameState(payload.sessionId);
      this.emitStateUpdate(payload.sessionId, state);
    } catch (error: any) {
      this.logger.error(`[BioscopeGateway] Error awarding manual score:`, error);
      client.emit('bioscope:error', { message: error.message });
    }
  }

  @SubscribeMessage(BIOSCOPE_EVENTS.NEXT_ROUND)
  async handleNextRound(client: Socket, payload: NextRoundPayload) {
    try {
      const result = await this.bioscopeService.nextRound(payload.sessionId);

      if (result.completed) {
        // Game completed
        await this.emitGameCompleted(payload.sessionId);
      } else {
        // Move to next round
        const state = await this.bioscopeService.getGameState(payload.sessionId);
        this.emitStateUpdate(payload.sessionId, state);
      }
    } catch (error: any) {
      this.logger.error(`[BioscopeGateway] Error moving to next round:`, error);
      client.emit('bioscope:error', { message: error.message });
    }
  }

  // ==================== Server -> Client Emissions ====================

  async emitGameStarted(sessionId: string) {
    try {
      const state = await this.bioscopeService.getGameState(sessionId);
      const currentRound = state.template.currentRound;

      const event: BioscopeGameStartedEvent = {
        bioscopeId: state.bioscopeId,
        sessionId: state.sessionId,
        templateName: state.template.name,
        round: {
          roundId: currentRound.round_id,
          title: currentRound.title,
          totalImages: currentRound.images.length,
        },
        configuration: {
          timerSeconds: state.template.configuration.timer_seconds || 30,
          timerSoundEnabled: state.template.configuration.timer_sound_enabled || false,
          allowManualScoring: state.template.configuration.allow_manual_scoring || false,
        },
      };

      this.server.to(this.room(sessionId)).emit(BIOSCOPE_EVENTS.GAME_STARTED, event);
      this.logger.log(`[BioscopeGateway] Emitted game-started for session: ${sessionId}`);
    } catch (error) {
      this.logger.error(`[BioscopeGateway] Error emitting game started:`, error);
    }
  }

  async emitImageRevealed(sessionId: string, state: any) {
    try {
      const currentRound = state.template.currentRound;
      const currentImage = currentRound.images[state.currentImageId - 1];

      const event: BioscopeImageRevealedEvent = {
        bioscopeId: state.bioscopeId,
        sessionId: state.sessionId,
        roundId: currentRound.round_id,
        imageId: state.currentImageId,
        imageUrl: currentImage.file,
        hint: currentImage.hint,
        revealedImages: state.revealedImages,
        totalImages: currentRound.images.length,
        timerStartedAt: state.timerStartedAt,
        timerDuration: state.timerDuration,
      };

      this.server.to(this.room(sessionId)).emit(BIOSCOPE_EVENTS.IMAGE_REVEALED, event);
      this.logger.log(`[BioscopeGateway] Emitted image-revealed for session: ${sessionId}`);
    } catch (error) {
      this.logger.error(`[BioscopeGateway] Error emitting image revealed:`, error);
    }
  }

  async emitAnswerRevealed(sessionId: string, state: any) {
    try {
      const currentRound = state.template.currentRound;
      const correctAnswers = state.answers
        .filter((a: any) => a.isCorrect)
        .map((a: any) => ({
          participantId: a.participantId,
          participantName: a.participantName,
          pointsAwarded: a.pointsAwarded,
          imageRevealedAt: a.imageRevealedAt,
        }));

      const event: BioscopeAnswerRevealedEvent = {
        bioscopeId: state.bioscopeId,
        sessionId: state.sessionId,
        roundId: currentRound.round_id,
        answer: {
          title: currentRound.answer.title,
          alternatives: currentRound.answer.alternatives,
        },
        correctAnswers,
        allImages: currentRound.images.map((img: any) => img.file),
      };

      this.server.to(this.room(sessionId)).emit(BIOSCOPE_EVENTS.ANSWER_REVEALED, event);
      this.logger.log(`[BioscopeGateway] Emitted answer-revealed for session: ${sessionId}`);
    } catch (error) {
      this.logger.error(`[BioscopeGateway] Error emitting answer revealed:`, error);
    }
  }

  async emitRoundComplete(sessionId: string, state: any) {
    try {
      const currentRound = state.template.currentRound;

      const event: BioscopeRoundCompleteEvent = {
        bioscopeId: state.bioscopeId,
        sessionId: state.sessionId,
        roundId: currentRound.round_id,
        roundTitle: currentRound.title,
        correctAnswer: currentRound.answer.title,
        results: state.answers.map((a: any) => ({
          participantId: a.participantId,
          participantName: a.participantName,
          answer: a.answer,
          isCorrect: a.isCorrect,
          pointsAwarded: a.pointsAwarded,
          imageRevealedAt: a.imageRevealedAt,
        })),
        hasNextRound: state.currentRoundId < state.template.configuration.max_rounds - 1,
      };

      this.server.to(this.room(sessionId)).emit(BIOSCOPE_EVENTS.ROUND_COMPLETE, event);
      this.logger.log(`[BioscopeGateway] Emitted round-complete for session: ${sessionId}`);
    } catch (error) {
      this.logger.error(`[BioscopeGateway] Error emitting round complete:`, error);
    }
  }

  emitScoreUpdate(
    sessionId: string,
    data: {
      participantId: string;
      participantName: string;
      points: number;
      reason: 'correct_answer' | 'manual_score';
      imageRevealedAt?: number;
    },
  ) {
    const event: BioscopeScoreUpdatedEvent = {
      bioscopeId: 'unknown', // Will be filled by actual state
      sessionId,
      participantId: data.participantId,
      participantName: data.participantName,
      points: data.points,
      totalScore: 0, // Will be calculated by client
      reason: data.reason,
      imageRevealedAt: data.imageRevealedAt,
    };

    this.server.to(this.room(sessionId)).emit(BIOSCOPE_EVENTS.SCORE_UPDATED, event);
    this.logger.log(`[BioscopeGateway] Emitted score-updated for session: ${sessionId}`);
  }

  emitStateUpdate(sessionId: string, state: any) {
    const event: BioscopeStateUpdatedEvent = this.buildStateEvent(state);
    this.server.to(this.room(sessionId)).emit(BIOSCOPE_EVENTS.STATE_UPDATED, event);
    this.logger.log(`[BioscopeGateway] Emitted state-updated for session: ${sessionId}`);
  }

  async emitGameCompleted(sessionId: string) {
    try {
      const state = await this.bioscopeService.getGameState(sessionId);

      // Calculate final scores
      const scoreMap = new Map<string, { name: string; points: number; correct: number }>();
      
      // This would need to aggregate across all rounds
      // For now, just use current round answers
      state.answers.forEach((answer: any) => {
        const current = scoreMap.get(answer.participantId) || {
          name: answer.participantName,
          points: 0,
          correct: 0,
        };
        current.points += answer.pointsAwarded;
        if (answer.isCorrect) current.correct++;
        scoreMap.set(answer.participantId, current);
      });

      const finalScores = Array.from(scoreMap.entries()).map(([id, data]) => ({
        participantId: id,
        participantName: data.name,
        totalPoints: data.points,
        correctAnswers: data.correct,
        totalRounds: state.currentRoundId + 1,
      }));

      const event: BioscopeGameCompletedEvent = {
        bioscopeId: state.bioscopeId,
        sessionId: state.sessionId,
        finalScores,
      };

      this.server.to(this.room(sessionId)).emit(BIOSCOPE_EVENTS.GAME_COMPLETED, event);
      this.logger.log(`[BioscopeGateway] Emitted game-completed for session: ${sessionId}`);
    } catch (error) {
      this.logger.error(`[BioscopeGateway] Error emitting game completed:`, error);
    }
  }

  // ==================== Timer Management ====================

  private startTimer(sessionId: string, duration: number) {
    // Clear existing timer
    this.stopTimer(sessionId);

    let timeRemaining = duration;

    const interval = setInterval(() => {
      timeRemaining--;

      if (timeRemaining <= 0) {
        this.stopTimer(sessionId);
        // Auto-reveal answer when timer expires
        this.bioscopeService.revealAnswer(sessionId).then((state) => {
          this.emitAnswerRevealed(sessionId, state);
          this.emitRoundComplete(sessionId, state);
        });
      } else {
        // Emit timer tick
        const event: BioscopeTimerTickEvent = {
          bioscopeId: 'unknown',
          sessionId,
          timeRemaining,
          warningThreshold: timeRemaining <= 10,
        };
        this.server.to(this.room(sessionId)).emit(BIOSCOPE_EVENTS.TIMER_TICK, event);
      }
    }, 1000);

    this.timerIntervals.set(sessionId, interval);
    this.logger.log(`[BioscopeGateway] Started timer for session: ${sessionId}`);
  }

  private stopTimer(sessionId: string) {
    const interval = this.timerIntervals.get(sessionId);
    if (interval) {
      clearInterval(interval);
      this.timerIntervals.delete(sessionId);
      this.logger.log(`[BioscopeGateway] Stopped timer for session: ${sessionId}`);
    }
  }

  // ==================== Helper Methods ====================

  private room(sessionId: string): string {
    return `bioscope:${sessionId}`;
  }

  private buildStateEvent(state: any): BioscopeStateUpdatedEvent {
    return {
      bioscopeId: state.bioscopeId,
      sessionId: state.sessionId,
      status: state.status,
      currentRoundId: state.currentRoundId,
      currentImageId: state.currentImageId,
      revealedImages: state.revealedImages,
      timeRemaining: state.timeRemaining,
    };
  }
}
