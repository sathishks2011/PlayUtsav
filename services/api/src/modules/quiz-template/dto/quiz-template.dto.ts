/**
 * Quiz Template DTOs
 * Data Transfer Objects for quiz template upload and management
 */

export interface QuizQuestionDTO {
  question: string;
  options: string[];
  correctAnswer: number;
  displayOrder: number;
  difficulty?: 'EASY' | 'MEDIUM' | 'HARD';
  points?: number;
  timeLimit?: number;
  explanation?: string;
  imageUrl?: string;
}

export interface QuizCategoryDTO {
  categoryName: string;
  displayOrder: number;
  questions: QuizQuestionDTO[];
}

export interface QuizTemplateDTO {
  templateName: string;
  templateDescription?: string;
  categories: QuizCategoryDTO[];
}

export interface QuizTemplateResponse {
  id: string;
  hostId: string;
  name: string;
  description?: string;
  categories: QuizCategoryResponse[];
  createdAt: string;
  updatedAt: string;
}

export interface QuizCategoryResponse {
  id: string;
  name: string;
  displayOrder: number;
  questions: QuizQuestionResponse[];
}

export interface QuizQuestionResponse {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  displayOrder: number;
  difficulty?: string;
  points: number;
  timeLimit: number;
  explanation?: string;
  imageUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

export interface TemplateValidationResult {
  valid: boolean;
  errors: ValidationError[];
}
