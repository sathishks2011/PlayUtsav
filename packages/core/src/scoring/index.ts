/**
 * Scoring System
 * 
 * Exports all scoring system components including:
 * - Types and interfaces
 * - Built-in scoring rules
 * - Scoring engine
 * - Configuration presets
 */

// Types
export type {
  ScoringRule,
  ScoringContext,
  ScoringResult,
  ScoringBreakdown,
  TimeMultiplierConfig,
  TimeMultiplierStep,
  StreakBonusConfig,
  PartialCreditConfig,
  PartialCreditCriterion,
  ScoringConfig,
  IScoringEngine,
  PlayerStats,
  ScoringConfigModel,
  ScoringHistoryModel,
} from './types';

export { ScoringMode } from './types';

// Rules
export {
  BasePointsRule,
  TimeMultiplierRule,
  StreakBonusRule,
  WrongAnswerPenaltyRule,
  DifficultyBonusRule,
  FirstAnswerBonusRule,
  PartialCreditRule,
  PerfectGameBonusRule,
  CategoryBonusRule,
  BUILT_IN_RULES,
} from './rules';

// Engine
export {
  ScoringEngine,
  createScoringEngine,
  createCustomScoringEngine,
  DEFAULT_CONFIGS,
} from './engine';
