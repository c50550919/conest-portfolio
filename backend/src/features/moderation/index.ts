// Moderation feature barrel file
export { ContentModerationService, default as contentModerationService } from './content-moderation.service';
export { moderationController, default as moderationControllerDefault } from './moderation.controller';
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

export {
  DEFAULT_THRESHOLDS,
  ESCALATION_LADDER,
} from './moderation.types';
