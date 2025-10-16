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
  hostId?: string | null;
  maxPlayers: number;
  language: string;
  playerEngagementType: PlayerEngagementType;
  quizTemplateId?: string | null;
  currentCategoryIndex?: number;
  currentQuestionIndex?: number;
  createdAt: string;
  updatedAt: string;
  teams: Team[];
  participants: Participant[];
  scores: Score[];
  quizTemplate?: QuizTemplateResponse;
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

// Quiz Template Types
export type QuizDifficulty = 'EASY' | 'MEDIUM' | 'HARD';

export type QuizQuestionDTO = {
  question: string;
  options: string[];
  correctAnswer: number;
  displayOrder: number;
  difficulty?: QuizDifficulty;
  points?: number;
  timeLimit?: number;
  explanation?: string;
  imageUrl?: string;
};

export type QuizCategoryDTO = {
  categoryName: string;
  displayOrder: number;
  questions: QuizQuestionDTO[];
};

export type QuizTemplateDTO = {
  templateName: string;
  templateDescription?: string;
  categories: QuizCategoryDTO[];
};

export type QuestionResponse = {
  id: string;
  categoryId: string;
  question: string;
  options: string[];
  correctAnswer: number;
  displayOrder: number;
  difficulty?: QuizDifficulty;
  points?: number;
  timeLimit?: number;
  explanation?: string;
  imageUrl?: string;
  createdAt: string;
  updatedAt: string;
};

export type CategoryResponse = {
  id: string;
  templateId: string;
  name: string;
  displayOrder: number;
  questions: QuestionResponse[];
  createdAt: string;
  updatedAt: string;
};

export type QuizTemplateResponse = {
  id: string;
  hostId: string;
  name: string;
  description?: string;
  categories: CategoryResponse[];
  createdAt: string;
  updatedAt: string;
};

export type UpdateQuestionDTO = {
  question?: string;
  options?: string[];
  correctAnswer?: number;
  displayOrder?: number;
  difficulty?: QuizDifficulty;
  points?: number;
  timeLimit?: number;
  explanation?: string;
  imageUrl?: string;
};

export type ValidationError = {
  field: string;
  message: string;
};

export type TemplateValidationResult = {
  isValid: boolean;
  errors: ValidationError[];
};

// Quiz Round Integration Types
export type RoundInfo = {
  session: {
    id: string;
    currentCategoryIndex: number;
    currentQuestionIndex: number;
  };
  template: {
    id: string;
    name: string;
  };
  currentCategory: {
    id: string;
    name: string;
    displayOrder: number;
  };
  questions: QuestionResponse[];
  totalCategories: number;
};

export type AttachTemplateRequest = {
  templateId: string;
};

export type UpdateRoundRequest = {
  categoryIndex: number;
  questionIndex: number;
};
