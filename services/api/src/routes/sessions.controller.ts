import { Body, Controller, Get, Param, Post, Put, BadRequestException, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import { SessionsService } from '../services/sessions.service';
import { SessionGateway } from '../gateways/session.gateway';
import { JwtAuthGuard } from '../auth/jwtAuth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';

const CreateSessionDto = z.object({
  hostName: z.string().min(2).max(60).optional(),
  maxPlayers: z.number().int().min(2).max(32).optional(),
  language: z.string().min(2).max(8).optional(),
  playerEngagementType: z.enum(['CHOICE_ANSWER', 'BUZZER', 'VOICE_ANSWER']).optional(),
});

const JoinSessionDto = z.object({ code: z.string().length(4), displayName: z.string().min(2).max(60) });

const CreateTeamDto = z.object({ name: z.string().min(1).max(60), color: z.string().max(12).optional() });

const UpdateStatusDto = z.object({ status: z.enum(['LOBBY', 'ACTIVE', 'ENDED']) });

@Controller('/sessions')
export class SessionsController {
  constructor(private readonly sessions: SessionsService, private readonly gateway: SessionGateway) {}

  @Get()
  list() {
    return this.sessions.list();
  }

  @Get('/:id')
  async getById(@Param('id') id: string) {
    const session = await this.sessions.getSnapshot(id);
    if (!session) {
      throw new BadRequestException('Session not found');
    }
    return session;
  }

  @Post()
  // TODO: Re-enable auth guards after testing
  // @UseGuards(JwtAuthGuard, RolesGuard)
  // @Roles('HOST', 'ADMIN')
  async create(@Body() body: unknown, @CurrentUser() user?: { userId: string; role: string }) {
    const parsed = CreateSessionDto.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.flatten());
    // Use demo host ID for testing if no user is authenticated
    const hostId = user?.userId || 'cmgo33o9g0001dfs0j2ox2q7j';
    const session = await this.sessions.create({ ...parsed.data, hostId });
    await this.gateway.emitSessionUpdate(session.id);
    return session;
  }

  @Post('/join')
  async join(@Body() body: unknown) {
    const parsed = JoinSessionDto.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.flatten());
    const result = await this.sessions.join(parsed.data.code, parsed.data.displayName);
    await this.gateway.emitSessionUpdate(result.session.id);
    return result;
  }

  @Post('/:id/teams')
  // TODO: Re-enable auth guards after testing
  // @UseGuards(JwtAuthGuard, RolesGuard)
  // @Roles('HOST', 'ADMIN')
  async addTeam(@Param('id') id: string, @Body() body: unknown) {
    console.log('[API] addTeam called for session:', id);
    console.log('[API] Request body:', body);
    const parsed = CreateTeamDto.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.flatten());
    const team = await this.sessions.addTeam(id, parsed.data.name, parsed.data.color);
    await this.gateway.emitSessionUpdate(id);
    console.log('[API] Team created successfully:', team);
    return team;
  }

  @Post('/:id/status')
  // TODO: Re-enable auth guards after testing
  // @UseGuards(JwtAuthGuard, RolesGuard)
  // @Roles('HOST', 'ADMIN')
  async updateStatus(@Param('id') id: string, @Body() body: unknown) {
    const parsed = UpdateStatusDto.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.flatten());
    const session = await this.sessions.updateStatus(id, parsed.data.status);
    await this.gateway.emitSessionUpdate(id);
    return session;
  }

  @Post(':id/participants/:participantId/remove')
  // TODO: Re-enable auth guards after testing
  // @UseGuards(JwtAuthGuard, RolesGuard)
  // @Roles('HOST', 'ADMIN')
  async removeParticipant(
    @Param('id') sessionId: string,
    @Param('participantId') participantId: string,
  ) {
    const result = await this.sessions.removeParticipant(sessionId, participantId);
    
    // Emit updated session to all subscribers
    const updatedSession = await this.sessions.getSnapshot(sessionId);
    this.gateway.emitToSession(sessionId, 'participant:removed', { participantId });
    this.gateway.emitSessionUpdate(sessionId);
    
    return result;
  }

  @Post(':id/participants/:participantId/assign')
  // TODO: Re-enable auth guards after testing
  // @UseGuards(JwtAuthGuard, RolesGuard)
  // @Roles('HOST', 'ADMIN')
  async assignParticipantToTeam(
    @Param('id') sessionId: string,
    @Param('participantId') participantId: string,
    @Body('teamId') teamId: string | null,
  ) {
    const result = await this.sessions.assignParticipantToTeam(sessionId, participantId, teamId);
    
    // Emit updated session to all subscribers
    this.gateway.emitSessionUpdate(sessionId);
    
    return result;
  }

  @Get(':id/scores')
  async getScores(@Param('id') sessionId: string) {
    const session = await this.sessions.getSnapshot(sessionId);
    if (!session) {
      throw new BadRequestException('Session not found');
    }

    // Aggregate scores by participant/team
    const scores = session.scores || [];
    const participants = session.participants || [];
    
    // Calculate total score for each participant
    const participantScores = new Map<string, number>();
    const teamScores = new Map<string, number>();
    
    scores.forEach(score => {
      if (score.teamId) {
        const current = teamScores.get(score.teamId) || 0;
        teamScores.set(score.teamId, current + score.value);
      }
    });
    
    // For individual players (not on teams), we need to check if scoring records exist per participant
    // For now, we'll use team-based scoring as that's what the scoring system tracks
    
    const players = participants.map(p => {
      const teamScore = p.teamId ? (teamScores.get(p.teamId) || 0) : 0;
      return {
        id: p.id,
        participantId: p.id,
        name: p.displayName,
        playerName: p.displayName,
        totalScore: teamScore,
        score: teamScore,
        teamId: p.teamId || null,
      };
    });

    return {
      sessionId: session.id,
      players,
      teams: session.teams || [],
    };
  }

  @Post(':id/attach-template')
  // TODO: Re-enable auth guards after testing
  // @UseGuards(JwtAuthGuard, RolesGuard)
  // @Roles('HOST', 'ADMIN')
  async attachQuizTemplate(
    @Param('id') sessionId: string,
    @Body('templateId') templateId: string,
    @CurrentUser() user?: { userId: string; role: string },
  ) {
    if (!templateId) {
      throw new BadRequestException('templateId is required');
    }

    const userId = user?.userId || 'test-host-id';
    console.log(`[attachQuizTemplate] Session: ${sessionId}, Template: ${templateId}, User: ${userId}`);
    
    const session = await this.sessions.attachQuizTemplate(sessionId, templateId, userId);
    
    console.log(`[attachQuizTemplate] Successfully attached template to session`);
    
    // Emit updated session to all subscribers
    this.gateway.emitSessionUpdate(sessionId);
    
    return session;
  }

  @Post(':id/round')
  // TODO: Re-enable auth guards after testing
  // @UseGuards(JwtAuthGuard, RolesGuard)
  // @Roles('HOST', 'ADMIN')
  async updateRound(
    @Param('id') sessionId: string,
    @Body('categoryIndex') categoryIndex: number,
    @Body('questionIndex') questionIndex: number,
  ) {
    if (categoryIndex === undefined || questionIndex === undefined) {
      throw new BadRequestException('categoryIndex and questionIndex are required');
    }

    const session = await this.sessions.updateCurrentRound(sessionId, categoryIndex, questionIndex);
    
    // Emit round update to all subscribers
    this.gateway.emitSessionUpdate(sessionId);
    
    return session;
  }

  @Get(':id/round/questions')
  async getRoundQuestions(@Param('id') sessionId: string) {
    return this.sessions.getCurrentRoundQuestions(sessionId);
  }

  @Put(':id/round/next')
  async advanceToNextRound(@Param('id') sessionId: string) {
    const result = await this.sessions.advanceToNextRound(sessionId);
    
    // Emit round update to all subscribers
    this.gateway.emitSessionUpdate(sessionId);
    
    return result;
  }

  @Put(':id/round/previous')
  async advanceToPreviousRound(@Param('id') sessionId: string) {
    const result = await this.sessions.advanceToPreviousRound(sessionId);
    
    // Emit round update to all subscribers
    this.gateway.emitSessionUpdate(sessionId);
    
    return result;
  }
}
