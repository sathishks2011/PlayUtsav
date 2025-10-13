/**
 * Scoring System Types
 * 
 * Defines the type system for the flexible scoring engine.
 * Supports pluggable rules, time multipliers, streaks, and custom configurations.
 */

/**
 * Base interface for all scoring rules
 */
export interface ScoringRule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  
  /**
   * Calculate points for this rule
   * @param context - The scoring context with all relevant data
   * @returns The points awarded by this rule
   */
  calculate(context: ScoringContext): number;
  
  /**
   * Validate if this rule can be applied
   * @param context - The scoring context
   * @returns true if the rule is applicable
   */
  isApplicable(context: ScoringContext): boolean;
}

/**
 * Context provided to scoring rules for calculation
 */
export interface ScoringContext {
  // Answer data
  isCorrect: boolean;
  answerTime: number; // Time taken in milliseconds
  submittedAt: Date;
  
  // Question data
  question: {
    id: string;
    basePoints: number; // Base points for this question
    timeLimit: number; // Time limit in milliseconds
    difficulty?: 'easy' | 'medium' | 'hard';
    category?: string;
  };
  
  // Player data
  player: {
    id: string;
    currentStreak: number; // Consecutive correct answers
    totalAnswers: number;
    correctAnswers: number;
  };
  
  // Session data
  session: {
    id: string;
    scoringMode: ScoringMode;
    customRules: string[]; // IDs of custom rules to apply
  };
  
  // Additional metadata
  metadata?: Record<string, any>;
}

/**
 * Result of scoring calculation
 */
export interface ScoringResult {
  totalPoints: number;
  breakdown: ScoringBreakdown[];
  timestamp: Date;
}

/**
 * Breakdown of how points were calculated
 */
export interface ScoringBreakdown {
  ruleName: string;
  ruleId: string;
  points: number;
  reason: string;
}

/**
 * Scoring modes that define different sets of rules
 */
export enum ScoringMode {
  STANDARD = 'standard', // Base points only
  COMPETITIVE = 'competitive', // Base + time multiplier + streaks
  EDUCATIONAL = 'educational', // Partial credit, no time pressure
  CUSTOM = 'custom', // User-defined rules
}

/**
 * Configuration for time-based multipliers
 */
export interface TimeMultiplierConfig {
  enabled: boolean;
  maxMultiplier: number; // Maximum multiplier (e.g., 2.0 for 2x points)
  minMultiplier: number; // Minimum multiplier (e.g., 0.5 for half points)
  
  /**
   * Curve type for time-based scoring
   * - linear: Points decrease linearly with time
   * - exponential: Points decrease exponentially (rewards very fast answers)
   * - stepwise: Points decrease in steps (e.g., full points first 10s, 80% next 10s, etc.)
   */
  curve: 'linear' | 'exponential' | 'stepwise';
  
  /**
   * For stepwise curve: define the steps
   * Example: [{ threshold: 10000, multiplier: 1.0 }, { threshold: 20000, multiplier: 0.8 }]
   */
  steps?: TimeMultiplierStep[];
}

export interface TimeMultiplierStep {
  threshold: number; // Time threshold in milliseconds
  multiplier: number; // Multiplier to apply
}

/**
 * Configuration for streak bonuses
 */
export interface StreakBonusConfig {
  enabled: boolean;
  
  /**
   * Bonus points per correct answer in streak
   * Can be flat or progressive
   */
  bonusType: 'flat' | 'progressive';
  
  /**
   * For flat bonus: points awarded per streak level
   * For progressive: base multiplier that increases with streak
   */
  bonusValue: number;
  
  /**
   * Maximum streak bonus (to prevent runaway scores)
   */
  maxBonus?: number;
  
  /**
   * Minimum streak length to start awarding bonuses
   */
  minStreakLength: number;
}

/**
 * Configuration for partial credit (educational mode)
 */
export interface PartialCreditConfig {
  enabled: boolean;
  
  /**
   * Points awarded for incorrect but reasonable attempts
   * (e.g., 25% for any submission, 50% for close answers)
   */
  baseCredit: number; // Percentage of base points (0-1)
  
  /**
   * Additional credit for specific criteria
   */
  criteria?: PartialCreditCriterion[];
}

export interface PartialCreditCriterion {
  condition: string; // Description of the condition
  creditPercentage: number; // Additional percentage to award (0-1)
  evaluator: (context: ScoringContext) => boolean; // Function to check if criterion is met
}

/**
 * Complete scoring configuration
 */
export interface ScoringConfig {
  id: string;
  name: string;
  description: string;
  mode: ScoringMode;
  
  // Rule configurations
  timeMultiplier: TimeMultiplierConfig;
  streakBonus: StreakBonusConfig;
  partialCredit: PartialCreditConfig;
  
  // Custom rules
  customRules: ScoringRule[];
  
  // Global settings
  negativeScoring: boolean; // Allow negative scores for wrong answers
  wrongAnswerPenalty: number; // Points deducted for wrong answers
  
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Interface for the scoring engine
 */
export interface IScoringEngine {
  /**
   * Calculate score for an answer
   */
  calculateScore(context: ScoringContext): ScoringResult;
  
  /**
   * Apply a scoring configuration
   */
  configure(config: ScoringConfig): void;
  
  /**
   * Register a custom scoring rule
   */
  registerRule(rule: ScoringRule): void;
  
  /**
   * Unregister a custom scoring rule
   */
  unregisterRule(ruleId: string): void;
  
  /**
   * Get all registered rules
   */
  getRules(): ScoringRule[];
  
  /**
   * Get current configuration
   */
  getConfig(): ScoringConfig;
}

/**
 * Player statistics for scoring calculations
 */
export interface PlayerStats {
  playerId: string;
  sessionId: string;
  
  totalScore: number;
  currentStreak: number;
  maxStreak: number;
  
  totalAnswers: number;
  correctAnswers: number;
  incorrectAnswers: number;
  
  averageAnswerTime: number;
  fastestAnswerTime: number;
  
  lastAnswerCorrect: boolean;
  lastAnswerTime: Date;
  
  updatedAt: Date;
}

/**
 * Database models for scoring configurations
 */
export interface ScoringConfigModel {
  id: string;
  hostId: string;
  name: string;
  description: string;
  mode: ScoringMode;
  config: ScoringConfig; // JSON field
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ScoringHistoryModel {
  id: string;
  sessionId: string;
  questionId: string;
  playerId: string;
  
  isCorrect: boolean;
  answerTime: number;
  pointsAwarded: number;
  breakdown: ScoringBreakdown[]; // JSON field
  
  createdAt: Date;
}
