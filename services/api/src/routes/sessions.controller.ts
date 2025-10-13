import { Body, Controller, Get, Param, Post, BadRequestException, UseGuards } from '@nestjs/common';
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
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('HOST', 'ADMIN')
  async create(@Body() body: unknown, @CurrentUser() user: { userId: string; role: string }) {
    const parsed = CreateSessionDto.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.flatten());
    const session = await this.sessions.create({ ...parsed.data, hostId: user.userId });
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
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('HOST', 'ADMIN')
  async addTeam(@Param('id') id: string, @Body() body: unknown) {
    const parsed = CreateTeamDto.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.flatten());
    const team = await this.sessions.addTeam(id, parsed.data.name, parsed.data.color);
    await this.gateway.emitSessionUpdate(id);
    return team;
  }

  @Post('/:id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('HOST', 'ADMIN')
  async updateStatus(@Param('id') id: string, @Body() body: unknown) {
    const parsed = UpdateStatusDto.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.flatten());
    const session = await this.sessions.updateStatus(id, parsed.data.status);
    await this.gateway.emitSessionUpdate(id);
    return session;
  }

  @Post(':id/participants/:participantId/remove')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('HOST', 'ADMIN')
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
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('HOST', 'ADMIN')
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
}
