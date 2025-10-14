import { Test, TestingModule } from '@nestjs/testing';
import { SessionGateway } from '../gateways/session.gateway';
import { SessionsService } from '../services/sessions.service';
import { Server } from 'socket.io';

describe('SessionGateway - Buzzer Events', () => {
  let gateway: SessionGateway;
  let mockServer: jest.Mocked<Server>;

  const mockSession = {
    id: 'session-123',
    code: 'ABCD',
    status: 'ACTIVE',
    teams: [],
    participants: [],
  };

  beforeEach(async () => {
    // Create a mock Socket.IO server
    mockServer = {
      to: jest.fn().mockReturnThis(),
      emit: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SessionGateway,
        {
          provide: SessionsService,
          useValue: {
            getSnapshot: jest.fn().mockResolvedValue(mockSession),
          },
        },
      ],
    }).compile();

    gateway = module.get<SessionGateway>(SessionGateway);
    gateway.server = mockServer;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('emitBuzzerOpened', () => {
    it('should emit buzzer:opened event with correct payload', async () => {
      const buzzerState = {
        isOpen: true,
        buzzerOpenedAt: '2024-10-13T10:00:00.000Z',
        timerDuration: 30,
      };

      await gateway.emitBuzzerOpened('session-123', buzzerState);

      expect(mockServer.to).toHaveBeenCalledWith('session:session-123');
      expect(mockServer.emit).toHaveBeenCalledWith(
        'buzzer:opened',
        expect.objectContaining({
          sessionId: 'session-123',
          buzzerState,
          timestamp: expect.any(String),
        })
      );
    });

    it('should include timestamp in emitted event', async () => {
      const buzzerState = {
        isOpen: true,
        buzzerOpenedAt: '2024-10-13T10:00:00.000Z',
        timerDuration: 30,
      };

      await gateway.emitBuzzerOpened('session-123', buzzerState);

      const emitCall = mockServer.emit.mock.calls[0];
      const payload = emitCall[1] as any;
      expect(payload.timestamp).toBeDefined();
      expect(new Date(payload.timestamp).toISOString()).toBe(payload.timestamp);
    });
  });

  describe('emitBuzzerPressed', () => {
    it('should emit buzzer:pressed event with participant and team info', async () => {
      const buzzerPress = {
        participantId: 'participant-1',
        participantName: 'Alice',
        teamId: 'team-red',
        teamName: 'Red Team',
        teamColor: '#FF0000',
        timestamp: '2024-10-13T10:00:01.000Z',
      };

      const buzzerState = {
        isOpen: false,
        buzzPresses: [buzzerPress],
        firstBuzzerId: 'participant-1',
        lockedForParticipantId: 'participant-1',
      };

      await gateway.emitBuzzerPressed('session-123', buzzerPress, buzzerState);

      expect(mockServer.to).toHaveBeenCalledWith('session:session-123');
      expect(mockServer.emit).toHaveBeenCalledWith(
        'buzzer:pressed',
        expect.objectContaining({
          sessionId: 'session-123',
          buzzerPress,
          buzzerState,
          timestamp: expect.any(String),
        })
      );
    });

    it('should handle null team information', async () => {
      const buzzerPress = {
        participantId: 'participant-1',
        participantName: 'Alice',
        teamId: null,
        teamName: null,
        teamColor: null,
        timestamp: '2024-10-13T10:00:01.000Z',
      };

      const buzzerState = {
        isOpen: false,
        buzzPresses: [buzzerPress],
        firstBuzzerId: 'participant-1',
        lockedForParticipantId: 'participant-1',
      };

      await gateway.emitBuzzerPressed('session-123', buzzerPress, buzzerState);

      expect(mockServer.emit).toHaveBeenCalled();
      const emitCall = mockServer.emit.mock.calls[0];
      const payload = emitCall[1] as any;
      expect(payload.buzzerPress.teamId).toBeNull();
      expect(payload.buzzerPress.teamName).toBeNull();
      expect(payload.buzzerPress.teamColor).toBeNull();
    });
  });

  describe('emitBuzzerClosed', () => {
    it('should emit buzzer:closed event', async () => {
      const buzzerState = {
        isOpen: false,
        lockedForParticipantId: 'participant-1',
      };

      await gateway.emitBuzzerClosed('session-123', buzzerState);

      expect(mockServer.to).toHaveBeenCalledWith('session:session-123');
      expect(mockServer.emit).toHaveBeenCalledWith(
        'buzzer:closed',
        expect.objectContaining({
          sessionId: 'session-123',
          buzzerState,
          timestamp: expect.any(String),
        })
      );
    });
  });

  describe('emitBuzzerReset', () => {
    it('should emit buzzer:reset event', async () => {
      await gateway.emitBuzzerReset('session-123');

      expect(mockServer.to).toHaveBeenCalledWith('session:session-123');
      expect(mockServer.emit).toHaveBeenCalledWith(
        'buzzer:reset',
        expect.objectContaining({
          sessionId: 'session-123',
          timestamp: expect.any(String),
        })
      );
    });

    it('should only include sessionId and timestamp', async () => {
      await gateway.emitBuzzerReset('session-123');

      const emitCall = mockServer.emit.mock.calls[0];
      const payload = emitCall[1] as any;
      expect(Object.keys(payload)).toEqual(['sessionId', 'timestamp']);
    });
  });

  describe('emitBuzzerOverride', () => {
    it('should emit buzzer:override event with new participant control', async () => {
      const buzzerState = {
        lockedForParticipantId: 'participant-2',
      };

      await gateway.emitBuzzerOverride('session-123', 'participant-2', buzzerState);

      expect(mockServer.to).toHaveBeenCalledWith('session:session-123');
      expect(mockServer.emit).toHaveBeenCalledWith(
        'buzzer:override',
        expect.objectContaining({
          sessionId: 'session-123',
          participantId: 'participant-2',
          buzzerState,
          timestamp: expect.any(String),
        })
      );
    });
  });

  describe('Room Targeting', () => {
    it('should target correct room for all buzzer events', async () => {
      const buzzerState = { isOpen: true, buzzerOpenedAt: new Date().toISOString(), timerDuration: 30 };
      
      await gateway.emitBuzzerOpened('test-session', buzzerState);
      expect(mockServer.to).toHaveBeenCalledWith('session:test-session');

      await gateway.emitBuzzerClosed('another-session', { isOpen: false, lockedForParticipantId: null });
      expect(mockServer.to).toHaveBeenCalledWith('session:another-session');

      await gateway.emitBuzzerReset('third-session');
      expect(mockServer.to).toHaveBeenCalledWith('session:third-session');
    });
  });

  describe('Event Flow Integration', () => {
    it('should emit events in correct order for full buzzer lifecycle', async () => {
      // 1. Buzzer opened
      await gateway.emitBuzzerOpened('session-123', {
        isOpen: true,
        buzzerOpenedAt: new Date().toISOString(),
        timerDuration: 30,
      });

      // 2. Player presses
      await gateway.emitBuzzerPressed(
        'session-123',
        {
          participantId: 'p1',
          participantName: 'Alice',
          teamId: 'red',
          teamName: 'Red',
          teamColor: '#FF0000',
          timestamp: new Date().toISOString(),
        },
        {
          isOpen: false,
          buzzPresses: [],
          firstBuzzerId: 'p1',
          lockedForParticipantId: 'p1',
        }
      );

      // 3. Host resets
      await gateway.emitBuzzerReset('session-123');

      expect(mockServer.emit).toHaveBeenCalledTimes(3);
      expect(mockServer.emit).toHaveBeenNthCalledWith(1, 'buzzer:opened', expect.any(Object));
      expect(mockServer.emit).toHaveBeenNthCalledWith(2, 'buzzer:pressed', expect.any(Object));
      expect(mockServer.emit).toHaveBeenNthCalledWith(3, 'buzzer:reset', expect.any(Object));
    });
  });

  describe('Logging', () => {
    it('should log buzzer event emissions', async () => {
      const logSpy = jest.spyOn(gateway['logger'], 'log');

      await gateway.emitBuzzerOpened('session-123', {
        isOpen: true,
        buzzerOpenedAt: new Date().toISOString(),
        timerDuration: 30,
      });

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('[SessionGateway] Emitting buzzer:opened')
      );
    });

    it('should log participant info when buzzer pressed', async () => {
      const logSpy = jest.spyOn(gateway['logger'], 'log');

      await gateway.emitBuzzerPressed(
        'session-123',
        {
          participantId: 'p1',
          participantName: 'Alice',
          teamId: 'red',
          teamName: 'Red Team',
          teamColor: '#FF0000',
          timestamp: new Date().toISOString(),
        },
        {
          isOpen: false,
          buzzPresses: [],
          firstBuzzerId: 'p1',
          lockedForParticipantId: 'p1',
        }
      );

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('Alice')
      );
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('Red Team')
      );
    });
  });
});
