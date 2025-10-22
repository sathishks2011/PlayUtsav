import { Injectable, NotFoundException, BadRequestException, ConflictException, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../../../prisma.service';
import { SessionsService } from '../../../services/sessions.service';
import {
  CreateBioscopeTemplateDto,
  UpdateBioscopeTemplateDto,
  BioscopeStateDto,
} from '../dto';
import { SessionGateway } from '../../../gateways/session.gateway';
import { BioscopeGateway } from '../bioscope.gateway';

@Injectable()
export class BioscopeService {
  constructor(
    private prisma: PrismaService,
    private sessionsService: SessionsService,
    private sessionGateway: SessionGateway,
    @Inject(forwardRef(() => BioscopeGateway))
    private bioscopeGateway: BioscopeGateway,
  ) {}

  // Buzzer management removed (reverted schema migration that added buzzerState)

  // ==================== Template Management ====================

  async createTemplate(hostId: string, dto: CreateBioscopeTemplateDto) {
    const template = await this.prisma.bioscopeTemplate.create({
      data: {
        name: dto.name,
        description: dto.description,
        hostId,
        configuration: JSON.stringify(dto.configuration),
        rounds: JSON.stringify(dto.rounds),
        isPublic: dto.isPublic ?? false,
      },
    });

    return this.formatTemplate(template);
  }

  async getTemplates(hostId: string, includePublic = true) {
    const where = includePublic
      ? { OR: [{ hostId }, { isPublic: true }] }
      : { hostId };

    const templates = await this.prisma.bioscopeTemplate.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return templates.map((t) => this.formatTemplate(t));
  }

  async getTemplateById(id: string, hostId?: string) {
    const template = await this.prisma.bioscopeTemplate.findUnique({
      where: { id },
    });

    if (!template) {
      throw new NotFoundException(`Bioscope template with ID ${id} not found`);
    }

    // Check permissions
    if (hostId && template.hostId !== hostId && !template.isPublic) {
      throw new NotFoundException(`Bioscope template with ID ${id} not found`);
    }

    return this.formatTemplate(template);
  }

  async updateTemplate(id: string, hostId: string, dto: UpdateBioscopeTemplateDto) {
    const existing = await this.prisma.bioscopeTemplate.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(`Bioscope template with ID ${id} not found`);
    }

    if (existing.hostId !== hostId) {
      throw new BadRequestException('You can only update your own templates');
    }

    const template = await this.prisma.bioscopeTemplate.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.configuration && { configuration: JSON.stringify(dto.configuration) }),
        ...(dto.rounds && { rounds: JSON.stringify(dto.rounds) }),
        ...(dto.isPublic !== undefined && { isPublic: dto.isPublic }),
      },
    });

    return this.formatTemplate(template);
  }

  async deleteTemplate(id: string, hostId: string) {
    const existing = await this.prisma.bioscopeTemplate.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(`Bioscope template with ID ${id} not found`);
    }

    if (existing.hostId !== hostId) {
      throw new BadRequestException('You can only delete your own templates');
    }

    // Prevent deletion if any bioscope session references this template
    const anySession = await this.prisma.bioscopeSession.findFirst({ where: { templateId: id } });
    if (anySession) {
      throw new ConflictException('Cannot delete template while sessions reference it');
    }

    await this.prisma.bioscopeTemplate.delete({ where: { id } });

    return { success: true, message: 'Template deleted' };
  }

  // ==================== Game Management ====================

  async startGame(sessionId: string, templateId: string) {
    // Check if session exists
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new NotFoundException(`Session with ID ${sessionId} not found`);
    }

    // Check if template exists
    const template = await this.getTemplateById(templateId);

    if (!template.rounds || template.rounds.length === 0) {
      throw new BadRequestException('Template must have at least one round');
    }

    // Check if game already exists
    const existing = await this.prisma.bioscopeSession.findUnique({
      where: { sessionId },
    });

    if (existing && existing.status !== 'idle') {
      throw new ConflictException('Bioscope game already started for this session');
    }

    // If bioscope session exists but is idle, update it to start the game
    if (existing) {
      const bioscopeSession = await this.prisma.bioscopeSession.update({
        where: { sessionId },
        data: {
          templateId,
          currentRoundId: 0,
          currentImageId: 0,
          status: 'active',
          revealedImages: '[]',
          timerDuration: template.configuration.timer_seconds || 30,
        },
      });

      // Get the updated game state
      const gameState = await this.getGameState(sessionId);

      // Emit WebSocket updates to all clients (both session and bioscope namespaces)
      await this.sessionGateway.emitSessionUpdate(sessionId);
      await this.bioscopeGateway.emitGameStarted(sessionId);

      return gameState;
    }

    // Create bioscope session
    const bioscopeSession = await this.prisma.bioscopeSession.create({
      data: {
        sessionId,
        templateId,
        currentRoundId: 0,
        currentImageId: 0,
        status: 'active',
        revealedImages: '[]',
        timerDuration: template.configuration.timer_seconds || 30,
      },
    });

    // Get the updated game state
    const gameState = await this.getGameState(sessionId);

    // Emit WebSocket updates to all clients (both session and bioscope namespaces)
    await this.sessionGateway.emitSessionUpdate(sessionId);
    await this.bioscopeGateway.emitGameStarted(sessionId);

    return gameState;
  }

  async resetGame(sessionId: string) {
    const bioscopeSession = await this.getBioscopeSession(sessionId);

    // Delete all answers for this game
    await this.prisma.bioscopeAnswer.deleteMany({
      where: { bioscopeId: bioscopeSession.id },
    });

    // Reset the bioscope session to idle state
    await this.prisma.bioscopeSession.update({
      where: { id: bioscopeSession.id },
      data: {
        currentRoundId: 0,
        currentImageId: 0,
        status: 'idle',
        revealedImages: '[]',
        timerStartedAt: null,
      },
    });

    // Get the updated game state
    const gameState = await this.getGameState(sessionId);

    // Emit WebSocket updates to all clients (both session and bioscope namespaces)
    await this.sessionGateway.emitSessionUpdate(sessionId);
    this.bioscopeGateway.emitStateUpdate(sessionId, gameState);

    return gameState;
  }

  async revealImage(sessionId: string, imageId?: number) {
    const bioscopeSession = await this.getBioscopeSession(sessionId);
    const template = await this.getTemplateById(bioscopeSession.templateId);

    const currentRound = template.rounds[bioscopeSession.currentRoundId];
    if (!currentRound) {
      throw new BadRequestException('No active round');
    }

    const revealedImages: number[] = JSON.parse(bioscopeSession.revealedImages);
    
    // Determine which image to reveal
    const nextImageId = imageId ?? bioscopeSession.currentImageId + 1;

    if (nextImageId > currentRound.images.length) {
      throw new BadRequestException('All images already revealed');
    }

    if (revealedImages.includes(nextImageId)) {
      throw new BadRequestException(`Image ${nextImageId} already revealed`);
    }

    // Update session
    revealedImages.push(nextImageId);
    await this.prisma.bioscopeSession.update({
      where: { id: bioscopeSession.id },
      data: {
        currentImageId: nextImageId,
        status: 'answering',
        revealedImages: JSON.stringify(revealedImages),
        timerStartedAt: new Date(),
      },
    });

    // Get updated game state
    const gameState = await this.getGameState(sessionId);

    // Emit WebSocket updates
    console.log('[BioscopeService] Emitting image revealed events for session:', sessionId);
    await this.sessionGateway.emitSessionUpdate(sessionId);
    await this.bioscopeGateway.emitImageRevealed(sessionId, gameState);

    return gameState;
  }

  async revealAnswer(sessionId: string) {
    const bioscopeSession = await this.getBioscopeSession(sessionId);
    const template = await this.getTemplateById(bioscopeSession.templateId);

    const currentRound = template.rounds[bioscopeSession.currentRoundId];
    if (!currentRound) {
      throw new BadRequestException('No active round');
    }

    // Update all answers with correct/incorrect status
    const answers = await this.prisma.bioscopeAnswer.findMany({
      where: {
        bioscopeId: bioscopeSession.id,
        roundId: bioscopeSession.currentRoundId,
      },
    });

    for (const answer of answers) {
      if (!answer.isManualScore) {
        const isCorrect = this.checkAnswer(answer.answer, currentRound.answer);
        const points = isCorrect
          ? this.calculatePoints(answer.imageRevealedAt, currentRound, template.configuration)
          : 0;

        await this.prisma.bioscopeAnswer.update({
          where: { id: answer.id },
          data: {
            isCorrect,
            pointsAwarded: points,
          },
        });
      }
    }

    // Update session status
    await this.prisma.bioscopeSession.update({
      where: { id: bioscopeSession.id },
      data: {
        status: 'revealed',
      },
    });

    // Get updated game state
    const gameState = await this.getGameState(sessionId);

    // Emit WebSocket updates
    console.log('[BioscopeService] Emitting answer revealed events for session:', sessionId);
    await this.sessionGateway.emitSessionUpdate(sessionId);
    await this.bioscopeGateway.emitAnswerRevealed(sessionId, gameState);

    return gameState;
  }

  async submitAnswer(
    sessionId: string,
    participantId: string,
    participantName: string,
    answer: string,
  ) {
    const bioscopeSession = await this.getBioscopeSession(sessionId);

    if (bioscopeSession.status !== 'answering') {
      throw new BadRequestException('Not currently accepting answers');
    }

    // Check if participant already answered this round
    const existing = await this.prisma.bioscopeAnswer.findUnique({
      where: {
        bioscopeId_participantId_roundId: {
          bioscopeId: bioscopeSession.id,
          participantId,
          roundId: bioscopeSession.currentRoundId,
        },
      },
    });

    if (existing) {
      throw new ConflictException('You have already submitted an answer for this round');
    }

    // Create answer record
    const answerRecord = await this.prisma.bioscopeAnswer.create({
      data: {
        bioscopeId: bioscopeSession.id,
        participantId,
        participantName,
        roundId: bioscopeSession.currentRoundId,
        answer,
        imageRevealedAt: bioscopeSession.currentImageId,
        isCorrect: false, // Will be updated when answer is revealed
        pointsAwarded: 0,
      },
    });

    return {
      success: true,
      answerId: answerRecord.id,
      message: 'Answer submitted successfully',
    };
  }

  async manualScore(
    sessionId: string,
    participantId: string,
    participantName: string,
    points: number,
    reason?: string,
  ) {
    const bioscopeSession = await this.getBioscopeSession(sessionId);

    // Get participant to find their team
    const participant = await this.prisma.participant.findUnique({
      where: { id: participantId },
      include: { team: true },
    });

    if (!participant) {
      throw new NotFoundException('Participant not found');
    }

    // Check if participant already has a manual score for this round
    const existing = await this.prisma.bioscopeAnswer.findUnique({
      where: {
        bioscopeId_participantId_roundId: {
          bioscopeId: bioscopeSession.id,
          participantId,
          roundId: bioscopeSession.currentRoundId,
        },
      },
    });

    if (existing) {
      // Calculate the difference for score adjustment
      const previousPoints = existing.pointsAwarded || 0;
      const pointsDelta = points - previousPoints;

      // Update existing answer with manual score
      await this.prisma.bioscopeAnswer.update({
        where: { id: existing.id },
        data: {
          pointsAwarded: points,
          isCorrect: points > 0,
          isManualScore: true,
        },
      });

      // Adjust the score by the difference
      if (pointsDelta !== 0 && participant.teamId) {
        await this.sessionsService.adjustScore(
          sessionId,
          participant.teamId,
          pointsDelta,
          reason || 'Bioscope manual score adjustment',
        );
      }
    } else {
      // Create new answer record with manual score
      await this.prisma.bioscopeAnswer.create({
        data: {
          bioscopeId: bioscopeSession.id,
          participantId,
          participantName,
          roundId: bioscopeSession.currentRoundId,
          answer: reason || 'Voice answer',
          imageRevealedAt: bioscopeSession.currentImageId,
          isCorrect: points > 0,
          pointsAwarded: points,
          isManualScore: true,
        },
      });

      // Add score to the team
      if (participant.teamId) {
        await this.sessionsService.adjustScore(
          sessionId,
          participant.teamId,
          points,
          reason || 'Bioscope manual score',
        );
      }
    }

    // Get updated game state and emit WebSocket update
    const gameState = await this.getGameState(sessionId);
    this.bioscopeGateway.emitStateUpdate(sessionId, gameState);

    return {
      success: true,
      participantId,
      points,
      message: 'Manual score awarded successfully',
    };
  }

  async nextRound(sessionId: string) {
    const bioscopeSession = await this.getBioscopeSession(sessionId);
    const template = await this.getTemplateById(bioscopeSession.templateId);

    const nextRoundId = bioscopeSession.currentRoundId + 1;

    if (nextRoundId >= template.rounds.length) {
      // Game completed
      await this.prisma.bioscopeSession.update({
        where: { id: bioscopeSession.id },
        data: {
          status: 'completed',
        },
      });

      // Get updated game state
      const gameState = await this.getGameState(sessionId);

      // Emit WebSocket updates
      await this.sessionGateway.emitSessionUpdate(sessionId);
      await this.bioscopeGateway.emitGameCompleted(sessionId);

      return {
        success: true,
        completed: true,
        message: 'Game completed',
      };
    }

    // Move to next round
    await this.prisma.bioscopeSession.update({
      where: { id: bioscopeSession.id },
      data: {
        currentRoundId: nextRoundId,
        currentImageId: 0,
        status: 'idle',
        revealedImages: '[]',
        timerStartedAt: null,
      },
    });

    // Get updated game state
    const gameState = await this.getGameState(sessionId);

    // Emit WebSocket updates
    await this.sessionGateway.emitSessionUpdate(sessionId);
    this.bioscopeGateway.emitStateUpdate(sessionId, gameState);

    return gameState;
  }

  async getGameState(sessionId: string): Promise<BioscopeStateDto> {
    const bioscopeSession = await this.getBioscopeSession(sessionId);
    const template = await this.getTemplateById(bioscopeSession.templateId);
    const currentRound = template.rounds[bioscopeSession.currentRoundId] || null;
    const revealedImages: number[] = JSON.parse(bioscopeSession.revealedImages);

    // Get answers for current round
    const answers = await this.prisma.bioscopeAnswer.findMany({
      where: {
        bioscopeId: bioscopeSession.id,
        roundId: bioscopeSession.currentRoundId,
      },
      orderBy: { submittedAt: 'asc' },
    });

    // Calculate time remaining
    let timeRemaining: number | null = null;
    if (bioscopeSession.timerStartedAt) {
      const elapsed = Math.floor((Date.now() - bioscopeSession.timerStartedAt.getTime()) / 1000);
      timeRemaining = Math.max(0, bioscopeSession.timerDuration - elapsed);
    }

    return {
      bioscopeId: bioscopeSession.id,
      sessionId: bioscopeSession.sessionId,
      templateId: bioscopeSession.templateId,
      currentRoundId: bioscopeSession.currentRoundId,
      currentImageId: bioscopeSession.currentImageId,
      status: bioscopeSession.status as any,
      revealedImages,
      timerStartedAt: bioscopeSession.timerStartedAt,
      timerDuration: bioscopeSession.timerDuration,
      timeRemaining,
      template: {
        name: template.name,
        configuration: template.configuration,
        currentRound,
      },
      answers: answers.map((a) => ({
        participantId: a.participantId,
        participantName: a.participantName,
        answer: a.answer,
        isCorrect: a.isCorrect,
        pointsAwarded: a.pointsAwarded,
        submittedAt: a.submittedAt,
        imageRevealedAt: a.imageRevealedAt,
      })),
    };
  }

  // ==================== Helper Methods ====================

  private async getBioscopeSession(sessionId: string) {
    const bioscopeSession = await this.prisma.bioscopeSession.findUnique({
      where: { sessionId },
    });

    if (!bioscopeSession) {
      throw new NotFoundException('Bioscope game not found for this session');
    }

    return bioscopeSession;
  }

  private formatTemplate(template: any) {
    // Defensive parsing: templates in the DB may have malformed JSON (dev data).
    // Avoid throwing on parse errors and return sensible defaults so the
    // templates endpoint doesn't return 500 for the whole list.
    let configuration: any = {};
    let rounds: any[] = [];

    try {
      configuration = template.configuration ? JSON.parse(template.configuration) : {};
    } catch (err) {
      // Log a warning server-side and fall back to an empty configuration
      // so clients can still load the template listing.
      // eslint-disable-next-line no-console
      console.warn('[BioscopeService] Failed to parse template.configuration for template', template.id, (err as any)?.message || err);
      configuration = {};
    }

    try {
      rounds = template.rounds ? JSON.parse(template.rounds) : [];
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('[BioscopeService] Failed to parse template.rounds for template', template.id, (err as any)?.message || err);
      rounds = [];
    }

    return {
      ...template,
      configuration,
      rounds,
    };
  }

  private checkAnswer(userAnswer: string, correctAnswer: any): boolean {
    const normalize = (str: string) => str.toLowerCase().trim();
    const normalizedUser = normalize(userAnswer);
    const normalizedCorrect = normalize(correctAnswer.title);

    // Check main answer
    if (normalizedUser === normalizedCorrect) {
      return true;
    }

    // Check alternatives
    if (correctAnswer.alternatives) {
      return correctAnswer.alternatives.some(
        (alt: string) => normalize(alt) === normalizedUser,
      );
    }

    return false;
  }

  private calculatePoints(
    imageRevealedAt: number,
    round: any,
    configuration: any,
  ): number {
    const scoring = round.scoring || {};
    const basePoints = scoring.base_points || 100;
    const earlyBonus = scoring.early_bonus || 20;
    const finalImagePoints = scoring.final_image_points || 50;

    const totalImages = round.images.length;

    // If guessed on last image, give final image points
    if (imageRevealedAt >= totalImages) {
      return finalImagePoints;
    }

    // Calculate bonus based on which image
    const bonusMultiplier = Math.max(0, (totalImages - imageRevealedAt) / totalImages);
    const bonus = Math.floor(earlyBonus * bonusMultiplier);

    return basePoints + bonus;
  }
}
