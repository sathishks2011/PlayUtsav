export type ParticipantRole = 'HOST' | 'PLAYER' | 'SPECTATOR';

export type Participant = {
  id: string;
  sessionId: string;
  teamId?: string | null;
  displayName: string;
  role: ParticipantRole;
  joinedAt: string;
};

export type Team = {
  id: string;
  sessionId: string;
  name: string;
  color?: string | null;
  createdAt: string;
  participants: Participant[];
};

export type Score = {
  id: string;
  sessionId: string;
  teamId?: string | null;
  value: number;
  delta: number;
  reason?: string | null;
  recordedBy?: string | null;
  recordedAt: string;
};

export type SessionStatus = 'LOBBY' | 'ACTIVE' | 'ENDED';

export type PlayerEngagementType = 'CHOICE_ANSWER' | 'BUZZER' | 'VOICE_ANSWER';

export type BuzzerPress = {
  participantId: string;
  participantName: string;
  teamId: string | null;
  teamName: string | null;
  teamColor: string | null;
  timestamp: string;
};

export type BuzzerState = {
  isOpen: boolean; // Can players buzz now?
  buzzPresses: BuzzerPress[]; // All buzzer presses in order
  firstBuzzerId?: string; // ID of first buzzer
  lockedForParticipantId?: string | null; // Who has control to answer (null = anyone can buzz)
  buzzerOpenedAt?: string; // When buzzer was opened
  timerDuration: number; // Buzzer timer in seconds (default 30)
};

export type Session = {
  id: string;
  code: string;
  status: SessionStatus;
  hostName?: string | null;
  maxPlayers: number;
  language: string;
  playerEngagementType: PlayerEngagementType;
  createdAt: string;
  updatedAt: string;
  teams: Team[];
  participants: Participant[];
  scores: Score[];
};

export type Theme = {
  name: string;
  variables: Record<string, string>;
};

export type QuizState = {
  sessionId: string;
  questionId: string;
  prompt: string;
  options: string[];
  status: 'idle' | 'running' | 'revealed';
  correctOption: number | null;
  duration: number;
  createdAt: string;
  answers: Array<{ participantId: string; answer: number; displayName: string }>;
  buzzerState?: BuzzerState; // Only present when playerEngagementType is BUZZER
};

export type ScoreAnimationEvent = {
  teamId: string;
  points: number;
  isBonus: boolean;
  timestamp: number;
  reason?: string;
};
