import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { SessionScoringService } from './session-scoring.service';
import { ScoringContext, ScoringResult } from '@pkg/core';

export interface ScoreAnswerInput {
  sessionId: string;
  playerId: string;
  questionId: string;
  isCorrect: boolean;
  answerTime: number;
  submittedAt?: Date;
  question: {
    basePoints: number;
    timeLimit: number;
    difficulty?: 'easy' | 'medium' | 'hard';
    category?: string;
  };
  playerTotals?: {
    totalAnswers?: number;
    correctAnswers?: number;
  };
  metadata?: Record<string, any>;
}

export interface ScoreAnswerResult {
  result: ScoringResult;
  stats: PlayerScoringStatsRecord;
}

interface PlayerScoringStatsRecord {
  id: string;
  sessionScoringId: string;
  playerId: string;
  totalScore: number;
  currentStreak: number;
  maxStreak: number;
  totalAnswers: number;
  correctAnswers: number;
  incorrectAnswers: number;
  averageAnswerTime: number;
  fastestAnswerTime: number | null;
  lastAnswerCorrect: boolean | null;
  lastAnswerTime: Date | null;
  updatedAt: Date;
}

@Injectable()
export class ScoreCalculationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sessionScoringService: SessionScoringService,
  ) {}

  private get historyStore() {
    return (this.prisma as any).scoringHistory as {
      create(args: any): Promise<void>;
    };
  }

  private get statsStore() {
    return (this.prisma as any).playerScoringStats as {
      findUnique(args: any): Promise<RawPlayerScoringStats | null>;
      create(args: any): Promise<RawPlayerScoringStats>;
      update(args: any): Promise<RawPlayerScoringStats>;
    };
  }

  async scoreAnswer(input: ScoreAnswerInput): Promise<ScoreAnswerResult> {
    const { engine, config, sessionScoringId } = await this.sessionScoringService.getSessionEngine(input.sessionId);

    const stats = await this.ensurePlayerStats(sessionScoringId, input.playerId);

    const context: ScoringContext = {
      isCorrect: input.isCorrect,
      answerTime: input.answerTime,
      submittedAt: input.submittedAt ?? new Date(),
      question: {
        id: input.questionId,
        basePoints: input.question.basePoints,
        timeLimit: input.question.timeLimit,
        difficulty: input.question.difficulty,
        category: input.question.category,
      },
      player: {
        id: input.playerId,
        currentStreak: stats.currentStreak,
        totalAnswers: stats.totalAnswers,
        correctAnswers: stats.correctAnswers,
      },
      session: {
        id: input.sessionId,
        scoringMode: config.mode,
        customRules: (config.config.customRules ?? []).map((rule) => rule.id),
      },
      metadata: input.metadata,
    };

    const result = engine.calculateScore(context);

    const updatedStats = await this.updatePlayerStats(sessionScoringId, stats, input, result.totalPoints);

    await this.historyStore.create({
      data: {
        sessionScoringId,
        questionId: input.questionId,
        playerId: input.playerId,
        isCorrect: input.isCorrect,
        answerTime: input.answerTime,
        pointsAwarded: result.totalPoints,
        breakdown: JSON.stringify(result.breakdown),
      },
    });

    return {
      result,
      stats: this.mapStats(updatedStats),
    };
  }

  private async ensurePlayerStats(sessionScoringId: string, playerId: string): Promise<RawPlayerScoringStats> {
    const existing = await this.statsStore.findUnique({
      where: { sessionScoringId_playerId: { sessionScoringId, playerId } },
    });

    if (existing) {
      return existing;
    }

    return this.statsStore.create({
      data: {
        sessionScoringId,
        playerId,
        totalScore: 0,
        currentStreak: 0,
        maxStreak: 0,
        totalAnswers: 0,
        correctAnswers: 0,
        incorrectAnswers: 0,
        averageAnswerTime: 0,
        fastestAnswerTime: null,
        lastAnswerCorrect: null,
        lastAnswerTime: null,
      },
    });
  }

  private async updatePlayerStats(
    sessionScoringId: string,
    stats: RawPlayerScoringStats,
    input: ScoreAnswerInput,
    pointsAwarded: number,
  ): Promise<RawPlayerScoringStats> {
    const totalAnswers = stats.totalAnswers + 1;
    const correctAnswers = input.isCorrect ? stats.correctAnswers + 1 : stats.correctAnswers;
    const incorrectAnswers = input.isCorrect ? stats.incorrectAnswers : stats.incorrectAnswers + 1;
    const currentStreak = input.isCorrect ? stats.currentStreak + 1 : 0;
    const maxStreak = Math.max(stats.maxStreak, currentStreak);
    const totalScore = stats.totalScore + pointsAwarded;
    const averageAnswerTime = Math.round(
      ((stats.averageAnswerTime * stats.totalAnswers) + input.answerTime) / totalAnswers,
    );
    const fastestAnswerTime = stats.fastestAnswerTime !== null
      ? Math.min(stats.fastestAnswerTime, input.answerTime)
      : input.answerTime;

    return this.statsStore.update({
      where: { sessionScoringId_playerId: { sessionScoringId, playerId: input.playerId } },
      data: {
        totalScore,
        currentStreak,
        maxStreak,
        totalAnswers,
        correctAnswers,
        incorrectAnswers,
        averageAnswerTime,
        fastestAnswerTime,
        lastAnswerCorrect: input.isCorrect,
        lastAnswerTime: input.submittedAt ?? new Date(),
      },
    });
  }

  private mapStats(stats: RawPlayerScoringStats): PlayerScoringStatsRecord {
    return {
      id: stats.id,
      sessionScoringId: stats.sessionScoringId,
      playerId: stats.playerId,
      totalScore: stats.totalScore,
      currentStreak: stats.currentStreak,
      maxStreak: stats.maxStreak,
      totalAnswers: stats.totalAnswers,
      correctAnswers: stats.correctAnswers,
      incorrectAnswers: stats.incorrectAnswers,
      averageAnswerTime: stats.averageAnswerTime,
      fastestAnswerTime: stats.fastestAnswerTime,
      lastAnswerCorrect: stats.lastAnswerCorrect,
      lastAnswerTime: stats.lastAnswerTime,
      updatedAt: stats.updatedAt,
    };
  }
}

interface RawPlayerScoringStats {
  id: string;
  sessionScoringId: string;
  playerId: string;
  totalScore: number;
  currentStreak: number;
  maxStreak: number;
  totalAnswers: number;
  correctAnswers: number;
  incorrectAnswers: number;
  averageAnswerTime: number;
  fastestAnswerTime: number | null;
  lastAnswerCorrect: boolean | null;
  lastAnswerTime: Date | null;
  updatedAt: Date;
}
