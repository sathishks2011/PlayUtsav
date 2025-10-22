import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { SessionsService } from './sessions.service';
import { ScoreCalculationService } from './scoring/score-calculation.service';

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
  constructor(
    private readonly prisma: PrismaService,
    private readonly sessions: SessionsService,
    private readonly scoring: ScoreCalculationService,
  ) {}

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
    const round = await (this.prisma as any).quizRound.findFirst({
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

    await (this.prisma as any).quizRound.updateMany({
      where: { sessionId, status: 'running' },
      data: { status: 'archived' },
    });

    const round = await (this.prisma as any).quizRound.create({
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
    const round = await (this.prisma as any).quizRound.findFirst({
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

    await (this.prisma as any).quizAnswer.upsert({
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

    // The actual scoring will happen in the 'reveal' step.

    return this.fetchActiveRound(sessionId);
  }

  /**
   * Check if all players in the session have answered the current quiz
   */
  async checkAllPlayersAnswered(sessionId: string): Promise<boolean> {
    const round = await (this.prisma as any).quizRound.findFirst({
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

  async reveal(sessionId: string, payload: { correctOption: number | null }) {
    const round = await (this.prisma as any).quizRound.findFirst({
      where: { sessionId, status: { in: ['running', 'revealed'] } },
      orderBy: { createdAt: 'desc' },
      include: { options: true, answers: true }, // Ensure answers are included
    });
    if (!round) throw new BadRequestException('No active quiz');

    // Ensure scoring is initialized before revealing
    // This is a safety check for sessions created before scoring was added
    let scoringAvailable = true;
    try {
      await this.scoring['sessionScoringService'].getSessionEngine(sessionId);
    } catch (error: any) {
      if (error.message?.includes('Session scoring state not found')) {
        console.warn('[QuizService] Scoring not initialized for session', sessionId, '- attempting to initialize');
        // Get session to find hostId
        const session = await (this.prisma as any).session.findUnique({
          where: { id: sessionId },
        });
        if (session && session.hostId) {
          await this.scoring['sessionScoringService'].attachConfigToSession({
            sessionId,
            hostId: session.hostId,
          });
          console.log('[QuizService] Scoring initialized for session', sessionId);
        } else {
          // If there's no host we can't attach a host-specific scoring config. Continue without scoring.
          console.warn('[QuizService] Scoring cannot be initialized - no hostId found for session', sessionId, '- proceeding without scoring');
          scoringAvailable = false;
        }
      } else {
        throw error;
      }
    }

    if (
      payload.correctOption != null &&
      (payload.correctOption < 0 || payload.correctOption >= round.options.length)
    ) {
      throw new BadRequestException('Correct option out of range');
    }

    // Update the round first to lock in the correct answer
    await (this.prisma as any).quizRound.update({
      where: { id: round.id },
      data: {
        status: 'revealed',
        correctOption: payload.correctOption,
      },
    });

    // Auto-reset buzzer when quiz is revealed for next round
    const buzzerState = this.buzzerStates.get(sessionId);
    if (buzzerState) {
      buzzerState.isOpen = false;
      buzzerState.buzzPresses = [];
      buzzerState.firstBuzzerId = null;
      buzzerState.lockedForParticipantId = null;
      buzzerState.buzzerOpenedAt = null;
    }

    // Now, trigger scoring for all answers submitted for this round
    const scoreUpdates: Array<{ participantId: string; teamId: string | null; delta: number; newTotal: number }> = [];
    
    if (payload.correctOption !== null) {
      if (!scoringAvailable) {
        console.warn('[QuizService] Reveal requested but scoring is unavailable for session', sessionId, '- skipping score calculations');
        // Update completed above; return round with empty scoreUpdates
        return { round: await this.fetchActiveRound(sessionId), scoreUpdates };
      }
      // Get participant team mappings
      const participants = await (this.prisma as any).participant.findMany({
        where: { sessionId: round.sessionId },
        select: { id: true, teamId: true, displayName: true },
      });
      const participantMap = new Map(
        participants.map((p: any) => [p.id, { teamId: p.teamId, displayName: p.displayName }])
      );
      
      for (const answer of round.answers) {
        const isCorrect = answer.answer === payload.correctOption;
        
        // Calculate the time taken (based on createdAt timestamp)
        // For now, we'll use a placeholder. In a real scenario, you'd track the time elapsed.
        const answerTime = Math.floor(
          (new Date(answer.createdAt).getTime() - new Date(round.createdAt).getTime()) / 1000
        );

        // eslint-disable-next-line no-await-in-loop
        const scoringResult = await this.scoring.scoreAnswer({
          sessionId: round.sessionId,
          playerId: answer.participantId,
          questionId: round.questionId,
          isCorrect,
          answerTime: Math.max(answerTime, 0), // Ensure non-negative
          submittedAt: new Date(answer.createdAt),
          question: {
            basePoints: 100, // TODO: Get this from the question metadata
            timeLimit: round.duration,
            difficulty: 'medium', // TODO: Get this from the question metadata
          },
        });
        
        // Create Score record for this answer
        const participantInfo = participantMap.get(answer.participantId) as { teamId: string | null; displayName: string } | undefined;
        if (participantInfo?.teamId) {
          // Find the latest quiz score for this team to calculate cumulative value
          // eslint-disable-next-line no-await-in-loop
          const latestQuizScore = await (this.prisma as any).score.findFirst({
            where: {
              sessionId: round.sessionId,
              teamId: participantInfo.teamId,
              gameType: 'quiz',
            },
            orderBy: { recordedAt: 'desc' },
          });

          const cumulativeValue = (latestQuizScore?.value ?? 0) + scoringResult.result.totalPoints;

          // Create score record even for 0 points to track all answers
          console.log(`[QuizService] Creating score record for ${participantInfo.displayName} (team: ${participantInfo.teamId}): delta=${scoringResult.result.totalPoints}, cumulative=${cumulativeValue}, correct=${isCorrect}`);

          // eslint-disable-next-line no-await-in-loop
          const scoreRecord = await (this.prisma as any).score.create({
            data: {
              sessionId: round.sessionId,
              teamId: participantInfo.teamId,
              value: cumulativeValue, // Use cumulative value for THIS game only
              delta: scoringResult.result.totalPoints,
              reason: isCorrect ? `Correct answer to question ${round.questionId}` : `Incorrect answer to question ${round.questionId}`,
              recordedBy: answer.participantId,
              gameType: 'quiz',
              gameId: round.id, // Use the quiz round ID as gameId
            },
          });

          console.log(`[QuizService] Score record created:`, scoreRecord);

          // Track for animation events - emit for ALL answers (correct and wrong)
          // This ensures sounds play and animations show even for 0-point answers
          scoreUpdates.push({
            participantId: answer.participantId,
            teamId: participantInfo.teamId,
            delta: scoringResult.result.totalPoints,
            newTotal: cumulativeValue, // Use game-specific cumulative
          });
        }
      }
    }
    
    // Return both the round state and score updates for animation
    return { round: await this.fetchActiveRound(sessionId), scoreUpdates };

    return this.fetchActiveRound(sessionId);
  }

  async get(sessionId: string) {
    const quizState = await this.fetchActiveRound(sessionId);
    if (!quizState) return null;

    // Check if session has buzzer mode enabled
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
    }) as any;

    // Include buzzer state if buzzer mode is enabled
    if (session?.playerEngagementType === 'BUZZER') {
      const buzzerState = this.buzzerStates.get(sessionId);
      if (buzzerState) {
        return {
          ...quizState,
          buzzerState,
        };
      }
    }

    return quizState;
  }

  // Buzzer Mode Methods
  private buzzerStates = new Map<string, {
    isOpen: boolean;
    buzzPresses: Array<{
      participantId: string;
      participantName: string;
      teamId: string | null;
      teamName: string | null;
      teamColor: string | null;
      timestamp: string;
    }>;
    firstBuzzerId: string | null;
    lockedForParticipantId: string | null;
    buzzerOpenedAt: string | null;
    timerDuration: number;
  }>();

  async pressBuzzer(sessionId: string, participantId: string) {
    // Require active quiz for buzzer
    const quizState = await this.get(sessionId);
    if (!quizState || !quizState.questionId) {
      throw new BadRequestException('No active quiz - start a quiz before using the buzzer');
    }
    
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
    }) as any;
    
    if (session?.playerEngagementType !== 'BUZZER') {
      throw new BadRequestException('Buzzer mode not enabled for this session');
    }

    let buzzerState = this.buzzerStates.get(sessionId);
    if (!buzzerState || !buzzerState.isOpen) {
      throw new BadRequestException('Buzzer is not open');
    }

    // Check if this participant already buzzed
    const alreadyBuzzed = buzzerState.buzzPresses.some(bp => bp.participantId === participantId);
    if (alreadyBuzzed) {
      throw new BadRequestException('You already pressed the buzzer');
    }

    // Check if buzzer is locked for someone else
    if (buzzerState.lockedForParticipantId && buzzerState.lockedForParticipantId !== participantId) {
      throw new BadRequestException('Buzzer is locked for another participant');
    }

    // Get participant info with team
    const participant = await this.prisma.participant.findUnique({
      where: { id: participantId },
      include: { team: true },
    });

    if (!participant || participant.sessionId !== sessionId) {
      throw new NotFoundException('Participant not found in session');
    }

    // Add buzzer press
    const buzzerPress = {
      participantId: participant.id,
      participantName: participant.displayName,
      teamId: participant.teamId,
      teamName: participant.team?.name || null,
      teamColor: participant.team?.color || null,
      timestamp: new Date().toISOString(),
    };

    buzzerState.buzzPresses.push(buzzerPress);

    // Lock buzzer for first press
    if (!buzzerState.firstBuzzerId) {
      buzzerState.firstBuzzerId = participantId;
      buzzerState.lockedForParticipantId = participantId;
      buzzerState.isOpen = false; // Close buzzer after first press
    }

    this.buzzerStates.set(sessionId, buzzerState);

    // Return updated quiz state with buzzer state
    return {
      ...quizState,
      buzzerState,
    };
  }

  async openBuzzer(sessionId: string) {
    // Require active quiz for buzzer
    const quizState = await this.get(sessionId);
    if (!quizState || !quizState.questionId) {
      throw new BadRequestException('No active quiz - start a quiz before opening the buzzer');
    }

    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
    }) as any;
    
    if (session?.playerEngagementType !== 'BUZZER') {
      throw new BadRequestException('Buzzer mode not enabled for this session');
    }

    const buzzerState = this.buzzerStates.get(sessionId) || {
      isOpen: false,
      buzzPresses: [],
      firstBuzzerId: null,
      lockedForParticipantId: null,
      buzzerOpenedAt: null,
      timerDuration: 30,
    };

    buzzerState.isOpen = true;
    buzzerState.buzzerOpenedAt = new Date().toISOString();
    this.buzzerStates.set(sessionId, buzzerState);

    // Auto-close after timer duration
    setTimeout(() => {
      const currentState = this.buzzerStates.get(sessionId);
      if (currentState?.isOpen && currentState.buzzerOpenedAt === buzzerState.buzzerOpenedAt) {
        currentState.isOpen = false;
        this.buzzerStates.set(sessionId, currentState);
      }
    }, buzzerState.timerDuration * 1000);

    return {
      ...quizState,
      buzzerState,
    };
  }

  async closeBuzzer(sessionId: string) {
    const quizState = await this.get(sessionId);

    const buzzerState = this.buzzerStates.get(sessionId);
    if (!buzzerState) {
      throw new BadRequestException('Buzzer state not found');
    }

    buzzerState.isOpen = false;
    this.buzzerStates.set(sessionId, buzzerState);

    return {
      ...quizState,
      buzzerState,
    };
  }

  async resetBuzzer(sessionId: string) {
    const quizState = await this.get(sessionId);

    const buzzerState = {
      isOpen: false,
      buzzPresses: [],
      firstBuzzerId: null,
      lockedForParticipantId: null,
      buzzerOpenedAt: null,
      timerDuration: 30,
    };

    this.buzzerStates.set(sessionId, buzzerState);

    return {
      ...quizState,
      buzzerState,
    };
  }

  async overrideBuzzerControl(sessionId: string, participantId: string) {
    const quizState = await this.get(sessionId);

    const buzzerState = this.buzzerStates.get(sessionId);
    if (!buzzerState) {
      throw new BadRequestException('Buzzer state not found');
    }

    // Verify participant exists in session
    const participant = await this.prisma.participant.findUnique({
      where: { id: participantId },
    });

    if (!participant || participant.sessionId !== sessionId) {
      throw new NotFoundException('Participant not found in session');
    }

    // Override lock to this participant
    buzzerState.lockedForParticipantId = participantId;
    buzzerState.isOpen = false; // Close buzzer when overriding
    this.buzzerStates.set(sessionId, buzzerState);

    return {
      ...quizState,
      buzzerState,
    };
  }

  async resetSession(sessionId: string) {
    // Remove all quiz rounds and answers linked to this session
    await (this.prisma as any).quizAnswer.deleteMany({
      where: {
        quizRound: {
          sessionId,
        },
      },
    });

    await (this.prisma as any).quizRound.deleteMany({
      where: { sessionId },
    });

    // Clear any in-memory buzzer state
    this.buzzerStates.delete(sessionId);
  }
}
