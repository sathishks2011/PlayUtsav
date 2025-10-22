import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { SessionScoringService } from './scoring/session-scoring.service';

@Injectable()
export class SessionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sessionScoringService: SessionScoringService,
  ) {}

  list() {
    return this.prisma.session.findMany({
      where: {
        deletedAt: null, // Only return non-deleted sessions
      },
      include: {
        teams: { include: { participants: true } },
        participants: true,
        scores: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  getSnapshot(sessionId: string) {
    return this.prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        teams: { include: { participants: true } },
        participants: true,
        scores: true,
        bioscopeSession: true,
      },
    });
  }

  async create(input: { hostName?: string; maxPlayers?: number; language?: string; playerEngagementType?: string; hostId?: string }) {
    const code = await this.generateUniqueCode();
    const session = await this.prisma.session.create({
      data: {
        code,
        hostName: input.hostName,
        hostId: input.hostId,
        maxPlayers: input.maxPlayers ?? 6,
        language: input.language ?? 'en',
        playerEngagementType: input.playerEngagementType ?? 'CHOICE_ANSWER',
      } as any,
    });

    if (input.hostName) {
      await this.prisma.participant.create({
        data: {
          displayName: input.hostName,
          role: 'HOST',
          sessionId: session.id,
        },
      });
    }

    if (input.hostId) {
      await this.sessionScoringService.attachConfigToSession({
        sessionId: session.id,
        hostId: input.hostId,
      });
    }

    const snapshot = await this.getSnapshot(session.id);
    return snapshot ?? session;
  }

  async join(code: string, displayName: string) {
    const session = await this.prisma.session.findUnique({ where: { code } });
    if (!session) {
      throw new NotFoundException('Session not found');
    }

    const count = await this.prisma.participant.count({ where: { sessionId: session.id } });
    if (count >= session.maxPlayers) {
      throw new BadRequestException('Session is full');
    }

    const participant = await this.prisma.participant.create({
      data: {
        displayName,
        sessionId: session.id,
      },
    });

    const snapshot = await this.getSnapshot(session.id);

    return { session: snapshot ?? session, participant };
  }

  async addTeam(sessionId: string, name: string, color?: string) {
    return this.prisma.team.create({
      data: { sessionId, name, color },
    });
  }

  async updateStatus(sessionId: string, status: 'LOBBY' | 'ACTIVE' | 'ENDED') {
    return this.prisma.session.update({ where: { id: sessionId }, data: { status } });
  }

  async adjustScore(
    sessionId: string,
    teamId: string,
    delta: number,
    reason?: string,
    gameType?: string,
    gameId?: string
  ) {
    // Find the latest score for this team in this game (or globally if no gameType)
    const where = gameType
      ? { sessionId, teamId, gameType }
      : { sessionId, teamId };

    const latest = await this.prisma.score.findFirst({
      where,
      orderBy: { recordedAt: 'desc' },
    });

    const value = (latest?.value ?? 0) + delta;
    return this.prisma.score.create({
      data: {
        sessionId,
        teamId,
        delta,
        value,
        reason,
        gameType,
        gameId,
      },
    });
  }

  async findParticipant(participantId: string) {
    return this.prisma.participant.findUnique({ where: { id: participantId } });
  }

  async removeParticipant(sessionId: string, participantId: string) {
    // Verify participant exists and belongs to the session
    const participant = await this.prisma.participant.findFirst({
      where: { id: participantId, sessionId },
    });
    
    if (!participant) {
      throw new NotFoundException('Participant not found in this session');
    }

    // Don't allow removing the host
    if (participant.role === 'HOST') {
      throw new BadRequestException('Cannot remove the host');
    }

    // Delete the participant (cascade will handle related records)
    await this.prisma.participant.delete({ where: { id: participantId } });
    
    return { success: true };
  }

  async assignParticipantToTeam(sessionId: string, participantId: string, teamId: string | null) {
    // Verify participant exists and belongs to the session
    const participant = await this.prisma.participant.findFirst({
      where: { id: participantId, sessionId },
    });
    
    if (!participant) {
      throw new NotFoundException('Participant not found in this session');
    }

    // If teamId is provided, verify team exists and belongs to the session
    if (teamId) {
      const team = await this.prisma.team.findFirst({
        where: { id: teamId, sessionId },
      });
      
      if (!team) {
        throw new NotFoundException('Team not found in this session');
      }
    }

    // Update participant's team assignment
    await this.prisma.participant.update({
      where: { id: participantId },
      data: { teamId },
    });
    
    return { success: true };
  }

  async ensureSession(sessionId: string) {
    const session = await this.prisma.session.findUnique({ where: { id: sessionId } });
    if (!session) throw new NotFoundException('Session not found');
    return session;
  }

  async attachQuizTemplate(sessionId: string, templateId: string, hostId: string) {
    // Verify session exists
    const session = await this.ensureSession(sessionId);

    // Verify template exists (allow any host to use any template)
    const template = await this.prisma.quizTemplate.findUnique({
      where: { id: templateId },
    });

    if (!template) {
      throw new NotFoundException('Quiz template not found');
    }

    // Attach template to session and reset round tracking
    return this.prisma.session.update({
      where: { id: sessionId },
      data: {
        quizTemplateId: templateId,
        currentCategoryIndex: 0,
        currentQuestionIndex: 0,
      },
      include: {
        quizTemplate: {
          include: {
            categories: {
              include: {
                questions: {
                  orderBy: { displayOrder: 'asc' },
                },
              },
              orderBy: { displayOrder: 'asc' },
            },
          },
        },
      },
    });
  }

  async updateCurrentRound(sessionId: string, categoryIndex: number, questionIndex: number) {
    // Verify session exists
    await this.ensureSession(sessionId);

    return this.prisma.session.update({
      where: { id: sessionId },
      data: {
        currentCategoryIndex: categoryIndex,
        currentQuestionIndex: questionIndex,
      },
    });
  }

  async getCurrentRoundQuestions(sessionId: string) {
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        quizTemplate: {
          include: {
            categories: {
              include: {
                questions: {
                  orderBy: { displayOrder: 'asc' },
                },
              },
              orderBy: { displayOrder: 'asc' },
            },
          },
        },
      },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    if (!session.quizTemplate) {
      throw new BadRequestException('No quiz template attached to this session');
    }

    const categories = session.quizTemplate.categories;
    if (session.currentCategoryIndex >= categories.length) {
      throw new BadRequestException('Invalid category index');
    }

    const currentCategory = categories[session.currentCategoryIndex];
    return {
      session: {
        id: session.id,
        currentCategoryIndex: session.currentCategoryIndex,
        currentQuestionIndex: session.currentQuestionIndex,
      },
      template: {
        id: session.quizTemplate.id,
        name: session.quizTemplate.name,
      },
      currentCategory: {
        id: currentCategory.id,
        name: currentCategory.name,
        displayOrder: currentCategory.displayOrder,
      },
      questions: currentCategory.questions.map((q) => ({
        ...q,
        options: typeof q.options === 'string' ? JSON.parse(q.options as string) : q.options,
      })),
      totalCategories: categories.length,
    };
  }

  async advanceToNextRound(sessionId: string) {
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        quizTemplate: {
          include: {
            categories: {
              orderBy: { displayOrder: 'asc' },
            },
          },
        },
      },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    if (!session.quizTemplate) {
      throw new BadRequestException('No quiz template attached to this session');
    }

    const totalCategories = session.quizTemplate.categories.length;
    const nextCategoryIndex = session.currentCategoryIndex + 1;

    if (nextCategoryIndex >= totalCategories) {
      throw new BadRequestException('Already at the last round. Quiz complete!');
    }

    // Update session to next category and reset question index
    const updated = await this.prisma.session.update({
      where: { id: sessionId },
      data: {
        currentCategoryIndex: nextCategoryIndex,
        currentQuestionIndex: 0,
      },
    });

    console.log(`[SessionsService] Advanced session ${sessionId} to round ${nextCategoryIndex + 1}`);

    return {
      currentCategoryIndex: updated.currentCategoryIndex,
      currentQuestionIndex: updated.currentQuestionIndex,
      totalCategories,
      isComplete: false,
    };
  }

  async advanceToPreviousRound(sessionId: string) {
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        quizTemplate: {
          include: {
            categories: {
              orderBy: { displayOrder: 'asc' },
            },
          },
        },
      },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    if (!session.quizTemplate) {
      throw new BadRequestException('No quiz template attached to this session');
    }

    const totalCategories = session.quizTemplate.categories.length;
    const prevCategoryIndex = session.currentCategoryIndex - 1;

    if (prevCategoryIndex < 0) {
      throw new BadRequestException('Already at the first round.');
    }

    // Update session to previous category and reset question index
    const updated = await this.prisma.session.update({
      where: { id: sessionId },
      data: {
        currentCategoryIndex: prevCategoryIndex,
        currentQuestionIndex: 0,
      },
    });

    console.log(`[SessionsService] Moved session ${sessionId} back to round ${prevCategoryIndex + 1}`);

    return {
      currentCategoryIndex: updated.currentCategoryIndex,
      currentQuestionIndex: updated.currentQuestionIndex,
      totalCategories,
      isComplete: false,
    };
  }

  async deleteSession(sessionId: string) {
    // Check if session exists
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    // Check if already soft-deleted
    if (session.deletedAt) {
      throw new BadRequestException('Session is already deleted');
    }

    // Soft delete: Set deletedAt timestamp instead of actually deleting
    await this.prisma.session.update({
      where: { id: sessionId },
      data: {
        deletedAt: new Date(),
      },
    });

    console.log(`[SessionsService] Soft-deleted session ${sessionId}`);

    return { success: true, message: 'Session deleted successfully' };
  }

  async restoreSession(sessionId: string) {
    // Check if session exists
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    // Check if session is actually deleted
    if (!session.deletedAt) {
      throw new BadRequestException('Session is not deleted');
    }

    // Restore: Clear deletedAt timestamp
    await this.prisma.session.update({
      where: { id: sessionId },
      data: {
        deletedAt: null,
      },
    });

    console.log(`[SessionsService] Restored session ${sessionId}`);

    return { success: true, message: 'Session restored successfully' };
  }

  async listDeletedSessions() {
    return this.prisma.session.findMany({
      where: {
        deletedAt: { not: null }, // Only return deleted sessions
      },
      include: {
        teams: { include: { participants: true } },
        participants: true,
        scores: true,
      },
      orderBy: { deletedAt: 'desc' },
    });
  }

  private async generateUniqueCode() {
    const makeCode = () => Math.random().toString(36).slice(2, 6).toUpperCase();
    let code = makeCode();
    // loop until unique (unlikely to loop often)
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const exists = await this.prisma.session.findUnique({ where: { code } });
      if (!exists) return code;
      code = makeCode();
    }
  }
}
