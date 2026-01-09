# Connections Feature

## Overview

The Connections feature manages connection requests between users on the platform. Users can send, receive, accept, decline, or cancel connection requests. The system enforces rate limiting (5 requests/day, 15 requests/week) to prevent spam and encourage thoughtful connections. Messages in connection requests are encrypted for privacy.

## API Endpoints

| Method | Path | Description | Auth Required |
|--------|------|-------------|---------------|
| POST | `/api/connection-requests` | Send a connection request | Yes |
| GET | `/api/connection-requests/received` | Get received connection requests | Yes |
| GET | `/api/connection-requests/sent` | Get sent connection requests | Yes |
| GET | `/api/connection-requests/rate-limit-status` | Get rate limit status | Yes |
| GET | `/api/connection-requests/statistics` | Get connection statistics | Yes |
| GET | `/api/connection-requests/:id/message` | Get decrypted request message | Yes |
| GET | `/api/connection-requests/:id/response-message` | Get decrypted response message | Yes |
| PATCH | `/api/connection-requests/:id/accept` | Accept a connection request | Yes |
| PATCH | `/api/connection-requests/:id/decline` | Decline a connection request | Yes |
| PATCH | `/api/connection-requests/:id/cancel` | Cancel a sent request (sender only) | Yes |

## Services

### ConnectionRequestController
- `sendRequest` - Creates a new connection request with optional message
- `getReceivedRequests` - Retrieves requests received by current user
- `getSentRequests` - Retrieves requests sent by current user
- `getRateLimitStatus` - Returns current rate limit usage
- `getStatistics` - Returns connection statistics for the user
- `getMessage` - Returns decrypted message for a request
- `getResponseMessage` - Returns decrypted response message
- `acceptRequest` - Accepts a pending request (creates match)
- `declineRequest` - Declines a pending request
- `cancelRequest` - Cancels a sent request (sender only)

### ConnectionRequestService
- Rate limit enforcement (5/day, 15/week)
- Message encryption/decryption
- Request status management
- Match creation upon acceptance

## Models/Types

### ConnectionRequest
```typescript
interface ConnectionRequest {
  id: string;
  sender_id: string;
  receiver_id: string;
  message?: string;           // Encrypted
  response_message?: string;  // Encrypted
  status: ConnectionRequestStatus;
  created_at: Date;
  updated_at: Date;
  expires_at: Date;           // 7-day expiration
}

type ConnectionRequestStatus =
  | 'pending'
  | 'accepted'
  | 'declined'
  | 'expired'
  | 'cancelled';
```

### CreateConnectionRequest
```typescript
interface CreateConnectionRequest {
  receiverId: string;
  message?: string;  // Optional personal message (max 500 chars)
}
```

### AcceptRequest
```typescript
interface AcceptRequest {
  responseMessage?: string;  // Optional response message
}
```

### RateLimitStatus
```typescript
interface RateLimitStatus {
  daily: {
    used: number;
    limit: number;
    remaining: number;
    resetsAt: Date;
  };
  weekly: {
    used: number;
    limit: number;
    remaining: number;
    resetsAt: Date;
  };
}
```

## Dependencies

- `../../middleware/auth.middleware` - authenticate for JWT validation
- `../../middleware/validation` - Request body validation
- `../../validators/connectionRequestValidator` - Zod schemas
- `../../models/ConnectionRequest` - Database model
- `../../utils/encryption` - Message encryption/decryption
- `../matching` - Match creation upon acceptance

## Data Flow

### Send Request Flow
1. Validate request body
2. Check rate limits (5/day, 15/week)
3. Verify receiver exists and is not already connected
4. Encrypt message if provided
5. Create connection request with 7-day expiration
6. Return success response

### Accept Request Flow
1. Validate request (user must be receiver)
2. Verify request is pending and not expired
3. Encrypt response message if provided
4. Update request status to 'accepted'
5. Create match between users
6. Notify sender via Socket.io
7. Return success response

### Rate Limiting
- 5 requests per day (resets at midnight)
- 15 requests per week (resets Sunday midnight)
- Rate limit status can be queried at any time
- Exceeding limits returns 429 Too Many Requests
