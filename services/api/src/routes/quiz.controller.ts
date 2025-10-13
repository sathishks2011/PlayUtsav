import { BadRequestException, Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import { QuizService } from '../services/quiz.service';
import { SessionsService } from '../services/sessions.service';
import { SessionGateway } from '../gateways/session.gateway';
import { JwtAuthGuard } from '../auth/jwtAuth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

const startSchema = z.object({
  questionId: z.string().min(1),
  prompt: z.string().min(1),
  options: z.array(z.string().min(1)).min(2),
  duration: z.number().int().min(5).max(120).optional(),
});

const submitSchema = z.object({
  participantId: z.string().min(1),
  answer: z.number().int(),
});

const revealSchema = z.object({
  correctOption: z.number().int().nullable().default(null),
});

@Controller('/sessions/:sessionId/quiz')
export class QuizController {
  constructor(
    private readonly quiz: QuizService,
    private readonly sessions: SessionsService,
    private readonly gateway: SessionGateway,
  ) {}

  @Post('start')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('HOST', 'ADMIN')
  async start(@Param('sessionId') sessionId: string, @Body() body: unknown) {
    const parsed = startSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.flatten());
    const quizState = await this.quiz.start(sessionId, parsed.data);
    await this.gateway.emitQuizUpdate(sessionId, quizState);
    return quizState;
  }

  @Post('submit')
  async submit(@Param('sessionId') sessionId: string, @Body() body: unknown) {
    const parsed = submitSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.flatten());
    const quizState = await this.quiz.submit(sessionId, parsed.data.participantId, parsed.data.answer);
    await this.gateway.emitQuizUpdate(sessionId, quizState);
    
    // Check if all players have answered (for auto-reveal feature)
    const allAnswered = await this.quiz.checkAllPlayersAnswered(sessionId);
    console.log(`[QuizController] All players answered check for session ${sessionId}:`, allAnswered);
    if (allAnswered) {
      // Emit event to notify frontend that all players have answered
      console.log(`[QuizController] Emitting quiz:all-answered event for session ${sessionId}`);
      await this.gateway.emitToSession(sessionId, 'quiz:all-answered', { sessionId });
    }
    
    return quizState;
  }

  @Post('reveal')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('HOST', 'ADMIN')
  async reveal(@Param('sessionId') sessionId: string, @Body() body: unknown) {
    const parsed = revealSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.flatten());
    
    // The quiz.reveal method now handles scoring automatically via ScoreCalculationService
    const quizState = await this.quiz.reveal(sessionId, parsed.data);
    await this.gateway.emitQuizUpdate(sessionId, quizState);
    
    // TODO: In the future, we could fetch the scoring results from the reveal
    // and emit individual score:animated events for each player's score change
    // For now, we'll just trigger a session update so the frontend can fetch the latest scores
    
    const snapshot = await this.sessions.getSnapshot(sessionId);
    if (snapshot) {
      await this.gateway.emitSessionUpdate(sessionId);
    }
    return quizState;
  }

  @Get()
  getState(@Param('sessionId') sessionId: string) {
    return this.quiz.get(sessionId);
  }

  @Get('all-answered')
  async checkAllAnswered(@Param('sessionId') sessionId: string) {
    const allAnswered = await this.quiz.checkAllPlayersAnswered(sessionId);
    return { allAnswered };
  }
}
