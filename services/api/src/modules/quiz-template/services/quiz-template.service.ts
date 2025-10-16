import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma.service';
import {
  QuizTemplateDTO,
  QuizTemplateResponse,
  QuizCategoryResponse,
  QuizQuestionResponse,
} from '../dto/quiz-template.dto';
import { QuizTemplateValidationService } from './quiz-template-validation.service';

@Injectable()
export class QuizTemplateService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly validation: QuizTemplateValidationService,
  ) {}

  /**
   * Create a new quiz template from uploaded JSON
   */
  async createTemplate(hostId: string, templateData: QuizTemplateDTO): Promise<QuizTemplateResponse> {
    // Validate template
    this.validation.validateOrThrow(templateData);

    // Create template with categories and questions
    const template = await (this.prisma as any).quizTemplate.create({
      data: {
        hostId,
        name: templateData.templateName,
        description: templateData.templateDescription || null,
        categories: {
          create: templateData.categories.map((category) => ({
            name: category.categoryName,
            displayOrder: category.displayOrder,
            questions: {
              create: category.questions.map((question) => ({
                question: question.question,
                options: JSON.stringify(question.options),
                correctAnswer: question.correctAnswer,
                displayOrder: question.displayOrder,
                difficulty: question.difficulty || 'MEDIUM',
                points: question.points || 100,
                timeLimit: question.timeLimit || 30,
                explanation: question.explanation || null,
                imageUrl: question.imageUrl || null,
              })),
            },
          })),
        },
      },
      include: {
        categories: {
          include: {
            questions: true,
          },
          orderBy: {
            displayOrder: 'asc',
          },
        },
      },
    });

    return this.mapToResponse(template);
  }

  /**
   * Get all templates for a host
   */
  async getTemplatesByHost(hostId: string): Promise<QuizTemplateResponse[]> {
    const templates = await (this.prisma as any).quizTemplate.findMany({
      where: { hostId },
      include: {
        categories: {
          include: {
            questions: true,
          },
          orderBy: {
            displayOrder: 'asc',
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return templates.map((template) => this.mapToResponse(template));
  }

  /**
   * Get a specific template by ID
   */
  async getTemplateById(templateId: string, hostId: string): Promise<QuizTemplateResponse> {
    const template = await (this.prisma as any).quizTemplate.findFirst({
      where: {
        id: templateId,
        hostId,
      },
      include: {
        categories: {
          include: {
            questions: true,
          },
          orderBy: {
            displayOrder: 'asc',
          },
        },
      },
    });

    if (!template) {
      throw new NotFoundException('Template not found');
    }

    return this.mapToResponse(template);
  }

  /**
   * Update a question in a template
   */
  async updateQuestion(
    questionId: string,
    hostId: string,
    updateData: Partial<QuizQuestionResponse>
  ): Promise<QuizQuestionResponse> {
    // Verify the question belongs to this host
    const question = await (this.prisma as any).quizQuestion.findFirst({
      where: { id: questionId },
      include: {
        category: {
          include: {
            template: true,
          },
        },
      },
    });

    if (!question || question.category.template.hostId !== hostId) {
      throw new NotFoundException('Question not found');
    }

    // Prepare update data
    const data: any = {};
    if (updateData.question !== undefined) data.question = updateData.question;
    if (updateData.options !== undefined) data.options = JSON.stringify(updateData.options);
    if (updateData.correctAnswer !== undefined) data.correctAnswer = updateData.correctAnswer;
    if (updateData.displayOrder !== undefined) data.displayOrder = updateData.displayOrder;
    if (updateData.difficulty !== undefined) data.difficulty = updateData.difficulty;
    if (updateData.points !== undefined) data.points = updateData.points;
    if (updateData.timeLimit !== undefined) data.timeLimit = updateData.timeLimit;
    if (updateData.explanation !== undefined) data.explanation = updateData.explanation;
    if (updateData.imageUrl !== undefined) data.imageUrl = updateData.imageUrl;

    const updated = await (this.prisma as any).quizQuestion.update({
      where: { id: questionId },
      data,
    });

    return QuizTemplateService.mapQuestionToResponse(updated);
  }

  /**
   * Delete a template
   */
  async deleteTemplate(templateId: string, hostId: string): Promise<void> {
    const template = await (this.prisma as any).quizTemplate.findFirst({
      where: {
        id: templateId,
        hostId,
      },
    });

    if (!template) {
      throw new NotFoundException('Template not found');
    }

    await (this.prisma as any).quizTemplate.delete({
      where: { id: templateId },
    });
  }

  /**
   * Get questions by category
   */
  async getQuestionsByCategory(categoryId: string, hostId: string): Promise<QuizQuestionResponse[]> {
    const category = await (this.prisma as any).quizCategory.findFirst({
      where: { id: categoryId },
      include: {
        template: true,
        questions: {
          orderBy: {
            displayOrder: 'asc',
          },
        },
      },
    });

    if (!category || category.template.hostId !== hostId) {
      throw new NotFoundException('Category not found');
    }

    return category.questions.map(QuizTemplateService.mapQuestionToResponse);
  }

  /**
   * Map database model to response DTO
   */
  private mapToResponse(template: any): QuizTemplateResponse {
    return {
      id: template.id,
      hostId: template.hostId,
      name: template.name,
      description: template.description,
      categories: template.categories.map(this.mapCategoryToResponse),
      createdAt: template.createdAt.toISOString(),
      updatedAt: template.updatedAt.toISOString(),
    };
  }

  /**
   * Map category to response DTO
   */
  private mapCategoryToResponse(category: any): QuizCategoryResponse {
    return {
      id: category.id,
      name: category.name,
      displayOrder: category.displayOrder,
      questions: category.questions.map(QuizTemplateService.mapQuestionToResponse),
    };
  }

  /**
   * Map question to response DTO
   */
  private static mapQuestionToResponse(question: any): QuizQuestionResponse {
    return {
      id: question.id,
      question: question.question,
      options: typeof question.options === 'string' ? JSON.parse(question.options) : question.options,
      correctAnswer: question.correctAnswer,
      displayOrder: question.displayOrder,
      difficulty: question.difficulty,
      points: question.points,
      timeLimit: question.timeLimit,
      explanation: question.explanation,
      imageUrl: question.imageUrl,
      createdAt: question.createdAt.toISOString(),
      updatedAt: question.updatedAt.toISOString(),
    };
  }
}
