/**
 * CoNest - Single Parent Housing Platform
 * Copyright (c) 2025-2026 CoNest. All rights reserved.
 *
 * PROPRIETARY AND CONFIDENTIAL
 * Unauthorized copying, distribution, or use of this file is strictly prohibited.
 * See LICENSE file in the project root for full license terms.
 */
// Moderation feature barrel file
export {
  ContentModerationService,
  default as contentModerationService,
} from './content-moderation.service';
export {
  moderationController,
  default as moderationControllerDefault,
} from './moderation.controller';
export {
  moderationQueue,
  queueMessageForModeration,
  getModerationStats,
  ModerationPollingWorker,
  moderationWorker,
} from './moderation.worker';

// Re-export types
export type {
  ModerationCategory,
  ModerationAction,
  UserModerationStatus,
  AccountAction,
  PatternType,
  AIProvider,
  ModerationSignals,
  ModerationResult,
  ModerationResponse,
  ModerationInput,
  ModerationPattern,
  PatternSummary,
  ModerationQueueItem,
  ModerationConfig,
  EscalationRule,
  ModerationThresholds,
  ModerationLogEntry,
  AdminModerationDecision,
} from './moderation.types';

export { DEFAULT_THRESHOLDS, ESCALATION_LADDER } from './moderation.types';
