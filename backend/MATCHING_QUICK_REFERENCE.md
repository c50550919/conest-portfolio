# Matching System Quick Reference

## 🚀 Quick Start

### Discovery Screen (Fast Algorithm)

```typescript
import { calculateCompatibilityScore } from './utils/compatibilityCalculator';

const score = calculateCompatibilityScore(
  { user_id: 'user1', children_age_groups: ['toddler'], budget_min: 1000, budget_max: 1500, city: 'Austin' },
  { user_id: 'user2', children_age_groups: ['toddler'], budget_min: 1200, budget_max: 1600, city: 'Austin' }
);
// Returns: 80 (quick, <20ms)
```

### Match Creation (Detailed Algorithm + Socket.io)

```typescript
import { MatchingService } from './services/matchingService';

const match = await MatchingService.createMatch(userId1, userId2);
// Automatically:
// 1. Calculates detailed compatibility (6 components)
// 2. Stores match in database
// 3. Notifies both users via Socket.io
```

### Response Validation (Zod)

```typescript
import { ProfileCardSchema } from './validators/discoverySchemas';

const result = ProfileCardSchema.safeParse(profileData);
if (!result.success) {
  // Will reject child PII automatically
  throw new Error('Invalid profile');
}
```

---

## 📊 Algorithm Comparison

| Feature | Discovery | Match |
|---------|-----------|-------|
| **File** | `compatibilityCalculator.ts` | `matchingService.ts` |
| **Speed** | <20ms | <50ms |
| **Components** | 3 (age, budget, location) | 6 (schedule, parenting, rules, location, budget, lifestyle) |
| **Output** | Single score (0-100) | Score + breakdown |
| **Use Case** | Discovery feed | Match creation |
| **Caching** | Redis (5min TTL) | Database storage |

---

## 🔔 Socket.io Events

### Listen for Match Notifications (Frontend)

```typescript
import io from 'socket.io-client';

const socket = io('http://localhost:3000', {
  auth: { token: jwtToken }
});

socket.on('match_created', (data) => {
  console.log('New match!', data);
  // {
  //   matchId: 'uuid',
  //   matchedUserId: 'uuid',
  //   compatibilityScore: 82,
  //   createdAt: '2025-10-08T...'
  // }
});
```

### All Events

- `match_created` - Mutual match notification
- `swipe_received` - Premium: Someone swiped right on you
- `screenshot_detected` - Privacy: Your profile was screenshot

---

## 🛡️ Child Safety

### ✅ Allowed

```typescript
{
  childrenCount: 2,
  childrenAgeGroups: ['toddler', 'elementary']
}
```

### ❌ Prohibited (Auto-Rejected)

```typescript
{
  childrenNames: ['Alice', 'Bob'],     // REJECTED
  childrenPhotos: ['url1', 'url2'],    // REJECTED
  childrenAges: [3, 8],                // REJECTED
  childrenSchools: ['Oak Elementary']  // REJECTED
}
```

---

## 🧪 Testing

```bash
# Run all matching tests
npm run test -- src/tests/matching.integration.test.ts

# Watch mode
npm run test:watch -- src/tests/matching.integration.test.ts
```

---

## 📈 Performance Targets

| Metric | Target | How to Measure |
|--------|--------|----------------|
| Discovery calc | <20ms | `console.time('compat')` |
| Match calc | <50ms | `console.time('match')` |
| Socket.io delivery | <100ms | Timestamp in event payload |
| Profile loading | <500ms | Network tab in DevTools |

---

## 🔍 Troubleshooting

### Slow Performance?

```bash
# Check Redis cache
redis-cli INFO stats | grep keyspace_hits

# Monitor calculation time
console.time('compatibility');
const score = calculateCompatibilityScore(user, target);
console.timeEnd('compatibility');
```

### Socket.io Not Working?

```typescript
// Check connection
socket.on('connect', () => console.log('✅ Connected'));
socket.on('error', (err) => console.error('❌ Error:', err));
```

### Child Safety Violation?

```typescript
// Use safeParse to see errors
const result = ProfileCardSchema.safeParse(data);
if (!result.success) {
  console.error(result.error.issues);
}
```

---

## 📚 Documentation

- **Integration Guide**: `/backend/MATCHING_ALGORITHM_INTEGRATION.md`
- **Service README**: `/backend/src/services/README_MATCHING.md`
- **Completion Report**: `/backend/TASKS_T054-T056_COMPLETION_REPORT.md`
- **Test Suite**: `/backend/src/tests/matching.integration.test.ts`

---

## 🎯 Key Files

| File | Purpose |
|------|---------|
| `/utils/compatibilityCalculator.ts` | Fast discovery algorithm |
| `/services/matchingService.ts` | Detailed match algorithm + Socket.io |
| `/validators/discoverySchemas.ts` | Zod validation with child safety |
| `/services/SocketService.ts` | Socket.io singleton |
| `/config/socket.ts` | Socket.io server setup |

---

## 💡 Examples

### Complete Match Flow

```typescript
// 1. User views profile in discovery feed
const profiles = await fetch('/api/discovery/profiles?limit=10');
// Uses: compatibilityCalculator.ts

// 2. User swipes right
const swipe = await fetch('/api/discovery/swipe', {
  method: 'POST',
  body: JSON.stringify({ targetUserId, direction: 'right' })
});

// 3. If mutual match:
// - Uses: matchingService.ts
// - Calculates detailed compatibility
// - Stores in database
// - Emits Socket.io event

// 4. Both users receive notification
socket.on('match_created', (data) => {
  showMatchModal(data);
});
```

---

**Last Updated**: 2025-10-08
