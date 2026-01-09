# Moderation Feature

## Overview

The Moderation feature provides LLM-powered content moderation to detect predatory patterns in messages, with a focus on child safety. It uses Gemini as the primary AI provider with OpenAI as fallback. The system detects concerning patterns, flags messages for admin review, tracks user behavior patterns, and supports automatic and manual account actions.

## Detection Targets

1. **Child Identity Probing** - Asking for children's names, ages, specific personal details
2. **Schedule Surveillance** - Asking when children are home alone, parent work schedules
3. **Location Targeting** - Asking about schools, playgrounds, child activities
4. **Unsolicited Access Offers** - Offering babysitting, tutoring, wanting to be alone with children
5. **Security Probing** - Asking about locks, cameras, house keys, alarm systems

## API Endpoints

These endpoints are accessed via the Admin feature routes:

| Method | Path | Description | Auth Required |
|--------|------|-------------|---------------|
| GET | `/api/admin/moderation/queue` | Get AI moderation queue | Yes (Admin) |
| GET | `/api/admin/moderation/queue/urgent` | Get urgent queue only | Yes (Admin) |
| GET | `/api/admin/moderation/stats` | Get moderation statistics | Yes (Admin) |
| GET | `/api/admin/moderation/:messageId/context` | Get message with context | Yes (Admin) |
| POST | `/api/admin/moderation/:messageId/approve` | Approve flagged message | Yes (Admin) |
| POST | `/api/admin/moderation/:messageId/confirm-violation` | Confirm violation | Yes (Admin) |
| POST | `/api/admin/moderation/:messageId/false-positive` | Mark as false positive | Yes (Admin) |
| GET | `/api/admin/moderation/patterns/:userId` | Get user patterns | Yes (Admin) |

## Services

### ContentModerationService
- `moderateMessage(input)` - Analyzes message content with AI
- `logModeration(options)` - Logs moderation result for audit
- `trackPatterns(userId, messageId, signals)` - Tracks detected patterns
- `checkPatternEscalation(userId)` - Checks if patterns require escalation
- `getUserPatternSummary(userId)` - Gets user's pattern summary
- `applyAccountAction(userId, action, reason, adminId)` - Applies account action
- `updateMessageModeration(messageId, response)` - Updates message with results
- `isEnabled()` - Checks if moderation is enabled
- `isShadowMode()` - Checks if in logging-only mode

### moderationController
- `getModerationQueue` - Gets flagged messages for review
- `getUrgentModerationQueue` - Gets high-priority items
- `getMessageContext` - Gets message with conversation context
- `approveMessage` - Approves a flagged message
- `confirmViolation` - Confirms violation and applies action
- `markFalsePositive` - Marks as false positive for AI improvement
- `getUserPatterns` - Gets user's moderation patterns
- `warnUser` - Issues warning
- `suspendUser` - Suspends user
- `banUser` - Permanently bans user
- `getModerationStats` - Gets overall statistics

## Models/Types

### ModerationResult
```typescript
interface ModerationResult {
  category: 'normal' | 'child_safety_questionable' | 'child_predatory_risk';
  confidence: number;       // 0.0 to 1.0
  signals: ModerationSignals;
  reasoning: string;
}
```

### ModerationSignals
```typescript
interface ModerationSignals {
  child_focus: boolean;
  asks_schedule: boolean;
  asks_location_school: boolean;
  offers_unsolicited_access_to_child: boolean;
  probes_security_details: boolean;
}
```

### ModerationAction
```typescript
type ModerationAction =
  | 'auto_approved'
  | 'flagged_standard'
  | 'flagged_urgent'
  | 'auto_blocked';
```

### AccountAction
```typescript
type AccountAction =
  | 'none'
  | 'warning'
  | 'suspension_24h'
  | 'suspension_7d'
  | 'permanent_ban';
```

### PatternType
```typescript
type PatternType =
  | 'child_focus'
  | 'schedule_probing'
  | 'location_targeting'
  | 'unsolicited_access'
  | 'security_probing';
```

## Configuration

```typescript
interface ModerationConfig {
  enabled: boolean;
  primaryProvider: 'gemini' | 'openai';
  fallbackProvider: 'gemini' | 'openai';
  geminiModel: string;      // e.g., 'gemini-1.5-flash'
  openaiModel: string;      // e.g., 'gpt-4o-mini'
  autoBlockThreshold: number;   // Default 0.85
  flagThreshold: number;        // Default 0.5
  batchSize: number;            // Default 10
  pollIntervalMs: number;       // Default 5000
  maxRetries: number;           // Default 3
  shadowMode: boolean;          // Logging only, no actions
}
```

## Dependencies

- `../../config/database` - Database access
- `../../config/logger` - Logging
- `../../workers/notificationWorker` - User notifications
- `../../utils/encryption` - Message decryption for review
- `./moderation.worker` - Background processing
- `./moderation.types` - Type definitions

## Data Flow

### Message Moderation Flow
1. New message received by messaging service
2. If moderation enabled, queue message for analysis
3. Worker picks up message from queue
4. AI provider analyzes content with context
5. If primary fails, fallback to secondary provider
6. Determine action based on category and confidence:
   - `auto_approved`: Normal content, no action
   - `flagged_standard`: Questionable, queue for review
   - `flagged_urgent`: High concern, priority review
   - `auto_blocked`: Very high confidence, block immediately
7. Update message with moderation results
8. Track patterns if signals detected
9. Check for pattern escalation

### Admin Review Flow
1. Admin views moderation queue
2. Admin selects message to review
3. Context loaded (surrounding messages, user patterns)
4. Admin makes decision:
   - Approve: Clear flag, mark as false positive
   - Confirm Violation: Apply account action (warn/suspend/ban)
   - Mark False Positive: Log for AI improvement
5. Actions logged for audit trail
6. User notified of any account actions

## Pattern Escalation

Automatic escalation triggers:
- Child focus detected 3+ times
- Schedule probing detected 2+ times
- Location targeting detected 2+ times

Creates urgent admin report for immediate review.
