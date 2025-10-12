import { BadRequestException } from '@nestjs/common';
import { SessionsController } from '../routes/sessions.controller';

describe('SessionsController', () => {
  const session = { id: 'session-1', code: 'ABCD' } as any;
  const participantResult = { session, participant: { id: 'p1' } };

  let controller: SessionsController;
  let mockService: any;
  let mockGateway: any;

  beforeEach(() => {
    mockService = {
      list: jest.fn().mockResolvedValue([session]),
      create: jest.fn().mockResolvedValue(session),
      join: jest.fn().mockResolvedValue(participantResult),
      addTeam: jest.fn().mockResolvedValue({ id: 'team-1' }),
      updateStatus: jest.fn().mockResolvedValue({ ...session, status: 'ACTIVE' }),
    };
    mockGateway = { emitSessionUpdate: jest.fn() };
    controller = new SessionsController(mockService, mockGateway);
  });

  it('lists sessions', async () => {
    expect(await controller.list()).toEqual([session]);
    expect(mockService.list).toHaveBeenCalled();
  });

  it('creates session and emits update', async () => {
    await expect(controller.create({ hostName: 'Ava', maxPlayers: 6 })).resolves.toEqual(session);
    expect(mockService.create).toHaveBeenCalled();
    expect(mockGateway.emitSessionUpdate).toHaveBeenCalledWith(session.id);
  });

  it('validates payloads and throws on bad request', async () => {
    await expect(controller.create({ maxPlayers: 1 } as any)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('joins session and emits update', async () => {
    await expect(controller.join({ code: 'ABCD', displayName: 'Sam' })).resolves.toEqual(participantResult);
    expect(mockService.join).toHaveBeenCalledWith('ABCD', 'Sam');
    expect(mockGateway.emitSessionUpdate).toHaveBeenCalledWith(session.id);
  });
});

