import { Module } from '@nestjs/common';
import { AppController } from '../routes/app.controller';
import { SessionsController } from '../routes/sessions.controller';
import { QuizController } from '../routes/quiz.controller';
import { ScoringController } from '../routes/scoring.controller'; // Import new controller
import { PrismaService } from '../prisma.service';
import { SessionsService } from '../services/sessions.service';
import { QuizService } from '../services/quiz.service';
import { SessionGateway } from '../gateways/session.gateway';
import { AuthModule } from '../auth/auth.module';
import { QuizTemplateModule } from './quiz-template/quiz-template.module';
import { ScoringConfigService } from '../services/scoring/scoring-config.service';
import { SessionScoringService } from '../services/scoring/session-scoring.service';
import { ScoreCalculationService } from '../services/scoring/score-calculation.service';

@Module({
  imports: [AuthModule, QuizTemplateModule],
  controllers: [
    AppController,
    SessionsController,
    QuizController,
    ScoringController, // Add new controller
  ],
  providers: [
    PrismaService,
    SessionsService,
    QuizService,
    SessionGateway,
    ScoringConfigService,
    SessionScoringService,
    ScoreCalculationService,
  ],
})
export class AppModule {}
