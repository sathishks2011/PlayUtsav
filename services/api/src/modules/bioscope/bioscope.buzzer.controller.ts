import { Controller, Post, Param, UseGuards, Body } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwtAuth.guard';
import { BioscopeService } from './services/bioscope.service';

@Controller('sessions/:sessionId/bioscope')
@UseGuards(JwtAuthGuard)
export class BioscopeBuzzerController {
  constructor(private readonly bioscopeService: BioscopeService) {}

  @Post('buzzer/open')
  async openBuzzer(@Param('sessionId') sessionId: string) {
    return this.bioscopeService.openBuzzer(sessionId);
  }

  @Post('buzzer/close')
  async closeBuzzer(@Param('sessionId') sessionId: string) {
    return this.bioscopeService.closeBuzzer(sessionId);
  }

  @Post('buzzer/reset')
  async resetBuzzer(@Param('sessionId') sessionId: string) {
    return this.bioscopeService.resetBuzzer(sessionId);
  }

  @Post('buzzer/press')
  async pressBuzzer(
    @Param('sessionId') sessionId: string,
    @Body('participantId') participantId: string,
  ) {
    return this.bioscopeService.pressBuzzer(sessionId, participantId);
  }
}
