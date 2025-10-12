import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { SessionsService } from './sessions.service';

type QuizState = {
  sessionId: string;
  questionId: string;
  prompt: string;
  options: string[];
  status: 'idle' | 'running' | 'revealed';
  correctOption: number | null;
  answers: Array<{ participantId: string; answer: number; displayName: string }>;
};

@Injectable()
export class QuizService {
  private readonly quizzes = new Map<string, QuizState>();

  constructor(private readonly sessions: SessionsService) {}

  async start(sessionId: string, payload: { questionId: string; prompt: string; options: string[] }) {
    await this.sessions.ensureSession(sessionId);
    if (payload.options.length < 2) {
      throw new BadRequestException('Quiz requires at least two options');
    }

    const state: QuizState = {
      sessionId,
      questionId: payload.questionId,
      prompt: payload.prompt,
      options: payload.options,
      status: 'running',
      correctOption: null,
      answers: [],
    };
    this.quizzes.set(sessionId, state);
    return state;
  }

  async submit(sessionId: string, participantId: string, answer: number) {
    const quiz = this.quizzes.get(sessionId);
    if (!quiz || quiz.status !== 'running') {
      throw new BadRequestException('No active quiz');
    }

    if (answer < 0 || answer >= quiz.options.length) {
      throw new BadRequestException('Answer index out of range');
    }

    const participant = await this.sessions.findParticipant(participantId);
    if (!participant || participant.sessionId !== sessionId) {
      throw new NotFoundException('Participant not found in session');
    }

    const existingIndex = quiz.answers.findIndex((entry) => entry.participantId === participantId);
    const entry = { participantId, answer, displayName: participant.displayName };
    if (existingIndex >= 0) {
      quiz.answers[existingIndex] = entry;
    } else {
      quiz.answers.push(entry);
    }

    return quiz;
  }

  async reveal(sessionId: string, correctOption: number | null) {
    const quiz = this.quizzes.get(sessionId);
    if (!quiz) {
      throw new BadRequestException('No active quiz');
    }
    if (correctOption != null && (correctOption < 0 || correctOption >= quiz.options.length)) {
      throw new BadRequestException('Correct option out of range');
    }
    quiz.status = 'revealed';
    quiz.correctOption = correctOption;
    return quiz;
  }

  get(sessionId: string) {
    return this.quizzes.get(sessionId) ?? null;
  }

  reset(sessionId: string) {
    this.quizzes.delete(sessionId);
  }
}

