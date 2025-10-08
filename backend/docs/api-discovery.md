# Discovery API Documentation

## Overview

The Discovery API provides endpoints for the profile discovery and matching system. All endpoints require JWT authentication and enforce strict child safety compliance (Constitution Principle I).

**Base URL**: `/api/discovery`

**Authentication**: Bearer token required in `Authorization` header

**Child Safety Compliance**:
- NO child PII (names, photos, exact ages, schools)
- ONLY `childrenCount` (integer) and `childrenAgeGroups` (generic ranges)
- Allowed age groups: `toddler`, `elementary`, `teen`

---

## Endpoints

### 1. GET `/api/discovery/profiles`

Fetch discovery profiles with cursor-based pagination and compatibility scoring.

**Authentication**: Required (JWT)

**Query Parameters**:
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `limit` | integer | No | 10 | Number of profiles per page (max: 50) |
| `cursor` | string | No | null | Pagination cursor from previous response |

**Request Example**:
```http
GET /api/discovery/profiles?limit=10&cursor=eyJ1c2VySWQiOiJ1c2VyMTIzIn0
Authorization: Bearer <jwt_token>
```

**Response Format**:
```typescript
{
  "profiles": [
    {
      "userId": "user123",
      "firstName": "Sarah",
      "age": 32,
      "city": "San Francisco",
      "childrenCount": 2,                           // Integer only
      "childrenAgeGroups": ["toddler", "elementary"], // Generic ranges only
      "compatibilityScore": 87,                     // 0-100
      "verificationStatus": {
        "idVerified": true,
        "backgroundCheckComplete": true,
        "phoneVerified": true
      },
      "budget": 2000,
      "moveInDate": "2025-11-15T00:00:00.000Z",
      "bio": "Single parent looking for compatible roommate...",
      "profilePhoto": "https://storage.example.com/photos/user123.jpg"
    }
  ],
  "nextCursor": "eyJ1c2VySWQiOiJ1c2VyMTI0In0",  // null if last page
  "hasMore": true
}
```

**Success Response**: `200 OK`

**Error Responses**:
| Code | Description |
|------|-------------|
| `401 Unauthorized` | Missing or invalid JWT token |
| `400 Bad Request` | Invalid query parameters (e.g., limit > 50) |
| `500 Internal Server Error` | Server error |

**Child Safety Compliance**:
-  Returns ONLY `childrenCount` and `childrenAgeGroups`
- L NEVER returns child names, photos, exact ages, or schools
-  Age groups limited to generic ranges: `toddler`, `elementary`, `teen`

**Caching**:
- Backend: 5-minute Redis cache
- Mobile: React Query cache with stale time

**Performance**:
- Target: <100ms P95 response time
- Pagination: Cursor-based for efficient large dataset handling

---

### 2. POST `/api/discovery/swipe`

Record a swipe action (left = pass, right = like). Creates mutual match if both users swiped right.

**Authentication**: Required (JWT)

**Request Body**:
```typescript
{
  "targetUserId": "user123",    // Required: User being swiped on
  "direction": "right"           // Required: "left" | "right"
}
```

**Request Example**:
```http
POST /api/discovery/swipe
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "targetUserId": "user123",
  "direction": "right"
}
```

**Response Format** (No Match):
```typescript
{
  "success": true,
  "matchCreated": false,
  "swipeRecorded": true
}
```

**Response Format** (Match Created):
```typescript
{
  "success": true,
  "matchCreated": true,
  "match": {
    "matchId": "match456",
    "matchedUserId": "user123",
    "compatibilityScore": 87,
    "createdAt": "2025-10-06T14:30:00.000Z"
  }
}
```

**Success Response**: `200 OK`

**Error Responses**:
| Code | Description |
|------|-------------|
| `401 Unauthorized` | Missing or invalid JWT token |
| `400 Bad Request` | Invalid request body (missing fields, invalid direction) |
| `404 Not Found` | Target user not found or already swiped |
| `409 Conflict` | Duplicate swipe attempt |
| `500 Internal Server Error` | Server error |

**Business Logic**:
- Swipes are **FINAL** - no undo/delete functionality
- Duplicate swipes on same user return `409 Conflict`
- Mutual match triggers:
  - Database match record creation
  - Real-time Socket.io notification to both users (`match_created` event)
  - Push notification (future)

**Real-Time Integration**:
- Match creation triggers Socket.io event: `match_created`
- Event payload includes match details for instant modal display

**Child Safety Compliance**:
- Match object contains NO child PII
- ONLY compatibility score and match metadata

---

### 3. POST `/api/discovery/screenshot`

Report screenshot detection for privacy protection (Child Safety Feature).

**Authentication**: Required (JWT)

**Request Body**:
```typescript
{
  "targetUserId": "user123"  // Required: User whose profile was screenshotted
}
```

**Request Example**:
```http
POST /api/discovery/screenshot
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "targetUserId": "user123"
}
```

**Response Format**:
```typescript
{
  "success": true,
  "reported": true,
  "timestamp": "2025-10-06T14:30:00.000Z"
}
```

**Success Response**: `200 OK`

**Error Responses**:
| Code | Description |
|------|-------------|
| `401 Unauthorized` | Missing or invalid JWT token |
| `400 Bad Request` | Invalid request body (missing targetUserId) |
| `404 Not Found` | Target user not found |
| `500 Internal Server Error` | Server error |

**Business Logic**:
- Records screenshot event in database (`screenshot_reports` table)
- Sends real-time notification to profile owner via Socket.io (`screenshot_detected` event)
- Does NOT block user or prevent screenshots (privacy awareness feature)
- Logs event for analytics and safety monitoring

**Real-Time Integration**:
- Triggers Socket.io event: `screenshot_detected` to profile owner
- Event includes reporter ID and timestamp

**Child Safety Compliance**:
- Protects child information from unauthorized capture
- Raises user awareness about privacy
- Provides accountability through reporting

**Mobile Integration**:
- Triggered by Expo ScreenCapture API listener
- Automatic reporting on screenshot detection
- User shown alert explaining privacy protection

---

## Authentication

All Discovery API endpoints require JWT authentication.

**Header Format**:
```http
Authorization: Bearer <jwt_token>
```

**Token Acquisition**:
- Obtain via `/api/auth/login` or `/api/auth/register`
- Token expires after 7 days
- Refresh via `/api/auth/refresh`

**Error Response** (401 Unauthorized):
```typescript
{
  "error": "Unauthorized",
  "message": "Invalid or missing authentication token"
}
```

---

## Rate Limiting

**Limits**:
- GET `/profiles`: 100 requests/minute per user
- POST `/swipe`: 60 requests/minute per user (1 per second)
- POST `/screenshot`: 20 requests/minute per user

**Rate Limit Response** (429 Too Many Requests):
```typescript
{
  "error": "Rate limit exceeded",
  "retryAfter": 30  // seconds
}
```

---

## WebSocket Events (Socket.io)

Discovery API integrates with Socket.io for real-time notifications.

### Event: `match_created`

Emitted to both users when mutual match occurs.

**Payload**:
```typescript
{
  "matchId": "match456",
  "matchedUserId": "user123",
  "compatibilityScore": 87,
  "createdAt": "2025-10-06T14:30:00.000Z"
}
```

**Client Handling**:
```typescript
socket.on('match_created', (data) => {
  // Display match modal
  // Navigate to messages
});
```

### Event: `screenshot_detected`

Emitted to profile owner when screenshot is detected.

**Payload**:
```typescript
{
  "reportedBy": "user789",
  "timestamp": "2025-10-06T14:30:00.000Z"
}
```

**Client Handling**:
```typescript
socket.on('screenshot_detected', (data) => {
  // Show privacy notification
  // Log event for user awareness
});
```

---

## Child Safety Compliance Summary

**Constitution Principle I: Child Safety - ZERO TOLERANCE**

###  Allowed Data
- `childrenCount`: Integer (e.g., 1, 2, 3)
- `childrenAgeGroups`: Array of generic ranges `["toddler", "elementary", "teen"]`

### L PROHIBITED Data
- L Child names (any format)
- L Child photos/images
- L Exact ages (birthdays, years old)
- L Schools/daycares
- L Any identifying information

### API Enforcement
- Zod schema validation rejects prohibited fields
- Database schema excludes child PII columns
- TypeScript types prevent child PII at compile time
- Comprehensive compliance tests (100% coverage required)

### Privacy Features
- Screenshot detection and reporting
- No undo for swipes (prevents data mining)
- End-to-end encryption (future)
- COPPA compliance (children never use app)

---

## Performance Targets

- **GET /profiles**: <100ms P95 response time
- **POST /swipe**: <50ms P95 response time
- **POST /screenshot**: <50ms P95 response time
- **Cache Hit Rate**: >80% for profile data
- **Real-time Latency**: <200ms for Socket.io events

---

## Testing

**Unit Tests**: `backend/tests/unit/`
- `discoveryController.test.ts`
- `compatibilityCalculator.test.ts`

**Integration Tests**: `backend/tests/integration/`
- `discovery.integration.test.ts`

**Compliance Tests**: `backend/tests/compliance/`
- `child-safety.compliance.test.ts` (CRITICAL - 100% coverage)

**E2E Tests**: `mobile/e2e/`
- `discovery.e2e.test.ts`

---

## Error Handling Best Practices

**Client Implementation**:
```typescript
// React Query mutation with error handling
const { mutate: recordSwipe } = useRecordSwipe();

recordSwipe(
  { targetUserId: 'user123', direction: 'right' },
  {
    onSuccess: (data) => {
      if (data.matchCreated) {
        // Show match modal
      }
    },
    onError: (error) => {
      if (error.response?.status === 409) {
        // Already swiped - ignore
      } else if (error.response?.status === 404) {
        // User no longer available
        Alert.alert('Profile Unavailable');
      } else {
        // Generic error
        Alert.alert('Error', 'Please try again');
      }
    },
  }
);
```

**Optimistic Updates**:
- Remove swiped card immediately (UX)
- Rollback on API error
- Invalidate cache on success

---

## Future Enhancements

- [ ] Undo last swipe (premium feature)
- [ ] Filter profiles by distance, age, budget
- [ ] Boost profile visibility (premium)
- [ ] Extended profile data (lifestyle, preferences)
- [ ] Video introductions
- [ ] AI-powered compatibility insights

---

## Support

**API Issues**: Report at `/backend/docs/TROUBLESHOOTING.md`
**Mobile Issues**: Report at `/mobile/docs/TROUBLESHOOTING.md`
**Security Issues**: Email security@example.com
