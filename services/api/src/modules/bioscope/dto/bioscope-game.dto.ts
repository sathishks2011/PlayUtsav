import { IsString, IsInt, IsBoolean, IsOptional, Min } from 'class-validator';

export class StartBioscopeGameDto {
  @IsString()
  sessionId: string;

  @IsString()
  templateId: string;
}

export class RevealImageDto {
  @IsString()
  sessionId: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  imageId?: number; // If not provided, reveal next image
}

export class RevealAnswerDto {
  @IsString()
  sessionId: string;
}

export class SubmitBioscopeAnswerDto {
  @IsString()
  sessionId: string;

  @IsString()
  participantId: string;

  @IsString()
  participantName: string;

  @IsString()
  answer: string;
}

export class ManualScoreDto {
  @IsString()
  sessionId: string;

  @IsString()
  participantId: string;

  @IsString()
  participantName: string;

  @IsInt()
  @Min(0)
  points: number;

  @IsOptional()
  @IsString()
  reason?: string;
}

export class BioscopeStateDto {
  bioscopeId: string;
  sessionId: string;
  templateId: string;
  currentRoundId: number;
  currentImageId: number;
  status: 'idle' | 'revealing' | 'answering' | 'revealed' | 'completed';
  revealedImages: number[];
  timerStartedAt: Date | null;
  timerDuration: number;
  timeRemaining: number | null;
  template: {
    name: string;
    configuration: any;
    currentRound: any | null;
  };
  answers: Array<{
    participantId: string;
    participantName: string;
    answer: string;
    isCorrect: boolean;
    pointsAwarded: number;
    submittedAt: Date;
    imageRevealedAt: number;
  }>;
}

export class AttachBioscopeTemplateDto {
  @IsString()
  sessionId: string;

  @IsString()
  templateId: string;
}
