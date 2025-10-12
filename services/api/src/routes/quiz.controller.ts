import { BadRequestException, Body, Controller, Get, Param, Post } from '@nestjs/common';
import { z } from 'zod';
import { QuizService } from '../services/quiz.service';
import { SessionsService } from '../services/sessions.service';
import { SessionGateway } from '../gateways/session.gateway';

const startSchema = z.object({
  questionId: z.string().min(1),
  prompt: z.string().min(1),
  options: z.array(z.string().min(1)).min(2),
});

const submitSchema = z.object({
  participantId: z.string().min(1),
  answer: z.number().int(),
});

const revealSchema = z.object({
  correctOption: z.number().int().nullable().default(null),
  awards: z
    .array(
      z.object({
        teamId: z.string().min(1),
        delta: z.number().int(),
        reason: z.string().min(1).optional(),
      })
    )
    .optional(),
});

@Controller('/sessions/:sessionId/quiz')
export class QuizController {
  constructor(
    private readonly quiz: QuizService,
    private readonly sessions: SessionsService,
    private readonly gateway: SessionGateway,
  ) {}

  @Post('start')
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
    return quizState;
  }

  @Post('reveal')
  async reveal(@Param('sessionId') sessionId: string, @Body() body: unknown) {
    const parsed = revealSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.flatten());
    if (parsed.data.awards) {
      for (const award of parsed.data.awards) {
        // eslint-disable-next-line no-await-in-loop
        await this.sessions.adjustScore(sessionId, award.teamId, award.delta, award.reason ?? 'quiz-award');
      }
    }
    const quizState = await this.quiz.reveal(sessionId, parsed.data.correctOption ?? null);
    await this.gateway.emitQuizUpdate(sessionId, quizState);
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
}

