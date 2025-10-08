# Matching Algorithm Integration Documentation

**Created**: 2025-10-08
**Purpose**: Document the dual compatibility scoring system and Socket.io integration

## Overview

CoNest uses **two compatibility algorithms** for different purposes:

### 1. Discovery Compatibility Score (Simple, Fast)
**File**: `/backend/src/utils/compatibilityCalculator.ts`
**Purpose**: Quick scoring for discovery feed (<20ms performance)
**Used by**: Discovery Screen profile cards

**Algorithm**:
- **Age Group Overlap**: 20 points per matching age group (max 60)
- **Budget Compatibility**: 30 points max (decreases with difference)
- **Location Match**: 30 points for same city
- **Total**: 0-100 score

**Example**:
```typescript
const score = calculateCompatibilityScore(userProfile, targetProfile);
// Returns: 78 (60 age groups + 15 budget + 30 location)
```

**Child Safety Compliance**:
- Uses ONLY `children_age_groups` array (generic ranges)
- NO child PII (names, photos, exact ages, schools)
- 100% compliant with Constitution Principle I

---

### 2. Match Compatibility Score (Detailed, Comprehensive)
**File**: `/backend/src/services/matchingService.ts`
**Purpose**: Detailed scoring when creating matches (stored in matches table)
**Used by**: Match creation, match recommendations

**Algorithm**:
- **Schedule Compatibility**: 25% weight
- **Parenting Philosophy**: 20% weight
- **House Rules Alignment**: 20% weight
- **Location/Schools**: 15% weight
- **Budget Match**: 10% weight
- **Lifestyle Factors**: 10% weight
- **Total**: 0-100 score with breakdown

**Example**:
```typescript
const compatibility = MatchingService.calculateCompatibility(profile1, profile2);
// Returns: {
//   totalScore: 82,
//   breakdown: {
//     schedule: 85,
//     parenting: 90,
//     rules: 75,
//     location: 80,
//     budget: 70,
//     lifestyle: 85
//   }
// }
```

**Child Safety Compliance**:
- Uses `number_of_children` (integer count)
- Uses `ages_of_children` (JSON string of ranges, e.g., "3-5,8-10")
- NO child PII allowed

---

## When to Use Each Algorithm

### Use Discovery Algorithm When:
- Loading profiles in Discovery Screen
- Need fast performance (<20ms)
- Displaying compatibility percentages to users
- Caching scores in Redis for quick lookup

### Use Match Algorithm When:
- Creating mutual matches (swipes table → matches table)
- Storing match data in database
- Need detailed breakdown for analytics
- Generating match recommendations

---

## Socket.io Integration

### Real-Time Events

**Match Created Notification**:
```typescript
import SocketService from '../services/SocketService';

// When mutual match detected
SocketService.emitMatchCreated(userId1, userId2, {
  id: matchId,
  compatibilityScore: 82,
  createdAt: new Date().toISOString(),
});
```

**Events Emitted**:
- `match_created` - Sent to both users when mutual swipe detected
- `swipe_received` - Premium feature (someone swiped right)
- `screenshot_detected` - Privacy notification

**Configuration**:
- Socket.io server initialized in `/backend/src/config/socket.ts`
- JWT authentication required for all Socket.io connections
- Redis adapter enabled for horizontal scaling
- User rooms: `user:${userId}` for targeted notifications

---

## Performance Targets

### Discovery Algorithm
- **Calculation Time**: <20ms per score
- **Redis Cache**: 5min TTL for compatibility scores
- **Database Query**: <100ms for profile fetch
- **Total**: <500ms profile loading (FR-035)

### Match Algorithm
- **Calculation Time**: <50ms per score (more complex)
- **Socket.io Delivery**: <100ms notification delivery
- **Database Write**: <200ms match creation
- **Total**: <500ms mutual match notification

---

## Database Schema Integration

### Discovery (uses `parents` table)
```sql
SELECT
  user_id,
  children_age_groups,  -- Array: ['toddler', 'elementary']
  budget_min,
  budget_max,
  city
FROM parents;
```

### Matches (uses `profiles` table + `matches` table)
```sql
-- Detailed profile data
SELECT
  user_id,
  number_of_children,     -- Integer: 2
  ages_of_children,       -- JSON: "3-5,8-10"
  schedule_type,
  parenting_style,
  house_rules,
  budget_min,
  budget_max
FROM profiles;

-- Match scores stored
INSERT INTO matches (
  user_id_1,
  user_id_2,
  compatibility_score,    -- Total: 82
  schedule_score,         -- Breakdown: 85
  parenting_score,        -- Breakdown: 90
  rules_score,            -- Breakdown: 75
  location_score,         -- Breakdown: 80
  budget_score,           -- Breakdown: 70
  lifestyle_score         -- Breakdown: 85
) VALUES (...);
```

---

## API Endpoint Usage

### Discovery Endpoint
```http
GET /api/discovery/profiles?limit=10

Response:
{
  "profiles": [
    {
      "userId": "uuid",
      "firstName": "Sarah",
      "age": 32,
      "city": "Austin",
      "childrenCount": 2,
      "childrenAgeGroups": ["toddler", "elementary"],
      "compatibilityScore": 78,  // From compatibilityCalculator.ts
      "verificationStatus": {
        "idVerified": true,
        "backgroundCheckComplete": true,
        "phoneVerified": true
      }
    }
  ]
}
```

### Swipe Endpoint (Creates Match)
```http
POST /api/discovery/swipe
{
  "targetUserId": "uuid",
  "direction": "right"
}

Response (if mutual match):
{
  "match": {
    "id": "match-uuid",
    "userId1": "uuid",
    "userId2": "uuid",
    "compatibilityScore": 82,  // From MatchingService.calculateCompatibility
    "breakdown": {
      "schedule": 85,
      "parenting": 90,
      "rules": 75,
      "location": 80,
      "budget": 70,
      "lifestyle": 85
    },
    "createdAt": "2025-10-08T..."
  }
}
```

---

## Testing Strategy

### Unit Tests
```typescript
// Test discovery algorithm
describe('compatibilityCalculator', () => {
  it('should calculate score in <20ms', () => {
    const start = performance.now();
    const score = calculateCompatibilityScore(user1, user2);
    const duration = performance.now() - start;
    expect(duration).toBeLessThan(20);
  });

  it('should never include child PII', () => {
    const profile = { childrenNames: ['Alice'] };
    expect(() => calculateCompatibilityScore(profile, user2))
      .toThrow('Child PII detected');
  });
});

// Test match algorithm
describe('MatchingService', () => {
  it('should return detailed breakdown', () => {
    const result = MatchingService.calculateCompatibility(p1, p2);
    expect(result).toHaveProperty('totalScore');
    expect(result).toHaveProperty('breakdown');
    expect(result.breakdown).toHaveProperty('schedule');
  });
});
```

### Integration Tests
```typescript
describe('Socket.io Match Notifications', () => {
  it('should notify both users on mutual match', async () => {
    const io = await initializeSocketIO(httpServer);
    const client1 = io.connect();
    const client2 = io.connect();

    client1.on('match_created', (data) => {
      expect(data.matchId).toBeDefined();
      expect(data.compatibilityScore).toBeGreaterThan(0);
    });

    // Trigger mutual swipe...
  });
});
```

---

## Monitoring & Analytics

### Key Metrics to Track
- Discovery algorithm performance: p50, p95, p99 latency
- Match algorithm performance: p50, p95, p99 latency
- Socket.io notification delivery time
- Match creation rate (mutual swipes / total swipes)
- Average compatibility scores by user segment

### Redis Cache Hit Rate
- Target: >80% cache hit rate for compatibility scores
- TTL: 5 minutes for discovery scores
- Invalidation: When user updates profile

---

## Future Enhancements

### Machine Learning
- Train ML model on successful matches (>6 months household stability)
- Use detailed breakdown data for feature importance
- A/B test ML scores vs. rule-based scores

### Personalization
- Learn user swipe patterns (what scores they accept/reject)
- Adjust weight factors based on user preferences
- Surface profiles that match user's historical preferences

### Real-Time Updates
- Socket.io event when someone updates their profile
- Recalculate cached compatibility scores
- Notify users of score changes for existing matches
