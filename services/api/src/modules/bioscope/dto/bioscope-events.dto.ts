// WebSocket Event Names
export const BIOSCOPE_EVENTS = {
  // Server -> Client
  GAME_STARTED: 'bioscope:game-started',
  IMAGE_REVEALED: 'bioscope:image-revealed',
  ANSWER_REVEALED: 'bioscope:answer-revealed',
  ROUND_COMPLETE: 'bioscope:round-complete',
  SCORE_UPDATED: 'bioscope:score-updated',
  STATE_UPDATED: 'bioscope:state-updated',
  TIMER_TICK: 'bioscope:timer-tick',
  GAME_COMPLETED: 'bioscope:game-completed',
  
  // Client -> Server
  REVEAL_IMAGE: 'bioscope:reveal-image',
  REVEAL_ANSWER: 'bioscope:reveal-answer',
  SUBMIT_ANSWER: 'bioscope:submit-answer',
  MANUAL_SCORE: 'bioscope:manual-score',
  NEXT_ROUND: 'bioscope:next-round',
} as const;

// Event Payload Types
export interface BioscopeGameStartedEvent {
  bioscopeId: string;
  sessionId: string;
  templateName: string;
  round: {
    roundId: string;
    title: string;
    totalImages: number;
  };
  configuration: {
    timerSeconds: number;
    timerSoundEnabled: boolean;
    allowManualScoring: boolean;
  };
}

export interface BioscopeImageRevealedEvent {
  bioscopeId: string;
  sessionId: string;
  roundId: string;
  imageId: number;
  imageUrl: string;
  hint?: string;
  revealedImages: number[];
  totalImages: number;
  timerStartedAt: Date;
  timerDuration: number;
}

export interface BioscopeAnswerRevealedEvent {
  bioscopeId: string;
  sessionId: string;
  roundId: string;
  answer: {
    title: string;
    alternatives?: string[];
  };
  correctAnswers: Array<{
    participantId: string;
    participantName: string;
    pointsAwarded: number;
    imageRevealedAt: number;
  }>;
  allImages: string[];
}

export interface BioscopeRoundCompleteEvent {
  bioscopeId: string;
  sessionId: string;
  roundId: string;
  roundTitle: string;
  correctAnswer: string;
  results: Array<{
    participantId: string;
    participantName: string;
    answer: string;
    isCorrect: boolean;
    pointsAwarded: number;
    imageRevealedAt: number;
  }>;
  hasNextRound: boolean;
}

export interface BioscopeScoreUpdatedEvent {
  bioscopeId: string;
  sessionId: string;
  participantId: string;
  participantName: string;
  points: number;
  totalScore: number;
  reason: 'correct_answer' | 'manual_score';
  imageRevealedAt?: number;
}

export interface BioscopeStateUpdatedEvent {
  bioscopeId: string;
  sessionId: string;
  status: 'idle' | 'revealing' | 'answering' | 'revealed' | 'completed';
  currentRoundId: number;
  currentImageId: number;
  revealedImages: number[];
  timeRemaining: number | null;
}

export interface BioscopeTimerTickEvent {
  bioscopeId: string;
  sessionId: string;
  timeRemaining: number;
  warningThreshold: boolean; // true if < 10 seconds
}

export interface BioscopeGameCompletedEvent {
  bioscopeId: string;
  sessionId: string;
  finalScores: Array<{
    participantId: string;
    participantName: string;
    totalPoints: number;
    correctAnswers: number;
    totalRounds: number;
  }>;
}

// Client -> Server Events
export interface RevealImagePayload {
  sessionId: string;
  imageId?: number;
}

export interface RevealAnswerPayload {
  sessionId: string;
}

export interface SubmitAnswerPayload {
  sessionId: string;
  participantId: string;
  participantName: string;
  answer: string;
}

export interface ManualScorePayload {
  sessionId: string;
  participantId: string;
  participantName: string;
  points: number;
  reason?: string;
}

export interface NextRoundPayload {
  sessionId: string;
}
