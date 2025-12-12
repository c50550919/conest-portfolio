/**
 * Content Moderation Service
 *
 * LLM-powered content moderation to detect predatory patterns in messages.
 * Uses Gemini as primary provider with OpenAI fallback.
 *
 * Detection targets:
 * 1. Child Identity Probing - asking for children's names, ages, details
 * 2. Schedule Surveillance - when kids are home alone, parent work hours
 * 3. Location Targeting - schools, playgrounds, activities
 * 4. Unsolicited Access Offers - babysitting, tutoring, "hanging out"
 * 5. Security Probing - locks, cameras, house keys
 *
 * Constitution: Principle I (Child Safety)
 */

import db from '../config/database';
import logger from '../config/logger';
import { queueNotification } from '../workers/notificationWorker';
import {
  ModerationResult,
  ModerationResponse,
  ModerationInput,
  ModerationAction,
  ModerationCategory,
  ModerationSignals,
  PatternType,
  PatternSummary,
  AccountAction,
  AIProvider,
  DEFAULT_THRESHOLDS,
  ESCALATION_LADDER,
  ModerationConfig,
} from '../types/moderation';

// System prompt for AI moderation
const SYSTEM_PROMPT = `You are a content safety moderator for a single-parent housing platform where verified adults find roommates.
Users are verified adults who may have children living with them.

Your task: Analyze messages for predatory patterns targeting children through their parents.

RED FLAGS to detect:
1. **Child Identity Probing**: Asking for children's names, ages, specific personal details
2. **Schedule Surveillance**: Asking when children are home alone, parent work schedules, childcare gaps
3. **Location Targeting**: Asking about schools, playgrounds, child activities, routes children take
4. **Unsolicited Access Offers**: Offering babysitting, tutoring, "hanging out with kids", wanting to be alone with children
5. **Security Probing**: Asking about locks, cameras, who has house keys, alarm systems

CONTEXT:
- Normal housing discussions about "having kids" or "family-friendly" are OK
- Asking general compatibility questions about parenting style is OK
- The concern is DETAILED, SPECIFIC, or REPEATED patterns that suggest targeting

IMPORTANT: Be careful not to over-flag. Housing discussions naturally involve family topics.
Only flag when there's a clear pattern of unusual interest in children's specifics.

Respond ONLY with valid JSON matching this exact schema:
{
  "category": "normal" | "child_safety_questionable" | "child_predatory_risk",
  "confidence": <number between 0.0 and 1.0>,
  "signals": {
    "child_focus": <boolean - message focuses on children beyond normal>,
    "asks_schedule": <boolean - asks about children's or parent's schedule>,
    "asks_location_school": <boolean - asks about school, activities, locations>,
    "offers_unsolicited_access_to_child": <boolean - offers to be with children>,
    "probes_security_details": <boolean - asks about home security>
  },
  "reasoning": "<brief explanation of your assessment>"
}`;

/**
 * Get moderation configuration from environment
 */
function getConfig(): ModerationConfig {
  return {
    enabled: process.env.AI_MODERATION_ENABLED === 'true',
    primaryProvider: (process.env.AI_MODERATION_PRIMARY_PROVIDER || 'gemini') as AIProvider,
    fallbackProvider: (process.env.AI_MODERATION_FALLBACK_PROVIDER || 'openai') as AIProvider,
    geminiModel: process.env.AI_MODERATION_MODEL_GEMINI || 'gemini-1.5-flash',
    openaiModel: process.env.AI_MODERATION_MODEL_OPENAI || 'gpt-4o-mini',
    autoBlockThreshold: parseFloat(process.env.AI_MODERATION_AUTO_BLOCK_THRESHOLD || '0.85'),
    flagThreshold: parseFloat(process.env.AI_MODERATION_FLAG_THRESHOLD || '0.5'),
    batchSize: parseInt(process.env.AI_MODERATION_BATCH_SIZE || '10'),
    pollIntervalMs: parseInt(process.env.AI_MODERATION_POLL_INTERVAL_MS || '5000'),
    maxRetries: parseInt(process.env.AI_MODERATION_MAX_RETRIES || '3'),
    shadowMode: process.env.AI_MODERATION_SHADOW_MODE === 'true',
  };
}

/**
 * Call Gemini API for moderation
 */
async function moderateWithGemini(
  content: string,
  context: string,
  model: string,
): Promise<ModerationResult> {
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) {
    throw new Error('GOOGLE_AI_API_KEY not configured');
  }

  const userPrompt = `Analyze this message from a housing platform conversation:

---
${content}
---

${context ? `Previous context:\n${context}\n` : ''}

Respond with JSON only.`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [{ text: SYSTEM_PROMPT + '\n\n' + userPrompt }],
          },
        ],
        generationConfig: {
          temperature: 0.1, // Low temperature for consistent classification
          topP: 0.8,
          maxOutputTokens: 500,
          responseMimeType: 'application/json',
        },
        safetySettings: [
          // Disable Google's default safety filters since we're doing our own moderation
          { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
        ],
      }),
    },
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
  }

  const data = (await response.json()) as {
    candidates?: Array<{
      content?: { parts?: Array<{ text?: string }> };
    }>;
  };

  // Extract text from Gemini response
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error('No response text from Gemini');
  }

  // Parse JSON response
  const result = JSON.parse(text) as ModerationResult;
  validateResult(result);

  return result;
}

/**
 * Call OpenAI API for moderation
 */
async function moderateWithOpenAI(
  content: string,
  context: string,
  model: string,
): Promise<ModerationResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY not configured');
  }

  const userPrompt = `Analyze this message from a housing platform conversation:

---
${content}
---

${context ? `Previous context:\n${context}\n` : ''}

Respond with JSON only.`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.1,
      max_tokens: 500,
      response_format: { type: 'json_object' },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
  }

  const data = (await response.json()) as {
    choices?: Array<{
      message?: { content?: string };
    }>;
  };
  const text = data.choices?.[0]?.message?.content;

  if (!text) {
    throw new Error('No response text from OpenAI');
  }

  const result = JSON.parse(text) as ModerationResult;
  validateResult(result);

  return result;
}

/**
 * Validate moderation result structure
 */
function validateResult(result: ModerationResult): void {
  const validCategories: ModerationCategory[] = [
    'normal',
    'child_safety_questionable',
    'child_predatory_risk',
  ];

  if (!validCategories.includes(result.category)) {
    throw new Error(`Invalid category: ${result.category}`);
  }

  if (typeof result.confidence !== 'number' || result.confidence < 0 || result.confidence > 1) {
    throw new Error(`Invalid confidence: ${result.confidence}`);
  }

  if (!result.signals || typeof result.signals !== 'object') {
    throw new Error('Missing or invalid signals');
  }
}

/**
 * Determine action based on moderation result
 */
function determineAction(result: ModerationResult, config: ModerationConfig): ModerationAction {
  const { category, confidence } = result;
  const thresholds = DEFAULT_THRESHOLDS;

  // Auto-block: high confidence predatory
  if (
    category === thresholds.autoBlock.category &&
    confidence >= thresholds.autoBlock.minConfidence
  ) {
    return 'auto_blocked';
  }

  // Urgent review: predatory or high-confidence questionable
  if (
    thresholds.urgentReview.categories.includes(category) &&
    confidence >= thresholds.urgentReview.minConfidence
  ) {
    return 'flagged_urgent';
  }

  // Standard review: questionable with lower confidence
  if (
    thresholds.standardReview.categories.includes(category) &&
    confidence >= thresholds.standardReview.minConfidence
  ) {
    return 'flagged_standard';
  }

  // Auto-approve: normal content
  return 'auto_approved';
}

/**
 * Main Content Moderation Service
 */
export const ContentModerationService = {
  /**
   * Moderate a single message
   */
  async moderateMessage(input: ModerationInput): Promise<ModerationResponse> {
    const config = getConfig();
    const startTime = Date.now();
    let usedFallback = false;
    let provider: AIProvider = config.primaryProvider;
    let model = config.primaryProvider === 'gemini' ? config.geminiModel : config.openaiModel;
    let result: ModerationResult;
    let error: string | undefined;

    // Build context from previous messages
    const context = input.previousMessages?.join('\n---\n') || '';

    try {
      // Try primary provider
      if (config.primaryProvider === 'gemini') {
        result = await moderateWithGemini(input.content, context, config.geminiModel);
      } else {
        result = await moderateWithOpenAI(input.content, context, config.openaiModel);
      }
    } catch (primaryError: any) {
      logger.warn(`Primary provider (${config.primaryProvider}) failed, trying fallback`, {
        error: primaryError.message,
        messageId: input.messageId,
      });

      usedFallback = true;
      provider = config.fallbackProvider;
      model = config.fallbackProvider === 'gemini' ? config.geminiModel : config.openaiModel;

      try {
        // Try fallback provider
        if (config.fallbackProvider === 'gemini') {
          result = await moderateWithGemini(input.content, context, config.geminiModel);
        } else {
          result = await moderateWithOpenAI(input.content, context, config.openaiModel);
        }
      } catch (fallbackError: any) {
        error = `Both providers failed: ${primaryError.message}, ${fallbackError.message}`;
        logger.error('Both moderation providers failed', {
          messageId: input.messageId,
          primaryError: primaryError.message,
          fallbackError: fallbackError.message,
        });

        // Default to flagging for manual review when AI fails
        result = {
          category: 'child_safety_questionable',
          confidence: 0.5,
          signals: {
            child_focus: false,
            asks_schedule: false,
            asks_location_school: false,
            offers_unsolicited_access_to_child: false,
            probes_security_details: false,
          },
          reasoning: 'AI moderation failed - flagged for manual review',
        };
      }
    }

    const latencyMs = Date.now() - startTime;
    const action = config.shadowMode ? 'auto_approved' : determineAction(result!, config);

    // Log the moderation
    await this.logModeration({ input, result: result!, provider, model, latencyMs, action, usedFallback, error });

    // Track patterns if signals detected
    if (!config.shadowMode && hasSignals(result!.signals)) {
      await this.trackPatterns(input.senderId, input.messageId, result!.signals);
    }

    return {
      result: result!,
      action,
      provider,
      model,
      latencyMs,
      usedFallback,
      error,
    };
  },

  /**
   * Log moderation result for audit trail
   */
  async logModeration(options: {
    input: ModerationInput;
    result: ModerationResult;
    provider: AIProvider;
    model: string;
    latencyMs: number;
    action: ModerationAction;
    usedFallback: boolean;
    error?: string;
  }): Promise<void> {
    const { input, result, provider, model, latencyMs, action, usedFallback, error } = options;
    try {
      await db('ai_moderation_logs').insert({
        message_id: input.messageId,
        user_id: input.senderId,
        provider,
        model,
        response_payload: JSON.stringify(result),
        latency_ms: latencyMs,
        category: result.category,
        confidence: result.confidence,
        action_taken: action,
        had_error: !!error,
        error_message: error,
        used_fallback: usedFallback,
      });
    } catch (logError) {
      logger.error('Failed to log moderation result', { error: logError, messageId: input.messageId });
    }
  },

  /**
   * Track detected patterns for a user
   */
  async trackPatterns(
    userId: string,
    messageId: string,
    signals: ModerationSignals,
  ): Promise<void> {
    const patternsToTrack: { type: PatternType; detected: boolean }[] = [
      { type: 'child_focus', detected: signals.child_focus },
      { type: 'schedule_probing', detected: signals.asks_schedule },
      { type: 'location_targeting', detected: signals.asks_location_school },
      { type: 'unsolicited_access', detected: signals.offers_unsolicited_access_to_child },
      { type: 'security_probing', detected: signals.probes_security_details },
    ];

    for (const pattern of patternsToTrack) {
      if (!pattern.detected) continue;

      // Check if pattern already exists for user
      const existing = await db('moderation_patterns')
        .where({ user_id: userId, pattern_type: pattern.type })
        .first();

      if (existing) {
        // Update existing pattern
        const messageIds = existing.message_ids || [];
        if (!messageIds.includes(messageId)) {
          messageIds.push(messageId);
        }

        await db('moderation_patterns')
          .where('id', existing.id)
          .update({
            occurrence_count: existing.occurrence_count + 1,
            message_ids: JSON.stringify(messageIds),
            last_detected: db.fn.now(),
            reviewed: false, // Reset review status on new occurrence
          });
      } else {
        // Create new pattern record
        await db('moderation_patterns').insert({
          user_id: userId,
          pattern_type: pattern.type,
          occurrence_count: 1,
          message_ids: JSON.stringify([messageId]),
        });
      }
    }

    // Check for pattern escalation
    await this.checkPatternEscalation(userId);
  },

  /**
   * Check if user's patterns require escalation
   */
  async checkPatternEscalation(userId: string): Promise<void> {
    const thresholds = DEFAULT_THRESHOLDS.patternEscalation;

    const patterns = await db('moderation_patterns')
      .where('user_id', userId)
      .select('pattern_type', 'occurrence_count');

    let shouldEscalate = false;
    let reason = '';

    for (const pattern of patterns) {
      if (
        pattern.pattern_type === 'child_focus' &&
        pattern.occurrence_count >= thresholds.childFocusCount
      ) {
        shouldEscalate = true;
        reason = `Child-focused messages detected ${pattern.occurrence_count} times`;
        break;
      }
      if (
        pattern.pattern_type === 'schedule_probing' &&
        pattern.occurrence_count >= thresholds.scheduleProbeCount
      ) {
        shouldEscalate = true;
        reason = `Schedule probing detected ${pattern.occurrence_count} times`;
        break;
      }
      if (
        pattern.pattern_type === 'location_targeting' &&
        pattern.occurrence_count >= thresholds.locationTargetCount
      ) {
        shouldEscalate = true;
        reason = `Location targeting detected ${pattern.occurrence_count} times`;
        break;
      }
    }

    if (shouldEscalate) {
      logger.warn('Pattern escalation triggered', { userId, reason });

      // Create urgent admin report
      await db('message_reports').insert({
        message_id: null, // Pattern-based, not specific message
        reported_by: null, // System-generated
        reported_user_id: userId,
        report_type: 'child_safety_concern',
        description: `PATTERN ESCALATION: ${reason}`,
        status: 'pending',
        severity: 'critical',
        ai_detected: true,
      });
    }
  },

  /**
   * Get pattern summary for a user
   */
  async getUserPatternSummary(userId: string): Promise<PatternSummary> {
    const patterns = await db('moderation_patterns')
      .where('user_id', userId)
      .select('pattern_type', 'occurrence_count', 'last_detected');

    const user = await db('users')
      .where('id', userId)
      .select('moderation_strike_count', 'moderation_status')
      .first();

    const totalFlags = patterns.reduce((sum, p) => sum + p.occurrence_count, 0);

    return {
      userId,
      totalFlags,
      patterns: patterns.map((p) => ({
        type: p.pattern_type as PatternType,
        count: p.occurrence_count,
        lastDetected: p.last_detected,
      })),
      strikeCount: user?.moderation_strike_count || 0,
      status: user?.moderation_status || 'good_standing',
      requiresReview: totalFlags >= 2,
    };
  },

  /**
   * Apply account action based on escalation
   */
  async applyAccountAction(
    userId: string,
    action: AccountAction,
    reason: string,
    adminId?: string,
  ): Promise<void> {
    const updates: Record<string, any> = {
      last_moderation_strike: db.fn.now(),
    };

    switch (action) {
      case 'warning':
        updates.moderation_strike_count = db.raw('moderation_strike_count + 1');
        updates.moderation_status = 'warned';
        break;
      case 'suspension_24h':
        updates.moderation_strike_count = db.raw('moderation_strike_count + 1');
        updates.moderation_status = 'suspended';
        updates.suspension_until = new Date(Date.now() + 24 * 60 * 60 * 1000);
        updates.suspension_reason = reason;
        break;
      case 'suspension_7d':
        updates.moderation_strike_count = db.raw('moderation_strike_count + 1');
        updates.moderation_status = 'suspended';
        updates.suspension_until = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        updates.suspension_reason = reason;
        break;
      case 'permanent_ban':
        updates.moderation_status = 'banned';
        updates.suspension_reason = reason;
        break;
      default:
        return; // No action
    }

    await db('users').where('id', userId).update(updates);

    // Log admin action
    await db('admin_actions').insert({
      admin_id: adminId || null,
      action_type: action === 'permanent_ban' ? 'user_banned' : action === 'warning' ? 'user_warned' : 'user_suspended',
      target_user_id: userId,
      reason,
      is_ai_escalation: !adminId,
    });

    // Send notification to user
    await this.sendModerationNotification(userId, action, reason);

    logger.info('Account action applied', { userId, action, reason, adminId });
  },

  /**
   * Send notification to user about moderation action
   */
  async sendModerationNotification(
    userId: string,
    action: AccountAction,
    reason: string,
  ): Promise<void> {
    const notifications = getModerationNotificationContent(action, reason);

    // Send email notification
    await queueNotification(
      userId,
      'email',
      notifications.emailBody,
      { title: notifications.subject, data: { action, reason } },
    );

    // Send push notification for immediate visibility
    await queueNotification(
      userId,
      'push',
      notifications.pushBody,
      { title: notifications.pushTitle, data: { action, reason } },
    );

    logger.info('Moderation notification sent', { userId, action });
  },

  /**
   * Update message with moderation results
   */
  async updateMessageModeration(
    messageId: string,
    response: ModerationResponse,
  ): Promise<void> {
    const updates: Record<string, any> = {
      ai_moderation_result: JSON.stringify(response.result),
      ai_confidence_score: response.result.confidence,
      ai_category: response.result.category,
      ai_child_focus: response.result.signals.child_focus,
      ai_asks_schedule: response.result.signals.asks_schedule,
      ai_asks_location: response.result.signals.asks_location_school,
      ai_offers_access: response.result.signals.offers_unsolicited_access_to_child,
      ai_probes_security: response.result.signals.probes_security_details,
      ai_moderated_at: db.fn.now(),
      ai_provider: response.provider,
      ai_model: response.model,
    };

    // Update moderation status based on action
    switch (response.action) {
      case 'auto_approved':
        updates.moderation_status = 'approved';
        break;
      case 'flagged_standard':
      case 'flagged_urgent':
        updates.moderation_status = 'pending';
        updates.flagged_for_review = true;
        break;
      case 'auto_blocked':
        updates.moderation_status = 'rejected';
        updates.flagged_for_review = true;
        break;
    }

    await db('messages').where('id', messageId).update(updates);
  },

  /**
   * Check if moderation is enabled
   */
  isEnabled(): boolean {
    return getConfig().enabled;
  },

  /**
   * Check if in shadow mode (logging only)
   */
  isShadowMode(): boolean {
    return getConfig().shadowMode;
  },
};

/**
 * Get notification content for moderation actions
 */
interface NotificationContent {
  subject: string;
  emailBody: string;
  pushTitle: string;
  pushBody: string;
}

function getModerationNotificationContent(
  action: AccountAction,
  reason: string,
): NotificationContent {
  const appName = 'CoNest';
  const supportEmail = 'safety@conest.com';

  switch (action) {
    case 'warning':
      return {
        subject: `${appName} Community Guidelines Reminder`,
        emailBody: `Dear ${appName} Member,

We've detected messaging patterns that may not align with our community guidelines focused on child safety.

Reason: ${reason}

This is a reminder that ${appName} prioritizes the safety of all families on our platform. Please review our community guidelines and ensure your communications focus on housing compatibility.

What this means:
• This is a formal warning on your account
• No immediate action is required
• Continued violations may result in account suspension

If you believe this was flagged in error, please contact our support team at ${supportEmail}.

Thank you for helping us maintain a safe community.

The ${appName} Safety Team`,
        pushTitle: 'Community Guidelines Reminder',
        pushBody: 'Your account has received a warning. Please review your recent messages and our community guidelines.',
      };

    case 'suspension_24h':
      return {
        subject: `${appName} Account Temporarily Suspended - 24 Hours`,
        emailBody: `Dear ${appName} Member,

Your account has been temporarily suspended for 24 hours due to repeated community guideline concerns.

Reason: ${reason}

What this means:
• You cannot send messages or use matching features for 24 hours
• Your profile is temporarily hidden from other users
• Your account will be automatically restored after the suspension period

This action was taken to protect the safety of families on our platform. When your account is restored, please ensure all communications follow our community guidelines.

If you believe this suspension was made in error, please contact ${supportEmail}.

The ${appName} Safety Team`,
        pushTitle: 'Account Suspended - 24 Hours',
        pushBody: 'Your account has been suspended for 24 hours due to community guideline concerns.',
      };

    case 'suspension_7d':
      return {
        subject: `${appName} Account Suspended - 7 Days`,
        emailBody: `Dear ${appName} Member,

Your account has been suspended for 7 days due to serious community guideline violations.

Reason: ${reason}

What this means:
• You cannot access ${appName} features for 7 days
• Your profile is hidden from all users
• Your conversations are preserved but inaccessible during suspension
• Your account will be automatically restored after the suspension period

This extended suspension reflects the severity of the detected patterns. Child safety is our highest priority, and we take all potential concerns seriously.

When your account is restored, any further violations may result in permanent removal from the platform.

To appeal this decision, contact ${supportEmail} with "Suspension Appeal" in the subject line.

The ${appName} Safety Team`,
        pushTitle: 'Account Suspended - 7 Days',
        pushBody: 'Your account has been suspended for 7 days. Check your email for details.',
      };

    case 'permanent_ban':
      return {
        subject: `${appName} Account Permanently Deactivated`,
        emailBody: `Dear Former ${appName} Member,

Your ${appName} account has been permanently deactivated due to confirmed violations of our community safety guidelines.

Reason: ${reason}

What this means:
• Your account is permanently closed
• Your profile has been removed from the platform
• You will not be able to create a new account
• Any active matches or conversations have been terminated

${appName} has a zero-tolerance policy for behavior that poses potential risks to children or families. This decision was made after careful review of your account activity.

If you believe this action was taken in error, you may submit a formal appeal to ${supportEmail} within 30 days. Include "Account Appeal" in the subject line and provide any relevant context.

The ${appName} Safety Team`,
        pushTitle: 'Account Deactivated',
        pushBody: 'Your CoNest account has been permanently deactivated. Check your email for details.',
      };

    default:
      return {
        subject: `${appName} Account Notice`,
        emailBody: `Your account status has been updated. Reason: ${reason}. Contact ${supportEmail} for details.`,
        pushTitle: 'Account Notice',
        pushBody: 'Your account status has been updated. Check your email for details.',
      };
  }
}

/**
 * Check if any signals are detected
 */
function hasSignals(signals: ModerationSignals): boolean {
  return (
    signals.child_focus ||
    signals.asks_schedule ||
    signals.asks_location_school ||
    signals.offers_unsolicited_access_to_child ||
    signals.probes_security_details
  );
}

export default ContentModerationService;
