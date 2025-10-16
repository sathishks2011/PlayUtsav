import { Injectable, BadRequestException } from '@nestjs/common';
import {
  QuizTemplateDTO,
  QuizCategoryDTO,
  QuizQuestionDTO,
  ValidationError,
  TemplateValidationResult,
} from '../dto/quiz-template.dto';

@Injectable()
export class QuizTemplateValidationService {
  /**
   * Validate entire quiz template
   */
  validateTemplate(template: QuizTemplateDTO): TemplateValidationResult {
    const errors: ValidationError[] = [];

    // Validate template name
    if (!template.templateName || template.templateName.trim().length === 0) {
      errors.push({
        field: 'templateName',
        message: 'Template name is required',
      });
    } else if (template.templateName.length > 200) {
      errors.push({
        field: 'templateName',
        message: 'Template name must be 200 characters or less',
        value: template.templateName.length,
      });
    }

    // Validate categories
    if (!template.categories || template.categories.length === 0) {
      errors.push({
        field: 'categories',
        message: 'At least one category is required',
      });
    } else {
      // Check for duplicate display orders at category level
      const categoryOrders = template.categories.map((c) => c.displayOrder);
      const duplicateOrders = categoryOrders.filter(
        (order, index) => categoryOrders.indexOf(order) !== index
      );
      if (duplicateOrders.length > 0) {
        errors.push({
          field: 'categories',
          message: 'Category display orders must be unique',
          value: duplicateOrders,
        });
      }

      // Validate each category
      template.categories.forEach((category, index) => {
        const categoryErrors = this.validateCategory(category, index);
        errors.push(...categoryErrors);
      });
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate a single category
   */
  private validateCategory(
    category: QuizCategoryDTO,
    categoryIndex: number
  ): ValidationError[] {
    const errors: ValidationError[] = [];
    const prefix = `categories[${categoryIndex}]`;

    // Validate category name
    if (!category.categoryName || category.categoryName.trim().length === 0) {
      errors.push({
        field: `${prefix}.categoryName`,
        message: 'Category name is required',
      });
    } else if (category.categoryName.length > 100) {
      errors.push({
        field: `${prefix}.categoryName`,
        message: 'Category name must be 100 characters or less',
        value: category.categoryName.length,
      });
    }

    // Validate display order
    if (
      category.displayOrder == null ||
      !Number.isInteger(category.displayOrder) ||
      category.displayOrder < 1
    ) {
      errors.push({
        field: `${prefix}.displayOrder`,
        message: 'Display order must be a positive integer',
        value: category.displayOrder,
      });
    }

    // Validate questions
    if (!category.questions || category.questions.length === 0) {
      errors.push({
        field: `${prefix}.questions`,
        message: 'At least one question is required per category',
      });
    } else {
      // Check for duplicate display orders at question level
      const questionOrders = category.questions.map((q) => q.displayOrder);
      const duplicateOrders = questionOrders.filter(
        (order, index) => questionOrders.indexOf(order) !== index
      );
      if (duplicateOrders.length > 0) {
        errors.push({
          field: `${prefix}.questions`,
          message: 'Question display orders must be unique within category',
          value: duplicateOrders,
        });
      }

      // Validate each question
      category.questions.forEach((question, qIndex) => {
        const questionErrors = this.validateQuestion(
          question,
          categoryIndex,
          qIndex
        );
        errors.push(...questionErrors);
      });
    }

    return errors;
  }

  /**
   * Validate a single question
   */
  private validateQuestion(
    question: QuizQuestionDTO,
    categoryIndex: number,
    questionIndex: number
  ): ValidationError[] {
    const errors: ValidationError[] = [];
    const prefix = `categories[${categoryIndex}].questions[${questionIndex}]`;

    // Validate question text
    if (!question.question || question.question.trim().length === 0) {
      errors.push({
        field: `${prefix}.question`,
        message: 'Question text is required',
      });
    } else if (question.question.length > 500) {
      errors.push({
        field: `${prefix}.question`,
        message: 'Question text must be 500 characters or less',
        value: question.question.length,
      });
    }

    // Validate options
    if (!question.options || !Array.isArray(question.options)) {
      errors.push({
        field: `${prefix}.options`,
        message: 'Options must be an array',
      });
    } else {
      if (question.options.length < 2) {
        errors.push({
          field: `${prefix}.options`,
          message: 'At least 2 options are required',
          value: question.options.length,
        });
      } else if (question.options.length > 6) {
        errors.push({
          field: `${prefix}.options`,
          message: 'Maximum 6 options allowed',
          value: question.options.length,
        });
      }

      // Validate each option
      question.options.forEach((option, optIndex) => {
        if (!option || option.trim().length === 0) {
          errors.push({
            field: `${prefix}.options[${optIndex}]`,
            message: 'Option text cannot be empty',
          });
        } else if (option.length > 200) {
          errors.push({
            field: `${prefix}.options[${optIndex}]`,
            message: 'Option text must be 200 characters or less',
            value: option.length,
          });
        }
      });
    }

    // Validate correct answer
    if (question.correctAnswer == null || !Number.isInteger(question.correctAnswer)) {
      errors.push({
        field: `${prefix}.correctAnswer`,
        message: 'Correct answer index is required and must be an integer',
        value: question.correctAnswer,
      });
    } else if (
      question.correctAnswer < 0 ||
      question.correctAnswer >= question.options.length
    ) {
      errors.push({
        field: `${prefix}.correctAnswer`,
        message: `Correct answer index must be between 0 and ${question.options.length - 1}`,
        value: question.correctAnswer,
      });
    }

    // Validate display order
    if (
      question.displayOrder == null ||
      !Number.isInteger(question.displayOrder) ||
      question.displayOrder < 1
    ) {
      errors.push({
        field: `${prefix}.displayOrder`,
        message: 'Display order must be a positive integer',
        value: question.displayOrder,
      });
    }

    // Validate difficulty (optional)
    if (question.difficulty) {
      const validDifficulties = ['EASY', 'MEDIUM', 'HARD'];
      if (!validDifficulties.includes(question.difficulty)) {
        errors.push({
          field: `${prefix}.difficulty`,
          message: 'Difficulty must be EASY, MEDIUM, or HARD',
          value: question.difficulty,
        });
      }
    }

    // Validate points (optional)
    if (question.points != null) {
      if (!Number.isInteger(question.points) || question.points < 1 || question.points > 1000) {
        errors.push({
          field: `${prefix}.points`,
          message: 'Points must be an integer between 1 and 1000',
          value: question.points,
        });
      }
    }

    // Validate time limit (optional)
    if (question.timeLimit != null) {
      if (
        !Number.isInteger(question.timeLimit) ||
        question.timeLimit < 10 ||
        question.timeLimit > 300
      ) {
        errors.push({
          field: `${prefix}.timeLimit`,
          message: 'Time limit must be an integer between 10 and 300 seconds',
          value: question.timeLimit,
        });
      }
    }

    // Validate explanation (optional)
    if (question.explanation && question.explanation.length > 1000) {
      errors.push({
        field: `${prefix}.explanation`,
        message: 'Explanation must be 1000 characters or less',
        value: question.explanation.length,
      });
    }

    // Validate image URL (optional)
    if (question.imageUrl && question.imageUrl.length > 500) {
      errors.push({
        field: `${prefix}.imageUrl`,
        message: 'Image URL must be 500 characters or less',
        value: question.imageUrl.length,
      });
    }

    return errors;
  }

  /**
   * Validate and throw if invalid
   */
  validateOrThrow(template: QuizTemplateDTO): void {
    const result = this.validateTemplate(template);
    if (!result.valid) {
      const errorMessages = result.errors
        .map((err) => `${err.field}: ${err.message}`)
        .join('; ');
      throw new BadRequestException(`Template validation failed: ${errorMessages}`);
    }
  }
}
