/**
 * Built-in Scoring Rules
 * 
 * Predefined scoring rules that can be used in different scoring modes.
 */

import type {
  ScoringRule,
  ScoringContext,
  TimeMultiplierConfig,
  StreakBonusConfig,
} from './types';

/**
 * Base Points Rule
 * Awards the base points configured for the question
 */
export class BasePointsRule implements ScoringRule {
  id = 'base-points';
  name = 'Base Points';
  description = 'Awards the base points configured for the question';
  enabled = true;

  calculate(context: ScoringContext): number {
    if (!context.isCorrect) return 0;
    return context.question.basePoints;
  }

  isApplicable(context: ScoringContext): boolean {
    return context.isCorrect;
  }
}

/**
 * Time Multiplier Rule
 * Applies a multiplier based on how quickly the player answered
 */
export class TimeMultiplierRule implements ScoringRule {
  id = 'time-multiplier';
  name = 'Time Multiplier';
  description = 'Multiplies points based on answer speed';
  enabled = true;

  constructor(private config: TimeMultiplierConfig) {}

  calculate(context: ScoringContext): number {
    if (!context.isCorrect || !this.config.enabled) return 0;

    const { answerTime, question } = context;
    const { timeLimit } = question;
    
    const multiplier = this.calculateMultiplier(answerTime, timeLimit);
    const basePoints = context.question.basePoints;
    
    // Return additional points from multiplier (not the base)
    return basePoints * (multiplier - 1);
  }

  isApplicable(context: ScoringContext): boolean {
    return context.isCorrect && this.config.enabled;
  }

  private calculateMultiplier(answerTime: number, timeLimit: number): number {
    const { curve, maxMultiplier, minMultiplier, steps } = this.config;
    
    // Clamp answer time to time limit
    const clampedTime = Math.min(answerTime, timeLimit);
    const timeRatio = clampedTime / timeLimit; // 0 to 1

    switch (curve) {
      case 'linear':
        // Linear decrease: 0% time = max multiplier, 100% time = min multiplier
        return maxMultiplier - (timeRatio * (maxMultiplier - minMultiplier));
      
      case 'exponential':
        // Exponential decrease: rewards very fast answers
        const exponent = 2;
        const normalizedRatio = Math.pow(1 - timeRatio, exponent);
        return minMultiplier + (normalizedRatio * (maxMultiplier - minMultiplier));
      
      case 'stepwise':
        // Stepwise decrease: defined thresholds
        if (!steps || steps.length === 0) {
          return 1.0; // No steps defined, no multiplier
        }
        
        // Sort steps by threshold
        const sortedSteps = [...steps].sort((a, b) => a.threshold - b.threshold);
        
        // Find the applicable step
        for (const step of sortedSteps) {
          if (answerTime <= step.threshold) {
            return step.multiplier;
          }
        }
        
        // If no step matched, use the last step's multiplier
        return sortedSteps[sortedSteps.length - 1].multiplier;
      
      default:
        return 1.0;
    }
  }
}

/**
 * Streak Bonus Rule
 * Awards bonus points for consecutive correct answers
 */
export class StreakBonusRule implements ScoringRule {
  id = 'streak-bonus';
  name = 'Streak Bonus';
  description = 'Awards bonus points for consecutive correct answers';
  enabled = true;

  constructor(private config: StreakBonusConfig) {}

  calculate(context: ScoringContext): number {
    if (!context.isCorrect || !this.config.enabled) return 0;

    const { currentStreak } = context.player;
    const { bonusType, bonusValue, minStreakLength, maxBonus } = this.config;

    // Check if streak is long enough
    if (currentStreak < minStreakLength) return 0;

    let bonus = 0;

    switch (bonusType) {
      case 'flat':
        // Flat bonus per streak level
        bonus = bonusValue * currentStreak;
        break;
      
      case 'progressive':
        // Progressive: bonus increases exponentially
        // Formula: bonusValue * (streak^1.5)
        bonus = bonusValue * Math.pow(currentStreak, 1.5);
        break;
    }

    // Apply max bonus cap if configured
    if (maxBonus !== undefined) {
      bonus = Math.min(bonus, maxBonus);
    }

    return Math.round(bonus);
  }

  isApplicable(context: ScoringContext): boolean {
    return context.isCorrect 
      && this.config.enabled 
      && context.player.currentStreak >= this.config.minStreakLength;
  }
}

/**
 * Wrong Answer Penalty Rule
 * Deducts points for incorrect answers
 */
export class WrongAnswerPenaltyRule implements ScoringRule {
  id = 'wrong-answer-penalty';
  name = 'Wrong Answer Penalty';
  description = 'Deducts points for incorrect answers';
  enabled = true;

  constructor(private penaltyPoints: number) {}

  calculate(context: ScoringContext): number {
    if (context.isCorrect) return 0;
    return -Math.abs(this.penaltyPoints);
  }

  isApplicable(context: ScoringContext): boolean {
    return !context.isCorrect && this.penaltyPoints > 0;
  }
}

/**
 * Difficulty Bonus Rule
 * Awards extra points based on question difficulty
 */
export class DifficultyBonusRule implements ScoringRule {
  id = 'difficulty-bonus';
  name = 'Difficulty Bonus';
  description = 'Awards extra points for harder questions';
  enabled = true;

  private multipliers = {
    easy: 0,
    medium: 0.25, // 25% bonus
    hard: 0.5, // 50% bonus
  };

  calculate(context: ScoringContext): number {
    if (!context.isCorrect) return 0;

    const difficulty = context.question.difficulty || 'easy';
    const multiplier = this.multipliers[difficulty];
    const basePoints = context.question.basePoints;

    return Math.round(basePoints * multiplier);
  }

  isApplicable(context: ScoringContext): boolean {
    return context.isCorrect && !!context.question.difficulty;
  }
}

/**
 * First Answer Bonus Rule
 * Awards bonus for being the first to answer correctly (in team mode)
 */
export class FirstAnswerBonusRule implements ScoringRule {
  id = 'first-answer-bonus';
  name = 'First Answer Bonus';
  description = 'Awards bonus for being the first correct answer';
  enabled = true;

  constructor(private bonusPoints: number) {}

  calculate(context: ScoringContext): number {
    if (!context.isCorrect) return 0;
    
    // Check metadata for first answer flag
    const isFirstAnswer = context.metadata?.isFirstAnswer === true;
    
    return isFirstAnswer ? this.bonusPoints : 0;
  }

  isApplicable(context: ScoringContext): boolean {
    return context.isCorrect && context.metadata?.isFirstAnswer === true;
  }
}

/**
 * Partial Credit Rule
 * Awards partial points for incorrect answers (educational mode)
 */
export class PartialCreditRule implements ScoringRule {
  id = 'partial-credit';
  name = 'Partial Credit';
  description = 'Awards partial points for reasonable attempts';
  enabled = true;

  constructor(private creditPercentage: number) {}

  calculate(context: ScoringContext): number {
    if (context.isCorrect) return 0; // Only for incorrect answers
    
    const basePoints = context.question.basePoints;
    return Math.round(basePoints * this.creditPercentage);
  }

  isApplicable(context: ScoringContext): boolean {
    return !context.isCorrect && this.creditPercentage > 0;
  }
}

/**
 * Perfect Game Bonus Rule
 * Awards bonus when player answers all questions correctly
 */
export class PerfectGameBonusRule implements ScoringRule {
  id = 'perfect-game-bonus';
  name = 'Perfect Game Bonus';
  description = 'Awards bonus for answering all questions correctly';
  enabled = true;

  constructor(private bonusPoints: number) {}

  calculate(context: ScoringContext): number {
    const { totalAnswers, correctAnswers } = context.player;
    
    // Check if this is the last question and all were correct
    const isPerfectGame = totalAnswers > 0 && correctAnswers === totalAnswers;
    const isLastQuestion = context.metadata?.isLastQuestion === true;
    
    return isPerfectGame && isLastQuestion ? this.bonusPoints : 0;
  }

  isApplicable(context: ScoringContext): boolean {
    return context.metadata?.isLastQuestion === true;
  }
}

/**
 * Category Bonus Rule
 * Awards bonus points for specific question categories
 */
export class CategoryBonusRule implements ScoringRule {
  id = 'category-bonus';
  name = 'Category Bonus';
  description = 'Awards bonus points for specific categories';
  enabled = true;

  constructor(
    private categoryBonuses: Record<string, number>
  ) {}

  calculate(context: ScoringContext): number {
    if (!context.isCorrect) return 0;
    
    const category = context.question.category;
    if (!category) return 0;
    
    return this.categoryBonuses[category] || 0;
  }

  isApplicable(context: ScoringContext): boolean {
    return context.isCorrect && !!context.question.category;
  }
}

/**
 * Export all built-in rules
 */
export const BUILT_IN_RULES = {
  BasePointsRule,
  TimeMultiplierRule,
  StreakBonusRule,
  WrongAnswerPenaltyRule,
  DifficultyBonusRule,
  FirstAnswerBonusRule,
  PartialCreditRule,
  PerfectGameBonusRule,
  CategoryBonusRule,
};
