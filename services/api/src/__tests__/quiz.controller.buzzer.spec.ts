import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { QuizController } from '../routes/quiz.controller';
import { QuizService } from '../services/quiz.service';
import { SessionsService } from '../services/sessions.service';
import { SessionGateway } from '../gateways/session.gateway';

describe('QuizController - Buzzer Endpoints', () => {
  let controller: QuizController;
  let quizService: QuizService;
  let gateway: SessionGateway;

  const mockQuizState = {
    sessionId: 'session-123',
    questionId: 'q1',
    prompt: 'What is 2+2?',
    options: ['3', '4', '5'],
    status: 'running' as const,
    correctOption: null,
    duration: 30,
    createdAt: new Date().toISOString(),
    answers: [],
  };

  const mockBuzzerState = {
    isOpen: true,
    buzzPresses: [],
    firstBuzzerId: null,
    lockedForParticipantId: null,
    buzzerOpenedAt: new Date().toISOString(),
    timerDuration: 30,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [QuizController],
      providers: [
        {
          provide: QuizService,
          useValue: {
            start: jest.fn(),
            submit: jest.fn(),
            reveal: jest.fn(),
            get: jest.fn(),
            checkAllPlayersAnswered: jest.fn(),
            pressBuzzer: jest.fn(),
            openBuzzer: jest.fn(),
            closeBuzzer: jest.fn(),
            resetBuzzer: jest.fn(),
            overrideBuzzerControl: jest.fn(),
          },
        },
        {
          provide: SessionsService,
          useValue: {
            getSnapshot: jest.fn(),
          },
        },
        {
          provide: SessionGateway,
          useValue: {
            emitQuizUpdate: jest.fn(),
            emitSessionUpdate: jest.fn(),
            emitToSession: jest.fn(),
            emitBuzzerOpened: jest.fn(),
            emitBuzzerPressed: jest.fn(),
            emitBuzzerClosed: jest.fn(),
            emitBuzzerReset: jest.fn(),
            emitBuzzerOverride: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<QuizController>(QuizController);
    quizService = module.get<QuizService>(QuizService);
    gateway = module.get<SessionGateway>(SessionGateway);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /sessions/:sessionId/quiz/buzzer/press', () => {
    it('should allow participant to press buzzer', async () => {
      const resultState = {
        ...mockQuizState,
        buzzerState: {
          ...mockBuzzerState,
          buzzPresses: [{
            participantId: 'participant-1',
            participantName: 'Alice',
            teamId: 'team-red',
            teamName: 'Red Team',
            teamColor: '#FF0000',
            timestamp: new Date().toISOString(),
          }],
          firstBuzzerId: 'participant-1',
          lockedForParticipantId: 'participant-1',
          isOpen: false,
        },
      };

      jest.spyOn(quizService, 'pressBuzzer').mockResolvedValue(resultState as any);
      jest.spyOn(gateway, 'emitQuizUpdate').mockResolvedValue();

      const result = await controller.pressBuzzer('session-123', {
        participantId: 'participant-1',
      });

      expect(quizService.pressBuzzer).toHaveBeenCalledWith('session-123', 'participant-1');
      expect(gateway.emitQuizUpdate).toHaveBeenCalledWith('session-123', resultState);
      expect(result.buzzerState.firstBuzzerId).toBe('participant-1');
      expect(result.buzzerState.isOpen).toBe(false);
    });

    it('should reject invalid request body', async () => {
      await expect(
        controller.pressBuzzer('session-123', { participantId: '' })
      ).rejects.toThrow(BadRequestException);

      await expect(
        controller.pressBuzzer('session-123', {})
      ).rejects.toThrow(BadRequestException);
    });

    it('should propagate service errors', async () => {
      jest.spyOn(quizService, 'pressBuzzer').mockRejectedValue(
        new BadRequestException('Buzzer is not open')
      );

      await expect(
        controller.pressBuzzer('session-123', { participantId: 'participant-1' })
      ).rejects.toThrow('Buzzer is not open');
    });
  });

  describe('POST /sessions/:sessionId/quiz/buzzer/open', () => {
    it('should open buzzer successfully', async () => {
      const resultState = {
        ...mockQuizState,
        buzzerState: mockBuzzerState,
      };

      jest.spyOn(quizService, 'openBuzzer').mockResolvedValue(resultState as any);
      jest.spyOn(gateway, 'emitQuizUpdate').mockResolvedValue();

      const result = await controller.openBuzzer('session-123');

      expect(quizService.openBuzzer).toHaveBeenCalledWith('session-123');
      expect(gateway.emitQuizUpdate).toHaveBeenCalledWith('session-123', resultState);
      expect(result.buzzerState.isOpen).toBe(true);
      expect(result.buzzerState.buzzerOpenedAt).toBeDefined();
    });

    it('should require authentication and HOST role', () => {
      // This test verifies the decorators are applied
      const metadata = Reflect.getMetadata('roles', controller.openBuzzer);
      expect(metadata).toEqual(['HOST', 'ADMIN']);
    });
  });

  describe('POST /sessions/:sessionId/quiz/buzzer/close', () => {
    it('should close buzzer successfully', async () => {
      const resultState = {
        ...mockQuizState,
        buzzerState: {
          ...mockBuzzerState,
          isOpen: false,
        },
      };

      jest.spyOn(quizService, 'closeBuzzer').mockResolvedValue(resultState as any);
      jest.spyOn(gateway, 'emitQuizUpdate').mockResolvedValue();

      const result = await controller.closeBuzzer('session-123');

      expect(quizService.closeBuzzer).toHaveBeenCalledWith('session-123');
      expect(gateway.emitQuizUpdate).toHaveBeenCalledWith('session-123', resultState);
      expect(result.buzzerState.isOpen).toBe(false);
    });

    it('should require authentication and HOST role', () => {
      const metadata = Reflect.getMetadata('roles', controller.closeBuzzer);
      expect(metadata).toEqual(['HOST', 'ADMIN']);
    });
  });

  describe('POST /sessions/:sessionId/quiz/buzzer/reset', () => {
    it('should reset buzzer successfully', async () => {
      const resultState = {
        ...mockQuizState,
        buzzerState: {
          isOpen: false,
          buzzPresses: [],
          firstBuzzerId: null,
          lockedForParticipantId: null,
          buzzerOpenedAt: null,
          timerDuration: 30,
        },
      };

      jest.spyOn(quizService, 'resetBuzzer').mockResolvedValue(resultState as any);
      jest.spyOn(gateway, 'emitQuizUpdate').mockResolvedValue();

      const result = await controller.resetBuzzer('session-123');

      expect(quizService.resetBuzzer).toHaveBeenCalledWith('session-123');
      expect(gateway.emitQuizUpdate).toHaveBeenCalledWith('session-123', resultState);
      expect(result.buzzerState.buzzPresses).toEqual([]);
      expect(result.buzzerState.firstBuzzerId).toBeNull();
    });

    it('should require authentication and HOST role', () => {
      const metadata = Reflect.getMetadata('roles', controller.resetBuzzer);
      expect(metadata).toEqual(['HOST', 'ADMIN']);
    });
  });

  describe('POST /sessions/:sessionId/quiz/buzzer/override', () => {
    it('should override buzzer control successfully', async () => {
      const resultState = {
        ...mockQuizState,
        buzzerState: {
          ...mockBuzzerState,
          lockedForParticipantId: 'participant-2',
          isOpen: false,
        },
      };

      jest.spyOn(quizService, 'overrideBuzzerControl').mockResolvedValue(resultState as any);
      jest.spyOn(gateway, 'emitQuizUpdate').mockResolvedValue();

      const result = await controller.overrideBuzzer('session-123', {
        participantId: 'participant-2',
      });

      expect(quizService.overrideBuzzerControl).toHaveBeenCalledWith('session-123', 'participant-2');
      expect(gateway.emitQuizUpdate).toHaveBeenCalledWith('session-123', resultState);
      expect(result.buzzerState.lockedForParticipantId).toBe('participant-2');
    });

    it('should reject invalid request body', async () => {
      await expect(
        controller.overrideBuzzer('session-123', { participantId: '' })
      ).rejects.toThrow(BadRequestException);

      await expect(
        controller.overrideBuzzer('session-123', {})
      ).rejects.toThrow(BadRequestException);
    });

    it('should require authentication and HOST role', () => {
      const metadata = Reflect.getMetadata('roles', controller.overrideBuzzer);
      expect(metadata).toEqual(['HOST', 'ADMIN']);
    });
  });

  describe('WebSocket Integration', () => {
    it('should emit quiz:update after buzzer press', async () => {
      const resultState = {
        ...mockQuizState,
        buzzerState: mockBuzzerState,
      };

      jest.spyOn(quizService, 'pressBuzzer').mockResolvedValue(resultState as any);
      jest.spyOn(gateway, 'emitQuizUpdate').mockResolvedValue();

      await controller.pressBuzzer('session-123', { participantId: 'participant-1' });

      expect(gateway.emitQuizUpdate).toHaveBeenCalledWith('session-123', resultState);
      expect(gateway.emitQuizUpdate).toHaveBeenCalledTimes(1);
    });

    it('should emit quiz:update after opening buzzer', async () => {
      const resultState = {
        ...mockQuizState,
        buzzerState: mockBuzzerState,
      };

      jest.spyOn(quizService, 'openBuzzer').mockResolvedValue(resultState as any);
      jest.spyOn(gateway, 'emitQuizUpdate').mockResolvedValue();

      await controller.openBuzzer('session-123');

      expect(gateway.emitQuizUpdate).toHaveBeenCalledWith('session-123', resultState);
    });

    it('should emit quiz:update after reset', async () => {
      const resultState = {
        ...mockQuizState,
        buzzerState: {
          isOpen: false,
          buzzPresses: [],
          firstBuzzerId: null,
          lockedForParticipantId: null,
          buzzerOpenedAt: null,
          timerDuration: 30,
        },
      };

      jest.spyOn(quizService, 'resetBuzzer').mockResolvedValue(resultState as any);
      jest.spyOn(gateway, 'emitQuizUpdate').mockResolvedValue();

      await controller.resetBuzzer('session-123');

      expect(gateway.emitQuizUpdate).toHaveBeenCalledWith('session-123', resultState);
    });
  });

  describe('Error Handling', () => {
    it('should handle service exceptions gracefully', async () => {
      jest.spyOn(quizService, 'pressBuzzer').mockRejectedValue(
        new Error('Database connection failed')
      );

      await expect(
        controller.pressBuzzer('session-123', { participantId: 'participant-1' })
      ).rejects.toThrow('Database connection failed');
    });

    it('should not emit WebSocket events on failure', async () => {
      jest.spyOn(quizService, 'openBuzzer').mockRejectedValue(
        new BadRequestException('No active quiz')
      );
      jest.spyOn(gateway, 'emitQuizUpdate').mockResolvedValue();

      await expect(controller.openBuzzer('session-123')).rejects.toThrow();
      expect(gateway.emitQuizUpdate).not.toHaveBeenCalled();
    });
  });
});
