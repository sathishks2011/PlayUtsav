import { Module } from '@nestjs/common';
import { QuizTemplateController } from './quiz-template.controller';
import { QuizTemplateService } from './services/quiz-template.service';
import { QuizTemplateValidationService } from './services/quiz-template-validation.service';
import { PrismaService } from '../../prisma.service';

@Module({
  controllers: [QuizTemplateController],
  providers: [
    QuizTemplateService,
    QuizTemplateValidationService,
    PrismaService,
  ],
  exports: [QuizTemplateService],
})
export class QuizTemplateModule {}
