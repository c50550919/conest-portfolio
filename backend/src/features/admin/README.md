# Admin Feature

## Overview

The Admin feature provides administrative capabilities for managing user verifications and content moderation. It includes a verification review queue for manual approval of background checks, and an AI-powered content moderation system for reviewing flagged messages. All endpoints require authentication with admin role.

## API Endpoints

### Verification Review Queue

| Method | Path | Description | Auth Required |
|--------|------|-------------|---------------|
| GET | `/api/admin/verifications/queue` | Get verifications requiring admin review | Yes (Admin) |
| GET | `/api/admin/verifications/:userId` | Get verification details for a specific user | Yes (Admin) |
| POST | `/api/admin/verifications/:userId/approve` | Approve verification after review | Yes (Admin) |
| POST | `/api/admin/verifications/:userId/reject` | Reject verification after review | Yes (Admin) |

### Verification Statistics

| Method | Path | Description | Auth Required |
|--------|------|-------------|---------------|
| GET | `/api/admin/verifications/stats/overview` | Get overall verification statistics | Yes (Admin) |
| GET | `/api/admin/verifications/status/:status` | Get verifications filtered by status | Yes (Admin) |

### User Management

| Method | Path | Description | Auth Required |
|--------|------|-------------|---------------|
| GET | `/api/admin/users/search` | Search users by email or ID | Yes (Admin) |
| GET | `/api/admin/users/:userId/verification-history` | Get user verification history | Yes (Admin) |
| POST | `/api/admin/users/:userId/warn` | Issue a warning to a user | Yes (Admin) |
| POST | `/api/admin/users/:userId/suspend` | Suspend a user (24h or 7d) | Yes (Admin) |
| POST | `/api/admin/users/:userId/ban` | Permanently ban a user | Yes (Admin) |

### AI Content Moderation

| Method | Path | Description | Auth Required |
|--------|------|-------------|---------------|
| GET | `/api/admin/moderation/queue` | Get AI moderation queue (flagged messages) | Yes (Admin) |
| GET | `/api/admin/moderation/queue/urgent` | Get urgent moderation queue only | Yes (Admin) |
| GET | `/api/admin/moderation/stats` | Get AI moderation statistics | Yes (Admin) |
| GET | `/api/admin/moderation/:messageId/context` | Get message with surrounding conversation | Yes (Admin) |
| POST | `/api/admin/moderation/:messageId/approve` | Approve a flagged message (false positive) | Yes (Admin) |
| POST | `/api/admin/moderation/:messageId/confirm-violation` | Confirm a message violation | Yes (Admin) |
| POST | `/api/admin/moderation/:messageId/false-positive` | Mark as false positive for AI improvement | Yes (Admin) |
| GET | `/api/admin/moderation/patterns/:userId` | Get user's moderation patterns | Yes (Admin) |

## Services

### verificationReviewController
- `getReviewQueue` - Retrieves verifications pending admin review
- `getVerificationDetails` - Gets detailed verification info for a user
- `approveVerification` - Approves a user's verification
- `rejectVerification` - Rejects a user's verification
- `getVerificationStats` - Returns overall verification statistics
- `getVerificationsByStatus` - Filters verifications by status
- `searchUsers` - Searches users by email or ID
- `getUserVerificationHistory` - Gets verification history for a user

### moderationController
- `getModerationQueue` - Gets AI-flagged messages for review
- `getUrgentModerationQueue` - Gets high-priority flagged messages
- `getMessageContext` - Gets message with surrounding conversation context
- `approveMessage` - Approves a flagged message
- `confirmViolation` - Confirms a message violation and applies account action
- `markFalsePositive` - Marks a flag as false positive
- `getUserPatterns` - Gets user's moderation patterns
- `warnUser` - Issues a warning to a user
- `suspendUser` - Suspends a user for 24h or 7d
- `banUser` - Permanently bans a user
- `getModerationStats` - Gets AI moderation statistics

## Models/Types

### Account Actions
```typescript
type AccountAction =
  | 'none'
  | 'warning'
  | 'suspension_24h'
  | 'suspension_7d'
  | 'permanent_ban';
```

### Moderation Queue Item
```typescript
interface ModerationQueueItem {
  messageId: string;
  conversationId: string;
  senderId: string;
  senderEmail: string;
  content: string;           // Decrypted content
  category: string;          // AI-detected category
  confidence: number;        // AI confidence score
  aiResult: object;          // Full AI analysis
  flaggedAt: Date;
  priority: 'urgent' | 'high' | 'standard';
  userPatternSummary: PatternSummary;
}
```

## Dependencies

- `../verification` - verificationReviewController
- `../moderation/moderation.controller` - moderationController
- `../../middleware/auth.middleware` - Authentication and admin role verification
- `../../middleware/rateLimit` - Rate limiting (generalLimiter)

## Data Flow

1. **Request arrives** at admin endpoint
2. **Authentication middleware** verifies JWT token
3. **requireAdmin middleware** verifies user has admin role
4. **Rate limiting** is applied to prevent abuse
5. **Controller** delegates to specialized service (verification or moderation)
6. **Response** is returned with appropriate data

All admin actions are logged for audit trail purposes.
