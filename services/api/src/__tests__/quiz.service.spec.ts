import { QuizService } from '../services/quiz.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('QuizService', () => {
  const now = new Date();
  let service: QuizService;
  const mockPrisma = {
    quizRound: {
      updateMany: jest.fn(),
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    quizAnswer: {
      upsert: jest.fn(),
    },
    participant: {
      findMany: jest.fn(),
    },
  } as unknown as {
    quizRound: {
      updateMany: jest.Mock;
      create: jest.Mock;
      findFirst: jest.Mock;
      update: jest.Mock;
    };
    quizAnswer: {
      upsert: jest.Mock;
    };
    participant: {
      findMany: jest.Mock;
    };
  };

  const mockSessions = {
    ensureSession: jest.fn().mockResolvedValue({ id: 'session-1' }),
    findParticipant: jest.fn().mockResolvedValue({ id: 'p1', sessionId: 'session-1', displayName: 'Sam' }),
    adjustScore: jest.fn().mockResolvedValue(undefined),
  } as any;

  const mockScoring = {
    scoreAnswer: jest.fn().mockResolvedValue({
      result: { totalPoints: 100, breakdown: [] },
      stats: {},
    }),
  } as any;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new QuizService(mockPrisma as any, mockSessions, mockScoring);
  });

  it('creates a quiz round with options', async () => {
    (mockPrisma.quizRound.updateMany as jest.Mock).mockResolvedValue({ count: 0 });
    (mockPrisma.quizRound.create as jest.Mock).mockResolvedValue({
      id: 'round-1',
      sessionId: 'session-1',
      questionId: 'q1',
      prompt: 'Sample?',
      status: 'running',
      correctOption: null,
      duration: 20,
      createdAt: now,
      options: [
        { index: 0, text: 'A' },
        { index: 1, text: 'B' },
      ],
      answers: [],
    });

    const state = await service.start('session-1', {
      questionId: 'q1',
      prompt: 'Sample?',
      options: ['A', 'B'],
      duration: 20,
    });

    expect(state.options).toEqual(['A', 'B']);
    expect(state.duration).toBe(20);
    expect(mockPrisma.quizRound.updateMany).toHaveBeenCalled();
  });

  it('records answers and returns latest state', async () => {
    (mockPrisma.quizRound.findFirst as jest.Mock)
      .mockResolvedValueOnce({
        id: 'round-1',
        sessionId: 'session-1',
        questionId: 'q1',
        prompt: 'Sample?',
        status: 'running',
        correctOption: null,
        duration: 30,
        createdAt: now,
        options: [
          { index: 0, text: 'A' },
          { index: 1, text: 'B' },
        ],
        answers: [],
      })
      .mockResolvedValueOnce({
        id: 'round-1',
        sessionId: 'session-1',
        questionId: 'q1',
        prompt: 'Sample?',
        status: 'running',
        correctOption: null,
        duration: 30,
        createdAt: now,
        options: [
          { index: 0, text: 'A' },
          { index: 1, text: 'B' },
        ],
        answers: [
          { participantId: 'p1', answer: 1, displayName: 'Sam' },
        ],
      });

    const state = await service.submit('session-1', 'p1', 1);
    expect(mockPrisma.quizAnswer.upsert).toHaveBeenCalled();
    expect(state?.answers).toHaveLength(1);
  });

  it('reveals quiz and awards teams', async () => {
    (mockPrisma.quizRound.findFirst as jest.Mock)
      .mockResolvedValueOnce({
        id: 'round-1',
        sessionId: 'session-1',
        questionId: 'q1',
        prompt: 'Sample?',
        status: 'running',
        correctOption: null,
        duration: 30,
        createdAt: now,
        options: [
          { index: 0, text: 'A' },
          { index: 1, text: 'B' },
        ],
        answers: [
          { id: 'ans-1', participantId: 'p1', answer: 1, createdAt: now },
        ],
      })
      .mockResolvedValueOnce({
        id: 'round-1',
        sessionId: 'session-1',
        questionId: 'q1',
        prompt: 'Sample?',
        status: 'revealed',
        correctOption: 1,
        duration: 30,
        createdAt: now,
        options: [
          { index: 0, text: 'A' },
          { index: 1, text: 'B' },
        ],
        answers: [
          { id: 'ans-1', participantId: 'p1', answer: 1, createdAt: now },
        ],
      })
      .mockResolvedValueOnce({
        // Third call for fetchActiveRound after reveal
        id: 'round-1',
        sessionId: 'session-1',
        questionId: 'q1',
        prompt: 'Sample?',
        status: 'revealed',
        correctOption: 1,
        duration: 30,
        createdAt: now,
        options: [
          { index: 0, text: 'A' },
          { index: 1, text: 'B' },
        ],
        answers: [
          { id: 'ans-1', participantId: 'p1', answer: 1, createdAt: now },
        ],
      });

    const state = await service.reveal('session-1', {
      correctOption: 1,
    });

    expect(mockPrisma.quizRound.update).toHaveBeenCalled();
    expect(mockScoring.scoreAnswer).toHaveBeenCalledWith(
      expect.objectContaining({
        sessionId: 'session-1',
        playerId: 'p1',
        isCorrect: true,
      })
    );
    expect(state?.status).toBe('revealed');
  });

  it('validates option indexes on submit', async () => {
    (mockPrisma.quizRound.findFirst as jest.Mock).mockResolvedValueOnce({
      id: 'round-1',
      sessionId: 'session-1',
      questionId: 'q1',
      prompt: 'Sample?',
      status: 'running',
      correctOption: null,
      duration: 30,
      createdAt: now,
      options: [{ index: 0, text: 'A' }],
      answers: [],
    });

    await expect(service.submit('session-1', 'p1', 5)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('throws when participant is missing', async () => {
    (mockPrisma.quizRound.findFirst as jest.Mock).mockResolvedValueOnce({
      id: 'round-1',
      sessionId: 'session-1',
      questionId: 'q1',
      prompt: 'Sample?',
      status: 'running',
      correctOption: null,
      duration: 30,
      createdAt: now,
      options: [
        { index: 0, text: 'A' },
        { index: 1, text: 'B' },
      ],
      answers: [],
    });
    mockSessions.findParticipant.mockResolvedValueOnce(null);

    await expect(service.submit('session-1', 'missing', 0)).rejects.toBeInstanceOf(NotFoundException);
  });
});
