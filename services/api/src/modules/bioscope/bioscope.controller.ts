import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Param,
  Body,
  Request,
  HttpCode,
  HttpStatus,
  Query,
} from '@nestjs/common';
import { BioscopeService } from './services';
import { SessionGateway } from '../../gateways/session.gateway';
import {
  CreateBioscopeTemplateDto,
  UpdateBioscopeTemplateDto,
  StartBioscopeGameDto,
  RevealImageDto,
  RevealAnswerDto,
  SubmitBioscopeAnswerDto,
  ManualScoreDto,
  BioscopeStateDto,
  AttachBioscopeTemplateDto,
} from './dto';

/**
 * Bioscope Game Controller
 * Handles template management and game operations
 */
@Controller('bioscope')
export class BioscopeController {
  constructor(
    private readonly bioscopeService: BioscopeService,
    private readonly sessionGateway: SessionGateway,
  ) {}

  // ==================== Template Management ====================

  /**
   * Create a new Bioscope template
   * POST /bioscope/templates
   */
  @Post('templates')
  async createTemplate(
    @Body() dto: CreateBioscopeTemplateDto,
    @Request() req: any,
  ) {
    const hostId = req.user?.id || req.body?.hostId || 'default-host';
    return this.bioscopeService.createTemplate(hostId, dto);
  }

  /**
   * Get all templates for the current host (and public templates)
   * GET /bioscope/templates
   */
  @Get('templates')
  async getTemplates(
    @Request() req: any,
    @Query('includePublic') includePublic?: string,
  ) {
    const hostId = req.user?.id || req.query?.hostId || 'default-host';
    const includePublicTemplates = includePublic !== 'false';
    return this.bioscopeService.getTemplates(hostId, includePublicTemplates);
  }

  /**
   * Get a specific template by ID
   * GET /bioscope/templates/:id
   */
  @Get('templates/:id')
  async getTemplate(@Param('id') id: string, @Request() req: any) {
    const hostId = req.user?.id || req.query?.hostId;
    return this.bioscopeService.getTemplateById(id, hostId);
  }

  /**
   * Update a template
   * PUT /bioscope/templates/:id
   */
  @Put('templates/:id')
  async updateTemplate(
    @Param('id') id: string,
    @Body() dto: UpdateBioscopeTemplateDto,
    @Request() req: any,
  ) {
    const hostId = req.user?.id || req.body?.hostId || 'default-host';
    return this.bioscopeService.updateTemplate(id, hostId, dto);
  }

  /**
   * Delete a template
   * DELETE /bioscope/templates/:id
   */
  @Delete('templates/:id')
  @HttpCode(HttpStatus.OK)
  async deleteTemplate(@Param('id') id: string, @Request() req: any) {
    const hostId = req.user?.id || req.query?.hostId || 'default-host';
    return this.bioscopeService.deleteTemplate(id, hostId);
  }

  // ==================== Game Management ====================

  /**
   * Start a Bioscope game for a session
   * POST /bioscope/sessions/:sessionId/start
   */
  @Post('sessions/:sessionId/start')
  async startGame(
    @Param('sessionId') sessionId: string,
    @Body() dto: { templateId: string },
  ): Promise<BioscopeStateDto> {
    return this.bioscopeService.startGame(sessionId, dto.templateId);
  }

  /**
   * Reset a Bioscope game back to idle state
   * POST /bioscope/sessions/:sessionId/reset
   */
  @Post('sessions/:sessionId/reset')
  async resetGame(
    @Param('sessionId') sessionId: string,
  ): Promise<BioscopeStateDto> {
    return this.bioscopeService.resetGame(sessionId);
  }

  /**
   * Attach a template to a session (alternative endpoint)
   * POST /bioscope/templates/:id/attach
   */
  @Post('templates/:id/attach')
  async attachTemplate(
    @Param('id') templateId: string,
    @Body() dto: { sessionId: string },
  ): Promise<BioscopeStateDto> {
    return this.bioscopeService.startGame(dto.sessionId, templateId);
  }

  /**
   * Reveal next image or specific image
   * POST /bioscope/sessions/:sessionId/reveal-image
   */
  @Post('sessions/:sessionId/reveal-image')
  async revealImage(
    @Param('sessionId') sessionId: string,
    @Body() dto: { imageId?: number },
  ): Promise<BioscopeStateDto> {
    return this.bioscopeService.revealImage(sessionId, dto.imageId);
  }

  /**
   * Reveal the answer
   * POST /bioscope/sessions/:sessionId/reveal-answer
   */
  @Post('sessions/:sessionId/reveal-answer')
  async revealAnswer(
    @Param('sessionId') sessionId: string,
  ): Promise<BioscopeStateDto> {
    console.log('[BioscopeController] revealAnswer endpoint called for session:', sessionId);
    const result = await this.bioscopeService.revealAnswer(sessionId);

    console.log('[BioscopeController] Got', result.scoreUpdates.length, 'score updates from service');

    // Emit score:animated events for each score change (like quiz module does)
    for (const update of result.scoreUpdates) {
      console.log(`[BioscopeController] Emitting score:animated - teamId: ${update.teamId}, points: ${update.points}, participant: ${update.participantName}`);
      await this.sessionGateway.emitScoreAnimated(sessionId, {
        teamId: update.teamId,
        points: update.points,
        isBonus: update.points > 100, // Consider >100 points as bonus (early guess)
        reason: `${update.participantName} scored ${update.points} points`,
      });
    }

    // Trigger a session update so the frontend can fetch the latest scores
    console.log('[BioscopeController] Emitting session update');
    await this.sessionGateway.emitSessionUpdate(sessionId);

    console.log('[BioscopeController] revealAnswer completed');
    return result.gameState;
  }

  /**
   * Submit a player answer
   * POST /bioscope/sessions/:sessionId/submit
   */
  @Post('sessions/:sessionId/submit')
  async submitAnswer(
    @Param('sessionId') sessionId: string,
    @Body() dto: Omit<SubmitBioscopeAnswerDto, 'sessionId'>,
  ) {
    return this.bioscopeService.submitAnswer(
      sessionId,
      dto.participantId,
      dto.participantName,
      dto.answer,
    );
  }

  /**
   * Award manual score
   * POST /bioscope/sessions/:sessionId/manual-score
   */
  @Post('sessions/:sessionId/manual-score')
  async manualScore(
    @Param('sessionId') sessionId: string,
    @Body() dto: Omit<ManualScoreDto, 'sessionId'>,
  ) {
    const result = await this.bioscopeService.manualScore(
      sessionId,
      dto.participantId,
      dto.participantName,
      dto.points,
      dto.reason,
    );
    
    // Emit session update to sync scoreboard
    await this.sessionGateway.emitSessionUpdate(sessionId);
    
    return result;
  }

  /**
   * Move to next round
   * POST /bioscope/sessions/:sessionId/next-round
   */
  @Post('sessions/:sessionId/next-round')
  async nextRound(@Param('sessionId') sessionId: string) {
    return this.bioscopeService.nextRound(sessionId);
  }

  /**
   * Get current game state
   * GET /bioscope/sessions/:sessionId/state
   */
  @Get('sessions/:sessionId/state')
  async getGameState(
    @Param('sessionId') sessionId: string,
  ): Promise<BioscopeStateDto> {
    return this.bioscopeService.getGameState(sessionId);
  }
}
