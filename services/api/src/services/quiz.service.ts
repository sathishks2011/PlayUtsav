import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { SessionsService } from './sessions.service';

type QuizState = {
  sessionId: string;
  questionId: string;
  prompt: string;
  options: string[];
  status: 'running' | 'revealed';
  correctOption: number | null;
  duration: number;
  createdAt: string;
  answers: Array<{ participantId: string; answer: number; displayName: string }>;
};

@Injectable()
export class QuizService {
  constructor(private readonly prisma: PrismaService, private readonly sessions: SessionsService) {}

  private toState(round: {
    id: string;
    sessionId: string;
    questionId: string;
    prompt: string;
    status: string;
    correctOption: number | null;
    duration: number;
    createdAt: Date;
    options: { index: number; text: string }[];
    answers: { participantId: string; answer: number; displayName: string }[];
  }): QuizState {
    const normalizedStatus: QuizState['status'] = round.status === 'revealed' ? 'revealed' : 'running';

    return {
      sessionId: round.sessionId,
      questionId: round.questionId,
      prompt: round.prompt,
      options: round.options
        .sort((a, b) => a.index - b.index)
        .map((option) => option.text),
      status: normalizedStatus,
      correctOption: round.correctOption,
      duration: round.duration,
      createdAt: round.createdAt.toISOString(),
      answers: round.answers.map((answer) => ({
        participantId: answer.participantId,
        answer: answer.answer,
        displayName: answer.displayName,
      })),
    };
  }

  private async fetchActiveRound(sessionId: string) {
    const round = await this.prisma.quizRound.findFirst({
      where: { sessionId },
      orderBy: { createdAt: 'desc' },
      include: { options: true, answers: true },
    });
    return round ? this.toState(round) : null;
  }

  async start(
    sessionId: string,
    payload: { questionId: string; prompt: string; options: string[]; duration?: number }
  ) {
    await this.sessions.ensureSession(sessionId);
    if (payload.options.length < 2) {
      throw new BadRequestException('Quiz requires at least two options');
    }

    await this.prisma.quizRound.updateMany({
      where: { sessionId, status: 'running' },
      data: { status: 'archived' },
    });

    const round = await this.prisma.quizRound.create({
      data: {
        sessionId,
        questionId: payload.questionId,
        prompt: payload.prompt,
        duration: payload.duration ?? 30,
        options: {
          create: payload.options.map((text, index) => ({ index, text })),
        },
      },
      include: { options: true, answers: true },
    });

    return this.toState(round);
  }

  async submit(sessionId: string, participantId: string, answer: number) {
    const round = await this.prisma.quizRound.findFirst({
      where: { sessionId, status: { in: ['running', 'revealed'] } },
      orderBy: { createdAt: 'desc' },
      include: { options: true },
    });
    if (!round) throw new BadRequestException('No active quiz');
    if (round.status !== 'running') throw new BadRequestException('Quiz already revealed');
    if (answer < 0 || answer >= round.options.length) throw new BadRequestException('Answer index out of range');

    const participant = await this.sessions.findParticipant(participantId);
    if (!participant || participant.sessionId !== sessionId) {
      throw new NotFoundException('Participant not found in session');
    }

    await this.prisma.quizAnswer.upsert({
      where: { quizRoundId_participantId: { quizRoundId: round.id, participantId } },
      create: {
        quizRoundId: round.id,
        participantId,
        answer,
        displayName: participant.displayName,
      },
      update: {
        answer,
        displayName: participant.displayName,
      },
    });

    return this.fetchActiveRound(sessionId);
  }

  /**
   * Check if all players in the session have answered the current quiz
   */
  async checkAllPlayersAnswered(sessionId: string): Promise<boolean> {
    const round = await this.prisma.quizRound.findFirst({
      where: { sessionId, status: 'running' },
      orderBy: { createdAt: 'desc' },
      include: { answers: true },
    });
    
    if (!round) {
      console.log(`[QuizService] No running quiz round found for session ${sessionId}`);
      return false;
    }

    // Get all PLAYER participants in the session (exclude HOST who doesn't answer)
    const participants = await this.prisma.participant.findMany({
      where: { 
        sessionId,
        role: 'PLAYER'
      },
    });

    // Check if all participants have submitted answers
    const answeredParticipantIds = new Set(round.answers.map((a: { participantId: string }) => a.participantId));
    const allAnswered = participants.every((p) => answeredParticipantIds.has(p.id));
    
    console.log(`[QuizService] Session ${sessionId}: ${participants.length} participants, ${round.answers.length} answers, all answered: ${allAnswered}`);
    console.log(`[QuizService] Participants:`, participants.map(p => ({ id: p.id, name: p.displayName })));
    console.log(`[QuizService] Answered IDs:`, Array.from(answeredParticipantIds));
    
    return allAnswered;
  }

  async reveal(
    sessionId: string,
    payload: { correctOption: number | null; awards?: { teamId: string; delta: number; reason?: string }[] }
  ) {
    const round = await this.prisma.quizRound.findFirst({
      where: { sessionId, status: { in: ['running', 'revealed'] } },
      orderBy: { createdAt: 'desc' },
      include: { options: true },
    });
    if (!round) throw new BadRequestException('No active quiz');

    if (
      payload.correctOption != null &&
      (payload.correctOption < 0 || payload.correctOption >= round.options.length)
    ) {
      throw new BadRequestException('Correct option out of range');
    }

    await this.prisma.quizRound.update({
      where: { id: round.id },
      data: {
        status: 'revealed',
        correctOption: payload.correctOption,
      },
    });

    if (payload.awards) {
      for (const award of payload.awards) {
        // eslint-disable-next-line no-await-in-loop
        await this.sessions.adjustScore(sessionId, award.teamId, award.delta, award.reason ?? 'quiz-award');
      }
    }

    return this.fetchActiveRound(sessionId);
  }

  async get(sessionId: string) {
    return this.fetchActiveRound(sessionId);
  }
}
