# Discovery Feature

## Overview

The Discovery feature provides a browse-based profile discovery system for finding potential roommates. Users can browse profiles with cursor-based pagination, and express interest via connection requests (not swipes). The feature includes child safety measures such as screenshot detection reporting.

## API Endpoints

| Method | Path | Description | Auth Required |
|--------|------|-------------|---------------|
| GET | `/api/discovery/profiles` | Get discovery profiles with pagination | Yes |
| POST | `/api/discovery/screenshot` | Report screenshot detection | Yes |

## Services

### DiscoveryController
- `getProfiles` - Retrieves paginated list of discoverable profiles
- `reportScreenshot` - Reports screenshot detection for child safety

### DiscoveryService
- Profile filtering logic (excludes connected users, pending requests)
- Cursor-based pagination implementation
- Screenshot logging and notification
- Profile scoring and sorting

## Models/Types

### GetProfilesQuery
```typescript
interface GetProfilesQuery {
  limit?: number;   // Number of profiles (1-50, default 10)
  cursor?: string;  // UUID cursor for pagination
}
```

### GetProfilesResponse
```typescript
interface GetProfilesResponse {
  profiles: ProfileCard[];
  nextCursor: string | null;  // null if no more profiles
}
```

### ProfileCard
```typescript
interface ProfileCard {
  id: string;
  firstName: string;
  city: string;
  state: string;
  bio: string;
  profileImageUrl: string;
  childrenCount: number;
  childrenAgeGroups: string[];
  parentingStyle: string;
  verified: boolean;
  verificationLevel: number;
  compatibilityScore?: number;
}
```

### ScreenshotReport
```typescript
interface ScreenshotReport {
  targetUserId: string;  // User whose profile was screenshotted
}
```

## Dependencies

- `../../middleware/auth.middleware` - authenticateToken for JWT validation
- `../../models/Profile` - Profile data access
- `../../models/ConnectionRequest` - To filter out connected users
- `../../models/Match` - To filter out already matched users
- `../../services/SocketService` - For screenshot notification

## Data Flow

### Get Profiles Flow
1. Authenticate user via JWT
2. Parse query parameters (limit, cursor)
3. Apply filters:
   - Exclude current user's profile
   - Exclude users with existing connection requests (any status)
   - Exclude already matched users
   - Include saved profiles (users can browse saved)
4. Apply cursor-based pagination
5. Calculate compatibility scores (optional)
6. Return profiles with next cursor

### Screenshot Report Flow
1. Authenticate user via JWT
2. Validate target user ID
3. Log screenshot event in database
4. Notify profile owner via Socket.io
5. Return success response

## Profile Filtering Logic

```
Excluded from discovery:
- Current user's own profile
- Users with pending connection requests (either direction)
- Users with accepted connection requests
- Users with declined connection requests (recent)
- Already matched users

Included in discovery:
- Saved profiles (users can still browse)
- All other verified profiles
```

## Child Safety Features

- Screenshot detection and reporting
- Profile owner notification on screenshot
- Event logging for audit trail
- No child PII exposed in profile cards
