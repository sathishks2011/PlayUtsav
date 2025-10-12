import { Test } from '@nestjs/testing';
import { QuizService } from '../services/quiz.service';
import { SessionsService } from '../services/sessions.service';

describe('QuizService', () => {
  let service: QuizService;
  let sessions: jest.Mocked<SessionsService>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        QuizService,
        {
          provide: SessionsService,
          useValue: {
            ensureSession: jest.fn().mockResolvedValue({ id: 'session-1' }),
            findParticipant: jest.fn().mockImplementation((id: string) =>
              Promise.resolve({ id, sessionId: 'session-1', displayName: `P-${id}` })
            ),
          },
        },
      ],
    }).compile();

    service = module.get(QuizService);
    sessions = module.get(SessionsService);
  });

  it('starts a quiz with given question', async () => {
    const quiz = await service.start('session-1', {
      questionId: 'q1',
      prompt: 'Sample?',
      options: ['A', 'B', 'C'],
    });
    expect(quiz.status).toBe('running');
    expect(quiz.options).toHaveLength(3);
  });

  it('records submissions and overrides previous answer', async () => {
    await service.start('session-1', {
      questionId: 'q1',
      prompt: 'Sample?',
      options: ['A', 'B'],
    });
    await service.submit('session-1', 'p1', 0);
    const quiz = await service.submit('session-1', 'p1', 1);
    expect(quiz.answers).toHaveLength(1);
    expect(quiz.answers[0].answer).toBe(1);
  });

  it('reveals quiz and stores correct option', async () => {
    await service.start('session-1', {
      questionId: 'q1',
      prompt: 'Sample?',
      options: ['A', 'B'],
    });
    const quiz = await service.reveal('session-1', 1);
    expect(quiz.status).toBe('revealed');
    expect(quiz.correctOption).toBe(1);
  });

  it('throws when quiz missing', async () => {
    await expect(service.submit('session-1', 'p1', 0)).rejects.toThrow('No active quiz');
  });

  it('rejects invalid option index', async () => {
    await service.start('session-1', {
      questionId: 'q1',
      prompt: 'Sample?',
      options: ['A', 'B'],
    });
    await expect(service.submit('session-1', 'p1', 9)).rejects.toThrow('Answer index out of range');
  });

  it('rejects invalid reveal index', async () => {
    await service.start('session-1', {
      questionId: 'q1',
      prompt: 'Sample?',
      options: ['A', 'B'],
    });
    await expect(service.reveal('session-1', 5)).rejects.toThrow('Correct option out of range');
  });
});

