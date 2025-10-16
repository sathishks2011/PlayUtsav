import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Param,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { QuizTemplateService } from './services/quiz-template.service';
import {
  QuizTemplateDTO,
  QuizTemplateResponse,
  QuizQuestionResponse,
} from './dto/quiz-template.dto';

/**
 * Quiz Template Controller
 * Handles template upload, management, and question editing
 */
@Controller('quiz-templates')
export class QuizTemplateController {
  constructor(private readonly templateService: QuizTemplateService) {}

  /**
   * Upload a new quiz template
   * POST /quiz-templates
   */
  @Post()
  async uploadTemplate(
    @Body() templateData: QuizTemplateDTO,
    @Request() req: any,
  ): Promise<QuizTemplateResponse> {
    // TODO: Get hostId from authenticated user
    // For now, assuming hostId is passed or defaulting
    const hostId = req.user?.id || req.body?.hostId || 'default-host';
    return this.templateService.createTemplate(hostId, templateData);
  }

  /**
   * Get all templates for the current host
   * GET /quiz-templates
   */
  @Get()
  async getMyTemplates(@Request() req: any): Promise<QuizTemplateResponse[]> {
    const hostId = req.user?.id || req.query?.hostId || 'default-host';
    return this.templateService.getTemplatesByHost(hostId);
  }

  /**
   * Get a specific template by ID
   * GET /quiz-templates/:templateId
   */
  @Get(':templateId')
  async getTemplate(
    @Param('templateId') templateId: string,
    @Request() req: any,
  ): Promise<QuizTemplateResponse> {
    const hostId = req.user?.id || req.query?.hostId || 'default-host';
    return this.templateService.getTemplateById(templateId, hostId);
  }

  /**
   * Update a question
   * PUT /quiz-templates/questions/:questionId
   */
  @Put('questions/:questionId')
  async updateQuestion(
    @Param('questionId') questionId: string,
    @Body() updateData: Partial<QuizQuestionResponse>,
    @Request() req: any,
  ): Promise<QuizQuestionResponse> {
    const hostId = req.user?.id || req.body?.hostId || 'default-host';
    return this.templateService.updateQuestion(questionId, hostId, updateData);
  }

  /**
   * Delete a template
   * DELETE /quiz-templates/:templateId
   */
  @Delete(':templateId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteTemplate(
    @Param('templateId') templateId: string,
    @Request() req: any,
  ): Promise<void> {
    const hostId = req.user?.id || req.query?.hostId || 'default-host';
    await this.templateService.deleteTemplate(templateId, hostId);
  }

  /**
   * Get questions by category
   * GET /quiz-templates/categories/:categoryId/questions
   */
  @Get('categories/:categoryId/questions')
  async getQuestionsByCategory(
    @Param('categoryId') categoryId: string,
    @Request() req: any,
  ): Promise<QuizQuestionResponse[]> {
    const hostId = req.user?.id || req.query?.hostId || 'default-host';
    return this.templateService.getQuestionsByCategory(categoryId, hostId);
  }
}
