# Matching Service Documentation

## Overview

The CoNest matching system uses **two distinct compatibility algorithms** optimized for different use cases:

### 1. Discovery Algorithm (Fast)
- **File**: `/utils/compatibilityCalculator.ts`
- **Performance**: <20ms per calculation
- **Use Case**: Discovery Screen profile cards
- **Caching**: Redis (5min TTL)

### 2. Match Algorithm (Detailed)
- **File**: `/services/matchingService.ts`
- **Performance**: <50ms per calculation
- **Use Case**: Match creation and storage
- **Features**: 6-component breakdown

---

## Discovery Algorithm (Simple)

### Scoring Components

```typescript
// Total: 0-100 points
const score = {
  ageGroupOverlap: 20 * overlaps,  // Max 60 (3+ overlaps)
  budgetMatch: 30 - (diff / 100),  // Max 30
  locationMatch: sameCity ? 30 : 0 // Max 30
}
```

### Example Calculation

```typescript
import { calculateCompatibilityScore } from './utils/compatibilityCalculator';

const user = {
  user_id: '123',
  children_age_groups: ['toddler', 'elementary'],
  budget_min: 1000,
  budget_max: 1500,
  city: 'Austin',
};

const target = {
  user_id: '456',
  children_age_groups: ['toddler', 'teen'],
  budget_min: 1200,
  budget_max: 1800,
  city: 'Austin',
};

const score = calculateCompatibilityScore(user, target);
// Returns: 78 (20 age + 28 budget + 30 location)
```

### Child Safety Compliance

- ✅ Uses `children_age_groups` array (generic ranges)
- ❌ NO `childrenNames`, `childrenPhotos`, `childrenAges`, `childrenSchools`
- ✅ Age groups: `toddler`, `elementary`, `teen` only

---

## Match Algorithm (Detailed)

### Scoring Components

```typescript
// Total: 0-100 points (weighted)
const weights = {
  schedule: 0.25,      // 25% - Work schedule compatibility
  parenting: 0.20,     // 20% - Parenting style alignment
  rules: 0.20,         // 20% - House rules agreement
  location: 0.15,      // 15% - Proximity/schools
  budget: 0.10,        // 10% - Budget overlap
  lifestyle: 0.10,     // 10% - Pets, smoking, diet
}
```

### Example Calculation

```typescript
import { MatchingService } from './services/matchingService';

const compatibility = MatchingService.calculateCompatibility(profile1, profile2);

// Returns:
{
  totalScore: 82,
  breakdown: {
    schedule: 85,   // Same schedule type
    parenting: 90,  // Similar parenting style
    rules: 75,      // Most house rules align
    location: 80,   // Same city, close proximity
    budget: 70,     // Good budget overlap
    lifestyle: 85   // Compatible lifestyle
  }
}
```

### Database Storage

```sql
INSERT INTO matches (
  user_id_1,
  user_id_2,
  compatibility_score,     -- Total: 82
  schedule_score,          -- Breakdown: 85
  parenting_score,         -- Breakdown: 90
  rules_score,             -- Breakdown: 75
  location_score,          -- Breakdown: 80
  budget_score,            -- Breakdown: 70
  lifestyle_score          -- Breakdown: 85
) VALUES (...);
```

---

## Socket.io Integration

### Match Notification Flow

```typescript
import { MatchingService } from './services/matchingService';

// When mutual swipe detected
const match = await MatchingService.createMatch(userId1, userId2);

// Automatically notifies both users via Socket.io
// Event: 'match_created'
// Delivery: <100ms
```

### Real-Time Events

**`match_created`** - Mutual match notification
```typescript
{
  matchId: 'uuid',
  matchedUserId: 'uuid',
  compatibilityScore: 82,
  createdAt: '2025-10-08T...'
}
```

**`swipe_received`** - Premium feature (someone swiped right)
```typescript
{
  swiperId: 'uuid',
  timestamp: '2025-10-08T...'
}
```

**`screenshot_detected`** - Privacy notification
```typescript
{
  userId: 'uuid',
  timestamp: '2025-10-08T...'
}
```

### Socket.io Configuration

```typescript
// User rooms for targeted notifications
socket.join(`user:${userId}`);

// Emit to specific user
io.to(`user:${userId}`).emit('match_created', data);

// Redis adapter for horizontal scaling
io.adapter(createAdapter(pubClient, subClient));
```

---

## API Endpoints

### Discovery Endpoint

```http
GET /api/discovery/profiles?limit=10

Response: 200 OK
{
  "profiles": [
    {
      "userId": "uuid",
      "firstName": "Sarah",
      "age": 32,
      "city": "Austin",
      "childrenCount": 2,
      "childrenAgeGroups": ["toddler", "elementary"],
      "compatibilityScore": 78,  // Discovery algorithm
      "verificationStatus": {
        "idVerified": true,
        "backgroundCheckComplete": true,
        "phoneVerified": true
      }
    }
  ],
  "nextCursor": "uuid"
}
```

### Swipe Endpoint (Creates Match)

```http
POST /api/discovery/swipe
{
  "targetUserId": "uuid",
  "direction": "right"
}

Response: 200 OK (if mutual match)
{
  "match": {
    "id": "uuid",
    "userId1": "uuid",
    "userId2": "uuid",
    "compatibilityScore": 82,  // Match algorithm
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

## Validation Schemas

### ProfileCard Response (Zod)

```typescript
import { ProfileCardSchema } from './validators/discoverySchemas';

// Validate API response
const result = ProfileCardSchema.safeParse(profileData);

if (!result.success) {
  // Will reject child PII automatically
  console.error('Validation failed:', result.error);
}
```

### Child Safety Enforcement

```typescript
// ✅ ALLOWED
const valid = {
  childrenCount: 2,
  childrenAgeGroups: ['toddler', 'elementary']
};

// ❌ REJECTED (throws CHILD SAFETY VIOLATION)
const invalid = {
  childrenCount: 2,
  childrenNames: ['Alice', 'Bob'],  // PROHIBITED
  childrenPhotos: ['url1', 'url2']  // PROHIBITED
};
```

---

## Performance Targets

### Discovery Algorithm
- ✅ Calculation: <20ms
- ✅ Redis cache: 5min TTL
- ✅ Database query: <100ms
- ✅ **Total**: <500ms profile loading

### Match Algorithm
- ✅ Calculation: <50ms
- ✅ Socket.io delivery: <100ms
- ✅ Database write: <200ms
- ✅ **Total**: <500ms match notification

---

## Testing

### Unit Tests

```bash
npm run test -- src/tests/matching.integration.test.ts
```

### Test Coverage

- Discovery algorithm performance (<20ms)
- Match algorithm accuracy (6 components)
- Socket.io notification delivery (<100ms)
- Zod schema child safety validation
- End-to-end match workflow

### Example Test

```typescript
import { calculateCompatibilityScore } from './utils/compatibilityCalculator';

describe('Discovery Algorithm', () => {
  it('should calculate in <20ms', () => {
    const start = performance.now();
    const score = calculateCompatibilityScore(user, target);
    const duration = performance.now() - start;

    expect(duration).toBeLessThan(20);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });
});
```

---

## Redis Caching Strategy

### Discovery Scores

```typescript
// Key format
const cacheKey = `compat:${userId}:${targetUserId}`;

// TTL: 5 minutes
await redis.setex(cacheKey, 300, score);

// Invalidation
// - User updates profile → Clear all scores for that user
// - Manual refresh → Allow users to clear cache
```

### Cache Hit Rate

- **Target**: >80% hit rate
- **Monitoring**: Track cache misses in analytics
- **Optimization**: Preload scores for top matches

---

## Monitoring & Analytics

### Key Metrics

```typescript
// Performance metrics
const metrics = {
  discoveryCalcP50: 8,   // 50th percentile
  discoveryCalcP95: 15,  // 95th percentile
  discoveryCalcP99: 19,  // 99th percentile

  matchCalcP50: 25,
  matchCalcP95: 45,
  matchCalcP99: 49,

  socketDeliveryP50: 40,
  socketDeliveryP95: 85,
  socketDeliveryP99: 98,
};
```

### Analytics Queries

```sql
-- Match success rate
SELECT
  COUNT(*) FILTER (WHERE status = 'accepted') / COUNT(*) * 100 AS match_rate
FROM matches
WHERE created_at > NOW() - INTERVAL '30 days';

-- Average compatibility by segment
SELECT
  CASE
    WHEN compatibility_score >= 80 THEN 'High'
    WHEN compatibility_score >= 60 THEN 'Medium'
    ELSE 'Low'
  END AS tier,
  COUNT(*) AS matches,
  AVG(compatibility_score) AS avg_score
FROM matches
GROUP BY tier;
```

---

## Future Enhancements

### Machine Learning

- Train ML model on successful matches (>6 months stability)
- Use detailed breakdown for feature importance
- A/B test ML scores vs rule-based scores

### Personalization

- Learn user swipe patterns (accept/reject thresholds)
- Adjust weight factors based on user preferences
- Surface profiles matching historical preferences

### Real-Time Updates

- Socket.io event when profile updated
- Recalculate cached compatibility scores
- Notify users of score changes

---

## Troubleshooting

### Common Issues

**Slow Discovery Performance**

```bash
# Check Redis cache hit rate
redis-cli INFO stats | grep keyspace_hits

# Monitor calculation time
console.time('compatibility');
const score = calculateCompatibilityScore(user, target);
console.timeEnd('compatibility');
```

**Socket.io Notifications Not Delivered**

```bash
# Check Socket.io connection
socket.on('connect', () => console.log('Connected'));
socket.on('error', (err) => console.error('Error:', err));

# Verify user room
socket.emit('debug', { room: `user:${userId}` });
```

**Child Safety Validation Failing**

```typescript
// Use safeParse to see detailed errors
const result = ProfileCardSchema.safeParse(data);
if (!result.success) {
  console.error(JSON.stringify(result.error, null, 2));
}
```

---

## References

- `/backend/MATCHING_ALGORITHM_INTEGRATION.md` - Detailed integration guide
- `/specs/001-discovery-screen-swipeable/spec.md` - Feature specification
- `/backend/src/tests/matching.integration.test.ts` - Test suite
- `/backend/src/config/socket.ts` - Socket.io configuration
