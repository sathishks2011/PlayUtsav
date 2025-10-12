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

export type Session = {
  id: string;
  code: string;
  status: SessionStatus;
  hostName?: string | null;
  maxPlayers: number;
  language: string;
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
