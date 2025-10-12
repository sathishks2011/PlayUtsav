import { BadRequestException, NotFoundException } from '@nestjs/common';
import { SessionsService } from '../services/sessions.service';

describe('SessionsService', () => {
  const baseSession = {
    id: 'session-1',
    code: 'TEST',
    status: 'LOBBY',
    hostName: 'Ava',
    maxPlayers: 4,
    language: 'en',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  } as any;

  const snapshot = {
    ...baseSession,
    teams: [],
    participants: [],
    scores: [],
  };

  let service: SessionsService;
  let mockPrisma: any;
  let randomSpy: jest.SpyInstance<number, []>;

  beforeEach(() => {
    mockPrisma = {
      session: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      participant: {
        create: jest.fn(),
        count: jest.fn(),
      },
      team: {
        create: jest.fn(),
      },
    };
    service = new SessionsService(mockPrisma);
    randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0.123456);
  });

  afterEach(() => {
    jest.resetAllMocks();
    randomSpy.mockRestore();
  });

  it('lists sessions with relations', async () => {
    const expected = [snapshot];
    mockPrisma.session.findMany.mockResolvedValue(expected);

    const result = await service.list();

    expect(mockPrisma.session.findMany).toHaveBeenCalledWith({
      include: {
        teams: { include: { participants: true } },
        participants: true,
        scores: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    expect(result).toEqual(expected);
  });

  it('creates session and adds host participant', async () => {
    mockPrisma.session.findUnique
      .mockResolvedValueOnce(null) // generateUniqueCode
      .mockResolvedValueOnce(snapshot);
    mockPrisma.session.create.mockResolvedValue(baseSession);
    mockPrisma.participant.create.mockResolvedValue({
      id: 'participant-1',
      displayName: 'Ava',
    });

    const session = await service.create({ hostName: 'Ava', maxPlayers: 6 });

    expect(mockPrisma.session.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        hostName: 'Ava',
        maxPlayers: 6,
        language: 'en',
      }),
    });
    expect(mockPrisma.participant.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        displayName: 'Ava',
        role: 'HOST',
        sessionId: baseSession.id,
      }),
    });
    expect(session).toEqual(snapshot);
  });

  it('throws when joining unknown session', async () => {
    mockPrisma.session.findUnique.mockResolvedValue(null);

    await expect(service.join('ABCD', 'Sam')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('prevents joining when session is full', async () => {
    mockPrisma.session.findUnique.mockResolvedValueOnce(baseSession);
    mockPrisma.participant.count.mockResolvedValue(4);

    await expect(service.join('TEST', 'Sam')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('joins session and returns snapshot', async () => {
    const snapshotWithParticipants = {
      ...snapshot,
      participants: [{ id: 'p1', displayName: 'Ava' }],
    } as any;

    mockPrisma.session.findUnique
      .mockResolvedValueOnce(baseSession) // lookup by code
      .mockResolvedValueOnce(snapshotWithParticipants); // snapshot
    mockPrisma.participant.count.mockResolvedValue(1);
    mockPrisma.participant.create.mockResolvedValue({ id: 'p2', displayName: 'Sam' });

    const result = await service.join('TEST', 'Sam');

    expect(mockPrisma.participant.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ sessionId: baseSession.id, displayName: 'Sam' }),
    });
    expect(result.session).toEqual(snapshotWithParticipants);
    expect(result.participant).toEqual({ id: 'p2', displayName: 'Sam' });
  });

  it('adds team and updates status', async () => {
    mockPrisma.team.create.mockResolvedValue({ id: 'team-1' });
    mockPrisma.session.update.mockResolvedValue({ ...baseSession, status: 'ACTIVE' });

    const team = await service.addTeam('session-1', 'Lightning', '#ffffff');
    expect(team).toEqual({ id: 'team-1' });
    expect(mockPrisma.team.create).toHaveBeenCalledWith({
      data: { sessionId: 'session-1', name: 'Lightning', color: '#ffffff' },
    });

    const updated = await service.updateStatus('session-1', 'ACTIVE');
    expect(updated.status).toBe('ACTIVE');
  });
});
