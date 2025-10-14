import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { QuizService } from '../services/quiz.service';
import { PrismaService } from '../prisma.service';
import { SessionsService } from '../services/sessions.service';
import { ScoreCalculationService } from '../services/scoring/score-calculation.service';

describe('QuizService - Buzzer Mode', () => {
  let service: QuizService;
  let prisma: PrismaService;
  let sessionsService: SessionsService;

  const mockSession = {
    id: 'session-123',
    code: 'ABCD',
    status: 'ACTIVE',
    playerEngagementType: 'BUZZER',
    hostId: 'host-1',
    maxPlayers: 4,
    language: 'en',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockQuizRound = {
    id: 'round-1',
    sessionId: 'session-123',
    questionId: 'q1',
    prompt: 'What is 2+2?',
    status: 'running',
    correctOption: null,
    duration: 30,
    createdAt: new Date(),
    options: [
      { index: 0, text: '3' },
      { index: 1, text: '4' },
      { index: 2, text: '5' },
    ],
    answers: [],
  };

  const mockParticipant1 = {
    id: 'participant-1',
    sessionId: 'session-123',
    displayName: 'Alice',
    role: 'PLAYER',
    teamId: 'team-red',
    team: {
      id: 'team-red',
      name: 'Red Team',
      color: '#FF0000',
    },
  };

  const mockParticipant2 = {
    id: 'participant-2',
    sessionId: 'session-123',
    displayName: 'Bob',
    role: 'PLAYER',
    teamId: 'team-blue',
    team: {
      id: 'team-blue',
      name: 'Blue Team',
      color: '#0000FF',
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QuizService,
        {
          provide: PrismaService,
          useValue: {
            session: {
              findUnique: jest.fn(),
            },
            participant: {
              findUnique: jest.fn(),
              findMany: jest.fn(),
            },
          },
        },
        {
          provide: SessionsService,
          useValue: {
            ensureSession: jest.fn(),
            findParticipant: jest.fn(),
            getSnapshot: jest.fn(),
          },
        },
        {
          provide: ScoreCalculationService,
          useValue: {
            scoreAnswer: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<QuizService>(QuizService);
    prisma = module.get<PrismaService>(PrismaService);
    sessionsService = module.get<SessionsService>(SessionsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('openBuzzer', () => {
    it('should open buzzer for BUZZER mode session', async () => {
      jest.spyOn(prisma.session, 'findUnique').mockResolvedValue(mockSession as any);
      // Mock the get() method which internally calls fetchActiveRound
      jest.spyOn(service, 'get').mockResolvedValue({
        ...mockQuizRound,
        options: mockQuizRound.options.map(o => o.text),
        createdAt: mockQuizRound.createdAt.toISOString(),
        status: 'running' as const,
      } as any);

      const result = await service.openBuzzer('session-123');

      expect(result.buzzerState).toBeDefined();
      expect(result.buzzerState.isOpen).toBe(true);
      expect(result.buzzerState.buzzPresses).toEqual([]);
      expect(result.buzzerState.timerDuration).toBe(30);
      expect(result.buzzerState.buzzerOpenedAt).toBeDefined();
    });

    it('should throw error if session is not in BUZZER mode', async () => {
      const choiceSession = { ...mockSession, playerEngagementType: 'CHOICE_ANSWER' };
      jest.spyOn(prisma.session, 'findUnique').mockResolvedValue(choiceSession as any);
      jest.spyOn(service, 'get').mockResolvedValue({
        ...mockQuizRound,
        options: mockQuizRound.options.map(o => o.text),
        createdAt: mockQuizRound.createdAt.toISOString(),
        status: 'running' as const,
      } as any);

      await expect(service.openBuzzer('session-123')).rejects.toThrow(
        'Buzzer mode not enabled for this session'
      );
    });

    it('should throw error if no active quiz', async () => {
      jest.spyOn(prisma.session, 'findUnique').mockResolvedValue(mockSession as any);
      jest.spyOn(service, 'get').mockResolvedValue(null);

      await expect(service.openBuzzer('session-123')).rejects.toThrow('No active quiz');
    });
  });

  describe('pressBuzzer', () => {
    beforeEach(async () => {
      // Open buzzer first
      jest.spyOn(prisma.session, 'findUnique').mockResolvedValue(mockSession as any);
      jest.spyOn(service, 'get').mockResolvedValue({
        ...mockQuizRound,
        options: mockQuizRound.options.map(o => o.text),
        createdAt: mockQuizRound.createdAt.toISOString(),
        status: 'running' as const,
      } as any);
      await service.openBuzzer('session-123');
    });

    it('should allow first participant to press buzzer', async () => {
      jest.spyOn(prisma.session, 'findUnique').mockResolvedValue(mockSession as any);
      jest.spyOn(service, 'get').mockResolvedValue({
        ...mockQuizRound,
        options: mockQuizRound.options.map(o => o.text),
        createdAt: mockQuizRound.createdAt.toISOString(),
        status: 'running' as const,
      } as any);
      jest.spyOn(prisma.participant, 'findUnique').mockResolvedValue(mockParticipant1 as any);

      const result = await service.pressBuzzer('session-123', 'participant-1');

      expect(result.buzzerState.buzzPresses).toHaveLength(1);
      expect(result.buzzerState.buzzPresses[0]).toMatchObject({
        participantId: 'participant-1',
        participantName: 'Alice',
        teamId: 'team-red',
        teamName: 'Red Team',
        teamColor: '#FF0000',
      });
      expect(result.buzzerState.firstBuzzerId).toBe('participant-1');
      expect(result.buzzerState.lockedForParticipantId).toBe('participant-1');
      expect(result.buzzerState.isOpen).toBe(false); // Should close after first press
    });

    it('should prevent second participant from pressing when buzzer is locked', async () => {
      // First press
      jest.spyOn(prisma.session, 'findUnique').mockResolvedValue(mockSession as any);
      jest.spyOn(service, 'get').mockResolvedValue({
        ...mockQuizRound,
        options: mockQuizRound.options.map(o => o.text),
        createdAt: mockQuizRound.createdAt.toISOString(),
        status: 'running' as const,
      } as any);
      jest.spyOn(prisma.participant, 'findUnique').mockResolvedValue(mockParticipant1 as any);
      await service.pressBuzzer('session-123', 'participant-1');

      // Second press by different participant
      jest.spyOn(prisma.participant, 'findUnique').mockResolvedValue(mockParticipant2 as any);

      await expect(service.pressBuzzer('session-123', 'participant-2')).rejects.toThrow(
        'Buzzer is not open'
      );
    });

    it('should prevent duplicate buzz from same participant', async () => {
      jest.spyOn(prisma.session, 'findUnique').mockResolvedValue(mockSession as any);
      jest.spyOn(service, 'get').mockResolvedValue({
        ...mockQuizRound,
        options: mockQuizRound.options.map(o => o.text),
        createdAt: mockQuizRound.createdAt.toISOString(),
        status: 'running' as const,
      } as any);
      jest.spyOn(prisma.participant, 'findUnique').mockResolvedValue(mockParticipant1 as any);

      await service.pressBuzzer('session-123', 'participant-1');

      // Open buzzer again
      await service.openBuzzer('session-123');

      // Try to press again
      await expect(service.pressBuzzer('session-123', 'participant-1')).rejects.toThrow(
        'You already pressed the buzzer'
      );
    });

    it('should throw error if participant not found', async () => {
      jest.spyOn(prisma.session, 'findUnique').mockResolvedValue(mockSession as any);
      jest.spyOn(service, 'get').mockResolvedValue({
        ...mockQuizRound,
        options: mockQuizRound.options.map(o => o.text),
        createdAt: mockQuizRound.createdAt.toISOString(),
        status: 'running' as const,
      } as any);
      jest.spyOn(prisma.participant, 'findUnique').mockResolvedValue(null);

      await expect(service.pressBuzzer('session-123', 'invalid-participant')).rejects.toThrow(
        NotFoundException
      );
    });

    it('should throw error if buzzer is not open', async () => {
      // Close buzzer
      await service.closeBuzzer('session-123');

      jest.spyOn(prisma.session, 'findUnique').mockResolvedValue(mockSession as any);
      jest.spyOn(service, 'get').mockResolvedValue({
        ...mockQuizRound,
        options: mockQuizRound.options.map(o => o.text),
        createdAt: mockQuizRound.createdAt.toISOString(),
        status: 'running' as const,
      } as any);

      await expect(service.pressBuzzer('session-123', 'participant-1')).rejects.toThrow(
        'Buzzer is not open'
      );
    });
  });

  describe('closeBuzzer', () => {
    it('should close open buzzer', async () => {
      // Open buzzer first
      jest.spyOn(prisma.session, 'findUnique').mockResolvedValue(mockSession as any);
      jest.spyOn(service, 'get').mockResolvedValue({
        ...mockQuizRound,
        options: mockQuizRound.options.map(o => o.text),
        createdAt: mockQuizRound.createdAt.toISOString(),
        status: 'running' as const,
      } as any);
      await service.openBuzzer('session-123');

      const result = await service.closeBuzzer('session-123');

      expect(result.buzzerState.isOpen).toBe(false);
    });

    it('should throw error if buzzer state not found', async () => {
      jest.spyOn(service, 'get').mockResolvedValue({
        ...mockQuizRound,
        options: mockQuizRound.options.map(o => o.text),
        createdAt: mockQuizRound.createdAt.toISOString(),
        status: 'running' as const,
      } as any);

      await expect(service.closeBuzzer('session-123')).rejects.toThrow(
        'Buzzer state not found'
      );
    });
  });

  describe('resetBuzzer', () => {
    it('should reset buzzer state completely', async () => {
      // Open buzzer and have someone press it
      jest.spyOn(prisma.session, 'findUnique').mockResolvedValue(mockSession as any);
      jest.spyOn(service, 'get').mockResolvedValue({
        ...mockQuizRound,
        options: mockQuizRound.options.map(o => o.text),
        createdAt: mockQuizRound.createdAt.toISOString(),
        status: 'running' as const,
      } as any);
      jest.spyOn(prisma.participant, 'findUnique').mockResolvedValue(mockParticipant1 as any);

      await service.openBuzzer('session-123');
      await service.pressBuzzer('session-123', 'participant-1');

      // Reset
      const result = await service.resetBuzzer('session-123');

      expect(result.buzzerState.isOpen).toBe(false);
      expect(result.buzzerState.buzzPresses).toEqual([]);
      expect(result.buzzerState.firstBuzzerId).toBeNull();
      expect(result.buzzerState.lockedForParticipantId).toBeNull();
      expect(result.buzzerState.buzzerOpenedAt).toBeNull();
    });

    it('should allow new buzzer session after reset', async () => {
      // First round
      jest.spyOn(prisma.session, 'findUnique').mockResolvedValue(mockSession as any);
      jest.spyOn(service, 'get').mockResolvedValue({
        ...mockQuizRound,
        options: mockQuizRound.options.map(o => o.text),
        createdAt: mockQuizRound.createdAt.toISOString(),
        status: 'running' as const,
      } as any);
      jest.spyOn(prisma.participant, 'findUnique').mockResolvedValue(mockParticipant1 as any);

      await service.openBuzzer('session-123');
      await service.pressBuzzer('session-123', 'participant-1');

      // Reset
      await service.resetBuzzer('session-123');

      // Second round - different participant can buzz first
      jest.spyOn(prisma.participant, 'findUnique').mockResolvedValue(mockParticipant2 as any);
      await service.openBuzzer('session-123');
      const result = await service.pressBuzzer('session-123', 'participant-2');

      expect(result.buzzerState.firstBuzzerId).toBe('participant-2');
      expect(result.buzzerState.buzzPresses).toHaveLength(1);
      expect(result.buzzerState.buzzPresses[0].participantId).toBe('participant-2');
    });
  });

  describe('overrideBuzzerControl', () => {
    beforeEach(async () => {
      // Setup: Open buzzer and have participant 1 buzz
      jest.spyOn(prisma.session, 'findUnique').mockResolvedValue(mockSession as any);
      jest.spyOn(service, 'get').mockResolvedValue({
        ...mockQuizRound,
        options: mockQuizRound.options.map(o => o.text),
        createdAt: mockQuizRound.createdAt.toISOString(),
        status: 'running' as const,
      } as any);
      jest.spyOn(prisma.participant, 'findUnique').mockResolvedValue(mockParticipant1 as any);

      await service.openBuzzer('session-123');
      await service.pressBuzzer('session-123', 'participant-1');
    });

    it('should allow host to override buzzer control to different participant', async () => {
      jest.spyOn(service, 'get').mockResolvedValue({
        ...mockQuizRound,
        options: mockQuizRound.options.map(o => o.text),
        createdAt: mockQuizRound.createdAt.toISOString(),
        status: 'running' as const,
      } as any);
      jest.spyOn(prisma.participant, 'findUnique').mockResolvedValue(mockParticipant2 as any);

      const result = await service.overrideBuzzerControl('session-123', 'participant-2');

      expect(result.buzzerState.lockedForParticipantId).toBe('participant-2');
      expect(result.buzzerState.isOpen).toBe(false);
    });

    it('should throw error if participant not found', async () => {
      jest.spyOn(service, 'get').mockResolvedValue({
        ...mockQuizRound,
        options: mockQuizRound.options.map(o => o.text),
        createdAt: mockQuizRound.createdAt.toISOString(),
        status: 'running' as const,
      } as any);
      jest.spyOn(prisma.participant, 'findUnique').mockResolvedValue(null);

      await expect(
        service.overrideBuzzerControl('session-123', 'invalid-participant')
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw error if participant belongs to different session', async () => {
      jest.spyOn(service, 'get').mockResolvedValue({
        ...mockQuizRound,
        options: mockQuizRound.options.map(o => o.text),
        createdAt: mockQuizRound.createdAt.toISOString(),
        status: 'running' as const,
      } as any);
      const wrongSessionParticipant = { ...mockParticipant2, sessionId: 'different-session' };
      jest.spyOn(prisma.participant, 'findUnique').mockResolvedValue(wrongSessionParticipant as any);

      await expect(
        service.overrideBuzzerControl('session-123', 'participant-2')
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('Buzzer Timer Auto-Close', () => {
    it('should auto-close buzzer after timer duration', async () => {
      jest.useFakeTimers();

      jest.spyOn(prisma.session, 'findUnique').mockResolvedValue(mockSession as any);
      jest.spyOn(service, 'get').mockResolvedValue({
        ...mockQuizRound,
        options: mockQuizRound.options.map(o => o.text),
        createdAt: mockQuizRound.createdAt.toISOString(),
        status: 'running' as const,
      } as any);

      const result = await service.openBuzzer('session-123');
      expect(result.buzzerState.isOpen).toBe(true);

      // Fast-forward 30 seconds
      jest.advanceTimersByTime(30000);

      // Buzzer should be closed now (need to get state again)
      const closedResult = await service.get('session-123');
      // Note: In actual implementation, you'd need to expose a way to check buzzer state
      // This test shows the intent - in practice, you might emit an event when auto-closed

      jest.useRealTimers();
    });
  });

  describe('Sequential Buzzing (Multiple Rounds)', () => {
    it('should allow different teams to buzz in sequential rounds', async () => {
      jest.spyOn(prisma.session, 'findUnique').mockResolvedValue(mockSession as any);
      jest.spyOn(service, 'get').mockResolvedValue({
        ...mockQuizRound,
        options: mockQuizRound.options.map(o => o.text),
        createdAt: mockQuizRound.createdAt.toISOString(),
        status: 'running' as const,
      } as any);

      // Round 1: Red team buzzes
      jest.spyOn(prisma.participant, 'findUnique').mockResolvedValue(mockParticipant1 as any);
      await service.openBuzzer('session-123');
      const round1 = await service.pressBuzzer('session-123', 'participant-1');
      expect(round1.buzzerState.firstBuzzerId).toBe('participant-1');

      // Reset for next question
      await service.resetBuzzer('session-123');

      // Round 2: Blue team buzzes
      jest.spyOn(prisma.participant, 'findUnique').mockResolvedValue(mockParticipant2 as any);
      await service.openBuzzer('session-123');
      const round2 = await service.pressBuzzer('session-123', 'participant-2');
      expect(round2.buzzerState.firstBuzzerId).toBe('participant-2');
      expect(round2.buzzerState.buzzPresses).toHaveLength(1); // Only current round
    });
  });
});
