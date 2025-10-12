import { Module } from '@nestjs/common';
import { AppController } from '../routes/app.controller';
import { SessionsController } from '../routes/sessions.controller';
import { QuizController } from '../routes/quiz.controller';
import { PrismaService } from '../prisma.service';
import { SessionsService } from '../services/sessions.service';
import { QuizService } from '../services/quiz.service';
import { SessionGateway } from '../gateways/session.gateway';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [AppController, SessionsController, QuizController],
  providers: [PrismaService, SessionsService, QuizService, SessionGateway],
})
export class AppModule {}
