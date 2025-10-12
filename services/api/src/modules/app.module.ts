import { Module } from '@nestjs/common';
import { AppController } from '../routes/app.controller';
import { SessionsController } from '../routes/sessions.controller';
import { PrismaService } from '../prisma.service';
import { SessionsService } from '../services/sessions.service';
import { SessionGateway } from '../gateways/session.gateway';

@Module({
  controllers: [AppController, SessionsController],
  providers: [PrismaService, SessionsService, SessionGateway],
})
export class AppModule {}
