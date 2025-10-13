import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { z } from 'zod';
import { ScoringConfigService, CreateScoringConfigInput, UpdateScoringConfigInput } from '../services/scoring/scoring-config.service';
import { SessionScoringService } from '../services/scoring/session-scoring.service';
import { JwtAuthGuard } from '../auth/jwtAuth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import { ScoringConfig, ScoringMode } from '@pkg/core';

const CreateConfigDto = z.object({
  name: z.string().min(3).max(100),
  description: z.string().max(500).optional(),
  mode: z.nativeEnum(ScoringMode),
  config: z.any(), // Validated as ScoringConfig on the service layer
  isDefault: z.boolean().optional(),
});

const UpdateConfigDto = CreateConfigDto.partial();

const AttachConfigDto = z.object({
  configId: z.string().cuid(),
});

@Controller('/scoring')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ScoringController {
  constructor(
    private readonly configService: ScoringConfigService,
    private readonly sessionScoringService: SessionScoringService,
  ) {}

  @Get('/configs')
  @Roles('HOST', 'ADMIN')
  async listHostConfigs(@CurrentUser() user: { userId: string }) {
    return this.configService.listHostConfigs(user.userId);
  }

  @Post('/configs')
  @Roles('HOST', 'ADMIN')
  async createConfig(@CurrentUser() user: { userId: string }, @Body() body: unknown) {
    const parsed = CreateConfigDto.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    const input: CreateScoringConfigInput = {
      ...parsed.data,
      hostId: user.userId,
      config: parsed.data.config as ScoringConfig,
    };
    return this.configService.createConfig(input);
  }

  @Put('/configs/:id')
  @Roles('HOST', 'ADMIN')
  async updateConfig(
    @CurrentUser() user: { userId: string },
    @Param('id') configId: string,
    @Body() body: unknown,
  ) {
    const parsed = UpdateConfigDto.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    return this.configService.updateConfig(configId, user.userId, parsed.data as UpdateScoringConfigInput);
  }

  @Delete('/configs/:id')
  @Roles('HOST', 'ADMIN')
  async deleteConfig(@CurrentUser() user: { userId: string }, @Param('id') configId: string) {
    await this.configService.deleteConfig(configId, user.userId);
    return { success: true };
  }

  @Post('/session/:sessionId/attach')
  @Roles('HOST', 'ADMIN')
  async attachConfig(
    @CurrentUser() user: { userId: string },
    @Param('sessionId') sessionId: string,
    @Body() body: unknown,
  ) {
    const parsed = AttachConfigDto.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    return this.sessionScoringService.attachConfigToSession({
      sessionId,
      hostId: user.userId,
      configId: parsed.data.configId,
    });
  }
}
