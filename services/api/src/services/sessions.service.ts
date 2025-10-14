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

  async adjustScore(sessionId: string, teamId: string, delta: number, reason?: string) {
    const latest = await this.prisma.score.findFirst({
      where: { sessionId, teamId },
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
