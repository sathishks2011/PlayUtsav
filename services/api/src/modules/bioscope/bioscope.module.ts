import { Module } from '@nestjs/common';
import { BioscopeController } from './bioscope.controller';
import { BioscopeService } from './services/bioscope.service';
import { BioscopeGateway } from './bioscope.gateway';
import { PrismaService } from '../../prisma.service';
import { SessionsService } from '../../services/sessions.service';
import { SessionScoringService } from '../../services/scoring/session-scoring.service';
import { ScoringConfigService } from '../../services/scoring/scoring-config.service';
import { SessionGateway } from '../../gateways/session.gateway';

import { BioscopeBuzzerController } from './bioscope.buzzer.controller';

@Module({
  controllers: [BioscopeController, BioscopeBuzzerController],
  providers: [
    BioscopeService, 
    BioscopeGateway, 
    PrismaService, 
    SessionsService, 
    SessionScoringService, 
    ScoringConfigService,
    SessionGateway
  ],
  exports: [BioscopeService, BioscopeGateway],
})
export class BioscopeModule {}
