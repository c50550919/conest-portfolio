/**
 * AI Content Moderation Types
 *
 * Type definitions for the LLM-powered content moderation system
 * that detects predatory patterns in adult-to-adult messages.
 *
 * Constitution: Principle I (Child Safety)
 */

/**
 * Categories returned by the AI moderation service
 */
export type ModerationCategory =
  | 'normal'
  | 'child_safety_questionable'
  | 'child_predatory_risk';

/**
 * Actions the system can take based on moderation results
 */
export type ModerationAction =
  | 'auto_approved'
  | 'flagged_standard'
  | 'flagged_urgent'
  | 'auto_blocked';

/**
 * User moderation status levels
 */
export type UserModerationStatus =
  | 'good_standing'
  | 'warned'
  | 'suspended'
  | 'banned';

/**
 * Account actions for escalation
 */
export type AccountAction =
  | 'none'
  | 'warning'
  | 'suspension_24h'
  | 'suspension_7d'
  | 'permanent_ban';

/**
 * Pattern types tracked across conversations
 */
export type PatternType =
  | 'child_focus'
  | 'schedule_probing'
  | 'location_targeting'
  | 'unsolicited_access'
  | 'security_probing';

/**
 * AI provider identifiers
 */
export type AIProvider = 'gemini' | 'openai';

/**
 * Signals detected by the AI in a message
 */
export interface ModerationSignals {
  child_focus: boolean;
  asks_schedule: boolean;
  asks_location_school: boolean;
  offers_unsolicited_access_to_child: boolean;
  probes_security_details: boolean;
}

/**
 * Result from AI moderation analysis
 */
export interface ModerationResult {
  category: ModerationCategory;
  confidence: number; // 0.0 - 1.0
  signals: ModerationSignals;
  reasoning: string;
}

/**
 * Full moderation response including metadata
 */
export interface ModerationResponse {
  result: ModerationResult;
  action: ModerationAction;
  provider: AIProvider;
  model: string;
  latencyMs: number;
  usedFallback: boolean;
  error?: string;
}

/**
 * Input for moderating a single message
 */
export interface ModerationInput {
  messageId: string;
  content: string;
  senderId: string;
  conversationId: string;
  previousMessages?: string[]; // Last N messages for context
}

/**
 * Pattern record for tracking across conversations
 */
export interface ModerationPattern {
  id: string;
  userId: string;
  patternType: PatternType;
  occurrenceCount: number;
  messageIds: string[];
  firstDetected: Date;
  lastDetected: Date;
  reviewed: boolean;
  reviewedBy?: string;
  reviewedAt?: Date;
  reviewNotes?: string;
  actionTaken?: string;
}

/**
 * Summary of a user's moderation patterns
 */
export interface PatternSummary {
  userId: string;
  totalFlags: number;
  patterns: {
    type: PatternType;
    count: number;
    lastDetected: Date;
  }[];
  strikeCount: number;
  status: UserModerationStatus;
  requiresReview: boolean;
}

/**
 * Moderation queue item for admin review
 */
export interface ModerationQueueItem {
  messageId: string;
  conversationId: string;
  senderId: string;
  senderEmail: string;
  content: string; // Decrypted for admin review
  category: ModerationCategory;
  confidence: number;
  signals: ModerationSignals;
  reasoning: string;
  flaggedAt: Date;
  userPatternSummary: PatternSummary;
  priority: 'urgent' | 'standard';
}

/**
 * Configuration for the moderation service
 */
export interface ModerationConfig {
  enabled: boolean;
  primaryProvider: AIProvider;
  fallbackProvider: AIProvider;
  geminiModel: string;
  openaiModel: string;
  autoBlockThreshold: number; // 0.0 - 1.0
  flagThreshold: number; // 0.0 - 1.0
  batchSize: number;
  pollIntervalMs: number;
  maxRetries: number;
  shadowMode: boolean; // Log only, no actions
}

/**
 * Escalation rule configuration
 */
export interface EscalationRule {
  condition: string;
  action: AccountAction;
  notifyAdmin: boolean;
}

/**
 * Thresholds for automatic actions
 */
export interface ModerationThresholds {
  autoBlock: {
    category: ModerationCategory;
    minConfidence: number;
  };
  urgentReview: {
    categories: ModerationCategory[];
    minConfidence: number;
  };
  standardReview: {
    categories: ModerationCategory[];
    minConfidence: number;
  };
  patternEscalation: {
    childFocusCount: number;
    scheduleProbeCount: number;
    locationTargetCount: number;
  };
}

/**
 * Default thresholds matching the approved plan
 */
export const DEFAULT_THRESHOLDS: ModerationThresholds = {
  autoBlock: {
    category: 'child_predatory_risk',
    minConfidence: 0.85,
  },
  urgentReview: {
    categories: ['child_predatory_risk', 'child_safety_questionable'],
    minConfidence: 0.7,
  },
  standardReview: {
    categories: ['child_safety_questionable'],
    minConfidence: 0.5,
  },
  patternEscalation: {
    childFocusCount: 3,
    scheduleProbeCount: 2,
    locationTargetCount: 2,
  },
};

/**
 * Escalation ladder for account actions
 */
export const ESCALATION_LADDER: Record<string, AccountAction> = {
  first_flag: 'none',
  second_flag: 'warning',
  third_flag: 'suspension_24h',
  predatory_risk: 'suspension_7d',
  confirmed_predatory: 'permanent_ban',
};

/**
 * AI moderation log entry
 */
export interface ModerationLogEntry {
  id: string;
  messageId: string;
  userId: string;
  provider: AIProvider;
  model: string;
  requestPayload?: Record<string, unknown>;
  responsePayload: ModerationResult;
  latencyMs: number;
  category: ModerationCategory;
  confidence: number;
  actionTaken: ModerationAction;
  hadError: boolean;
  errorMessage?: string;
  usedFallback: boolean;
  createdAt: Date;
}

/**
 * Admin action on a moderation flag
 */
export interface AdminModerationDecision {
  messageId: string;
  adminId: string;
  decision: 'approve' | 'confirm_violation' | 'false_positive';
  accountAction?: AccountAction;
  notes: string;
}
