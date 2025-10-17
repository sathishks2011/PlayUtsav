import { Module } from '@nestjs/common';
import { BioscopeController } from './bioscope.controller';
import { BioscopeService } from './services/bioscope.service';
import { BioscopeGateway } from './bioscope.gateway';
import { PrismaService } from '../../prisma.service';

@Module({
  controllers: [BioscopeController],
  providers: [BioscopeService, BioscopeGateway, PrismaService],
  exports: [BioscopeService, BioscopeGateway],
})
export class BioscopeModule {}
