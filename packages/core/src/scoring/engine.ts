/**
 * Scoring Engine
 * 
 * Core engine that calculates scores by applying configured rules.
 * Implements the strategy pattern for flexible scoring.
 */

import type {
  IScoringEngine,
  ScoringConfig,
  ScoringContext,
  ScoringResult,
  ScoringRule,
  ScoringBreakdown,
} from './types';

import { ScoringMode } from './types';

import {
  BasePointsRule,
  TimeMultiplierRule,
  StreakBonusRule,
  WrongAnswerPenaltyRule,
  DifficultyBonusRule,
} from './rules';

/**
 * Default scoring configurations for each mode
 */
export const DEFAULT_CONFIGS: Record<ScoringMode, Partial<ScoringConfig>> = {
  [ScoringMode.STANDARD]: {
    mode: ScoringMode.STANDARD,
    timeMultiplier: {
      enabled: false,
      maxMultiplier: 1.0,
      minMultiplier: 1.0,
      curve: 'linear',
    },
    streakBonus: {
      enabled: false,
      bonusType: 'flat',
      bonusValue: 0,
      minStreakLength: 3,
    },
    partialCredit: {
      enabled: false,
      baseCredit: 0,
    },
    negativeScoring: false,
    wrongAnswerPenalty: 0,
  },
  [ScoringMode.COMPETITIVE]: {
    mode: ScoringMode.COMPETITIVE,
    timeMultiplier: {
      enabled: true,
      maxMultiplier: 2.0,
      minMultiplier: 0.5,
      curve: 'exponential',
    },
    streakBonus: {
      enabled: true,
      bonusType: 'progressive',
      bonusValue: 10,
      minStreakLength: 3,
      maxBonus: 500,
    },
    partialCredit: {
      enabled: false,
      baseCredit: 0,
    },
    negativeScoring: false,
    wrongAnswerPenalty: 0,
  },
  [ScoringMode.EDUCATIONAL]: {
    mode: ScoringMode.EDUCATIONAL,
    timeMultiplier: {
      enabled: false,
      maxMultiplier: 1.0,
      minMultiplier: 1.0,
      curve: 'linear',
    },
    streakBonus: {
      enabled: false,
      bonusType: 'flat',
      bonusValue: 0,
      minStreakLength: 3,
    },
    partialCredit: {
      enabled: true,
      baseCredit: 0.25, // 25% credit for any submission
    },
    negativeScoring: false,
    wrongAnswerPenalty: 0,
  },
  [ScoringMode.CUSTOM]: {
    mode: ScoringMode.CUSTOM,
    timeMultiplier: {
      enabled: false,
      maxMultiplier: 1.0,
      minMultiplier: 1.0,
      curve: 'linear',
    },
    streakBonus: {
      enabled: false,
      bonusType: 'flat',
      bonusValue: 0,
      minStreakLength: 3,
    },
    partialCredit: {
      enabled: false,
      baseCredit: 0,
    },
    negativeScoring: false,
    wrongAnswerPenalty: 0,
  },
};

/**
 * Scoring Engine Implementation
 */
export class ScoringEngine implements IScoringEngine {
  private config: ScoringConfig;
  private rules: Map<string, ScoringRule>;

  constructor(config?: Partial<ScoringConfig>) {
    // Initialize with default config
    this.config = this.createDefaultConfig(config?.mode || ScoringMode.STANDARD);
    
    // Apply any custom config
    if (config) {
      this.config = { ...this.config, ...config } as ScoringConfig;
    }

    // Initialize rules map
    this.rules = new Map();
    
    // Register built-in rules based on mode
    this.initializeBuiltInRules();
    
    // Register any custom rules from config
    if (config?.customRules) {
      config.customRules.forEach(rule => this.registerRule(rule));
    }
  }

  /**
   * Calculate score for an answer
   */
  calculateScore(context: ScoringContext): ScoringResult {
    const breakdown: ScoringBreakdown[] = [];
    let totalPoints = 0;

    // Get applicable rules based on session configuration
    const applicableRules = this.getApplicableRules(context);

    // Apply each rule
    for (const rule of applicableRules) {
      if (!rule.enabled || !rule.isApplicable(context)) {
        continue;
      }

      const points = rule.calculate(context);
      
      if (points !== 0) {
        breakdown.push({
          ruleName: rule.name,
          ruleId: rule.id,
          points,
          reason: this.generateReason(rule, context, points),
        });

        totalPoints += points;
      }
    }

    // Apply negative scoring limits if configured
    if (!this.config.negativeScoring && totalPoints < 0) {
      totalPoints = 0;
    }

    return {
      totalPoints: Math.round(totalPoints),
      breakdown,
      timestamp: new Date(),
    };
  }

  /**
   * Apply a scoring configuration
   */
  configure(config: ScoringConfig): void {
    this.config = config;
    
    // Re-initialize built-in rules with new config
    this.rules.clear();
    this.initializeBuiltInRules();
    
    // Register custom rules
    if (config.customRules) {
      config.customRules.forEach(rule => this.registerRule(rule));
    }
  }

  /**
   * Register a custom scoring rule
   */
  registerRule(rule: ScoringRule): void {
    this.rules.set(rule.id, rule);
  }

  /**
   * Unregister a custom scoring rule
   */
  unregisterRule(ruleId: string): void {
    this.rules.delete(ruleId);
  }

  /**
   * Get all registered rules
   */
  getRules(): ScoringRule[] {
    return Array.from(this.rules.values());
  }

  /**
   * Get current configuration
   */
  getConfig(): ScoringConfig {
    return { ...this.config };
  }

  /**
   * Initialize built-in rules based on current config
   */
  private initializeBuiltInRules(): void {
    // Always include base points
    this.registerRule(new BasePointsRule());

    // Time multiplier
    if (this.config.timeMultiplier.enabled) {
      this.registerRule(new TimeMultiplierRule(this.config.timeMultiplier));
    }

    // Streak bonus
    if (this.config.streakBonus.enabled) {
      this.registerRule(new StreakBonusRule(this.config.streakBonus));
    }

    // Wrong answer penalty
    if (this.config.wrongAnswerPenalty > 0) {
      this.registerRule(new WrongAnswerPenaltyRule(this.config.wrongAnswerPenalty));
    }

    // Difficulty bonus
    this.registerRule(new DifficultyBonusRule());
  }

  /**
   * Get rules applicable to this scoring context
   */
  private getApplicableRules(context: ScoringContext): ScoringRule[] {
    const allRules = this.getRules();
    
    // If session specifies custom rules, use only those
    if (context.session.customRules && context.session.customRules.length > 0) {
      return allRules.filter(rule => 
        context.session.customRules.includes(rule.id)
      );
    }

    // Otherwise, use all enabled rules
    return allRules.filter(rule => rule.enabled);
  }

  /**
   * Generate a human-readable reason for the points awarded
   */
  private generateReason(rule: ScoringRule, context: ScoringContext, points: number): string {
    switch (rule.id) {
      case 'base-points':
        return `Base points for correct answer`;
      
      case 'time-multiplier': {
        const percent = Math.round((context.answerTime / context.question.timeLimit) * 100);
        return `Speed bonus (answered in ${percent}% of time limit)`;
      }
      
      case 'streak-bonus':
        return `Streak bonus (${context.player.currentStreak} correct in a row)`;
      
      case 'wrong-answer-penalty':
        return `Penalty for incorrect answer`;
      
      case 'difficulty-bonus':
        return `Difficulty bonus (${context.question.difficulty} question)`;
      
      case 'first-answer-bonus':
        return `First to answer correctly`;
      
      case 'partial-credit':
        return `Partial credit for attempt`;
      
      case 'perfect-game-bonus':
        return `Perfect game bonus (all answers correct)`;
      
      case 'category-bonus':
        return `Category bonus (${context.question.category})`;
      
      default:
        return points > 0 ? `Bonus from ${rule.name}` : `Penalty from ${rule.name}`;
    }
  }

  /**
   * Create a default configuration for a scoring mode
   */
  private createDefaultConfig(mode: ScoringMode): ScoringConfig {
    const defaultPartial = DEFAULT_CONFIGS[mode];
    
    return {
      id: 'default',
      name: `Default ${mode} Configuration`,
      description: `Default configuration for ${mode} mode`,
      mode,
      customRules: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      ...defaultPartial,
    } as ScoringConfig;
  }
}

/**
 * Create a scoring engine with a specific mode
 */
export function createScoringEngine(mode: ScoringMode = ScoringMode.STANDARD): ScoringEngine {
  return new ScoringEngine({ mode });
}

/**
 * Create a scoring engine with custom configuration
 */
export function createCustomScoringEngine(config: Partial<ScoringConfig>): ScoringEngine {
  return new ScoringEngine(config);
}
