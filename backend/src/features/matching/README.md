# Matching Feature

## Overview

The Matching feature handles compatibility-based matching between users. It provides endpoints for finding potential matches, calculating compatibility scores, and managing match relationships. All endpoints require full user verification to ensure platform safety.

## API Endpoints

| Method | Path | Description | Auth Required |
|--------|------|-------------|---------------|
| GET | `/api/matches/find` | Find potential matches | Yes (Verified) |
| GET | `/api/matches/my-matches` | Get current user's matches | Yes (Verified) |
| GET | `/api/matches/compatibility/:targetUserId` | Calculate compatibility with user | Yes (Verified) |
| GET | `/api/matches/:id` | Get specific match details | Yes (Verified) |
| POST | `/api/matches/create` | Create a new match | Yes (Verified) |
| POST | `/api/matches/:id/respond` | Respond to a match request | Yes (Verified) |

## Services

### matchController
- `findMatches` - Finds potential matches based on compatibility
- `getMyMatches` - Retrieves all matches for current user
- `calculateCompatibility` - Calculates compatibility score with target user
- `getMatch` - Gets details of a specific match
- `createMatch` - Creates a new match (typically from accepted connection request)
- `respondToMatch` - Responds to a pending match (accept/decline)

### MatchingService
- Compatibility algorithm implementation
- Match status management
- Preference matching logic
- Score calculation

## Models/Types

### Match
```typescript
interface Match {
  id: string;
  user_id_1: string;
  user_id_2: string;
  status: MatchStatus;
  compatibility_score: number;
  created_at: Date;
  updated_at: Date;
  matched_at?: Date;
}

type MatchStatus = 'pending' | 'accepted' | 'declined' | 'expired';
```

### CompatibilityResult
```typescript
interface CompatibilityResult {
  overallScore: number;      // 0-100
  breakdown: {
    scheduleCompatibility: number;
    parentingPhilosophy: number;
    lifestyleCompatibility: number;
    locationProximity: number;
    budgetAlignment: number;
    houseRulesAgreement: number;
  };
  highlights: string[];      // Key compatibility factors
  concerns: string[];        // Potential issues
}
```

### MatchResponse
```typescript
interface MatchResponse {
  accept: boolean;
  message?: string;
}
```

### MatchWithProfile
```typescript
interface MatchWithProfile extends Match {
  otherUser: {
    id: string;
    firstName: string;
    profileImageUrl?: string;
    city: string;
    state: string;
    childrenCount: number;
    childrenAgeGroups: string[];
    verified: boolean;
  };
}
```

## Dependencies

- `../../middleware/auth.middleware` - authenticateToken, requireFullVerification
- `../../models/Match` - Match data model
- `../../models/Profile` - Profile data for compatibility calculation
- `../messages` - Messaging enabled after match acceptance

## Data Flow

### Find Matches Flow
1. Verify user is fully verified
2. Load user's profile and preferences
3. Query potential matches (not already matched, not declined)
4. Calculate compatibility scores
5. Sort by compatibility score
6. Return paginated results

### Create Match Flow
1. Typically triggered by accepted connection request
2. Verify both users exist and are verified
3. Calculate compatibility score
4. Create match record with 'accepted' status
5. Enable messaging between users
6. Notify both users

### Calculate Compatibility Flow
1. Load both users' profiles
2. Calculate each dimension score:
   - Schedule compatibility (work hours, availability)
   - Parenting philosophy alignment
   - Lifestyle preferences (pets, smoking, etc.)
   - Location/school proximity
   - Budget compatibility
   - House rules agreement
3. Apply weights to each dimension
4. Generate overall score
5. Identify highlights and concerns

## Verification Requirement

All matching endpoints require `requireFullVerification` middleware:
- Email verified
- Phone verified
- ID verification approved
- Background check passed

This ensures all users in the matching system have been thoroughly verified for platform safety.
